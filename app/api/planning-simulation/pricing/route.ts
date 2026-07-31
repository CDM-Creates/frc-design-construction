import { checkRateLimit } from "../../../lib/rate-limit";
import { DEVELOPMENT_ITEM_BY_CODE } from "../../../lib/planning-simulation/development-items";
import { calculatePlanningPrice } from "../../../lib/planning-simulation/pricing";
import type {
  DocumentAnalysisUpgradeCode,
  PlanningPricingInput,
  PlansStatus,
  PropertyConstraintPricingInput,
} from "../../../lib/planning-simulation/types";

const planStatuses = new Set<PlansStatus>([
  "none",
  "frc_final",
  "frc_in_progress",
  "external_complete",
  "external_incomplete",
  "sheila_concept_required",
]);

const boolean = (value: unknown) => value === true;
const documentUpgradeCodes = new Set<DocumentAnalysisUpgradeCode>([
  "architectural_plan_set",
  "registered_survey",
  "engineering_or_stormwater",
  "bushfire_report",
  "flood_report",
  "arborist_report",
  "geotechnical_report",
  "other_specialist_report",
]);

function parseInput(value: unknown): PlanningPricingInput {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("A structured pricing request is required.");
  }
  const body = value as Record<string, unknown>;
  const propertyCount = Number(body.propertyCount);
  const selectedItemCodes = Array.isArray(body.selectedItemCodes)
    ? body.selectedItemCodes
        .filter((code): code is string => typeof code === "string")
        .map((code) => code.slice(0, 80))
    : [];

  if (!Number.isInteger(propertyCount) || propertyCount < 1 || propertyCount > 20) {
    throw new Error("Property count must be between 1 and 20.");
  }
  if (selectedItemCodes.length < 1 || selectedItemCodes.length > 20) {
    throw new Error("Select between one and twenty development items.");
  }
  if (selectedItemCodes.some((code) => !DEVELOPMENT_ITEM_BY_CODE.has(code))) {
    throw new Error("One or more development items are not recognised.");
  }

  const plansStatus = body.plansStatus;
  if (typeof plansStatus !== "string" || !planStatuses.has(plansStatus as PlansStatus)) {
    throw new Error("Select a valid plans status.");
  }

  const discoveredConstraints: PropertyConstraintPricingInput[] = Array.isArray(
    body.discoveredConstraints,
  )
    ? body.discoveredConstraints
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
            ? (constraint.severity as PropertyConstraintPricingInput["severity"])
            : "unknown",
          quoteTriggered: boolean(constraint.quoteTriggered),
          sourceStatus: ["official", "uploaded", "client_supplied", "not_verified"].includes(
            String(constraint.sourceStatus),
          )
            ? (constraint.sourceStatus as PropertyConstraintPricingInput["sourceStatus"])
            : "not_verified",
        }))
    : [];

  const professionalVerificationRequested = boolean(body.professionalVerificationRequested);
  const priorityRequested = boolean(body.priorityRequested);
  const councilSubmissionRequested = boolean(body.councilSubmissionRequested);
  if (priorityRequested && !professionalVerificationRequested) {
    throw new Error("Priority review requires FRC professional verification.");
  }
  if (councilSubmissionRequested && !professionalVerificationRequested) {
    throw new Error("Council-submission readiness requires FRC professional verification.");
  }

  return {
    propertyCount,
    selectedItemCodes,
    clientRequestedLargeSiteAnalysis: boolean(
      body.clientRequestedLargeSiteAnalysis,
    ),
    plansStatus: plansStatus as PlansStatus,
    documentAnalysisUpgrades: Array.isArray(body.documentAnalysisUpgrades)
      ? [...new Set(body.documentAnalysisUpgrades.filter(
          (code): code is DocumentAnalysisUpgradeCode =>
            typeof code === "string" && documentUpgradeCodes.has(code as DocumentAnalysisUpgradeCode),
        ))]
      : [],
    detailedAlternativesRequested: boolean(body.detailedAlternativesRequested),
    councilSubmissionRequested,
    professionalVerificationRequested,
    priorityRequested,
    discoveredConstraints,
    preliminaryOrVerified:
      body.preliminaryOrVerified === "verified" ? "verified" : "preliminary",
    browserClaimedTotalCents:
      typeof body.browserClaimedTotalCents === "number"
        ? body.browserClaimedTotalCents
        : undefined,
  };
}

export async function POST(request: Request) {
  const client =
    request.headers.get("cf-connecting-ip") ??
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "anonymous";
  const limit = checkRateLimit(`planning-price:${client}`, 120, 60 * 60 * 1000);
  if (!limit.allowed) {
    return Response.json(
      { error: "Too many pricing requests. Please try again later." },
      { status: 429 },
    );
  }

  try {
    const input = parseInput(await request.json());
    return Response.json({ pricing: calculatePlanningPrice(input) });
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "The pricing request could not be processed.",
      },
      { status: 400 },
    );
  }
}
