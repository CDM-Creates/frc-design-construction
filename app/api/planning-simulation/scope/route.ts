import { DEVELOPMENT_ITEM_BY_CODE } from "../../../lib/planning-simulation/development-items";
import { calculatePlanningPrice } from "../../../lib/planning-simulation/pricing";
import { buildPlanningReportTemplate } from "../../../lib/planning-simulation/report-templates";
import type {
  AssessmentMode,
  ClientRole,
  PlanningPricingInput,
  PlansStatus,
  ReportTemplateKind,
  SelectedDevelopmentItem,
} from "../../../lib/planning-simulation/types";
import { checkRateLimit } from "../../../lib/rate-limit";

type ScopeRequest = {
  clientRole: ClientRole;
  assessmentMode: AssessmentMode;
  property: Record<string, unknown>;
  selectedItems: SelectedDevelopmentItem[];
  pricingInput: PlanningPricingInput;
  plansStatus: PlansStatus;
  availableDocuments: string[];
  notes: string;
};

const clientRoles = new Set<ClientRole>([
  "owner",
  "buyer",
  "investor",
  "builder",
  "architect_designer",
  "other_professional",
]);
const assessmentModes = new Set<AssessmentMode>([
  "single",
  "combined",
  "alternatives",
]);
const planStatuses = new Set<PlansStatus>([
  "none",
  "frc_final",
  "frc_in_progress",
  "external_complete",
  "external_incomplete",
  "sheila_concept_required",
]);

function parseScope(value: unknown): ScopeRequest {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("A structured scope is required.");
  }
  const body = value as Record<string, unknown>;
  if (
    typeof body.clientRole !== "string" ||
    !clientRoles.has(body.clientRole as ClientRole)
  ) {
    throw new Error("Select a valid client purpose.");
  }
  if (
    typeof body.assessmentMode !== "string" ||
    !assessmentModes.has(body.assessmentMode as AssessmentMode)
  ) {
    throw new Error("Select a valid assessment method.");
  }
  if (!body.property || typeof body.property !== "object" || Array.isArray(body.property)) {
    throw new Error("Property details are required.");
  }
  if (!Array.isArray(body.selectedItems) || body.selectedItems.length < 1) {
    throw new Error("Select at least one development item.");
  }

  const selectedItems = body.selectedItems
    .filter(
      (item): item is Record<string, unknown> =>
        Boolean(item) && typeof item === "object" && !Array.isArray(item),
    )
    .map((item, index) => ({
      code: typeof item.code === "string" ? item.code : "",
      selectedDetails: Array.isArray(item.selectedDetails)
        ? item.selectedDetails
            .filter((detail): detail is string => typeof detail === "string")
            .map((detail) => detail.slice(0, 120))
        : [],
      selectionOrder: index,
    }))
    .filter((item) => DEVELOPMENT_ITEM_BY_CODE.has(item.code));

  if (selectedItems.length !== body.selectedItems.length) {
    throw new Error("One or more development items are not recognised.");
  }

  const rawPricing =
    body.pricingInput &&
    typeof body.pricingInput === "object" &&
    !Array.isArray(body.pricingInput)
      ? (body.pricingInput as Record<string, unknown>)
      : null;
  if (
    !rawPricing ||
    !Array.isArray(rawPricing.selectedItemCodes) ||
    rawPricing.selectedItemCodes.join("|") !==
      selectedItems.map((item) => item.code).join("|")
  ) {
    throw new Error("The confirmed scope does not match the pricing request.");
  }
  const propertyCount = Number(rawPricing.propertyCount);
  const plansStatus = rawPricing.plansStatus;
  if (
    !Number.isInteger(propertyCount) ||
    propertyCount < 1 ||
    propertyCount > 20 ||
    typeof plansStatus !== "string" ||
    !planStatuses.has(plansStatus as PlansStatus)
  ) {
    throw new Error("The pricing basis is invalid.");
  }
  const discoveredConstraints = Array.isArray(rawPricing.discoveredConstraints)
    ? rawPricing.discoveredConstraints
        .filter(
          (constraint): constraint is Record<string, unknown> =>
            Boolean(constraint) &&
            typeof constraint === "object" &&
            !Array.isArray(constraint),
        )
        .slice(0, 30)
        .map((constraint) => ({
          code:
            typeof constraint.code === "string"
              ? constraint.code.slice(0, 80)
              : "UNKNOWN",
          label:
            typeof constraint.label === "string"
              ? constraint.label.slice(0, 160)
              : "Property constraint",
          severity: ["low", "moderate", "significant", "unknown"].includes(
            String(constraint.severity),
          )
            ? (constraint.severity as "low" | "moderate" | "significant" | "unknown")
            : ("unknown" as const),
          quoteTriggered: constraint.quoteTriggered === true,
          sourceStatus: ["official", "uploaded", "client_supplied", "not_verified"].includes(
            String(constraint.sourceStatus),
          )
            ? (constraint.sourceStatus as "official" | "uploaded" | "client_supplied" | "not_verified")
            : ("not_verified" as const),
        }))
    : [];
  const pricingInput: PlanningPricingInput = {
    propertyCount,
    selectedItemCodes: selectedItems.map((item) => item.code),
    clientRequestedLargeSiteAnalysis:
      rawPricing.clientRequestedLargeSiteAnalysis === true,
    plansStatus: plansStatus as PlansStatus,
    documentAnalysisUpgrades: Array.isArray(rawPricing.documentAnalysisUpgrades)
      ? rawPricing.documentAnalysisUpgrades.filter(
          (code): code is PlanningPricingInput["documentAnalysisUpgrades"][number] =>
            typeof code === "string" &&
            [
              "architectural_plan_set",
              "registered_survey",
              "engineering_or_stormwater",
              "bushfire_report",
              "flood_report",
              "arborist_report",
              "geotechnical_report",
              "other_specialist_report",
            ].includes(code),
        )
      : [],
    detailedAlternativesRequested:
      rawPricing.detailedAlternativesRequested === true,
    councilSubmissionRequested:
      rawPricing.councilSubmissionRequested === true,
    professionalVerificationRequested:
      rawPricing.professionalVerificationRequested === true,
    priorityRequested: rawPricing.priorityRequested === true,
    discoveredConstraints,
    preliminaryOrVerified:
      rawPricing.preliminaryOrVerified === "verified"
        ? "verified"
        : "preliminary",
    browserClaimedTotalCents:
      typeof rawPricing.browserClaimedTotalCents === "number"
        ? rawPricing.browserClaimedTotalCents
        : undefined,
  };

  return {
    clientRole: body.clientRole as ClientRole,
    assessmentMode: body.assessmentMode as AssessmentMode,
    property: body.property as Record<string, unknown>,
    selectedItems,
    pricingInput,
    plansStatus: pricingInput.plansStatus,
    availableDocuments: Array.isArray(body.availableDocuments)
      ? body.availableDocuments
          .filter((document): document is string => typeof document === "string")
          .map((document) => document.slice(0, 120))
      : [],
    notes: typeof body.notes === "string" ? body.notes.trim().slice(0, 5000) : "",
  };
}

export async function POST(request: Request) {
  const client =
    request.headers.get("cf-connecting-ip") ??
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "anonymous";
  const limit = checkRateLimit(`planning-scope:${client}`, 20, 60 * 60 * 1000);
  if (!limit.allowed) {
    return Response.json(
      { error: "Too many scope confirmations. Please try again shortly." },
      { status: 429 },
    );
  }

  try {
    const scope = parseScope(await request.json());
    const pricing = calculatePlanningPrice(scope.pricingInput);
    const kind: ReportTemplateKind = pricing.quoteRequired
      ? "tailored_quote_brief"
      : scope.pricingInput.councilSubmissionRequested
        ? "council_submission_readiness"
        : scope.pricingInput.professionalVerificationRequested
          ? "architect_handover"
          : "preliminary_property_report";
    const template = buildPlanningReportTemplate({
      kind,
      assessmentMode: scope.assessmentMode,
      selectedItems: scope.selectedItems,
    });
    const now = new Date().toISOString();
    const requestId = crypto.randomUUID();

    return Response.json({
      simulationRequestId: requestId,
      savedAt: now,
      persistence: "client_draft",
      reportDataPack: {
        dataVersion: 1,
        simulationRequestId: requestId,
        client: { role: scope.clientRole },
        property: scope.property,
        developmentScope: {
          assessmentMode: scope.assessmentMode,
          items: scope.selectedItems.map((item) => ({
            ...item,
            name: DEVELOPMENT_ITEM_BY_CODE.get(item.code)?.name,
          })),
        },
        plans: {
          status: scope.plansStatus,
          availableDocuments: scope.availableDocuments,
        },
        planningFacts: [],
        environmentalConstraints: scope.pricingInput.discoveredConstraints,
        sourceRegister: [],
        pricing,
        notes: scope.notes,
        readiness: {
          readyForAiDraft: false,
          readyForProfessionalReview: true,
          reasons: [
            "Official facts and document extracts must be verified before AI drafting.",
            "FRC architect approval is required before any client release.",
          ],
        },
        routing: {
          architectReviewRequired: true,
          clientDeliveryBlockedUntilArchitectApproval: true,
        },
        reportTemplate: template,
      },
    });
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "The scope could not be confirmed.",
      },
      { status: 400 },
    );
  }
}
