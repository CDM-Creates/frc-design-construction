CREATE TABLE `final_planning_reports` (
	`id` text PRIMARY KEY NOT NULL,
	`order_id` text NOT NULL,
	`job_id` text NOT NULL,
	`access_hash` text NOT NULL,
	`structured_report_json` text NOT NULL,
	`html_reference` text NOT NULL,
	`pdf_reference` text,
	`status` text NOT NULL,
	`reviewer_record_json` text,
	`released_at` text,
	`version` integer DEFAULT 1 NOT NULL,
	FOREIGN KEY (`order_id`) REFERENCES `report_orders`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`job_id`) REFERENCES `report_jobs`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `final_planning_reports_order_idx` ON `final_planning_reports` (`order_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `final_planning_reports_job_version_unique` ON `final_planning_reports` (`job_id`,`version`);--> statement-breakpoint
CREATE TABLE `report_documents` (
	`id` text PRIMARY KEY NOT NULL,
	`order_id` text NOT NULL,
	`client_owner_reference` text,
	`storage_reference` text NOT NULL,
	`original_filename` text NOT NULL,
	`safe_filename` text NOT NULL,
	`mime_type` text NOT NULL,
	`byte_size` integer NOT NULL,
	`page_count` integer,
	`sha256` text NOT NULL,
	`category` text NOT NULL,
	`author` text,
	`issue_date` text,
	`revision` text,
	`client_note` text,
	`uploaded_at` text NOT NULL,
	`status` text NOT NULL,
	`extraction_provider` text,
	`extraction_model` text,
	`extraction_schema_version` text,
	`extracted_facts_json` text DEFAULT '[]' NOT NULL,
	`source_citations_json` text DEFAULT '[]' NOT NULL,
	`detected_conflicts_json` text DEFAULT '[]' NOT NULL,
	`professional_review_status` text DEFAULT 'not_required' NOT NULL,
	`superseded_document_id` text,
	`malware_scan_status` text DEFAULT 'not_scanned' NOT NULL,
	`automated_interpretation_eligible` integer DEFAULT true NOT NULL,
	FOREIGN KEY (`order_id`) REFERENCES `report_orders`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `report_documents_order_category_idx` ON `report_documents` (`order_id`,`category`);--> statement-breakpoint
CREATE INDEX `report_documents_sha256_idx` ON `report_documents` (`sha256`);--> statement-breakpoint
CREATE TABLE `report_jobs` (
	`id` text PRIMARY KEY NOT NULL,
	`order_id` text NOT NULL,
	`status` text NOT NULL,
	`progress_stage` text NOT NULL,
	`ai_provider` text NOT NULL,
	`template_id` text NOT NULL,
	`prompt_version` text NOT NULL,
	`schema_version` text NOT NULL,
	`generation_attempt` integer DEFAULT 1 NOT NULL,
	`failure_reason` text,
	`review_required` integer DEFAULT false NOT NULL,
	`created_at` text NOT NULL,
	`started_at` text,
	`completed_at` text,
	FOREIGN KEY (`order_id`) REFERENCES `report_orders`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `report_jobs_order_status_idx` ON `report_jobs` (`order_id`,`status`);--> statement-breakpoint
CREATE INDEX `report_jobs_review_queue_idx` ON `report_jobs` (`review_required`,`status`,`created_at`);--> statement-breakpoint
CREATE TABLE `report_notifications` (
	`id` text PRIMARY KEY NOT NULL,
	`order_id` text NOT NULL,
	`type` text NOT NULL,
	`recipient` text NOT NULL,
	`subject` text NOT NULL,
	`status` text NOT NULL,
	`provider_reference` text,
	`retry_count` integer DEFAULT 0 NOT NULL,
	`failure_reason` text,
	`created_at` text NOT NULL,
	`sent_at` text,
	FOREIGN KEY (`order_id`) REFERENCES `report_orders`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `report_notifications_order_status_idx` ON `report_notifications` (`order_id`,`status`);--> statement-breakpoint
CREATE TABLE `report_order_events` (
	`id` text PRIMARY KEY NOT NULL,
	`order_id` text NOT NULL,
	`event_type` text NOT NULL,
	`actor` text NOT NULL,
	`metadata_json` text DEFAULT '{}' NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`order_id`) REFERENCES `report_orders`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `report_order_events_order_idx` ON `report_order_events` (`order_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `report_orders` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_hash` text NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`is_test` integer DEFAULT false NOT NULL,
	`client_json` text DEFAULT '{}' NOT NULL,
	`property_json` text DEFAULT '{}' NOT NULL,
	`scope_json` text DEFAULT '{}' NOT NULL,
	`report_type` text NOT NULL,
	`price_snapshot_json` text,
	`pricing_version` text,
	`currency` text DEFAULT 'AUD' NOT NULL,
	`tax_treatment` text NOT NULL,
	`consents_json` text DEFAULT '[]' NOT NULL,
	`payment_status` text DEFAULT 'not_started' NOT NULL,
	`professional_review_required` integer DEFAULT false NOT NULL,
	`priority` integer DEFAULT false NOT NULL,
	`tailored_quote` integer DEFAULT false NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `report_orders_status_created_idx` ON `report_orders` (`status`,`created_at`);--> statement-breakpoint
CREATE INDEX `report_orders_payment_status_idx` ON `report_orders` (`payment_status`);--> statement-breakpoint
CREATE TABLE `report_payment_events` (
	`provider_event_id` text PRIMARY KEY NOT NULL,
	`order_id` text NOT NULL,
	`provider` text NOT NULL,
	`event_type` text NOT NULL,
	`verified` integer DEFAULT false NOT NULL,
	`safe_metadata_json` text DEFAULT '{}' NOT NULL,
	`processing_status` text NOT NULL,
	`idempotency_key` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`order_id`) REFERENCES `report_orders`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `report_payment_events_idempotency_unique` ON `report_payment_events` (`idempotency_key`);--> statement-breakpoint
CREATE INDEX `report_payment_events_order_idx` ON `report_payment_events` (`order_id`);--> statement-breakpoint
CREATE TABLE `report_sections` (
	`id` text PRIMARY KEY NOT NULL,
	`job_id` text NOT NULL,
	`section_code` text NOT NULL,
	`generation_status` text NOT NULL,
	`structured_content_json` text NOT NULL,
	`source_citations_json` text DEFAULT '[]' NOT NULL,
	`validation_result_json` text DEFAULT '{}' NOT NULL,
	`professional_review_status` text DEFAULT 'not_required' NOT NULL,
	`revision_number` integer DEFAULT 1 NOT NULL,
	FOREIGN KEY (`job_id`) REFERENCES `report_jobs`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `report_sections_job_code_revision_unique` ON `report_sections` (`job_id`,`section_code`,`revision_number`);