import type { DocumentRecord, StructuredReportSection } from "./types";

export type CoverageStatus = StructuredReportSection["status"];

export function resolveCoverage(input: {
  hasOfficialSource: boolean;
  supportingDocuments: DocumentRecord[];
  frcAnalysisGenerated: boolean;
  professionalReviewRequired: boolean;
  missingExternalDocument: boolean;
  conflictDetected: boolean;
}): CoverageStatus {
  if (input.conflictDetected) return "conflict_detected";
  if (input.missingExternalDocument) return "missing_external_document";
  if (input.professionalReviewRequired) return "requires_professional_review";
  if (input.supportingDocuments.length > 0) return "supported_by_client_upload";
  if (input.hasOfficialSource) return "supported_by_official_source";
  if (input.frcAnalysisGenerated) return "generated_frc_analysis";
  return "unavailable";
}
