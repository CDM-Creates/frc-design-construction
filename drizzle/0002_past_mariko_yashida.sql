CREATE TABLE `development_item_selections` (
	`id` text PRIMARY KEY NOT NULL,
	`simulation_request_id` text NOT NULL,
	`item_code` text NOT NULL,
	`item_name` text NOT NULL,
	`category` text NOT NULL,
	`pricing_type` text NOT NULL,
	`selected_details_json` text DEFAULT '[]' NOT NULL,
	`selection_order` integer NOT NULL,
	`is_included_item` integer DEFAULT false NOT NULL,
	`calculated_charge_aud` integer DEFAULT 0 NOT NULL,
	`quote_reason` text,
	FOREIGN KEY (`simulation_request_id`) REFERENCES `planning_simulation_requests`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `development_items_request_idx` ON `development_item_selections` (`simulation_request_id`);--> statement-breakpoint
CREATE TABLE `planning_environmental_constraints` (
	`id` text PRIMARY KEY NOT NULL,
	`property_id` text NOT NULL,
	`constraint_type` text NOT NULL,
	`mapped_status` text NOT NULL,
	`severity` text NOT NULL,
	`source_fetch_id` text,
	`verified` integer DEFAULT false NOT NULL,
	`quote_triggered` integer DEFAULT false NOT NULL,
	`notes` text,
	FOREIGN KEY (`property_id`) REFERENCES `planning_properties`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`source_fetch_id`) REFERENCES `property_source_fetches`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `planning_constraints_property_idx` ON `planning_environmental_constraints` (`property_id`);--> statement-breakpoint
CREATE TABLE `planning_facts` (
	`id` text PRIMARY KEY NOT NULL,
	`property_id` text NOT NULL,
	`fact_key` text NOT NULL,
	`display_name` text NOT NULL,
	`value_text` text,
	`value_number` real,
	`value_boolean` integer,
	`value_json` text,
	`unit` text,
	`source_fetch_id` text,
	`source_name` text NOT NULL,
	`source_url` text,
	`source_type` text NOT NULL,
	`retrieved_at` text NOT NULL,
	`effective_date` text,
	`verification_status` text NOT NULL,
	`confidence_status` text NOT NULL,
	`professional_review_required` integer DEFAULT true NOT NULL,
	`original_value_json` text,
	`notes` text,
	FOREIGN KEY (`property_id`) REFERENCES `planning_properties`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`source_fetch_id`) REFERENCES `property_source_fetches`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `planning_facts_property_idx` ON `planning_facts` (`property_id`);--> statement-breakpoint
CREATE TABLE `planning_pricing_results` (
	`id` text PRIMARY KEY NOT NULL,
	`simulation_request_id` text NOT NULL,
	`base_price_aud` integer NOT NULL,
	`standard_item_count` integer NOT NULL,
	`additional_item_count` integer NOT NULL,
	`additional_items_total_aud` integer NOT NULL,
	`addon_charges_json` text NOT NULL,
	`quote_required` integer NOT NULL,
	`quote_reasons_json` text NOT NULL,
	`total_aud` integer,
	`pricing_version` text NOT NULL,
	`calculated_at` text NOT NULL,
	FOREIGN KEY (`simulation_request_id`) REFERENCES `planning_simulation_requests`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `planning_pricing_request_idx` ON `planning_pricing_results` (`simulation_request_id`);--> statement-breakpoint
CREATE TABLE `planning_project_documents` (
	`id` text PRIMARY KEY NOT NULL,
	`simulation_request_id` text NOT NULL,
	`property_id` text,
	`document_type` text NOT NULL,
	`storage_reference` text,
	`original_file_name` text,
	`document_status` text NOT NULL,
	`document_date` text,
	`expiry_date` text,
	`uploaded_by` text,
	`source_type` text NOT NULL,
	`verification_status` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`simulation_request_id`) REFERENCES `planning_simulation_requests`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`property_id`) REFERENCES `planning_properties`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `planning_documents_request_idx` ON `planning_project_documents` (`simulation_request_id`);--> statement-breakpoint
CREATE TABLE `planning_properties` (
	`id` text PRIMARY KEY NOT NULL,
	`simulation_request_id` text NOT NULL,
	`client_supplied_address` text NOT NULL,
	`official_formatted_address` text,
	`official_address_id` text,
	`latitude` real,
	`longitude` real,
	`lot` text,
	`dp` text,
	`parcel_id` text,
	`local_government_area` text,
	`suburb` text,
	`postcode` text,
	`client_supplied_land_area_sqm` real,
	`mapped_parcel_area_sqm` real,
	`survey_area_sqm` real,
	`adopted_assessment_area_sqm` real,
	`adopted_area_source` text,
	`parcel_geometry_json` text,
	`verification_status` text DEFAULT 'not_verified' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`simulation_request_id`) REFERENCES `planning_simulation_requests`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `planning_properties_request_idx` ON `planning_properties` (`simulation_request_id`);--> statement-breakpoint
CREATE TABLE `planning_report_data_packs` (
	`id` text PRIMARY KEY NOT NULL,
	`simulation_request_id` text NOT NULL,
	`data_version` integer DEFAULT 1 NOT NULL,
	`structured_payload_json` text NOT NULL,
	`missing_information_json` text NOT NULL,
	`source_register_json` text NOT NULL,
	`ready_for_ai` integer DEFAULT false NOT NULL,
	`ready_for_professional_review` integer DEFAULT false NOT NULL,
	`architect_approved_at` text,
	`client_released_at` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`simulation_request_id`) REFERENCES `planning_simulation_requests`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `planning_report_pack_request_idx` ON `planning_report_data_packs` (`simulation_request_id`);--> statement-breakpoint
CREATE TABLE `planning_simulation_requests` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text,
	`status` text DEFAULT 'draft' NOT NULL,
	`client_role` text NOT NULL,
	`assessment_mode` text NOT NULL,
	`report_type` text NOT NULL,
	`priority_requested` integer DEFAULT false NOT NULL,
	`quote_required` integer DEFAULT false NOT NULL,
	`quote_status` text DEFAULT 'not_requested' NOT NULL,
	`quoted_total_aud` integer,
	`pricing_version` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `planning_source_registry` (
	`id` text PRIMARY KEY NOT NULL,
	`source_key` text NOT NULL,
	`source_name` text NOT NULL,
	`source_category` text NOT NULL,
	`authority_name` text NOT NULL,
	`council_id` text,
	`public_url` text NOT NULL,
	`service_url` text,
	`service_type` text NOT NULL,
	`authentication_type` text DEFAULT 'none' NOT NULL,
	`environment_variable_name` text,
	`data_format` text,
	`is_official` integer DEFAULT true NOT NULL,
	`is_paid` integer DEFAULT false NOT NULL,
	`requires_client_document` integer DEFAULT false NOT NULL,
	`is_enabled` integer DEFAULT false NOT NULL,
	`integration_status` text DEFAULT 'not_connected' NOT NULL,
	`last_verified_at` text,
	`effective_from` text,
	`effective_to` text,
	`notes` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `planning_source_registry_key_unique` ON `planning_source_registry` (`source_key`);--> statement-breakpoint
CREATE TABLE `property_source_fetches` (
	`id` text PRIMARY KEY NOT NULL,
	`simulation_request_id` text NOT NULL,
	`property_id` text NOT NULL,
	`source_registry_id` text,
	`request_status` text NOT NULL,
	`requested_at` text NOT NULL,
	`completed_at` text,
	`raw_response_json` text,
	`error_code` text,
	`error_message` text,
	`response_hash` text,
	`provider_reference` text,
	FOREIGN KEY (`simulation_request_id`) REFERENCES `planning_simulation_requests`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`property_id`) REFERENCES `planning_properties`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`source_registry_id`) REFERENCES `planning_source_registry`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `property_source_fetches_property_idx` ON `property_source_fetches` (`property_id`);
--> statement-breakpoint
INSERT INTO `planning_source_registry` (`id`,`source_key`,`source_name`,`source_category`,`authority_name`,`public_url`,`service_url`,`service_type`,`authentication_type`,`is_official`,`is_paid`,`requires_client_document`,`is_enabled`,`integration_status`,`notes`,`created_at`,`updated_at`) VALUES
('seed-nsw-planning-portal','NSW_PLANNING_PORTAL','NSW Planning Portal','planning','NSW Government','https://www.planningportal.nsw.gov.au/',NULL,'PUBLIC_VIEWER','none',1,0,0,0,'requires_service_discovery','Official landing page. Record and test an authorised service URL separately.','2026-07-30T00:00:00.000Z','2026-07-30T00:00:00.000Z'),
('seed-nsw-planning-spatial-viewer','NSW_PLANNING_SPATIAL_VIEWER','NSW Planning Portal Spatial Viewer','planning_spatial','NSW Government','https://www.planningportal.nsw.gov.au/spatialviewer/',NULL,'PUBLIC_VIEWER','none',1,0,0,0,'requires_service_discovery','Mapped information is not survey-accurate. Do not scrape the viewer.','2026-07-30T00:00:00.000Z','2026-07-30T00:00:00.000Z'),
('seed-nsw-legislation','NSW_LEGISLATION','NSW Legislation','legislation','NSW Government','https://legislation.nsw.gov.au/',NULL,'DOCUMENT_URL','none',1,0,0,0,'requires_service_discovery','Store instrument, clause, version, effective date and exact source URL.','2026-07-30T00:00:00.000Z','2026-07-30T00:00:00.000Z'),
('seed-nsw-spatial-collaboration','NSW_SPATIAL_COLLABORATION_PORTAL','NSW Spatial Collaboration Portal','spatial','NSW Government','https://portal.spatial.nsw.gov.au/',NULL,'PUBLIC_VIEWER','none',1,0,0,0,'requires_service_discovery','Discovery point for licensed spatial services and datasets.','2026-07-30T00:00:00.000Z','2026-07-30T00:00:00.000Z'),
('seed-nsw-six-maps','NSW_SIX_MAPS','SIX Maps','spatial_verification','NSW Government','https://maps.six.nsw.gov.au/',NULL,'PUBLIC_VIEWER','none',1,0,0,0,'requires_service_discovery','Use for human verification unless an authorised data service is recorded.','2026-07-30T00:00:00.000Z','2026-07-30T00:00:00.000Z'),
('seed-nsw-spatial-services','NSW_SPATIAL_SERVICES','NSW Spatial Services','property','NSW Government','https://www.spatial.nsw.gov.au/',NULL,'DOCUMENT_URL','none',1,0,0,0,'requires_service_discovery','Property, parcel, survey and mapping products.','2026-07-30T00:00:00.000Z','2026-07-30T00:00:00.000Z'),
('seed-nsw-lrs','NSW_LAND_REGISTRY_SERVICES','NSW Land Registry Services','title','NSW Land Registry Services','https://www.nswlrs.com.au/',NULL,'PAID_DOCUMENT','none',1,1,0,0,'manual_or_paid_order','Title, deposited-plan and registered-interest documents may require purchase.','2026-07-30T00:00:00.000Z','2026-07-30T00:00:00.000Z'),
('seed-client-survey','CLIENT_OR_SURVEYOR_SURVEY','Registered detail survey','survey','Client or registered surveyor','https://www.bossi.nsw.gov.au/',NULL,'CLIENT_UPLOAD','none',0,1,1,0,'manual_upload','Keep surveyed area separate from mapped and title areas.','2026-07-30T00:00:00.000Z','2026-07-30T00:00:00.000Z'),
('seed-nsw-rfs','NSW_RFS','NSW Rural Fire Service','bushfire','NSW Rural Fire Service','https://www.rfs.nsw.gov.au/',NULL,'DOCUMENT_URL','none',1,0,0,0,'requires_service_discovery','A mapped bushfire flag is screening, not a detailed assessment.','2026-07-30T00:00:00.000Z','2026-07-30T00:00:00.000Z'),
('seed-nsw-seed','NSW_SEED_DATA_PORTAL','NSW SEED data portal','environment','NSW Government','https://datasets.seed.nsw.gov.au/',NULL,'PUBLIC_VIEWER','none',1,0,0,0,'requires_service_discovery','Review dataset date, licence, coverage and schema before integration.','2026-07-30T00:00:00.000Z','2026-07-30T00:00:00.000Z'),
('seed-nsw-heritage','NSW_HERITAGE','NSW Heritage','heritage','NSW Government','https://www.environment.nsw.gov.au/topics/heritage',NULL,'DOCUMENT_URL','none',1,0,0,0,'requires_service_discovery','Cross-check State, LEP and Council heritage records.','2026-07-30T00:00:00.000Z','2026-07-30T00:00:00.000Z'),
('seed-nsw-epa-contaminated','NSW_EPA_CONTAMINATED_LAND','NSW EPA contaminated land','contamination','NSW Environment Protection Authority','https://www.epa.nsw.gov.au/your-environment/contaminated-land',NULL,'DOCUMENT_URL','none',1,0,0,0,'requires_service_discovery','No public listing is not proof that land is uncontaminated.','2026-07-30T00:00:00.000Z','2026-07-30T00:00:00.000Z'),
('seed-nsw-basix','NSW_BASIX','BASIX','project_document','NSW Government','https://www.planningportal.nsw.gov.au/basix',NULL,'CLIENT_UPLOAD','none',1,0,1,0,'manual_upload','Project commitments must come from the issued certificate.','2026-07-30T00:00:00.000Z','2026-07-30T00:00:00.000Z'),
('seed-byda','BEFORE_YOU_DIG_AUSTRALIA','Before You Dig Australia','services','Before You Dig Australia','https://www.byda.com.au/',NULL,'DOCUMENT_URL','none',0,0,1,0,'manual_upload','Returned plans are project documents requiring review.','2026-07-30T00:00:00.000Z','2026-07-30T00:00:00.000Z'),
('seed-project-plans','PROJECT_ARCHITECTURAL_PLANS','Architectural plans','project_document','FRC, external architect or client','https://frcdc.com.au/',NULL,'CLIENT_UPLOAD','none',0,0,1,0,'manual_upload','Store author, drawing number, revision, issue date and approval status.','2026-07-30T00:00:00.000Z','2026-07-30T00:00:00.000Z');
