export type ProjectType = "home" | "dual" | "renovation";

export type ProjectEngineInput = {
  knownLandArea: number;
  frontage: number;
  depth: number;
  projectGoal: ProjectType;
  storeys: number;
  bedrooms: number;
  bathrooms: number;
  parking: number;
  mustHaves: string;
  description: string;
};

export type PlanningSnapshot = {
  area: number | null;
  controls: {
    zone: string;
    zoneName: string;
    lep: string;
    maxHeight: string | null;
    fsr: string | null;
    minimumLotSize: string | null;
    heritage: string | null;
    numeric?: {
      maxHeight: number | null;
      fsr: number | null;
      minimumLotSize: number | null;
    };
  };
};

export type ConceptRoom = {
  id: string;
  name: string;
  area: number;
  category: "living" | "sleeping" | "service" | "parking" | "outdoor";
  includedInGfa: boolean;
  dwelling?: "A" | "B";
};

export type ConceptLevel = {
  name: string;
  area: number;
  rooms: ConceptRoom[];
};

export type ComplianceCheck = {
  key: string;
  label: string;
  mappedRule: string;
  proposed: string;
  status: "pass" | "fail" | "review";
  explanation: string;
  source: "NSW mapped control" | "Client brief" | "Professional verification";
};

export type ProjectConcept = {
  levels: ConceptLevel[];
  requestedGfa: number;
  externalArea: number;
  footprint: number;
  designHeight: number;
  mappedGfaCap: number | null;
  mappedHeightCap: number | null;
  siteAreaUsed: number;
  siteAreaSource: "official parcel" | "client entered";
  workingWidth: number;
  workingDepth: number;
  coveragePercent: number;
  widthPercent: number;
  depthPercent: number;
  overallStatus: "fits-mapped" | "revise" | "unverified";
  headline: string;
  summary: string;
  complianceChecks: ComplianceCheck[];
  roomAssumptions: string[];
};

const round = (value: number) => Math.round(value * 10) / 10;
const numericControl = (value: string | null | undefined) => {
  if (!value) return null;
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : null;
};

function room(id: string, name: string, area: number, category: ConceptRoom["category"], includedInGfa = true, dwelling?: "A" | "B"): ConceptRoom {
  return { id, name, area, category, includedInGfa, dwelling };
}

function roomsForDwelling(input: ProjectEngineInput, dwelling?: "A" | "B") {
  const suffix = dwelling ? ` · Home ${dwelling}` : "";
  const prefix = dwelling ? `${dwelling.toLowerCase()}-` : "";
  const text = `${input.mustHaves} ${input.description}`.toLowerCase();
  const rooms: ConceptRoom[] = [
    room(`${prefix}entry`, `Entry${suffix}`, 6, "service", true, dwelling),
    room(`${prefix}living`, `Living${suffix}`, 28, "living", true, dwelling),
    room(`${prefix}kitchen`, `Kitchen${suffix}`, 14, "living", true, dwelling),
    room(`${prefix}dining`, `Dining${suffix}`, 16, "living", true, dwelling),
    room(`${prefix}laundry`, `Laundry${suffix}`, 7, "service", true, dwelling),
  ];

  const parkingArea = Math.max(0, input.parking) * 18;
  if (parkingArea) rooms.push(room(`${prefix}garage`, `Garage${suffix}`, parkingArea, "parking", true, dwelling));

  for (let index = 0; index < Math.max(1, input.bedrooms); index += 1) {
    rooms.push(room(`${prefix}bed-${index + 1}`, `${index === 0 ? "Main bedroom" : `Bedroom ${index + 1}`}${suffix}`, index === 0 ? 18 : 12, "sleeping", true, dwelling));
  }

  for (let index = 0; index < Math.max(1, input.bathrooms); index += 1) {
    const isEnsuite = input.bathrooms > 1 && index === 0;
    rooms.push(room(`${prefix}bath-${index + 1}`, `${isEnsuite ? "Ensuite" : index === 0 ? "Bathroom" : `Bathroom ${index + 1}`}${suffix}`, isEnsuite ? 6 : 7, "service", true, dwelling));
  }

  if (/(study|office|work from home)/.test(text)) rooms.push(room(`${prefix}study`, `Study${suffix}`, 10, "living", true, dwelling));
  if (/(media|rumpus|second living|family room)/.test(text)) rooms.push(room(`${prefix}media`, `Media / rumpus${suffix}`, 16, "living", true, dwelling));
  if (/(butler|walk-in pantry|pantry)/.test(text)) rooms.push(room(`${prefix}pantry`, `Pantry${suffix}`, 5, "service", true, dwelling));
  if (/(gym|fitness)/.test(text)) rooms.push(room(`${prefix}gym`, `Home gym${suffix}`, 12, "living", true, dwelling));
  if (/(mudroom|drop zone)/.test(text)) rooms.push(room(`${prefix}mudroom`, `Mudroom${suffix}`, 6, "service", true, dwelling));
  if (/(parents|in-law|guest retreat)/.test(text)) rooms.push(room(`${prefix}guest-retreat`, `Guest retreat${suffix}`, 9, "living", true, dwelling));
  if (/(accessible|wheelchair|ageing in place)/.test(text)) rooms.push(room(`${prefix}accessible`, `Accessible circulation${suffix}`, 6, "service", true, dwelling));
  if (/(alfresco|outdoor|covered entertaining)/.test(text)) rooms.push(room(`${prefix}alfresco`, `Covered outdoor room${suffix}`, 20, "outdoor", false, dwelling));
  if (/(pool|swimming)/.test(text)) rooms.push(room(`${prefix}pool`, `Pool zone${suffix}`, 28, "outdoor", false, dwelling));

  return rooms;
}

function distributeLevels(rooms: ConceptRoom[], storeys: number) {
  const levelCount = Math.max(1, Math.round(storeys));
  const levels: ConceptRoom[][] = Array.from({ length: levelCount }, () => []);

  for (const current of rooms) {
    if (levelCount === 1) {
      levels[0].push(current);
      continue;
    }
    if (current.category === "living" && /(media|rumpus|study)/i.test(current.name) && levelCount > 2) {
      levels[Math.min(1, levelCount - 1)].push(current);
    } else if (current.category === "sleeping") {
      const sleepingLevels = Math.max(1, levelCount - 1);
      const bedroomNumber = Number(current.id.match(/bed-(\d+)/)?.[1] ?? 1);
      levels[1 + ((bedroomNumber - 1) % sleepingLevels)].push(current);
    } else if (/ensuite|bathroom/i.test(current.name) && levelCount > 1) {
      levels[Math.min(1, levelCount - 1)].push(current);
    } else {
      levels[0].push(current);
    }
  }

  return levels.map((levelRooms, index) => {
    const internalArea = levelRooms.filter((item) => item.includedInGfa).reduce((sum, item) => sum + item.area, 0);
    const circulation = internalArea ? Math.max(5, round(internalArea * 0.12)) : 0;
    const roomsWithCirculation = circulation
      ? [...levelRooms, room(`circulation-${index}`, "Hall + circulation", circulation, "service")]
      : levelRooms;
    return {
      name: index === 0 ? "Ground floor" : index === levelCount - 1 && levelCount > 2 ? `Level ${index + 1}` : "Upper floor",
      rooms: roomsWithCirculation,
      area: round(roomsWithCirculation.filter((item) => item.includedInGfa).reduce((sum, item) => sum + item.area, 0)),
    };
  });
}

export function buildProjectConcept(input: ProjectEngineInput, planning: PlanningSnapshot | null): ProjectConcept {
  const dwellings: Array<"A" | "B" | undefined> = input.projectGoal === "dual" ? ["A", "B"] : [undefined];
  const allRooms = dwellings.flatMap((dwelling) => roomsForDwelling(input, dwelling));
  const levels = distributeLevels(allRooms, input.storeys);
  const requestedGfa = round(levels.reduce((sum, level) => sum + level.area, 0));
  const externalArea = round(allRooms.filter((item) => !item.includedInGfa).reduce((sum, item) => sum + item.area, 0));
  const footprint = round(Math.max(...levels.map((level) => level.area), 0));
  const designHeight = round(Math.max(1, input.storeys) * 3.05 + 1.1);
  const siteAreaUsed = planning?.area || input.knownLandArea;
  const siteAreaSource = planning?.area ? "official parcel" : "client entered";
  const mappedFsr = planning?.controls.numeric?.fsr ?? numericControl(planning?.controls.fsr);
  const mappedHeightCap = planning?.controls.numeric?.maxHeight ?? numericControl(planning?.controls.maxHeight);
  const mappedGfaCap = mappedFsr && siteAreaUsed ? round(mappedFsr * siteAreaUsed) : null;
  const lotRatio = input.depth > 0 ? input.frontage / input.depth : 0.4;
  const rawWidth = Math.sqrt(Math.max(footprint, 1) * Math.max(lotRatio, 0.2));
  const workingWidth = round(Math.max(5.5, Math.min(input.frontage * 0.72, rawWidth)));
  const workingDepth = round(footprint / Math.max(workingWidth, 1));
  const coveragePercent = input.knownLandArea ? round((footprint / input.knownLandArea) * 100) : 0;
  const widthPercent = input.frontage ? Math.min(88, round((workingWidth / input.frontage) * 100)) : 65;
  const depthPercent = input.depth ? Math.min(80, round((workingDepth / input.depth) * 100)) : 50;

  const complianceChecks: ComplianceCheck[] = [
    {
      key: "zone",
      label: "Land use + zone",
      mappedRule: planning ? `${planning.controls.zone} · ${planning.controls.zoneName}` : "Run the NSW property check",
      proposed: input.projectGoal === "dual" ? "Dual occupancy" : input.projectGoal === "renovation" ? "Alterations + additions" : "Dwelling house",
      status: planning?.controls.zone && planning.controls.zone !== "Not mapped" ? "review" : "review",
      explanation: planning ? "The zone is mapped, but legal permissibility must be confirmed in the cited LEP/SEPP land-use table." : "No NSW zoning result has been returned yet.",
      source: planning ? "NSW mapped control" : "Professional verification",
    },
    {
      key: "fsr",
      label: "Floor-space ratio",
      mappedRule: mappedGfaCap ? `${planning?.controls.fsr} = ${mappedGfaCap.toLocaleString()} m² maximum GFA on the mapped parcel` : "No numeric FSR returned",
      proposed: `${requestedGfa.toLocaleString()} m² generated program`,
      status: mappedGfaCap ? (requestedGfa <= mappedGfaCap ? "pass" : "fail") : "review",
      explanation: mappedGfaCap
        ? requestedGfa <= mappedGfaCap
          ? `${round(mappedGfaCap - requestedGfa).toLocaleString()} m² remains below the mapped FSR ceiling.`
          : `The brief exceeds the mapped FSR ceiling by ${round(requestedGfa - mappedGfaCap).toLocaleString()} m². Reduce the program or obtain project-specific planning advice.`
        : "The engine will not invent a floor-area entitlement when the NSW layer returns no numeric FSR.",
      source: mappedGfaCap ? "NSW mapped control" : "Professional verification",
    },
    {
      key: "height",
      label: "Building height",
      mappedRule: mappedHeightCap ? `${mappedHeightCap} m mapped maximum` : "No numeric height returned",
      proposed: `${designHeight} m concept height (${input.storeys} storey${input.storeys === 1 ? "" : "s"})`,
      status: mappedHeightCap ? (designHeight <= mappedHeightCap ? "pass" : "fail") : "review",
      explanation: mappedHeightCap
        ? designHeight <= mappedHeightCap
          ? `${round(mappedHeightCap - designHeight)} m remains in the concept-level height allowance.`
          : `The concept is approximately ${round(designHeight - mappedHeightCap)} m above the mapped maximum. Fewer storeys or a different section is required.`
        : "Actual height must be resolved from surveyed ground levels, roof form and the applicable instrument.",
      source: mappedHeightCap ? "NSW mapped control" : "Professional verification",
    },
    {
      key: "heritage",
      label: "Heritage",
      mappedRule: planning?.controls.heritage ?? "No principal heritage layer hit",
      proposed: input.existingDwelling ? "Existing building retained / altered" : "New built form",
      status: planning?.controls.heritage ? "review" : planning ? "pass" : "review",
      explanation: planning?.controls.heritage
        ? "A mapped heritage item or area requires specialist assessment and may rule out complying development."
        : "No principal heritage-layer intersection was returned; title and local checks still remain.",
      source: planning ? "NSW mapped control" : "Professional verification",
    },
    {
      key: "lot-size",
      label: "Minimum lot size map",
      mappedRule: planning?.controls.minimumLotSize ?? "No numeric lot-size value returned",
      proposed: `${input.knownLandArea.toLocaleString()} m² client-entered lot`,
      status: "review",
      explanation: "The mapped minimum-lot-size control commonly relates to subdivision. It is shown for context and is not treated as an automatic building-area test.",
      source: planning?.controls.minimumLotSize ? "NSW mapped control" : "Professional verification",
    },
    {
      key: "envelope",
      label: "Setbacks + site envelope",
      mappedRule: "Not supplied by the principal NSW map layers",
      proposed: `${workingWidth} m × ${workingDepth} m generated footprint`,
      status: "review",
      explanation: "This footprint must be placed on a detail survey and tested against the current Housing Code or council DCP before it can be called compliant.",
      source: "Professional verification",
    },
  ];

  const hasFail = complianceChecks.some((check) => check.status === "fail");
  const hasPlanning = Boolean(planning);
  const overallStatus = hasFail ? "revise" : hasPlanning ? "fits-mapped" : "unverified";
  const headline = hasFail
    ? "The requested house has been generated, but it fails a mapped numeric control."
    : hasPlanning
      ? "The generated house fits the mapped numeric controls returned for this property."
      : "The house brief is generated; run the NSW check to test mapped restrictions.";
  const summary = `${input.projectGoal === "dual" ? "Two mirrored homes" : "One home"} with ${requestedGfa.toLocaleString()} m² of scheduled internal area across ${levels.length} level${levels.length === 1 ? "" : "s"}. The arrangement is built from the entered bedroom, bathroom, parking and description requirements—not from a percentage of the land.`;

  return {
    levels,
    requestedGfa,
    externalArea,
    footprint,
    designHeight,
    mappedGfaCap,
    mappedHeightCap,
    siteAreaUsed,
    siteAreaSource,
    workingWidth,
    workingDepth,
    coveragePercent,
    widthPercent,
    depthPercent,
    overallStatus,
    headline,
    summary,
    complianceChecks,
    roomAssumptions: [
      "Main bedroom 18 m²; additional bedrooms 12 m² each",
      "Living 28 m²; kitchen 14 m²; dining 16 m² per dwelling",
      "Garage 18 m² per entered car space",
      "Circulation adds 12% to each level’s scheduled internal rooms",
      "Description keywords add named spaces such as study, pantry, media room, gym, accessible circulation, outdoor room or pool",
    ],
  };
}
