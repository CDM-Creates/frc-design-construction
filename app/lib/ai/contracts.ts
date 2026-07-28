import type { CanonicalProject } from "../project-data";

export type PlanningValueStatus =
  | "verified"
  | "mapped"
  | "client-supplied"
  | "architect-entered"
  | "missing"
  | "conflict";

export type SourcedPlanningValue<T> = {
  value: T | null;
  unit?: string;
  sourceName: string;
  sourceLayer?: string;
  sourceFeatureId?: string;
  sourceDocument?: string;
  retrievedAt?: string;
  status: PlanningValueStatus;
  notes?: string;
};

export type PlanningValueKey =
  | "parcel_area"
  | "site_width"
  | "site_depth"
  | "fsr"
  | "site_coverage"
  | "front_setback"
  | "rear_setback"
  | "left_side_setback"
  | "right_side_setback"
  | "landscaped_area"
  | "private_open_space"
  | "height_limit"
  | "permitted_storeys"
  | "minimum_lot_size"
  | "heritage"
  | "flooding"
  | "bushfire";

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

export type RoomPriority = "required" | "preferred" | "optional";
export type HouseholdProfile = "efficient" | "comfortable" | "generous";

export type RoomScheduleItem = {
  id: string;
  room_name: string;
  floor: string;
  recommended_width_m: number;
  recommended_depth_m: number;
  minimum_area_sqm: number;
  target_area_sqm: number;
  allocated_area_sqm: number;
  fit_status: RoomFitStatus;
  priority: RoomPriority;
  main_purpose: string;
  suggested_location: string;
  adjacency_list: string[];
  design_notes: string;
  area_treatment: "gfa" | "external" | "verify";
  locked: boolean;
  basis: string;
};

export type CapacityControl = {
  key: PlanningValueKey;
  label: string;
  planning_value: SourcedPlanningValue<number | string | boolean>;
  used_in_calculation: boolean;
};

export type SiteAreas = {
  clientSiteAreaSqm: number | null;
  mappedParcelAreaSqm: number | null;
  calculatedGeometryAreaSqm: number | null;
  surveyedSiteAreaSqm: number | null;
  areaUsedByCalculatorSqm: number | null;
  areaUsedSource: "surveyed" | "mapped" | "client" | "missing";
};

export type ParcelAnalysis = {
  selectedParcelId: string | null;
  geometrySource: string | null;
  geometry: number[][][];
  geometryAreaSqm: number | null;
  boundingWidthM: number | null;
  boundingDepthM: number | null;
  rectangularity: number | null;
  irregularity: "regular" | "possibly_irregular" | "irregular" | "unknown";
  widthDepthAreaDifferencePercent: number | null;
  lotType: string;
  frontBoundaryConfirmed: boolean;
  envelopeStatus: "indicative" | "provisional";
  envelopeNote: string;
};

export type SiteCapacityEnvelope = {
  setback_envelope_width_m?: number;
  setback_envelope_depth_m?: number;
  setback_footprint_cap_sqm?: number;
  coverage_footprint_cap_sqm?: number;
  landscaped_area_footprint_cap_sqm?: number;
  selected_footprint_cap_sqm?: number;
  fsr_gfa_cap_sqm?: number;
  storey_gfa_cap_sqm?: number;
  preliminary_max_gfa_sqm?: number;
  recommended_design_gfa_sqm?: number;
  estimated_usable_internal_sqm?: number;
  garage_area_sqm: number;
  covered_outdoor_area_sqm: number;
  landscape_allowance_sqm?: number;
  private_open_space_allowance_sqm?: number;
};

export type ProgrammeFit = {
  status: "comfortable" | "efficient" | "constrained" | "unverified";
  requested_net_area_sqm: number;
  minimum_gross_area_sqm: number;
  target_gross_area_sqm: number;
  generous_gross_area_sqm: number;
  allocated_programme_area_sqm: number;
  available_design_area_sqm?: number;
  shortfall_or_surplus_sqm?: number;
  conflict_spaces: string[];
  suggested_adjustments: string[];
  explanation: string;
};

export type FloorAllocation = {
  floor: string;
  rooms: string[];
  internal_area_sqm: number;
  external_or_verify_area_sqm: number;
  total_area_sqm: number;
};

export type DevelopmentPathway = {
  option_name: "Retain and renovate" | "Renovate and extend" | "Knock-down rebuild";
  applicability: "applicable" | "possibly_applicable" | "not_supported_by_current_information";
  estimated_retained_area_sqm: number | null;
  potential_new_area_sqm: number | null;
  household_programme_fit: string;
  design_flexibility: "low" | "medium" | "high";
  relative_planning_complexity: "lower" | "moderate" | "higher" | "unknown";
  relative_cost: "lower" | "moderate" | "higher" | "unknown";
  major_advantages: string[];
  major_limitations: string[];
  missing_information: string[];
  required_investigations: string[];
  recommended_next_step: string;
};

export type ArchitectOverrideRecord = {
  id: string;
  field: string;
  original_mapped_value?: string | number | boolean | null;
  original_client_value?: string | number | boolean | null;
  architect_entered_value: string | number | boolean | null;
  selected_value: string | number | boolean | null;
  source_document?: string;
  editor: string;
  timestamp: string;
  reason: string;
  verified: boolean;
};

export type SiteCapacityResult = {
  calculator_version: 2;
  status:
    | "calculated_from_verified_inputs"
    | "calculated_from_provisional_inputs"
    | "insufficient_data"
    | "conflict_requires_review";
  status_label: string;
  confidence_status: "high" | "medium" | "low";
  areas: SiteAreas;
  area_source: SiteAreas["areaUsedSource"];
  site_area_sqm?: number;
  site_width_m?: number;
  site_depth_m?: number;
  requested_storeys: number;
  effective_storeys: number;
  planning_values: Record<PlanningValueKey, SourcedPlanningValue<number | string | boolean>>;
  controls: CapacityControl[];
  controls_used: string[];
  missing_controls: string[];
  conflicts: string[];
  envelope: SiteCapacityEnvelope;
  parcel_analysis: ParcelAnalysis;
  limiting_control: string | null;
  limiting_controls: string[];
  calculation_steps: string[];
  assumptions: string[];
  warnings: string[];
  verification_required: string[];
  household_profile: HouseholdProfile;
  programme_fit: ProgrammeFit;
  room_programme: RoomScheduleItem[];
  floor_allocations: FloorAllocation[];
  development_pathways: DevelopmentPathway[];
  architect_overrides: ArchitectOverrideRecord[];
  architect_notes: string[];
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
  room_programme: RoomScheduleItem[];
  image_prompts: ImagePrompt[];
};

export type FinalReport = {
  report_version: 2;
  project_title: string;
  cover_statement: string;
  client_and_property_details: Record<string, string>;
  client_vision: string;
  project_summary: string;
  site_capacity: SiteCapacityResult;
  planning_sources: SourcedPlanningValue<number | string | boolean>[];
  site_opportunities: string[];
  potential_site_constraints: string[];
  planning_information_requiring_verification: string[];
  recommended_architectural_direction: string;
  exterior_design: string;
  interior_design: string;
  preliminary_spatial_arrangement: string;
  household_profile: HouseholdProfile;
  room_programme: RoomScheduleItem[];
  floor_totals: FloorAllocation[];
  brief_fit_result: ProgrammeFit;
  development_pathways: DevelopmentPathway[];
  material_and_colour_palette: string[];
  sustainability_opportunities: string[];
  accessibility_considerations: string[];
  assumptions: string[];
  warnings: string[];
  missing_information: string[];
  unresolved_client_questions: string[];
  missing_documents: string[];
  required_professional_investigations: string[];
  architect_notes: string[];
  recommended_next_steps: string[];
  architectural_disclaimer: string;
  narrative_mode: "ai-assisted" | "deterministic-template";
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

export const sectionSchemaDescription = "Return one JSON object with exactly these keys: section (string), summary (string), recommendations (string array), assumptions (string array), items_to_verify (string array), missing_information (string array), confidence_notes (string array).";
