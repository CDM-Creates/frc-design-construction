import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

const transpile = (source) => ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText;
const dataUrl = (source) => `data:text/javascript;base64,${Buffer.from(source).toString("base64")}`;

const documentCategoriesUrl = dataUrl(transpile(await readFile(
  new URL("../app/lib/planning-simulation/document-categories.ts", import.meta.url),
  "utf8",
)));
const catalogueSource = (await readFile(new URL("../app/lib/report-platform/report-catalogue.ts", import.meta.url), "utf8"))
  .replace('from "../planning-simulation/document-categories";', `from "${documentCategoriesUrl}";`);
const catalogueUrl = dataUrl(transpile(catalogueSource));
const catalogue = await import(catalogueUrl);

test("launch catalogue contains every complete report and versioned integer-cent pricing", () => {
  assert.equal(catalogue.REPORT_CATALOGUE.length, 15);
  assert.equal(catalogue.REPORT_BY_ID.get("property_intelligence").priceCents, 69_500);
  assert.equal(catalogue.REPORT_BY_ID.get("development_potential").priceCents, 99_500);
  assert.equal(catalogue.REPORT_BY_ID.get("investor_options").priceCents, 149_500);
  assert.equal(catalogue.REPORT_BY_ID.get("council_readiness").priceCents, 350_000);
  assert.match(catalogue.REPORT_PRICING_VERSION, /^FRC_REPORT_PRICING_/);
  for (const report of catalogue.REPORT_CATALOGUE) {
    assert.ok(report.includes.length);
    assert.ok(report.excludes.length);
    assert.ok(report.outputFiles.includes("ZIP report pack"));
    assert.equal(Number.isInteger(report.priceCents), true);
  }
});

test("customer category personalises recommendations but never changes price", () => {
  const base = {
    reportIds: ["property_intelligence", "development_potential"],
    site: { areaSqm: 900, areaStatus: "official_parcel_mapped", parcelCount: 1, ruralOrNonStandard: false },
    professionalReviewRequested: false,
    priorityReviewRequested: false,
  };
  const owner = catalogue.calculateCataloguePrice({ ...base, customerType: "property_owner" });
  const investor = catalogue.calculateCataloguePrice({ ...base, customerType: "investor_developer" });
  assert.equal(owner.totalCents, investor.totalCents);
  assert.ok(owner.lines.some((line) => line.treatment === "credit" && line.amountCents < 0));
  assert.notDeepEqual(
    catalogue.recommendationsFor("property_owner", "general_planning"),
    catalogue.recommendationsFor("investor_developer", "compare_options"),
  );
});

test("document-analysis and professional-review selections change the catalogue price", () => {
  const base = {
    reportIds: ["property_intelligence"],
    customerType: "property_owner",
    site: { areaSqm: 900, areaStatus: "official_parcel_mapped", parcelCount: 1, ruralOrNonStandard: false },
    professionalReviewRequested: false,
    priorityReviewRequested: false,
    documentAnalysisUpgrades: [],
  };
  const standard = catalogue.calculateCataloguePrice(base);
  const planAnalysis = catalogue.calculateCataloguePrice({
    ...base,
    documentAnalysisUpgrades: ["architectural_plan_set"],
  });
  const reviewed = catalogue.calculateCataloguePrice({
    ...base,
    professionalReviewRequested: true,
  });
  const reviewedPriority = catalogue.calculateCataloguePrice({
    ...base,
    professionalReviewRequested: true,
    priorityReviewRequested: true,
  });
  const reviewedWithAnalysis = catalogue.calculateCataloguePrice({
    ...base,
    professionalReviewRequested: true,
    documentAnalysisUpgrades: ["architectural_plan_set"],
  });
  const includedPlanAnalysis = catalogue.calculateCataloguePrice({
    ...base,
    reportIds: ["plan_compliance_review"],
    documentAnalysisUpgrades: ["architectural_plan_set"],
  });
  assert.equal(planAnalysis.totalCents - standard.totalCents, 59_500);
  assert.ok(planAnalysis.lines.some((line) => line.code === "DOCUMENT_ANALYSIS_ARCHITECTURAL_PLAN_SET"));
  assert.equal(reviewed.totalCents, 219_500);
  assert.ok(reviewed.lines.some((line) => line.code === "PROFESSIONAL_REVIEW_MINIMUM"));
  assert.equal(reviewedPriority.totalCents, 264_500);
  assert.equal(reviewedWithAnalysis.totalCents, 279_000);
  assert.equal(includedPlanAnalysis.totalCents, 129_500);
  assert.deepEqual(
    catalogue.documentAnalysisIncludedForReports([
      "plan_compliance_review",
    ]),
    ["architectural_plan_set"],
  );
  assert.equal(
    includedPlanAnalysis.lines.some((line) =>
      line.code.startsWith("DOCUMENT_ANALYSIS_"),
    ),
    false,
  );
});

test("site-area, additional-property and uncertainty rules keep an exact checkout total", () => {
  const price = (areaSqm, areaStatus = "official_parcel_mapped", parcelCount = 1) => catalogue.calculateCataloguePrice({
    reportIds: ["property_intelligence"],
    customerType: "property_owner",
    site: { areaSqm, areaStatus, parcelCount, ruralOrNonStandard: false },
    professionalReviewRequested: false,
    priorityReviewRequested: false,
  });
  assert.equal(price(1_000).lines.some((line) => line.code === "SITE_AREA_COMPLEXITY"), false);
  assert.equal(price(1_001).lines.find((line) => line.code === "SITE_AREA_COMPLEXITY").amountCents, 19_500);
  assert.equal(price(2_001).lines.find((line) => line.code === "SITE_AREA_COMPLEXITY").amountCents, 39_500);
  assert.equal(price(5_001).lines.find((line) => line.code === "SITE_AREA_COMPLEXITY").amountCents, 69_500);
  assert.equal(price(10_001).totalCents, 169_000);
  assert.equal(price(5_000, "conflict_detected").totalCents, 69_500);
  assert.ok(price(5_000, "conflict_detected").lines.some((line) => line.code === "AREA_CONFLICT_RECORDED"));
  assert.equal(price(5_000, "approximate_only").lines.some((line) => line.code === "SITE_AREA_COMPLEXITY"), false);
  assert.equal(price(900, "official_parcel_mapped", 2).totalCents, 119_000);
  assert.equal(price(900, "official_parcel_mapped", 2).quoteRequired, false);
});

const boundary = await import(dataUrl(transpile(await readFile(new URL("../app/lib/report-platform/property-boundary.ts", import.meta.url), "utf8"))));
test("mapped boundaries are never described as surveyed and dimensions require authority", () => {
  const invalid = boundary.validateBoundaryRecord({
    propertyId: "p1", address: "1 Test Street NSW", lot: null, depositedPlan: null,
    localGovernmentArea: null, areaSqm: 550, areaSource: "NSW parcel mapping",
    areaStatus: "survey_confirmed", retrievedAt: null, boundaryGeometrySource: "mapping",
    parcelCount: 1, geometryReference: null, geometryStatus: "official_parcel_mapped",
    registeredSurveySupplied: false, exactDimensionsAvailable: true, conflictStatus: "none",
    ruralOrNonStandard: false,
  });
  assert.equal(invalid.valid, false);
  assert.match(invalid.issues.join(" "), /registered survey/i);
  assert.match(boundary.MAPPED_BOUNDARY_NOTICE, /registered surveyor/);
});

const references = await import(dataUrl(transpile(await readFile(new URL("../app/lib/report-platform/reference-material.ts", import.meta.url), "utf8"))));
test("reference workflow rejects private networks and requires a URL, file or brief", () => {
  assert.equal(references.validateReferenceUrl("http://127.0.0.1/private").valid, false);
  assert.equal(references.validateReferenceUrl("http://192.168.1.1/plan.pdf").valid, false);
  assert.equal(references.validateReferenceUrl("https://example.com/model").valid, true);
  const missing = references.validateReferenceRequirement({ url: null, storageReference: null, writtenBrief: "" });
  assert.equal(missing.valid, false);
});

const registrySource = transpile(await readFile(new URL("../app/lib/report-platform/report-template-registry.ts", import.meta.url), "utf8"))
  .replace('from "./report-catalogue";', `from "${catalogueUrl}";`)
  .replace('from "./types";', 'from "data:text/javascript,export%20{}";');
const registry = await import(dataUrl(registrySource));
test("every report template preserves all 25 common sections and development visuals", () => {
  assert.equal(registry.REPORT_TEMPLATE_REGISTRY.length, catalogue.REPORT_CATALOGUE.length);
  for (const template of registry.REPORT_TEMPLATE_REGISTRY) {
    const sectionCodes = template.requiredSections.map((section) => section.code);
    assert.equal(
      new Set(sectionCodes).size,
      sectionCodes.length,
      `${template.id} contains duplicate required sections`,
    );
    for (const [code] of registry.COMMON_REPORT_SECTIONS) {
      assert.ok(template.requiredSections.some((section) => section.code === code), `${template.id} missing ${code}`);
    }
    const reportId = catalogue.REPORT_CATALOGUE.find(
      (entry) => entry.templateId === template.id,
    )?.id;
    assert.ok(reportId, `${template.id} is not connected to the catalogue`);
    for (const [code] of registry.REPORT_SPECIFIC_SECTIONS[reportId]) {
      assert.ok(
        template.requiredSections.some((section) => section.code === code),
        `${template.id} missing report-specific section ${code}`,
      );
    }
  }
  for (const report of catalogue.REPORT_CATALOGUE.filter((entry) => entry.developmentSpecific)) {
    const template = registry.REPORT_TEMPLATE_BY_ID.get(report.templateId);
    assert.ok(template.requiredSections.some((section) => section.code === "concept_visualisations"));
  }
});

const visualSource = transpile(await readFile(new URL("../app/lib/report-platform/architectural-visualisations.ts", import.meta.url), "utf8"))
  .replace('from "./report-catalogue";', `from "${catalogueUrl}";`)
  .replace('from "./types";', 'from "data:text/javascript,export%20{}";');
const visuals = await import(dataUrl(visualSource));

const visualRequest = (patch = {}) => ({
  schemaVersion: "FRC_ARCHITECTURAL_VISUALISATION_V1",
  orderId: "o1", reportId: "r1", jobId: "j1", propertyReference: "1 Test Street",
  selectedReportId: "granny_flat", customerCategory: "property_owner",
  projectMotivation: { selections: ["Create independent accommodation"], writtenMotivation: "Create independent accommodation", intendedUsers: "Parents", desiredRooms: [], bedroomCount: 2, bathroomCount: 1, approximateFloorAreaSqm: 60, storeyPreference: "single", accessibilityRequirements: [], preferredStyle: null, preferredMaterials: [], relationshipToExistingDwelling: null, privacyPreferences: [], outdoorSpacePriorities: [], parkingNeeds: null, budgetRange: null, timeframe: null },
  writtenBrief: "", desiredSpaces: [], referenceMaterialSummary: [], uploadedImageReferences: [],
  propertyPhotographs: [], verifiedPropertyFacts: [], parcelGeometry: null,
  boundaryStatus: "official_parcel_mapped", northDirection: null, landAreaSqm: 550,
  existingBuildingFacts: [], proposedDevelopmentType: "Granny Flat Feasibility Report",
  planningConstraints: [], uploadedSurveyFacts: [], titleAndEasementFacts: [],
  sewerAndServiceFacts: [], stormwaterFacts: [], treesAndVegetation: [],
  floodAndBushfireInformation: [], privacyConsiderations: [], professionalReviewRequirement: false,
  requiredVisualisationType: "before_after", mandatoryLabels: [visuals.VISUAL_DISCLAIMER],
  prohibitedClaims: [], ...patch,
});
const visualOutput = (patch = {}) => ({
  id: "v1", orderId: "o1", reportId: "r1", jobId: "j1", visualisationType: "before_after",
  provider: "mock", model: "mock", promptVersion: "v1", sourceInputsUsed: [], outputStorageReference: "mock.png",
  width: 1600, height: 1000, generatedAt: new Date().toISOString(), status: "validating",
  professionalReviewStatus: "not_required", disclaimer: visuals.VISUAL_DISCLAIMER,
  caption: "Granny Flat Feasibility Report concept responding to Create independent accommodation.",
  purpose: "Concept", legend: [], sourceConfidence: {}, revision: 1, failureReason: null,
  validationIssues: [], recommendedNextAction: "Confirm evidence.", ...patch,
});

test("visual validation blocks unsafe release and preserves mandatory disclaimers", () => {
  const beforeAfter = visuals.validateArchitecturalVisualisation({ request: visualRequest(), output: visualOutput() });
  assert.equal(beforeAfter.valid, false);
  assert.match(beforeAfter.issues.join(" "), /usable authorised property photograph/i);
  const services = visuals.validateArchitecturalVisualisation({
    request: visualRequest({ requiredVisualisationType: "services_plumbing" }),
    output: visualOutput({ visualisationType: "services_plumbing", disclaimer: visuals.VISUAL_DISCLAIMER, caption: "Granny Flat Feasibility Report confirmed sewer route for Create independent accommodation." }),
  });
  assert.equal(services.valid, false);
  assert.match(services.issues.join(" "), /services|service routes/i);
});

test("web workflow includes accessible report information, target wording and unticked SMS consent", async () => {
  const wizard = await readFile(new URL("../app/components/planning-simulation-wizard.tsx", import.meta.url), "utf8");
  assert.match(wizard, /aria-expanded=\{open\}/);
  assert.match(wizard, /aria-controls=\{`report-info-/);
  assert.match(wizard, /View inclusions for/);
  assert.match(wizard, /smsConsent: false/);
  assert.match(wizard, /Reference material helps FRC understand your intended outcome/);
});

test("uploaded files are reconciled by server category before Continue", async () => {
  const uploadState = await import(dataUrl(transpile(await readFile(
    new URL("../app/lib/planning-simulation/document-upload-state.ts", import.meta.url),
    "utf8",
  ))));
  const grouped = uploadState.groupUploadedDocuments(
    [
      { id: "doc-1", category: "site_photographs" },
      { id: "doc-2", category: "architectural_plans" },
    ],
    new Set(["site_photographs", "architectural_plans"]),
  );
  assert.deepEqual(
    uploadState.missingSelectedUploadCategories(
      ["site_photographs", "architectural_plans"],
      grouped,
    ),
    [],
  );
  const [wizard, documentsRoute] = await Promise.all([
    readFile(new URL("../app/components/planning-simulation-wizard.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/api/planning-simulation/documents/route.ts", import.meta.url), "utf8"),
  ]);
  assert.match(wizard, /reconcileUploadedDocuments/);
  assert.match(documentsRoute, /export async function GET/);
});

test("report pack and email source enforce safe defaults and one-time delivery", async () => {
  const [pack, packRoute, notifications] = await Promise.all([
    readFile(new URL("../app/lib/report-platform/report-pack.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/planning-simulation/reports/[reportId]/pack/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/lib/report-platform/notification-provider.ts", import.meta.url), "utf8"),
  ]);
  assert.match(pack, /includeClientUploads/);
  assert.match(pack, /malwareScanStatus !== "clean"/);
  assert.match(pack, /\["accepted", "approved"\]/);
  assert.match(pack, /sha256/);
  assert.match(pack, /templateSnapshots \?\? \[\]/);
  assert.match(packRoute, /confirmOwnership/);
  assert.match(packRoute, /getPrivateStorageProvider/);
  assert.match(packRoute, /document_authority/);
  assert.match(notifications, /hasNotification/);
  assert.match(notifications, /Your FRC report pack is ready/);
});

test("official research, frozen templates and queued generation gate the workflow", async () => {
  const [sourceRoute, orderRoute, generation, paymentRoute, statusClient] =
    await Promise.all([
      readFile(new URL("../app/api/site-analysis/route.ts", import.meta.url), "utf8"),
      readFile(new URL("../app/api/planning-simulation/orders/route.ts", import.meta.url), "utf8"),
      readFile(new URL("../app/lib/report-platform/report-generation.ts", import.meta.url), "utf8"),
      readFile(new URL("../app/api/planning-simulation/mock-payment/route.ts", import.meta.url), "utf8"),
      readFile(new URL("../app/report-status/[jobId]/report-status-client.tsx", import.meta.url), "utf8"),
    ]);
  assert.match(sourceRoute, /propertyResearchStatus: "complete"/);
  assert.match(sourceRoute, /status: "lookup_failed"/);
  assert.match(sourceRoute, /propertyResearchRetrievedAt/);
  assert.match(orderRoute, /Complete the official NSW property source scan/);
  assert.match(orderRoute, /ready_for_checkout", "awaiting_payment"/);
  assert.match(generation, /templateSnapshots/);
  assert.match(generation, /documentAnalysisIncludedForReports/);
  assert.match(generation, /Official property research must complete/);
  assert.match(paymentRoute, /createQueuedMockReportJob/);
  assert.match(paymentRoute, /after\(async/);
  assert.match(statusClient, /setInterval/);
});
