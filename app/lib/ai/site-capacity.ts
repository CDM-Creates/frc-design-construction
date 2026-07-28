import type { CanonicalProject, ProjectPlanningSourceValue } from "../project-data";
import type {
  ArchitectOverrideRecord,
  CapacityControl,
  DevelopmentPathway,
  FloorAllocation,
  HouseholdProfile,
  PlanningValueKey,
  RoomFitStatus,
  RoomPriority,
  RoomScheduleItem,
  SiteCapacityResult,
  SourcedPlanningValue,
} from "./contracts";

const round = (value: number, places = 1) => {
  const factor = 10 ** places;
  return Math.round((value + Number.EPSILON) * factor) / factor;
};

const finitePositive = (value: unknown, maximum = 1_000_000): number | null => {
  if (typeof value === "number") return Number.isFinite(value) && value > 0 && value <= maximum ? value : null;
  if (typeof value !== "string") return null;
  const normalised = value.trim().replaceAll(",", "");
  if (!normalised || !/^-?\d+(?:\.\d+)?(?:\s*(?:m|m²|sqm|%|:1))?$/i.test(normalised)) return null;
  const parsed = Number(normalised.match(/-?\d+(?:\.\d+)?/)?.[0]);
  return Number.isFinite(parsed) && parsed > 0 && parsed <= maximum ? parsed : null;
};

const ratio = (value: unknown): number | null => {
  if (typeof value === "string") {
    const text = value.trim();
    const colon = text.match(/^(\d+(?:\.\d+)?)\s*:\s*(\d+(?:\.\d+)?)$/);
    if (colon) {
      const result = Number(colon[1]) / Number(colon[2]);
      return result > 0 && result <= 3 ? result : null;
    }
    const parsed = finitePositive(text.replace(/%$/, ""), 300);
    if (parsed === null) return null;
    const result = text.includes("%") || parsed > 3 ? parsed / 100 : parsed;
    return result > 0 && result <= 3 ? result : null;
  }
  const parsed = finitePositive(value, 300);
  if (parsed === null) return null;
  const result = parsed > 3 ? parsed / 100 : parsed;
  return result > 0 && result <= 3 ? result : null;
};

const areaOrPercent = (value: unknown, siteArea: number): number | null => {
  if (typeof value !== "string" && typeof value !== "number") return null;
  const text = String(value).trim();
  const parsed = finitePositive(text.replace(/%$/, ""));
  if (parsed === null) return null;
  return text.includes("%") ? siteArea * (parsed / 100) : parsed;
};

const textIncludes = (value: string, terms: string[]) => {
  const lower = value.toLowerCase();
  return terms.some((term) => lower.includes(term.toLowerCase()));
};

const emptyValue = (label: string): SourcedPlanningValue<number | string | boolean> => ({
  value: null,
  sourceName: label,
  status: "missing",
});

const normaliseSource = (
  source: ProjectPlanningSourceValue | undefined,
  fallback: SourcedPlanningValue<number | string | boolean>,
): SourcedPlanningValue<number | string | boolean> => source ? {
  value: source.value,
  unit: source.unit,
  sourceName: source.sourceName,
  sourceLayer: source.sourceLayer,
  sourceFeatureId: source.sourceFeatureId,
  sourceDocument: source.sourceDocument,
  retrievedAt: source.retrievedAt,
  status: source.status,
  notes: source.notes,
} : fallback;

const mappedValue = (
  project: CanonicalProject,
  key: PlanningValueKey,
  raw: string | number | boolean | null,
  label: string,
  unit?: string,
): SourcedPlanningValue<number | string | boolean> => {
  const stored = normaliseSource(project.planning.source_values[key], {
    value: raw === "" ? null : raw,
    unit,
    sourceName: raw === "" || raw === null ? label : "Project planning data",
    status: raw === "" || raw === null ? "missing" : "mapped",
  });
  const override = [...project.architect.overrides].reverse().find((item) => item.field === key);
  if (!override) return stored;
  return {
    value: override.selected_value,
    unit,
    sourceName: "Architect review",
    sourceDocument: override.source_document,
    retrievedAt: override.timestamp,
    status: override.verified ? "verified" : "architect-entered",
    notes: override.reason,
  };
};

const numericPlanningValue = (
  project: CanonicalProject,
  key: PlanningValueKey,
  raw: string,
  label: string,
  unit: string,
  parser: (value: unknown) => number | null = finitePositive,
) => {
  const sourced = mappedValue(project, key, raw, label, unit);
  return { sourced, numeric: parser(sourced.value) };
};

const areaConflict = (first: number | null, second: number | null) => (
  first !== null && second !== null
    ? Math.abs(first - second) / Math.min(first, second)
    : 0
);

type RoomTemplate = {
  id: string;
  name: string;
  minimum: number;
  comfortable: number;
  generous: number;
  width: number;
  floor: string;
  priority: RoomPriority;
  purpose: string;
  location: string;
  adjacent: string[];
  notes: string;
  treatment?: "gfa" | "external" | "verify";
};

const makeRoom = (room: RoomTemplate, overrides: Partial<RoomTemplate> = {}): RoomTemplate => ({ ...room, ...overrides });

const baseRooms = {
  entry: { id: "entry", name: "Entry", minimum: 4, comfortable: 6, generous: 8, width: 1.8, floor: "Ground floor", priority: "required", purpose: "Arrival, orientation and everyday storage", location: "Sheltered street-facing arrival", adjacent: ["Living / dining", "Stair", "Garage"], notes: "Provide a weather-protected threshold and a clear path into the home." },
  kitchen: { id: "kitchen", name: "Kitchen", minimum: 13, comfortable: 18, generous: 22, width: 3.6, floor: "Ground floor", priority: "required", purpose: "Food preparation, storage and family gathering", location: "Central to living, dining and outdoor entertaining", adjacent: ["Living / dining", "Pantry", "Covered outdoor entertaining"], notes: "Retain useful work zones, bench space and controlled daylight." },
  living: { id: "living-dining", name: "Living / dining", minimum: 34, comfortable: 45, generous: 55, width: 6.2, floor: "Ground floor", priority: "required", purpose: "Primary family, dining and entertaining space", location: "Best solar orientation and garden edge", adjacent: ["Kitchen", "Covered outdoor entertaining"], notes: "Coordinate cross-ventilation, garden outlook, furniture walls and neighbour privacy." },
  laundry: { id: "laundry", name: "Laundry / utility", minimum: 5, comfortable: 8, generous: 10, width: 2.4, floor: "Ground floor", priority: "required", purpose: "Laundry, cleaning and household storage", location: "Service side of the home", adjacent: ["Kitchen", "Garage", "External drying area"], notes: "Allow bench space, tall storage and practical external access." },
  mainBedroom: { id: "main-bedroom", name: "Main bedroom", minimum: 14, comfortable: 18, generous: 22, width: 4.2, floor: "Upper floor", priority: "required", purpose: "Primary sleeping room", location: "Quiet private edge with the best outlook", adjacent: ["Main ensuite", "Walk-in robe"], notes: "Retain a full bed wall, circulation, ventilation and visual privacy." },
  robe: { id: "walk-in-robe", name: "Walk-in robe", minimum: 4, comfortable: 6, generous: 8, width: 2.2, floor: "Upper floor", priority: "preferred", purpose: "Primary clothes and personal storage", location: "Within the main bedroom suite", adjacent: ["Main bedroom", "Main ensuite"], notes: "Maintain useful hanging depth and a clear aisle." },
  ensuite: { id: "main-ensuite", name: "Main ensuite", minimum: 4.5, comfortable: 6, generous: 8, width: 2.4, floor: "Upper floor", priority: "required", purpose: "Bathroom serving the main bedroom", location: "Private side of the main suite", adjacent: ["Main bedroom", "Walk-in robe"], notes: "Coordinate shower, vanity, toilet privacy and ventilation." },
  bedroom: { id: "bedroom", name: "Bedroom", minimum: 10, comfortable: 12.5, generous: 14.5, width: 3.2, floor: "Upper floor", priority: "required", purpose: "Permanent bedroom with storage", location: "Quiet private bedroom zone", adjacent: ["Family bathroom", "Linen / storage"], notes: "Keep a practical bed wall, wardrobe depth and clear window access." },
  familyBathroom: { id: "family-bathroom", name: "Family bathroom", minimum: 5, comfortable: 7, generous: 9, width: 2.5, floor: "Upper floor", priority: "required", purpose: "Shared family bathroom", location: "Within the bedroom zone", adjacent: ["Secondary bedrooms", "Linen / storage"], notes: "Allow a bath where requested and coordinate privacy and ventilation." },
  bathroom: { id: "additional-bathroom", name: "Additional bathroom", minimum: 3.5, comfortable: 5.5, generous: 7, width: 2.2, floor: "Ground floor", priority: "required", purpose: "Guest and everyday bathroom", location: "Near guest and living zones", adjacent: ["Guest / adaptable room", "Living / dining"], notes: "Keep circulation compact and consider future adaptability." },
  stair: { id: "stair", name: "Stair and landings", minimum: 8, comfortable: 11, generous: 14, width: 2, floor: "Both levels", priority: "required", purpose: "Safe vertical circulation", location: "Central circulation spine", adjacent: ["Entry", "Living / dining", "Upper bedroom zone"], notes: "Final geometry must comply with the NCC and coordinate structure and headroom." },
  circulation: { id: "circulation", name: "Internal circulation", minimum: 12, comfortable: 17, generous: 22, width: 1.2, floor: "Distributed", priority: "required", purpose: "Hallways and circulation clearances", location: "Distributed efficiently across all levels", adjacent: ["All required rooms"], notes: "Keep circulation legible without routing through occupied rooms." },
  walls: { id: "walls-structure", name: "Internal walls / structure", minimum: 12, comfortable: 17, generous: 21, width: 3.5, floor: "Distributed", priority: "required", purpose: "Internal walls, columns and structural zones", location: "Distributed", adjacent: ["All internal rooms"], notes: "Allowance only; final structure and wall build-ups require design development." },
  storage: { id: "storage", name: "Linen / general storage", minimum: 4, comfortable: 7, generous: 10, width: 1.8, floor: "Distributed", priority: "required", purpose: "Linen, cleaning, seasonal and household storage", location: "At circulation nodes on both levels", adjacent: ["Bedrooms", "Laundry", "Entry"], notes: "Distribute storage close to where it is used." },
  services: { id: "services", name: "Plant / services", minimum: 3, comfortable: 5, generous: 7, width: 1.8, floor: "Ground floor", priority: "required", purpose: "Hot-water, electrical, mechanical and service allowances", location: "Accessible service zone", adjacent: ["Laundry / utility", "External service access"], notes: "Coordinate all-electric equipment, clearances and maintenance access." },
  garageSingle: { id: "garage", name: "Single garage", minimum: 20, comfortable: 23, generous: 27, width: 3.6, floor: "Ground floor", priority: "required", purpose: "One vehicle and limited storage", location: "Street and driveway edge", adjacent: ["Entry", "Laundry / utility"], notes: "Confirm manoeuvring, door clearance and GFA treatment.", treatment: "verify" },
  garageDouble: { id: "garage", name: "Double garage", minimum: 34, comfortable: 38, generous: 43, width: 6, floor: "Ground floor", priority: "required", purpose: "Two vehicles and household storage", location: "Street and driveway edge", adjacent: ["Entry", "Laundry / utility"], notes: "Confirm manoeuvring, door clearance and GFA treatment.", treatment: "verify" },
  study: { id: "study", name: "Study", minimum: 7, comfortable: 10, generous: 13, width: 3, floor: "Ground floor", priority: "preferred", purpose: "Focused work, homework or flexible guest use", location: "Near entry but acoustically separated", adjacent: ["Entry", "Bathroom"], notes: "Allow a full desk wall, storage and controlled outlook." },
  pantry: { id: "pantry", name: "Pantry", minimum: 3.5, comfortable: 5.5, generous: 8, width: 2.1, floor: "Ground floor", priority: "preferred", purpose: "Food, appliance and preparation storage", location: "Directly beside the kitchen", adjacent: ["Kitchen", "Garage"], notes: "Do not compromise kitchen daylight or circulation." },
  media: { id: "media", name: "Media / rumpus", minimum: 11, comfortable: 15, generous: 20, width: 3.8, floor: "Upper floor", priority: "optional", purpose: "Secondary retreat or media space", location: "Acoustically separated from main living", adjacent: ["Bedrooms", "Family bathroom"], notes: "Provide a useful screen wall and acoustic separation." },
  guest: { id: "guest", name: "Guest / adaptable room", minimum: 10, comfortable: 13, generous: 16, width: 3.3, floor: "Ground floor", priority: "preferred", purpose: "Guest, accessible bedroom or flexible room", location: "Quiet ground-floor position", adjacent: ["Bathroom", "Entry"], notes: "Allow useful bed clearances and step-free access where required." },
  alfresco: { id: "covered-outdoor", name: "Covered outdoor entertaining", minimum: 14, comfortable: 22, generous: 30, width: 4.2, floor: "Ground floor external", priority: "preferred", purpose: "Outdoor dining, entertaining and weather protection", location: "Garden edge outside kitchen and living", adjacent: ["Kitchen", "Living / dining", "Landscape"], notes: "Coordinate solar protection, drainage, privacy and planning treatment.", treatment: "external" },
} satisfies Record<string, RoomTemplate>;

const buildTemplates = (project: CanonicalProject) => {
  const bedrooms = Math.max(1, Math.min(16, Math.round(finitePositive(project.ambition.bedrooms, 16) ?? 4)));
  const bathrooms = Math.max(1, Math.min(10, Math.round(finitePositive(project.ambition.bathrooms, 10) ?? 2)));
  const parking = Math.max(0, Math.min(10, Math.round(finitePositive(project.ambition.parking, 10) ?? 0)));
  const storeys = Math.max(1, Math.min(6, Math.round(finitePositive(project.ambition.storeys, 6) ?? 1)));
  const brief = [
    project.ambition.lifestyle_requirements,
    project.ambition.accessibility_requirements,
    project.simulation.client_description,
    project.simulation.additional_instructions,
    project.simulation.natural_light,
    project.simulation.privacy,
    ...project.ambition.special_rooms,
  ].join(" ").toLowerCase();
  const accessible = textIncludes(brief, ["accessible", "adaptable", "step-free", "ground floor bedroom"]);
  const rooms: RoomTemplate[] = [
    makeRoom(baseRooms.entry),
    makeRoom(baseRooms.kitchen),
    makeRoom(baseRooms.living),
    makeRoom(baseRooms.laundry),
  ];
  if (textIncludes(brief, ["pantry", "butler", "scullery"])) rooms.push(makeRoom(baseRooms.pantry));
  if (parking === 1) rooms.push(makeRoom(baseRooms.garageSingle));
  if (parking >= 2) rooms.push(makeRoom(baseRooms.garageDouble, { name: parking > 2 ? `${parking}-car garage allowance` : "Double garage", comfortable: parking > 2 ? 38 + ((parking - 2) * 18) : 38, minimum: parking > 2 ? 34 + ((parking - 2) * 16) : 34 }));
  rooms.push(makeRoom(baseRooms.mainBedroom, { floor: storeys === 1 || accessible ? "Ground floor" : "Upper floor" }));
  if (bedrooms > 1) rooms.push(makeRoom(baseRooms.robe, { floor: storeys === 1 || accessible ? "Ground floor" : "Upper floor" }));
  if (bathrooms >= 2) rooms.push(makeRoom(baseRooms.ensuite, { floor: storeys === 1 || accessible ? "Ground floor" : "Upper floor" }));
  for (let index = 2; index <= bedrooms; index += 1) {
    const adaptable = accessible && index === bedrooms;
    rooms.push(makeRoom(baseRooms.bedroom, {
      id: `bedroom-${index}`,
      name: adaptable ? `Bedroom ${index} / adaptable` : `Bedroom ${index}`,
      floor: storeys === 1 || adaptable ? "Ground floor" : "Upper floor",
      location: adaptable ? "Quiet ground-floor position near an accessible bathroom" : baseRooms.bedroom.location,
    }));
  }
  rooms.push(makeRoom(baseRooms.familyBathroom, { floor: storeys === 1 ? "Ground floor" : "Upper floor" }));
  for (let index = 3; index <= bathrooms; index += 1) rooms.push(makeRoom(baseRooms.bathroom, { id: `bathroom-${index}`, name: `Bathroom ${index}` }));
  if (storeys >= 2) rooms.push(makeRoom(baseRooms.stair));
  rooms.push(makeRoom(baseRooms.circulation), makeRoom(baseRooms.walls), makeRoom(baseRooms.storage), makeRoom(baseRooms.services));
  if (textIncludes(brief, ["study", "home office", "work from home"])) rooms.push(makeRoom(baseRooms.study));
  if (textIncludes(brief, ["media", "rumpus", "second living", "retreat"])) rooms.push(makeRoom(baseRooms.media));
  if (textIncludes(brief, ["guest room", "guest bedroom"]) && !accessible) rooms.push(makeRoom(baseRooms.guest));
  if (textIncludes(brief, ["outdoor entertaining", "alfresco", "covered outdoor"])) rooms.push(makeRoom(baseRooms.alfresco));
  return rooms;
};

const profileArea = (room: RoomTemplate, profile: HouseholdProfile) => (
  profile === "efficient" ? room.minimum : profile === "generous" ? room.generous : room.comfortable
);

const programme = (
  project: CanonicalProject,
  availableGfa: number | undefined,
  profile: HouseholdProfile,
) => {
  const roomOverrides = new Map(project.architect.room_overrides.map((item) => [item.room_id, item]));
  const templates = buildTemplates(project);
  const desired = templates.map((item) => ({ ...item, desired: profileArea(item, profile) }));
  const includedGfa = desired.filter((item) => item.treatment !== "external");
  const minimumGfa = includedGfa.reduce((sum, item) => sum + item.minimum, 0);
  const targetGfa = includedGfa.reduce((sum, item) => sum + item.comfortable, 0);
  const generousGfa = includedGfa.reduce((sum, item) => sum + item.generous, 0);
  const desiredGfa = includedGfa.reduce((sum, item) => sum + item.desired, 0);
  const available = availableGfa ?? Number.POSITIVE_INFINITY;
  const allocation = new Map<string, number>(desired.map((item) => [item.id, item.desired]));

  if (Number.isFinite(available) && desiredGfa > available) {
    let excess = desiredGfa - available;
    for (const priority of ["optional", "preferred"] as const) {
      for (const item of desired.filter((room) => room.priority === priority && room.treatment !== "external")) {
        const current = allocation.get(item.id) ?? item.desired;
        const floor = priority === "optional" ? 0 : item.minimum;
        const reduction = Math.min(excess, Math.max(0, current - floor));
        allocation.set(item.id, current - reduction);
        excess -= reduction;
        if (excess <= 0) break;
      }
      if (excess <= 0) break;
    }
    if (excess > 0) {
      for (const item of desired.filter((room) => room.priority === "required" && room.treatment !== "external")) {
        const current = allocation.get(item.id) ?? item.desired;
        const reduction = Math.min(excess, Math.max(0, current - item.minimum));
        allocation.set(item.id, current - reduction);
        excess -= reduction;
        if (excess <= 0) break;
      }
    }
    // Required rooms are never silently reduced below their stated minimum.
  }

  const rooms: RoomScheduleItem[] = desired.map((item) => {
    const override = roomOverrides.get(item.id);
    const allocated = item.treatment === "external" ? item.desired : round(allocation.get(item.id) ?? item.desired);
    const width = override?.recommended_width_m && override.recommended_width_m > 0 ? override.recommended_width_m : item.width;
    const depth = override?.recommended_depth_m && override.recommended_depth_m > 0 ? override.recommended_depth_m : Math.max(1.2, allocated / width);
    let fit: RoomFitStatus = "unverified";
    if (item.treatment !== "external" && availableGfa !== undefined) {
      fit = allocated >= item.comfortable * 0.98 ? "comfortable" : allocated >= item.minimum * 0.98 ? "efficient" : "below_minimum";
    }
    return {
      id: item.id,
      room_name: item.name,
      floor: override?.floor || item.floor,
      recommended_width_m: round(width),
      recommended_depth_m: round(depth),
      minimum_area_sqm: round(item.minimum),
      target_area_sqm: round(item.desired),
      allocated_area_sqm: round(allocated),
      fit_status: fit,
      priority: override?.priority || item.priority,
      main_purpose: item.purpose,
      suggested_location: item.location,
      adjacency_list: item.adjacent,
      design_notes: item.notes,
      area_treatment: item.treatment || "gfa",
      locked: override?.locked ?? item.priority === "required",
      basis: "Deterministic FRC household-programme allowance; verify final dimensions through measured concept design.",
    };
  });

  const allocatedGfa = rooms.filter((item) => item.area_treatment !== "external").reduce((sum, item) => sum + item.allocated_area_sqm, 0);
  const conflictSpaces = rooms.filter((item) => item.fit_status === "below_minimum").map((item) => item.room_name);
  const status: SiteCapacityResult["programme_fit"]["status"] = availableGfa === undefined
    ? "unverified"
    : availableGfa >= desiredGfa
      ? profile === "efficient" ? "efficient" : "comfortable"
      : availableGfa >= minimumGfa
        ? "efficient"
        : "constrained";
  const suggestedAdjustments = status === "constrained" ? [
    "Remove or defer optional spaces before changing required bedrooms or bathrooms.",
    "Test a more efficient household profile and compact circulation.",
    "Confirm whether an additional compliant storey or corrected planning control changes capacity.",
    "Ask the architect to prepare measured options rather than shrinking every room.",
  ] : status === "efficient" ? [
    "Keep optional rooms flexible or combined.",
    "Protect required rooms at or above their minimum dimensions.",
  ] : [];

  const floorMap = new Map<string, RoomScheduleItem[]>();
  for (const room of rooms) {
    const list = floorMap.get(room.floor) ?? [];
    list.push(room);
    floorMap.set(room.floor, list);
  }
  const floors: FloorAllocation[] = [...floorMap.entries()].map(([floor, items]) => {
    const internal = items.filter((item) => item.area_treatment === "gfa").reduce((sum, item) => sum + item.allocated_area_sqm, 0);
    const external = items.filter((item) => item.area_treatment !== "gfa").reduce((sum, item) => sum + item.allocated_area_sqm, 0);
    return { floor, rooms: items.map((item) => item.room_name), internal_area_sqm: round(internal), external_or_verify_area_sqm: round(external), total_area_sqm: round(internal + external) };
  });

  return {
    rooms,
    floors,
    fit: {
      status,
      requested_net_area_sqm: round(desiredGfa),
      minimum_gross_area_sqm: round(minimumGfa),
      target_gross_area_sqm: round(targetGfa),
      generous_gross_area_sqm: round(generousGfa),
      allocated_programme_area_sqm: round(allocatedGfa),
      available_design_area_sqm: availableGfa === undefined ? undefined : round(availableGfa),
      shortfall_or_surplus_sqm: availableGfa === undefined ? undefined : round(availableGfa - desiredGfa),
      conflict_spaces: conflictSpaces,
      suggested_adjustments: suggestedAdjustments,
      explanation: availableGfa === undefined
        ? "The household programme is deterministic, but capacity cannot be established until a meaningful planning control is available."
        : status === "comfortable"
          ? `The ${profile} household programme fits within the recommended concept-design target.`
          : status === "efficient"
            ? "The required programme can fit, but preferred and optional spaces need efficient planning."
            : "The required programme does not fit the current preliminary capacity. Required rooms have not been silently reduced below minimum targets.",
    },
  };
};

const pathways = (
  project: CanonicalProject,
  capacity: number | undefined,
  fit: SiteCapacityResult["programme_fit"],
): DevelopmentPathway[] => {
  const existing = Boolean(project.property.existing_structures.trim());
  const commonMissing = ["Measured existing-building plans", "Registered survey", "Title, easements and restrictions"];
  const retainedApplicability = existing ? "possibly_applicable" : "not_supported_by_current_information";
  return [
    {
      option_name: "Retain and renovate",
      applicability: retainedApplicability,
      estimated_retained_area_sqm: null,
      potential_new_area_sqm: 0,
      household_programme_fit: existing ? "Cannot be assessed until the retained building is measured." : "No existing dwelling was identified in the brief.",
      design_flexibility: "low",
      relative_planning_complexity: "moderate",
      relative_cost: project.roadmap.budget ? "lower" : "unknown",
      major_advantages: ["May retain useful existing fabric", "Can reduce demolition and embodied carbon where the building is suitable"],
      major_limitations: ["Existing structure and layout constrain the programme", "Hidden-condition risk remains until investigation"],
      missing_information: commonMissing,
      required_investigations: ["Measured building survey", "Structural and hazardous-material review"],
      recommended_next_step: "Measure and assess the existing dwelling before committing to retention.",
    },
    {
      option_name: "Renovate and extend",
      applicability: retainedApplicability,
      estimated_retained_area_sqm: null,
      potential_new_area_sqm: capacity ?? null,
      household_programme_fit: existing ? fit.explanation : "Requires confirmation that suitable existing fabric is present.",
      design_flexibility: "medium",
      relative_planning_complexity: "higher",
      relative_cost: project.roadmap.budget ? "moderate" : "unknown",
      major_advantages: ["Can preserve valued fabric while targeting new space", "Allows staged design responses"],
      major_limitations: ["Old and new structure, levels and services must be reconciled", "The retained area is not yet known"],
      missing_information: commonMissing,
      required_investigations: ["Measured building survey", "Structural, services and planning review"],
      recommended_next_step: "Prepare a retain/remove plan and test the extension against verified controls.",
    },
    {
      option_name: "Knock-down rebuild",
      applicability: "applicable",
      estimated_retained_area_sqm: 0,
      potential_new_area_sqm: capacity ?? null,
      household_programme_fit: fit.explanation,
      design_flexibility: "high",
      relative_planning_complexity: "moderate",
      relative_cost: project.roadmap.budget ? "higher" : "unknown",
      major_advantages: ["Highest freedom to align structure, orientation and household programme", "Clearer integration of accessibility and services"],
      major_limitations: ["Demolition, temporary accommodation and full new-build approvals are required", "Heritage or environmental constraints may limit demolition"],
      missing_information: ["Demolition constraints", ...commonMissing],
      required_investigations: ["Demolition/heritage review", "Survey, geotechnical, arborist and services investigations"],
      recommended_next_step: "Test one measured concept within the verified planning envelope.",
    },
  ];
};

export function calculateSiteCapacity(project: CanonicalProject): SiteCapacityResult {
  const architectOverrides = project.architect.overrides as ArchitectOverrideRecord[];
  const clientArea = finitePositive(project.property.client_site_area || project.property.site_area);
  const mappedArea = finitePositive(project.property.mapped_site_area);
  const geometryArea = finitePositive(project.property.calculated_geometry_area);
  const surveyedOverride = [...project.architect.overrides].reverse().find((item) => item.field === "surveyed_site_area");
  const surveyedArea = finitePositive(surveyedOverride?.selected_value ?? project.property.surveyed_site_area);
  const areaUsed = surveyedArea ?? mappedArea ?? clientArea;
  const areaSource = surveyedArea !== null ? "surveyed" : mappedArea !== null ? "mapped" : clientArea !== null ? "client" : "missing";
  const conflicts: string[] = [];
  const warnings: string[] = [];
  const verification = new Set<string>();
  const areaPairs: Array<[string, number | null, string, number | null]> = [
    ["surveyed", surveyedArea, "mapped", mappedArea],
    ["surveyed", surveyedArea, "client-supplied", clientArea],
    ["mapped", mappedArea, "client-supplied", clientArea],
  ];
  for (const [firstLabel, first, secondLabel, second] of areaPairs) {
    const difference = areaConflict(first, second);
    if (difference > 0.03) conflicts.push(`${firstLabel} and ${secondLabel} site areas differ by ${round(difference * 100)}%.`);
  }
  if (areaSource === "client") verification.add("Confirm the client-supplied area against the selected NSW cadastral lot and registered survey.");
  if (areaSource === "mapped") verification.add("Confirm the mapped cadastral area against the deposited plan and registered survey.");

  const widthOverride = [...project.architect.overrides].reverse().find((item) => item.field === "site_width");
  const depthOverride = [...project.architect.overrides].reverse().find((item) => item.field === "site_depth");
  const width = finitePositive(widthOverride?.selected_value ?? project.property.site_width, 10_000);
  const depth = finitePositive(depthOverride?.selected_value ?? project.property.site_depth, 10_000);
  const requestedStoreys = Math.max(1, Math.min(6, Math.round(finitePositive(project.ambition.storeys, 6) ?? 1)));

  const fsrValue = numericPlanningValue(project, "fsr", project.planning.floor_space_ratio, "Floor space ratio", "ratio", ratio);
  const coverageValue = numericPlanningValue(project, "site_coverage", project.planning.site_coverage, "Site coverage", "ratio", ratio);
  const landscapeValue = numericPlanningValue(project, "landscaped_area", project.planning.landscaped_area, "Landscaped area", "ratio", ratio);
  const heightValue = numericPlanningValue(project, "height_limit", project.planning.height_limit, "Height limit", "m");
  const permittedStoreysValue = numericPlanningValue(project, "permitted_storeys", "", "Permitted storeys", "count");
  const frontValue = numericPlanningValue(project, "front_setback", project.planning.front_setback, "Front setback", "m");
  const rearValue = numericPlanningValue(project, "rear_setback", project.planning.rear_setback, "Rear setback", "m");
  const leftValue = numericPlanningValue(project, "left_side_setback", project.planning.side_setback_left, "Left side setback", "m");
  const rightValue = numericPlanningValue(project, "right_side_setback", project.planning.side_setback_right, "Right side setback", "m");
  const minimumLotValue = numericPlanningValue(project, "minimum_lot_size", project.planning.minimum_lot_size, "Minimum lot size", "m²");
  const privateOpen = areaUsed === null ? { sourced: emptyValue("Private open space"), numeric: null } : numericPlanningValue(project, "private_open_space", project.planning.private_open_space, "Private open space", "m²", (value) => areaOrPercent(value, areaUsed));

  const parcelAreaValue: SourcedPlanningValue<number | string | boolean> = surveyedArea !== null ? {
    value: surveyedArea, unit: "m²", sourceName: "Registered survey / architect review", sourceDocument: surveyedOverride?.source_document, retrievedAt: surveyedOverride?.timestamp, status: surveyedOverride?.verified ? "verified" : "architect-entered",
  } : mappedArea !== null ? normaliseSource(project.planning.source_values.parcel_area, {
    value: mappedArea, unit: "m²", sourceName: "NSW selected cadastral parcel", sourceFeatureId: project.property.selected_parcel_id, status: "mapped",
  }) : clientArea !== null ? {
    value: clientArea, unit: "m²", sourceName: "Client brief", status: "client-supplied",
  } : emptyValue("Parcel area");
  if (conflicts.length) parcelAreaValue.status = "conflict";

  const siteWidthValue = mappedValue(project, "site_width", width, "Site width", "m");
  const siteDepthValue = mappedValue(project, "site_depth", depth, "Site depth", "m");
  const heritageValue = mappedValue(project, "heritage", project.planning.heritage || null, "Heritage");
  const floodingValue = mappedValue(project, "flooding", project.planning.flooding || null, "Flood planning");
  const bushfireValue = mappedValue(project, "bushfire", project.planning.bushfire || null, "Bush fire prone land");

  const planningValues: SiteCapacityResult["planning_values"] = {
    parcel_area: parcelAreaValue,
    site_width: siteWidthValue,
    site_depth: siteDepthValue,
    fsr: fsrValue.sourced,
    site_coverage: coverageValue.sourced,
    front_setback: frontValue.sourced,
    rear_setback: rearValue.sourced,
    left_side_setback: leftValue.sourced,
    right_side_setback: rightValue.sourced,
    landscaped_area: landscapeValue.sourced,
    private_open_space: privateOpen.sourced,
    height_limit: heightValue.sourced,
    permitted_storeys: permittedStoreysValue.sourced,
    minimum_lot_size: minimumLotValue.sourced,
    heritage: heritageValue,
    flooding: floodingValue,
    bushfire: bushfireValue,
  };

  const effectiveStoreys = permittedStoreysValue.numeric !== null
    ? Math.min(requestedStoreys, Math.max(1, Math.floor(permittedStoreysValue.numeric)))
    : requestedStoreys;
  if (permittedStoreysValue.numeric !== null && requestedStoreys > permittedStoreysValue.numeric) warnings.push(`Requested storeys exceed the architect-entered or sourced permitted-storey control.`);
  if (heightValue.numeric !== null && permittedStoreysValue.numeric === null) verification.add("Confirm a compliant storey count from the height control, roof form and floor-to-floor dimensions; it is not inferred automatically.");

  let setbackWidth: number | undefined;
  let setbackDepth: number | undefined;
  let setbackCap: number | undefined;
  const calculationSteps: string[] = [];
  const lotType = project.architect.confirmed_lot_type || project.property.lot_type || "unknown";
  const rectangularity = finitePositive(project.property.parcel_rectangularity, 1);
  const irregularity = project.property.parcel_irregularity || "unknown";
  const envelopeProvisional = lotType !== "standard" || irregularity !== "regular" || !project.architect.front_boundary_confirmed;
  if (width !== null && depth !== null && frontValue.numeric !== null && rearValue.numeric !== null && leftValue.numeric !== null && rightValue.numeric !== null) {
    setbackWidth = Math.max(0, width - leftValue.numeric - rightValue.numeric);
    setbackDepth = Math.max(0, depth - frontValue.numeric - rearValue.numeric);
    setbackCap = setbackWidth * setbackDepth;
    calculationSteps.push(`Provisional setback rectangle: (${round(width)} − ${round(leftValue.numeric)} − ${round(rightValue.numeric)}) m × (${round(depth)} − ${round(frontValue.numeric)} − ${round(rearValue.numeric)}) m = ${round(setbackCap)} m².`);
    if (envelopeProvisional) verification.add("Confirm the front, rear and side boundaries before relying on the setback envelope.");
  } else {
    verification.add("Confirm surveyed width, depth and all primary setbacks before calculating a setback envelope.");
  }

  const fsrCap = areaUsed !== null && fsrValue.numeric !== null ? areaUsed * fsrValue.numeric : undefined;
  const coverageCap = areaUsed !== null && coverageValue.numeric !== null ? areaUsed * coverageValue.numeric : undefined;
  const landscapeAllowance = areaUsed !== null && landscapeValue.numeric !== null ? areaUsed * landscapeValue.numeric : undefined;
  const landscapeCap = areaUsed !== null && (landscapeAllowance !== undefined || privateOpen.numeric !== null)
    ? areaUsed - Math.max(landscapeAllowance ?? 0, privateOpen.numeric ?? 0)
    : undefined;
  if (fsrCap !== undefined) calculationSteps.push(`FSR cap: ${round(areaUsed ?? 0)} m² × ${round(fsrValue.numeric ?? 0, 3)} = ${round(fsrCap)} m² GFA.`);
  if (coverageCap !== undefined) calculationSteps.push(`Site-coverage footprint cap: ${round(areaUsed ?? 0)} m² × ${round((coverageValue.numeric ?? 0) * 100)}% = ${round(coverageCap)} m².`);
  if (landscapeCap !== undefined) calculationSteps.push(`Landscape/private-open-space footprint cap: ${round(areaUsed ?? 0)} m² − ${round(Math.max(landscapeAllowance ?? 0, privateOpen.numeric ?? 0))} m² = ${round(landscapeCap)} m².`);

  const footprintCandidates = [
    ["Setback envelope", setbackCap],
    ["Site coverage", coverageCap],
    ["Landscaped/private open space", landscapeCap],
  ].filter((item): item is [string, number] => typeof item[1] === "number" && Number.isFinite(item[1]));
  const selectedFootprint = footprintCandidates.length ? Math.min(...footprintCandidates.map((item) => item[1])) : undefined;
  const storeyCap = selectedFootprint !== undefined ? selectedFootprint * effectiveStoreys : undefined;
  if (storeyCap !== undefined) calculationSteps.push(`Footprint × effective storeys: ${round(selectedFootprint ?? 0)} m² × ${effectiveStoreys} = ${round(storeyCap)} m².`);
  const gfaCandidates = [["Floor space ratio", fsrCap], ["Footprint × storeys", storeyCap]].filter((item): item is [string, number] => typeof item[1] === "number" && Number.isFinite(item[1]));
  const preliminaryMax = gfaCandidates.length ? Math.min(...gfaCandidates.map((item) => item[1])) : undefined;
  const recommended = preliminaryMax === undefined ? undefined : preliminaryMax * 0.9;
  const limitingControls = [
    ...footprintCandidates.filter((item) => selectedFootprint !== undefined && Math.abs(item[1] - selectedFootprint) < 0.5).map((item) => item[0]),
    ...gfaCandidates.filter((item) => preliminaryMax !== undefined && Math.abs(item[1] - preliminaryMax) < 0.5).map((item) => item[0]),
  ];
  if (preliminaryMax !== undefined) calculationSteps.push(`Preliminary maximum GFA is the lowest available GFA cap: ${round(preliminaryMax)} m².`, `Recommended concept-design target: ${round(preliminaryMax)} m² × 90% = ${round(recommended ?? 0)} m².`);

  const profile = project.architect.household_profile || "comfortable";
  const roomProgramme = programme(project, recommended, profile);
  const garageArea = roomProgramme.rooms.filter((item) => item.id === "garage").reduce((sum, item) => sum + item.allocated_area_sqm, 0);
  const coveredOutdoor = roomProgramme.rooms.filter((item) => item.id === "covered-outdoor").reduce((sum, item) => sum + item.allocated_area_sqm, 0);

  const controls: CapacityControl[] = (Object.entries(planningValues) as Array<[PlanningValueKey, SourcedPlanningValue<number | string | boolean>]>).map(([key, planningValue]) => ({
    key,
    label: key.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase()),
    planning_value: planningValue,
    used_in_calculation: ["parcel_area", "site_width", "site_depth", "fsr", "site_coverage", "front_setback", "rear_setback", "left_side_setback", "right_side_setback", "landscaped_area", "private_open_space", "permitted_storeys"].includes(key) && planningValue.value !== null,
  }));
  const controlsUsed = controls.filter((control) => control.used_in_calculation).map((control) => control.label);
  const missingControls = controls.filter((control) => control.planning_value.status === "missing").map((control) => control.label);
  const invalidNumeric = [fsrValue, coverageValue, landscapeValue, heightValue, permittedStoreysValue, frontValue, rearValue, leftValue, rightValue, minimumLotValue]
    .filter((item) => item.sourced.value !== null && item.numeric === null);
  if (invalidNumeric.length) conflicts.push("One or more supplied planning controls are malformed, negative, zero or outside a credible range.");
  if (areaUsed === null) warnings.push("No surveyed, selected mapped or client-supplied site area is available.");
  if (preliminaryMax === undefined) warnings.push("A preliminary maximum GFA cannot be calculated from site area alone; at least one meaningful GFA or footprint control is required.");
  if (width !== null && depth !== null && areaUsed !== null) {
    const widthDepthDifference = ((width * depth) - areaUsed) / areaUsed;
    if (widthDepthDifference > 0.08) warnings.push(`Width × depth exceeds the selected parcel area by ${round(widthDepthDifference * 100)}%; the parcel may be tapered, irregular or the dimensions may be provisional.`);
  }
  if (heritageValue.value) verification.add("Confirm the extent and implications of the mapped heritage layer with the architect or planner.");
  if (floodingValue.value) verification.add("Obtain council flood information and specialist advice; a mapped hit is not a site-specific flood-level assessment.");
  if (bushfireValue.value) verification.add("Obtain a bush-fire assessment where required; mapped prone-land data is not a BAL assessment.");
  verification.add("Confirm title, easements, restrictions, trees, services, stormwater, access, BASIX and NCC requirements.");
  verification.add("Confirm how garages, stairs, voids and covered outdoor areas are treated in GFA.");

  const usedVerified = controls.filter((control) => control.used_in_calculation).every((control) => ["verified", "architect-entered"].includes(control.planning_value.status));
  let status: SiteCapacityResult["status"] = preliminaryMax === undefined ? "insufficient_data" : "calculated_from_provisional_inputs";
  if (conflicts.length) status = "conflict_requires_review";
  else if (preliminaryMax !== undefined && usedVerified && areaSource === "surveyed") status = "calculated_from_verified_inputs";
  const statusLabel = status === "calculated_from_verified_inputs" ? "Calculated from verified inputs"
    : status === "calculated_from_provisional_inputs" ? "Calculated from provisional inputs"
      : status === "conflict_requires_review" ? "Conflict requires architect review"
        : "Insufficient planning data";
  const confidence = status === "calculated_from_verified_inputs" ? "high" : status === "calculated_from_provisional_inputs" && gfaCandidates.length > 1 ? "medium" : "low";

  const widthDepthDifferencePercent = width !== null && depth !== null && areaUsed !== null ? round((((width * depth) - areaUsed) / areaUsed) * 100) : null;
  const parcelAnalysis = {
    selectedParcelId: project.property.selected_parcel_id || null,
    geometrySource: project.property.parcel_geometry_source || null,
    geometry: project.property.parcel_geometry,
    geometryAreaSqm: geometryArea,
    boundingWidthM: width,
    boundingDepthM: depth,
    rectangularity,
    irregularity,
    widthDepthAreaDifferencePercent: widthDepthDifferencePercent,
    lotType,
    frontBoundaryConfirmed: project.architect.front_boundary_confirmed,
    envelopeStatus: envelopeProvisional ? "provisional" as const : "indicative" as const,
    envelopeNote: envelopeProvisional
      ? "The setback envelope is provisional. Lot type, irregularity or front-boundary orientation requires architect confirmation."
      : "Indicative envelope from the supplied dimensions and controls; confirm against a registered survey.",
  };

  const result: SiteCapacityResult = {
    calculator_version: 2,
    status,
    status_label: statusLabel,
    confidence_status: confidence,
    areas: {
      clientSiteAreaSqm: clientArea,
      mappedParcelAreaSqm: mappedArea,
      calculatedGeometryAreaSqm: geometryArea,
      surveyedSiteAreaSqm: surveyedArea,
      areaUsedByCalculatorSqm: areaUsed,
      areaUsedSource: areaSource,
    },
    area_source: areaSource,
    site_area_sqm: areaUsed ?? undefined,
    site_width_m: width ?? undefined,
    site_depth_m: depth ?? undefined,
    requested_storeys: requestedStoreys,
    effective_storeys: effectiveStoreys,
    planning_values: planningValues,
    controls,
    controls_used: controlsUsed,
    missing_controls: missingControls,
    conflicts,
    envelope: {
      setback_envelope_width_m: setbackWidth === undefined ? undefined : round(setbackWidth),
      setback_envelope_depth_m: setbackDepth === undefined ? undefined : round(setbackDepth),
      setback_footprint_cap_sqm: setbackCap === undefined ? undefined : round(setbackCap),
      coverage_footprint_cap_sqm: coverageCap === undefined ? undefined : round(coverageCap),
      landscaped_area_footprint_cap_sqm: landscapeCap === undefined ? undefined : round(landscapeCap),
      selected_footprint_cap_sqm: selectedFootprint === undefined ? undefined : round(selectedFootprint),
      fsr_gfa_cap_sqm: fsrCap === undefined ? undefined : round(fsrCap),
      storey_gfa_cap_sqm: storeyCap === undefined ? undefined : round(storeyCap),
      preliminary_max_gfa_sqm: preliminaryMax === undefined ? undefined : round(preliminaryMax),
      recommended_design_gfa_sqm: recommended === undefined ? undefined : round(recommended),
      estimated_usable_internal_sqm: recommended === undefined ? undefined : round(recommended * 0.82),
      garage_area_sqm: round(garageArea),
      covered_outdoor_area_sqm: round(coveredOutdoor),
      landscape_allowance_sqm: landscapeAllowance === undefined ? undefined : round(landscapeAllowance),
      private_open_space_allowance_sqm: privateOpen.numeric === null ? undefined : round(privateOpen.numeric),
    },
    parcel_analysis: parcelAnalysis,
    limiting_control: limitingControls[limitingControls.length - 1] ?? null,
    limiting_controls: [...new Set(limitingControls)],
    calculation_steps: calculationSteps,
    assumptions: [
      "A 10% concept-design buffer is retained below the arithmetic maximum.",
      "No missing control is inferred from the zoning name.",
      "Room areas are deterministic programme allowances, not construction drawings.",
    ],
    warnings,
    verification_required: [...verification],
    household_profile: profile,
    programme_fit: roomProgramme.fit,
    room_programme: roomProgramme.rooms,
    floor_allocations: roomProgramme.floors,
    development_pathways: [],
    architect_overrides: architectOverrides,
    architect_notes: project.architect.notes,
  };
  result.development_pathways = pathways(project, recommended, result.programme_fit);
  return result;
}
