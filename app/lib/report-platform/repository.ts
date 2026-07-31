import { getPlatformMode } from "./config";
import { assertOrderTransition } from "./status-transitions";
import type { ReportDispute } from "./disputes";
import type {
  DocumentRecord,
  FinalReportRecord,
  NotificationRecord,
  OrderEvent,
  OrderStatus,
  PaymentEventRecord,
  ReportJob,
  ReportOrder,
  StructuredReportSection,
} from "./types";

type SqlStatement = {
  run(...values: unknown[]): unknown | Promise<unknown>;
  get(...values: unknown[]): unknown | Promise<unknown>;
  all(...values: unknown[]): unknown[] | Promise<unknown[]>;
};

type SqlDatabase = {
  exec(sql: string): void;
  prepare(sql: string): SqlStatement;
};

export interface ReportPlatformRepository {
  createDraftOrder(ownerHash: string): Promise<ReportOrder>;
  getOrder(orderId: string): Promise<ReportOrder | null>;
  saveOrder(order: ReportOrder): Promise<void>;
  transitionOrder(orderId: string, to: OrderStatus, actor: string, metadata?: Record<string, unknown>): Promise<ReportOrder>;
  addOrderEvent(event: OrderEvent): Promise<void>;
  listOrderEvents(orderId: string): Promise<OrderEvent[]>;
  addDocument(document: DocumentRecord): Promise<void>;
  saveDocument(document: DocumentRecord): Promise<void>;
  getDocument(documentId: string): Promise<DocumentRecord | null>;
  listDocuments(orderId: string): Promise<DocumentRecord[]>;
  deleteDocument(documentId: string): Promise<void>;
  addPaymentEvent(event: PaymentEventRecord): Promise<"created" | "duplicate">;
  createReportJob(job: ReportJob): Promise<void>;
  saveReportJob(job: ReportJob): Promise<void>;
  getReportJob(jobId: string): Promise<ReportJob | null>;
  listReportJobs(orderId: string): Promise<ReportJob[]>;
  saveReportSections(jobId: string, sections: StructuredReportSection[]): Promise<void>;
  getReportSections(jobId: string): Promise<StructuredReportSection[]>;
  saveFinalReport(report: FinalReportRecord): Promise<void>;
  getFinalReportByJob(jobId: string): Promise<FinalReportRecord | null>;
  getFinalReport(reportId: string): Promise<FinalReportRecord | null>;
  addNotification(notification: NotificationRecord): Promise<void>;
  hasNotification(orderId: string, type: string): Promise<boolean>;
  createDispute(dispute: ReportDispute): Promise<void>;
  getDispute(disputeId: string): Promise<ReportDispute | null>;
  listDisputes(orderId: string): Promise<ReportDispute[]>;
  listReviewQueue(): Promise<Array<{ order: ReportOrder; job: ReportJob; report: FinalReportRecord | null }>>;
}

const parse = <T>(value: unknown, fallback: T): T => {
  if (typeof value !== "string") return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
};

type Row = Record<string, unknown>;

function rowToOrder(row: Row): ReportOrder {
  return {
    id: String(row.id),
    ownerHash: String(row.owner_hash),
    status: String(row.status) as ReportOrder["status"],
    isTest: Number(row.is_test) === 1,
    client: parse(row.client_json, { name: "", email: "", phone: "", role: "" }),
    property: parse(row.property_json, {}),
    scope: parse(row.scope_json, {
      assessmentMode: "single",
      selectedItems: [],
      availableDocumentCategories: [],
      pricingInput: null,
      notes: "",
    }),
    reportType: String(row.report_type) as ReportOrder["reportType"],
    priceSnapshot: parse(row.price_snapshot_json, null),
    pricingVersion: row.pricing_version ? String(row.pricing_version) : null,
    currency: "AUD",
    taxTreatment: String(row.tax_treatment),
    consents: parse(row.consents_json, []),
    paymentStatus: String(row.payment_status) as ReportOrder["paymentStatus"],
    professionalReviewRequired: Number(row.professional_review_required) === 1,
    priority: Number(row.priority) === 1,
    tailoredQuote: Number(row.tailored_quote) === 1,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

function rowToDocument(row: Row): DocumentRecord {
  return {
    id: String(row.id),
    orderId: String(row.order_id),
    storageReference: String(row.storage_reference),
    originalFilename: String(row.original_filename),
    safeFilename: String(row.safe_filename),
    mimeType: String(row.mime_type),
    byteSize: Number(row.byte_size),
    pageCount: row.page_count === null ? null : Number(row.page_count),
    sha256: String(row.sha256),
    category: String(row.category) as DocumentRecord["category"],
    author: row.author ? String(row.author) : null,
    issueDate: row.issue_date ? String(row.issue_date) : null,
    revision: row.revision ? String(row.revision) : null,
    clientNote: row.client_note ? String(row.client_note) : null,
    uploadedAt: String(row.uploaded_at),
    status: String(row.status) as DocumentRecord["status"],
    extractionProvider: row.extraction_provider ? String(row.extraction_provider) : null,
    extractionModel: row.extraction_model ? String(row.extraction_model) : null,
    extractionSchemaVersion: row.extraction_schema_version ? String(row.extraction_schema_version) : null,
    extractedFacts: parse(row.extracted_facts_json, []),
    sourceCitations: parse(row.source_citations_json, []),
    detectedConflicts: parse(row.detected_conflicts_json, []),
    professionalReviewStatus: String(row.professional_review_status) as DocumentRecord["professionalReviewStatus"],
    supersededDocumentId: row.superseded_document_id ? String(row.superseded_document_id) : null,
    malwareScanStatus: String(row.malware_scan_status) as DocumentRecord["malwareScanStatus"],
    automatedInterpretationEligible: Number(row.automated_interpretation_eligible) === 1,
  };
}

function rowToJob(row: Row): ReportJob {
  return {
    id: String(row.id),
    orderId: String(row.order_id),
    status: String(row.status) as ReportJob["status"],
    progressStage: String(row.progress_stage),
    aiProvider: String(row.ai_provider),
    templateId: String(row.template_id),
    promptVersion: String(row.prompt_version),
    schemaVersion: String(row.schema_version),
    generationAttempt: Number(row.generation_attempt),
    failureReason: row.failure_reason ? String(row.failure_reason) : null,
    reviewRequired: Number(row.review_required) === 1,
    createdAt: String(row.created_at),
    startedAt: row.started_at ? String(row.started_at) : null,
    completedAt: row.completed_at ? String(row.completed_at) : null,
  };
}

function rowToFinalReport(row: Row): FinalReportRecord {
  return {
    id: String(row.id),
    orderId: String(row.order_id),
    jobId: String(row.job_id),
    accessHash: String(row.access_hash),
    structuredReport: parse(row.structured_report_json, null as never),
    htmlReference: String(row.html_reference),
    pdfReference: row.pdf_reference ? String(row.pdf_reference) : null,
    status: String(row.status) as FinalReportRecord["status"],
    reviewerRecord: parse(row.reviewer_record_json, null),
    releasedAt: row.released_at ? String(row.released_at) : null,
    version: Number(row.version),
  };
}

function rowToDispute(row: Row): ReportDispute {
  return {
    id: String(row.id),
    orderId: String(row.order_id),
    reportId: String(row.report_id),
    disputedSectionCode: String(row.disputed_section_code),
    entitlementType: String(row.entitlement_type) as ReportDispute["entitlementType"],
    clientExplanation: String(row.client_explanation),
    supportingStorageReference: row.supporting_storage_reference ? String(row.supporting_storage_reference) : null,
    status: String(row.status) as ReportDispute["status"],
    assignedReviewer: row.assigned_reviewer ? String(row.assigned_reviewer) : null,
    outcome: row.outcome ? String(row.outcome) : null,
    correctionRecord: parse(row.correction_record_json, null),
    createdAt: String(row.created_at),
    completedAt: row.completed_at ? String(row.completed_at) : null,
  };
}

class LocalSqliteReportPlatformRepository implements ReportPlatformRepository {
  constructor(private readonly db: SqlDatabase) {}

  async createDraftOrder(ownerHash: string) {
    const now = new Date().toISOString();
    const order: ReportOrder = {
      id: crypto.randomUUID(),
      ownerHash,
      status: "draft",
      isTest: getPlatformMode() === "test",
      client: { name: "", email: "", phone: "", role: "" },
      property: {},
      scope: { assessmentMode: "single", selectedItems: [], availableDocumentCategories: [], pricingInput: null, notes: "" },
      reportType: "preliminary_ai_assisted",
      priceSnapshot: null,
      pricingVersion: null,
      currency: "AUD",
      taxTreatment: "unconfigured_test_only",
      consents: [],
      paymentStatus: "not_started",
      professionalReviewRequired: false,
      priority: false,
      tailoredQuote: false,
      createdAt: now,
      updatedAt: now,
    };
    await this.saveOrder(order);
    await this.addOrderEvent({ id: crypto.randomUUID(), orderId: order.id, eventType: "draft_created", actor: "client", metadata: { testMode: true }, createdAt: now });
    return order;
  }

  async getOrder(orderId: string) {
    const row = await this.db.prepare("SELECT * FROM report_orders WHERE id = ?").get(orderId) as Row | undefined;
    return row ? rowToOrder(row) : null;
  }

  async saveOrder(order: ReportOrder) {
    await this.db.prepare(`
      INSERT INTO report_orders (
        id, owner_hash, status, is_test, client_json, property_json, scope_json,
        report_type, price_snapshot_json, pricing_version, currency, tax_treatment,
        consents_json, payment_status, professional_review_required, priority,
        tailored_quote, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        status=excluded.status, client_json=excluded.client_json,
        property_json=excluded.property_json, scope_json=excluded.scope_json,
        report_type=excluded.report_type, price_snapshot_json=excluded.price_snapshot_json,
        pricing_version=excluded.pricing_version, tax_treatment=excluded.tax_treatment,
        consents_json=excluded.consents_json, payment_status=excluded.payment_status,
        professional_review_required=excluded.professional_review_required,
        priority=excluded.priority, tailored_quote=excluded.tailored_quote,
        updated_at=excluded.updated_at
    `).run(
      order.id, order.ownerHash, order.status, order.isTest ? 1 : 0,
      JSON.stringify(order.client), JSON.stringify(order.property), JSON.stringify(order.scope),
      order.reportType, order.priceSnapshot ? JSON.stringify(order.priceSnapshot) : null,
      order.pricingVersion, order.currency, order.taxTreatment, JSON.stringify(order.consents),
      order.paymentStatus, order.professionalReviewRequired ? 1 : 0, order.priority ? 1 : 0,
      order.tailoredQuote ? 1 : 0, order.createdAt, order.updatedAt,
    );
  }

  async transitionOrder(orderId: string, to: OrderStatus, actor: string, metadata: Record<string, unknown> = {}) {
    const order = await this.getOrder(orderId);
    if (!order) throw new Error("Order not found.");
    assertOrderTransition(order.status, to);
    const from = order.status;
    order.status = to;
    order.updatedAt = new Date().toISOString();
    await this.saveOrder(order);
    await this.addOrderEvent({ id: crypto.randomUUID(), orderId, eventType: "status_changed", actor, metadata: { from, to, ...metadata }, createdAt: order.updatedAt });
    return order;
  }

  async addOrderEvent(event: OrderEvent) {
    await this.db.prepare("INSERT INTO report_order_events (id, order_id, event_type, actor, metadata_json, created_at) VALUES (?, ?, ?, ?, ?, ?)")
      .run(event.id, event.orderId, event.eventType, event.actor, JSON.stringify(event.metadata), event.createdAt);
  }

  async listOrderEvents(orderId: string) {
    return (await this.db.prepare("SELECT * FROM report_order_events WHERE order_id = ? ORDER BY created_at ASC").all(orderId)).map((row) => {
      const value = row as Row;
      return { id: String(value.id), orderId: String(value.order_id), eventType: String(value.event_type), actor: String(value.actor), metadata: parse(value.metadata_json, {}), createdAt: String(value.created_at) };
    });
  }

  async addDocument(document: DocumentRecord) {
    await this.db.prepare(`
      INSERT INTO report_documents (
        id, order_id, storage_reference, original_filename, safe_filename, mime_type,
        byte_size, page_count, sha256, category, author, issue_date, revision, client_note,
        uploaded_at, status, extraction_provider, extraction_model, extraction_schema_version,
        extracted_facts_json, source_citations_json, detected_conflicts_json,
        professional_review_status, superseded_document_id, malware_scan_status,
        automated_interpretation_eligible
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      document.id, document.orderId, document.storageReference, document.originalFilename,
      document.safeFilename, document.mimeType, document.byteSize, document.pageCount,
      document.sha256, document.category, document.author, document.issueDate,
      document.revision, document.clientNote, document.uploadedAt, document.status,
      document.extractionProvider, document.extractionModel, document.extractionSchemaVersion,
      JSON.stringify(document.extractedFacts), JSON.stringify(document.sourceCitations),
      JSON.stringify(document.detectedConflicts), document.professionalReviewStatus,
      document.supersededDocumentId, document.malwareScanStatus,
      document.automatedInterpretationEligible ? 1 : 0,
    );
  }

  async saveDocument(document: DocumentRecord) {
    await this.db.prepare(`
      UPDATE report_documents SET page_count=?, status=?, extraction_provider=?,
        extraction_model=?, extraction_schema_version=?, extracted_facts_json=?,
        source_citations_json=?, detected_conflicts_json=?, professional_review_status=?,
        superseded_document_id=?, malware_scan_status=?,
        automated_interpretation_eligible=? WHERE id=?
    `).run(
      document.pageCount, document.status, document.extractionProvider,
      document.extractionModel, document.extractionSchemaVersion,
      JSON.stringify(document.extractedFacts), JSON.stringify(document.sourceCitations),
      JSON.stringify(document.detectedConflicts), document.professionalReviewStatus,
      document.supersededDocumentId, document.malwareScanStatus,
      document.automatedInterpretationEligible ? 1 : 0, document.id,
    );
  }

  async getDocument(documentId: string) {
    const row = await this.db.prepare("SELECT * FROM report_documents WHERE id = ?").get(documentId) as Row | undefined;
    return row ? rowToDocument(row) : null;
  }

  async listDocuments(orderId: string) {
    return (await this.db.prepare("SELECT * FROM report_documents WHERE order_id = ? ORDER BY uploaded_at ASC").all(orderId)).map((row) => rowToDocument(row as Row));
  }

  async deleteDocument(documentId: string) {
    await this.db.prepare("DELETE FROM report_documents WHERE id = ?").run(documentId);
  }

  async addPaymentEvent(event: PaymentEventRecord) {
    const existing = await this.db.prepare("SELECT provider_event_id FROM report_payment_events WHERE provider_event_id = ?").get(event.providerEventId);
    if (existing) return "duplicate";
    await this.db.prepare(`
      INSERT INTO report_payment_events (
        provider_event_id, order_id, provider, event_type, verified, safe_metadata_json,
        processing_status, idempotency_key, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      event.providerEventId, event.orderId, event.provider, event.eventType,
      event.verified ? 1 : 0, JSON.stringify(event.safeMetadata), event.processingStatus,
      event.idempotencyKey, event.createdAt,
    );
    return "created";
  }

  async createReportJob(job: ReportJob) {
    await this.db.prepare(`
      INSERT INTO report_jobs (
        id, order_id, status, progress_stage, ai_provider, template_id, prompt_version,
        schema_version, generation_attempt, failure_reason, review_required, created_at,
        started_at, completed_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      job.id, job.orderId, job.status, job.progressStage, job.aiProvider, job.templateId,
      job.promptVersion, job.schemaVersion, job.generationAttempt, job.failureReason,
      job.reviewRequired ? 1 : 0, job.createdAt, job.startedAt, job.completedAt,
    );
  }

  async saveReportJob(job: ReportJob) {
    await this.db.prepare(`
      UPDATE report_jobs SET status=?, progress_stage=?, ai_provider=?, template_id=?,
        prompt_version=?, schema_version=?, generation_attempt=?, failure_reason=?,
        review_required=?, started_at=?, completed_at=? WHERE id=?
    `).run(
      job.status, job.progressStage, job.aiProvider, job.templateId, job.promptVersion,
      job.schemaVersion, job.generationAttempt, job.failureReason, job.reviewRequired ? 1 : 0,
      job.startedAt, job.completedAt, job.id,
    );
  }

  async getReportJob(jobId: string) {
    const row = await this.db.prepare("SELECT * FROM report_jobs WHERE id = ?").get(jobId) as Row | undefined;
    return row ? rowToJob(row) : null;
  }

  async listReportJobs(orderId: string) {
    return (await this.db.prepare("SELECT * FROM report_jobs WHERE order_id = ? ORDER BY created_at DESC").all(orderId)).map((row) => rowToJob(row as Row));
  }

  async saveReportSections(jobId: string, sections: StructuredReportSection[]) {
    await this.db.prepare("DELETE FROM report_sections WHERE job_id = ?").run(jobId);
    const statement = this.db.prepare(`
      INSERT INTO report_sections (
        id, job_id, section_code, generation_status, structured_content_json,
        source_citations_json, validation_result_json, professional_review_status,
        revision_number
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    for (const section of sections) {
      await statement.run(
        crypto.randomUUID(), jobId, section.code, "complete", JSON.stringify(section),
        JSON.stringify(section.statements.map((item) => item.sourceId)),
        JSON.stringify({ valid: true, schemaVersion: "FRC_REPORT_SCHEMA_V2" }),
        section.status === "requires_professional_review" ? "pending" : "not_required", 1,
      );
    }
  }

  async getReportSections(jobId: string) {
    return (await this.db.prepare("SELECT structured_content_json FROM report_sections WHERE job_id = ? ORDER BY rowid ASC").all(jobId))
      .map((row) => parse((row as Row).structured_content_json, null as StructuredReportSection | null))
      .filter((section): section is StructuredReportSection => Boolean(section));
  }

  async saveFinalReport(report: FinalReportRecord) {
    await this.db.prepare(`
      INSERT INTO final_planning_reports (
        id, order_id, job_id, access_hash, structured_report_json, html_reference, pdf_reference,
        status, reviewer_record_json, released_at, version
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET access_hash=excluded.access_hash,
        structured_report_json=excluded.structured_report_json,
        html_reference=excluded.html_reference, pdf_reference=excluded.pdf_reference,
        status=excluded.status, reviewer_record_json=excluded.reviewer_record_json,
        released_at=excluded.released_at, version=excluded.version
    `).run(
      report.id, report.orderId, report.jobId, report.accessHash, JSON.stringify(report.structuredReport),
      report.htmlReference, report.pdfReference, report.status,
      report.reviewerRecord ? JSON.stringify(report.reviewerRecord) : null,
      report.releasedAt, report.version,
    );
  }

  async getFinalReportByJob(jobId: string) {
    const row = await this.db.prepare("SELECT * FROM final_planning_reports WHERE job_id = ? ORDER BY version DESC LIMIT 1").get(jobId) as Row | undefined;
    return row ? rowToFinalReport(row) : null;
  }

  async getFinalReport(reportId: string) {
    const row = await this.db.prepare("SELECT * FROM final_planning_reports WHERE id = ?").get(reportId) as Row | undefined;
    return row ? rowToFinalReport(row) : null;
  }

  async addNotification(notification: NotificationRecord) {
    await this.db.prepare(`
      INSERT INTO report_notifications (
        id, order_id, type, recipient, subject, status, provider_reference,
        retry_count, failure_reason, created_at, sent_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      notification.id, notification.orderId, notification.type, notification.recipient,
      notification.subject, notification.status, notification.providerReference,
      notification.retryCount, notification.failureReason, notification.createdAt,
      notification.sentAt,
    );
  }

  async hasNotification(orderId: string, type: string) {
    return Boolean(await this.db.prepare("SELECT id FROM report_notifications WHERE order_id = ? AND type = ? AND status IN ('sent', 'mock_logged') LIMIT 1").get(orderId, type));
  }

  async createDispute(dispute: ReportDispute) {
    await this.db.prepare(`
      INSERT INTO report_disputes (
        id, order_id, report_id, disputed_section_code, entitlement_type,
        client_explanation, supporting_storage_reference, status, assigned_reviewer,
        outcome, correction_record_json, created_at, completed_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      dispute.id, dispute.orderId, dispute.reportId, dispute.disputedSectionCode,
      dispute.entitlementType, dispute.clientExplanation, dispute.supportingStorageReference,
      dispute.status, dispute.assignedReviewer, dispute.outcome,
      dispute.correctionRecord ? JSON.stringify(dispute.correctionRecord) : null,
      dispute.createdAt, dispute.completedAt,
    );
  }

  async getDispute(disputeId: string) {
    const row = await this.db.prepare("SELECT * FROM report_disputes WHERE id = ?").get(disputeId) as Row | undefined;
    if (!row) return null;
    return rowToDispute(row);
  }

  async listDisputes(orderId: string) {
    const rows = await this.db.prepare("SELECT * FROM report_disputes WHERE order_id = ? ORDER BY created_at ASC").all(orderId);
    return (rows as Row[]).map(rowToDispute);
  }

  async listReviewQueue() {
    const jobs = await this.db.prepare("SELECT * FROM report_jobs WHERE review_required = 1 AND status IN ('awaiting_professional_review', 'changes_requested') ORDER BY created_at ASC").all();
    const result: Array<{ order: ReportOrder; job: ReportJob; report: FinalReportRecord | null }> = [];
    for (const row of jobs) {
      const job = rowToJob(row as Row);
      const order = await this.getOrder(job.orderId);
      if (order) result.push({ order, job, report: await this.getFinalReportByJob(job.id) });
    }
    return result;
  }
}

let repositoryPromise: Promise<ReportPlatformRepository> | null = null;

type D1BoundStatement = {
  run(): Promise<unknown>;
  first<T = Row>(): Promise<T | null>;
  all<T = Row>(): Promise<{ results: T[] }>;
};

type D1PreparedStatementLike = {
  bind(...values: unknown[]): D1BoundStatement;
};

type D1DatabaseLike = {
  prepare(sql: string): D1PreparedStatementLike;
};

class D1SqlStatement implements SqlStatement {
  constructor(private readonly statement: D1PreparedStatementLike) {}

  run(...values: unknown[]) {
    return this.statement.bind(...values).run();
  }

  async get(...values: unknown[]) {
    return (await this.statement.bind(...values).first<Row>()) ?? undefined;
  }

  async all(...values: unknown[]) {
    return (await this.statement.bind(...values).all<Row>()).results;
  }
}

class D1SqlDatabase implements SqlDatabase {
  constructor(private readonly database: D1DatabaseLike) {}

  exec() {
    throw new Error("Use prepared D1 statements for runtime database access.");
  }

  prepare(sql: string) {
    return new D1SqlStatement(this.database.prepare(sql));
  }
}

async function initialiseLocalRepository(): Promise<ReportPlatformRepository> {
  const [{ DatabaseSync }, fs, path] = await Promise.all([
    import("node:sqlite"),
    import("node:fs"),
    import("node:path"),
  ]);
  const root = process.env.FRC_LOCAL_DATA_DIR || path.join(process.cwd(), ".frc-local");
  fs.mkdirSync(root, { recursive: true });
  const db = new DatabaseSync(path.join(root, "report-platform.sqlite")) as unknown as SqlDatabase;
  db.exec("PRAGMA foreign_keys = ON");
  db.exec(`
    CREATE TABLE IF NOT EXISTS report_orders (
      id TEXT PRIMARY KEY, owner_hash TEXT NOT NULL, status TEXT NOT NULL,
      is_test INTEGER NOT NULL DEFAULT 1, client_json TEXT NOT NULL,
      property_json TEXT NOT NULL, scope_json TEXT NOT NULL, report_type TEXT NOT NULL,
      price_snapshot_json TEXT, pricing_version TEXT, currency TEXT NOT NULL,
      tax_treatment TEXT NOT NULL, consents_json TEXT NOT NULL, payment_status TEXT NOT NULL,
      professional_review_required INTEGER NOT NULL DEFAULT 0,
      priority INTEGER NOT NULL DEFAULT 0, tailored_quote INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL, updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS report_order_events (
      id TEXT PRIMARY KEY, order_id TEXT NOT NULL REFERENCES report_orders(id) ON DELETE CASCADE,
      event_type TEXT NOT NULL, actor TEXT NOT NULL, metadata_json TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS report_order_events_order_idx ON report_order_events(order_id);
    CREATE TABLE IF NOT EXISTS report_documents (
      id TEXT PRIMARY KEY, order_id TEXT NOT NULL REFERENCES report_orders(id) ON DELETE CASCADE,
      storage_reference TEXT NOT NULL, original_filename TEXT NOT NULL,
      safe_filename TEXT NOT NULL, mime_type TEXT NOT NULL, byte_size INTEGER NOT NULL,
      page_count INTEGER, sha256 TEXT NOT NULL, category TEXT NOT NULL, author TEXT,
      issue_date TEXT, revision TEXT, client_note TEXT, uploaded_at TEXT NOT NULL,
      status TEXT NOT NULL, extraction_provider TEXT, extraction_model TEXT,
      extraction_schema_version TEXT, extracted_facts_json TEXT NOT NULL,
      source_citations_json TEXT NOT NULL, detected_conflicts_json TEXT NOT NULL,
      professional_review_status TEXT NOT NULL, superseded_document_id TEXT,
      malware_scan_status TEXT NOT NULL, automated_interpretation_eligible INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS report_documents_order_category_idx ON report_documents(order_id, category);
    CREATE TABLE IF NOT EXISTS report_payment_events (
      provider_event_id TEXT PRIMARY KEY, order_id TEXT NOT NULL REFERENCES report_orders(id) ON DELETE CASCADE,
      provider TEXT NOT NULL, event_type TEXT NOT NULL, verified INTEGER NOT NULL,
      safe_metadata_json TEXT NOT NULL, processing_status TEXT NOT NULL,
      idempotency_key TEXT NOT NULL UNIQUE, created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS report_jobs (
      id TEXT PRIMARY KEY, order_id TEXT NOT NULL REFERENCES report_orders(id) ON DELETE CASCADE,
      status TEXT NOT NULL, progress_stage TEXT NOT NULL, ai_provider TEXT NOT NULL,
      template_id TEXT NOT NULL, prompt_version TEXT NOT NULL, schema_version TEXT NOT NULL,
      generation_attempt INTEGER NOT NULL, failure_reason TEXT, review_required INTEGER NOT NULL,
      created_at TEXT NOT NULL, started_at TEXT, completed_at TEXT
    );
    CREATE INDEX IF NOT EXISTS report_jobs_order_status_idx ON report_jobs(order_id, status);
    CREATE TABLE IF NOT EXISTS report_sections (
      id TEXT PRIMARY KEY, job_id TEXT NOT NULL REFERENCES report_jobs(id) ON DELETE CASCADE,
      section_code TEXT NOT NULL, generation_status TEXT NOT NULL,
      structured_content_json TEXT NOT NULL, source_citations_json TEXT NOT NULL,
      validation_result_json TEXT NOT NULL, professional_review_status TEXT NOT NULL,
      revision_number INTEGER NOT NULL
    );
    CREATE UNIQUE INDEX IF NOT EXISTS report_sections_job_code_revision_unique ON report_sections(job_id, section_code, revision_number);
    CREATE TABLE IF NOT EXISTS final_planning_reports (
      id TEXT PRIMARY KEY, order_id TEXT NOT NULL REFERENCES report_orders(id) ON DELETE CASCADE,
      job_id TEXT NOT NULL REFERENCES report_jobs(id) ON DELETE CASCADE, access_hash TEXT NOT NULL,
      structured_report_json TEXT NOT NULL, html_reference TEXT NOT NULL,
      pdf_reference TEXT, status TEXT NOT NULL, reviewer_record_json TEXT,
      released_at TEXT, version INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS final_planning_reports_order_idx ON final_planning_reports(order_id);
    CREATE TABLE IF NOT EXISTS report_notifications (
      id TEXT PRIMARY KEY, order_id TEXT NOT NULL REFERENCES report_orders(id) ON DELETE CASCADE,
      type TEXT NOT NULL, recipient TEXT NOT NULL, subject TEXT NOT NULL, status TEXT NOT NULL,
      provider_reference TEXT, retry_count INTEGER NOT NULL, failure_reason TEXT,
      created_at TEXT NOT NULL, sent_at TEXT
    );
    CREATE INDEX IF NOT EXISTS report_notifications_order_type_idx ON report_notifications(order_id, type);
    CREATE TABLE IF NOT EXISTS report_disputes (
      id TEXT PRIMARY KEY, order_id TEXT NOT NULL REFERENCES report_orders(id) ON DELETE CASCADE,
      report_id TEXT NOT NULL, disputed_section_code TEXT NOT NULL,
      entitlement_type TEXT NOT NULL, client_explanation TEXT NOT NULL,
      supporting_storage_reference TEXT, status TEXT NOT NULL,
      assigned_reviewer TEXT, outcome TEXT, correction_record_json TEXT,
      created_at TEXT NOT NULL, completed_at TEXT
    );
    CREATE INDEX IF NOT EXISTS report_disputes_report_status_idx ON report_disputes(report_id, status);
  `);
  return new LocalSqliteReportPlatformRepository(db);
}

async function initialiseD1Repository(): Promise<ReportPlatformRepository> {
  const { env } = await import("cloudflare:workers");
  const database = (env as unknown as { DB?: D1DatabaseLike }).DB;
  if (!database) {
    throw new Error(
      "Cloudflare D1 binding `DB` is unavailable. Keep `.openai/hosting.json` configured with the `DB` binding.",
    );
  }
  return new LocalSqliteReportPlatformRepository(new D1SqlDatabase(database));
}

export async function getReportPlatformRepository() {
  repositoryPromise ??=
    getPlatformMode() === "test"
      ? initialiseLocalRepository()
      : initialiseD1Repository();
  return repositoryPromise;
}
