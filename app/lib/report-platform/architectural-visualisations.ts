import { REPORT_BY_ID } from "./report-catalogue";
import type {
  ArchitecturalVisualisationRecord,
  VisualisationType,
} from "./types";

export const ARCHITECTURAL_VISUAL_SCHEMA_VERSION = "FRC_ARCHITECTURAL_VISUALISATION_V1";
export const ARCHITECTURAL_VISUAL_PROMPT_VERSION = "FRC_ARCHITECTURAL_VISUAL_PROMPTS_2026_01";
export const VISUAL_DISCLAIMER = "Indicative concept visualisation only — not measured, approved or suitable for construction.";
export const MAPPED_BOUNDARY_VISUAL_DISCLAIMER = "Boundary representation is indicative and based on available mapping. Exact boundaries, dimensions and levels require confirmation by a registered surveyor.";
export const SERVICES_VISUAL_DISCLAIMER = "Indicative services concept — not for construction or excavation.";

export type SourceStatus = "verified" | "uploaded_document" | "official_mapped_source" | "client_supplied" | "inferred" | "unknown" | "requires_professional_confirmation";

export type FrcArchitecturalVisualisationInputV1 = {
  schemaVersion: typeof ARCHITECTURAL_VISUAL_SCHEMA_VERSION;
  orderId: string;
  reportId: string;
  jobId: string;
  propertyReference: string;
  selectedReportId: string;
  customerCategory: string;
  projectMotivation: {
    selections: string[];
    writtenMotivation: string;
    intendedUsers: string;
    desiredRooms: string[];
    bedroomCount: number | null;
    bathroomCount: number | null;
    approximateFloorAreaSqm: number | null;
    storeyPreference: string | null;
    accessibilityRequirements: string[];
    preferredStyle: string | null;
    preferredMaterials: string[];
    relationshipToExistingDwelling: string | null;
    privacyPreferences: string[];
    outdoorSpacePriorities: string[];
    parkingNeeds: string | null;
    budgetRange: string | null;
    timeframe: string | null;
  };
  writtenBrief: string;
  desiredSpaces: string[];
  referenceMaterialSummary: string[];
  uploadedImageReferences: Array<{ id: string; kind: string; usable: boolean }>;
  propertyPhotographs: Array<{
    id: string;
    directionFaced: string | null;
    approximateCaptureLocation: string | null;
    capturedAt: string | null;
    clientNote: string | null;
    areaShown: "front" | "rear" | "side" | "internal" | "aerial" | "other";
    usable: boolean;
  }>;
  verifiedPropertyFacts: Array<{ key: string; value: string; sourceId: string }>;
  parcelGeometry: Record<string, unknown> | null;
  boundaryStatus: "survey_confirmed" | "deposited_plan_supported" | "official_parcel_mapped" | "client_supplied" | "approximate_only" | "unavailable" | "conflict_detected";
  northDirection: string | null;
  landAreaSqm: number | null;
  existingBuildingFacts: Array<{ fact: string; sourceStatus: SourceStatus }>;
  proposedDevelopmentType: string;
  planningConstraints: Array<{ label: string; sourceStatus: SourceStatus; geometryReference?: string }>;
  uploadedSurveyFacts: Array<{ fact: string; sourceId: string }>;
  titleAndEasementFacts: Array<{ fact: string; sourceId: string }>;
  sewerAndServiceFacts: Array<{ fact: string; sourceStatus: SourceStatus }>;
  stormwaterFacts: Array<{ fact: string; sourceStatus: SourceStatus }>;
  treesAndVegetation: Array<{ fact: string; sourceStatus: SourceStatus }>;
  floodAndBushfireInformation: Array<{ fact: string; sourceStatus: SourceStatus }>;
  privacyConsiderations: string[];
  professionalReviewRequirement: boolean;
  requiredVisualisationType: VisualisationType;
  mandatoryLabels: string[];
  prohibitedClaims: string[];
};

export type VisualValidationResult = {
  valid: boolean;
  issues: string[];
  requiresProfessionalReview: boolean;
};

export interface ArchitecturalVisualisationProvider {
  readonly name: string;
  generateConcept(input: FrcArchitecturalVisualisationInputV1): Promise<ArchitecturalVisualisationRecord>;
  generateConstraintOverlay(input: FrcArchitecturalVisualisationInputV1): Promise<ArchitecturalVisualisationRecord>;
  generateComparison(input: FrcArchitecturalVisualisationInputV1): Promise<ArchitecturalVisualisationRecord>;
  validateVisualisation(input: {
    request: FrcArchitecturalVisualisationInputV1;
    output: ArchitecturalVisualisationRecord;
  }): Promise<VisualValidationResult>;
}

export const VISUALISATION_CATALOGUE: Array<{
  type: VisualisationType;
  title: string;
  purpose: string;
  requiredLabel: string;
}> = [
  { type: "existing_site_explanation", title: "Existing-site interpretation", purpose: "Explain known and unknown property conditions.", requiredLabel: "Existing-site interpretation — based on available evidence" },
  { type: "client_motivation_concept", title: "Project-motivation concept", purpose: "Translate the client motivation into a preliminary design direction.", requiredLabel: VISUAL_DISCLAIMER },
  { type: "site_opportunity_concept", title: "Site-opportunity concept", purpose: "Show areas that may be investigated.", requiredLabel: VISUAL_DISCLAIMER },
  { type: "constraint_overlay", title: "Constraint overlay", purpose: "Distinguish verified, mapped, inferred and unknown constraints.", requiredLabel: VISUAL_DISCLAIMER },
  { type: "services_plumbing", title: "Indicative services and plumbing considerations", purpose: "Explain confirmed services and areas requiring hydraulic investigation.", requiredLabel: SERVICES_VISUAL_DISCLAIMER },
  { type: "access_circulation", title: "Indicative access and circulation concept", purpose: "Explain pedestrian, vehicle and construction access questions.", requiredLabel: VISUAL_DISCLAIMER },
  { type: "privacy_neighbour_impact", title: "Neighbour-impact discussion diagram", purpose: "Explain privacy, solar-access and overshadowing topics requiring investigation.", requiredLabel: "Neighbour-impact discussion diagram — not a certified shadow study" },
  { type: "options_comparison", title: "Options comparison", purpose: "Compare options using a consistent site context and visual quality.", requiredLabel: VISUAL_DISCLAIMER },
  { type: "before_after", title: "Before and concept comparison", purpose: "Overlay an illustrative concept on a usable authorised property photograph.", requiredLabel: VISUAL_DISCLAIMER },
];

const visualByType = new Map(VISUALISATION_CATALOGUE.map((item) => [item.type, item]));

export function visualisationTypesForReport(reportId: string): VisualisationType[] {
  const report = REPORT_BY_ID.get(reportId);
  if (!report?.developmentSpecific) return [];
  const base: VisualisationType[] = ["existing_site_explanation", "client_motivation_concept", "constraint_overlay", "services_plumbing", "access_circulation"];
  if (["extension_renovation", "two_storey_dwelling", "granny_flat"].includes(reportId)) base.push("privacy_neighbour_impact");
  if (["investor_options", "detailed_options_comparison", "development_potential"].includes(reportId)) base.push("options_comparison");
  return base;
}

function createMockOutput(input: FrcArchitecturalVisualisationInputV1): ArchitecturalVisualisationRecord {
  const definition = visualByType.get(input.requiredVisualisationType);
  if (!definition) throw new Error("Unsupported architectural visualisation type.");
  const disclaimer = [
    VISUAL_DISCLAIMER,
    input.boundaryStatus !== "survey_confirmed" ? MAPPED_BOUNDARY_VISUAL_DISCLAIMER : null,
    input.requiredVisualisationType === "services_plumbing" ? SERVICES_VISUAL_DISCLAIMER : null,
  ].filter(Boolean).join(" ");
  return {
    id: crypto.randomUUID(),
    orderId: input.orderId,
    reportId: input.reportId,
    jobId: input.jobId,
    visualisationType: input.requiredVisualisationType,
    provider: "mock-architectural-visualisation",
    model: "deterministic-neutral-diagram-v1",
    promptVersion: ARCHITECTURAL_VISUAL_PROMPT_VERSION,
    sourceInputsUsed: [
      ...input.verifiedPropertyFacts.map((fact) => fact.sourceId),
      ...input.uploadedSurveyFacts.map((fact) => fact.sourceId),
      ...input.titleAndEasementFacts.map((fact) => fact.sourceId),
    ],
    outputStorageReference: `mock-report-visuals/${input.reportId}/${input.requiredVisualisationType}.png`,
    width: 1600,
    height: 1000,
    generatedAt: new Date().toISOString(),
    status: "validating",
    professionalReviewStatus: input.professionalReviewRequirement ? "pending" : "not_required",
    disclaimer,
    caption: `${definition.title}. This deterministic mock records the requested ${input.proposedDevelopmentType} and the client motivation: ${input.projectMotivation.writtenMotivation || input.projectMotivation.selections.join(", ") || "not supplied"}.`,
    purpose: definition.purpose,
    legend: [
      { label: "Supported by supplied or authoritative information", status: "verified", colour: "green" },
      { label: "Preliminary design consideration", status: "inferred", colour: "amber" },
      { label: "Potential conflict or high-priority investigation", status: "requires_professional_confirmation", colour: "red" },
      { label: "Unknown or unavailable", status: "unknown", colour: "grey" },
    ],
    sourceConfidence: {
      boundary: input.boundaryStatus,
      services: input.sewerAndServiceFacts.some((fact) => ["verified", "uploaded_document", "official_mapped_source"].includes(fact.sourceStatus)) ? "supported" : "unknown",
    },
    revision: 1,
    failureReason: null,
    validationIssues: [],
    recommendedNextAction: "Confirm the illustrated assumptions against a registered survey and the relevant professional investigations before design or construction use.",
  };
}

export function validateArchitecturalVisualisation(input: {
  request: FrcArchitecturalVisualisationInputV1;
  output: ArchitecturalVisualisationRecord;
}): VisualValidationResult {
  const issues: string[] = [];
  const { request, output } = input;
  if (!output.disclaimer.includes(VISUAL_DISCLAIMER)) issues.push("Every visualisation requires the mandatory concept disclaimer.");
  if (!output.caption.trim()) issues.push("A visualisation cannot be released without an explanatory caption.");
  if (request.requiredVisualisationType === "before_after" && !request.propertyPhotographs.some((photo) => photo.usable)) {
    issues.push("A site-specific before-and-after visual requires a usable authorised property photograph.");
  }
  if (request.boundaryStatus !== "survey_confirmed" && /surveyed boundary|survey confirmed/i.test(`${output.caption} ${output.disclaimer}`)) {
    issues.push("Mapped or client-supplied boundaries cannot be labelled surveyed.");
  }
  const hasSupportedServices = request.sewerAndServiceFacts.some((fact) => ["verified", "uploaded_document", "official_mapped_source"].includes(fact.sourceStatus));
  if (request.requiredVisualisationType === "services_plumbing" && !hasSupportedServices) {
    if (!output.disclaimer.includes(SERVICES_VISUAL_DISCLAIMER)) issues.push("Unknown services require the construction and excavation disclaimer.");
    if (/confirmed (sewer|pipe|service)|exact (sewer|pipe|service)/i.test(output.caption)) issues.push("Unknown service routes cannot be labelled confirmed.");
  }
  const selectedReport = REPORT_BY_ID.get(request.selectedReportId);
  if (!selectedReport?.developmentSpecific) issues.push("A development visualisation cannot be attached to a non-development report.");
  if (!output.caption.toLowerCase().includes(request.proposedDevelopmentType.toLowerCase())) {
    issues.push("The visualisation does not identify the selected development type.");
  }
  const motivation = request.projectMotivation.writtenMotivation || request.projectMotivation.selections.join(", ");
  if (motivation && !output.caption.toLowerCase().includes(motivation.toLowerCase())) {
    issues.push("The visualisation does not include the client motivation.");
  }
  const sensitiveInterpretation = ["constraint_overlay", "services_plumbing", "before_after"].includes(request.requiredVisualisationType);
  return {
    valid: issues.length === 0,
    issues,
    requiresProfessionalReview: request.professionalReviewRequirement || sensitiveInterpretation ||
      request.boundaryStatus === "conflict_detected" ||
      request.planningConstraints.some((constraint) => constraint.sourceStatus === "requires_professional_confirmation"),
  };
}

export class MockArchitecturalVisualisationProvider implements ArchitecturalVisualisationProvider {
  readonly name = "mock-architectural-visualisation";
  async generateConcept(input: FrcArchitecturalVisualisationInputV1) { return createMockOutput(input); }
  async generateConstraintOverlay(input: FrcArchitecturalVisualisationInputV1) { return createMockOutput(input); }
  async generateComparison(input: FrcArchitecturalVisualisationInputV1) { return createMockOutput(input); }
  async validateVisualisation(input: { request: FrcArchitecturalVisualisationInputV1; output: ArchitecturalVisualisationRecord }) {
    return validateArchitecturalVisualisation(input);
  }
}

export class UnconfiguredArchitecturalVisualisationProvider implements ArchitecturalVisualisationProvider {
  readonly name = "unconfigured";
  private fail(): never { throw new Error("The live architectural visualisation provider is not configured."); }
  async generateConcept(): Promise<ArchitecturalVisualisationRecord> { return this.fail(); }
  async generateConstraintOverlay(): Promise<ArchitecturalVisualisationRecord> { return this.fail(); }
  async generateComparison(): Promise<ArchitecturalVisualisationRecord> { return this.fail(); }
  async validateVisualisation(): Promise<VisualValidationResult> { return this.fail(); }
}

export function getArchitecturalVisualisationProvider(): ArchitecturalVisualisationProvider {
  const provider = process.env.ARCHITECTURAL_IMAGE_PROVIDER ?? "mock";
  const enabled = process.env.ARCHITECTURAL_IMAGE_ENABLED === "true";
  return provider === "mock" && !enabled
    ? new MockArchitecturalVisualisationProvider()
    : new UnconfiguredArchitecturalVisualisationProvider();
}

export async function generateValidatedMockVisualisations(
  baseInput: Omit<FrcArchitecturalVisualisationInputV1, "requiredVisualisationType" | "mandatoryLabels">,
) {
  const provider = getArchitecturalVisualisationProvider();
  const outputs: ArchitecturalVisualisationRecord[] = [];
  const requestedTypes = visualisationTypesForReport(baseInput.selectedReportId);
  if (baseInput.propertyPhotographs.some((photo) => photo.usable)) requestedTypes.push("before_after");
  for (const type of [...new Set(requestedTypes)]) {
    const definition = visualByType.get(type)!;
    const request: FrcArchitecturalVisualisationInputV1 = {
      ...baseInput,
      requiredVisualisationType: type,
      mandatoryLabels: [definition.requiredLabel, VISUAL_DISCLAIMER],
    };
    const output = type === "constraint_overlay" || type === "services_plumbing"
      ? await provider.generateConstraintOverlay(request)
      : type === "options_comparison"
        ? await provider.generateComparison(request)
        : await provider.generateConcept(request);
    const validation = await provider.validateVisualisation({ request, output });
    output.validationIssues = validation.issues;
    output.status = validation.valid
      ? validation.requiresProfessionalReview ? "awaiting_professional_review" : "accepted"
      : "rejected";
    outputs.push(output);
  }
  return outputs;
}
