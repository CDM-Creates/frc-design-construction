CREATE TABLE `architectural_visualisations` (
	`id` text PRIMARY KEY NOT NULL,
	`order_id` text NOT NULL,
	`report_id` text NOT NULL,
	`job_id` text NOT NULL,
	`visualisation_type` text NOT NULL,
	`provider` text NOT NULL,
	`model` text NOT NULL,
	`prompt_version` text NOT NULL,
	`source_inputs_json` text NOT NULL,
	`output_storage_reference` text,
	`width` integer,
	`height` integer,
	`status` text NOT NULL,
	`validation_result_json` text DEFAULT '{}' NOT NULL,
	`professional_review_status` text DEFAULT 'not_required' NOT NULL,
	`disclaimer` text NOT NULL,
	`caption` text NOT NULL,
	`legend_json` text DEFAULT '[]' NOT NULL,
	`source_confidence_json` text DEFAULT '{}' NOT NULL,
	`revision` integer DEFAULT 1 NOT NULL,
	`failure_reason` text,
	`generated_at` text,
	FOREIGN KEY (`order_id`) REFERENCES `report_orders`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`job_id`) REFERENCES `report_jobs`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `architectural_visualisations_report_status_idx` ON `architectural_visualisations` (`report_id`,`status`);--> statement-breakpoint
CREATE INDEX `architectural_visualisations_job_idx` ON `architectural_visualisations` (`job_id`);--> statement-breakpoint
CREATE TABLE `property_boundary_records` (
	`id` text PRIMARY KEY NOT NULL,
	`order_id` text NOT NULL,
	`property_id` text NOT NULL,
	`address` text NOT NULL,
	`lot` text,
	`deposited_plan` text,
	`local_government_area` text,
	`area_sqm` real,
	`area_source` text NOT NULL,
	`area_status` text NOT NULL,
	`parcel_count` integer DEFAULT 1 NOT NULL,
	`geometry_reference` text,
	`geometry_source` text,
	`geometry_status` text NOT NULL,
	`registered_survey_supplied` integer DEFAULT false NOT NULL,
	`exact_dimensions_available` integer DEFAULT false NOT NULL,
	`retrieved_at` text,
	`conflict_status` text DEFAULT 'none' NOT NULL,
	`rural_or_non_standard` integer DEFAULT false NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`order_id`) REFERENCES `report_orders`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `property_boundary_records_order_property_unique` ON `property_boundary_records` (`order_id`,`property_id`);--> statement-breakpoint
CREATE INDEX `property_boundary_records_status_idx` ON `property_boundary_records` (`area_status`,`geometry_status`);--> statement-breakpoint
CREATE TABLE `report_customer_profiles` (
	`id` text PRIMARY KEY NOT NULL,
	`order_id` text NOT NULL,
	`customer_type` text NOT NULL,
	`decision_objective` text NOT NULL,
	`full_name` text NOT NULL,
	`email` text NOT NULL,
	`phone` text,
	`sms_consent` integer DEFAULT false NOT NULL,
	`communication_consent_json` text DEFAULT '{}' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`order_id`) REFERENCES `report_orders`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `report_customer_profiles_order_unique` ON `report_customer_profiles` (`order_id`);--> statement-breakpoint
CREATE INDEX `report_customer_profiles_email_idx` ON `report_customer_profiles` (`email`);--> statement-breakpoint
CREATE TABLE `report_disputes` (
	`id` text PRIMARY KEY NOT NULL,
	`order_id` text NOT NULL,
	`report_id` text NOT NULL,
	`disputed_section_code` text NOT NULL,
	`entitlement_type` text NOT NULL,
	`client_explanation` text NOT NULL,
	`supporting_storage_reference` text,
	`status` text DEFAULT 'submitted' NOT NULL,
	`assigned_reviewer` text,
	`outcome` text,
	`correction_record_json` text,
	`created_at` text NOT NULL,
	`completed_at` text,
	FOREIGN KEY (`order_id`) REFERENCES `report_orders`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `report_disputes_report_status_idx` ON `report_disputes` (`report_id`,`status`);--> statement-breakpoint
CREATE INDEX `report_disputes_order_idx` ON `report_disputes` (`order_id`);--> statement-breakpoint
CREATE TABLE `report_packs` (
	`id` text PRIMARY KEY NOT NULL,
	`order_id` text NOT NULL,
	`zip_storage_reference` text,
	`manifest_json` text DEFAULT '{}' NOT NULL,
	`generation_status` text DEFAULT 'queued' NOT NULL,
	`file_count` integer DEFAULT 0 NOT NULL,
	`byte_size` integer DEFAULT 0 NOT NULL,
	`access_hash` text,
	`created_at` text NOT NULL,
	`expires_at` text,
	`download_count` integer DEFAULT 0 NOT NULL,
	`last_downloaded_at` text,
	FOREIGN KEY (`order_id`) REFERENCES `report_orders`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `report_packs_order_status_idx` ON `report_packs` (`order_id`,`generation_status`);--> statement-breakpoint
CREATE INDEX `report_packs_expiry_idx` ON `report_packs` (`expires_at`);--> statement-breakpoint
CREATE TABLE `report_prompt_runs` (
	`id` text PRIMARY KEY NOT NULL,
	`job_id` text NOT NULL,
	`prompt_id` text NOT NULL,
	`prompt_version` text NOT NULL,
	`template_id` text NOT NULL,
	`provider` text NOT NULL,
	`model` text NOT NULL,
	`validation_result_json` text DEFAULT '{}' NOT NULL,
	`run_at` text NOT NULL,
	FOREIGN KEY (`job_id`) REFERENCES `report_jobs`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `report_prompt_runs_job_idx` ON `report_prompt_runs` (`job_id`,`run_at`);--> statement-breakpoint
CREATE TABLE `report_reference_materials` (
	`id` text PRIMARY KEY NOT NULL,
	`order_id` text NOT NULL,
	`report_selection_id` text NOT NULL,
	`property_id` text NOT NULL,
	`original_url` text,
	`storage_reference` text,
	`title` text,
	`supplier_or_designer` text,
	`model_name` text,
	`what_client_likes` text,
	`exact_model_intended` integer DEFAULT false NOT NULL,
	`approximate_floor_area_sqm` real,
	`bedroom_count` integer,
	`storey_count` integer,
	`preferred_features_json` text DEFAULT '[]' NOT NULL,
	`client_notes` text,
	`written_brief` text,
	`extracted_metadata_json` text DEFAULT '{}' NOT NULL,
	`access_status` text DEFAULT 'pending' NOT NULL,
	`accessed_at` text,
	`copyright_notice` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`order_id`) REFERENCES `report_orders`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`report_selection_id`) REFERENCES `report_selections`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `report_reference_materials_selection_idx` ON `report_reference_materials` (`report_selection_id`);--> statement-breakpoint
CREATE INDEX `report_reference_materials_order_idx` ON `report_reference_materials` (`order_id`);--> statement-breakpoint
CREATE TABLE `report_selections` (
	`id` text PRIMARY KEY NOT NULL,
	`order_id` text NOT NULL,
	`report_catalogue_id` text NOT NULL,
	`template_id` text NOT NULL,
	`selected_status` text NOT NULL,
	`full_price_cents` integer,
	`shared_credit_cents` integer DEFAULT 0 NOT NULL,
	`final_report_price_cents` integer,
	`required_input_status` text DEFAULT 'pending' NOT NULL,
	`selection_order` integer NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`order_id`) REFERENCES `report_orders`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `report_selections_order_catalogue_unique` ON `report_selections` (`order_id`,`report_catalogue_id`);--> statement-breakpoint
CREATE INDEX `report_selections_order_idx` ON `report_selections` (`order_id`,`selection_order`);