import { DEVELOPMENT_ITEM_BY_CODE } from "../planning-simulation/development-items";
import { DOCUMENT_CATEGORY_BY_CODE } from "../planning-simulation/document-categories";
import type { FrozenPriceSnapshot, SelectedDevelopmentItem } from "../planning-simulation/types";
import type { FrozenCataloguePriceSnapshot } from "./report-catalogue";
import { resolveCoverage } from "./coverage-resolver";
import { BOUNDARY_STATUS_LABELS, MAPPED_BOUNDARY_NOTICE } from "./property-boundary";
import type {
  DocumentRecord,
  EvidenceStatement,
  ReportOrder,
  StructuredPlanningReport,
  StructuredReportSection,
} from "./types";

export type FrcReportGenerationInputV1 = {
  schemaVersion: "FRC_REPORT_GENERATION_INPUT_V1";
  order: {
    id: string;
    reportType: ReportOrder["reportType"];
    selectedScope: SelectedDevelopmentItem[];
    frozenPriceSnapshot: FrozenPriceSnapshot | FrozenCataloguePriceSnapshot;
    professionalReviewRequired: boolean;
  };
  propertyIdentity: Record<string, unknown>;
  officialPropertyFacts: Array<Record<string, unknown>>;
  sourceRegister: Array<Record<string, unknown>>;
  uploadedDocumentRegister: DocumentRecord[];
  extractedDocumentFacts: Array<Record<string, unknown>>;
  sourceConflicts: Array<Record<string, unknown>>;
  missingDocuments: string[];
  projectDetails: Record<string, unknown>;
  clientObjectives: string;
  selectedReportSections: string[];
  professionalReviewRequirement: boolean;
  reportLimitations: string[];
  outputTemplateId: string;
  reportSchemaVersion: "FRC_REPORT_SCHEMA_V1";
};

export type GeneratedSection = StructuredReportSection;
export type ValidationResult = { valid: boolean; issues: string[] };

export interface ReportAiProvider {
  readonly name: string;
  generateSection(input: { package: FrcReportGenerationInputV1; code: string; heading: string }): Promise<GeneratedSection>;
  validateSection(input: { section: GeneratedSection; package: FrcReportGenerationInputV1 }): Promise<ValidationResult>;
  synthesiseReport(input: {
    package: FrcReportGenerationInputV1;
    sections: GeneratedSection[];
    reportId: string;
    clientName: string;
  }): Promise<StructuredPlanningReport>;
}

const missingEvidence = (heading: string): EvidenceStatement => ({
  text: `${heading} remains subject to the source and professional checks identified in this report.`,
  statementType: "missing_information",
  sourceId: "FRC-MISSING-INFORMATION",
  sourceType: "report_control",
  sourceStatus: "not_verified",
  issueOrRetrievalDate: null,
  verificationState: "requires_professional_review",
  professionalReviewRequired: true,
});

export class MockReportAiProvider implements ReportAiProvider {
  readonly name = "mock-report-ai";

  async generateSection(input: { package: FrcReportGenerationInputV1; code: string; heading: string }) {
    const documents = input.package.uploadedDocumentRegister;
    const hasOfficialSource = input.package.sourceRegister.length > 0;
    const professionalReviewRequired = input.package.order.professionalReviewRequired;
    const isMissing = input.code === "missing_documents" && input.package.missingDocuments.length > 0;
    const isLargeSite = input.code === "large_site_analysis";
    const boundarySection = ["05_property_identity", "06_property_area_boundary", "property_identity"].includes(input.code);
    const mappedArea = input.package.propertyIdentity.mappedAreaSqm;
    const clientArea = input.package.propertyIdentity.clientSuppliedAreaSqm;
    const area = typeof mappedArea === "number" ? mappedArea : typeof clientArea === "number" ? clientArea : null;
    const rawBoundaryStatus = String(input.package.propertyIdentity.boundaryStatus ?? (typeof mappedArea === "number" ? "official_parcel_mapped" : "unavailable"));
    const boundaryStatus = rawBoundaryStatus in BOUNDARY_STATUS_LABELS
      ? BOUNDARY_STATUS_LABELS[rawBoundaryStatus as keyof typeof BOUNDARY_STATUS_LABELS]
      : BOUNDARY_STATUS_LABELS.unavailable;
    const areaSource = typeof mappedArea === "number" ? "NSW property-data workflow" : typeof clientArea === "number" ? "Client supplied" : "Not available";
    const areaStatement: EvidenceStatement | null = area === null ? null : {
      text: `Recorded land area: ${area.toLocaleString("en-AU")} m². Area source: ${areaSource}. Boundary status: ${boundaryStatus}.`,
      statementType: typeof mappedArea === "number" ? "verified_official_fact" : "client_supplied_statement",
      sourceId: typeof mappedArea === "number" ? "NSW-PROPERTY-DATA" : "CLIENT-PROPERTY-INPUT",
      sourceType: typeof mappedArea === "number" ? "official_property_data" : "client_statement",
      sourceStatus: typeof mappedArea === "number" ? "official_verified" : "client_supplied",
      issueOrRetrievalDate: typeof mappedArea === "number" ? new Date().toISOString() : null,
      verificationState: typeof mappedArea === "number" ? "mapped_not_surveyed" : "not_verified",
      professionalReviewRequired: rawBoundaryStatus !== "survey_confirmed",
    };
    const section: GeneratedSection = {
      code: input.code,
      heading: input.heading,
      summary: boundarySection
        ? `Property area and boundary status — ${area === null ? "area not available" : `${area.toLocaleString("en-AU")} m²`}; ${boundaryStatus}. ${rawBoundaryStatus === "survey_confirmed" ? "" : MAPPED_BOUNDARY_NOTICE}`.trim()
        : isMissing
        ? "External documents and professional investigations still required are listed without fabricating substitute evidence."
        : `Deterministic mock content for ${input.heading.toLowerCase()}, prepared from the confirmed order package.`,
      statements: areaStatement && boundarySection ? [areaStatement] : [missingEvidence(input.heading)],
      bullets: isLargeSite
        ? [
            "Development-zone breakdown and potential site-use areas",
            "Access, circulation and secondary-access considerations",
            "Servicing, vegetation, landscape and environmental investigations",
            "Staging, subdivision triggers and multiple-building considerations",
            "Expanded consultant requirements and risk analysis",
          ]
        : isMissing
        ? input.package.missingDocuments.map((document) => `${document}: obtain from the relevant authority or qualified professional before relying on the affected conclusion.`)
        : ["This local test section demonstrates the report workflow.", "No unverified planning control has been asserted as fact."],
      status: resolveCoverage({
        hasOfficialSource,
        supportingDocuments: documents,
        frcAnalysisGenerated: true,
        professionalReviewRequired,
        missingExternalDocument: isMissing,
        conflictDetected: input.package.sourceConflicts.length > 0,
      }),
    };
    return section;
  }

  async validateSection(input: { section: GeneratedSection }) {
    const issues: string[] = [];
    for (const statement of input.section.statements) {
      if (!statement.sourceId || !statement.sourceStatus || !statement.verificationState) {
        issues.push(`Statement in ${input.section.code} lacks required provenance.`);
      }
      if (statement.statementType === "verified_official_fact" && statement.sourceStatus !== "official_verified") {
        issues.push(`Unsupported official fact in ${input.section.code}.`);
      }
    }
    return { valid: issues.length === 0, issues };
  }

  async synthesiseReport(input: {
    package: FrcReportGenerationInputV1;
    sections: GeneratedSection[];
    reportId: string;
    clientName: string;
  }): Promise<StructuredPlanningReport> {
    const now = new Date().toISOString();
    const pendingReview = input.package.order.professionalReviewRequired;
    return {
      schemaVersion: "FRC_REPORT_SCHEMA_V1",
      templateId: input.package.outputTemplateId,
      templateVersion: "FRC_REPORT_TEMPLATE_2026_01",
      reportId: input.reportId,
      orderId: input.package.order.id,
      reportStatus: pendingReview ? "professional_verification_pending" : "preliminary_ai_assisted",
      title: pendingReview ? "FRC planning report — professional verification pending" : "Preliminary AI-assisted property-planning report",
      propertyReference: String(input.package.propertyIdentity.clientSuppliedAddress ?? "Property reference withheld"),
      clientName: input.clientName,
      pricingVersion: input.package.order.frozenPriceSnapshot.pricingVersion,
      generatedAt: now,
      lastRevisedAt: now,
      confidentialityNotice: "Private and confidential — prepared for the named client and FRC review workflow.",
      watermark: pendingReview
        ? "Preliminary draft — professional verification pending"
        : "Preliminary AI-assisted report — not professionally verified",
      sections: input.sections,
      documentRegister: input.package.uploadedDocumentRegister.map((document) => ({
        document: DOCUMENT_CATEGORY_BY_CODE.get(document.category)?.label ?? document.category,
        author: document.author ?? "Not supplied",
        date: document.issueDate ?? "Not supplied",
        revision: document.revision ?? "Not supplied",
        pages: document.pageCount ?? "Not detected",
        sourceStatus: "Client supplied",
        reliedUpon: false,
        limitations: document.malwareScanStatus === "clean" ? "Automated extraction remains subject to validation." : "Production malware scan not completed; test-mode fixture only.",
        reviewNotes: document.automatedInterpretationEligible ? "Eligible for configured extraction." : "Manual review only; PDF export required for automated interpretation.",
      })),
      planningControlMatrix: [],
      riskRegister: input.package.sourceConflicts.map((conflict) => ({
        risk: "Source conflict",
        evidence: JSON.stringify(conflict),
        severity: "Requires review",
        possibleConsequence: "A conclusion may be unreliable until resolved.",
        requiredAction: "FRC reviewer to reconcile the conflicting evidence.",
        responsibleParty: "FRC reviewer",
        status: "Open",
      })),
      actionPlan: input.package.missingDocuments.map((document, index) => ({
        priority: index + 1,
        action: `Obtain ${document}`,
        whyRequired: "External evidence cannot be generated by the report AI.",
        responsibleParty: "Client / issuing authority / qualified consultant",
        dependency: "Affected report conclusion",
        targetStage: "Before reliance or council submission",
        status: "Open",
      })),
      optionComparison: input.package.order.selectedScope.map((selection) => ({
        option: DEVELOPMENT_ITEM_BY_CODE.get(selection.code)?.name ?? selection.code,
        primaryBenefit: "Project-specific assessment included",
        mainConstraint: "Subject to verified controls and documents",
        approvalComplexity: "Not verified",
        informationRequired: "See missing documents and investigations",
        preliminaryRiskLevel: "Requires review",
        recommendedNextAction: "Complete evidence review",
      })),
      limitations: input.package.reportLimitations,
    };
  }
}

export class UnconfiguredReportAiProvider implements ReportAiProvider {
  readonly name = "unconfigured";
  private fail(): never {
    throw new Error("The live report AI provider is not configured.");
  }
  async generateSection(): Promise<GeneratedSection> { return this.fail(); }
  async validateSection(): Promise<ValidationResult> { return this.fail(); }
  async synthesiseReport(): Promise<StructuredPlanningReport> { return this.fail(); }
}

export function getReportAiProvider(): ReportAiProvider {
  if ((process.env.REPORT_AI_PROVIDER ?? "mock") === "mock" && process.env.REPORT_AI_ENABLED !== "true") {
    return new MockReportAiProvider();
  }
  return new UnconfiguredReportAiProvider();
}
