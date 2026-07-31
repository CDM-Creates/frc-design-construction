import type {
  DocumentCategoryCode,
  FrozenPriceSnapshot,
  PlanningPricingInput,
  SelectedDevelopmentItem,
} from "../planning-simulation/types";
import type {
  CustomerTypeId,
  DecisionObjectiveId,
  FrozenCataloguePriceSnapshot,
} from "./report-catalogue";

export const ORDER_STATUSES = [
  "draft",
  "awaiting_uploads",
  "ready_for_checkout",
  "awaiting_payment",
  "payment_processing",
  "paid",
  "queued",
  "securing_files",
  "analysing_property",
  "analysing_documents",
  "generating_report",
  "automated_validation",
  "awaiting_professional_review",
  "changes_requested",
  "approved_for_release",
  "completed",
  "failed",
  "cancelled",
  "payment_expired",
  "refunded",
  "partially_refunded",
  "tailored_quote_requested",
] as const;

export type OrderStatus = typeof ORDER_STATUSES[number];

export type DocumentStatus =
  | "not_supplied"
  | "selected_awaiting_upload"
  | "uploading"
  | "uploaded_unprocessed"
  | "processing"
  | "processed"
  | "failed"
  | "superseded"
  | "requires_professional_review"
  | "conflict_detected";

export type DocumentRecord = {
  id: string;
  orderId: string;
  storageReference: string;
  originalFilename: string;
  safeFilename: string;
  mimeType: string;
  byteSize: number;
  pageCount: number | null;
  sha256: string;
  category: DocumentCategoryCode;
  author: string | null;
  issueDate: string | null;
  revision: string | null;
  clientNote: string | null;
  uploadedAt: string;
  status: DocumentStatus;
  extractionProvider: string | null;
  extractionModel: string | null;
  extractionSchemaVersion: string | null;
  extractedFacts: unknown[];
  sourceCitations: unknown[];
  detectedConflicts: unknown[];
  professionalReviewStatus: "not_required" | "pending" | "approved" | "changes_requested";
  supersededDocumentId: string | null;
  malwareScanStatus: "not_scanned" | "pending" | "clean" | "rejected" | "unavailable";
  automatedInterpretationEligible: boolean;
};

export type ConsentRecord = {
  code: "preliminary_limitations" | "document_authority" | "secure_processing" | "professional_timeframe";
  textVersion: "FRC_CONSENT_2026_01";
  acceptedAt: string;
};

export type ReportOrder = {
  id: string;
  ownerHash: string;
  status: OrderStatus;
  isTest: boolean;
  client: {
    name: string;
    email: string;
    phone: string;
    role: string;
    customerType?: CustomerTypeId;
    decisionObjective?: DecisionObjectiveId;
    smsConsent?: boolean;
  };
  property: Record<string, unknown>;
  scope: {
    assessmentMode: string;
    selectedItems: SelectedDevelopmentItem[];
    availableDocumentCategories: DocumentCategoryCode[];
    pricingInput: PlanningPricingInput | null;
    notes: string;
    selectedReportIds?: string[];
    projectMotivation?: Record<string, unknown>;
    referenceMaterials?: Array<Record<string, unknown>>;
  };
  reportType: "preliminary_ai_assisted" | "frc_professionally_reviewed" | "council_readiness" | "tailored_quote";
  priceSnapshot: FrozenPriceSnapshot | FrozenCataloguePriceSnapshot | null;
  pricingVersion: string | null;
  currency: "AUD";
  taxTreatment: string;
  consents: ConsentRecord[];
  paymentStatus: "not_started" | "awaiting" | "paid" | "failed" | "expired" | "refunded" | "partially_refunded" | "not_applicable";
  professionalReviewRequired: boolean;
  priority: boolean;
  tailoredQuote: boolean;
  createdAt: string;
  updatedAt: string;
};

export type OrderEvent = {
  id: string;
  orderId: string;
  eventType: string;
  actor: string;
  metadata: Record<string, unknown>;
  createdAt: string;
};

export type PaymentEventRecord = {
  providerEventId: string;
  orderId: string;
  provider: string;
  eventType: string;
  verified: boolean;
  safeMetadata: Record<string, unknown>;
  processingStatus: string;
  idempotencyKey: string;
  createdAt: string;
};

export type ReportJob = {
  id: string;
  orderId: string;
  status: OrderStatus;
  progressStage: string;
  aiProvider: string;
  templateId: string;
  promptVersion: string;
  schemaVersion: string;
  generationAttempt: number;
  failureReason: string | null;
  reviewRequired: boolean;
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
};

export type EvidenceStatement = {
  text: string;
  statementType:
    | "verified_official_fact"
    | "client_supplied_statement"
    | "extracted_document_fact"
    | "ai_inference"
    | "professional_opinion"
    | "missing_information";
  sourceId: string;
  sourceType: string;
  sourceStatus: string;
  issueOrRetrievalDate: string | null;
  verificationState: string;
  professionalReviewRequired: boolean;
};

export type StructuredReportSection = {
  code: string;
  heading: string;
  summary: string;
  statements: EvidenceStatement[];
  bullets: string[];
  findings?: string[];
  evidence?: EvidenceStatement[];
  sourceCitations?: Array<{ sourceId: string; label: string; locator?: string }>;
  limitations?: string[];
  riskLevel?: "low" | "medium" | "high" | "critical" | "not_assessed";
  recommendations?: string[];
  requiredActions?: string[];
  extraSubsections?: Array<{
    code: string;
    title: string;
    summary: string;
    evidenceSourceIds: string[];
    preliminary: boolean;
  }>;
  status:
    | "supported_by_official_source"
    | "supported_by_client_upload"
    | "generated_frc_analysis"
    | "missing_external_document"
    | "requires_professional_review"
    | "unavailable"
    | "conflict_detected";
};

export type StructuredPlanningReport = {
  schemaVersion: "FRC_REPORT_SCHEMA_V1";
  templateId: string;
  templateVersion: string;
  reportId: string;
  orderId: string;
  reportStatus: "preliminary_ai_assisted" | "professional_verification_pending" | "frc_professionally_reviewed";
  title: string;
  propertyReference: string;
  clientName: string;
  pricingVersion: string;
  generatedAt: string;
  lastRevisedAt: string;
  confidentialityNotice: string;
  watermark: string;
  sections: StructuredReportSection[];
  documentRegister: Array<Record<string, unknown>>;
  planningControlMatrix: Array<Record<string, unknown>>;
  riskRegister: Array<Record<string, unknown>>;
  actionPlan: Array<Record<string, unknown>>;
  optionComparison: Array<Record<string, unknown>>;
  limitations: string[];
  visualisations?: ArchitecturalVisualisationRecord[];
};

export type VisualisationType =
  | "existing_site_explanation"
  | "client_motivation_concept"
  | "site_opportunity_concept"
  | "constraint_overlay"
  | "services_plumbing"
  | "access_circulation"
  | "privacy_neighbour_impact"
  | "options_comparison"
  | "before_after";

export type ArchitecturalVisualisationRecord = {
  id: string;
  orderId: string;
  reportId: string;
  jobId: string;
  visualisationType: VisualisationType;
  provider: string;
  model: string;
  promptVersion: string;
  sourceInputsUsed: string[];
  outputStorageReference: string | null;
  width: number | null;
  height: number | null;
  generatedAt: string | null;
  status: "queued" | "preparing_input" | "generating" | "validating" | "accepted" | "rejected" | "awaiting_professional_review" | "approved" | "failed";
  professionalReviewStatus: "not_required" | "pending" | "approved" | "changes_requested";
  disclaimer: string;
  caption: string;
  purpose: string;
  legend: Array<{ label: string; status: string; colour: string }>;
  sourceConfidence: Record<string, string>;
  revision: number;
  failureReason: string | null;
  validationIssues: string[];
  recommendedNextAction: string;
};

export type FinalReportRecord = {
  id: string;
  orderId: string;
  jobId: string;
  accessHash: string;
  structuredReport: StructuredPlanningReport;
  htmlReference: string;
  pdfReference: string | null;
  status: "draft" | "awaiting_review" | "released";
  reviewerRecord: Record<string, unknown> | null;
  releasedAt: string | null;
  version: number;
};

export type NotificationRecord = {
  id: string;
  orderId: string;
  type: string;
  recipient: string;
  subject: string;
  status: "queued" | "sent" | "failed" | "mock_logged";
  providerReference: string | null;
  retryCount: number;
  failureReason: string | null;
  createdAt: string;
  sentAt: string | null;
};

export type ReportJobStatusResponse = {
  job: ReportJob;
  order: Omit<ReportOrder, "ownerHash">;
  stages: Array<{ code: string; label: string; state: "complete" | "current" | "pending" | "blocked" | "failed" }>;
  visualStages?: Array<{ code: string; label: string; state: "complete" | "current" | "pending" | "blocked" | "failed" }>;
  missingDocuments: DocumentCategoryCode[];
  report: FinalReportRecord | null;
};
