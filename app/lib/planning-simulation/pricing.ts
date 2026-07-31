import { DEVELOPMENT_ITEMS } from "./development-items";
import type {
  DocumentAnalysisUpgradeCode,
  FrozenPriceSnapshot,
  PlanningPricingInput,
  PlanningPricingResult,
  PricingLineItem,
  TaxTreatment,
} from "./types";

export const PRICING_VERSION = "FRC_REPORT_PRICING_2026_01";

type DevelopmentPriceRule = {
  amountCents: number;
  majorAssessment: boolean;
  internalDescription: string;
};

export const DEVELOPMENT_ITEM_PRICE_RULES: Record<string, DevelopmentPriceRule> = {
  NEW_SINGLE_STOREY_DWELLING: { amountCents: 45_000, majorAssessment: true, internalDescription: "Single-storey dwelling planning assessment" },
  NEW_TWO_STOREY_DWELLING: { amountCents: 65_000, majorAssessment: true, internalDescription: "Two-storey dwelling planning assessment" },
  KNOCKDOWN_REBUILD: { amountCents: 65_000, majorAssessment: true, internalDescription: "Knockdown-rebuild planning assessment" },
  FIRST_FLOOR_ADDITION: { amountCents: 55_000, majorAssessment: true, internalDescription: "First-floor addition planning assessment" },
  HOME_EXTENSION: { amountCents: 39_500, majorAssessment: true, internalDescription: "Home extension planning assessment" },
  INTERNAL_RECONFIGURATION: { amountCents: 35_000, majorAssessment: false, internalDescription: "Internal reconfiguration planning assessment" },
  ATTIC_CONVERSION: { amountCents: 35_000, majorAssessment: false, internalDescription: "Attic conversion planning assessment" },
  ALTERATIONS_ADDITIONS: { amountCents: 35_000, majorAssessment: true, internalDescription: "Alterations and additions planning assessment" },
  ATTACHED_GRANNY_FLAT: { amountCents: 39_500, majorAssessment: true, internalDescription: "Attached secondary-dwelling assessment" },
  DETACHED_GRANNY_FLAT: { amountCents: 45_000, majorAssessment: true, internalDescription: "Detached secondary-dwelling assessment" },
  SWIMMING_POOL: { amountCents: 25_000, majorAssessment: false, internalDescription: "Swimming pool planning assessment" },
  POOL_SPA: { amountCents: 25_000, majorAssessment: false, internalDescription: "Pool and spa planning assessment" },
  STANDALONE_SPA: { amountCents: 19_500, majorAssessment: false, internalDescription: "Standalone spa planning assessment" },
  KIDDIE_POOL: { amountCents: 19_500, majorAssessment: false, internalDescription: "Small pool planning assessment" },
  POOL_RELOCATION: { amountCents: 25_000, majorAssessment: false, internalDescription: "Pool relocation planning assessment" },
  POOL_ALTERATION: { amountCents: 25_000, majorAssessment: false, internalDescription: "Pool alteration planning assessment" },
  POOL_HOUSE: { amountCents: 25_000, majorAssessment: false, internalDescription: "Pool house planning assessment" },
  CABANA: { amountCents: 19_500, majorAssessment: false, internalDescription: "Cabana planning assessment" },
  DECK: { amountCents: 19_500, majorAssessment: false, internalDescription: "Deck planning assessment" },
  ALFRESCO: { amountCents: 19_500, majorAssessment: false, internalDescription: "Alfresco planning assessment" },
  PERGOLA: { amountCents: 19_500, majorAssessment: false, internalDescription: "Pergola planning assessment" },
  PATIO: { amountCents: 19_500, majorAssessment: false, internalDescription: "Patio planning assessment" },
  OUTDOOR_KITCHEN: { amountCents: 19_500, majorAssessment: false, internalDescription: "Outdoor kitchen planning assessment" },
  COVERED_ENTERTAINMENT: { amountCents: 19_500, majorAssessment: false, internalDescription: "Covered entertainment-area planning assessment" },
  FIREPIT_ZONE: { amountCents: 19_500, majorAssessment: false, internalDescription: "Firepit and outdoor-zone planning assessment" },
  LANDSCAPE_REDESIGN: { amountCents: 35_000, majorAssessment: false, internalDescription: "Whole-site landscape planning assessment" },
  RETAINING_WALLS: { amountCents: 29_500, majorAssessment: false, internalDescription: "Retaining-wall planning assessment" },
  TENNIS_COURT: { amountCents: 35_000, majorAssessment: false, internalDescription: "Recreational court planning assessment" },
  OUTBUILDING: { amountCents: 25_000, majorAssessment: false, internalDescription: "Outbuilding planning assessment" },
  DETACHED_GARAGE: { amountCents: 25_000, majorAssessment: false, internalDescription: "Detached garage planning assessment" },
  ATTACHED_GARAGE: { amountCents: 25_000, majorAssessment: false, internalDescription: "Attached garage planning assessment" },
  CARPORT: { amountCents: 25_000, majorAssessment: false, internalDescription: "Carport planning assessment" },
  FARM_OUTBUILDING: { amountCents: 35_000, majorAssessment: false, internalDescription: "Rural outbuilding planning assessment" },
  DETACHED_STUDIO: { amountCents: 25_000, majorAssessment: false, internalDescription: "Detached studio planning assessment" },
  GARDEN_ROOM: { amountCents: 25_000, majorAssessment: false, internalDescription: "Garden room planning assessment" },
  FRONT_BOUNDARY_ENTRY: { amountCents: 25_000, majorAssessment: false, internalDescription: "Front boundary and entry planning assessment" },
  BOUNDARY_FENCE: { amountCents: 19_500, majorAssessment: false, internalDescription: "Boundary fence planning assessment" },
  VEHICLE_ACCESS: { amountCents: 25_000, majorAssessment: false, internalDescription: "Vehicle access and parking planning assessment" },
  ACCESSIBLE_EXTERNAL_WORKS: { amountCents: 19_500, majorAssessment: false, internalDescription: "Accessible external works planning assessment" },
  RETAIN_HOUSE_GRANNY: { amountCents: 55_000, majorAssessment: true, internalDescription: "Retained-house and granny-flat options assessment" },
  RETAIN_HOUSE_EXTENSION: { amountCents: 55_000, majorAssessment: true, internalDescription: "Retained-house and extension options assessment" },
  COMPARE_STOREYS: { amountCents: 55_000, majorAssessment: true, internalDescription: "Single versus two-storey options assessment" },
  COMPARE_RENOVATE_REBUILD: { amountCents: 55_000, majorAssessment: true, internalDescription: "Renovate versus rebuild options assessment" },
  MAX_BUILDING_ENVELOPE: { amountCents: 55_000, majorAssessment: true, internalDescription: "Maximum building-envelope assessment" },
  FUTURE_POOL_GRANNY: { amountCents: 55_000, majorAssessment: true, internalDescription: "Pool and granny-flat potential assessment" },
  RENTAL_POTENTIAL: { amountCents: 55_000, majorAssessment: true, internalDescription: "Preliminary rental-development potential assessment" },
  RESALE_IMPROVEMENT: { amountCents: 55_000, majorAssessment: true, internalDescription: "Preliminary resale-improvement assessment" },
  VACANT_LAND: { amountCents: 55_000, majorAssessment: true, internalDescription: "Vacant-land development assessment" },
  DEVELOPMENT_STAGING: { amountCents: 55_000, majorAssessment: true, internalDescription: "Development staging assessment" },
};

export const PRICING_RULES = {
  currency: "AUD",
  coreReportCents: 79_500,
  coordinationCents: 35_000,
  largeSitePotentialCents: 49_500,
  architecturalPlanSetCents: 59_500,
  engineeringOrStormwaterCents: 29_500,
  registeredSurveyCents: 19_500,
  specialistReportCents: 25_000,
  detailedAlternativesCents: 49_500,
  professionalVerificationCents: 89_500,
  professionalMinimumCents: 249_500,
  priorityProfessionalReviewCents: 45_000,
  councilReadinessCents: 149_500,
  councilReadinessMinimumCents: 400_000,
  tailoredEngagementFromCents: 350_000,
  maximumMajorAutomaticAssessments: 3,
  version: PRICING_VERSION,
} as const;

const itemByCode = new Map(DEVELOPMENT_ITEMS.map((item) => [item.code, item]));

const documentUpgradeRules: Record<DocumentAnalysisUpgradeCode, {
  label: string;
  amountCents: number;
  description: string;
}> = {
  architectural_plan_set: { label: "Complete uploaded architectural plan-set analysis", amountCents: PRICING_RULES.architecturalPlanSetCents, description: "Substantial interpretation of a complete architectural drawing set" },
  registered_survey: { label: "Registered detail survey interpretation", amountCents: PRICING_RULES.registeredSurveyCents, description: "Detailed interpretation of a registered survey" },
  engineering_or_stormwater: { label: "Engineering or stormwater drawing-set interpretation", amountCents: PRICING_RULES.engineeringOrStormwaterCents, description: "Interpretation of engineering or stormwater drawings" },
  bushfire_report: { label: "Bushfire report interpretation", amountCents: PRICING_RULES.specialistReportCents, description: "Interpretation of a bushfire consultant report" },
  flood_report: { label: "Flood report interpretation", amountCents: PRICING_RULES.specialistReportCents, description: "Interpretation of a flood consultant report" },
  arborist_report: { label: "Arborist report interpretation", amountCents: PRICING_RULES.specialistReportCents, description: "Interpretation of an arborist report" },
  geotechnical_report: { label: "Geotechnical report interpretation", amountCents: PRICING_RULES.specialistReportCents, description: "Interpretation of a geotechnical report" },
  other_specialist_report: { label: "Other specialist report interpretation", amountCents: PRICING_RULES.specialistReportCents, description: "Interpretation of another specialist consultant report category" },
};

function line(
  input: Omit<PricingLineItem, "taxTreatment" | "pricingVersion" | "manuallyAdjustableByAuthorisedAdministrator">,
  taxTreatment: TaxTreatment,
): PricingLineItem {
  return {
    ...input,
    taxTreatment,
    pricingVersion: PRICING_VERSION,
    manuallyAdjustableByAuthorisedAdministrator: false,
  };
}

export function getMissingDevelopmentPricingRules() {
  return DEVELOPMENT_ITEMS
    .filter((item) => item.pricingType === "standard" && !DEVELOPMENT_ITEM_PRICE_RULES[item.code])
    .map((item) => item.code);
}

export function calculatePlanningPrice(
  input: PlanningPricingInput,
  taxTreatment: TaxTreatment = "unconfigured_test_only",
): PlanningPricingResult {
  if (input.priorityRequested && !input.professionalVerificationRequested) {
    throw new Error("Priority professional review requires FRC professional verification.");
  }
  if (input.councilSubmissionRequested && !input.professionalVerificationRequested) {
    throw new Error("Council-submission readiness requires FRC professional verification.");
  }
  const uniqueCodes = [...new Set(input.selectedItemCodes)];
  const definitions = uniqueCodes.map((code) => itemByCode.get(code)).filter((item) => item !== undefined);
  const quoteItems = definitions.filter((item) => item.pricingType === "quote");
  const standardItems = definitions.filter((item) => item.pricingType === "standard");
  const quoteReasons: string[] = [];

  if (input.propertyCount !== 1) quoteReasons.push("Several properties or adjoining lots require a tailored engagement.");
  const majorCount = standardItems.filter((item) => DEVELOPMENT_ITEM_PRICE_RULES[item.code]?.majorAssessment).length;
  if (majorCount > PRICING_RULES.maximumMajorAutomaticAssessments) {
    quoteReasons.push("Four or more major development assessments require a tailored engagement.");
  }
  for (const item of quoteItems) quoteReasons.push(item.quoteReason ?? `${item.name} requires a tailored engagement.`);
  if (input.plansStatus === "external_incomplete") quoteReasons.push("Incomplete external plans requiring reconstruction need a tailored architectural scope.");
  if (input.plansStatus === "sheila_concept_required") quoteReasons.push("Architectural concept design is separately scoped.");
  for (const constraint of input.discoveredConstraints) {
    if (constraint.quoteTriggered) quoteReasons.push(`${constraint.label} requires tailored professional review.`);
  }

  const lineItems: PricingLineItem[] = [
    line({
      code: "CORE_PRELIMINARY_REPORT",
      publicLabel: "Core preliminary NSW property-planning report",
      internalDescription: "Property identity, source register, general planning framework, base screening, administration and report template",
      amountCents: PRICING_RULES.coreReportCents,
      associatedDevelopmentItem: null,
      associatedDocumentCategory: null,
      reason: "Core service selected",
      treatment: "base",
    }, taxTreatment),
  ];

  for (const item of standardItems) {
    const rule = DEVELOPMENT_ITEM_PRICE_RULES[item.code];
    if (!rule) throw new Error(`No pricing rule exists for billable development item ${item.code}.`);
    lineItems.push(line({
      code: `ASSESSMENT_${item.code}`,
      publicLabel: `${item.name} assessment`,
      internalDescription: rule.internalDescription,
      amountCents: rule.amountCents,
      associatedDevelopmentItem: item.code,
      associatedDocumentCategory: null,
      reason: `${item.name} was selected for project-specific assessment`,
      treatment: "assessment",
    }, taxTreatment));
  }

  if (standardItems.length >= 2) {
    lineItems.push(line({
      code: "COMBINED_SITE_COORDINATION",
      publicLabel: "Combined-site or options-coordination analysis",
      internalDescription: "Interaction, sequencing, site-demand and pathway comparison across selected assessments",
      amountCents: PRICING_RULES.coordinationCents,
      associatedDevelopmentItem: null,
      associatedDocumentCategory: null,
      reason: "Two or more development assessments were selected",
      treatment: "coordination",
    }, taxTreatment));
  }

  const uniqueDocumentUpgrades = [...new Set(input.documentAnalysisUpgrades)];
  for (const code of uniqueDocumentUpgrades) {
    const rule = documentUpgradeRules[code];
    if (!rule) continue;
    lineItems.push(line({
      code: `DOCUMENT_${code.toUpperCase()}`,
      publicLabel: rule.label,
      internalDescription: rule.description,
      amountCents: rule.amountCents,
      associatedDevelopmentItem: null,
      associatedDocumentCategory: code,
      reason: "Premium technical document interpretation was selected",
      treatment: "upgrade",
    }, taxTreatment));
  }

  if (input.clientRequestedLargeSiteAnalysis) {
    lineItems.push(line({
      code: "LARGE_SITE_POTENTIAL",
      publicLabel: "Large-site potential analysis",
      internalDescription: "Broader whole-site potential and staging analysis",
      amountCents: PRICING_RULES.largeSitePotentialCents,
      associatedDevelopmentItem: null,
      associatedDocumentCategory: null,
      reason: "Large-site potential analysis was selected",
      treatment: "upgrade",
    }, taxTreatment));
  }
  if (input.detailedAlternativesRequested) {
    lineItems.push(line({
      code: "DETAILED_ALTERNATIVES",
      publicLabel: "Detailed alternatives comparison",
      internalDescription: "Premium structured comparison across selected development pathways",
      amountCents: PRICING_RULES.detailedAlternativesCents,
      associatedDevelopmentItem: null,
      associatedDocumentCategory: null,
      reason: "Detailed alternatives comparison was selected",
      treatment: "upgrade",
    }, taxTreatment));
  }
  if (input.professionalVerificationRequested) {
    lineItems.push(line({
      code: "FRC_PROFESSIONAL_VERIFICATION",
      publicLabel: "FRC professional verification",
      internalDescription: "Human report review, corrections, professional notes and release approval",
      amountCents: PRICING_RULES.professionalVerificationCents,
      associatedDevelopmentItem: null,
      associatedDocumentCategory: null,
      reason: "Professional verification was selected",
      treatment: "upgrade",
    }, taxTreatment));
  }
  if (input.priorityRequested && input.professionalVerificationRequested) {
    lineItems.push(line({
      code: "PRIORITY_PROFESSIONAL_REVIEW",
      publicLabel: "Priority professional review",
      internalDescription: "Priority routing in the FRC professional review queue",
      amountCents: PRICING_RULES.priorityProfessionalReviewCents,
      associatedDevelopmentItem: null,
      associatedDocumentCategory: null,
      reason: "Priority professional review was selected",
      treatment: "upgrade",
    }, taxTreatment));
  }
  if (input.councilSubmissionRequested) {
    lineItems.push(line({
      code: "COUNCIL_SUBMISSION_READINESS",
      publicLabel: "Council-submission readiness upgrade",
      internalDescription: "Human-reviewed document and control readiness schedule for council lodgement preparation",
      amountCents: PRICING_RULES.councilReadinessCents,
      associatedDevelopmentItem: null,
      associatedDocumentCategory: null,
      reason: "Council-submission readiness was selected",
      treatment: "upgrade",
    }, taxTreatment));
  }

  const quoteRequired = quoteReasons.length > 0;
  let subtotalCents = lineItems.reduce((sum, item) => sum + item.amountCents, 0);

  if (!quoteRequired && input.councilSubmissionRequested && subtotalCents < PRICING_RULES.councilReadinessMinimumCents) {
    const adjustment = PRICING_RULES.councilReadinessMinimumCents - subtotalCents;
    lineItems.push(line({
      code: "COUNCIL_READINESS_MINIMUM_ADJUSTMENT",
      publicLabel: "Council-readiness minimum engagement adjustment",
      internalDescription: "Adjustment to the minimum council-readiness engagement",
      amountCents: adjustment,
      associatedDevelopmentItem: null,
      associatedDocumentCategory: null,
      reason: "Council-readiness engagements have a A$4,000 minimum",
      treatment: "minimum_adjustment",
    }, taxTreatment));
    subtotalCents += adjustment;
  } else if (!quoteRequired && input.professionalVerificationRequested && subtotalCents < PRICING_RULES.professionalMinimumCents) {
    const adjustment = PRICING_RULES.professionalMinimumCents - subtotalCents;
    lineItems.push(line({
      code: "PROFESSIONAL_REVIEW_MINIMUM_ADJUSTMENT",
      publicLabel: "Professional review minimum engagement adjustment",
      internalDescription: "Adjustment to the minimum professionally reviewed engagement",
      amountCents: adjustment,
      associatedDevelopmentItem: null,
      associatedDocumentCategory: null,
      reason: "Professionally reviewed engagements have a A$2,495 minimum",
      treatment: "minimum_adjustment",
    }, taxTreatment));
    subtotalCents += adjustment;
  }

  return {
    currency: "AUD",
    preliminaryOrVerified: input.preliminaryOrVerified,
    corePriceCents: PRICING_RULES.coreReportCents,
    assessmentCount: standardItems.length,
    lineItems,
    quoteRequired,
    quoteReasons: [...new Set(quoteReasons)],
    tailoredEngagementFromCents: quoteRequired ? PRICING_RULES.tailoredEngagementFromCents : null,
    subtotalCents: quoteRequired ? null : subtotalCents,
    totalCents: quoteRequired ? null : subtotalCents,
    taxTreatment,
    pricingVersion: PRICING_VERSION,
  };
}

export async function freezePriceSnapshot(
  input: PlanningPricingInput,
  taxTreatment: TaxTreatment,
): Promise<FrozenPriceSnapshot> {
  const pricing = calculatePlanningPrice(input, taxTreatment);
  const canonical = JSON.stringify({
    input: { ...input, browserClaimedTotalCents: undefined },
    pricing,
  });
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(canonical));
  const inputHash = Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
  return {
    ...pricing,
    snapshotId: crypto.randomUUID(),
    frozenAt: new Date().toISOString(),
    inputHash,
  };
}
