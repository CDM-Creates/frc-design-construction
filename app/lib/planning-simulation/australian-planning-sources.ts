export type AustralianJurisdictionCode =
  | "NSW"
  | "VIC"
  | "QLD"
  | "SA"
  | "WA"
  | "TAS"
  | "ACT"
  | "NT";

export type AustralianPlanningSource = {
  name: string;
  url: string;
  authority: string;
  use: string;
  evidenceStatus: "official_public_source" | "official_order_or_login_path";
};

export type AustralianJurisdiction = {
  code: AustralianJurisdictionCode;
  name: string;
  planningPortalName: string;
  planningPortalUrl: string;
  sources: AustralianPlanningSource[];
};

const jurisdictions: Record<AustralianJurisdictionCode, AustralianJurisdiction> = {
  NSW: {
    code: "NSW",
    name: "New South Wales",
    planningPortalName: "NSW Planning Portal Spatial Viewer",
    planningPortalUrl: "https://www.planningportal.nsw.gov.au/spatialviewer/#/find-a-property/address",
    sources: [
      { name: "NSW Planning Portal Spatial Viewer", url: "https://www.planningportal.nsw.gov.au/spatialviewer/#/find-a-property/address", authority: "NSW Department of Planning, Housing and Infrastructure", use: "Property, planning-control and mapped-constraint screening", evidenceStatus: "official_public_source" },
      { name: "NSW legislation", url: "https://legislation.nsw.gov.au/", authority: "NSW Government", use: "In-force legislation, SEPP and environmental planning instrument text", evidenceStatus: "official_public_source" },
      { name: "NSW Planning Portal certificates", url: "https://www.planningportal.nsw.gov.au/", authority: "NSW Government and relevant council", use: "Council-issued certificates and application pathways", evidenceStatus: "official_order_or_login_path" },
    ],
  },
  VIC: {
    code: "VIC",
    name: "Victoria",
    planningPortalName: "VicPlan",
    planningPortalUrl: "https://mapshare.vic.gov.au/vicplan/",
    sources: [
      { name: "VicPlan", url: "https://mapshare.vic.gov.au/vicplan/", authority: "Victorian Department of Transport and Planning", use: "Property planning report, zones, overlays and planning scheme information", evidenceStatus: "official_public_source" },
      { name: "Victorian planning schemes", url: "https://www.planning.vic.gov.au/planning-schemes", authority: "Victorian Department of Transport and Planning", use: "Current planning scheme ordinance and maps", evidenceStatus: "official_public_source" },
      { name: "LANDATA", url: "https://www.landata.vic.gov.au/", authority: "Land Use Victoria", use: "Title, property and registered plan ordering", evidenceStatus: "official_order_or_login_path" },
    ],
  },
  QLD: {
    code: "QLD",
    name: "Queensland",
    planningPortalName: "Queensland Government planning mapping",
    planningPortalUrl: "https://www.planning.qld.gov.au/planning-framework/mapping",
    sources: [
      { name: "Queensland planning mapping", url: "https://www.planning.qld.gov.au/planning-framework/mapping", authority: "Queensland Government", use: "State planning and development assessment mapping", evidenceStatus: "official_public_source" },
      { name: "Queensland Globe", url: "https://qldglobe.information.qld.gov.au/", authority: "Queensland Government", use: "Cadastral and statewide spatial context", evidenceStatus: "official_public_source" },
      { name: "Titles Queensland", url: "https://www.titlesqld.com.au/", authority: "Titles Queensland", use: "Title and survey-plan ordering", evidenceStatus: "official_order_or_login_path" },
    ],
  },
  SA: {
    code: "SA",
    name: "South Australia",
    planningPortalName: "SAPPA",
    planningPortalUrl: "https://sappa.plan.sa.gov.au/",
    sources: [
      { name: "South Australian Property and Planning Atlas", url: "https://sappa.plan.sa.gov.au/", authority: "PlanSA", use: "Planning and property layers under the Planning and Design Code", evidenceStatus: "official_public_source" },
      { name: "PlanSA", url: "https://plan.sa.gov.au/", authority: "Government of South Australia", use: "Planning rules, applications and official guidance", evidenceStatus: "official_public_source" },
      { name: "SAILIS", url: "https://sailis.lssa.com.au/", authority: "Land Services SA", use: "Title and survey information ordering", evidenceStatus: "official_order_or_login_path" },
    ],
  },
  WA: {
    code: "WA",
    name: "Western Australia",
    planningPortalName: "PlanWA",
    planningPortalUrl: "https://www.planning.wa.gov.au/mapping-and-data/planwa",
    sources: [
      { name: "PlanWA", url: "https://www.planning.wa.gov.au/mapping-and-data/planwa", authority: "Western Australian Planning Commission", use: "State and local planning schemes and spatial layers", evidenceStatus: "official_public_source" },
      { name: "Landgate", url: "https://www.landgate.wa.gov.au/", authority: "Landgate", use: "Property, title and survey products", evidenceStatus: "official_order_or_login_path" },
    ],
  },
  TAS: {
    code: "TAS",
    name: "Tasmania",
    planningPortalName: "PlanBuild Tasmania Enquiry",
    planningPortalUrl: "https://portal.planbuild.tas.gov.au/external/enquiry",
    sources: [
      { name: "PlanBuild Tasmania Enquiry", url: "https://portal.planbuild.tas.gov.au/external/enquiry", authority: "Tasmanian Government", use: "Property enquiry, planning zones, codes and application pathways", evidenceStatus: "official_public_source" },
      { name: "The LIST", url: "https://maps.thelist.tas.gov.au/listmap/app/list/map", authority: "Tasmanian Government", use: "Cadastral and statewide spatial information", evidenceStatus: "official_public_source" },
    ],
  },
  ACT: {
    code: "ACT",
    name: "Australian Capital Territory",
    planningPortalName: "ACTmapi",
    planningPortalUrl: "https://www.actmapi.act.gov.au/",
    sources: [
      { name: "ACTmapi", url: "https://www.actmapi.act.gov.au/", authority: "ACT Government", use: "Territory plan, cadastral and constraint mapping", evidenceStatus: "official_public_source" },
      { name: "ACT Planning", url: "https://www.planning.act.gov.au/", authority: "ACT Government", use: "Territory Plan, approvals and planning guidance", evidenceStatus: "official_public_source" },
    ],
  },
  NT: {
    code: "NT",
    name: "Northern Territory",
    planningPortalName: "NT Planning system and NT Atlas",
    planningPortalUrl: "https://nt.gov.au/property/land-planning-and-development/our-planning-system",
    sources: [
      { name: "Northern Territory planning system", url: "https://nt.gov.au/property/land-planning-and-development/our-planning-system", authority: "Northern Territory Government", use: "Planning scheme, development applications and official pathways", evidenceStatus: "official_public_source" },
      { name: "NT Atlas and Spatial Data Directory", url: "https://nrmaps.nt.gov.au/", authority: "Northern Territory Government", use: "Cadastral and territory spatial information", evidenceStatus: "official_public_source" },
    ],
  },
};

export const AUSTRALIAN_JURISDICTIONS = Object.values(jurisdictions);

export function detectAustralianJurisdiction(address: string): AustralianJurisdiction | null {
  const normalised = ` ${address.toUpperCase().replace(/[^A-Z0-9]+/g, " ")} `;
  for (const code of Object.keys(jurisdictions) as AustralianJurisdictionCode[]) {
    if (normalised.includes(` ${code} `)) return jurisdictions[code];
  }
  const postcode = normalised.match(/\b(\d{4})\b/)?.[1];
  if (!postcode) return null;
  const value = Number(postcode);
  if (value >= 800 && value <= 999) return jurisdictions.NT;
  if (value >= 200 && value <= 299) return jurisdictions.ACT;
  if (value >= 3000 && value <= 3999) return jurisdictions.VIC;
  if (value >= 4000 && value <= 4999) return jurisdictions.QLD;
  if (value >= 5000 && value <= 5999) return jurisdictions.SA;
  if (value >= 6000 && value <= 6999) return jurisdictions.WA;
  if (value >= 7000 && value <= 7999) return jurisdictions.TAS;
  if ((value >= 1000 && value <= 2999) || (value >= 2619 && value <= 2899)) return jurisdictions.NSW;
  return null;
}

export function buildAustralianResearchRegister(jurisdiction: AustralianJurisdiction, address: string, retrievedAt: string) {
  return jurisdiction.sources.map((source, index) => ({
    id: `${jurisdiction.code}-OFFICIAL-${index + 1}`,
    code: `${jurisdiction.code}_OFFICIAL_${index + 1}`,
    title: source.name,
    label: source.name,
    sourceType: source.evidenceStatus,
    evidenceClass: source.evidenceStatus,
    access: source.evidenceStatus === "official_order_or_login_path" ? "order_or_login_required" : "public_official_link",
    sourceAuthority: source.authority,
    sourceUrl: source.url,
    propertyAddress: address,
    purpose: source.use,
    retrievedAt,
    status: "source_path_identified_requires_property_confirmation",
    note: `${source.use}. The property-specific result must still be confirmed from the underlying source.`,
    prerequisite: source.evidenceStatus === "official_order_or_login_path" ? "Client upload, authority login, ordering and any applicable fee" : null,
    url: source.url,
    limitations: "The official source path is retained. A property-specific value is not asserted unless the source response or uploaded evidence supports it.",
  }));
}
