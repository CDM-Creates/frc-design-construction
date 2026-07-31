import type { SiteAreaPricingInput } from "./report-catalogue";

export const BOUNDARY_STATUS_LABELS = {
  survey_confirmed: "Survey confirmed",
  deposited_plan_supported: "Deposited plan supported",
  official_parcel_mapped: "Official parcel mapping",
  client_supplied: "Client supplied",
  approximate_only: "Approximate only",
  unavailable: "Not available",
  conflict_detected: "Conflicting information",
} as const;

export type BoundaryStatus = keyof typeof BOUNDARY_STATUS_LABELS;

export type PropertyBoundaryRecord = {
  propertyId: string;
  address: string;
  lot: string | null;
  depositedPlan: string | null;
  localGovernmentArea: string | null;
  areaSqm: number | null;
  areaSource: string;
  areaStatus: BoundaryStatus;
  retrievedAt: string | null;
  boundaryGeometrySource: string | null;
  parcelCount: number;
  geometryReference: string | null;
  geometryStatus: BoundaryStatus;
  registeredSurveySupplied: boolean;
  exactDimensionsAvailable: boolean;
  conflictStatus: "none" | "immaterial" | "material";
  ruralOrNonStandard: boolean;
};

export const MAPPED_BOUNDARY_NOTICE =
  "The displayed parcel area and boundary representation are based on available property or mapping information. Exact boundaries, dimensions and levels require confirmation by a registered surveyor.";

export const INDICATIVE_PARCEL_LABEL = "Indicative parcel diagram — not a registered survey";

export function validateBoundaryRecord(record: PropertyBoundaryRecord) {
  const issues: string[] = [];
  if (!record.address.trim()) issues.push("A property address is required.");
  if (record.areaSqm !== null && (!Number.isFinite(record.areaSqm) || record.areaSqm <= 0)) {
    issues.push("Land area must be a positive number when supplied.");
  }
  if (record.parcelCount < 1 || !Number.isInteger(record.parcelCount)) issues.push("Parcel count must be at least one.");
  if (record.areaStatus === "survey_confirmed" && !record.registeredSurveySupplied) {
    issues.push("A boundary cannot be labelled survey confirmed without a registered survey.");
  }
  if (record.exactDimensionsAvailable && !["survey_confirmed", "deposited_plan_supported"].includes(record.geometryStatus)) {
    issues.push("Exact boundary dimensions require a registered survey or readable deposited plan.");
  }
  if (record.conflictStatus === "material" && record.areaStatus !== "conflict_detected") {
    issues.push("A material area conflict must use conflict_detected status.");
  }
  return { valid: issues.length === 0, issues };
}

export function toSiteAreaPricingInput(record: PropertyBoundaryRecord): SiteAreaPricingInput {
  return {
    areaSqm: record.areaSqm,
    areaStatus: record.areaStatus,
    parcelCount: record.parcelCount,
    ruralOrNonStandard: record.ruralOrNonStandard,
  };
}

export function buildIndicativeParcelDiagramModel(record: PropertyBoundaryRecord) {
  const validation = validateBoundaryRecord(record);
  if (!validation.valid) throw new Error(validation.issues.join(" "));
  return {
    label: INDICATIVE_PARCEL_LABEL,
    parcelIdentifier: [record.lot ? `Lot ${record.lot}` : null, record.depositedPlan].filter(Boolean).join(" / ") || "Parcel identifier unavailable",
    mappedArea: record.areaSqm,
    northIndicator: "North direction subject to source data",
    streetFrontage: "Street frontage indicative",
    scaleStatus: "Not to scale",
    sourceLabel: record.boundaryGeometrySource ?? record.areaSource,
    disclaimer: record.registeredSurveySupplied ? null : MAPPED_BOUNDARY_NOTICE,
    mayDisplayBoundaryLengths: record.exactDimensionsAvailable,
  };
}
