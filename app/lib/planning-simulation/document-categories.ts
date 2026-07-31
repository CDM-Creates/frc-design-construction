import type {
  DocumentAnalysisUpgradeCode,
  DocumentCategoryCode,
} from "./types";

export type DocumentCategoryDefinition = {
  code: DocumentCategoryCode;
  label: string;
  description: string;
  multiple: boolean;
  acceptedFormats: string;
  premiumUpgradeCode?: DocumentAnalysisUpgradeCode;
  premiumLabel?: string;
  premiumFeeCents?: number;
  manualOnlyFormats?: string;
};

export const DOCUMENT_CATEGORIES: DocumentCategoryDefinition[] = [
  {
    code: "architectural_plans",
    label: "Architectural plans",
    description: "Site, floor, roof, elevation, section and schedule drawings.",
    multiple: true,
    acceptedFormats: "PDF, JPG, JPEG, PNG or TIFF",
    premiumUpgradeCode: "architectural_plan_set",
    premiumLabel: "Complete architectural plan-set analysis",
    premiumFeeCents: 59_500,
    manualOnlyFormats: "DWG and DXF are retained for manual review; include a PDF for automated interpretation.",
  },
  {
    code: "registered_detail_survey",
    label: "Registered detail survey",
    description: "A current survey prepared by a registered surveyor.",
    multiple: true,
    acceptedFormats: "PDF, JPG, JPEG, PNG or TIFF",
    premiumUpgradeCode: "registered_survey",
    premiumLabel: "Registered detail survey interpretation",
    premiumFeeCents: 19_500,
  },
  {
    code: "section_10_7_certificate",
    label: "Section 10.7 certificate",
    description: "Council-issued planning certificate and attachments.",
    multiple: true,
    acceptedFormats: "PDF, JPG, JPEG, PNG or TIFF",
  },
  {
    code: "basix_certificate",
    label: "BASIX certificate",
    description: "Current certificate and commitments applying to the proposal.",
    multiple: true,
    acceptedFormats: "PDF, JPG, JPEG, PNG or TIFF",
  },
  {
    code: "title_and_deposited_plan",
    label: "Title search and deposited plan",
    description: "Current title, deposited plan and relevant dealings.",
    multiple: true,
    acceptedFormats: "PDF, JPG, JPEG, PNG or TIFF",
  },
  {
    code: "engineering_drawings",
    label: "Engineering drawings",
    description: "Structural, civil or other engineering drawing sets.",
    multiple: true,
    acceptedFormats: "PDF, JPG, JPEG, PNG or TIFF",
    premiumUpgradeCode: "engineering_or_stormwater",
    premiumLabel: "Engineering or stormwater drawing-set interpretation",
    premiumFeeCents: 29_500,
    manualOnlyFormats: "DWG and DXF are retained for manual review; include a PDF for automated interpretation.",
  },
  {
    code: "stormwater_drawings",
    label: "Stormwater drawings",
    description: "Drainage, OSD, civil or stormwater concept drawings.",
    multiple: true,
    acceptedFormats: "PDF, JPG, JPEG, PNG or TIFF",
    premiumUpgradeCode: "engineering_or_stormwater",
    premiumLabel: "Engineering or stormwater drawing-set interpretation",
    premiumFeeCents: 29_500,
    manualOnlyFormats: "DWG and DXF are retained for manual review; include a PDF for automated interpretation.",
  },
  {
    code: "bushfire_report",
    label: "Bushfire report",
    description: "BAL certificate, bushfire assessment or bushfire protection report.",
    multiple: true,
    acceptedFormats: "PDF, JPG, JPEG, PNG or TIFF",
    premiumUpgradeCode: "bushfire_report",
    premiumLabel: "Bushfire report interpretation",
    premiumFeeCents: 25_000,
  },
  {
    code: "flood_report",
    label: "Flood report",
    description: "Flood certificate, flood study or flood-risk report.",
    multiple: true,
    acceptedFormats: "PDF, JPG, JPEG, PNG or TIFF",
    premiumUpgradeCode: "flood_report",
    premiumLabel: "Flood report interpretation",
    premiumFeeCents: 25_000,
  },
  {
    code: "arborist_report",
    label: "Arborist report",
    description: "Tree assessment, arboricultural impact assessment or protection plan.",
    multiple: true,
    acceptedFormats: "PDF, JPG, JPEG, PNG or TIFF",
    premiumUpgradeCode: "arborist_report",
    premiumLabel: "Arborist report interpretation",
    premiumFeeCents: 25_000,
  },
  {
    code: "geotechnical_report",
    label: "Geotechnical report",
    description: "Geotechnical, slope-stability or site-classification report.",
    multiple: true,
    acceptedFormats: "PDF, JPG, JPEG, PNG or TIFF",
    premiumUpgradeCode: "geotechnical_report",
    premiumLabel: "Geotechnical report interpretation",
    premiumFeeCents: 25_000,
  },
  {
    code: "other_specialist_report",
    label: "Other specialist report",
    description: "Acoustic, contamination, biodiversity, traffic or another consultant report.",
    multiple: true,
    acceptedFormats: "PDF, JPG, JPEG, PNG or TIFF",
    premiumUpgradeCode: "other_specialist_report",
    premiumLabel: "Other specialist report interpretation",
    premiumFeeCents: 25_000,
  },
  {
    code: "council_correspondence",
    label: "Council correspondence",
    description: "Pre-lodgement notes, requests for information or written council advice.",
    multiple: true,
    acceptedFormats: "PDF, JPG, JPEG, PNG or TIFF",
  },
  {
    code: "previous_approvals",
    label: "Previous approvals",
    description: "Development consents, complying certificates and approved plans.",
    multiple: true,
    acceptedFormats: "PDF, JPG, JPEG, PNG or TIFF",
  },
  {
    code: "site_photographs",
    label: "Site photographs",
    description: "Current photographs of the site, boundaries, buildings and constraints.",
    multiple: true,
    acceptedFormats: "JPG, JPEG, PNG or TIFF",
  },
  {
    code: "reference_material",
    label: "Reference images or supplier brochures",
    description: "Authorised screenshots, inspiration images, supplier brochures, floor plans or elevations used only to understand the intended outcome.",
    multiple: true,
    acceptedFormats: "PDF, JPG, JPEG, PNG or TIFF",
  },
  {
    code: "sewer_services_diagram",
    label: "Sewer or services diagram",
    description: "Available sewer, water, drainage or other service information. Unknown routes remain unconfirmed.",
    multiple: true,
    acceptedFormats: "PDF, JPG, JPEG, PNG or TIFF",
  },
  {
    code: "other_supporting_document",
    label: "Other supporting document",
    description: "Another authorised property or project document relevant to the selected report.",
    multiple: true,
    acceptedFormats: "PDF, JPG, JPEG, PNG or TIFF",
  },
];

export const DOCUMENT_CATEGORY_BY_CODE = new Map(
  DOCUMENT_CATEGORIES.map((category) => [category.code, category]),
);

export const DOCUMENT_ANALYSIS_UPGRADE_BY_CODE = new Map(
  DOCUMENT_CATEGORIES.flatMap((category) =>
    category.premiumUpgradeCode &&
    category.premiumLabel &&
    category.premiumFeeCents
      ? [
          [
            category.premiumUpgradeCode,
            {
              code: category.premiumUpgradeCode,
              label: category.premiumLabel,
              feeCents: category.premiumFeeCents,
              eligibleDocumentCategories: DOCUMENT_CATEGORIES.filter(
                (candidate) =>
                  candidate.premiumUpgradeCode === category.premiumUpgradeCode,
              ).map((candidate) => candidate.code),
            },
          ] as const,
        ]
      : [],
  ),
);

export const COUNCIL_READINESS_REQUIRED_DOCUMENTS: DocumentCategoryCode[] = [
  "architectural_plans",
  "registered_detail_survey",
  "section_10_7_certificate",
  "basix_certificate",
  "title_and_deposited_plan",
];
