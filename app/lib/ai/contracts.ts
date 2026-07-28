import type { CanonicalProject } from "../project-data";

export type SectionOutput = {
  section: string;
  summary: string;
  recommendations: string[];
  assumptions: string[];
  items_to_verify: string[];
  missing_information: string[];
  confidence_notes: string[];
};

export type RoomFitStatus =
  | "comfortable"
  | "efficient"
  | "below_minimum"
  | "unverified";

export type RoomScheduleItem = {
  space_name: string;
  suggested_location: string;
  approximate_area_range: string;
  main_purpose: string;
  relationship_to_nearby_spaces: string;
  design_notes: string;
  suggested_floor?: string;
  recommended_dimensions?: string;
  minimum_area_sqm?: number;
  target_area_sqm?: number;
  allocated_area_sqm?: number;
  fit_status?: RoomFitStatus;
  area_treatment?: "gfa" | "external" | "verify";
  basis?: string;
};

export type CapacityControl = {
  label: string;
  raw_value: string;
  value?: number;
  unit: "sqm" | "m" | "ratio" | "count";
  status: "verified" | "provisional" | "missing";
  source: string;
};

export type SiteCapacityEnvelope = {
  setback_envelope_width_m?: number;
  setback_envelope_depth_m?: number;
  setback_footprint_cap_sqm?: number;
  coverage_footprint_cap_sqm?: number;
  open_space_footprint_cap_sqm?: number;
  selected_footprint_cap_sqm?: number;
  fsr_gfa_cap_sqm?: number;
  storey_gfa_cap_sqm?: number;
  preliminary_max_gfa_sqm?: number;
  recommended_design_gfa_sqm?: number;
  estimated_usable_internal_sqm?: number;
  landscaped_area_required_sqm?: number;
  private_open_space_required_sqm?: number;
};

export type ProgrammeFit = {
  status: "comfortable" | "efficient" | "constrained" | "unverified";
  requested_net_area_sqm: number;
  minimum_gross_area_sqm: number;
  target_gross_area_sqm: number;
  generous_gross_area_sqm: number;
  available_design_area_sqm?: number;
  shortfall_or_surplus_sqm?: number;
  explanation: string;
};

export type SiteCapacityResult = {
  calculator_version: 1;
  status:
    | "calculated_from_verified_inputs"
    | "preliminary"
    | "insufficient_data";
  status_label: string;
  area_source: "surveyed" | "mapped" | "client" | "missing";
  site_area_sqm?: number;
  site_width_m?: number;
  site_depth_m?: number;
  requested_storeys: number;
  effective_storeys: number;
  controls: CapacityControl[];
  envelope: SiteCapacityEnvelope;
  limiting_controls: string[];
  calculation_steps: string[];
  assumptions: string[];
  warnings: string[];
  verification_required: string[];
  confidence: "high" | "medium" | "low";
  programme_fit: ProgrammeFit;
  room_schedule: RoomScheduleItem[];
  external_area_target_sqm: number;
};

export type ImagePrompt = {
  key: string;
  title: string;
  category: "exterior" | "interior";
  prompt: string;
};

export type GeneratedImageRecord = ImagePrompt & {
  provider: string;
  model: string;
  status: "complete" | "failed" | "skipped";
  image_url?: string;
  error_message?: string;
};

export type SpecialistPackage = {
  site_capacity: SiteCapacityResult;
  property_analysis: SectionOutput;
  architectural_direction: SectionOutput;
  interior_direction: SectionOutput;
  room_schedule: RoomScheduleItem[];
  image_prompts: ImagePrompt[];
};

export type FinalReport = {
  report_version: 1;
  project_title: string;
  cover_statement: string;
  client_and_property_details: Record<string, string>;
  client_vision: string;
  project_summary: string;
  site_capacity: SiteCapacityResult;
  site_opportunities: string[];
  potential_site_constraints: string[];
  planning_information_requiring_verification: string[];
  recommended_architectural_direction: string;
  exterior_design: string;
  interior_design: string;
  preliminary_spatial_arrangement: string;
  room_schedule: RoomScheduleItem[];
  material_and_colour_palette: string[];
  sustainability_opportunities: string[];
  accessibility_considerations: string[];
  assumptions: string[];
  missing_information: string[];
  questions_for_client: string[];
  required_professional_investigations: string[];
  recommended_next_steps: string[];
  architectural_disclaimer: string;
  provider_notes: string[];
};

export type SimulationPackage = {
  job_id: string;
  status: "queued" | "processing" | "complete" | "partial" | "failed";
  created_at: string;
  completed_at?: string;
  project: CanonicalProject;
  specialist: SpecialistPackage;
  final_report: FinalReport;
  generated_images: GeneratedImageRecord[];
  task_statuses: Array<{
    task: string;
    provider: string;
    model: string;
    status: string;
    error?: string;
  }>;
};

export const sectionSchemaDescription = `Return one JSON object with exactly these keys: section (string), summary (string), recommendations (string array), assumptions (string array), items_to_verify (string array), missing_information (string array), confidence_notes (string array).`;
