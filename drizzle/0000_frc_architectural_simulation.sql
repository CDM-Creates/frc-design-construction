CREATE TABLE `projects` (
  `id` text PRIMARY KEY NOT NULL,
  `client_name` text DEFAULT '' NOT NULL,
  `client_email` text DEFAULT '' NOT NULL,
  `property_address` text DEFAULT '' NOT NULL,
  `property_suburb` text DEFAULT '' NOT NULL,
  `status` text DEFAULT 'draft' NOT NULL,
  `created_at` text NOT NULL,
  `updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `project_inputs` (
  `id` text PRIMARY KEY NOT NULL,
  `project_id` text NOT NULL,
  `version` integer DEFAULT 1 NOT NULL,
  `payload_json` text NOT NULL,
  `created_at` text NOT NULL,
  FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `simulation_jobs` (
  `id` text PRIMARY KEY NOT NULL,
  `project_id` text NOT NULL,
  `status` text DEFAULT 'queued' NOT NULL,
  `error_message` text,
  `created_at` text NOT NULL,
  `started_at` text,
  `completed_at` text,
  FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `ai_tasks` (
  `id` text PRIMARY KEY NOT NULL,
  `job_id` text NOT NULL,
  `task_type` text NOT NULL,
  `provider` text NOT NULL,
  `model` text NOT NULL,
  `status` text NOT NULL,
  `error_message` text,
  `created_at` text NOT NULL,
  `completed_at` text,
  FOREIGN KEY (`job_id`) REFERENCES `simulation_jobs`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `ai_outputs` (
  `id` text PRIMARY KEY NOT NULL,
  `task_id` text NOT NULL,
  `output_json` text NOT NULL,
  `created_at` text NOT NULL,
  FOREIGN KEY (`task_id`) REFERENCES `ai_tasks`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `generated_images` (
  `id` text PRIMARY KEY NOT NULL,
  `job_id` text NOT NULL,
  `image_key` text NOT NULL,
  `title` text NOT NULL,
  `category` text NOT NULL,
  `provider` text NOT NULL,
  `model` text NOT NULL,
  `original_prompt` text NOT NULL,
  `status` text NOT NULL,
  `image_url` text,
  `error_message` text,
  `created_at` text NOT NULL,
  FOREIGN KEY (`job_id`) REFERENCES `simulation_jobs`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `final_reports` (
  `id` text PRIMARY KEY NOT NULL,
  `job_id` text NOT NULL,
  `report_json` text NOT NULL,
  `created_at` text NOT NULL,
  FOREIGN KEY (`job_id`) REFERENCES `simulation_jobs`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `uploaded_documents` (
  `id` text PRIMARY KEY NOT NULL,
  `project_id` text NOT NULL,
  `category` text NOT NULL,
  `filename` text NOT NULL,
  `mime_type` text NOT NULL,
  `size_bytes` integer NOT NULL,
  `storage_key` text,
  `created_at` text NOT NULL,
  FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `architect_review_requests` (
  `id` text PRIMARY KEY NOT NULL,
  `job_id` text NOT NULL,
  `status` text DEFAULT 'requested' NOT NULL,
  `client_message` text DEFAULT '' NOT NULL,
  `created_at` text NOT NULL,
  FOREIGN KEY (`job_id`) REFERENCES `simulation_jobs`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `project_inputs_project_id_idx` ON `project_inputs` (`project_id`);
--> statement-breakpoint
CREATE INDEX `simulation_jobs_project_id_idx` ON `simulation_jobs` (`project_id`);
--> statement-breakpoint
CREATE INDEX `ai_tasks_job_id_idx` ON `ai_tasks` (`job_id`);
--> statement-breakpoint
CREATE INDEX `generated_images_job_id_idx` ON `generated_images` (`job_id`);
--> statement-breakpoint
CREATE INDEX `final_reports_job_id_idx` ON `final_reports` (`job_id`);
