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

const modules = (prefix: string, titles: readonly string[]): Array<[string, string]> =>
  titles.map((title, index) => [
    `${prefix}_${String(index + 1).padStart(2, "0")}_${title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_|_$/g, "")
      .slice(0, 56)}`,
    title,
  ]);

const PROPERTY_INTELLIGENCE_MODULES = modules("pi", [
  "Property identity",
  "Land area and boundary status",
  "Lot and deposited-plan status",
  "Local government area",
  "Planning authority",
  "Zoning",
  "Zone objectives",
  "Available LEP controls",
  "Relevant DCP identification",
  "Relevant State policies",
  "Heritage screening",
  "Flood screening",
  "Bushfire screening",
  "Biodiversity screening",
  "Environmental mapping",
  "Land reservation or acquisition mapping",
  "Available height control",
  "Available floor-space-ratio control",
  "Available minimum-lot-size control",
  "General site opportunities",
  "General site constraints",
  "Missing property documents",
  "Property-level risk register",
  "Recommended due-diligence actions",
  "Source register",
]);

const SINGLE_STOREY_MODULES = modules("ss", [
  "Property baseline",
  "Land area and boundary status",
  "Desired dwelling brief",
  "Reference material reviewed",
  "Approximate spatial requirements",
  "Building-envelope considerations",
  "Front setback",
  "Side setbacks",
  "Rear setback",
  "Site coverage",
  "Floor-space ratio",
  "Landscaped area",
  "Private open space",
  "Parking",
  "Vehicle access",
  "Solar access",
  "Stormwater",
  "Trees and vegetation",
  "Services",
  "Bushfire, flood or other mapped constraints",
  "Preliminary CDC versus DA pathway",
  "Required consultants",
  "Missing information",
  "Feasibility risk register",
  "Design-brief recommendations",
  "Next steps",
]);

export const REPORT_SPECIFIC_SECTIONS: Record<string, Array<[string, string]>> = {
  property_intelligence: PROPERTY_INTELLIGENCE_MODULES,
  development_potential: [
    ...PROPERTY_INTELLIGENCE_MODULES,
    ...modules("dp", [
      "Preliminary development opportunities",
      "Development types worth investigating",
      "Existing dwelling considerations where known",
      "Site-capacity factors",
      "Access considerations",
      "Parking considerations",
      "Landscaped-area considerations",
      "Private-open-space considerations",
      "Preliminary approval pathways",
      "Potential CDC investigations",
      "Potential DA investigations",
      "Consultant pathway",
      "Information required before concept design",
      "Development-potential risk register",
      "Recommended development investigations",
      "Development action sequence",
    ]),
  ],
  investor_options: modules("io", [
    "Property baseline",
    "Land area and boundary status",
    "Acquisition-decision context",
    "Client investment objective",
    "Potential hold strategy",
    "Potential renovation strategy",
    "Potential extension strategy",
    "Potential secondary-dwelling strategy",
    "Potential redevelopment strategy",
    "Other evidence-supported options",
    "Side-by-side options comparison",
    "Planning complexity comparison",
    "Information-gap comparison",
    "Consultant requirement comparison",
    "Relative risk comparison",
    "Time and dependency considerations",
    "Recommended investigation order",
    "Factors that could change the recommendation",
    "Investor risk register",
    "Acquisition due-diligence checklist",
  ]),
  granny_flat: modules("gf", [
    "Property baseline",
    "Land area and boundary status",
    "Client’s desired granny-flat concept",
    "Reference material reviewed",
    "Key requested features",
    "Existing-dwelling relationship",
    "Preliminary site-fit considerations",
    "Approximate spatial demand",
    "Access considerations",
    "Parking considerations",
    "Private-open-space considerations",
    "Landscaped-area implications",
    "Privacy considerations",
    "Overlooking considerations",
    "Height considerations",
    "Setbacks requiring confirmation",
    "Fire-separation considerations requiring confirmation",
    "Stormwater considerations",
    "Services considerations",
    "Relevant secondary-dwelling pathway",
    "CDC versus DA discussion",
    "Missing survey or title information",
    "Required consultants",
    "Feasibility risk register",
    "Recommended next steps",
  ]),
  extension_renovation: modules("er", [
    "Property baseline",
    "Existing-building information available",
    "Proposed renovation or extension summary",
    "Reference material reviewed",
    "Likely planning-control topics",
    "Existing setbacks where known",
    "New setback implications",
    "Site-coverage implications",
    "Floor-space implications",
    "Height implications",
    "Privacy and overlooking",
    "Overshadowing",
    "Structural matters requiring engineer review",
    "Existing-services implications",
    "Stormwater implications",
    "Heritage implications where relevant",
    "Approval-pathway discussion",
    "Required drawings",
    "Required consultants",
    "Missing information",
    "Risk register",
    "Recommended next steps",
  ]),
  single_storey_dwelling: SINGLE_STOREY_MODULES,
  two_storey_dwelling: [
    ...SINGLE_STOREY_MODULES,
    ...modules("ts", [
      "Upper-floor placement considerations",
      "Maximum height",
      "Storey and roof-form considerations",
      "Upper-floor setbacks",
      "Privacy",
      "Overlooking",
      "Window-placement considerations",
      "Balcony considerations",
      "Overshadowing",
      "Solar access to neighbours",
      "Building bulk",
      "Articulation considerations",
      "Streetscape considerations",
      "Excavation and retaining implications",
      "Structural consultant pathway",
      "Height and level information still required",
      "Two-storey-specific risk register",
      "Recommended design investigations",
    ]),
  ],
  pool_spa: modules("ps", [
    "Property baseline",
    "Land area and boundary status",
    "Desired pool or spa brief",
    "Reference material reviewed",
    "Preliminary location considerations",
    "Boundary setbacks requiring confirmation",
    "Existing structures",
    "Easements and services",
    "Sewer considerations",
    "Safety-barrier requirements requiring confirmation",
    "Access for construction",
    "Excavation",
    "Retaining",
    "Stormwater and overflow",
    "Landscaping",
    "Noise and equipment location",
    "Approval pathway",
    "Required consultants",
    "Missing information",
    "Risk register",
    "Next steps",
  ]),
  outdoor_living: modules("ol", [
    "Property baseline",
    "Desired outdoor structure",
    "Reference material",
    "Proposed use",
    "Location considerations",
    "Covered-area implications",
    "Boundary setbacks",
    "Height",
    "Privacy",
    "Overshadowing",
    "Stormwater",
    "Bushfire considerations where relevant",
    "Connection to existing dwelling",
    "Structural requirements",
    "Approval pathway",
    "Missing information",
    "Risk register",
    "Next steps",
  ]),
  garage_outbuilding: modules("go", [
    "Property baseline",
    "Desired building use",
    "Proposed size",
    "Proposed height",
    "Proposed location",
    "Reference material",
    "Vehicle access",
    "Parking and manoeuvring",
    "Boundary setbacks",
    "Site coverage",
    "Landscaped area",
    "Streetscape",
    "Services",
    "Stormwater",
    "Fire-separation considerations",
    "Approval pathway",
    "Missing information",
    "Risk register",
    "Next steps",
  ]),
  plan_compliance_review: modules("pc", [
    "Property baseline",
    "Land area and boundary status",
    "Plan register",
    "Drawing author",
    "Drawing numbers",
    "Revisions",
    "Issue dates",
    "Documents relied upon",
    "Proposed-development summary",
    "Dimensional information available",
    "Missing plan information",
    "LEP compliance matrix",
    "DCP compliance matrix",
    "CDC criteria where relevant",
    "Height review",
    "Setback review",
    "Floor-space review",
    "Site-coverage review",
    "Landscaped-area review",
    "Private-open-space review",
    "Parking review",
    "Access review",
    "Privacy review",
    "Overshadowing information status",
    "Stormwater information status",
    "Consultant information status",
    "Conflicts between plans and sources",
    "Issues requiring redesign",
    "Issues requiring professional confirmation",
    "Plan-review risk register",
    "Recommended amendments",
    "Next submission steps",
  ]),
  detailed_options_comparison: modules("oc", [
    "Property baseline",
    "Client decision",
    "Options being compared",
    "Assumptions for each option",
    "Spatial-demand comparison",
    "Planning-control comparison",
    "Approval-pathway comparison",
    "Document requirements",
    "Consultant requirements",
    "Relative planning complexity",
    "Relative site constraints",
    "Relative flexibility",
    "Relative information gaps",
    "Risk comparison",
    "Combined-site conflicts",
    "Recommended option for further investigation",
    "Reasons for recommendation",
    "Factors that could change the recommendation",
    "Prioritised next steps",
  ]),
  professional_review: modules("pr", [
    "Professional-review status",
    "Reviewer name",
    "Reviewer role",
    "Registration jurisdiction where applicable",
    "Registration number where applicable",
    "Review date",
    "Sections reviewed",
    "Corrections made",
    "Reviewer observations",
    "Unresolved matters",
    "Release decision",
    "Review limitations",
    "Revision history",
  ]),
  council_readiness: modules("cr", [
    "Applicable underlying feasibility report",
    "Final document register",
    "Submission-document checklist",
    "Planning-control matrix",
    "Statement-of-Environmental-Effects preparation status",
    "Required architectural drawings",
    "Required survey information",
    "Required engineering information",
    "BASIX status",
    "Specialist-report status",
    "Title and easement status",
    "Council-form status",
    "Owner-consent status",
    "Consultant coordination",
    "Outstanding information",
    "Submission blockers",
    "Review record",
    "Recommended submission sequence",
    "Council-readiness status",
  ]),
  complex_development: modules("cx", [
    "Complexity triggers",
    "Property and proposal baseline",
    "Tailored evidence schedule",
    "Required professional disciplines",
    "Investigation dependencies",
    "Tailored scope and quotation pathway",
  ]),
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
    ...(REPORT_SPECIFIC_SECTIONS[report.id] ?? []).map(([code, title]) => ({ code, title })),
    ...(report.developmentSpecific ? [{ code: "concept_visualisations", title: "Concept visualisations" }] : []),
  ],
  conditionalSections: [
    { code: "large_site_analysis", title: "Large-site analysis", condition: "Authoritative area exceeds 1,000 m²" },
    { code: "document_analysis_schedule", title: "Purchased technical document-analysis schedule", condition: "A paid technical document-analysis upgrade is present" },
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
  if (input.report.schemaVersion !== REPORT_SCHEMA_VERSION) {
    issues.push(
      `Report schema ${input.report.schemaVersion} does not match ${REPORT_SCHEMA_VERSION}.`,
    );
  }
  const snapshot = input.report.templateSnapshots.find(
    (entry) => entry.templateId === template.id,
  );
  if (!snapshot) {
    issues.push(`Missing frozen template snapshot for ${template.id}.`);
  } else if (snapshot.templateVersion !== template.version) {
    issues.push(
      `Frozen template ${template.id} has version ${snapshot.templateVersion}; expected ${template.version}.`,
    );
  }
  const sectionCodes = input.report.sections.map((section) => section.code);
  if (new Set(sectionCodes).size !== sectionCodes.length) {
    issues.push("Report contains duplicate section codes.");
  }
  const sectionsByCode = new Map(input.report.sections.map((section) => [section.code, section]));
  let previousIndex = -1;
  for (const required of template.requiredSections) {
    const section = sectionsByCode.get(required.code);
    if (!section) {
      issues.push(`Missing required section ${required.code}.`);
      continue;
    }
    const index = sectionCodes.indexOf(required.code);
    if (index < previousIndex) {
      issues.push(`Required section ${required.code} is out of template order.`);
    }
    previousIndex = index;
    if (section.heading !== required.title) {
      issues.push(
        `Section ${required.code} heading does not match the frozen template.`,
      );
    }
    const hasStructuredContent =
      section.summary.trim().length > 0 &&
      (section.statements.length > 0 ||
        section.bullets.length > 0 ||
        (section.findings?.length ?? 0) > 0 ||
        (section.recommendations?.length ?? 0) > 0 ||
        (section.requiredActions?.length ?? 0) > 0);
    if (!hasStructuredContent) {
      issues.push(`Required section ${required.code} has no structured content.`);
    }
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
      if (
        statement.statementType === "verified_official_fact" &&
        !statement.issueOrRetrievalDate
      ) {
        issues.push(
          `Section ${section.code} has an official fact without a retrieval date.`,
        );
      }
    }
    if (
      section.status === "supported_by_official_source" &&
      !evidence.some(
        (statement) =>
          statement.statementType === "verified_official_fact" &&
          statement.sourceStatus === "official_verified",
      )
    ) {
      issues.push(
        `Section ${section.code} claims official support without official evidence.`,
      );
    }
    if (
      section.status === "supported_by_client_upload" &&
      !evidence.some((statement) =>
        input.allowedSourceIds.has(statement.sourceId),
      )
    ) {
      issues.push(
        `Section ${section.code} claims client-upload support without a cited source.`,
      );
    }
    for (const extra of section.extraSubsections ?? []) {
      if (!extra.code.startsWith(`${section.code}_extra_`)) issues.push(`Extra subsection ${extra.code} does not preserve its parent section code.`);
      if (!extra.preliminary && extra.evidenceSourceIds.length === 0) issues.push(`Extra subsection ${extra.code} has no evidence and is not marked preliminary.`);
      for (const sourceId of extra.evidenceSourceIds) {
        if (!input.allowedSourceIds.has(sourceId)) issues.push(`Extra subsection ${extra.code} cites unsupported source ${sourceId}.`);
      }
    }
  }
  const reportText = JSON.stringify(input.report).toLowerCase();
  for (const claim of template.excludedClaims) {
    if (reportText.includes(claim.toLowerCase())) {
      issues.push(`Report contains prohibited claim: ${claim}.`);
    }
  }
  const prohibitedPatterns = [
    /\bguaranteed? (?:development )?approval\b/i,
    /\bmapped boundar(?:y|ies) (?:is|are) surveyed\b/i,
    /\bconfirmed (?:sewer|service|pipe) route\b/i,
    /\bconstruction-ready design\b/i,
  ];
  for (const pattern of prohibitedPatterns) {
    if (pattern.test(reportText)) {
      issues.push(`Report contains prohibited output matching ${pattern.source}.`);
    }
  }
  return { valid: issues.length === 0, issues };
}
