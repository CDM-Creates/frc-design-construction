export type ClientRole =
  | "owner"
  | "buyer"
  | "investor"
  | "builder"
  | "architect_designer"
  | "other_professional";

export type AssessmentMode = "single" | "combined" | "alternatives";

export type DevelopmentCategory =
  | "new_home"
  | "granny_flat"
  | "pool_spa"
  | "home_extension"
  | "outdoor_living"
  | "garage_outbuilding"
  | "renovation"
  | "investor"
  | "complex";

export type DevelopmentItemDefinition = {
  code: string;
  name: string;
  category: DevelopmentCategory;
  description: string;
  pricingType: "standard" | "quote";
  aliases?: string[];
  selectableDetails?: string[];
  mutuallyExclusiveWith?: string[];
  quoteReason?: string;
  reportAssessmentSections: string[];
};

export type PlansStatus =
  | "none"
  | "frc_final"
  | "frc_in_progress"
  | "external_complete"
  | "external_incomplete"
  | "sheila_concept_required";

export type PropertyConstraintPricingInput = {
  code: string;
  label: string;
  severity: "low" | "moderate" | "significant" | "unknown";
  quoteTriggered: boolean;
  sourceStatus: "official" | "uploaded" | "client_supplied" | "not_verified";
};

export type DocumentCategoryCode =
  | "architectural_plans"
  | "registered_detail_survey"
  | "section_10_7_certificate"
  | "basix_certificate"
  | "title_and_deposited_plan"
  | "engineering_drawings"
  | "stormwater_drawings"
  | "bushfire_report"
  | "flood_report"
  | "arborist_report"
  | "geotechnical_report"
  | "other_specialist_report"
  | "council_correspondence"
  | "previous_approvals"
  | "site_photographs"
  | "reference_material"
  | "sewer_services_diagram"
  | "other_supporting_document";

export type DocumentAnalysisUpgradeCode =
  | "architectural_plan_set"
  | "registered_survey"
  | "engineering_or_stormwater"
  | "bushfire_report"
  | "flood_report"
  | "arborist_report"
  | "geotechnical_report"
  | "other_specialist_report";

export type TaxTreatment =
  | "aud_including_gst"
  | "gst_not_applicable"
  | "unconfigured_test_only";

export type PlanningPricingInput = {
  propertyCount: number;
  selectedItemCodes: string[];
  clientRequestedLargeSiteAnalysis: boolean;
  plansStatus: PlansStatus;
  documentAnalysisUpgrades: DocumentAnalysisUpgradeCode[];
  detailedAlternativesRequested: boolean;
  councilSubmissionRequested: boolean;
  professionalVerificationRequested: boolean;
  priorityRequested: boolean;
  discoveredConstraints: PropertyConstraintPricingInput[];
  preliminaryOrVerified: "preliminary" | "verified";
  browserClaimedTotalCents?: number;
};

export type PricingLineItem = {
  code: string;
  publicLabel: string;
  internalDescription: string;
  amountCents: number;
  taxTreatment: TaxTreatment;
  pricingVersion: string;
  associatedDevelopmentItem: string | null;
  associatedDocumentCategory: DocumentAnalysisUpgradeCode | null;
  reason: string;
  manuallyAdjustableByAuthorisedAdministrator: boolean;
  treatment: "base" | "assessment" | "coordination" | "upgrade" | "minimum_adjustment";
};

export type PlanningPricingResult = {
  currency: "AUD";
  preliminaryOrVerified: "preliminary" | "verified";
  corePriceCents: number;
  assessmentCount: number;
  lineItems: PricingLineItem[];
  quoteRequired: boolean;
  quoteReasons: string[];
  tailoredEngagementFromCents: number | null;
  subtotalCents: number | null;
  totalCents: number | null;
  taxTreatment: TaxTreatment;
  pricingVersion: string;
};

export type FrozenPriceSnapshot = PlanningPricingResult & {
  snapshotId: string;
  frozenAt: string;
  inputHash: string;
};

export type SelectedDevelopmentItem = {
  code: string;
  selectedDetails: string[];
  selectionOrder: number;
};

export type PropertySourceStatus =
  | "Retrieved"
  | "Uploaded"
  | "Verified"
  | "Requires upload"
  | "Requires ordering"
  | "Requires professional review"
  | "Not connected"
  | "Not applicable"
  | "Error";

export type ReportTemplateKind =
  | "preliminary_property_report"
  | "architect_handover"
  | "council_submission_readiness"
  | "tailored_quote_brief";
