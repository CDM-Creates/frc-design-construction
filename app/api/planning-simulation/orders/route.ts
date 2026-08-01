import { DEVELOPMENT_ITEM_BY_CODE } from "../../../lib/planning-simulation/development-items";
import {
  COUNCIL_READINESS_REQUIRED_DOCUMENTS,
  DOCUMENT_ANALYSIS_UPGRADE_BY_CODE,
  DOCUMENT_CATEGORY_BY_CODE,
} from "../../../lib/planning-simulation/document-categories";
import { freezePriceSnapshot } from "../../../lib/planning-simulation/pricing";
import type {
  DocumentAnalysisUpgradeCode,
  DocumentCategoryCode,
  PlanningPricingInput,
  PlansStatus,
  SelectedDevelopmentItem,
} from "../../../lib/planning-simulation/types";
import { getBusinessConfiguration, getPlatformDataBackend } from "../../../lib/report-platform/config";
import {
  CUSTOMER_TYPES,
  DECISION_OBJECTIVES,
  documentAnalysisIncludedForReports,
  freezeCataloguePrice,
  isDocumentAnalysisIncluded,
  REPORT_BY_ID,
  type CustomerTypeId,
  type DecisionObjectiveId,
} from "../../../lib/report-platform/report-catalogue";
import { fetchSafeReferenceMetadata, validateReferenceRequirement, type ReferenceMaterialInput } from "../../../lib/report-platform/reference-material";
import { getReportPlatformRepository } from "../../../lib/report-platform/repository";
import { hashAccessToken, safeRequestMetadata, tokenMatches, verifyServerProof } from "../../../lib/report-platform/security";
import type { ConsentRecord } from "../../../lib/report-platform/types";

const plansStatuses = new Set<PlansStatus>(["none", "frc_final", "frc_in_progress", "external_complete", "external_incomplete", "sheila_concept_required"]);
const documentUpgradeCodes = new Set<DocumentAnalysisUpgradeCode>([
  "architectural_plan_set", "registered_survey", "engineering_or_stormwater",
  "bushfire_report", "flood_report", "arborist_report", "geotechnical_report",
  "other_specialist_report",
]);
const customerTypeIds = new Set(CUSTOMER_TYPES.map((customer) => customer.id));
const decisionObjectiveIds = new Set(DECISION_OBJECTIVES.map((objective) => objective.id));

const clean = (value: unknown, max: number) => typeof value === "string" ? value.trim().slice(0, max) : "";

const cleanList = (value: unknown, maximumItems = 50, maximumLength = 500) =>
  Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string").map((item) => clean(item, maximumLength)).filter(Boolean).slice(0, maximumItems)
    : [];

const optionalNumber = (value: unknown, minimum = 0, maximum = 1_000_000) => {
  const number = Number(value);
  return Number.isFinite(number) && number >= minimum && number <= maximum ? number : null;
};

function parseProjectMotivation(value: unknown) {
  const raw = value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
  return {
    selections: cleanList(raw.selections, 30, 240),
    writtenMotivation: clean(raw.writtenMotivation, 10_000),
    intendedUsers: clean(raw.intendedUsers, 2_000),
    desiredRooms: cleanList(raw.desiredRooms, 100, 240),
    bedroomCount: optionalNumber(raw.bedroomCount, 0, 20),
    bathroomCount: optionalNumber(raw.bathroomCount, 0, 20),
    approximateFloorAreaSqm: optionalNumber(raw.approximateFloorAreaSqm, 1, 10_000),
    storeyPreference: clean(raw.storeyPreference, 100) || null,
    accessibilityRequirements: cleanList(raw.accessibilityRequirements, 50, 500),
    preferredStyle: clean(raw.preferredStyle, 1_000) || null,
    preferredMaterials: cleanList(raw.preferredMaterials, 50, 500),
    relationshipToExistingDwelling: clean(raw.relationshipToExistingDwelling, 2_000) || null,
    privacyPreferences: cleanList(raw.privacyPreferences, 50, 500),
    outdoorSpacePriorities: cleanList(raw.outdoorSpacePriorities, 50, 500),
    parkingNeeds: clean(raw.parkingNeeds, 1_000) || null,
    budgetRange: clean(raw.budgetRange, 500) || null,
    timeframe: clean(raw.timeframe, 500) || null,
  };
}

function normaliseBoundaryStatus(value: unknown) {
  const status = clean(value, 80);
  if (status === "mapped") return "official_parcel_mapped";
  if (status === "requires_verification") return "conflict_detected";
  if ([
    "survey_confirmed",
    "deposited_plan_supported",
    "official_parcel_mapped",
    "client_supplied",
    "approximate_only",
    "unavailable",
    "conflict_detected",
  ].includes(status)) {
    return status;
  }
  return "unavailable";
}

function parseSelectedItems(value: unknown, allowEmpty: boolean): SelectedDevelopmentItem[] {
  if (!Array.isArray(value)) {
    if (allowEmpty) return [];
    throw new Error("Select at least one development assessment.");
  }
  if ((!allowEmpty && value.length < 1) || value.length > 20) throw new Error("Select a valid number of development assessments.");
  const unique = new Set<string>();
  return value.map((raw, index) => {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new Error("A development item is invalid.");
    const item = raw as Record<string, unknown>;
    const code = clean(item.code, 80);
    if (!DEVELOPMENT_ITEM_BY_CODE.has(code) || unique.has(code)) throw new Error("A selected development item is invalid or duplicated.");
    unique.add(code);
    return {
      code,
      selectedDetails: Array.isArray(item.selectedDetails)
        ? item.selectedDetails.filter((detail): detail is string => typeof detail === "string").map((detail) => detail.slice(0, 120)).slice(0, 30)
        : [],
      selectionOrder: index,
    };
  });
}

function parseReportIds(value: unknown) {
  if (!Array.isArray(value)) return [];
  const ids = [...new Set(value.filter((id): id is string => typeof id === "string").map((id) => id.slice(0, 80)))];
  if (ids.length > 15 || ids.some((id) => !REPORT_BY_ID.has(id))) throw new Error("A selected report is invalid.");
  return ids;
}

function parseDocumentAnalysisUpgrades(value: unknown) {
  if (!Array.isArray(value)) return [];
  if (
    value.some(
      (code) =>
        typeof code !== "string" ||
        !documentUpgradeCodes.has(code as DocumentAnalysisUpgradeCode),
    )
  ) {
    throw new Error("A selected document-analysis upgrade is invalid.");
  }
  const upgrades = [
    ...new Set(
      value as DocumentAnalysisUpgradeCode[],
    ),
  ];
  return upgrades;
}

function parsePricingInput(value: unknown, selectedItems: SelectedDevelopmentItem[]): PlanningPricingInput {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("The pricing basis is missing.");
  const raw = value as Record<string, unknown>;
  const plansStatus = clean(raw.plansStatus, 40) as PlansStatus;
  if (!plansStatuses.has(plansStatus)) throw new Error("The plans status is invalid.");
  const propertyCount = Number(raw.propertyCount);
  if (!Number.isInteger(propertyCount) || propertyCount < 1 || propertyCount > 20) throw new Error("The property count is invalid.");
  const codes = Array.isArray(raw.selectedItemCodes) ? raw.selectedItemCodes.filter((code): code is string => typeof code === "string") : [];
  if (codes.join("|") !== selectedItems.map((item) => item.code).join("|")) throw new Error("The selected scope does not match the pricing basis.");
  const professionalVerificationRequested = raw.professionalVerificationRequested === true;
  const priorityRequested = raw.priorityRequested === true;
  const councilSubmissionRequested = raw.councilSubmissionRequested === true;
  if (priorityRequested && !professionalVerificationRequested) throw new Error("Priority review requires professional verification.");
  if (councilSubmissionRequested && !professionalVerificationRequested) throw new Error("Council-submission readiness requires professional verification.");
  return {
    propertyCount,
    selectedItemCodes: codes,
    clientRequestedLargeSiteAnalysis: raw.clientRequestedLargeSiteAnalysis === true,
    plansStatus,
    documentAnalysisUpgrades: Array.isArray(raw.documentAnalysisUpgrades)
      ? [...new Set(raw.documentAnalysisUpgrades.filter((code): code is DocumentAnalysisUpgradeCode => typeof code === "string" && documentUpgradeCodes.has(code as DocumentAnalysisUpgradeCode)))]
      : [],
    detailedAlternativesRequested: raw.detailedAlternativesRequested === true,
    councilSubmissionRequested,
    professionalVerificationRequested,
    priorityRequested,
    discoveredConstraints: Array.isArray(raw.discoveredConstraints)
      ? raw.discoveredConstraints.filter((item): item is PlanningPricingInput["discoveredConstraints"][number] =>
          Boolean(item) && typeof item === "object" && !Array.isArray(item) && typeof (item as { code?: unknown }).code === "string",
        ).slice(0, 30)
      : [],
    preliminaryOrVerified: raw.preliminaryOrVerified === "verified" ? "verified" : "preliminary",
  };
}

function parseReferences(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.slice(0, 30).map((item) => {
    const raw = item && typeof item === "object" && !Array.isArray(item) ? item as Record<string, unknown> : {};
    return {
      reportId: clean(raw.reportId, 80),
      url: clean(raw.url, 2_000) || null,
      storageReference: null,
      title: clean(raw.title, 300) || null,
      supplierOrDesigner: clean(raw.supplierOrDesigner, 300) || null,
      modelName: clean(raw.modelName, 200) || null,
      whatClientLikes: clean(raw.whatClientLikes, 1_000) || null,
      exactModelIntended: raw.exactModelIntended === true,
      approximateFloorAreaSqm: Number.isFinite(Number(raw.approximateFloorAreaSqm)) ? Number(raw.approximateFloorAreaSqm) : null,
      bedroomCount: Number.isInteger(Number(raw.bedroomCount)) ? Number(raw.bedroomCount) : null,
      storeyCount: Number.isInteger(Number(raw.storeyCount)) ? Number(raw.storeyCount) : null,
      preferredFeatures: Array.isArray(raw.preferredFeatures) ? raw.preferredFeatures.filter((entry): entry is string => typeof entry === "string").slice(0, 30) : [],
      clientNotes: clean(raw.clientNotes, 2_000) || null,
      writtenBrief: clean(raw.writtenBrief, 5_000) || null,
    };
  });
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as Record<string, unknown>;
    const orderId = clean(body.orderId, 80);
    const accessToken = clean(body.accessToken, 160);
    const repository = await getReportPlatformRepository();
    let order = await repository.getOrder(orderId);
    if (!order && getPlatformDataBackend() === "node" && orderId && accessToken) {
      order = await repository.createDraftOrder(await hashAccessToken(accessToken), orderId);
    }
    if (!order || !(await tokenMatches(accessToken, order.ownerHash))) return Response.json({ error: "Order authorisation failed." }, { status: 403 });
    if (
      ["ready_for_checkout", "awaiting_payment"].includes(order.status) &&
      order.priceSnapshot
    ) {
      const { ownerHash: _ownerHash, ...safeOrder } = order;
      void _ownerHash;
      return Response.json(
        {
          order: safeOrder,
          priceSnapshot: order.priceSnapshot,
          checkoutAvailable: !order.priceSnapshot.quoteRequired,
          idempotentReplay: true,
        },
        { headers: { "Cache-Control": "no-store" } },
      );
    }
    if (!["draft", "awaiting_uploads"].includes(order.status)) throw new Error("This order has already been confirmed.");

    const selectedReportIds = parseReportIds(body.selectedReportIds);
    const usingCatalogue = selectedReportIds.length > 0;
    const selectedBaseReports = selectedReportIds.filter(
      (id) => !["professional_review", "council_readiness"].includes(id),
    );
    if (
      selectedReportIds.includes("professional_review") &&
      selectedBaseReports.length === 0
    ) {
      return Response.json(
        { error: "Professional review requires at least one substantive base report." },
        { status: 409 },
      );
    }
    if (
      selectedReportIds.includes("council_readiness") &&
      !selectedBaseReports.some(
        (id) =>
          REPORT_BY_ID.get(id)?.developmentSpecific &&
          id !== "complex_development",
      )
    ) {
      return Response.json(
        {
          error:
            "Council-readiness requires an applicable development feasibility or plan-compliance report.",
        },
        { status: 409 },
      );
    }
    if (usingCatalogue && order.property.propertyResearchStatus !== "complete") {
      const proof = clean(body.propertyResearchProof, 2_000_000);
      if (proof) {
        const verified = await verifyServerProof<{ orderId: string; property: Record<string, unknown>; expiresAt: string }>(proof);
        if (verified.orderId !== order.id || verified.property?.propertyResearchStatus !== "complete") {
          throw new Error("The property-research proof does not match this order.");
        }
        order.property = verified.property;
        order.updatedAt = new Date().toISOString();
        await repository.saveOrder(order);
      }
    }
    if (usingCatalogue && order.property.propertyResearchStatus !== "complete") {
      return Response.json(
        {
          error:
            "Complete the official NSW property source scan before confirming a report order.",
        },
        { status: 409 },
      );
    }
    const selectedItems = parseSelectedItems(body.selectedItems, usingCatalogue);
    const pricingInput = usingCatalogue ? null : parsePricingInput(body.pricingInput, selectedItems);
    const nestedPricingInput =
      body.pricingInput &&
      typeof body.pricingInput === "object" &&
      !Array.isArray(body.pricingInput)
        ? (body.pricingInput as Record<string, unknown>)
        : {};
    const requestedDocumentAnalysisUpgrades = usingCatalogue
      ? parseDocumentAnalysisUpgrades(
          body.documentAnalysisUpgrades ??
            nestedPricingInput.documentAnalysisUpgrades,
        )
      : pricingInput!.documentAnalysisUpgrades;
    const chargeableDocumentAnalysisUpgrades = usingCatalogue
      ? requestedDocumentAnalysisUpgrades.filter(
          (code) => !isDocumentAnalysisIncluded(selectedReportIds, code),
        )
      : requestedDocumentAnalysisUpgrades;
    const effectiveDocumentAnalysisUpgrades = usingCatalogue
      ? [
          ...new Set([
            ...chargeableDocumentAnalysisUpgrades,
            ...documentAnalysisIncludedForReports(selectedReportIds),
          ]),
        ]
      : chargeableDocumentAnalysisUpgrades;
    const availableDocumentCategories = Array.isArray(body.availableDocumentCategories)
      ? [...new Set(body.availableDocumentCategories.filter((code): code is DocumentCategoryCode => typeof code === "string" && DOCUMENT_CATEGORY_BY_CODE.has(code as DocumentCategoryCode)))]
      : [];
    const documents = await repository.listDocuments(orderId);
    const uploadedCategories = new Set(documents.map((document) => document.category));
    const uploadedReferenceDocuments = documents.filter(
      (document) => document.category === "reference_material",
    );
    const awaiting = availableDocumentCategories.filter((category) => !uploadedCategories.has(category));
    if (awaiting.length) return Response.json({ error: "You marked this document as available. Upload at least one file or untick the document.", awaitingCategories: awaiting }, { status: 409 });
    for (const code of chargeableDocumentAnalysisUpgrades) {
      const upgrade = DOCUMENT_ANALYSIS_UPGRADE_BY_CODE.get(code);
      const hasEligibleUpload = upgrade?.eligibleDocumentCategories.some(
        (category) =>
          availableDocumentCategories.includes(category) &&
          documents.some(
            (document) =>
              document.category === category &&
              document.automatedInterpretationEligible,
          ),
      );
      if (!upgrade || !hasEligibleUpload) {
        return Response.json(
          {
            error: `${upgrade?.label ?? "The selected document analysis"} requires at least one PDF or supported image upload in its matching document category. DWG and DXF remain manual-review only.`,
          },
          { status: 409 },
        );
      }
    }

    const references = parseReferences(body.referenceMaterials);
    if (usingCatalogue) {
      for (const reportId of selectedReportIds) {
        const report = REPORT_BY_ID.get(reportId)!;
        if (report.referencesRequired) {
          const supplied = references.filter((reference) => reference.reportId === reportId);
          if (
            uploadedReferenceDocuments.length === 0 &&
            (!supplied.length || supplied.every((reference) => !validateReferenceRequirement({
              ...reference,
              reportSelectionId: reportId,
              propertyId: orderId,
            } as ReferenceMaterialInput).valid))
          ) {
            return Response.json({ error: `${report.name} requires a reference URL, uploaded visual reference or written development brief.` }, { status: 409 });
          }
        }
        if (report.drawingsRequired && !uploadedCategories.has("architectural_plans")) {
          return Response.json({ error: `${report.name} requires an uploaded architectural plan set.` }, { status: 409 });
        }
      }
    }

    const councilRequested = usingCatalogue
      ? selectedReportIds.includes("council_readiness")
      : Boolean(pricingInput?.councilSubmissionRequested);
    if (councilRequested) {
      const missing = COUNCIL_READINESS_REQUIRED_DOCUMENTS.filter((category) => !uploadedCategories.has(category));
      if (missing.length) return Response.json({ error: "Council-submission readiness requires a complete document set before checkout.", missingCategories: missing }, { status: 409 });
    }

    const clientRaw = body.client && typeof body.client === "object" && !Array.isArray(body.client) ? body.client as Record<string, unknown> : {};
    const customerType = clean(clientRaw.customerType ?? clientRaw.role, 80) as CustomerTypeId;
    const decisionObjective = clean(clientRaw.decisionObjective, 80) as DecisionObjectiveId;
    if (usingCatalogue && (!customerTypeIds.has(customerType) || !decisionObjectiveIds.has(decisionObjective))) throw new Error("Choose a valid customer type and decision objective.");
    const client = {
      name: clean(clientRaw.name, 160),
      email: clean(clientRaw.email, 240).toLowerCase(),
      phone: clean(clientRaw.phone, 80),
      role: clean(clientRaw.role, 80) || customerType,
      customerType: usingCatalogue ? customerType : undefined,
      decisionObjective: usingCatalogue ? decisionObjective : undefined,
      smsConsent: clientRaw.smsConsent === true,
    };
    if (!client.name || !/^\S+@\S+\.\S+$/.test(client.email) || !client.phone) throw new Error("Name, email and phone are required.");

    const professionalReviewRequested = usingCatalogue
      ? body.professionalReviewRequested === true || selectedReportIds.some((id) => {
          const review = REPORT_BY_ID.get(id)?.professionalReview;
          return review === "mandatory" || review === "included";
        })
      : Boolean(pricingInput?.professionalVerificationRequested);
    const priorityRequested = usingCatalogue ? body.priorityReviewRequested === true : Boolean(pricingInput?.priorityRequested);
    const consentRaw = body.consents && typeof body.consents === "object" && !Array.isArray(body.consents) ? body.consents as Record<string, unknown> : {};
    const requiredConsentCodes: ConsentRecord["code"][] = ["preliminary_limitations", "document_authority", "secure_processing"];
    if (professionalReviewRequested) requiredConsentCodes.push("professional_timeframe");
    if (requiredConsentCodes.some((code) => consentRaw[code] !== true)) throw new Error("Accept every required acknowledgement before checkout.");
    const acceptedAt = new Date().toISOString();
    const consents = requiredConsentCodes.map((code) => ({ code, textVersion: "FRC_CONSENT_2026_01" as const, acceptedAt }));
    const business = getBusinessConfiguration();
    if (process.env.PAYMENTS_LIVE_ENABLED === "true" && business.taxTreatment === "unconfigured_test_only") throw new Error("GST configuration must be confirmed before live checkout.");

    const submittedProperty =
      body.property &&
      typeof body.property === "object" &&
      !Array.isArray(body.property)
        ? (body.property as Record<string, unknown>)
        : {};
    const trustedProperty =
      order.property.propertyResearchStatus === "complete"
        ? order.property
        : {};
    const property: Record<string, unknown> = {
      ...submittedProperty,
      ...trustedProperty,
      clientSuppliedAddress:
        trustedProperty.clientSuppliedAddress ??
        clean(submittedProperty.clientSuppliedAddress, 500),
      clientSuppliedAreaSqm:
        typeof submittedProperty.clientSuppliedAreaSqm === "number"
          ? submittedProperty.clientSuppliedAreaSqm
          : trustedProperty.clientSuppliedAreaSqm,
      parcelCount: Number.isInteger(Number(submittedProperty.parcelCount))
        ? Number(submittedProperty.parcelCount)
        : Number(trustedProperty.parcelCount ?? 1),
      ruralOrNonStandard: submittedProperty.ruralOrNonStandard === true,
      boundaryStatus: normaliseBoundaryStatus(
        trustedProperty.boundaryStatus ??
          trustedProperty.sourceAreaStatus ??
          submittedProperty.boundaryStatus,
      ),
    };
    const priceSnapshot = usingCatalogue
      ? await freezeCataloguePrice({
          reportIds: selectedReportIds,
          customerType,
          site: {
            areaSqm: typeof property.mappedAreaSqm === "number" ? property.mappedAreaSqm : typeof property.clientSuppliedAreaSqm === "number" ? property.clientSuppliedAreaSqm : null,
            areaStatus: clean(property.boundaryStatus, 80) as "survey_confirmed" | "deposited_plan_supported" | "official_parcel_mapped" | "client_supplied" | "approximate_only" | "unavailable" | "conflict_detected" || "unavailable",
            parcelCount: Number.isInteger(Number(property.parcelCount)) ? Number(property.parcelCount) : 1,
            ruralOrNonStandard: property.ruralOrNonStandard === true,
          },
          professionalReviewRequested:
            body.professionalReviewRequested === true ||
            selectedReportIds.includes("professional_review"),
          priorityReviewRequested: priorityRequested,
          documentAnalysisUpgrades: chargeableDocumentAnalysisUpgrades,
        }, business.taxTreatment)
      : await freezePriceSnapshot(pricingInput!, business.taxTreatment);

    const processedReferences = await Promise.all(references.map(async (reference) => {
      if (!reference.url) return { ...reference, accessStatus: reference.storageReference || reference.writtenBrief ? "not_required" : "inaccessible", accessedAt: null, extractedMetadata: {} };
      const metadata = await fetchSafeReferenceMetadata(reference.url, { timeoutMs: 5_000, maximumBytes: 512_000, maximumRedirects: 3 });
      return {
        ...reference,
        accessStatus: metadata.accessStatus,
        accessedAt: metadata.accessedAt,
        title: reference.title ?? metadata.pageTitle,
        extractedMetadata: metadata.extractedPublicMetadata,
      };
    }));
    const uploadedReferenceRecords = selectedReportIds
      .filter((reportId) => REPORT_BY_ID.get(reportId)?.referencesRequired)
      .flatMap((reportId) =>
        uploadedReferenceDocuments.map((document) => ({
          reportId,
          url: null,
          storageReference: document.storageReference,
          documentId: document.id,
          title: document.originalFilename,
          supplierOrDesigner: document.author,
          modelName: null,
          whatClientLikes: document.clientNote,
          exactModelIntended: false,
          approximateFloorAreaSqm: null,
          bedroomCount: null,
          storeyCount: null,
          preferredFeatures: [],
          clientNotes: document.clientNote,
          writtenBrief: null,
          accessStatus: "owned_client_upload",
          accessedAt: document.uploadedAt,
          extractedMetadata: {
            mimeType: document.mimeType,
            byteSize: document.byteSize,
          },
        })),
      );
    const motivation = parseProjectMotivation(body.projectMotivation);
    const clientResearchRaw = body.clientResearch && typeof body.clientResearch === "object" && !Array.isArray(body.clientResearch)
      ? body.clientResearch as Record<string, unknown>
      : {};
    const clientResearch = {
      urls: cleanList(clientResearchRaw.urls, 30, 2_000).filter((url) => {
        try {
          return ["http:", "https:"].includes(new URL(url).protocol);
        } catch {
          return false;
        }
      }),
      notes: clean(clientResearchRaw.notes, 10_000),
      evidenceStatus: "client_supplied_unverified",
    };
    const clientBrief = {
      schemaVersion: "FRC_CLIENT_BRIEF_2026_01",
      capturedAt: acceptedAt,
      property: {
        ownsProperty: body.ownsProperty === true,
        clientSuppliedAddress: property.clientSuppliedAddress ?? null,
        officialAddress: property.officialAddress ?? null,
        clientSuppliedAreaSqm: property.clientSuppliedAreaSqm ?? null,
        mappedAreaSqm: property.mappedAreaSqm ?? null,
        parcelCount: property.parcelCount ?? 1,
        lotDp: property.lotDp ?? null,
        council: property.council ?? null,
      },
      context: {
        customerType,
        decisionObjective,
      },
      selectedReports: selectedReportIds.map((id) => {
        const report = REPORT_BY_ID.get(id)!;
        return { id, name: report.name, templateId: report.templateId };
      }),
      project: motivation,
      plansAndDocuments: {
        plansStatus: plansStatuses.has(clean(body.plansStatus, 40) as PlansStatus) ? clean(body.plansStatus, 40) : "none",
        availableDocumentCategories,
        uploadedDocumentIds: documents.map((document) => document.id),
        documentAnalysisUpgrades: effectiveDocumentAnalysisUpgrades,
      },
      propertyResearch: {
        status: property.propertyResearchStatus ?? "not_verified",
        provider: property.propertyResearchProvider ?? null,
        retrievedAt: property.propertyResearchRetrievedAt ?? null,
        register: Array.isArray(property.researchRegister) ? property.researchRegister : [],
        clientSuppliedLeads: clientResearch,
      },
      references: [...processedReferences, ...uploadedReferenceRecords],
      notes: clean(body.notes, 5_000),
    };
    order.client = client;
    order.property = property;
    order.scope = {
      assessmentMode: clean(body.assessmentMode, 40) || "single",
      selectedItems,
      selectedReportIds: usingCatalogue ? selectedReportIds : undefined,
      availableDocumentCategories,
      pricingInput,
      documentAnalysisUpgrades: effectiveDocumentAnalysisUpgrades,
      notes: clean(body.notes, 5_000),
      projectMotivation: motivation,
      referenceMaterials: [...processedReferences, ...uploadedReferenceRecords],
      clientBrief,
    };
    order.priceSnapshot = priceSnapshot;
    order.pricingVersion = priceSnapshot.pricingVersion;
    order.taxTreatment = business.taxTreatment;
    order.consents = consents;
    order.professionalReviewRequired = professionalReviewRequested;
    order.priority = priorityRequested;
    order.tailoredQuote = priceSnapshot.quoteRequired;
    order.reportType = priceSnapshot.quoteRequired
      ? "tailored_quote"
      : councilRequested
        ? "council_readiness"
        : professionalReviewRequested
          ? "frc_professionally_reviewed"
          : "preliminary_ai_assisted";
    order.paymentStatus = priceSnapshot.quoteRequired ? "not_applicable" : "not_started";
    order.updatedAt = acceptedAt;
    await repository.saveOrder(order);
    const nextStatus = priceSnapshot.quoteRequired ? "tailored_quote_requested" : "ready_for_checkout";
    const updated = await repository.transitionOrder(order.id, nextStatus, "client", {
      priceSnapshotId: priceSnapshot.snapshotId,
      documentCount: documents.length,
      selectedReportIds,
      request: safeRequestMetadata(request),
    });
    const { ownerHash: _ownerHash, ...safeOrder } = updated;
    void _ownerHash;
    return Response.json({ order: safeOrder, priceSnapshot, checkoutAvailable: !priceSnapshot.quoteRequired });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "The order could not be confirmed." }, { status: 400 });
  }
}
