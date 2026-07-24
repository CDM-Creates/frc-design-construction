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

export async function POST(request: Request) {
  try {
    const { address } = await request.json() as { address?: string };
    const parsed = parseAddress(address ?? "");
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
      },
      opportunities: opportunitiesForZone(zoneCode),
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
