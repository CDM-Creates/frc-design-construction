import { DOCUMENT_ANALYSIS_UPGRADE_BY_CODE } from "../planning-simulation/document-categories";
import type { DocumentAnalysisUpgradeCode } from "../planning-simulation/types";

export const REPORT_CATALOGUE_VERSION = "FRC_REPORT_CATALOGUE_2026_01";
export const REPORT_PRICING_VERSION = "FRC_REPORT_PRICING_2026_02";

export const CUSTOMER_TYPES = [
  {
    id: "property_owner",
    label: "Property owner",
    headline: "Understand your property before spending on design.",
    supportingCopy: "See the opportunities, constraints and missing information before committing to drawings, consultants or construction.",
    emphasis: ["Plain-English explanations", "Buildability questions", "Next steps", "Consultant sequence"],
  },
  {
    id: "prospective_buyer",
    label: "Prospective property buyer",
    headline: "Know what you are buying into.",
    supportingCopy: "Review planning controls, mapped constraints and development questions before making a major property decision.",
    emphasis: ["Acquisition questions", "Mapped constraints", "Investigation priorities", "Decision risks"],
  },
  {
    id: "investor_developer",
    label: "Property investor or developer",
    headline: "Compare the opportunity before committing capital.",
    supportingCopy: "Examine potential development paths, major constraints and the investigations most likely to affect your decision.",
    emphasis: ["Development opportunities", "Option comparison", "Planning risk", "Site limitations"],
  },
  {
    id: "builder",
    label: "Builder",
    headline: "Identify approval and information gaps before pricing proceeds too far.",
    supportingCopy: "Review the planning pathway, missing consultant inputs and major site issues requiring confirmation.",
    emphasis: ["Approval dependencies", "Missing documents", "Consultant inputs", "Sequencing risks"],
  },
  {
    id: "external_architect",
    label: "External architect",
    headline: "Add a structured planning and site review to your design process.",
    supportingCopy: "Use the report, control matrix, source register and constraint visuals to identify questions that may affect the next design revision.",
    emphasis: ["Planning-control matrix", "Plan conflicts", "Drawing information required", "Consultant coordination"],
  },
  {
    id: "external_designer",
    label: "External building designer",
    headline: "Add a structured planning and site review to your design process.",
    supportingCopy: "Use the report, control matrix, source register and constraint visuals to identify questions that may affect the next design revision.",
    emphasis: ["Planning-control matrix", "Plan conflicts", "Drawing information required", "Consultant coordination"],
  },
  {
    id: "town_planner_consultant",
    label: "Town planner or consultant",
    headline: "Start with a traceable property and evidence baseline.",
    supportingCopy: "Review source-labelled controls, constraints, conflicts and outstanding consultant information.",
    emphasis: ["Source provenance", "Control status", "Evidence conflicts", "Investigation sequence"],
  },
  {
    id: "real_estate_professional",
    label: "Real-estate professional",
    headline: "Give clients a clearer property-information pathway.",
    supportingCopy: "Provide a structured, source-labelled overview without presenting preliminary information as an approval guarantee.",
    emphasis: ["Plain-English property context", "Source labels", "Material constraints", "Referral pathway"],
  },
  {
    id: "other",
    label: "Other",
    headline: "See the opportunity. Understand the constraints.",
    supportingCopy: "Choose a report, share your goal and receive a structured report pack with planning analysis, visual explanations and a prioritised action plan.",
    emphasis: ["Confirmed scope", "Known information", "Missing information", "Next actions"],
  },
] as const;

export type CustomerTypeId = typeof CUSTOMER_TYPES[number]["id"];

export const DECISION_OBJECTIVES = [
  { id: "before_buying", label: "I want to understand a property before buying" },
  { id: "general_planning", label: "I want a general property-planning report" },
  { id: "development_potential", label: "I want to understand development potential" },
  { id: "specific_development", label: "I have a specific development in mind" },
  { id: "plans_review", label: "I already have architectural plans" },
  { id: "compare_options", label: "I want to compare several development options" },
  { id: "council_certification", label: "I am preparing for council or certification" },
  { id: "professional_verification", label: "I want FRC professional verification" },
  { id: "tailored_assessment", label: "I need a tailored development assessment" },
] as const;

export type DecisionObjectiveId = typeof DECISION_OBJECTIVES[number]["id"];

export type ReportCatalogueEntry = {
  id: string;
  templateId: string;
  name: string;
  purpose: string;
  suitedTo: CustomerTypeId[];
  answers: string;
  includes: string[];
  excludes: string[];
  requiredInputs: string[];
  referencesRequired: boolean;
  drawingsRequired: boolean;
  professionalReview: "optional" | "mandatory" | "included" | "not_applicable";
  outputFiles: string[];
  limitations: string[];
  priceCents: number | null;
  fromPriceCents: number | null;
  sharedCreditCents: number;
  minimumStandalonePriceCents: number | null;
  combinable: boolean;
  tailoredWhenCombinedWith: string[];
  developmentSpecific: boolean;
  recommendedFor: DecisionObjectiveId[];
};

const commonOutputs = ["Secure web report", "PDF report", "ZIP report pack", "Source register", "Action plan"];
const commonLimitations = [
  "Preliminary findings do not constitute development approval, surveying, engineering or legal certification.",
  "Mapped boundaries are indicative unless a registered survey is supplied.",
];
const developmentInclusions = [
  "Property and planning baseline",
  "Property area and boundary status",
  "Development-specific analysis",
  "Client-motivation summary",
  "Concept visualisations",
  "Constraint overlays",
  "Services and plumbing considerations",
  "Source and missing-information registers",
  "Risk register and prioritised action plan",
];

function report(
  input: Omit<ReportCatalogueEntry, "outputFiles" | "limitations" | "tailoredWhenCombinedWith"> &
    Partial<Pick<ReportCatalogueEntry, "outputFiles" | "limitations" | "tailoredWhenCombinedWith">>,
): ReportCatalogueEntry {
  return {
    outputFiles: commonOutputs,
    limitations: commonLimitations,
    tailoredWhenCombinedWith: [],
    ...input,
  };
}

export const REPORT_CATALOGUE: ReportCatalogueEntry[] = [
  report({
    id: "property_intelligence",
    templateId: "frc-property-intelligence-v1",
    name: "Property Intelligence Report",
    purpose: "A source-labelled property, planning and constraint baseline.",
    suitedTo: ["property_owner", "prospective_buyer", "real_estate_professional", "town_planner_consultant", "other"],
    answers: "What is known about this property, and what still needs confirmation?",
    includes: ["Property identity", "Land area and boundary status", "Planning framework", "Mapped constraint screening", "Source register", "Missing-information schedule", "Risk register", "Action plan"],
    excludes: ["A design proposal", "Approval advice", "Registered survey", "Engineering assessment"],
    requiredInputs: ["NSW property address", "Client decision context"],
    referencesRequired: false,
    drawingsRequired: false,
    professionalReview: "optional",
    priceCents: 69_500,
    fromPriceCents: null,
    sharedCreditCents: 20_000,
    minimumStandalonePriceCents: 49_500,
    combinable: true,
    developmentSpecific: false,
    recommendedFor: ["before_buying", "general_planning"],
  }),
  report({
    id: "development_potential",
    templateId: "frc-development-potential-v1",
    name: "Development Potential Report",
    purpose: "Tests broad development pathways against the available property evidence.",
    suitedTo: ["property_owner", "prospective_buyer", "investor_developer", "town_planner_consultant"],
    answers: "Which development pathways appear worth investigating?",
    includes: developmentInclusions,
    excludes: ["A resolved architectural design", "Financial return advice", "Approval guarantee"],
    requiredInputs: ["Property address", "Decision objective"],
    referencesRequired: false,
    drawingsRequired: false,
    professionalReview: "optional",
    priceCents: 99_500,
    fromPriceCents: null,
    sharedCreditCents: 30_000,
    minimumStandalonePriceCents: 69_500,
    combinable: true,
    developmentSpecific: true,
    recommendedFor: ["development_potential", "before_buying"],
  }),
  report({
    id: "investor_options",
    templateId: "frc-investor-options-v1",
    name: "Investor Options Report",
    purpose: "Compares property and development options without promising financial returns.",
    suitedTo: ["prospective_buyer", "investor_developer", "real_estate_professional"],
    answers: "How do the main development options compare on opportunity, evidence and risk?",
    includes: [...developmentInclusions, "Side-by-side options comparison"],
    excludes: ["Investment advice", "Valuation", "Guaranteed yield or resale outcome"],
    requiredInputs: ["Property address", "Options or outcomes to compare"],
    referencesRequired: false,
    drawingsRequired: false,
    professionalReview: "optional",
    priceCents: 149_500,
    fromPriceCents: null,
    sharedCreditCents: 30_000,
    minimumStandalonePriceCents: 119_500,
    combinable: true,
    developmentSpecific: true,
    recommendedFor: ["compare_options", "before_buying", "development_potential"],
  }),
  ...[
    ["granny_flat", "frc-granny-flat-feasibility-v1", "Granny Flat Feasibility Report", 99_500, "Whether a secondary dwelling concept is worth progressing on the site."],
    ["extension_renovation", "frc-extension-renovation-v1", "Extension or Renovation Feasibility Report", 99_500, "How an extension or renovation objective may interact with the site and controls."],
    ["single_storey_dwelling", "frc-single-storey-dwelling-v1", "New Single-Storey Dwelling Feasibility Report", 129_500, "What must be investigated for a new single-storey dwelling."],
    ["two_storey_dwelling", "frc-two-storey-dwelling-v1", "New Two-Storey Dwelling Feasibility Report", 149_500, "What must be investigated for a new two-storey dwelling, including neighbour impacts."],
    ["pool_spa", "frc-pool-spa-v1", "Pool and Spa Feasibility Report", 69_500, "What planning, site, safety and service questions affect a pool or spa."],
    ["outdoor_living", "frc-outdoor-living-v1", "Outdoor Living Feasibility Report", 69_500, "How outdoor-living work may interact with the site, structures and constraints."],
    ["garage_outbuilding", "frc-garage-outbuilding-v1", "Garage or Outbuilding Feasibility Report", 79_500, "What must be investigated for a garage, studio, shed or outbuilding."],
  ].map(([id, templateId, name, priceCents, answers]) => report({
    id: String(id),
    templateId: String(templateId),
    name: String(name),
    purpose: String(answers),
    suitedTo: ["property_owner", "investor_developer", "builder", "external_architect", "external_designer"],
    answers: String(answers),
    includes: developmentInclusions,
    excludes: ["Measured drawings", "Construction documentation", "Engineering design", "Approval guarantee"],
    requiredInputs: ["Property address", "Written development brief, reference URL or uploaded visual reference", "Project motivation"],
    referencesRequired: true,
    drawingsRequired: false,
    professionalReview: "optional",
    priceCents: Number(priceCents),
    fromPriceCents: null,
    sharedCreditCents: 30_000,
    minimumStandalonePriceCents: Math.max(39_500, Number(priceCents) - 30_000),
    combinable: true,
    developmentSpecific: true,
    recommendedFor: ["specific_development"],
  })),
  report({
    id: "plan_compliance_review",
    templateId: "frc-plan-compliance-review-v1",
    name: "Architectural Plan Compliance Review",
    purpose: "Cross-checks an existing architectural plan set against verified controls and missing information.",
    suitedTo: ["builder", "external_architect", "external_designer", "town_planner_consultant", "property_owner"],
    answers: "Which plan issues, evidence gaps and control conflicts require attention?",
    includes: ["Drawing register", "Planning-control matrix", "Dimensional conflict schedule", "Missing drawing information", "Risk register", "Action plan"],
    excludes: ["Certification", "Design authorship", "Construction-document sign-off"],
    requiredInputs: ["Complete readable architectural plan set", "Property address"],
    referencesRequired: false,
    drawingsRequired: true,
    professionalReview: "optional",
    priceCents: 129_500,
    fromPriceCents: null,
    sharedCreditCents: 30_000,
    minimumStandalonePriceCents: 99_500,
    combinable: true,
    developmentSpecific: true,
    recommendedFor: ["plans_review", "council_certification"],
  }),
  report({
    id: "detailed_options_comparison",
    templateId: "frc-options-comparison-v1",
    name: "Detailed Development Options Comparison",
    purpose: "Compares several confirmed development options on a consistent evidence base.",
    suitedTo: ["property_owner", "prospective_buyer", "investor_developer", "external_architect", "external_designer"],
    answers: "Which option best serves the stated motivation, and what must be investigated next?",
    includes: [...developmentInclusions, "Consistent side-by-side visual comparison", "Option-specific risk and action schedules"],
    excludes: ["Financial advice", "Aesthetic ranking presented as technical evidence"],
    requiredInputs: ["At least two development options", "Project motivation"],
    referencesRequired: true,
    drawingsRequired: false,
    professionalReview: "optional",
    priceCents: 149_500,
    fromPriceCents: null,
    sharedCreditCents: 30_000,
    minimumStandalonePriceCents: 119_500,
    combinable: true,
    developmentSpecific: true,
    recommendedFor: ["compare_options"],
  }),
  report({
    id: "professional_review",
    templateId: "frc-professionally-reviewed-v1",
    name: "FRC Professionally Reviewed Report",
    purpose: "Adds genuine FRC review, corrections and release approval to the selected report engagement.",
    suitedTo: CUSTOMER_TYPES.map((customer) => customer.id),
    answers: "Can FRC review and formally release the report within the agreed preliminary service scope?",
    includes: ["Human review queue", "Reviewer change record", "Approved release status", "Professional review record"],
    excludes: ["Development consent", "Certification outside the agreed scope"],
    requiredInputs: ["At least one base report", "Complete required information"],
    referencesRequired: false,
    drawingsRequired: false,
    professionalReview: "included",
    priceCents: null,
    fromPriceCents: 219_500,
    sharedCreditCents: 0,
    minimumStandalonePriceCents: 219_500,
    combinable: true,
    developmentSpecific: false,
    recommendedFor: ["professional_verification", "council_certification"],
  }),
  report({
    id: "council_readiness",
    templateId: "frc-council-readiness-v1",
    name: "Council-Readiness Assessment",
    purpose: "A professionally reviewed evidence and document readiness schedule for council or certification preparation.",
    suitedTo: ["property_owner", "builder", "external_architect", "external_designer", "town_planner_consultant", "investor_developer"],
    answers: "Which documents, control checks and professional inputs remain before lodgement preparation?",
    includes: ["Professional review", "Drawing and control cross-check", "Submission-readiness schedule", "Consultant coordination"],
    excludes: ["Council lodgement", "Guaranteed acceptance", "Formal certification"],
    requiredInputs: ["Complete architectural plan set", "Required supporting documents"],
    referencesRequired: false,
    drawingsRequired: true,
    professionalReview: "mandatory",
    priceCents: null,
    fromPriceCents: 350_000,
    sharedCreditCents: 0,
    minimumStandalonePriceCents: 350_000,
    combinable: true,
    developmentSpecific: true,
    recommendedFor: ["council_certification"],
  }),
  report({
    id: "complex_development",
    templateId: "frc-complex-development-v1",
    name: "Complex development assessment",
    purpose: "Creates a tailored scope for subdivision, multiple dwellings, unusual land or other complex development.",
    suitedTo: ["investor_developer", "external_architect", "external_designer", "town_planner_consultant", "builder"],
    answers: "What tailored evidence and professional scope are required for this complex proposal?",
    includes: ["Complexity trigger record", "Tailored evidence schedule", "Quotation pathway"],
    excludes: ["An automatic fixed-fee conclusion", "Automatic checkout"],
    requiredInputs: ["Property address", "Detailed written brief", "Available plans and references"],
    referencesRequired: true,
    drawingsRequired: false,
    professionalReview: "mandatory",
    priceCents: null,
    fromPriceCents: 350_000,
    sharedCreditCents: 0,
    minimumStandalonePriceCents: 350_000,
    combinable: false,
    developmentSpecific: true,
    recommendedFor: ["tailored_assessment"],
  }),
];

export const REPORT_BY_ID = new Map(REPORT_CATALOGUE.map((entry) => [entry.id, entry]));

const DOCUMENT_ANALYSIS_INCLUDED_REPORTS: Record<
  DocumentAnalysisUpgradeCode,
  readonly string[]
> = {
  architectural_plan_set: [
    "plan_compliance_review",
    "council_readiness",
    "complex_development",
  ],
  registered_survey: ["council_readiness", "complex_development"],
  engineering_or_stormwater: ["complex_development"],
  bushfire_report: ["complex_development"],
  flood_report: ["complex_development"],
  arborist_report: ["complex_development"],
  geotechnical_report: ["complex_development"],
  other_specialist_report: ["complex_development"],
};

export function isDocumentAnalysisIncluded(
  reportIds: readonly string[],
  upgradeCode: DocumentAnalysisUpgradeCode,
) {
  const includedBy = DOCUMENT_ANALYSIS_INCLUDED_REPORTS[upgradeCode];
  return reportIds.some((reportId) => includedBy.includes(reportId));
}

export function documentAnalysisIncludedForReports(
  reportIds: readonly string[],
) {
  return (
    Object.keys(
      DOCUMENT_ANALYSIS_INCLUDED_REPORTS,
    ) as DocumentAnalysisUpgradeCode[]
  ).filter((upgradeCode) =>
    isDocumentAnalysisIncluded(reportIds, upgradeCode),
  );
}

const DEVELOPMENT_ITEM_REPORT_MAP: Record<string, string> = {
  NEW_SINGLE_STOREY_DWELLING: "single_storey_dwelling",
  NEW_TWO_STOREY_DWELLING: "two_storey_dwelling",
  KNOCKDOWN_REBUILD: "development_potential",
  FIRST_FLOOR_ADDITION: "extension_renovation",
  HOME_EXTENSION: "extension_renovation",
  INTERNAL_RECONFIGURATION: "extension_renovation",
  ALTERATIONS_ADDITIONS: "extension_renovation",
  ATTACHED_GRANNY_FLAT: "granny_flat",
  DETACHED_GRANNY_FLAT: "granny_flat",
  SWIMMING_POOL: "pool_spa",
  POOL_SPA: "pool_spa",
  STANDALONE_SPA: "pool_spa",
  DECK: "outdoor_living",
  ALFRESCO: "outdoor_living",
  PERGOLA: "outdoor_living",
  PATIO: "outdoor_living",
  OUTDOOR_KITCHEN: "outdoor_living",
  OUTBUILDING: "garage_outbuilding",
  DETACHED_GARAGE: "garage_outbuilding",
  ATTACHED_GARAGE: "garage_outbuilding",
  CARPORT: "garage_outbuilding",
  RETAIN_HOUSE_GRANNY: "detailed_options_comparison",
  RETAIN_HOUSE_EXTENSION: "detailed_options_comparison",
  COMPARE_STOREYS: "detailed_options_comparison",
  COMPARE_RENOVATE_REBUILD: "detailed_options_comparison",
  MAX_BUILDING_ENVELOPE: "development_potential",
  RENTAL_POTENTIAL: "investor_options",
  DEVELOPMENT_STAGING: "investor_options",
};

export function reportIdsForDevelopmentItems(codes: string[]) {
  const mapped = codes.map((code) => DEVELOPMENT_ITEM_REPORT_MAP[code]).filter(Boolean);
  return [...new Set(mapped.length ? mapped : ["development_potential"])];
}

export type SiteAreaPricingInput = {
  areaSqm: number | null;
  areaStatus: "survey_confirmed" | "deposited_plan_supported" | "official_parcel_mapped" | "client_supplied" | "approximate_only" | "unavailable" | "conflict_detected";
  parcelCount: number;
  ruralOrNonStandard: boolean;
};

export const SITE_AREA_PRICING_RULES = {
  version: "FRC_SITE_AREA_PRICING_2026_01",
  thresholds: [
    { maximumSqm: 1_000, adjustmentCents: 0 },
    { maximumSqm: 2_000, adjustmentCents: 19_500 },
    { maximumSqm: 5_000, adjustmentCents: 39_500 },
    { maximumSqm: 10_000, adjustmentCents: 69_500 },
  ],
  tailoredAboveSqm: 10_000,
} as const;

export type CataloguePriceLine = {
  code: string;
  label: string;
  amountCents: number;
  treatment: "report" | "site_adjustment" | "upgrade" | "credit" | "minimum_adjustment";
};

export type CataloguePriceResult = {
  pricingVersion: typeof REPORT_PRICING_VERSION;
  catalogueVersion: typeof REPORT_CATALOGUE_VERSION;
  currency: "AUD";
  lines: CataloguePriceLine[];
  quoteRequired: boolean;
  quoteReasons: string[];
  totalCents: number | null;
};

export type FrozenCataloguePriceSnapshot = CataloguePriceResult & {
  snapshotId: string;
  frozenAt: string;
  inputHash: string;
  subtotalCents: number | null;
  taxTreatment: string;
  lineItems: Array<{ code: string; publicLabel: string; amountCents: number; treatment: CataloguePriceLine["treatment"] }>;
};

export function recommendationsFor(customerType: CustomerTypeId, decisionObjective: DecisionObjectiveId) {
  return REPORT_CATALOGUE.map((entry) => {
    const required = decisionObjective === "council_certification" && entry.id === "professional_review";
    const recommended = entry.recommendedFor.includes(decisionObjective) ||
      (entry.suitedTo.includes(customerType) && ["general_planning", "development_potential"].includes(decisionObjective));
    return { reportId: entry.id, status: required ? "required" as const : recommended ? "recommended" as const : "optional" as const };
  });
}

export function calculateCataloguePrice(input: {
  reportIds: string[];
  customerType: CustomerTypeId;
  site: SiteAreaPricingInput;
  professionalReviewRequested: boolean;
  priorityReviewRequested: boolean;
  documentAnalysisUpgrades?: readonly DocumentAnalysisUpgradeCode[];
}): CataloguePriceResult {
  const selected = [...new Set(input.reportIds)].map((id) => REPORT_BY_ID.get(id));
  if (!selected.length || selected.some((entry) => !entry)) throw new Error("Select at least one valid report.");
  const reports = selected as ReportCatalogueEntry[];
  const reviewSelected =
    input.professionalReviewRequested ||
    reports.some((entry) =>
      ["professional_review", "council_readiness"].includes(entry.id),
    );
  if (input.priorityReviewRequested && !reviewSelected) {
    throw new Error("Priority review requires FRC professional review.");
  }
  const quoteReasons: string[] = [];
  const lines: CataloguePriceLine[] = [];
  let eligibleIndex = 0;

  for (const entry of reports) {
    if (!entry.combinable && reports.length > 1) quoteReasons.push(`${entry.name} requires a separate tailored quotation.`);
    if (entry.priceCents === null) {
      if (entry.id === "professional_review") continue;
      quoteReasons.push(`${entry.name} requires a tailored quotation from A$${((entry.fromPriceCents ?? 0) / 100).toLocaleString("en-AU")}.`);
      continue;
    }
    lines.push({ code: `REPORT_${entry.id.toUpperCase()}`, label: entry.name, amountCents: entry.priceCents, treatment: "report" });
    if (eligibleIndex > 0 && entry.sharedCreditCents > 0) {
      const maximumCredit = entry.minimumStandalonePriceCents === null
        ? entry.sharedCreditCents
        : Math.max(0, entry.priceCents - entry.minimumStandalonePriceCents);
      const credit = Math.min(entry.sharedCreditCents, maximumCredit);
      if (credit > 0) lines.push({ code: `SHARED_RESEARCH_${entry.id.toUpperCase()}`, label: `Shared property research adjustment — ${entry.name}`, amountCents: -credit, treatment: "credit" });
    }
    eligibleIndex += 1;
  }

  if (input.site.parcelCount > 1) quoteReasons.push("Multiple adjoining lots require a tailored quotation.");
  if (input.site.ruralOrNonStandard) quoteReasons.push("Rural, agricultural or unusual non-standard land requires a tailored quotation.");
  if (input.site.areaStatus === "conflict_detected") quoteReasons.push("Material land-area conflict requires professional confirmation before final pricing.");
  if (input.site.areaSqm !== null && input.site.areaSqm > SITE_AREA_PRICING_RULES.tailoredAboveSqm) {
    quoteReasons.push("Sites over 10,000 m² require a tailored quotation.");
  }
  const areaCanSetPrice = input.site.areaSqm !== null && !["unavailable", "approximate_only", "conflict_detected"].includes(input.site.areaStatus);
  if (areaCanSetPrice && input.site.areaSqm !== null && input.site.areaSqm <= SITE_AREA_PRICING_RULES.tailoredAboveSqm) {
    const tier = SITE_AREA_PRICING_RULES.thresholds.find((rule) => input.site.areaSqm! <= rule.maximumSqm);
    if (tier && tier.adjustmentCents > 0) {
      lines.push({ code: "SITE_AREA_COMPLEXITY", label: "Large-site complexity adjustment", amountCents: tier.adjustmentCents, treatment: "site_adjustment" });
    }
  }

  if (reviewSelected) {
    const reviewUpgradeCents = 89_500;
    lines.push({ code: "FRC_PROFESSIONAL_REVIEW", label: "FRC professional review", amountCents: reviewUpgradeCents, treatment: "upgrade" });
  }

  const councilSelected = reports.some((entry) => entry.id === "council_readiness");
  const minimum = councilSelected ? 350_000 : reviewSelected ? 219_500 : 0;
  let total = lines.reduce((sum, line) => sum + line.amountCents, 0);
  if (!quoteReasons.length && total < minimum) {
    lines.push({
      code: councilSelected ? "COUNCIL_READINESS_MINIMUM" : "PROFESSIONAL_REVIEW_MINIMUM",
      label: councilSelected ? "Council-readiness minimum engagement adjustment" : "Professional-review minimum engagement adjustment",
      amountCents: minimum - total,
      treatment: "minimum_adjustment",
    });
    total = minimum;
  }

  if (input.priorityReviewRequested) {
    lines.push({ code: "PRIORITY_REVIEW", label: "Priority professional review", amountCents: 45_000, treatment: "upgrade" });
    total += 45_000;
  }
  for (const code of [...new Set(input.documentAnalysisUpgrades ?? [])]) {
    const upgrade = DOCUMENT_ANALYSIS_UPGRADE_BY_CODE.get(code);
    if (!upgrade) throw new Error("A document-analysis upgrade is invalid.");
    if (isDocumentAnalysisIncluded(input.reportIds, code)) continue;
    lines.push({
      code: `DOCUMENT_ANALYSIS_${code.toUpperCase()}`,
      label: upgrade.label,
      amountCents: upgrade.feeCents,
      treatment: "upgrade",
    });
    total += upgrade.feeCents;
  }

  return {
    pricingVersion: REPORT_PRICING_VERSION,
    catalogueVersion: REPORT_CATALOGUE_VERSION,
    currency: "AUD",
    lines,
    quoteRequired: quoteReasons.length > 0,
    quoteReasons: [...new Set(quoteReasons)],
    totalCents: quoteReasons.length ? null : total,
  };
}

export async function freezeCataloguePrice(
  input: Parameters<typeof calculateCataloguePrice>[0],
  taxTreatment: string,
): Promise<FrozenCataloguePriceSnapshot> {
  const pricing = calculateCataloguePrice(input);
  const canonical = JSON.stringify({ input, pricing });
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(canonical));
  const inputHash = Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
  return {
    ...pricing,
    snapshotId: crypto.randomUUID(),
    frozenAt: new Date().toISOString(),
    inputHash,
    subtotalCents: pricing.totalCents,
    taxTreatment,
    lineItems: pricing.lines.map((line) => ({
      code: line.code,
      publicLabel: line.label,
      amountCents: line.amountCents,
      treatment: line.treatment,
    })),
  };
}
