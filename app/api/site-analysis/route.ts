type ArcFeature = {
  attributes?: Record<string, unknown>;
  geometry?: { rings?: number[][][] };
};

type ArcResponse = {
  features?: ArcFeature[];
  error?: { code?: number; message?: string; details?: string[] };
};

type AddressMatch = {
  addressPoint?: { centreX?: string | number; centreY?: string | number };
  propid?: string | number;
  houseNumberString?: string | number;
  roadName?: string;
  roadType?: string;
  suburbName?: string;
  postCode?: string | number;
  council?: string;
  addressId?: string | number;
  addressID?: string | number;
  id?: string | number;
};

type AddressServiceResponse = {
  addressResult?: { addresses?: AddressMatch[] };
};

const ADDRESS_SERVICE = "https://mapsq.six.nsw.gov.au/services/public/Address_Location";
const PLANNING_SERVICE = "https://mapprod3.environment.nsw.gov.au/arcgis/rest/services/ePlanning/Planning_Portal_Principal_Planning/MapServer";
const HAZARD_SERVICE = "https://mapprod3.environment.nsw.gov.au/arcgis/rest/services/ePlanning/Planning_Portal_Hazard/MapServer";
const PROPERTY_SERVICE = "https://portal.spatial.nsw.gov.au/server/rest/services/NSW_Land_Parcel_Property_Theme/FeatureServer/12";
const LOT_SERVICE = "https://portal.spatial.nsw.gov.au/server/rest/services/NSW_Land_Parcel_Property_Theme/FeatureServer/8";

const roadTypes: Record<string, string> = {
  st: "Street", street: "Street", rd: "Road", road: "Road", ave: "Avenue", avenue: "Avenue",
  dr: "Drive", drive: "Drive", cct: "Circuit", circuit: "Circuit", cres: "Crescent", crescent: "Crescent",
  cl: "Close", close: "Close", pl: "Place", place: "Place", pde: "Parade", parade: "Parade",
  way: "Way", lane: "Lane", ln: "Lane", tce: "Terrace", terrace: "Terrace", hwy: "Highway", highway: "Highway",
  ct: "Court", court: "Court", gr: "Grove", grove: "Grove", blvd: "Boulevard", boulevard: "Boulevard",
  bvd: "Boulevarde", boulevarde: "Boulevarde", esp: "Esplanade", esplanade: "Esplanade",
  rise: "Rise", trail: "Trail", trl: "Trail", mews: "Mews", square: "Square", sq: "Square",
};

function parseAddress(input: string) {
  const cleaned = input.replace(/\s+/g, " ").trim();
  const match = cleaned.match(/^(\d+[A-Za-z]?)\s+(.+?)\s+(Street|St|Road|Rd|Avenue|Ave|Drive|Dr|Circuit|Cct|Crescent|Cres|Close|Cl|Place|Pl|Parade|Pde|Way|Lane|Ln|Terrace|Tce|Highway|Hwy|Court|Ct|Grove|Gr|Boulevard|Blvd|Boulevarde|Bvd|Esplanade|Esp|Rise|Trail|Trl|Mews|Square|Sq),?\s+(.+?)(?:,?\s+NSW)?\s+(\d{4})$/i);
  if (!match) return null;
  const [, houseNumber, roadName, rawRoadType, rawSuburb, postcode] = match;
  const suburb = rawSuburb.replace(/,?\s+NSW$/i, "").trim();
  return { houseNumber, roadName, roadType: roadTypes[rawRoadType.toLowerCase()] ?? rawRoadType, suburb, postcode };
}

function positiveNumber(value: unknown) {
  const numeric = typeof value === "string" ? Number(value.replace(/,/g, "")) : Number(value);
  return Number.isFinite(numeric) && numeric > 0 ? numeric : null;
}

function featureId(attributes?: Record<string, unknown> | null) {
  if (!attributes) return null;
  const value = attributes.OBJECTID ?? attributes.ObjectID ?? attributes.objectid ?? attributes.FID ?? attributes.id;
  return value === undefined || value === null ? null : String(value);
}

async function getJson(url: string) {
  const response = await fetch(url, {
    headers: { Accept: "application/json" },
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`NSW service returned HTTP ${response.status}`);
  const data = await response.json() as ArcResponse & Record<string, unknown>;
  if (data.error) {
    const details = [data.error.message, ...(data.error.details ?? [])].filter(Boolean).join(" · ");
    throw new Error(`NSW ArcGIS service error ${data.error.code ?? ""}${details ? `: ${details}` : ""}`.trim());
  }
  return data;
}

async function safeGetJson(url: string, label: string) {
  try {
    return await getJson(url);
  } catch (error) {
    console.warn(`[site-analysis] Optional ${label} lookup failed`, error);
    return null;
  }
}

async function queryPlanningLayer(layer: number, longitude: number, latitude: number) {
  const params = new URLSearchParams({
    geometry: `${longitude},${latitude}`,
    geometryType: "esriGeometryPoint",
    inSR: "4283",
    spatialRel: "esriSpatialRelIntersects",
    outFields: "*",
    returnGeometry: "false",
    f: "json",
  });
  const data = await getJson(`${PLANNING_SERVICE}/${layer}/query?${params}`);
  return (data.features?.[0] as ArcFeature | undefined)?.attributes ?? null;
}

async function safePlanningLayer(layer: number, label: string, longitude: number, latitude: number) {
  try {
    return await queryPlanningLayer(layer, longitude, latitude);
  } catch (error) {
    console.warn(`[site-analysis] Optional ${label} layer ${layer} failed`, error);
    return null;
  }
}

async function safeSpatialLayer(service: string, layer: number, label: string, longitude: number, latitude: number) {
  const params = new URLSearchParams({
    geometry: `${longitude},${latitude}`,
    geometryType: "esriGeometryPoint",
    inSR: "4283",
    spatialRel: "esriSpatialRelIntersects",
    outFields: "*",
    returnGeometry: "false",
    f: "json",
  });
  const data = await safeGetJson(`${service}/${layer}/query?${params}`, label);
  return (data?.features?.[0] as ArcFeature | undefined)?.attributes ?? null;
}

function signedRingAreaSqm(ring: number[][]) {
  const points = ring.filter(([longitude, latitude]) => Number.isFinite(longitude) && Number.isFinite(latitude));
  if (points.length < 4) return 0;
  const originLongitude = points.reduce((sum, [longitude]) => sum + longitude, 0) / points.length;
  const originLatitude = points.reduce((sum, [, latitude]) => sum + latitude, 0) / points.length;
  const latitudeRadians = originLatitude * Math.PI / 180;
  const metres = points.map(([longitude, latitude]) => ({
    x: (longitude - originLongitude) * 111320 * Math.cos(latitudeRadians),
    y: (latitude - originLatitude) * 110540,
  }));
  let twiceArea = 0;
  for (let index = 0; index < metres.length; index += 1) {
    const current = metres[index];
    const next = metres[(index + 1) % metres.length];
    twiceArea += current.x * next.y - next.x * current.y;
  }
  return twiceArea / 2;
}

function geometryAreaSqm(rings: number[][][]) {
  if (!rings.length) return null;
  const signedArea = rings.reduce((total, ring) => total + signedRingAreaSqm(ring), 0);
  const area = Math.abs(signedArea);
  return Number.isFinite(area) && area > 0 ? Math.round(area * 10) / 10 : null;
}

function largestRing(rings: number[][][]) {
  return rings
    .map((ring) => ({ ring, area: Math.abs(signedRingAreaSqm(ring)) }))
    .sort((first, second) => second.area - first.area)[0]?.ring ?? [];
}

function parcelDimensions(ring: number[][]) {
  const points = ring.filter((point) => Number.isFinite(point[0]) && Number.isFinite(point[1]));
  if (points.length < 4) return null;
  const originLongitude = points.reduce((sum, [longitude]) => sum + longitude, 0) / points.length;
  const originLatitude = points.reduce((sum, [, latitude]) => sum + latitude, 0) / points.length;
  const latitudeRadians = originLatitude * Math.PI / 180;
  const metres = points.map(([longitude, latitude]) => ({
    x: (longitude - originLongitude) * 111320 * Math.cos(latitudeRadians),
    y: (latitude - originLatitude) * 110540,
  }));

  let best: { width: number; depth: number; area: number } | null = null;
  for (let index = 1; index < metres.length; index += 1) {
    const previous = metres[index - 1];
    const current = metres[index];
    const angle = Math.atan2(current.y - previous.y, current.x - previous.x);
    const cosine = Math.cos(-angle);
    const sine = Math.sin(-angle);
    const rotated = metres.map(({ x, y }) => ({ x: x * cosine - y * sine, y: x * sine + y * cosine }));
    const xs = rotated.map((point) => point.x);
    const ys = rotated.map((point) => point.y);
    const width = Math.max(...xs) - Math.min(...xs);
    const depth = Math.max(...ys) - Math.min(...ys);
    const rectangleArea = width * depth;
    if (width > 0 && depth > 0 && (!best || rectangleArea < best.area)) best = { width, depth, area: rectangleArea };
  }
  if (!best) return null;
  return {
    frontage: Math.round(Math.min(best.width, best.depth) * 10) / 10,
    depth: Math.round(Math.max(best.width, best.depth) * 10) / 10,
    source: "Approximate dimensions calculated from the selected NSW cadastral lot boundary; confirm against deposited plan and registered survey.",
  };
}

function parcelShapeMetrics(area: number | null, dimensions: ReturnType<typeof parcelDimensions>) {
  if (!area || !dimensions) return { rectangularity: null, irregularity: "unknown" as const, widthDepthAreaDifferencePercent: null };
  const rectangleArea = dimensions.frontage * dimensions.depth;
  const rectangularity = rectangleArea > 0 ? Math.min(1, area / rectangleArea) : null;
  const widthDepthAreaDifferencePercent = rectangleArea > 0 ? Math.round(((rectangleArea - area) / area) * 1000) / 10 : null;
  const irregularity = rectangularity === null ? "unknown" as const
    : rectangularity >= 0.88 ? "regular" as const
      : rectangularity >= 0.72 ? "possibly_irregular" as const
        : "irregular" as const;
  return {
    rectangularity: rectangularity === null ? null : Math.round(rectangularity * 1000) / 1000,
    irregularity,
    widthDepthAreaDifferencePercent,
  };
}

function planningField(value: unknown, sourceLayer: string, attributes: Record<string, unknown> | null, status?: string) {
  return {
    value: value ?? null,
    sourceName: "NSW Planning Portal Principal Planning layers",
    sourceLayer,
    sourceFeatureId: featureId(attributes),
    retrievedAt: new Date().toISOString(),
    status: status ?? (value === null || value === undefined || value === "" ? "not_mapped" : "mapped"),
  };
}

function opportunitiesForZone(zone: string) {
  const category = zone.toUpperCase();
  if (category === "R2") return [
    ["Dwelling house", "Zone-led opportunity", "Test the current Housing Code for CDC or the local DA controls"],
    ["Alterations + additions", "Zone-led opportunity", "CDC or DA depends on the full proposal and excluded-land tests"],
    ["Secondary dwelling", "Investigate", "Floor area, access, principal-dwelling and SEPP tests apply"],
    ["Dual occupancy", "State policy opportunity", "Dual occupancies are permitted in R2 across NSW; the proposal must still satisfy the applicable approval standards and exclusions"],
  ];
  if (category.startsWith("R")) return [
    ["Dwelling house", "Likely zone-compatible", "Subject to the LEP, DCP, site constraints and approval"],
    ["Alterations + additions", "Likely zone-compatible", "CDC or DA pathway depends on the proposal"],
    ["Secondary dwelling", "Investigate", "Lot, floor-area, access and SEPP tests apply"],
    ["Dual occupancy", "Investigate", "Permissibility and minimum lot/frontage rules vary by LEP"],
  ];
  if (category.startsWith("RU")) return [
    ["Dwelling house", "Investigate", "Existing holding and dwelling-entitlement tests may apply"],
    ["Agricultural use", "Zone-led opportunity", "Confirm the land-use table and environmental constraints"],
    ["Secondary dwelling", "Investigate", "SEPP and servicing tests apply"],
  ];
  if (category.startsWith("E") || category.startsWith("C")) return [
    ["Dwelling house", "Specialist review", "Environmental zoning and overlays may significantly constrain development"],
    ["Alterations + additions", "Investigate", "Ecology, bushfire, flood and landscape controls may apply"],
  ];
  return [["Development potential", "Planner review required", "Confirm the zone land-use table and local controls"]];
}

type ProjectInputs = {
  address?: string;
  streetAddress?: string;
  suburb?: string;
  postcode?: string;
  knownLandArea?: number;
  frontage?: number;
  depth?: number;
  projectGoal?: "home" | "dual" | "renovation";
  storeys?: number;
  bedrooms?: number;
  bathrooms?: number;
  parking?: number;
  orientation?: "north-rear" | "north-front" | "north-side" | "unknown";
  lotType?: "standard" | "corner" | "battleaxe";
  slope?: "flat" | "gentle" | "steep";
  existingDwelling?: boolean;
  estimatedCost?: number;
  proposedExcavationDepth?: number;
  excavationBoundaryDistance?: number;
  poolCapacity?: number;
};

function calculateRegulatoryScreen(input: {
  [key: string]: unknown;
  mappedGfaCap: number | null;
  proposedExcavationDepth: number;
  excavationBoundaryDistance: number;
  estimatedCost: number;
  projectGoal: string;
}) {
  return {
    controls: [
      { value: "Setbacks and site coverage were not returned as complete numeric controls. Confirm the council DCP or applicable code.", status: "review" },
      { value: input.mappedGfaCap ? `${input.mappedGfaCap.toLocaleString()} m² mapped FSR arithmetic before other controls.` : "No numeric FSR map hit; no floor-area limit has been inferred.", status: input.mappedGfaCap ? "screened" : "review" },
      { value: `Client-entered cut ${input.proposedExcavationDepth} m at ${input.excavationBoundaryDistance} m from a boundary; survey, geotechnical and structural review required.`, status: "review" },
      { value: input.projectGoal === "renovation" && input.estimatedCost > 0 ? "Confirm the current BASIX threshold and scope against the client-entered budget." : "Confirm current project-specific BASIX and sustainability requirements.", status: "review" },
    ],
  };
}

function projectGuidance(zone: string, heritage: boolean, inputs: ProjectInputs, mappedHeight: number | null, mappedFsr: number | null, council: string, officialArea: number | null) {
  const codeZone = zone.toUpperCase();
  const housingCode = ["R1", "R2", "R3", "R4", "RU5"].includes(codeZone);
  const ruralHousingCode = ["R5", "RU1", "RU2", "RU3", "RU4", "RU6"].includes(codeZone);
  const dualCodeZone = ["R1", "R2", "R3", "RU5"].includes(codeZone);
  const area = Number(inputs.knownLandArea || 0);
  const frontage = Number(inputs.frontage || 0);
  const goal = inputs.projectGoal ?? "home";
  const height = mappedHeight;
  const desiredBuild = goal === "dual" ? "dual occupancy" : goal === "renovation" ? "alterations and additions" : "new dwelling house";

  let pathway = "Planner review";
  let verdict = "Needs site-specific review";
  let explanation = `A ${desiredBuild} must be checked against the ${codeZone} land-use table and local controls.`;
  if (heritage) {
    pathway = "DA / heritage review";
    verdict = "A heritage-aware design and approval strategy is required";
    explanation = "A principal heritage layer intersects the property. The project must be reviewed against the relevant heritage controls and should not be presented as a CDC candidate without specialist confirmation.";
  } else if (goal === "home" && housingCode) {
    pathway = "Housing Code CDC test / DA fallback";
    verdict = "Generate the house, then test every Housing Code standard";
    explanation = "The residential zone supports a Housing Code eligibility test, but the zone alone does not prove CDC eligibility. The current Code, excluded-land tests, title, survey and local controls must all be checked.";
  } else if (goal === "home" && ruralHousingCode) {
    pathway = "Rural Housing Code / DA test";
    verdict = "A new home is a realistic option to test";
    explanation = "This zone uses the Rural Housing Code rather than the standard Housing Code. Dwelling entitlement, servicing, hazards and the local LEP still need checking.";
  } else if (goal === "dual" && codeZone === "R2") {
    pathway = "Housing SEPP + LRHDC CDC/DA test";
    verdict = "Dual occupancy may be possible";
    explanation = "NSW housing policy permits dual occupancies in R2, but the generated design must still satisfy the applicable Low Rise Housing Diversity Code or DA standards, excluded-land rules and property-specific constraints.";
  } else if (goal === "dual" && dualCodeZone) {
    pathway = "LEP permissibility + LRHDC test";
    verdict = "Dual occupancy requires a land-use and standards check";
    explanation = "In this zone, confirm permissibility in the relevant environmental planning instrument before testing every Low Rise Housing Diversity Code or DA standard.";
  } else if (goal === "dual") {
    pathway = "DA / permissibility review";
    verdict = "Do not assume two homes are permitted";
    explanation = "This zone is outside the usual Low Rise Housing Diversity Code zones. A planner must confirm the LEP land-use table and local minimum lot and frontage rules.";
  } else if (goal === "renovation") {
    pathway = "CDC or DA test";
    verdict = "Renovation potential is likely";
    explanation = "The approval route depends on the existing building, proposed envelope, mapped constraints and whether every complying-development standard can be met.";
  }

  const floorAreaSite = officialArea || area;
  const maxFloorArea = mappedFsr && floorAreaSite ? Math.round(floorAreaSite * mappedFsr) : null;
  const designHeight = Math.max(1, Number(inputs.storeys || 2)) * 3.05 + 1.1;
  const regulatory = calculateRegulatoryScreen({
    projectGoal: goal,
    lotArea: officialArea || area,
    frontage,
    depth: Number(inputs.depth || 0),
    lotType: inputs.lotType ?? "standard",
    storeys: Number(inputs.storeys || 2),
    designHeight,
    requestedGfa: 0,
    footprint: 0,
    estimatedCost: Number(inputs.estimatedCost || 0),
    proposedExcavationDepth: Number(inputs.proposedExcavationDepth ?? 0.6),
    excavationBoundaryDistance: Number(inputs.excavationBoundaryDistance ?? 1.6),
    poolCapacity: Number(inputs.poolCapacity || 0),
    zone,
    council,
    mappedGfaCap: maxFloorArea,
  });
  const [setbacks, floorArea, excavation, basix] = regulatory.controls;
  const checks = [
    { label: "Known site area", value: area ? `${area.toLocaleString()} m² (client entered)` : "Required", tone: area ? "good" : "review" },
    { label: "Known frontage", value: frontage ? `${frontage} m (client entered)` : "Required for envelope test", tone: frontage ? "good" : "review" },
    { label: "Mapped height", value: height ? `${height} m LEP maximum` : "No numeric map hit — confirm the current Code, LEP and DCP", tone: height ? "good" : "review" },
    { label: "Setbacks + site coverage", value: setbacks.value, tone: setbacks.status === "screened" ? "good" : "review" },
    { label: "Indicative maximum floor area", value: floorArea.value, tone: floorArea.status === "screened" ? "good" : "review" },
    { label: "Excavation", value: inputs.proposedExcavationDepth === undefined ? "Enter cut depth + boundary distance in the full simulator" : excavation.value, tone: inputs.proposedExcavationDepth === undefined ? "review" : excavation.status === "screened" ? "good" : "review" },
    { label: "BASIX", value: goal === "renovation" && inputs.estimatedCost === undefined ? "Enter estimated construction cost in the full simulator" : basix.value, tone: goal === "renovation" && inputs.estimatedCost === undefined ? "review" : basix.status === "screened" ? "good" : "review" },
  ];

  return {
    verdict,
    pathway,
    explanation,
    code: housingCode ? "NSW Housing Code" : ruralHousingCode ? "NSW Rural Housing Code" : goal === "dual" ? "Low Rise Housing Diversity Code / LEP" : "Local LEP, DCP and Codes SEPP",
    desiredBuild,
    checks,
    missing: [
      !area && "land area",
      !frontage && "frontage",
      !inputs.depth && "approximate depth",
      !inputs.slope && "site slope",
    ].filter(Boolean),
  };
}

export async function POST(request: Request) {
  try {
    const inputs = await request.json() as ProjectInputs;
    const address = inputs.address ?? `${inputs.streetAddress ?? ""}, ${inputs.suburb ?? ""} NSW ${inputs.postcode ?? ""}`;
    const parsed = parseAddress(address);
    if (!parsed) {
      console.warn("[site-analysis] Rejected incomplete address", { address, suburb: inputs.suburb, postcode: inputs.postcode });
      return Response.json({
        error: "Enter the street address, NSW suburb and four-digit postcode so the official parcel can be matched privately.",
        ...(process.env.NODE_ENV !== "production" ? { details: `Could not parse: ${address}` } : {}),
      }, { status: 400 });
    }

    const addressParams = new URLSearchParams({
      houseNumber: parsed.houseNumber,
      roadName: parsed.roadName,
      roadType: parsed.roadType,
      suburb: parsed.suburb,
      projection: "EPSG:4326",
    });
    if (parsed.postcode) addressParams.set("postCode", parsed.postcode);
    const addressData = await getJson(`${ADDRESS_SERVICE}?${addressParams}`) as AddressServiceResponse;
    const match = addressData.addressResult?.addresses?.[0];
    if (!match) {
      console.warn("[site-analysis] No NSW address match", { parsed });
      return Response.json({ error: "No exact NSW address match was returned. Check the street type, suburb and postcode." }, { status: 404 });
    }
    const matchedPostcode = String(match.postCode ?? "").replace(/\D/g, "").slice(0, 4);
    if (matchedPostcode && matchedPostcode !== parsed.postcode) {
      return Response.json({ error: "The NSW address service returned a different postcode. Check the complete address and try again." }, { status: 404 });
    }

    const longitude = Number(match.addressPoint?.centreX);
    const latitude = Number(match.addressPoint?.centreY);
    if (!Number.isFinite(longitude) || !Number.isFinite(latitude)) {
      throw new Error("The NSW address match did not include usable coordinates.");
    }

    const rawPropertyId = String(match.propid ?? "").trim();
    const propertyWhere = /^\d+$/.test(rawPropertyId) ? `propid=${rawPropertyId}` : "1=0";
    const propertyParams = new URLSearchParams({
      where: propertyWhere,
      outFields: "propid,address,Shape__Area,OBJECTID",
      returnGeometry: "true",
      outSR: "4326",
      f: "json",
    });

    const lotParams = new URLSearchParams({
      geometry: `${longitude},${latitude}`,
      geometryType: "esriGeometryPoint",
      inSR: "4326",
      spatialRel: "esriSpatialRelIntersects",
      outFields: "*",
      returnGeometry: "true",
      outSR: "4326",
      f: "json",
    });

    const [propertyData, lotData, fsr, height, heritage, zoning, lotSize, bushfire, flooding] = await Promise.all([
      safeGetJson(`${PROPERTY_SERVICE}/query?${propertyParams}`, "property aggregate"),
      safeGetJson(`${LOT_SERVICE}/query?${lotParams}`, "cadastral lot"),
      safePlanningLayer(11, "floor-space ratio", longitude, latitude),
      safePlanningLayer(14, "building height", longitude, latitude),
      safePlanningLayer(16, "heritage", longitude, latitude),
      safePlanningLayer(19, "zoning", longitude, latitude),
      safePlanningLayer(22, "minimum lot size", longitude, latitude),
      safeSpatialLayer(HAZARD_SERVICE, 229, "bush fire prone land", longitude, latitude),
      safeSpatialLayer(HAZARD_SERVICE, 230, "flood planning map", longitude, latitude),
    ]);

    const property = propertyData?.features?.[0] as ArcFeature | undefined;
    const lotFeatures = (lotData?.features ?? []) as ArcFeature[];
    const lotFeature = lotFeatures
      .filter((feature) => feature.attributes)
      .sort((first, second) => {
        const firstComplete = first.attributes?.lotnumber && first.attributes?.planlabel ? 0 : 1;
        const secondComplete = second.attributes?.lotnumber && second.attributes?.planlabel ? 0 : 1;
        if (firstComplete !== secondComplete) return firstComplete - secondComplete;
        const firstArea = positiveNumber(first.attributes?.planlotarea) ?? geometryAreaSqm(first.geometry?.rings ?? []) ?? Number.MAX_SAFE_INTEGER;
        const secondArea = positiveNumber(second.attributes?.planlotarea) ?? geometryAreaSqm(second.geometry?.rings ?? []) ?? Number.MAX_SAFE_INTEGER;
        return firstArea - secondArea;
      })[0];
    const lot = lotFeature?.attributes ?? null;
    const parcelRings = lotFeature?.geometry?.rings ?? [];
    const boundary = largestRing(parcelRings);
    const dimensions = parcelDimensions(boundary);

    const serviceReportedAreaSqm = positiveNumber(lot?.planlotarea);
    const calculatedGeometryAreaSqm = geometryAreaSqm(parcelRings);
    const propertyAggregateAreaSqm = positiveNumber(property?.attributes?.Shape__Area);
    const mappedParcelAreaSqm = serviceReportedAreaSqm ?? calculatedGeometryAreaSqm;
    const shapeMetrics = parcelShapeMetrics(mappedParcelAreaSqm, dimensions);
    const areaDifferenceSqm = serviceReportedAreaSqm && calculatedGeometryAreaSqm
      ? Math.abs(serviceReportedAreaSqm - calculatedGeometryAreaSqm)
      : null;
    const areaDifferencePercent = areaDifferenceSqm !== null && serviceReportedAreaSqm
      ? Math.round((areaDifferenceSqm / serviceReportedAreaSqm) * 1000) / 10
      : null;
    const areaRequiresVerification = areaDifferenceSqm !== null
      && areaDifferenceSqm > Math.max(5, Math.min(serviceReportedAreaSqm ?? 0, calculatedGeometryAreaSqm ?? 0) * 0.02);
    const areaStatus = mappedParcelAreaSqm
      ? areaRequiresVerification ? "requires_verification" : "mapped"
      : "unavailable";

    const zoneCode = String(zoning?.SYM_CODE ?? "Not mapped");
    const mappedHeight = positiveNumber(height?.MAX_B_H);
    const mappedFsr = positiveNumber(fsr?.FSR);
    const lotNumber = String(lot?.lotnumber ?? "").trim();
    const sectionNumber = String(lot?.sectionnumber ?? "").trim();
    const planLabel = String(lot?.planlabel ?? "").trim();
    const parcelId = String(lot?.lotidstring ?? featureId(lot) ?? "").trim() || null;
    const lotDp = lotNumber && planLabel ? `Lot ${lotNumber}${sectionNumber ? `, Section ${sectionNumber}` : ""} / ${planLabel}` : null;
    const streetAddress = `${match.houseNumberString ?? parsed.houseNumber} ${match.roadName ?? parsed.roadName} ${match.roadType ?? parsed.roadType}`.replace(/\s+/g, " ").trim();
    const suburb = String(match.suburbName ?? parsed.suburb).trim();
    const postcode = matchedPostcode || parsed.postcode;
    const fullAddress = [streetAddress, suburb, postcode && `NSW ${postcode}`].filter(Boolean).join(", ");
    const privacyLabel = [suburb, postcode && `NSW ${postcode}`].filter(Boolean).join(", ") || "Private NSW property";
    const council = String(match.council ?? "Not returned");
    const matchedAt = new Date().toISOString();
    const addressId = String(match.addressId ?? match.addressID ?? match.id ?? rawPropertyId ?? "").trim() || null;

    console.info("[site-analysis] Matched cadastral parcel", {
      fullAddress,
      propertyId: rawPropertyId || null,
      parcelId,
      lotDp,
      serviceReportedAreaSqm,
      calculatedGeometryAreaSqm,
      propertyAggregateAreaSqm,
      areaStatus,
      parcelRingCount: parcelRings.length,
      parcelPointCount: boundary.length,
    });

    return Response.json({
      matchStatus: "matched",
      matchedAt,
      matchedAddress: fullAddress,
      fullAddress,
      privacyLabel,
      addressDetails: { streetAddress, suburb, postcode },
      identity: {
        fullAddress,
        privacyLabel,
        suburb,
        postcode,
        lot: lotNumber || null,
        section: sectionNumber || null,
        depositedPlan: planLabel || null,
        council,
        parcelId,
        addressId,
        propertyId: rawPropertyId || null,
        matchedAt,
        matchStatus: "matched",
      },
      council,
      coordinates: { longitude, latitude },
      propertyId: rawPropertyId || null,
      parcelId,
      addressId,
      lot: lotNumber || null,
      section: sectionNumber || null,
      depositedPlan: planLabel || null,
      area: mappedParcelAreaSqm ? Math.round(mappedParcelAreaSqm) : null,
      mappedParcelAreaSqm: mappedParcelAreaSqm ? Math.round(mappedParcelAreaSqm * 10) / 10 : null,
      clientSuppliedAreaSqm: positiveNumber(inputs.knownLandArea),
      surveyedAreaSqm: null,
      serviceReportedAreaSqm,
      calculatedGeometryAreaSqm,
      propertyAggregateAreaSqm,
      areaStatus,
      parcelArea: {
        mappedParcelAreaSqm: mappedParcelAreaSqm ? Math.round(mappedParcelAreaSqm * 10) / 10 : null,
        serviceReportedAreaSqm,
        calculatedGeometryAreaSqm,
        propertyAggregateAreaSqm,
        differenceSqm: areaDifferenceSqm !== null ? Math.round(areaDifferenceSqm * 10) / 10 : null,
        differencePercent: areaDifferencePercent,
        status: areaStatus,
        selectedSource: serviceReportedAreaSqm ? "NSW cadastral lot area attribute" : calculatedGeometryAreaSqm ? "Calculated from selected cadastral lot geometry" : null,
        note: areaRequiresVerification
          ? "The NSW lot-area attribute and calculated cadastral geometry differ materially. Both values are shown and must be verified."
          : "Area is taken only from the selected NSW cadastral lot, not the broader property aggregate polygon.",
      },
      parcelShape: shapeMetrics,
      boundary,
      parcelGeometry: parcelRings,
      lotDp,
      siteDimensions: dimensions,
      controls: {
        zone: zoneCode,
        zoneName: zoning?.LAY_CLASS ? String(zoning.LAY_CLASS) : "Not mapped",
        lep: String(zoning?.EPI_NAME ?? height?.EPI_NAME ?? fsr?.EPI_NAME ?? "Not mapped"),
        maxHeight: height?.MAX_B_H ? `${height.MAX_B_H} ${height.UNITS ?? "m"}` : null,
        fsr: fsr?.FSR ? `${fsr.FSR}:1` : null,
        minimumLotSize: lotSize?.LOT_SIZE ? `${lotSize.LOT_SIZE} ${lotSize.UNITS ?? "m²"}` : null,
        heritage: heritage ? String(heritage.H_NAME ?? heritage.LAY_CLASS ?? "Mapped heritage item/area") : null,
        bushfire: bushfire ? String(bushfire.Category ?? bushfire.CATEGORY ?? bushfire.LAY_CLASS ?? "Mapped bush fire prone land") : null,
        flooding: flooding ? String(flooding.LAY_CLASS ?? flooding.FLOOD_CLASS ?? flooding.NAME ?? "Mapped flood planning area") : null,
        numeric: {
          maxHeight: mappedHeight,
          fsr: mappedFsr,
          minimumLotSize: positiveNumber(lotSize?.LOT_SIZE),
        },
        provenance: {
          zone: `${PLANNING_SERVICE}/19`,
          height: `${PLANNING_SERVICE}/14`,
          fsr: `${PLANNING_SERVICE}/11`,
          heritage: `${PLANNING_SERVICE}/16`,
          minimumLotSize: `${PLANNING_SERVICE}/22`,
          bushfire: `${HAZARD_SERVICE}/229`,
          flooding: `${HAZARD_SERVICE}/230`,
        },
      },
      planningFields: {
        council: {
          value: council,
          sourceName: "NSW Address Location service",
          sourceLayer: "Address result",
          sourceFeatureId: rawPropertyId || null,
          retrievedAt: matchedAt,
          status: council === "Not returned" ? "not_mapped" : "mapped",
        },
        lotDp: {
          value: lotDp,
          sourceName: "NSW Land Parcel Property Theme",
          sourceLayer: "Cadastral lot layer 8",
          sourceFeatureId: parcelId,
          retrievedAt: matchedAt,
          status: lotDp ? "mapped" : "not_mapped",
        },
        parcelArea: {
          value: mappedParcelAreaSqm,
          sourceName: "NSW Land Parcel Property Theme",
          sourceLayer: "Cadastral lot layer 8",
          sourceFeatureId: parcelId,
          retrievedAt: matchedAt,
          status: areaStatus,
        },
        zone: planningField(zoneCode === "Not mapped" ? null : zoneCode, "Zoning layer 19", zoning),
        height: planningField(height?.MAX_B_H ?? null, "Building height layer 14", height),
        fsr: planningField(fsr?.FSR ?? null, "Floor-space ratio layer 11", fsr),
        minimumLotSize: planningField(lotSize?.LOT_SIZE ?? null, "Minimum lot size layer 22", lotSize),
        heritage: planningField(heritage ? heritage.H_NAME ?? heritage.LAY_CLASS ?? "Mapped" : null, "Heritage layer 16", heritage, heritage ? "mapped" : "not_mapped"),
        bushfire: {
          ...planningField(bushfire ? bushfire.Category ?? bushfire.CATEGORY ?? bushfire.LAY_CLASS ?? "Mapped" : null, "Bush fire prone land layer 229", bushfire, bushfire ? "mapped" : "not_mapped"),
          sourceName: "NSW Planning Portal Hazard layers",
        },
        flooding: {
          ...planningField(flooding ? flooding.LAY_CLASS ?? flooding.FLOOD_CLASS ?? flooding.NAME ?? "Mapped" : null, "Flood planning map layer 230", flooding, flooding ? "mapped" : "not_mapped"),
          sourceName: "NSW Planning Portal Hazard layers",
        },
      },
      opportunities: opportunitiesForZone(zoneCode),
      guidance: projectGuidance(zoneCode, Boolean(heritage), inputs, mappedHeight, mappedFsr, council, mappedParcelAreaSqm),
      constraints: [
        { name: "Building height", value: height?.MAX_B_H ? `${height.MAX_B_H} ${height.UNITS ?? "m"}` : "No numeric height mapped", status: height?.MAX_B_H ? "mapped" : "review" },
        { name: "Floor-space ratio", value: fsr?.FSR ? `${fsr.FSR}:1` : "No FSR mapped", status: fsr?.FSR ? "mapped" : "review" },
        { name: "Minimum lot size", value: lotSize?.LOT_SIZE ? `${lotSize.LOT_SIZE} ${lotSize.UNITS ?? "m²"}` : "No minimum mapped", status: lotSize?.LOT_SIZE ? "mapped" : "review" },
        { name: "Heritage", value: heritage ? String(heritage.H_NAME ?? "Mapped") : "No principal heritage layer hit", status: heritage ? "alert" : "clear" },
        { name: "Bush fire prone land", value: bushfire ? String(bushfire.Category ?? bushfire.CATEGORY ?? bushfire.LAY_CLASS ?? "Mapped") : "No hazard-layer hit", status: bushfire ? "alert" : "clear" },
        { name: "Flood planning", value: flooding ? String(flooding.LAY_CLASS ?? flooding.FLOOD_CLASS ?? flooding.NAME ?? "Mapped") : "No hazard-layer hit", status: flooding ? "alert" : "clear" },
        { name: "Excavation depth", value: "Not a statewide mapped numeric control", status: "specialist" },
        { name: "Setbacks + landscaped area", value: "Confirm council DCP / CDC standards", status: "specialist" },
      ],
      source: {
        planningPortal: "https://www.planningportal.nsw.gov.au/spatialviewer/#/find-a-property/address",
        cadastralLotLayer: LOT_SERVICE,
        dataAttribution: "NSW Spatial Services and NSW Department of Planning, Housing and Infrastructure",
        retrievedAt: matchedAt,
        areaSource: serviceReportedAreaSqm
          ? "Selected NSW cadastral lot"
          : calculatedGeometryAreaSqm
            ? "Calculated cadastral geometry"
            : "Unavailable",
        layerStatus: {
          zoning: zoning ? "mapped" : "not-mapped",
          height: height ? "mapped" : "not-mapped",
          floorSpaceRatio: fsr ? "mapped" : "not-mapped",
          heritage: heritage ? "mapped" : "not-mapped",
          minimumLotSize: lotSize ? "mapped" : "not-mapped",
          bushfire: bushfire ? "mapped" : "not-mapped",
          flooding: flooding ? "mapped" : "not-mapped",
        },
      },
      analysedAt: matchedAt,
    });
  } catch (caught) {
    const message = caught instanceof Error ? caught.message : String(caught);
    console.error("[site-analysis] Live property analysis failed", caught);
    return Response.json({
      error: "The NSW address was valid, but one of the live NSW data services did not complete the analysis. Please try again shortly.",
      ...(process.env.NODE_ENV !== "production" ? { details: message } : {}),
    }, { status: 502 });
  }
}
