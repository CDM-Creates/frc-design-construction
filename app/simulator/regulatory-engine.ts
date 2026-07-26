import type { ProjectType } from "./project-engine";

export const CODES_SEPP_URL = "https://legislation.nsw.gov.au/view/whole/html/inforce/current/epi-2008-0572";
export const BASIX_RULE_URL = "https://legislation.nsw.gov.au/view/whole/html/inforce/current/sl-2021-0759";
export const BLACKTOWN_DCP_URL = "https://www.blacktown.nsw.gov.au/Plan-build/Stage-2-plans-and-guidelines/Blacktown-planning-controls/Blacktown-Development-Control-Plan-2015";
export const NSW_DCP_DIRECTORY_URL = "https://www.planningportal.nsw.gov.au/DCP";

type RegulatoryInput = {
  projectGoal: ProjectType;
  lotArea: number;
  frontage: number;
  depth: number;
  lotType: "standard" | "corner" | "battleaxe";
  storeys: number;
  designHeight: number;
  requestedGfa: number;
  footprint: number;
  estimatedCost: number;
  proposedExcavationDepth: number;
  excavationBoundaryDistance: number;
  poolCapacity: number;
  zone: string;
  council: string;
  mappedGfaCap: number | null;
};

export type RegulatoryControl = {
  key: "setbacks" | "floor-area" | "excavation" | "basix";
  title: string;
  value: string;
  status: "screened" | "review" | "outside";
  eyebrow: string;
  summary: string;
  details: string[];
  sourceLabel: string;
  sourceHref: string;
};

export type RegulatoryScreen = {
  route: string;
  routeStatus: "screened" | "review" | "outside";
  routeReason: string;
  controls: RegulatoryControl[];
  councilSource: {
    label: string;
    note: string;
    href: string;
  };
};

const round = (value: number) => Math.round(value * 10) / 10;
const metres = (value: number | null) => value === null ? "survey needed" : `${round(value)} m`;
const squareMetres = (value: number | null) => value === null ? "not defensibly calculable" : `${Math.round(value).toLocaleString()} m²`;

function housingCodeGfa(area: number) {
  if (area < 200) return null;
  if (area <= 250) return area * 0.78;
  if (area <= 300) return area * 0.75;
  if (area <= 350) return 235;
  if (area <= 450) return area * 0.25 + 150;
  if (area <= 560) return 290;
  if (area <= 600) return area * 0.25 + 150;
  if (area <= 740) return 335;
  if (area <= 900) return area * 0.25 + 150;
  if (area <= 920) return 380;
  if (area <= 1000) return area * 0.25 + 150;
  return 400;
}

function dualOccupancyGfa(area: number) {
  if (area < 400) return null;
  return area <= 2000 ? area * 0.25 + 300 : 800;
}

function minimumLandscape(projectGoal: ProjectType, area: number) {
  if (projectGoal === "dual") return area >= 400 ? Math.max(0, area * 0.5 - 100) : null;
  if (area < 200) return null;
  if (area <= 300) return area * 0.1;
  if (area <= 450) return area * 0.15;
  if (area <= 600) return area * 0.2;
  if (area <= 900) return area * 0.3;
  if (area <= 1500) return area * 0.4;
  return area * 0.45;
}

function frontSetback(projectGoal: ProjectType, area: number, lotType: RegulatoryInput["lotType"]) {
  if (lotType === "battleaxe") return projectGoal === "dual" ? null : 3;
  if (projectGoal === "dual") {
    if (area < 400) return null;
    if (area <= 900) return 4.5;
    if (area <= 1500) return 6.5;
    return 10;
  }
  if (area < 200) return null;
  if (area <= 300) return 3;
  if (area <= 900) return 4.5;
  if (area <= 1500) return 6.5;
  return 10;
}

function sideSetback(projectGoal: ProjectType, frontage: number, height: number) {
  if (height > 8.5) return null;
  if (projectGoal === "dual") {
    if (frontage < 12) return null;
    if (frontage <= 24) return height <= 4.5 ? 0.9 : (height - 4.5) / 4 + 0.9;
    if (frontage <= 36) return height <= 4.5 ? 1.5 : (height - 4.5) / 4 + 1.5;
    return 2.5;
  }
  if (frontage < 6) return null;
  if (frontage <= 10) return height <= 5.5 ? 0.9 : (height - 5.5) / 4 + 0.9;
  if (frontage <= 18) return height <= 4.5 ? 0.9 : (height - 4.5) / 4 + 0.9;
  if (frontage <= 24) return height <= 4.5 ? 1.5 : (height - 4.5) / 4 + 1.5;
  return 2.5;
}

function rearSetback(projectGoal: ProjectType, area: number, height: number, lotType: RegulatoryInput["lotType"]) {
  if (height > 8.5 || lotType === "battleaxe" && projectGoal === "dual") return null;
  const upper = height > 4.5;
  if (projectGoal === "dual") {
    if (area < 400) return null;
    if (area <= 900) return upper ? 8 : 3;
    if (area <= 1500) return upper ? 12 : 5;
    return upper ? 15 : 10;
  }
  if (area < 200) return null;
  if (area <= 300) return upper ? 10 : 3;
  if (area <= 900) return upper ? 8 : 3;
  if (area <= 1500) return upper ? 12 : 5;
  return upper ? 15 : 10;
}

function secondaryRoadSetback(projectGoal: ProjectType, area: number, lotType: RegulatoryInput["lotType"]) {
  if (lotType !== "corner") return null;
  if (projectGoal === "dual") {
    if (area < 400) return null;
    if (area <= 900) return 2;
    if (area <= 1500) return 3;
    return 5;
  }
  if (area < 200) return null;
  if (area <= 600) return 2;
  if (area <= 1500) return 3;
  return 5;
}

function councilSource(council: string) {
  if (/blacktown/i.test(council)) {
    return {
      label: "Blacktown DCP 2015 — current council page",
      note: "The current DCP is effective from 1 February 2026. Part C contains the residential DA controls; its dwelling-house checklist includes a 900 mm cut and 600 mm fill benchmark.",
      href: BLACKTOWN_DCP_URL,
    };
  }
  return {
    label: `${council || "Council"} DCP directory`,
    note: "Use the official council page linked from the NSW DCP directory and confirm that the version is current on the day of design.",
    href: NSW_DCP_DIRECTORY_URL,
  };
}

export function calculateRegulatoryScreen(input: RegulatoryInput): RegulatoryScreen {
  const isDual = input.projectGoal === "dual";
  const eligibleZones = isDual ? ["R1", "R2", "R3", "RU5"] : ["R1", "R2", "R3", "R4", "RU5"];
  const areaMinimum = isDual ? 400 : 200;
  const frontageMinimum = isDual ? 15 : 6;
  const pathwayProblems = [
    input.storeys > 2 && "The Housing Code overview is for one- and two-storey homes.",
    input.designHeight > 8.5 && `The generated ${input.designHeight} m concept exceeds the 8.5 m Codes SEPP benchmark.`,
    input.lotArea < areaMinimum && `The ${Math.round(input.lotArea)} m² lot is below the ${areaMinimum} m² starting threshold used by this code screen.`,
    input.frontage < frontageMinimum && `The ${input.frontage} m frontage is below the ${frontageMinimum} m screening width used here.`,
    !eligibleZones.includes(input.zone.toUpperCase()) && `${input.zone || "The mapped zone"} is outside the usual zones for this code screen.`,
  ].filter(Boolean) as string[];

  const routeStatus: RegulatoryScreen["routeStatus"] = pathwayProblems.length ? "outside" : "screened";
  const route = input.projectGoal === "dual" ? "Low Rise Housing Diversity Code screen" : "Housing Code screen";
  const front = frontSetback(input.projectGoal, input.lotArea, input.lotType);
  const side = sideSetback(input.projectGoal, input.frontage, input.designHeight);
  const rear = rearSetback(input.projectGoal, input.lotArea, input.designHeight, input.lotType);
  const secondary = secondaryRoadSetback(input.projectGoal, input.lotArea, input.lotType);
  const landscape = minimumLandscape(input.projectGoal, input.lotArea);
  const setbackEnvelope = front !== null && side !== null && rear !== null
    ? Math.max(0, input.frontage - side * 2) * Math.max(0, input.depth - front - rear)
    : null;
  const nonLandscapeBalance = landscape === null ? null : Math.max(0, input.lotArea - landscape);
  const indicativeFootprintLimit = setbackEnvelope === null || nonLandscapeBalance === null
    ? null
    : Math.min(setbackEnvelope, nonLandscapeBalance);
  const gfaBenchmark = isDual ? dualOccupancyGfa(input.lotArea) : housingCodeGfa(input.lotArea);
  const floorAreaCeiling = input.mappedGfaCap ?? gfaBenchmark;
  const floorAreaStatus: RegulatoryControl["status"] = floorAreaCeiling === null
    ? "review"
    : input.requestedGfa <= floorAreaCeiling && routeStatus === "screened" ? "screened" : input.requestedGfa > floorAreaCeiling ? "outside" : "review";

  const codeExcavationLimit = input.excavationBoundaryDistance <= 1
    ? 1
    : input.excavationBoundaryDistance <= 1.5 ? 2 : 3;
  const excavationFitsCode = input.proposedExcavationDepth <= codeExcavationLimit;
  const blacktown = /blacktown/i.test(input.council);
  const basixRequired = input.projectGoal !== "renovation"
    || input.estimatedCost >= 50_000
    || input.poolCapacity >= 40_000;
  const basixReason = input.projectGoal !== "renovation"
    ? "A BASIX certificate is required for a new NSW dwelling."
    : input.estimatedCost >= 50_000
      ? `The entered $${Math.round(input.estimatedCost).toLocaleString()} alteration/addition reaches the $50,000 BASIX threshold.`
      : input.poolCapacity >= 40_000
        ? `The entered ${Math.round(input.poolCapacity).toLocaleString()} L pool/spa reaches the 40,000 L BASIX threshold.`
        : "Below the entered statutory thresholds, BASIX may be optional or excluded depending on the exact work.";

  const controls: RegulatoryControl[] = [
    {
      key: "setbacks",
      title: "Setbacks + site coverage",
      value: `Front ${metres(front)} · side ${metres(side)} · rear ${metres(rear)}`,
      status: routeStatus === "screened" && front !== null && side !== null && rear !== null ? "screened" : "review",
      eyebrow: isDual ? "Codes SEPP cls 3B.11 + 3B.15" : "Codes SEPP cls 3.10 + 3.13",
      summary: "A survey-based street setback can replace the fallback front number. The current code screen uses minimum landscape and GFA—not an invented universal site-coverage percentage.",
      details: [
        secondary !== null ? `Corner-lot secondary road benchmark: ${metres(secondary)}.` : "No secondary-road number is added for the selected lot type.",
        landscape !== null
          ? `Minimum landscape screen: ${squareMetres(landscape)}; non-landscaped balance: ${squareMetres(nonLandscapeBalance)}.`
          : "A minimum landscape result needs an eligible lot and pathway.",
        indicativeFootprintLimit !== null
          ? `Setback/landscape test envelope: about ${squareMetres(indicativeFootprintLimit)} before easements, trees, parking, privacy, solar access and stormwater. Generated footprint: ${squareMetres(input.footprint)}.`
          : "A defensible footprint envelope needs a detail survey and the missing setback inputs.",
        input.lotType === "battleaxe" ? "The access handle must be separated from relevant lot-area calculations and battle-axe rules need a survey." : "Primary road setback normally follows the two nearest qualifying homes within 40 m; this screen shows the table fallback.",
      ],
      sourceLabel: "Current in-force Codes SEPP",
      sourceHref: CODES_SEPP_URL,
    },
    {
      key: "floor-area",
      title: "Indicative maximum floor area",
      value: floorAreaCeiling === null
        ? "No defensible numeric ceiling"
        : `${squareMetres(floorAreaCeiling)} ${input.mappedGfaCap ? "mapped FSR ceiling" : "code benchmark"}`,
      status: floorAreaStatus,
      eyebrow: input.mappedGfaCap
        ? "NSW mapped FSR"
        : isDual ? "Codes SEPP cl 3B.10" : "Codes SEPP cl 3.9",
      summary: input.mappedGfaCap
        ? "This number comes from the mapped FSR multiplied by the official parcel area."
        : gfaBenchmark !== null
          ? "No numeric FSR was returned. This separate number comes from the current code table and is only relevant if every code eligibility test is satisfied."
          : "No mapped FSR or applicable code-table result exists, so the simulator has not invented an entitlement.",
      details: [
        `Generated room schedule: ${squareMetres(input.requestedGfa)}.`,
        floorAreaCeiling !== null
          ? input.requestedGfa <= floorAreaCeiling
            ? `${squareMetres(floorAreaCeiling - input.requestedGfa)} remains at this screening level.`
            : `The brief is ${squareMetres(input.requestedGfa - floorAreaCeiling)} over this screening ceiling.`
          : "A planner must derive floor-area potential from the current LEP, DCP and approval pathway.",
        routeStatus === "outside" ? "The current brief is outside at least one code-pathway screen, so the table value is not presented as an approval entitlement." : "Passing this number alone does not establish CDC eligibility or development consent.",
      ],
      sourceLabel: input.mappedGfaCap ? "NSW mapped planning layer + parcel" : "Current in-force Codes SEPP",
      sourceHref: input.mappedGfaCap ? "https://www.planningportal.nsw.gov.au/spatialviewer/#/find-a-property/address" : CODES_SEPP_URL,
    },
    {
      key: "excavation",
      title: "Excavation",
      value: `${round(input.proposedExcavationDepth)} m proposed · ${codeExcavationLimit} m code-location benchmark`,
      status: excavationFitsCode && routeStatus === "screened" ? "screened" : input.proposedExcavationDepth > codeExcavationLimit ? "outside" : "review",
      eyebrow: "Codes SEPP cl 3.30 + council DCP",
      summary: "There is no single statewide depth for every approval path. Under this code screen the maximum changes with distance to a boundary, and acid-sulfate soil or proximity to natural water can reduce it to 1 m.",
      details: [
        `Entered excavation is ${round(input.excavationBoundaryDistance)} m from the nearest boundary: the code benchmark is ${codeExcavationLimit} m.`,
        "Excavation is limited to 1 m within 1 m of a boundary, 2 m at more than 1 m up to 1.5 m, and 3 m beyond 1.5 m under this code pathway.",
        "Earthworks more than 600 mm above or below existing ground require certified retaining or structural support under the code.",
        blacktown ? "Blacktown Part C separately lists a 900 mm maximum cut and 600 mm maximum fill for its dwelling-house DA checklist. The actual approval path decides which control applies." : "Council DCP, surveyed levels, services, groundwater and geotechnical advice still need to be checked.",
      ],
      sourceLabel: blacktown ? "Codes SEPP + current Blacktown DCP page" : "Current in-force Codes SEPP",
      sourceHref: blacktown ? BLACKTOWN_DCP_URL : CODES_SEPP_URL,
    },
    {
      key: "basix",
      title: "BASIX",
      value: basixRequired ? "Required on entered facts" : "Below entered thresholds",
      status: basixRequired ? "screened" : "review",
      eyebrow: "NSW BASIX development definition",
      summary: basixReason,
      details: [
        `Entered construction value: $${Math.round(input.estimatedCost).toLocaleString()}.`,
        input.poolCapacity > 0 ? `Entered pool/spa capacity: ${Math.round(input.poolCapacity).toLocaleString()} L.` : "No pool/spa capacity entered.",
        "Alterations and additions to a BASIX building reach the general threshold at $50,000; a pool/spa serving one dwelling reaches it at 40,000 L.",
        "Garages, storerooms, carports, gazebos, verandahs and awnings can be excluded in specified circumstances—confirm the exact scope.",
      ],
      sourceLabel: "Current NSW BASIX definition",
      sourceHref: BASIX_RULE_URL,
    },
  ];

  return {
    route,
    routeStatus,
    routeReason: pathwayProblems.length
      ? pathwayProblems.join(" ")
      : "The entered zone, lot, frontage, storeys and concept height pass the first code-pathway screen. Excluded land, title, survey and all remaining standards still need confirmation.",
    controls,
    councilSource: councilSource(input.council),
  };
}
