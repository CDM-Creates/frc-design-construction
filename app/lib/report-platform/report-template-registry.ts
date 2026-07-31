import { REPORT_CATALOGUE } from "./report-catalogue";
import type { StructuredPlanningReport, StructuredReportSection } from "./types";

export const REPORT_SCHEMA_VERSION = "FRC_REPORT_SCHEMA_V2";
export const REPORT_TEMPLATE_VERSION = "FRC_REPORT_TEMPLATES_2026_02";

export type ModularReportTemplate = {
  id: string;
  version: typeof REPORT_TEMPLATE_VERSION;
  title: string;
  description: string;
  requiredInputs: string[];
  requiredSections: Array<{ code: string; title: string }>;
  conditionalSections: Array<{ code: string; title: string; condition: string }>;
  excludedClaims: string[];
  professionalReviewRule: "optional" | "mandatory" | "included" | "not_applicable";
  zipOutputRule: "separate_pdf_and_common_pack";
};

export const COMMON_REPORT_SECTIONS = [
  ["01_cover", "Cover"],
  ["02_report_status", "Report status"],
  ["03_preliminary_notice", "Important preliminary notice"],
  ["04_client_decision_context", "Client and decision context"],
  ["05_property_identity", "Property identity"],
  ["06_property_area_boundary", "Property area and boundary status"],
  ["07_executive_summary", "Executive summary"],
  ["08_confirmed_scope", "Confirmed report scope"],
  ["09_client_references_brief", "Client references and brief"],
  ["10_documents_supplied", "Documents supplied"],
  ["11_official_mapped_sources", "Official and mapped sources used"],
  ["12_source_provenance_register", "Source and provenance register"],
  ["13_known_information", "Known information"],
  ["14_preliminary_inferences", "Preliminary inferences"],
  ["15_missing_information", "Missing information"],
  ["16_conflicting_information", "Conflicting information"],
  ["17_site_opportunities", "Site opportunities"],
  ["18_site_constraints", "Site constraints"],
  ["19_planning_framework", "Planning framework"],
  ["20_risk_register", "Risk register"],
  ["21_recommended_investigations", "Recommended investigations"],
  ["22_prioritised_action_plan", "Prioritised action plan"],
  ["23_limitations", "Limitations"],
  ["24_appendices", "Appendices"],
  ["25_source_references", "Source references"],
] as const;

const specificSections: Record<string, Array<[string, string]>> = {
  property_intelligence: [
    ["pi_lot_dp_status", "Lot and deposited-plan status"],
    ["pi_planning_authority", "Planning authority and controls"],
    ["pi_environmental_screening", "Environmental and hazard screening"],
    ["pi_services_title", "Title, easements and service evidence status"],
  ],
  development_potential: [
    ["dp_pathways", "Potential development pathways"],
    ["dp_capacity_factors", "Site-capacity factors"],
    ["dp_large_site", "Large-site analysis"],
  ],
  investor_options: [
    ["io_acquisition_context", "Property-acquisition context"],
    ["io_option_comparison", "Development options comparison"],
    ["io_staging", "Development staging and investigation priorities"],
  ],
  granny_flat: [
    ["gf_pathway", "Secondary-dwelling pathway"],
    ["gf_household_motivation", "Household motivation and accessibility"],
    ["gf_privacy_services", "Privacy, access and services"],
  ],
  extension_renovation: [
    ["er_existing_building", "Existing-building evidence"],
    ["er_addition_controls", "Alterations and additions controls"],
    ["er_constructability", "Constructability information requiring confirmation"],
  ],
  single_storey_dwelling: [
    ["ss_building_envelope", "Single-storey building-envelope investigation"],
    ["ss_site_planning", "Access, parking and open-space investigation"],
  ],
  two_storey_dwelling: [
    ["ts_building_envelope", "Two-storey building-envelope investigation"],
    ["ts_neighbour_impact", "Privacy, overshadowing and neighbour-impact topics"],
  ],
  pool_spa: [
    ["ps_safety", "Pool safety and siting considerations"],
    ["ps_services", "Hydraulic, drainage and service considerations"],
  ],
  outdoor_living: [
    ["ol_structures", "Outdoor structures and site coverage"],
    ["ol_amenity", "Amenity, privacy and landscape considerations"],
  ],
  garage_outbuilding: [
    ["go_use_pathway", "Use and approval pathway"],
    ["go_access_services", "Vehicle access, fire separation and services"],
  ],
  plan_compliance_review: [
    ["pc_drawing_register", "Drawing register"],
    ["pc_control_matrix", "Planning-control compliance matrix"],
    ["pc_conflicts", "Plan conflicts and missing drawing information"],
  ],
  detailed_options_comparison: [
    ["oc_option_baseline", "Consistent option baseline"],
    ["oc_side_by_side", "Side-by-side options comparison"],
    ["oc_investigation_sequence", "Option-specific investigation sequence"],
  ],
  professional_review: [
    ["pr_review_scope", "Professional-review scope"],
    ["pr_change_record", "Reviewer change record"],
    ["pr_release_record", "Professional release record"],
  ],
  council_readiness: [
    ["cr_drawing_crosscheck", "Drawing and control cross-check"],
    ["cr_submission_schedule", "Council submission-readiness schedule"],
    ["cr_consultants", "Consultant and certificate coordination"],
  ],
  complex_development: [
    ["cx_complexity_triggers", "Complexity triggers"],
    ["cx_tailored_scope", "Tailored investigation and quotation scope"],
  ],
};

const excludedClaims = [
  "Development approval is guaranteed",
  "Mapped boundaries are surveyed",
  "Unverified service routes are confirmed",
  "A preliminary visualisation is a construction drawing",
  "An official certificate has been generated",
  "A third-party design may be reproduced",
];

export const REPORT_TEMPLATE_REGISTRY: ModularReportTemplate[] = REPORT_CATALOGUE.map((report) => ({
  id: report.templateId,
  version: REPORT_TEMPLATE_VERSION,
  title: report.name,
  description: report.purpose,
  requiredInputs: report.requiredInputs,
  requiredSections: [
    ...COMMON_REPORT_SECTIONS.map(([code, title]) => ({ code, title })),
    ...(specificSections[report.id] ?? []).map(([code, title]) => ({ code, title })),
    ...(report.developmentSpecific ? [{ code: "concept_visualisations", title: "Concept visualisations" }] : []),
  ],
  conditionalSections: [
    { code: "large_site_analysis", title: "Large-site analysis", condition: "Authoritative area exceeds 1,000 m²" },
    { code: "professional_review_record", title: "Professional-review record", condition: "Professional review purchased and completed" },
    { code: "council_readiness_checklist", title: "Council-readiness checklist", condition: "Council-readiness assessment selected" },
  ],
  excludedClaims,
  professionalReviewRule: report.professionalReview,
  zipOutputRule: "separate_pdf_and_common_pack",
}));

export const REPORT_TEMPLATE_BY_ID = new Map(REPORT_TEMPLATE_REGISTRY.map((template) => [template.id, template]));

export function emptyStructuredSection(code: string, title: string): StructuredReportSection {
  return {
    code,
    heading: title,
    summary: "No supported conclusion is available until the required evidence is processed.",
    statements: [],
    bullets: [],
    findings: [],
    evidence: [],
    sourceCitations: [],
    limitations: [],
    riskLevel: "not_assessed",
    recommendations: [],
    requiredActions: [],
    extraSubsections: [],
    status: "unavailable",
  };
}

export function validateStructuredReportV2(input: {
  report: StructuredPlanningReport;
  templateId: string;
  allowedSourceIds: Set<string>;
}) {
  const issues: string[] = [];
  const template = REPORT_TEMPLATE_BY_ID.get(input.templateId);
  if (!template) return { valid: false, issues: [`Unknown template ${input.templateId}.`] };
  const sectionsByCode = new Map(input.report.sections.map((section) => [section.code, section]));
  for (const required of template.requiredSections) {
    if (!sectionsByCode.has(required.code)) issues.push(`Missing required section ${required.code}.`);
  }
  for (const section of input.report.sections) {
    const evidence = [...section.statements, ...(section.evidence ?? [])];
    for (const statement of evidence) {
      if (statement.statementType !== "missing_information" && !input.allowedSourceIds.has(statement.sourceId)) {
        issues.push(`Section ${section.code} cites unsupported source ${statement.sourceId}.`);
      }
      if (statement.statementType === "verified_official_fact" && statement.sourceStatus !== "official_verified") {
        issues.push(`Section ${section.code} labels an unverified source as official fact.`);
      }
    }
    for (const extra of section.extraSubsections ?? []) {
      if (!extra.code.startsWith(`${section.code}_extra_`)) issues.push(`Extra subsection ${extra.code} does not preserve its parent section code.`);
      if (!extra.preliminary && extra.evidenceSourceIds.length === 0) issues.push(`Extra subsection ${extra.code} has no evidence and is not marked preliminary.`);
      for (const sourceId of extra.evidenceSourceIds) {
        if (!input.allowedSourceIds.has(sourceId)) issues.push(`Extra subsection ${extra.code} cites unsupported source ${sourceId}.`);
      }
    }
  }
  return { valid: issues.length === 0, issues };
}
