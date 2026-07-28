export const PROJECT_STORAGE_KEY = "frc-canonical-project-v1";

export type UploadedProjectDocument = {
  id: string;
  name: string;
  type: string;
  size: number;
  category: "property_photo" | "site_survey" | "planning_document" | "existing_plan" | "inspiration_image" | "client_sketch" | "other";
  storageKey?: string;
  url?: string;
};

export type CanonicalProject = {
  version: 1;
  id?: string;
  client: {
    name: string;
    email: string;
    phone: string;
    preferred_contact_method: string;
    company: string;
  };
  property: {
    address: string;
    suburb: string;
    state: string;
    postcode: string;
    lot_details: string;
    site_width: string;
    site_depth: string;
    /**
     * Backward-compatible display value. New code should preserve the three
     * source-specific fields below rather than overwriting one with another.
     */
    site_area: string;
    client_site_area: string;
    mapped_site_area: string;
    surveyed_site_area: string;
    lot_type: string;
    slope: string;
    orientation: string;
    existing_structures: string;
    site_notes: string;
  };
  planning: {
    council: string;
    zoning: string;
    zone_name: string;
    planning_instrument: string;
    height_limit: string;
    floor_space_ratio: string;
    minimum_lot_size: string;
    /**
     * Planning controls used by the deterministic capacity calculator.
     * Keep them blank when the NSW/council source did not return a value.
     */
    site_coverage: string;
    landscaped_area: string;
    private_open_space: string;
    setbacks: string;
    front_setback: string;
    rear_setback: string;
    side_setback_left: string;
    side_setback_right: string;
    heritage: string;
    bushfire: string;
    flooding: string;
    planning_documents: UploadedProjectDocument[];
    verified_items: string[];
    unverified_items: string[];
  };
  ambition: {
    project_type: string;
    storeys: string;
    bedrooms: string;
    bathrooms: string;
    parking: string;
    special_rooms: string[];
    architectural_style: string;
    interior_style: string;
    sustainability_goals: string[];
    accessibility_requirements: string;
    lifestyle_requirements: string;
  };
  roadmap: {
    budget: string;
    estimated_construction_cost: string;
    preferred_start_date: string;
    completion_goal: string;
    approval_status: string;
    approval_pathway: string;
    finance_status: string;
    additional_notes: string;
  };
  simulation: {
    client_description: string;
    exterior_materials: string;
    interior_materials: string;
    colour_preferences: string;
    roof_style: string;
    landscaping: string;
    pool: string;
    garage_or_carport: string;
    natural_light: string;
    privacy: string;
    views: string;
    inspiration_links: string[];
    additional_instructions: string;
    uploaded_files: UploadedProjectDocument[];
  };
  consent: {
    concept_disclaimer_accepted: boolean;
    accepted_at?: string;
  };
  metadata: {
    source: string;
    created_at: string;
    updated_at: string;
  };
};

export const createEmptyProject = (): CanonicalProject => {
  const now = new Date().toISOString();
  return {
    version: 1,
    client: { name: "", email: "", phone: "", preferred_contact_method: "Email", company: "" },
    property: {
      address: "", suburb: "", state: "NSW", postcode: "", lot_details: "", site_width: "", site_depth: "", site_area: "",
      client_site_area: "", mapped_site_area: "", surveyed_site_area: "",
      lot_type: "standard", slope: "unknown", orientation: "unknown", existing_structures: "", site_notes: "",
    },
    planning: {
      council: "", zoning: "", zone_name: "", planning_instrument: "", height_limit: "", floor_space_ratio: "",
      minimum_lot_size: "", site_coverage: "", landscaped_area: "", private_open_space: "", setbacks: "",
      front_setback: "", rear_setback: "", side_setback_left: "", side_setback_right: "",
      heritage: "", bushfire: "", flooding: "", planning_documents: [], verified_items: [],
      unverified_items: ["Title and deposited plan", "Registered survey", "Council DCP controls", "Flood and bushfire mapping", "Easements and restrictions"],
    },
    ambition: {
      project_type: "home", storeys: "2", bedrooms: "4", bathrooms: "2", parking: "2", special_rooms: [],
      architectural_style: "Contemporary", interior_style: "Warm contemporary", sustainability_goals: [],
      accessibility_requirements: "", lifestyle_requirements: "",
    },
    roadmap: {
      budget: "", estimated_construction_cost: "", preferred_start_date: "", completion_goal: "", approval_status: "Not started",
      approval_pathway: "DA", finance_status: "Not supplied", additional_notes: "",
    },
    simulation: {
      client_description: "", exterior_materials: "", interior_materials: "", colour_preferences: "", roof_style: "",
      landscaping: "", pool: "", garage_or_carport: "", natural_light: "", privacy: "", views: "", inspiration_links: [],
      additional_instructions: "", uploaded_files: [],
    },
    consent: { concept_disclaimer_accepted: false },
    metadata: { source: "website", created_at: now, updated_at: now },
  };
};

const isRecord = (value: unknown): value is Record<string, unknown> => Boolean(value) && typeof value === "object" && !Array.isArray(value);

export function mergeProjectData(base: CanonicalProject, patch: Partial<CanonicalProject>): CanonicalProject {
  const merge = (left: unknown, right: unknown): unknown => {
    if (Array.isArray(right)) return right;
    if (isRecord(left) && isRecord(right)) {
      const result: Record<string, unknown> = { ...left };
      for (const [key, value] of Object.entries(right)) result[key] = merge(result[key], value);
      return result;
    }
    return right === undefined ? left : right;
  };
  const merged = merge(base, patch) as CanonicalProject;
  merged.version = 1;
  merged.metadata = {
    ...base.metadata,
    ...merged.metadata,
    updated_at: new Date().toISOString(),
  };
  return merged;
}

export function readStoredProject(): CanonicalProject {
  if (typeof window === "undefined") return createEmptyProject();
  try {
    const raw = window.localStorage.getItem(PROJECT_STORAGE_KEY);
    if (!raw) return createEmptyProject();
    return mergeProjectData(createEmptyProject(), JSON.parse(raw) as Partial<CanonicalProject>);
  } catch {
    return createEmptyProject();
  }
}

export function writeStoredProject(project: CanonicalProject) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(PROJECT_STORAGE_KEY, JSON.stringify({ ...project, metadata: { ...project.metadata, updated_at: new Date().toISOString() } }));
  } catch {
    // Private browsing or storage quotas must not prevent form completion.
  }
}

export function projectTitle(project: CanonicalProject) {
  const type = project.ambition.project_type === "dual" ? "Dual Occupancy" : project.ambition.project_type === "renovation" ? "Renovation and Addition" : "New Home";
  return `${type} · ${project.property.suburb || "NSW"}`;
}
