import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

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
