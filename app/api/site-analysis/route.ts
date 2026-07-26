type ArcFeature = { attributes?: Record<string, unknown>; geometry?: { rings?: number[][][] } };

const ADDRESS_SERVICE = "https://mapsq.six.nsw.gov.au/services/public/Address_Location";
const PLANNING_SERVICE = "https://mapprod3.environment.nsw.gov.au/arcgis/rest/services/ePlanning/Planning_Portal_Principal_Planning/MapServer";
const PROPERTY_SERVICE = "https://portal.spatial.nsw.gov.au/server/rest/services/NSW_Land_Parcel_Property_Theme/FeatureServer/12";

const roadTypes: Record<string, string> = {
  st: "Street", street: "Street", rd: "Road", road: "Road", ave: "Avenue", avenue: "Avenue",
  dr: "Drive", drive: "Drive", cct: "Circuit", circuit: "Circuit", cres: "Crescent", crescent: "Crescent",
  cl: "Close", close: "Close", pl: "Place", place: "Place", pde: "Parade", parade: "Parade",
  way: "Way", lane: "Lane", ln: "Lane", tce: "Terrace", terrace: "Terrace", hwy: "Highway", highway: "Highway",
};

function parseAddress(input: string) {
  const cleaned = input.replace(/\s+/g, " ").trim();
  const match = cleaned.match(/^(\d+[A-Za-z]?)\s+(.+?)\s+(Street|St|Road|Rd|Avenue|Ave|Drive|Dr|Circuit|Cct|Crescent|Cres|Close|Cl|Place|Pl|Parade|Pde|Way|Lane|Ln|Terrace|Tce|Highway|Hwy),?\s+(.+?)(?:,?\s+NSW)?(?:\s+(\d{4}))?$/i);
  if (!match) return null;
  const [, houseNumber, roadName, rawRoadType, rawSuburb, postcode] = match;
  const suburb = rawSuburb.replace(/,?\s+NSW$/i, "").trim();
  return { houseNumber, roadName, roadType: roadTypes[rawRoadType.toLowerCase()] ?? rawRoadType, suburb, postcode };
}

async function getJson(url: string) {
  const response = await fetch(url, { headers: { Accept: "application/json" } });
  if (!response.ok) throw new Error(`NSW service returned ${response.status}`);
  return response.json();
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
};

function projectGuidance(zone: string, heritage: boolean, inputs: ProjectInputs, mappedHeight: number | null, mappedFsr: number | null) {
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

  const maxFloorArea = mappedFsr && area ? Math.round(area * mappedFsr) : null;
  const checks = [
    { label: "Known site area", value: area ? `${area.toLocaleString()} m² (client entered)` : "Required", tone: area ? "good" : "review" },
    { label: "Known frontage", value: frontage ? `${frontage} m (client entered)` : "Required for envelope test", tone: frontage ? "good" : "review" },
    { label: "Mapped height", value: height ? `${height} m LEP maximum` : "No numeric map hit — confirm the current Code, LEP and DCP", tone: height ? "good" : "review" },
    { label: "Setbacks + site coverage", value: "Calculate from the current Housing Code tables or council DCP after survey", tone: "review" },
    { label: "Indicative maximum floor area", value: maxFloorArea ? `${maxFloorArea.toLocaleString()} m² from mapped FSR` : "No numeric FSR mapped — do not invent one", tone: maxFloorArea ? "good" : "review" },
    { label: "Excavation", value: inputs.slope === "steep" ? "Geotechnical and structural review essential" : "No reliable statewide maximum depth — survey and geotechnical review", tone: "review" },
    { label: "BASIX", value: "Required for new NSW dwellings; generally required for alterations and additions valued at $50,000 or more", tone: "review" },
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
      return Response.json({ error: "Enter a complete NSW address, including suburb, such as “31 Crown Line Drive, Rothbury NSW 2320”." }, { status: 400 });
    }

    const addressParams = new URLSearchParams({
      houseNumber: parsed.houseNumber,
      roadName: parsed.roadName,
      roadType: parsed.roadType,
      suburb: parsed.suburb,
      projection: "EPSG:4326",
    });
    if (parsed.postcode) addressParams.set("postCode", parsed.postcode);
    const addressData = await getJson(`${ADDRESS_SERVICE}?${addressParams}`);
    const match = addressData.addressResult?.addresses?.[0];
    if (!match) return Response.json({ error: "No exact NSW address match was returned. Check the street type and suburb." }, { status: 404 });

    const longitude = Number(match.addressPoint.centreX);
    const latitude = Number(match.addressPoint.centreY);
    const propertyParams = new URLSearchParams({
      where: `propid=${Number(match.propid)}`,
      outFields: "propid,address,Shape__Area",
      returnGeometry: "true",
      outSR: "4326",
      f: "json",
    });

    const [propertyData, fsr, height, heritage, zoning, lotSize] = await Promise.all([
      getJson(`${PROPERTY_SERVICE}/query?${propertyParams}`),
      queryPlanningLayer(11, longitude, latitude),
      queryPlanningLayer(14, longitude, latitude),
      queryPlanningLayer(16, longitude, latitude),
      queryPlanningLayer(19, longitude, latitude),
      queryPlanningLayer(22, longitude, latitude),
    ]);

    const property = propertyData.features?.[0] as ArcFeature | undefined;
    const zoneCode = String(zoning?.SYM_CODE ?? "Not mapped");
    const area = Number(property?.attributes?.Shape__Area ?? 0);
    const mappedHeight = height?.MAX_B_H ? Number(height.MAX_B_H) : null;
    const mappedFsr = fsr?.FSR ? Number(fsr.FSR) : null;
    return Response.json({
      matchedAddress: match.addressString,
      council: match.council,
      coordinates: { longitude, latitude },
      propertyId: match.propid,
      area: area ? Math.round(area) : null,
      boundary: property?.geometry?.rings?.[0] ?? [],
      controls: {
        zone: zoneCode,
        zoneName: zoning?.LAY_CLASS ?? "Not mapped",
        lep: zoning?.EPI_NAME ?? height?.EPI_NAME ?? fsr?.EPI_NAME ?? "Not mapped",
        maxHeight: height?.MAX_B_H ? `${height.MAX_B_H} ${height.UNITS ?? "m"}` : null,
        fsr: fsr?.FSR ? `${fsr.FSR}:1` : null,
        minimumLotSize: lotSize?.LOT_SIZE ? `${lotSize.LOT_SIZE} ${lotSize.UNITS ?? "m²"}` : null,
        heritage: heritage ? String(heritage.H_NAME ?? heritage.LAY_CLASS ?? "Mapped heritage item/area") : null,
        numeric: {
          maxHeight: mappedHeight,
          fsr: mappedFsr,
          minimumLotSize: lotSize?.LOT_SIZE ? Number(lotSize.LOT_SIZE) : null,
        },
        provenance: {
          zone: `${PLANNING_SERVICE}/19`,
          height: `${PLANNING_SERVICE}/14`,
          fsr: `${PLANNING_SERVICE}/11`,
          heritage: `${PLANNING_SERVICE}/16`,
          minimumLotSize: `${PLANNING_SERVICE}/22`,
        },
      },
      opportunities: opportunitiesForZone(zoneCode),
      guidance: projectGuidance(zoneCode, Boolean(heritage), inputs, mappedHeight, mappedFsr),
      constraints: [
        { name: "Building height", value: height?.MAX_B_H ? `${height.MAX_B_H} ${height.UNITS ?? "m"}` : "No numeric height mapped", status: height?.MAX_B_H ? "mapped" : "review" },
        { name: "Floor-space ratio", value: fsr?.FSR ? `${fsr.FSR}:1` : "No FSR mapped", status: fsr?.FSR ? "mapped" : "review" },
        { name: "Minimum lot size", value: lotSize?.LOT_SIZE ? `${lotSize.LOT_SIZE} ${lotSize.UNITS ?? "m²"}` : "No minimum mapped", status: lotSize?.LOT_SIZE ? "mapped" : "review" },
        { name: "Heritage", value: heritage ? String(heritage.H_NAME ?? "Mapped") : "No principal heritage layer hit", status: heritage ? "alert" : "clear" },
        { name: "Excavation depth", value: "Not a statewide mapped numeric control", status: "specialist" },
        { name: "Setbacks + landscaped area", value: "Confirm council DCP / CDC standards", status: "specialist" },
      ],
      source: {
        planningPortal: "https://www.planningportal.nsw.gov.au/spatialviewer/#/find-a-property/address",
        dataAttribution: "NSW Spatial Services and NSW Department of Planning, Housing and Infrastructure",
      },
      analysedAt: new Date().toISOString(),
    });
  } catch {
    return Response.json({ error: "The NSW data services did not complete the analysis. Please try again shortly." }, { status: 502 });
  }
}
