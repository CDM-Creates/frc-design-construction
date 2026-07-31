import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

const catalogueSource = await readFile(new URL("../app/lib/planning-simulation/development-items.ts", import.meta.url), "utf8");
const catalogueJs = ts.transpileModule(catalogueSource, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText.replace('from "./types";', 'from "data:text/javascript,export%20{}";');
const catalogueUrl = `data:text/javascript;base64,${Buffer.from(catalogueJs).toString("base64")}`;
const pricingSource = await readFile(new URL("../app/lib/planning-simulation/pricing.ts", import.meta.url), "utf8");
const pricingJs = ts.transpileModule(pricingSource, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText
  .replace('from "./development-items";', `from "${catalogueUrl}";`)
  .replace('from "./types";', 'from "data:text/javascript,export%20{}";');
const {
  calculatePlanningPrice,
  freezePriceSnapshot,
  getMissingDevelopmentPricingRules,
  DEVELOPMENT_ITEM_PRICE_RULES,
} = await import(`data:text/javascript;base64,${Buffer.from(pricingJs).toString("base64")}`);

const input = (selectedItemCodes, patch = {}) => ({
  propertyCount: 1,
  selectedItemCodes,
  clientRequestedLargeSiteAnalysis: false,
  plansStatus: "none",
  documentAnalysisUpgrades: [],
  detailedAlternativesRequested: false,
  councilSubmissionRequested: false,
  professionalVerificationRequested: false,
  priorityRequested: false,
  discoveredConstraints: [],
  preliminaryOrVerified: "preliminary",
  ...patch,
});

test("the core report and every selected assessment add their explicit fees", () => {
  const result = calculatePlanningPrice(input(["POOL_SPA"]));
  assert.equal(result.corePriceCents, 69_500);
  assert.equal(result.totalCents, 94_500);
  assert.equal(result.assessmentCount, 1);
  assert.equal(result.lineItems.find((line) => line.code === "ASSESSMENT_POOL_SPA")?.amountCents, 25_000);
});

test("category navigation cannot affect a price", () => {
  const first = calculatePlanningPrice(input(["NEW_TWO_STOREY_DWELLING"]));
  const second = calculatePlanningPrice(input(["NEW_TWO_STOREY_DWELLING"]));
  assert.equal(first.totalCents, second.totalCents);
  assert.equal(first.totalCents, 134_500);
});

test("every billable catalogue item has a pricing rule", () => {
  assert.deepEqual(getMissingDevelopmentPricingRules(), []);
  assert.ok(Object.keys(DEVELOPMENT_ITEM_PRICE_RULES).length > 40);
});

test("duplicate selections do not duplicate an assessment", () => {
  const result = calculatePlanningPrice(input(["POOL_SPA", "POOL_SPA"]));
  assert.equal(result.assessmentCount, 1);
  assert.equal(result.totalCents, 94_500);
});

test("two or more assessments add one coordination fee", () => {
  const two = calculatePlanningPrice(input(["POOL_SPA", "ATTACHED_GRANNY_FLAT"]));
  assert.equal(two.totalCents, 169_000);
  assert.equal(two.lineItems.filter((line) => line.code === "COMBINED_SITE_COORDINATION").length, 1);
  const three = calculatePlanningPrice(input(["POOL_SPA", "ATTACHED_GRANNY_FLAT", "PERGOLA"]));
  assert.equal(three.lineItems.filter((line) => line.code === "COMBINED_SITE_COORDINATION").length, 1);
});

test("professional review applies its fee and transparent A$2,195 launch minimum", () => {
  const result = calculatePlanningPrice(input(["POOL_SPA"], { professionalVerificationRequested: true }));
  assert.equal(result.totalCents, 219_500);
  assert.equal(result.lineItems.find((line) => line.code === "FRC_PROFESSIONAL_VERIFICATION")?.amountCents, 89_500);
  assert.ok(result.lineItems.some((line) => line.code === "PROFESSIONAL_REVIEW_MINIMUM_ADJUSTMENT"));
});

test("council readiness applies its fee and transparent A$3,500 launch minimum", () => {
  const result = calculatePlanningPrice(input(["POOL_SPA"], {
    professionalVerificationRequested: true,
    councilSubmissionRequested: true,
  }));
  assert.equal(result.totalCents, 350_000);
  assert.ok(result.lineItems.some((line) => line.code === "COUNCIL_READINESS_MINIMUM_ADJUSTMENT"));
});

test("priority and council readiness cannot exist without professional verification", () => {
  assert.throws(() => calculatePlanningPrice(input(["POOL_SPA"], { priorityRequested: true })), /requires FRC professional/);
  assert.throws(() => calculatePlanningPrice(input(["POOL_SPA"], { councilSubmissionRequested: true })), /requires FRC professional/);
});

test("four major assessments and tailored catalogue items disable automatic checkout", () => {
  const major = calculatePlanningPrice(input([
    "NEW_SINGLE_STOREY_DWELLING",
    "HOME_EXTENSION",
    "ATTACHED_GRANNY_FLAT",
    "MAX_BUILDING_ENVELOPE",
  ]));
  assert.equal(major.quoteRequired, true);
  assert.equal(major.totalCents, null);
  assert.equal(major.tailoredEngagementFromCents, 350_000);
  assert.equal(calculatePlanningPrice(input(["SUBDIVISION"])).quoteRequired, true);
});

test("removing a tailored item immediately restores the remaining fixed price", () => {
  const tailored = calculatePlanningPrice(input(["NEW_TWO_STOREY_DWELLING", "SUBDIVISION"]));
  assert.equal(tailored.quoteRequired, true);
  assert.equal(tailored.totalCents, null);

  const restored = calculatePlanningPrice(input(["NEW_TWO_STOREY_DWELLING"]));
  assert.equal(restored.quoteRequired, false);
  assert.equal(restored.totalCents, 134_500);
});

test("incomplete external plans and significant source conflicts require a tailored engagement", () => {
  assert.equal(calculatePlanningPrice(input(["POOL_SPA"], { plansStatus: "external_incomplete" })).quoteRequired, true);
  const conflict = calculatePlanningPrice(input(["POOL_SPA"], {
    discoveredConstraints: [{
      code: "HERITAGE",
      label: "Confirmed heritage listing",
      severity: "significant",
      quoteTriggered: true,
      sourceStatus: "official",
    }],
  }));
  assert.equal(conflict.quoteRequired, true);
});

test("basic uploads do not create charges while premium interpretation does", () => {
  const basic = calculatePlanningPrice(input(["POOL_SPA"]));
  const upgraded = calculatePlanningPrice(input(["POOL_SPA"], { documentAnalysisUpgrades: ["registered_survey", "flood_report"] }));
  const reviewedUpgraded = calculatePlanningPrice(input(["POOL_SPA"], {
    professionalVerificationRequested: true,
    priorityRequested: true,
    documentAnalysisUpgrades: ["registered_survey", "flood_report"],
  }));
  assert.equal(basic.totalCents, 94_500);
  assert.equal(upgraded.totalCents, 149_000);
  assert.equal(reviewedUpgraded.totalCents, 309_000);
});

test("a browser-claimed total is ignored and the frozen snapshot is stable", async () => {
  const pricingInput = input(["NEW_TWO_STOREY_DWELLING"], { browserClaimedTotalCents: 1 });
  const result = calculatePlanningPrice(pricingInput);
  assert.equal(result.totalCents, 134_500);
  const snapshot = await freezePriceSnapshot(pricingInput, "gst_not_applicable");
  assert.equal(snapshot.totalCents, 134_500);
  assert.equal(snapshot.pricingVersion, "FRC_REPORT_PRICING_2026_02");
  assert.equal(snapshot.inputHash.length, 64);
});
