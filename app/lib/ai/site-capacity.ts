import type { CanonicalProject } from "../project-data";
import type {
  CapacityControl,
  RoomFitStatus,
  RoomScheduleItem,
  SiteCapacityResult,
} from "./contracts";

const round = (value: number, places = 1) => {
  const factor = 10 ** places;
  return Math.round((value + Number.EPSILON) * factor) / factor;
};

const clamp = (value: number, minimum: number, maximum: number) =>
  Math.min(maximum, Math.max(minimum, value));

const parseFirstNumber = (value: unknown): number | undefined => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value !== "string") return undefined;
  const match = value.replaceAll(",", "").match(/-?\d+(?:\.\d+)?/);
  if (!match) return undefined;
  const parsed = Number(match[0]);
  return Number.isFinite(parsed) ? parsed : undefined;
};

const parsePositiveNumber = (value: unknown): number | undefined => {
  const parsed = parseFirstNumber(value);
  return parsed !== undefined && parsed > 0 ? parsed : undefined;
};

const parseRatio = (value: unknown): number | undefined => {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) {
    return value > 3 ? value / 100 : value;
  }
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim().toLowerCase();
  if (!trimmed) return undefined;

  const colon = trimmed.match(/(\d+(?:\.\d+)?)\s*:\s*(\d+(?:\.\d+)?)/);
  if (colon) {
    const numerator = Number(colon[1]);
    const denominator = Number(colon[2]);
    return denominator > 0 ? numerator / denominator : undefined;
  }

  const parsed = parsePositiveNumber(trimmed);
  if (parsed === undefined) return undefined;
  if (trimmed.includes("%") || parsed > 3) return parsed / 100;
  return parsed;
};

const parseAreaOrPercent = (
  value: unknown,
  siteAreaSqm: number,
): number | undefined => {
  if (typeof value !== "string" && typeof value !== "number") return undefined;
  const text = String(value).trim();
  if (!text) return undefined;
  const parsed = parsePositiveNumber(text);
  if (parsed === undefined) return undefined;
  if (text.includes("%")) return siteAreaSqm * (parsed / 100);
  return parsed;
};

const includesAny = (value: string, terms: string[]) => {
  const lower = value.toLowerCase();
  return terms.some((term) => lower.includes(term.toLowerCase()));
};

const isVerified = (project: CanonicalProject, aliases: string[]) =>
  project.planning.verified_items.some((item) => includesAny(item, aliases));

const makeControl = (
  label: string,
  rawValue: string,
  parsedValue: number | undefined,
  unit: CapacityControl["unit"],
  verified: boolean,
  source = "Project planning data",
): CapacityControl => ({
  label,
  raw_value: rawValue || "",
  value: parsedValue,
  unit,
  status: parsedValue === undefined ? "missing" : verified ? "verified" : "provisional",
  source,
});

const readCombinedSetback = (
  combined: string,
  label: "front" | "rear" | "left" | "right",
): number | undefined => {
  const normalised = combined.toLowerCase();
  const patterns: Record<typeof label, RegExp[]> = {
    front: [
      /front(?:age)?\s*(?:setback)?\s*[:=-]?\s*(\d+(?:\.\d+)?)\s*m?/i,
    ],
    rear: [
      /rear\s*(?:setback)?\s*[:=-]?\s*(\d+(?:\.\d+)?)\s*m?/i,
    ],
    left: [
      /left\s*(?:side)?\s*(?:setback)?\s*[:=-]?\s*(\d+(?:\.\d+)?)\s*m?/i,
      /side\s*1\s*[:=-]?\s*(\d+(?:\.\d+)?)\s*m?/i,
    ],
    right: [
      /right\s*(?:side)?\s*(?:setback)?\s*[:=-]?\s*(\d+(?:\.\d+)?)\s*m?/i,
      /side\s*2\s*[:=-]?\s*(\d+(?:\.\d+)?)\s*m?/i,
    ],
  };
  for (const pattern of patterns[label]) {
    const match = normalised.match(pattern);
    if (match) return Number(match[1]);
  }

  // A single "side setback" value is applied to both sides only when no
  // explicit left/right value exists.
  if (label === "left" || label === "right") {
    const side = normalised.match(/side\s*(?:setback)?\s*[:=-]?\s*(\d+(?:\.\d+)?)\s*m?/i);
    if (side) return Number(side[1]);
  }
  return undefined;
};

const pickArea = (project: CanonicalProject) => {
  const surveyed = parsePositiveNumber(project.property.surveyed_site_area);
  const mapped = parsePositiveNumber(project.property.mapped_site_area);
  const client = parsePositiveNumber(
    project.property.client_site_area || project.property.site_area,
  );

  if (surveyed !== undefined) {
    return {
      value: surveyed,
      source: "surveyed" as const,
      raw: project.property.surveyed_site_area,
    };
  }
  if (mapped !== undefined) {
    return {
      value: mapped,
      source: "mapped" as const,
      raw: project.property.mapped_site_area,
    };
  }
  if (client !== undefined) {
    return {
      value: client,
      source: "client" as const,
      raw: project.property.client_site_area || project.property.site_area,
    };
  }
  return { value: undefined, source: "missing" as const, raw: "" };
};

type RoomTemplate = {
  key: string;
  name: string;
  minimum: number;
  target: number;
  maximum: number;
  preferredWidth: number;
  floor: string;
  location: string;
  purpose: string;
  relationships: string;
  notes: string;
  areaTreatment?: "gfa" | "external" | "verify";
};

const room = (
  template: RoomTemplate,
  overrides: Partial<RoomTemplate> = {},
): RoomTemplate => ({ ...template, ...overrides });

const templateLibrary = {
  entry: {
    key: "entry",
    name: "Entry",
    minimum: 4,
    target: 6,
    maximum: 9,
    preferredWidth: 1.8,
    floor: "Ground floor",
    location: "Street-facing arrival zone",
    purpose: "Sheltered arrival, orientation and everyday storage",
    relationships: "Connect directly to the circulation spine, stair and living areas",
    notes: "Allow a weather-protected threshold, coat storage and a clear sightline into the home.",
    areaTreatment: "gfa",
  },
  kitchen: {
    key: "kitchen",
    name: "Kitchen",
    minimum: 13,
    target: 18,
    maximum: 24,
    preferredWidth: 3.6,
    floor: "Ground floor",
    location: "Central to living, dining and outdoor entertaining",
    purpose: "Daily food preparation, storage and family gathering",
    relationships: "Direct connection to dining, pantry, laundry route and outdoor area",
    notes: "Maintain practical work zones, generous bench space and controlled daylight.",
    areaTreatment: "gfa",
  },
  livingDining: {
    key: "living-dining",
    name: "Living / dining",
    minimum: 34,
    target: 45,
    maximum: 58,
    preferredWidth: 6.2,
    floor: "Ground floor",
    location: "Best solar orientation and garden edge",
    purpose: "Primary family, dining and entertaining space",
    relationships: "Open to the kitchen and covered outdoor area while retaining furniture walls",
    notes: "Use openings for cross-ventilation, garden outlook and privacy rather than glazing every wall.",
    areaTreatment: "gfa",
  },
  laundry: {
    key: "laundry",
    name: "Laundry / utility",
    minimum: 5,
    target: 8,
    maximum: 11,
    preferredWidth: 2.4,
    floor: "Ground floor",
    location: "Service side of the home",
    purpose: "Laundry, cleaning, linen and household storage",
    relationships: "Near kitchen, garage and external drying area",
    notes: "Provide bench space, tall storage and direct external access where practical.",
    areaTreatment: "gfa",
  },
  mainBedroom: {
    key: "main-bedroom",
    name: "Main bedroom",
    minimum: 14,
    target: 18,
    maximum: 24,
    preferredWidth: 4.2,
    floor: "Upper floor",
    location: "Quiet private edge with the best available outlook",
    purpose: "Primary sleeping room",
    relationships: "Connect to robe and ensuite and buffer from noisy living areas",
    notes: "Retain a full bed wall, circulation around the bed, daylight, ventilation and privacy.",
    areaTreatment: "gfa",
  },
  walkInRobe: {
    key: "walk-in-robe",
    name: "Walk-in robe",
    minimum: 4,
    target: 6,
    maximum: 8,
    preferredWidth: 2.2,
    floor: "Upper floor",
    location: "Between or beside the main bedroom and ensuite",
    purpose: "Primary clothes and personal storage",
    relationships: "Connect directly to the main bedroom without becoming a circulation corridor",
    notes: "Allow useful hanging depth on both sides only where a clear central aisle remains.",
    areaTreatment: "gfa",
  },
  ensuite: {
    key: "ensuite",
    name: "Main ensuite",
    minimum: 4.5,
    target: 6,
    maximum: 8.5,
    preferredWidth: 2.4,
    floor: "Upper floor",
    location: "Private side of the main bedroom suite",
    purpose: "Primary bathroom",
    relationships: "Connect to the main bedroom and robe with acoustic separation",
    notes: "Coordinate shower, vanity, toilet privacy, ventilation and waterproofing zones.",
    areaTreatment: "gfa",
  },
  bedroom: {
    key: "bedroom",
    name: "Bedroom",
    minimum: 10,
    target: 12.5,
    maximum: 15,
    preferredWidth: 3.2,
    floor: "Upper floor",
    location: "Grouped within a quiet private bedroom zone",
    purpose: "Permanent bedroom with study and storage potential",
    relationships: "Near a family bathroom and linen storage",
    notes: "Keep a practical bed wall, wardrobe depth and clear circulation to the window.",
    areaTreatment: "gfa",
  },
  familyBathroom: {
    key: "family-bathroom",
    name: "Family bathroom",
    minimum: 5,
    target: 7,
    maximum: 9,
    preferredWidth: 2.5,
    floor: "Upper floor",
    location: "Within the private bedroom zone",
    purpose: "Shared family bathing",
    relationships: "Near secondary bedrooms with acoustic separation from living spaces",
    notes: "Allow a bath where requested, practical storage, ventilation and separate-use potential.",
    areaTreatment: "gfa",
  },
  additionalBathroom: {
    key: "additional-bathroom",
    name: "Additional bathroom",
    minimum: 3.5,
    target: 5.5,
    maximum: 7,
    preferredWidth: 2.2,
    floor: "Ground floor",
    location: "Near guest, study and living zones",
    purpose: "Guest and everyday bathroom",
    relationships: "Accessible from common areas without opening directly to dining",
    notes: "Keep circulation compact and allow future adaptability where requested.",
    areaTreatment: "gfa",
  },
  storage: {
    key: "storage",
    name: "General storage / linen",
    minimum: 3,
    target: 5,
    maximum: 8,
    preferredWidth: 1.8,
    floor: "Distributed",
    location: "At circulation nodes on both levels",
    purpose: "Linen, cleaning, seasonal and household storage",
    relationships: "Near bedrooms, laundry and entry",
    notes: "Distribute storage rather than relying on one distant cupboard.",
    areaTreatment: "gfa",
  },
  stair: {
    key: "stair",
    name: "Stair and upper landing",
    minimum: 4.5,
    target: 6,
    maximum: 8,
    preferredWidth: 2,
    floor: "Both levels",
    location: "Central circulation spine with daylight where possible",
    purpose: "Safe vertical circulation",
    relationships: "Connect arrival, living and private zones without cutting through rooms",
    notes: "Final geometry must comply with the NCC and be coordinated with structure and headroom.",
    areaTreatment: "gfa",
  },
  garageSingle: {
    key: "garage",
    name: "Single garage",
    minimum: 20,
    target: 23,
    maximum: 28,
    preferredWidth: 3.6,
    floor: "Ground floor",
    location: "Street and driveway edge",
    purpose: "One vehicle, bins and limited household storage",
    relationships: "Secure internal connection to entry or service zone",
    notes: "Confirm door, turning, storage and boundary-clearance requirements.",
    areaTreatment: "verify",
  },
  garageDouble: {
    key: "garage",
    name: "Double garage",
    minimum: 34,
    target: 38,
    maximum: 44,
    preferredWidth: 6,
    floor: "Ground floor",
    location: "Street and driveway edge",
    purpose: "Two vehicles, bins and household storage",
    relationships: "Secure internal connection to entry or service zone",
    notes: "Confirm clear door width, vehicle manoeuvring, storage and whether garage area is included in FSR.",
    areaTreatment: "verify",
  },
  study: {
    key: "study",
    name: "Study",
    minimum: 7,
    target: 10,
    maximum: 13,
    preferredWidth: 3,
    floor: "Ground floor",
    location: "Near entry but acoustically separated from living",
    purpose: "Focused work, homework or flexible guest use",
    relationships: "Close to entry and a bathroom without becoming a passage",
    notes: "Allow a full desk wall, storage and controlled outlook.",
    areaTreatment: "gfa",
  },
  pantry: {
    key: "pantry",
    name: "Walk-in / butler's pantry",
    minimum: 3.5,
    target: 5.5,
    maximum: 8,
    preferredWidth: 2.1,
    floor: "Ground floor",
    location: "Directly behind or beside the kitchen",
    purpose: "Food, appliance and preparation storage",
    relationships: "Connect to kitchen and service route from garage",
    notes: "Avoid oversizing the pantry at the expense of kitchen daylight and circulation.",
    areaTreatment: "gfa",
  },
  media: {
    key: "media",
    name: "Media / second living room",
    minimum: 11,
    target: 15,
    maximum: 20,
    preferredWidth: 3.8,
    floor: "Ground or upper floor",
    location: "Acoustically separated from the main living room",
    purpose: "Secondary family retreat or media use",
    relationships: "Near bedrooms or living without duplicating circulation",
    notes: "Provide a useful screen wall and acoustic separation.",
    areaTreatment: "gfa",
  },
  guest: {
    key: "guest",
    name: "Guest / adaptable room",
    minimum: 10,
    target: 13,
    maximum: 16,
    preferredWidth: 3.3,
    floor: "Ground floor",
    location: "Near entry and an accessible bathroom",
    purpose: "Guest, future accessible bedroom or flexible room",
    relationships: "Separate from primary living noise and close to a bathroom",
    notes: "Allow practical bed clearances and consider future step-free access.",
    areaTreatment: "gfa",
  },
  powder: {
    key: "powder",
    name: "Powder room",
    minimum: 1.8,
    target: 2.5,
    maximum: 3.5,
    preferredWidth: 1.2,
    floor: "Ground floor",
    location: "Near living and entry but screened from dining",
    purpose: "Guest toilet and handwashing",
    relationships: "Accessible from common areas",
    notes: "Provide privacy, ventilation and compliant clearances.",
    areaTreatment: "gfa",
  },
  alfresco: {
    key: "alfresco",
    name: "Covered outdoor entertaining",
    minimum: 14,
    target: 22,
    maximum: 32,
    preferredWidth: 4.2,
    floor: "Ground floor external",
    location: "Garden edge directly outside kitchen and living",
    purpose: "Outdoor dining, entertaining and weather protection",
    relationships: "Direct connection to kitchen, living and landscape",
    notes: "Coordinate solar protection, drainage, privacy and whether covered area counts toward planning calculations.",
    areaTreatment: "external",
  },
} satisfies Record<string, RoomTemplate>;

const buildRoomTemplates = (project: CanonicalProject): RoomTemplate[] => {
  const bedrooms = Math.max(1, Math.round(parsePositiveNumber(project.ambition.bedrooms) || 4));
  const bathrooms = Math.max(1, Math.round(parsePositiveNumber(project.ambition.bathrooms) || 2));
  const parking = Math.max(0, Math.round(parsePositiveNumber(project.ambition.parking) || 0));
  const storeys = Math.max(1, Math.round(parsePositiveNumber(project.ambition.storeys) || 1));
  const combinedBrief = [
    project.ambition.lifestyle_requirements,
    project.simulation.client_description,
    project.simulation.additional_instructions,
    ...project.ambition.special_rooms,
  ].join(" ").toLowerCase();

  const rooms: RoomTemplate[] = [
    room(templateLibrary.entry),
    room(templateLibrary.kitchen),
    room(templateLibrary.livingDining),
    room(templateLibrary.laundry),
  ];

  if (
    includesAny(combinedBrief, ["pantry", "butler", "scullery"]) ||
    project.ambition.special_rooms.some((item) => includesAny(item, ["pantry", "butler"]))
  ) {
    rooms.push(room(templateLibrary.pantry));
  }

  if (parking === 1) rooms.push(room(templateLibrary.garageSingle));
  if (parking >= 2) rooms.push(room(templateLibrary.garageDouble));

  const accessibleGroundBedroom =
    includesAny(combinedBrief, ["ground-floor bedroom", "ground floor bedroom", "adaptable bedroom", "accessible bedroom"]) ||
    includesAny(project.ambition.accessibility_requirements, ["ground", "adaptable", "accessible"]);

  rooms.push(
    room(templateLibrary.mainBedroom, {
      floor: storeys === 1 || accessibleGroundBedroom ? "Ground floor" : "Upper floor",
    }),
  );

  if (bedrooms >= 2) rooms.push(room(templateLibrary.walkInRobe));
  if (bathrooms >= 2) rooms.push(room(templateLibrary.ensuite));

  for (let index = 2; index <= bedrooms; index += 1) {
    const isGroundGuest = accessibleGroundBedroom && index === bedrooms;
    rooms.push(
      room(templateLibrary.bedroom, {
        key: `bedroom-${index}`,
        name: isGroundGuest ? `Bedroom ${index} / adaptable guest room` : `Bedroom ${index}`,
        floor: storeys === 1 || isGroundGuest ? "Ground floor" : "Upper floor",
        location: isGroundGuest
          ? "Quiet ground-floor position near an accessible bathroom"
          : templateLibrary.bedroom.location,
        notes: isGroundGuest
          ? "Keep this room step-free where practical and allow adaptable furniture clearances."
          : templateLibrary.bedroom.notes,
      }),
    );
  }

  rooms.push(
    room(templateLibrary.familyBathroom, {
      floor: storeys === 1 ? "Ground floor" : "Upper floor",
    }),
  );

  const bathroomsAlreadyRepresented = bathrooms >= 2 ? 2 : 1;
  for (let index = bathroomsAlreadyRepresented + 1; index <= bathrooms; index += 1) {
    rooms.push(
      room(templateLibrary.additionalBathroom, {
        key: `additional-bathroom-${index}`,
        name: `Bathroom ${index}`,
      }),
    );
  }

  if (storeys >= 2) rooms.push(room(templateLibrary.stair));
  rooms.push(room(templateLibrary.storage));

  const specialText = project.ambition.special_rooms.join(" ").toLowerCase();
  if (includesAny(combinedBrief, ["study", "home office"]) || includesAny(specialText, ["study", "office"])) {
    rooms.push(room(templateLibrary.study));
  }
  if (includesAny(combinedBrief, ["media", "second living", "rumpus", "retreat"]) || includesAny(specialText, ["media", "rumpus", "retreat"])) {
    rooms.push(room(templateLibrary.media));
  }
  if (includesAny(combinedBrief, ["guest room"]) || includesAny(specialText, ["guest"])) {
    rooms.push(room(templateLibrary.guest));
  }
  if (includesAny(combinedBrief, ["powder room", "guest toilet"]) || includesAny(specialText, ["powder"])) {
    rooms.push(room(templateLibrary.powder));
  }
  if (
    includesAny(combinedBrief, ["outdoor entertaining", "alfresco", "covered outdoor"]) ||
    includesAny(specialText, ["alfresco", "outdoor"])
  ) {
    rooms.push(room(templateLibrary.alfresco));
  }

  return rooms.slice(0, 30);
};

const dimensionString = (area: number, preferredWidth: number) => {
  if (area <= 0) return "Not allocated";
  const width = clamp(preferredWidth, 1.2, Math.max(1.2, Math.sqrt(area)));
  const depth = area / width;
  return `${round(width, 1)} m × ${round(depth, 1)} m`;
};

const createRoomSchedule = (
  project: CanonicalProject,
  availableGrossAreaSqm: number | undefined,
  efficiency: number,
) => {
  const templates = buildRoomTemplates(project);
  const gfaRooms = templates.filter((item) => item.areaTreatment !== "external");
  const externalRooms = templates.filter((item) => item.areaTreatment === "external");

  const netMinimum = gfaRooms.reduce((sum, item) => sum + item.minimum, 0);
  const netTarget = gfaRooms.reduce((sum, item) => sum + item.target, 0);
  const netMaximum = gfaRooms.reduce((sum, item) => sum + item.maximum, 0);
  const grossMinimum = netMinimum / efficiency;
  const grossTarget = netTarget / efficiency;
  const grossMaximum = netMaximum / efficiency;

  const availableNet = availableGrossAreaSqm !== undefined
    ? Math.max(0, availableGrossAreaSqm * efficiency)
    : undefined;

  let programmeStatus: SiteCapacityResult["programme_fit"]["status"] = "unverified";
  if (availableGrossAreaSqm !== undefined) {
    programmeStatus = availableGrossAreaSqm >= grossTarget
      ? "comfortable"
      : availableGrossAreaSqm >= grossMinimum
        ? "efficient"
        : "constrained";
  }

  const allocationRatio = availableNet === undefined
    ? 1
    : availableNet >= netTarget
      ? 1
      : availableNet >= netMinimum
        ? (availableNet - netMinimum) / Math.max(1, netTarget - netMinimum)
        : availableNet / Math.max(1, netMinimum);

  const schedule: RoomScheduleItem[] = templates.map((item) => {
    const isExternal = item.areaTreatment === "external";
    const allocated = isExternal || availableNet === undefined
      ? item.target
      : availableNet >= netMinimum
        ? item.minimum + (item.target - item.minimum) * allocationRatio
        : item.minimum * allocationRatio;

    let fitStatus: RoomFitStatus = "unverified";
    if (!isExternal && availableNet !== undefined) {
      fitStatus = allocated >= item.target * 0.95
        ? "comfortable"
        : allocated >= item.minimum * 0.98
          ? "efficient"
          : "below_minimum";
    }

    return {
      space_name: item.name,
      suggested_location: item.location,
      approximate_area_range: `${round(item.minimum)}–${round(item.maximum)} m²`,
      main_purpose: item.purpose,
      relationship_to_nearby_spaces: item.relationships,
      design_notes: item.notes,
      suggested_floor: item.floor,
      recommended_dimensions: dimensionString(allocated, item.preferredWidth),
      minimum_area_sqm: round(item.minimum),
      target_area_sqm: round(item.target),
      allocated_area_sqm: round(allocated),
      fit_status: isExternal ? "unverified" : fitStatus,
      area_treatment: item.areaTreatment || "gfa",
      basis: isExternal
        ? "External concept allowance; confirm planning treatment."
        : "Deterministic FRC practical-space target; architect to verify final dimensions and compliance.",
    };
  });

  return {
    schedule,
    programmeFit: {
      status: programmeStatus,
      requested_net_area_sqm: round(netTarget),
      minimum_gross_area_sqm: round(grossMinimum),
      target_gross_area_sqm: round(grossTarget),
      generous_gross_area_sqm: round(grossMaximum),
      available_design_area_sqm: availableGrossAreaSqm !== undefined
        ? round(availableGrossAreaSqm)
        : undefined,
      shortfall_or_surplus_sqm: availableGrossAreaSqm !== undefined
        ? round(availableGrossAreaSqm - grossTarget)
        : undefined,
      explanation: availableGrossAreaSqm === undefined
        ? "The room programme is sized to practical household targets, but a site-capacity limit could not be established from the supplied planning controls."
        : programmeStatus === "comfortable"
          ? "The practical target programme fits within the recommended design allowance before detailed planning and consultant checks."
          : programmeStatus === "efficient"
            ? "The brief can potentially fit, but several rooms will need efficient dimensions, compact circulation or reduced optional spaces."
            : "The minimum practical programme exceeds the current design allowance. Reduce the brief, add a compliant storey, or verify whether the planning inputs are incomplete.",
    },
    externalAreaTarget: round(
      externalRooms.reduce((sum, item) => sum + item.target, 0),
    ),
  };
};

export function calculateSiteCapacity(project: CanonicalProject): SiteCapacityResult {
  const area = pickArea(project);
  const width = parsePositiveNumber(project.property.site_width);
  const depth = parsePositiveNumber(project.property.site_depth);
  const requestedStoreys = Math.max(
    1,
    Math.round(parsePositiveNumber(project.ambition.storeys) || 1),
  );

  const assumptions: string[] = [];
  const verificationRequired = new Set<string>();
  const warnings: string[] = [];
  const calculationSteps: string[] = [];

  if (area.source === "client") {
    verificationRequired.add("Confirm the client-entered site area against NSW cadastral data, title and survey.");
  }
  if (area.source === "mapped") {
    verificationRequired.add("Confirm mapped parcel area against the deposited plan and registered survey.");
  }

  const clientArea = parsePositiveNumber(
    project.property.client_site_area || project.property.site_area,
  );
  const mappedArea = parsePositiveNumber(project.property.mapped_site_area);
  if (clientArea && mappedArea) {
    const difference = Math.abs(clientArea - mappedArea) / Math.max(clientArea, mappedArea);
    if (difference > 0.03) {
      warnings.push(
        `Mapped and client-supplied site areas differ by ${round(difference * 100)}%. Keep both values visible and verify the selected parcel.`,
      );
    }
  }

  if (area.value === undefined) {
    const roomProgramme = createRoomSchedule(project, undefined, 0.82);
    return {
      calculator_version: 1,
      status: "insufficient_data",
      status_label: "Site area required",
      area_source: area.source,
      site_area_sqm: undefined,
      site_width_m: width,
      site_depth_m: depth,
      requested_storeys: requestedStoreys,
      effective_storeys: requestedStoreys,
      controls: [],
      envelope: {},
      limiting_controls: [],
      calculation_steps: [],
      assumptions,
      warnings: ["No usable site area was supplied by the NSW lookup, survey or client form."],
      verification_required: [
        "Obtain a matched NSW cadastral parcel area or registered survey area.",
        "Confirm FSR, setbacks, site coverage, landscaped area and height controls.",
      ],
      confidence: "low",
      programme_fit: roomProgramme.programmeFit,
      room_schedule: roomProgramme.schedule,
      external_area_target_sqm: roomProgramme.externalAreaTarget,
    };
  }

  const siteArea = area.value;
  const fsr = parseRatio(project.planning.floor_space_ratio);
  const coverageRatio = parseRatio(project.planning.site_coverage);
  const landscapeRatio = parseRatio(project.planning.landscaped_area);
  const privateOpenSpaceArea = parseAreaOrPercent(
    project.planning.private_open_space,
    siteArea,
  );
  const heightLimit = parsePositiveNumber(project.planning.height_limit);

  const combinedSetbacks = project.planning.setbacks || "";
  const frontSetback =
    parsePositiveNumber(project.planning.front_setback) ??
    readCombinedSetback(combinedSetbacks, "front");
  const rearSetback =
    parsePositiveNumber(project.planning.rear_setback) ??
    readCombinedSetback(combinedSetbacks, "rear");
  const leftSetback =
    parsePositiveNumber(project.planning.side_setback_left) ??
    readCombinedSetback(combinedSetbacks, "left");
  const rightSetback =
    parsePositiveNumber(project.planning.side_setback_right) ??
    readCombinedSetback(combinedSetbacks, "right");

  const controls: CapacityControl[] = [
    makeControl(
      "Floor space ratio",
      project.planning.floor_space_ratio,
      fsr,
      "ratio",
      isVerified(project, ["floor space ratio", "fsr"]),
    ),
    makeControl(
      "Maximum site coverage",
      project.planning.site_coverage,
      coverageRatio,
      "ratio",
      isVerified(project, ["site coverage"]),
    ),
    makeControl(
      "Minimum landscaped area",
      project.planning.landscaped_area,
      landscapeRatio,
      "ratio",
      isVerified(project, ["landscaped area", "landscape"]),
    ),
    makeControl(
      "Private open space",
      project.planning.private_open_space,
      privateOpenSpaceArea,
      "sqm",
      isVerified(project, ["private open space"]),
    ),
    makeControl(
      "Maximum building height",
      project.planning.height_limit,
      heightLimit,
      "m",
      isVerified(project, ["height"]),
    ),
    makeControl(
      "Front setback",
      project.planning.front_setback || combinedSetbacks,
      frontSetback,
      "m",
      isVerified(project, ["front setback", "setbacks"]),
    ),
    makeControl(
      "Rear setback",
      project.planning.rear_setback || combinedSetbacks,
      rearSetback,
      "m",
      isVerified(project, ["rear setback", "setbacks"]),
    ),
    makeControl(
      "Left side setback",
      project.planning.side_setback_left || combinedSetbacks,
      leftSetback,
      "m",
      isVerified(project, ["side setback", "setbacks"]),
    ),
    makeControl(
      "Right side setback",
      project.planning.side_setback_right || combinedSetbacks,
      rightSetback,
      "m",
      isVerified(project, ["side setback", "setbacks"]),
    ),
  ];

  const averageStoreyHeight = 3.1;
  const heightSupportedStoreys = heightLimit
    ? Math.max(1, Math.floor(heightLimit / averageStoreyHeight))
    : undefined;
  const effectiveStoreys = heightSupportedStoreys
    ? Math.min(requestedStoreys, heightSupportedStoreys)
    : requestedStoreys;

  if (heightSupportedStoreys && requestedStoreys > heightSupportedStoreys) {
    warnings.push(
      `The requested ${requestedStoreys} storeys exceed the calculator's indicative ${heightSupportedStoreys}-storey allowance derived from a ${heightLimit} m height control. Roof form and floor-to-floor heights require architect verification.`,
    );
  }

  const fsrGfaCap = fsr !== undefined ? siteArea * fsr : undefined;
  if (fsrGfaCap !== undefined && fsr !== undefined) {
    calculationSteps.push(
      `FSR cap: ${round(siteArea)} m² × ${round(fsr, 3)} = ${round(fsrGfaCap)} m² gross floor area.`,
    );
  } else {
    verificationRequired.add("Confirm the applicable floor space ratio or other gross-floor-area control.");
  }

  const coverageFootprintCap =
    coverageRatio !== undefined ? siteArea * coverageRatio : undefined;
  if (coverageFootprintCap !== undefined && coverageRatio !== undefined) {
    calculationSteps.push(
      `Coverage cap: ${round(siteArea)} m² × ${round(coverageRatio * 100)}% = ${round(coverageFootprintCap)} m² maximum footprint before other controls.`,
    );
  } else {
    verificationRequired.add("Confirm maximum site coverage.");
  }

  const landscapedAreaRequired =
    landscapeRatio !== undefined ? siteArea * landscapeRatio : undefined;
  if (landscapedAreaRequired !== undefined && landscapeRatio !== undefined) {
    calculationSteps.push(
      `Landscaped-area allowance: ${round(siteArea)} m² × ${round(landscapeRatio * 100)}% = ${round(landscapedAreaRequired)} m² minimum.`,
    );
  } else {
    verificationRequired.add("Confirm the minimum landscaped-area requirement.");
  }

  const openSpaceReservation = Math.max(
    landscapedAreaRequired || 0,
    privateOpenSpaceArea || 0,
  );
  const openSpaceFootprintCap = openSpaceReservation > 0
    ? Math.max(0, siteArea - openSpaceReservation)
    : undefined;

  let setbackEnvelopeWidth: number | undefined;
  let setbackEnvelopeDepth: number | undefined;
  let setbackFootprintCap: number | undefined;

  if (
    width !== undefined &&
    depth !== undefined &&
    frontSetback !== undefined &&
    rearSetback !== undefined &&
    leftSetback !== undefined &&
    rightSetback !== undefined
  ) {
    setbackEnvelopeWidth = Math.max(0, width - leftSetback - rightSetback);
    setbackEnvelopeDepth = Math.max(0, depth - frontSetback - rearSetback);
    setbackFootprintCap = setbackEnvelopeWidth * setbackEnvelopeDepth;
    calculationSteps.push(
      `Setback rectangle: (${round(width)} − ${round(leftSetback)} − ${round(rightSetback)}) m × (${round(depth)} − ${round(frontSetback)} − ${round(rearSetback)}) m = ${round(setbackFootprintCap)} m².`,
    );
  } else {
    verificationRequired.add(
      "Confirm surveyed lot width, lot depth and all four primary setbacks before relying on the footprint calculation.",
    );
  }

  const footprintCandidates = [
    { label: "Site coverage", value: coverageFootprintCap },
    { label: "Setback rectangle", value: setbackFootprintCap },
    { label: "Landscaped/private open-space reservation", value: openSpaceFootprintCap },
  ].filter((item): item is { label: string; value: number } =>
    item.value !== undefined && Number.isFinite(item.value),
  );

  const selectedFootprintCap = footprintCandidates.length
    ? Math.min(...footprintCandidates.map((item) => item.value))
    : undefined;

  const storeyGfaCap = selectedFootprintCap !== undefined
    ? selectedFootprintCap * effectiveStoreys
    : undefined;
  if (storeyGfaCap !== undefined && selectedFootprintCap !== undefined) {
    calculationSteps.push(
      `Storey-envelope cap: ${round(selectedFootprintCap)} m² footprint × ${effectiveStoreys} storey${effectiveStoreys === 1 ? "" : "s"} = ${round(storeyGfaCap)} m².`,
    );
  }

  const gfaCandidates = [
    { label: "Floor space ratio", value: fsrGfaCap },
    { label: "Footprint × storeys", value: storeyGfaCap },
  ].filter((item): item is { label: string; value: number } =>
    item.value !== undefined && Number.isFinite(item.value),
  );

  const preliminaryMaxGfa = gfaCandidates.length
    ? Math.min(...gfaCandidates.map((item) => item.value))
    : undefined;

  const limitingControls: string[] = [];
  if (selectedFootprintCap !== undefined) {
    for (const candidate of footprintCandidates) {
      if (Math.abs(candidate.value - selectedFootprintCap) <= 0.5) {
        limitingControls.push(candidate.label);
      }
    }
  }
  if (preliminaryMaxGfa !== undefined) {
    for (const candidate of gfaCandidates) {
      if (Math.abs(candidate.value - preliminaryMaxGfa) <= 0.5) {
        limitingControls.push(candidate.label);
      }
    }
  }

  const designBufferRatio = 0.9;
  const efficiency = 0.82;
  const recommendedDesignGfa = preliminaryMaxGfa !== undefined
    ? preliminaryMaxGfa * designBufferRatio
    : undefined;
  const estimatedUsableInternal = recommendedDesignGfa !== undefined
    ? recommendedDesignGfa * efficiency
    : undefined;

  if (recommendedDesignGfa !== undefined) {
    assumptions.push(
      `A ${round((1 - designBufferRatio) * 100)}% design-development buffer is retained below the arithmetic maximum.`,
      `Usable-room allowance is estimated at ${round(efficiency * 100)}% of gross area to allow for walls, circulation, structure and services.`,
    );
  }

  const roomProgramme = createRoomSchedule(
    project,
    recommendedDesignGfa,
    efficiency,
  );

  const usedControls = controls.filter((control) => control.value !== undefined);
  const allUsedVerified =
    usedControls.length > 0 &&
    usedControls.every((control) => control.status === "verified");
  const areaVerified = area.source === "surveyed";

  let status: SiteCapacityResult["status"] = "preliminary";
  let statusLabel = "Preliminary capacity";
  let confidence: SiteCapacityResult["confidence"] = "medium";

  if (preliminaryMaxGfa === undefined) {
    status = "insufficient_data";
    statusLabel = "Planning controls required";
    confidence = "low";
  } else if (allUsedVerified && areaVerified) {
    status = "calculated_from_verified_inputs";
    statusLabel = "Calculated from verified inputs";
    confidence = "high";
  } else if (gfaCandidates.length === 1 || footprintCandidates.length < 2) {
    confidence = "low";
  }

  if (!project.planning.minimum_lot_size) {
    verificationRequired.add("Confirm minimum lot size where the proposal type depends on it.");
  }
  verificationRequired.add("Confirm easements, restrictions, trees, services, stormwater and access constraints.");
  verificationRequired.add("Confirm how garages, voids, stairs, balconies and covered outdoor areas are treated in GFA.");
  verificationRequired.add("Confirm overshadowing, privacy, parking, deep-soil, BASIX and NCC requirements.");
  verificationRequired.add("Have the lead architect test the result against a registered detail survey.");

  if (preliminaryMaxGfa !== undefined) {
    calculationSteps.push(
      `Preliminary maximum GFA is the lowest available gross-area cap: ${round(preliminaryMaxGfa)} m².`,
      `Recommended concept-design target: ${round(preliminaryMaxGfa)} m² × ${round(designBufferRatio * 100)}% = ${round(recommendedDesignGfa || 0)} m².`,
    );
  }

  return {
    calculator_version: 1,
    status,
    status_label: statusLabel,
    area_source: area.source,
    site_area_sqm: round(siteArea),
    site_width_m: width !== undefined ? round(width) : undefined,
    site_depth_m: depth !== undefined ? round(depth) : undefined,
    requested_storeys: requestedStoreys,
    effective_storeys: effectiveStoreys,
    controls,
    envelope: {
      setback_envelope_width_m: setbackEnvelopeWidth !== undefined
        ? round(setbackEnvelopeWidth)
        : undefined,
      setback_envelope_depth_m: setbackEnvelopeDepth !== undefined
        ? round(setbackEnvelopeDepth)
        : undefined,
      setback_footprint_cap_sqm: setbackFootprintCap !== undefined
        ? round(setbackFootprintCap)
        : undefined,
      coverage_footprint_cap_sqm: coverageFootprintCap !== undefined
        ? round(coverageFootprintCap)
        : undefined,
      open_space_footprint_cap_sqm: openSpaceFootprintCap !== undefined
        ? round(openSpaceFootprintCap)
        : undefined,
      selected_footprint_cap_sqm: selectedFootprintCap !== undefined
        ? round(selectedFootprintCap)
        : undefined,
      fsr_gfa_cap_sqm: fsrGfaCap !== undefined ? round(fsrGfaCap) : undefined,
      storey_gfa_cap_sqm: storeyGfaCap !== undefined
        ? round(storeyGfaCap)
        : undefined,
      preliminary_max_gfa_sqm: preliminaryMaxGfa !== undefined
        ? round(preliminaryMaxGfa)
        : undefined,
      recommended_design_gfa_sqm: recommendedDesignGfa !== undefined
        ? round(recommendedDesignGfa)
        : undefined,
      estimated_usable_internal_sqm: estimatedUsableInternal !== undefined
        ? round(estimatedUsableInternal)
        : undefined,
      landscaped_area_required_sqm: landscapedAreaRequired !== undefined
        ? round(landscapedAreaRequired)
        : undefined,
      private_open_space_required_sqm: privateOpenSpaceArea !== undefined
        ? round(privateOpenSpaceArea)
        : undefined,
    },
    limiting_controls: Array.from(new Set(limitingControls)),
    calculation_steps: calculationSteps,
    assumptions,
    warnings,
    verification_required: Array.from(verificationRequired),
    confidence,
    programme_fit: roomProgramme.programmeFit,
    room_schedule: roomProgramme.schedule,
    external_area_target_sqm: roomProgramme.externalAreaTarget,
  };
}
