/**
 * Minimal production schema for the paid-report workflow.
 *
 * The application applies these idempotent statements automatically when a
 * Supabase connection is first opened. They are intentionally kept beside the
 * repository so the business owner never has to paste SQL into a dashboard.
 */
export const SUPABASE_REPORT_SCHEMA_STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS report_orders (
    id TEXT PRIMARY KEY, owner_hash TEXT NOT NULL, status TEXT NOT NULL,
    is_test INTEGER NOT NULL DEFAULT 1, client_json TEXT NOT NULL,
    property_json TEXT NOT NULL, scope_json TEXT NOT NULL, report_type TEXT NOT NULL,
    price_snapshot_json TEXT, pricing_version TEXT, currency TEXT NOT NULL,
    tax_treatment TEXT NOT NULL, consents_json TEXT NOT NULL, payment_status TEXT NOT NULL,
    professional_review_required INTEGER NOT NULL DEFAULT 0,
    priority INTEGER NOT NULL DEFAULT 0, tailored_quote INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL, updated_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS report_order_events (
    id TEXT PRIMARY KEY, order_id TEXT NOT NULL REFERENCES report_orders(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL, actor TEXT NOT NULL, metadata_json TEXT NOT NULL,
    created_at TEXT NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS report_order_events_order_idx ON report_order_events(order_id)`,
  `CREATE TABLE IF NOT EXISTS report_documents (
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
  )`,
  `CREATE INDEX IF NOT EXISTS report_documents_order_category_idx ON report_documents(order_id, category)`,
  `CREATE TABLE IF NOT EXISTS report_payment_events (
    provider_event_id TEXT PRIMARY KEY, order_id TEXT NOT NULL REFERENCES report_orders(id) ON DELETE CASCADE,
    provider TEXT NOT NULL, event_type TEXT NOT NULL, verified INTEGER NOT NULL,
    safe_metadata_json TEXT NOT NULL, processing_status TEXT NOT NULL,
    idempotency_key TEXT NOT NULL UNIQUE, created_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS report_jobs (
    id TEXT PRIMARY KEY, order_id TEXT NOT NULL REFERENCES report_orders(id) ON DELETE CASCADE,
    status TEXT NOT NULL, progress_stage TEXT NOT NULL, ai_provider TEXT NOT NULL,
    template_id TEXT NOT NULL, prompt_version TEXT NOT NULL, schema_version TEXT NOT NULL,
    generation_attempt INTEGER NOT NULL, failure_reason TEXT, review_required INTEGER NOT NULL,
    created_at TEXT NOT NULL, started_at TEXT, completed_at TEXT
  )`,
  `CREATE INDEX IF NOT EXISTS report_jobs_order_status_idx ON report_jobs(order_id, status)`,
  `CREATE TABLE IF NOT EXISTS report_sections (
    id TEXT PRIMARY KEY, job_id TEXT NOT NULL REFERENCES report_jobs(id) ON DELETE CASCADE,
    section_code TEXT NOT NULL, generation_status TEXT NOT NULL,
    structured_content_json TEXT NOT NULL, source_citations_json TEXT NOT NULL,
    validation_result_json TEXT NOT NULL, professional_review_status TEXT NOT NULL,
    revision_number INTEGER NOT NULL
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS report_sections_job_code_revision_unique ON report_sections(job_id, section_code, revision_number)`,
  `CREATE TABLE IF NOT EXISTS final_planning_reports (
    id TEXT PRIMARY KEY, order_id TEXT NOT NULL REFERENCES report_orders(id) ON DELETE CASCADE,
    job_id TEXT NOT NULL REFERENCES report_jobs(id) ON DELETE CASCADE, access_hash TEXT NOT NULL,
    structured_report_json TEXT NOT NULL, html_reference TEXT NOT NULL,
    pdf_reference TEXT, status TEXT NOT NULL, reviewer_record_json TEXT,
    released_at TEXT, version INTEGER NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS final_planning_reports_order_idx ON final_planning_reports(order_id)`,
  `CREATE TABLE IF NOT EXISTS report_notifications (
    id TEXT PRIMARY KEY, order_id TEXT NOT NULL REFERENCES report_orders(id) ON DELETE CASCADE,
    type TEXT NOT NULL, recipient TEXT NOT NULL, subject TEXT NOT NULL, status TEXT NOT NULL,
    provider_reference TEXT, retry_count INTEGER NOT NULL, failure_reason TEXT,
    created_at TEXT NOT NULL, sent_at TEXT
  )`,
  `CREATE INDEX IF NOT EXISTS report_notifications_order_type_idx ON report_notifications(order_id, type)`,
  `CREATE TABLE IF NOT EXISTS report_disputes (
    id TEXT PRIMARY KEY, order_id TEXT NOT NULL REFERENCES report_orders(id) ON DELETE CASCADE,
    report_id TEXT NOT NULL, disputed_section_code TEXT NOT NULL,
    entitlement_type TEXT NOT NULL, client_explanation TEXT NOT NULL,
    supporting_storage_reference TEXT, status TEXT NOT NULL,
    assigned_reviewer TEXT, outcome TEXT, correction_record_json TEXT,
    created_at TEXT NOT NULL, completed_at TEXT
  )`,
  `CREATE INDEX IF NOT EXISTS report_disputes_report_status_idx ON report_disputes(report_id, status)`,
] as const;
