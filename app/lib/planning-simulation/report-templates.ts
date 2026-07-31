import { DEVELOPMENT_ITEM_BY_CODE } from "./development-items";
import type {
  AssessmentMode,
  ReportTemplateKind,
  SelectedDevelopmentItem,
} from "./types";

export type ReportSectionTemplate = {
  key: string;
  heading: string;
  purpose: string;
  requiredInputs: string[];
  draftingRules: string[];
};

export type PlanningReportTemplate = {
  templateId:
    | "frc-preliminary-planning-v1"
    | "frc-development-intelligence-v1"
    | "frc-professionally-reviewed-v1"
    | "frc-council-readiness-v1"
    | "frc-tailored-scope-v1";
  templateVersion: "FRC_REPORT_TEMPLATE_2026_01";
  reportSchemaVersion: "FRC_REPORT_SCHEMA_V1";
  kind: ReportTemplateKind;
  title: string;
  architectReviewRequired: boolean;
  clientReleaseAllowedOnlyAfterArchitectApproval: boolean;
  sections: ReportSectionTemplate[];
};

const section = (
  key: string,
  heading: string,
  purpose: string,
  requiredInputs: string[] = [],
  draftingRules: string[] = [],
): ReportSectionTemplate => ({
  key,
  heading,
  purpose,
  requiredInputs,
  draftingRules: [
    "Distinguish official facts, client-supplied evidence, extracted facts, FRC analysis and missing information.",
    "Do not invent planning controls, approval outcomes or external professional documents.",
    ...draftingRules,
  ],
});

const CORE_SECTIONS: ReportSectionTemplate[] = [
  section("cover", "Cover", "Identify the report, property, client, version and status.", ["Property reference", "Report metadata"], ["Apply the correct preliminary or reviewed watermark."]),
  section("important_notice", "Report status and important notice", "Explain whether the report is preliminary, pending verification or professionally released."),
  section("contents", "Table of contents", "Provide navigable report structure."),
  section("client_project", "Client and project details", "Record only the client and project information needed for the engagement."),
  section("executive_summary", "Executive summary", "Summarise scope, evidence position, principal risks and next actions."),
  section("confirmed_scope", "Confirmed scope", "List every purchased development assessment and selected detail."),
  section("purchased_services", "Purchased services and fee basis", "Reproduce the immutable server price snapshot.", ["Frozen price snapshot"], ["Never recalculate or alter pricing."]),
  section("property_identity", "Property identity", "Record address, lot, DP, parcel and area sources without merging unlike evidence."),
  section("source_register", "Source and provenance register", "List source, publisher, status and retrieval date for every material fact."),
  section("planning_framework", "Planning framework", "Identify relevant legislation, instruments and preliminary pathways."),
  section("lep_controls", "LEP controls", "Record zoning, height, FSR, lot size and other relevant statutory controls."),
  section("dcp_controls", "DCP and local-policy controls", "Record project-relevant setbacks, landscape, parking, privacy, stormwater and local controls."),
  section("site_opportunities", "Site opportunities", "Describe evidence-based site and project opportunities."),
  section("site_constraints", "Site constraints", "Describe physical, planning and delivery constraints."),
  section("environmental_constraints", "Environmental constraints", "Record bushfire, flood, biodiversity, contamination and other mapped or reported constraints."),
  section("title_services", "Title, easements and services status", "Record title and servicing evidence and unresolved checks."),
  section("documents_reviewed", "Documents reviewed", "Provide the document register with authorship, date, revision, source and limitations."),
  section("missing_documents", "Missing documents and investigations", "List external evidence that remains required and who normally supplies it."),
  section("approval_pathway", "Preliminary approval pathway", "Outline potential pathways without claiming consent or certification."),
  section("consultant_pathway", "Consultant pathway", "Identify planners, surveyors, engineers and specialists likely to be required."),
  section("planning_matrix", "Planning-control compliance matrix", "Compare controls, evidence and preliminary project response."),
  section("risk_register", "Risk register", "Record evidence, severity, consequence, action, owner and status."),
  section("recommendations", "Recommendations", "Give evidence-conditioned recommendations."),
  section("action_plan", "Action plan", "Prioritise practical next steps, dependencies and responsible parties."),
  section("next_steps", "Next steps", "Explain what the client and project team should do next."),
  section("professional_review", "Professional-review record", "Record genuine human review only where completed.", [], ["Never display a signature or registration record without completed human review."]),
  section("limitations", "Limitations and disclaimer", "Explain the service boundary and evidence limitations."),
  section("appendices", "Appendices", "Provide supporting schedules without exposing private storage references."),
  section("references", "Source references", "List public sources and private evidence references used."),
];

const MODE_SECTIONS: Record<AssessmentMode, ReportSectionTemplate[]> = {
  single: [],
  combined: [
    section("combined_site", "Combined-site assessment", "Assess interactions, competing site demands, access, privacy, drainage, services and sequencing across selected proposals."),
  ],
  alternatives: [
    section("options_comparison", "Development-option comparison", "Compare benefits, constraints, approval complexity, evidence needs, risk and next action on one evidence base."),
  ],
};

const COUNCIL_SECTIONS = [
  section("drawing_compliance", "Drawing and control cross-check", "Cross-check current final drawings against verified controls and revisions."),
  section("submission_readiness", "Council submission-readiness schedule", "Track forms, plans, reports, certificates, unresolved items and responsible parties."),
  section("statement_support", "Planning statement support schedule", "Structure the evidence needed for a submission without fabricating a formal statutory report."),
];

export function buildPlanningReportTemplate(input: {
  kind: ReportTemplateKind;
  assessmentMode: AssessmentMode;
  selectedItems: SelectedDevelopmentItem[];
}): PlanningReportTemplate {
  const itemSections = input.selectedItems.flatMap((selected, index) => {
    const definition = DEVELOPMENT_ITEM_BY_CODE.get(selected.code);
    if (!definition) return [];
    return [
      section(
        `item_${index + 1}_${definition.code.toLowerCase()}`,
        `${definition.name} assessment`,
        `Assess the confirmed ${definition.name.toLowerCase()} objective.`,
        ["Verified property facts", "Uploaded evidence", ...definition.reportAssessmentSections],
        selected.selectedDetails.length ? [`Address confirmed details: ${selected.selectedDetails.join(", ")}.`] : [],
      ),
    ];
  });
  const isProfessional = input.kind === "architect_handover" || input.kind === "council_submission_readiness";
  const templateId =
    input.kind === "council_submission_readiness"
      ? "frc-council-readiness-v1"
      : input.kind === "architect_handover"
        ? "frc-professionally-reviewed-v1"
        : input.kind === "tailored_quote_brief"
          ? "frc-tailored-scope-v1"
          : input.selectedItems.length > 1
            ? "frc-development-intelligence-v1"
            : "frc-preliminary-planning-v1";
  const title =
    input.kind === "council_submission_readiness"
      ? "FRC council-submission readiness report"
      : input.kind === "architect_handover"
        ? "FRC professionally reviewed planning report"
        : input.kind === "tailored_quote_brief"
          ? "Tailored planning-scope brief"
          : "Preliminary AI-assisted property-planning report";
  const tailored = input.kind === "tailored_quote_brief"
    ? [section("tailored_scope", "Tailored engagement scope", "Explain complexity triggers, evidence needs and the separate quotation pathway.")]
    : [];

  return {
    templateId,
    templateVersion: "FRC_REPORT_TEMPLATE_2026_01",
    reportSchemaVersion: "FRC_REPORT_SCHEMA_V1",
    kind: input.kind,
    title,
    architectReviewRequired: isProfessional,
    clientReleaseAllowedOnlyAfterArchitectApproval: isProfessional,
    sections: [
      ...CORE_SECTIONS.slice(0, 18),
      ...itemSections,
      ...MODE_SECTIONS[input.assessmentMode],
      ...CORE_SECTIONS.slice(18),
      ...(input.kind === "council_submission_readiness" ? COUNCIL_SECTIONS : []),
      ...tailored,
    ],
  };
}
