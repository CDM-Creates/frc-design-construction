import { index, integer, real, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const projects = sqliteTable("projects", {
  id: text("id").primaryKey(),
  clientName: text("client_name").notNull().default(""),
  clientEmail: text("client_email").notNull().default(""),
  propertyAddress: text("property_address").notNull().default(""),
  propertySuburb: text("property_suburb").notNull().default(""),
  status: text("status").notNull().default("draft"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const projectInputs = sqliteTable("project_inputs", {
  id: text("id").primaryKey(),
  projectId: text("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  version: integer("version").notNull().default(1),
  payloadJson: text("payload_json").notNull(),
  createdAt: text("created_at").notNull(),
});

export const simulationJobs = sqliteTable("simulation_jobs", {
  id: text("id").primaryKey(),
  projectId: text("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  status: text("status").notNull().default("queued"),
  errorMessage: text("error_message"),
  createdAt: text("created_at").notNull(),
  startedAt: text("started_at"),
  completedAt: text("completed_at"),
});

export const aiTasks = sqliteTable("ai_tasks", {
  id: text("id").primaryKey(),
  jobId: text("job_id").notNull().references(() => simulationJobs.id, { onDelete: "cascade" }),
  taskType: text("task_type").notNull(),
  provider: text("provider").notNull(),
  model: text("model").notNull(),
  status: text("status").notNull(),
  errorMessage: text("error_message"),
  createdAt: text("created_at").notNull(),
  completedAt: text("completed_at"),
});

export const aiOutputs = sqliteTable("ai_outputs", {
  id: text("id").primaryKey(),
  taskId: text("task_id").notNull().references(() => aiTasks.id, { onDelete: "cascade" }),
  outputJson: text("output_json").notNull(),
  createdAt: text("created_at").notNull(),
});

export const generatedImages = sqliteTable("generated_images", {
  id: text("id").primaryKey(),
  jobId: text("job_id").notNull().references(() => simulationJobs.id, { onDelete: "cascade" }),
  imageKey: text("image_key").notNull(),
  title: text("title").notNull(),
  category: text("category").notNull(),
  provider: text("provider").notNull(),
  model: text("model").notNull(),
  originalPrompt: text("original_prompt").notNull(),
  status: text("status").notNull(),
  imageUrl: text("image_url"),
  errorMessage: text("error_message"),
  createdAt: text("created_at").notNull(),
});

export const finalReports = sqliteTable("final_reports", {
  id: text("id").primaryKey(),
  jobId: text("job_id").notNull().references(() => simulationJobs.id, { onDelete: "cascade" }),
  reportJson: text("report_json").notNull(),
  createdAt: text("created_at").notNull(),
});

export const siteCapacityPackages = sqliteTable("site_capacity_packages", {
  id: text("id").primaryKey(),
  jobId: text("job_id").notNull().references(() => simulationJobs.id, { onDelete: "cascade" }),
  calculatorVersion: integer("calculator_version").notNull().default(2),
  calculationStatus: text("calculation_status").notNull(),
  packageJson: text("package_json").notNull(),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
}, (table) => [uniqueIndex("site_capacity_packages_job_id_unique").on(table.jobId)]);

export const architectOverrides = sqliteTable("architect_overrides", {
  id: text("id").primaryKey(),
  jobId: text("job_id").notNull().references(() => simulationJobs.id, { onDelete: "cascade" }),
  field: text("field").notNull(),
  originalMappedValueJson: text("original_mapped_value_json"),
  originalClientValueJson: text("original_client_value_json"),
  architectEnteredValueJson: text("architect_entered_value_json").notNull(),
  selectedValueJson: text("selected_value_json").notNull(),
  sourceDocument: text("source_document"),
  editor: text("editor").notNull(),
  reason: text("reason").notNull(),
  verified: integer("verified", { mode: "boolean" }).notNull().default(false),
  createdAt: text("created_at").notNull(),
}, (table) => [index("architect_overrides_job_id_idx").on(table.jobId)]);

export const uploadedDocuments = sqliteTable("uploaded_documents", {
  id: text("id").primaryKey(),
  projectId: text("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  category: text("category").notNull(),
  filename: text("filename").notNull(),
  mimeType: text("mime_type").notNull(),
  sizeBytes: integer("size_bytes").notNull(),
  storageKey: text("storage_key"),
  createdAt: text("created_at").notNull(),
});

export const architectReviewRequests = sqliteTable("architect_review_requests", {
  id: text("id").primaryKey(),
  jobId: text("job_id").notNull().references(() => simulationJobs.id, { onDelete: "cascade" }),
  status: text("status").notNull().default("requested"),
  clientMessage: text("client_message").notNull().default(""),
  createdAt: text("created_at").notNull(),
});

export const planningSimulationRequests = sqliteTable("planning_simulation_requests", {
  id: text("id").primaryKey(),
  userId: text("user_id"),
  status: text("status").notNull().default("draft"),
  clientRole: text("client_role").notNull(),
  assessmentMode: text("assessment_mode").notNull(),
  reportType: text("report_type").notNull(),
  priorityRequested: integer("priority_requested", { mode: "boolean" }).notNull().default(false),
  quoteRequired: integer("quote_required", { mode: "boolean" }).notNull().default(false),
  quoteStatus: text("quote_status").notNull().default("not_requested"),
  quotedTotalAud: integer("quoted_total_aud"),
  pricingVersion: text("pricing_version").notNull(),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const planningProperties = sqliteTable("planning_properties", {
  id: text("id").primaryKey(),
  simulationRequestId: text("simulation_request_id").notNull().references(() => planningSimulationRequests.id, { onDelete: "cascade" }),
  clientSuppliedAddress: text("client_supplied_address").notNull(),
  officialFormattedAddress: text("official_formatted_address"),
  officialAddressId: text("official_address_id"),
  latitude: real("latitude"),
  longitude: real("longitude"),
  lot: text("lot"),
  dp: text("dp"),
  parcelId: text("parcel_id"),
  localGovernmentArea: text("local_government_area"),
  suburb: text("suburb"),
  postcode: text("postcode"),
  clientSuppliedLandAreaSqm: real("client_supplied_land_area_sqm"),
  mappedParcelAreaSqm: real("mapped_parcel_area_sqm"),
  surveyAreaSqm: real("survey_area_sqm"),
  adoptedAssessmentAreaSqm: real("adopted_assessment_area_sqm"),
  adoptedAreaSource: text("adopted_area_source"),
  parcelGeometryJson: text("parcel_geometry_json"),
  verificationStatus: text("verification_status").notNull().default("not_verified"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
}, (table) => [index("planning_properties_request_idx").on(table.simulationRequestId)]);

export const developmentItemSelections = sqliteTable("development_item_selections", {
  id: text("id").primaryKey(),
  simulationRequestId: text("simulation_request_id").notNull().references(() => planningSimulationRequests.id, { onDelete: "cascade" }),
  itemCode: text("item_code").notNull(),
  itemName: text("item_name").notNull(),
  category: text("category").notNull(),
  pricingType: text("pricing_type").notNull(),
  selectedDetailsJson: text("selected_details_json").notNull().default("[]"),
  selectionOrder: integer("selection_order").notNull(),
  isIncludedItem: integer("is_included_item", { mode: "boolean" }).notNull().default(false),
  calculatedChargeAud: integer("calculated_charge_aud").notNull().default(0),
  quoteReason: text("quote_reason"),
}, (table) => [index("development_items_request_idx").on(table.simulationRequestId)]);

export const planningSourceRegistry = sqliteTable("planning_source_registry", {
  id: text("id").primaryKey(),
  sourceKey: text("source_key").notNull(),
  sourceName: text("source_name").notNull(),
  sourceCategory: text("source_category").notNull(),
  authorityName: text("authority_name").notNull(),
  councilId: text("council_id"),
  publicUrl: text("public_url").notNull(),
  serviceUrl: text("service_url"),
  serviceType: text("service_type").notNull(),
  authenticationType: text("authentication_type").notNull().default("none"),
  environmentVariableName: text("environment_variable_name"),
  dataFormat: text("data_format"),
  isOfficial: integer("is_official", { mode: "boolean" }).notNull().default(true),
  isPaid: integer("is_paid", { mode: "boolean" }).notNull().default(false),
  requiresClientDocument: integer("requires_client_document", { mode: "boolean" }).notNull().default(false),
  isEnabled: integer("is_enabled", { mode: "boolean" }).notNull().default(false),
  integrationStatus: text("integration_status").notNull().default("not_connected"),
  lastVerifiedAt: text("last_verified_at"),
  effectiveFrom: text("effective_from"),
  effectiveTo: text("effective_to"),
  notes: text("notes"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
}, (table) => [uniqueIndex("planning_source_registry_key_unique").on(table.sourceKey)]);

export const propertySourceFetches = sqliteTable("property_source_fetches", {
  id: text("id").primaryKey(),
  simulationRequestId: text("simulation_request_id").notNull().references(() => planningSimulationRequests.id, { onDelete: "cascade" }),
  propertyId: text("property_id").notNull().references(() => planningProperties.id, { onDelete: "cascade" }),
  sourceRegistryId: text("source_registry_id").references(() => planningSourceRegistry.id),
  requestStatus: text("request_status").notNull(),
  requestedAt: text("requested_at").notNull(),
  completedAt: text("completed_at"),
  rawResponseJson: text("raw_response_json"),
  errorCode: text("error_code"),
  errorMessage: text("error_message"),
  responseHash: text("response_hash"),
  providerReference: text("provider_reference"),
}, (table) => [index("property_source_fetches_property_idx").on(table.propertyId)]);

export const planningFacts = sqliteTable("planning_facts", {
  id: text("id").primaryKey(),
  propertyId: text("property_id").notNull().references(() => planningProperties.id, { onDelete: "cascade" }),
  factKey: text("fact_key").notNull(),
  displayName: text("display_name").notNull(),
  valueText: text("value_text"),
  valueNumber: real("value_number"),
  valueBoolean: integer("value_boolean", { mode: "boolean" }),
  valueJson: text("value_json"),
  unit: text("unit"),
  sourceFetchId: text("source_fetch_id").references(() => propertySourceFetches.id),
  sourceName: text("source_name").notNull(),
  sourceUrl: text("source_url"),
  sourceType: text("source_type").notNull(),
  retrievedAt: text("retrieved_at").notNull(),
  effectiveDate: text("effective_date"),
  verificationStatus: text("verification_status").notNull(),
  confidenceStatus: text("confidence_status").notNull(),
  professionalReviewRequired: integer("professional_review_required", { mode: "boolean" }).notNull().default(true),
  originalValueJson: text("original_value_json"),
  notes: text("notes"),
}, (table) => [index("planning_facts_property_idx").on(table.propertyId)]);

export const planningEnvironmentalConstraints = sqliteTable("planning_environmental_constraints", {
  id: text("id").primaryKey(),
  propertyId: text("property_id").notNull().references(() => planningProperties.id, { onDelete: "cascade" }),
  constraintType: text("constraint_type").notNull(),
  mappedStatus: text("mapped_status").notNull(),
  severity: text("severity").notNull(),
  sourceFetchId: text("source_fetch_id").references(() => propertySourceFetches.id),
  verified: integer("verified", { mode: "boolean" }).notNull().default(false),
  quoteTriggered: integer("quote_triggered", { mode: "boolean" }).notNull().default(false),
  notes: text("notes"),
}, (table) => [index("planning_constraints_property_idx").on(table.propertyId)]);

export const planningProjectDocuments = sqliteTable("planning_project_documents", {
  id: text("id").primaryKey(),
  simulationRequestId: text("simulation_request_id").notNull().references(() => planningSimulationRequests.id, { onDelete: "cascade" }),
  propertyId: text("property_id").references(() => planningProperties.id),
  documentType: text("document_type").notNull(),
  storageReference: text("storage_reference"),
  originalFileName: text("original_file_name"),
  documentStatus: text("document_status").notNull(),
  documentDate: text("document_date"),
  expiryDate: text("expiry_date"),
  uploadedBy: text("uploaded_by"),
  sourceType: text("source_type").notNull(),
  verificationStatus: text("verification_status").notNull(),
  createdAt: text("created_at").notNull(),
}, (table) => [index("planning_documents_request_idx").on(table.simulationRequestId)]);

export const planningPricingResults = sqliteTable("planning_pricing_results", {
  id: text("id").primaryKey(),
  simulationRequestId: text("simulation_request_id").notNull().references(() => planningSimulationRequests.id, { onDelete: "cascade" }),
  basePriceAud: integer("base_price_aud").notNull(),
  standardItemCount: integer("standard_item_count").notNull(),
  additionalItemCount: integer("additional_item_count").notNull(),
  additionalItemsTotalAud: integer("additional_items_total_aud").notNull(),
  addonChargesJson: text("addon_charges_json").notNull(),
  quoteRequired: integer("quote_required", { mode: "boolean" }).notNull(),
  quoteReasonsJson: text("quote_reasons_json").notNull(),
  totalAud: integer("total_aud"),
  pricingVersion: text("pricing_version").notNull(),
  calculatedAt: text("calculated_at").notNull(),
}, (table) => [index("planning_pricing_request_idx").on(table.simulationRequestId)]);

export const planningReportDataPacks = sqliteTable("planning_report_data_packs", {
  id: text("id").primaryKey(),
  simulationRequestId: text("simulation_request_id").notNull().references(() => planningSimulationRequests.id, { onDelete: "cascade" }),
  dataVersion: integer("data_version").notNull().default(1),
  structuredPayloadJson: text("structured_payload_json").notNull(),
  missingInformationJson: text("missing_information_json").notNull(),
  sourceRegisterJson: text("source_register_json").notNull(),
  readyForAi: integer("ready_for_ai", { mode: "boolean" }).notNull().default(false),
  readyForProfessionalReview: integer("ready_for_professional_review", { mode: "boolean" }).notNull().default(false),
  architectApprovedAt: text("architect_approved_at"),
  clientReleasedAt: text("client_released_at"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
}, (table) => [index("planning_report_pack_request_idx").on(table.simulationRequestId)]);

export const reportOrders = sqliteTable("report_orders", {
  id: text("id").primaryKey(),
  ownerHash: text("owner_hash").notNull(),
  status: text("status").notNull().default("draft"),
  isTest: integer("is_test", { mode: "boolean" }).notNull().default(false),
  clientJson: text("client_json").notNull().default("{}"),
  propertyJson: text("property_json").notNull().default("{}"),
  scopeJson: text("scope_json").notNull().default("{}"),
  reportType: text("report_type").notNull(),
  priceSnapshotJson: text("price_snapshot_json"),
  pricingVersion: text("pricing_version"),
  currency: text("currency").notNull().default("AUD"),
  taxTreatment: text("tax_treatment").notNull(),
  consentsJson: text("consents_json").notNull().default("[]"),
  paymentStatus: text("payment_status").notNull().default("not_started"),
  professionalReviewRequired: integer("professional_review_required", { mode: "boolean" }).notNull().default(false),
  priority: integer("priority", { mode: "boolean" }).notNull().default(false),
  tailoredQuote: integer("tailored_quote", { mode: "boolean" }).notNull().default(false),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
}, (table) => [
  index("report_orders_status_created_idx").on(table.status, table.createdAt),
  index("report_orders_payment_status_idx").on(table.paymentStatus),
]);

export const reportOrderEvents = sqliteTable("report_order_events", {
  id: text("id").primaryKey(),
  orderId: text("order_id").notNull().references(() => reportOrders.id, { onDelete: "cascade" }),
  eventType: text("event_type").notNull(),
  actor: text("actor").notNull(),
  metadataJson: text("metadata_json").notNull().default("{}"),
  createdAt: text("created_at").notNull(),
}, (table) => [index("report_order_events_order_idx").on(table.orderId, table.createdAt)]);

export const reportDocuments = sqliteTable("report_documents", {
  id: text("id").primaryKey(),
  orderId: text("order_id").notNull().references(() => reportOrders.id, { onDelete: "cascade" }),
  clientOwnerReference: text("client_owner_reference"),
  storageReference: text("storage_reference").notNull(),
  originalFilename: text("original_filename").notNull(),
  safeFilename: text("safe_filename").notNull(),
  mimeType: text("mime_type").notNull(),
  byteSize: integer("byte_size").notNull(),
  pageCount: integer("page_count"),
  sha256: text("sha256").notNull(),
  category: text("category").notNull(),
  author: text("author"),
  issueDate: text("issue_date"),
  revision: text("revision"),
  clientNote: text("client_note"),
  uploadedAt: text("uploaded_at").notNull(),
  status: text("status").notNull(),
  extractionProvider: text("extraction_provider"),
  extractionModel: text("extraction_model"),
  extractionSchemaVersion: text("extraction_schema_version"),
  extractedFactsJson: text("extracted_facts_json").notNull().default("[]"),
  sourceCitationsJson: text("source_citations_json").notNull().default("[]"),
  detectedConflictsJson: text("detected_conflicts_json").notNull().default("[]"),
  professionalReviewStatus: text("professional_review_status").notNull().default("not_required"),
  supersededDocumentId: text("superseded_document_id"),
  malwareScanStatus: text("malware_scan_status").notNull().default("not_scanned"),
  automatedInterpretationEligible: integer("automated_interpretation_eligible", { mode: "boolean" }).notNull().default(true),
}, (table) => [
  index("report_documents_order_category_idx").on(table.orderId, table.category),
  index("report_documents_sha256_idx").on(table.sha256),
]);

export const reportPaymentEvents = sqliteTable("report_payment_events", {
  providerEventId: text("provider_event_id").primaryKey(),
  orderId: text("order_id").notNull().references(() => reportOrders.id, { onDelete: "cascade" }),
  provider: text("provider").notNull(),
  eventType: text("event_type").notNull(),
  verified: integer("verified", { mode: "boolean" }).notNull().default(false),
  safeMetadataJson: text("safe_metadata_json").notNull().default("{}"),
  processingStatus: text("processing_status").notNull(),
  idempotencyKey: text("idempotency_key").notNull(),
  createdAt: text("created_at").notNull(),
}, (table) => [
  uniqueIndex("report_payment_events_idempotency_unique").on(table.idempotencyKey),
  index("report_payment_events_order_idx").on(table.orderId),
]);

export const reportJobs = sqliteTable("report_jobs", {
  id: text("id").primaryKey(),
  orderId: text("order_id").notNull().references(() => reportOrders.id, { onDelete: "cascade" }),
  status: text("status").notNull(),
  progressStage: text("progress_stage").notNull(),
  aiProvider: text("ai_provider").notNull(),
  templateId: text("template_id").notNull(),
  promptVersion: text("prompt_version").notNull(),
  schemaVersion: text("schema_version").notNull(),
  generationAttempt: integer("generation_attempt").notNull().default(1),
  failureReason: text("failure_reason"),
  reviewRequired: integer("review_required", { mode: "boolean" }).notNull().default(false),
  createdAt: text("created_at").notNull(),
  startedAt: text("started_at"),
  completedAt: text("completed_at"),
}, (table) => [
  index("report_jobs_order_status_idx").on(table.orderId, table.status),
  index("report_jobs_review_queue_idx").on(table.reviewRequired, table.status, table.createdAt),
]);

export const reportSections = sqliteTable("report_sections", {
  id: text("id").primaryKey(),
  jobId: text("job_id").notNull().references(() => reportJobs.id, { onDelete: "cascade" }),
  sectionCode: text("section_code").notNull(),
  generationStatus: text("generation_status").notNull(),
  structuredContentJson: text("structured_content_json").notNull(),
  sourceCitationsJson: text("source_citations_json").notNull().default("[]"),
  validationResultJson: text("validation_result_json").notNull().default("{}"),
  professionalReviewStatus: text("professional_review_status").notNull().default("not_required"),
  revisionNumber: integer("revision_number").notNull().default(1),
}, (table) => [
  uniqueIndex("report_sections_job_code_revision_unique").on(table.jobId, table.sectionCode, table.revisionNumber),
]);

export const finalPlanningReports = sqliteTable("final_planning_reports", {
  id: text("id").primaryKey(),
  orderId: text("order_id").notNull().references(() => reportOrders.id, { onDelete: "cascade" }),
  jobId: text("job_id").notNull().references(() => reportJobs.id, { onDelete: "cascade" }),
  accessHash: text("access_hash").notNull(),
  structuredReportJson: text("structured_report_json").notNull(),
  htmlReference: text("html_reference").notNull(),
  pdfReference: text("pdf_reference"),
  status: text("status").notNull(),
  reviewerRecordJson: text("reviewer_record_json"),
  releasedAt: text("released_at"),
  version: integer("version").notNull().default(1),
}, (table) => [
  index("final_planning_reports_order_idx").on(table.orderId),
  uniqueIndex("final_planning_reports_job_version_unique").on(table.jobId, table.version),
]);

export const reportNotifications = sqliteTable("report_notifications", {
  id: text("id").primaryKey(),
  orderId: text("order_id").notNull().references(() => reportOrders.id, { onDelete: "cascade" }),
  type: text("type").notNull(),
  recipient: text("recipient").notNull(),
  subject: text("subject").notNull(),
  status: text("status").notNull(),
  providerReference: text("provider_reference"),
  retryCount: integer("retry_count").notNull().default(0),
  failureReason: text("failure_reason"),
  createdAt: text("created_at").notNull(),
  sentAt: text("sent_at"),
}, (table) => [
  index("report_notifications_order_status_idx").on(table.orderId, table.status),
]);

export const reportCustomerProfiles = sqliteTable("report_customer_profiles", {
  id: text("id").primaryKey(),
  orderId: text("order_id").notNull().references(() => reportOrders.id, { onDelete: "cascade" }),
  customerType: text("customer_type").notNull(),
  decisionObjective: text("decision_objective").notNull(),
  fullName: text("full_name").notNull(),
  email: text("email").notNull(),
  phone: text("phone"),
  smsConsent: integer("sms_consent", { mode: "boolean" }).notNull().default(false),
  communicationConsentJson: text("communication_consent_json").notNull().default("{}"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
}, (table) => [
  uniqueIndex("report_customer_profiles_order_unique").on(table.orderId),
  index("report_customer_profiles_email_idx").on(table.email),
]);

export const reportSelections = sqliteTable("report_selections", {
  id: text("id").primaryKey(),
  orderId: text("order_id").notNull().references(() => reportOrders.id, { onDelete: "cascade" }),
  reportCatalogueId: text("report_catalogue_id").notNull(),
  templateId: text("template_id").notNull(),
  selectedStatus: text("selected_status").notNull(),
  fullPriceCents: integer("full_price_cents"),
  sharedCreditCents: integer("shared_credit_cents").notNull().default(0),
  finalReportPriceCents: integer("final_report_price_cents"),
  requiredInputStatus: text("required_input_status").notNull().default("pending"),
  selectionOrder: integer("selection_order").notNull(),
  createdAt: text("created_at").notNull(),
}, (table) => [
  uniqueIndex("report_selections_order_catalogue_unique").on(table.orderId, table.reportCatalogueId),
  index("report_selections_order_idx").on(table.orderId, table.selectionOrder),
]);

export const propertyBoundaryRecords = sqliteTable("property_boundary_records", {
  id: text("id").primaryKey(),
  orderId: text("order_id").notNull().references(() => reportOrders.id, { onDelete: "cascade" }),
  propertyId: text("property_id").notNull(),
  address: text("address").notNull(),
  lot: text("lot"),
  depositedPlan: text("deposited_plan"),
  localGovernmentArea: text("local_government_area"),
  areaSqm: real("area_sqm"),
  areaSource: text("area_source").notNull(),
  areaStatus: text("area_status").notNull(),
  parcelCount: integer("parcel_count").notNull().default(1),
  geometryReference: text("geometry_reference"),
  geometrySource: text("geometry_source"),
  geometryStatus: text("geometry_status").notNull(),
  registeredSurveySupplied: integer("registered_survey_supplied", { mode: "boolean" }).notNull().default(false),
  exactDimensionsAvailable: integer("exact_dimensions_available", { mode: "boolean" }).notNull().default(false),
  retrievedAt: text("retrieved_at"),
  conflictStatus: text("conflict_status").notNull().default("none"),
  ruralOrNonStandard: integer("rural_or_non_standard", { mode: "boolean" }).notNull().default(false),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
}, (table) => [
  uniqueIndex("property_boundary_records_order_property_unique").on(table.orderId, table.propertyId),
  index("property_boundary_records_status_idx").on(table.areaStatus, table.geometryStatus),
]);

export const reportReferenceMaterials = sqliteTable("report_reference_materials", {
  id: text("id").primaryKey(),
  orderId: text("order_id").notNull().references(() => reportOrders.id, { onDelete: "cascade" }),
  reportSelectionId: text("report_selection_id").notNull().references(() => reportSelections.id, { onDelete: "cascade" }),
  propertyId: text("property_id").notNull(),
  originalUrl: text("original_url"),
  storageReference: text("storage_reference"),
  title: text("title"),
  supplierOrDesigner: text("supplier_or_designer"),
  modelName: text("model_name"),
  whatClientLikes: text("what_client_likes"),
  exactModelIntended: integer("exact_model_intended", { mode: "boolean" }).notNull().default(false),
  approximateFloorAreaSqm: real("approximate_floor_area_sqm"),
  bedroomCount: integer("bedroom_count"),
  storeyCount: integer("storey_count"),
  preferredFeaturesJson: text("preferred_features_json").notNull().default("[]"),
  clientNotes: text("client_notes"),
  writtenBrief: text("written_brief"),
  extractedMetadataJson: text("extracted_metadata_json").notNull().default("{}"),
  accessStatus: text("access_status").notNull().default("pending"),
  accessedAt: text("accessed_at"),
  copyrightNotice: text("copyright_notice").notNull(),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
}, (table) => [
  index("report_reference_materials_selection_idx").on(table.reportSelectionId),
  index("report_reference_materials_order_idx").on(table.orderId),
]);

export const reportPromptRuns = sqliteTable("report_prompt_runs", {
  id: text("id").primaryKey(),
  jobId: text("job_id").notNull().references(() => reportJobs.id, { onDelete: "cascade" }),
  promptId: text("prompt_id").notNull(),
  promptVersion: text("prompt_version").notNull(),
  templateId: text("template_id").notNull(),
  provider: text("provider").notNull(),
  model: text("model").notNull(),
  validationResultJson: text("validation_result_json").notNull().default("{}"),
  runAt: text("run_at").notNull(),
}, (table) => [
  index("report_prompt_runs_job_idx").on(table.jobId, table.runAt),
]);

export const architecturalVisualisations = sqliteTable("architectural_visualisations", {
  id: text("id").primaryKey(),
  orderId: text("order_id").notNull().references(() => reportOrders.id, { onDelete: "cascade" }),
  reportId: text("report_id").notNull(),
  jobId: text("job_id").notNull().references(() => reportJobs.id, { onDelete: "cascade" }),
  visualisationType: text("visualisation_type").notNull(),
  provider: text("provider").notNull(),
  model: text("model").notNull(),
  promptVersion: text("prompt_version").notNull(),
  sourceInputsJson: text("source_inputs_json").notNull(),
  outputStorageReference: text("output_storage_reference"),
  width: integer("width"),
  height: integer("height"),
  status: text("status").notNull(),
  validationResultJson: text("validation_result_json").notNull().default("{}"),
  professionalReviewStatus: text("professional_review_status").notNull().default("not_required"),
  disclaimer: text("disclaimer").notNull(),
  caption: text("caption").notNull(),
  legendJson: text("legend_json").notNull().default("[]"),
  sourceConfidenceJson: text("source_confidence_json").notNull().default("{}"),
  revision: integer("revision").notNull().default(1),
  failureReason: text("failure_reason"),
  generatedAt: text("generated_at"),
}, (table) => [
  index("architectural_visualisations_report_status_idx").on(table.reportId, table.status),
  index("architectural_visualisations_job_idx").on(table.jobId),
]);

export const reportPacks = sqliteTable("report_packs", {
  id: text("id").primaryKey(),
  orderId: text("order_id").notNull().references(() => reportOrders.id, { onDelete: "cascade" }),
  zipStorageReference: text("zip_storage_reference"),
  manifestJson: text("manifest_json").notNull().default("{}"),
  generationStatus: text("generation_status").notNull().default("queued"),
  fileCount: integer("file_count").notNull().default(0),
  byteSize: integer("byte_size").notNull().default(0),
  accessHash: text("access_hash"),
  createdAt: text("created_at").notNull(),
  expiresAt: text("expires_at"),
  downloadCount: integer("download_count").notNull().default(0),
  lastDownloadedAt: text("last_downloaded_at"),
}, (table) => [
  index("report_packs_order_status_idx").on(table.orderId, table.generationStatus),
  index("report_packs_expiry_idx").on(table.expiresAt),
]);

export const reportDisputes = sqliteTable("report_disputes", {
  id: text("id").primaryKey(),
  orderId: text("order_id").notNull().references(() => reportOrders.id, { onDelete: "cascade" }),
  reportId: text("report_id").notNull(),
  disputedSectionCode: text("disputed_section_code").notNull(),
  entitlementType: text("entitlement_type").notNull(),
  clientExplanation: text("client_explanation").notNull(),
  supportingStorageReference: text("supporting_storage_reference"),
  status: text("status").notNull().default("submitted"),
  assignedReviewer: text("assigned_reviewer"),
  outcome: text("outcome"),
  correctionRecordJson: text("correction_record_json"),
  createdAt: text("created_at").notNull(),
  completedAt: text("completed_at"),
}, (table) => [
  index("report_disputes_report_status_idx").on(table.reportId, table.status),
  index("report_disputes_order_idx").on(table.orderId),
]);
