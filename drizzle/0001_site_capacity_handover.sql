CREATE TABLE `site_capacity_packages` (
  `id` text PRIMARY KEY NOT NULL,
  `job_id` text NOT NULL,
  `calculator_version` integer DEFAULT 2 NOT NULL,
  `calculation_status` text NOT NULL,
  `package_json` text NOT NULL,
  `created_at` text NOT NULL,
  `updated_at` text NOT NULL,
  FOREIGN KEY (`job_id`) REFERENCES `simulation_jobs`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `architect_overrides` (
  `id` text PRIMARY KEY NOT NULL,
  `job_id` text NOT NULL,
  `field` text NOT NULL,
  `original_mapped_value_json` text,
  `original_client_value_json` text,
  `architect_entered_value_json` text NOT NULL,
  `selected_value_json` text NOT NULL,
  `source_document` text,
  `editor` text NOT NULL,
  `reason` text NOT NULL,
  `verified` integer DEFAULT false NOT NULL,
  `created_at` text NOT NULL,
  FOREIGN KEY (`job_id`) REFERENCES `simulation_jobs`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `site_capacity_packages_job_id_unique` ON `site_capacity_packages` (`job_id`);
--> statement-breakpoint
CREATE INDEX `architect_overrides_job_id_idx` ON `architect_overrides` (`job_id`);
