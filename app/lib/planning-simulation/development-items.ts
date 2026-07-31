import type {
  DevelopmentCategory,
  DevelopmentItemDefinition,
} from "./types";

export const DEVELOPMENT_CATEGORIES: Array<{
  code: DevelopmentCategory;
  name: string;
  description: string;
}> = [
  { code: "pool_spa", name: "Pool or spa", description: "Pools, spas and associated structures." },
  { code: "granny_flat", name: "Granny flat", description: "Attached or detached secondary dwellings." },
  { code: "home_extension", name: "Home extension", description: "Extensions, additions and more living space." },
  { code: "new_home", name: "New house", description: "A new dwelling or knockdown-rebuild." },
  { code: "outdoor_living", name: "Outdoor living", description: "Decks, pergolas, landscaping and recreation." },
  { code: "garage_outbuilding", name: "Garage or outbuilding", description: "Parking, studios, sheds and site structures." },
  { code: "renovation", name: "Renovation", description: "Alterations to an existing dwelling." },
  { code: "investor", name: "Investor or land potential", description: "Compare development and improvement options." },
  { code: "complex", name: "Something more complex", description: "Subdivision, multiple dwellings and constrained sites." },
];

const reportSections = {
  home: ["Permissibility and approval pathway", "Building envelope and height", "Setbacks and site coverage", "Access, parking and private open space"],
  granny: ["Secondary-dwelling permissibility", "Site and floor-area standards", "Access, parking, privacy and services", "Principal-dwelling relationship"],
  pool: ["Location and boundary setbacks", "Pool fencing and safety", "Drainage, equipment noise and BASIX", "Neighbour amenity"],
  extension: ["Existing-building relationship", "Setbacks, height and floor area", "Solar access, privacy and overlooking", "Structure and approval pathway"],
  outdoor: ["Location and setbacks", "Site coverage and landscaped area", "Privacy, drainage and amenity", "Construction and approval pathway"],
  structure: ["Permissibility and siting", "Access, setbacks and fire separation", "Stormwater and services", "Building approval pathway"],
  renovation: ["Existing approvals and building fabric", "Proposed alterations", "NCC, access and amenity", "Approval and consultant requirements"],
  investor: ["Development pathways", "Comparative site capacity", "Planning and delivery risks", "Recommended investigation sequence"],
  complex: ["Planning pathway", "Specialist investigations", "Site and title constraints", "Tailored scope requirements"],
};

const standard = (
  code: string,
  name: string,
  category: DevelopmentCategory,
  description: string,
  reportAssessmentSections: string[],
  extra: Partial<DevelopmentItemDefinition> = {},
): DevelopmentItemDefinition => ({
  code,
  name,
  category,
  description,
  pricingType: "standard",
  reportAssessmentSections,
  ...extra,
});

const quote = (
  code: string,
  name: string,
  description: string,
  quoteReason: string,
): DevelopmentItemDefinition => ({
  code,
  name,
  category: "complex",
  description,
  pricingType: "quote",
  quoteReason,
  reportAssessmentSections: reportSections.complex,
});

export const DEVELOPMENT_ITEMS: DevelopmentItemDefinition[] = [
  standard("NEW_SINGLE_STOREY_DWELLING", "New single-storey dwelling", "new_home", "Assess a new home arranged on one level.", reportSections.home, { aliases: ["new house", "single level"] }),
  standard("NEW_TWO_STOREY_DWELLING", "New two-storey dwelling", "new_home", "Assess a new home arranged across two levels.", reportSections.home, { aliases: ["new house", "double storey"] }),
  standard("KNOCKDOWN_REBUILD", "Knockdown and rebuild", "new_home", "Compare removal of the existing dwelling with a new-home pathway.", reportSections.home, { aliases: ["demolish rebuild", "KDR"] }),
  standard("FIRST_FLOOR_ADDITION", "First-floor addition", "home_extension", "Add a substantial new upper level to the existing home.", reportSections.extension),
  standard("HOME_EXTENSION", "Home extension", "home_extension", "Assess one coordinated extension to the existing home.", reportSections.extension, {
    aliases: ["rear extension", "side extension", "extra room"],
    selectableDetails: ["Ground-floor extension", "Rear extension", "Side extension", "Additional bedroom", "Additional bathroom", "Kitchen and living-area extension"],
  }),
  standard("INTERNAL_RECONFIGURATION", "Internal alteration and reconfiguration", "renovation", "Replan internal spaces without treating each room as a separate item.", reportSections.renovation),
  standard("ATTIC_CONVERSION", "Attic or roof-space conversion", "renovation", "Assess using the roof space as habitable floor area.", reportSections.renovation),
  standard("ALTERATIONS_ADDITIONS", "Alterations and additions to an existing dwelling", "renovation", "One coordinated assessment of renovation works.", reportSections.renovation, {
    selectableDetails: ["Major renovation", "Façade alteration", "Roof alteration", "New balcony", "Balcony enclosure", "Window or door changes", "New entrance", "Internal reconfiguration", "Garage conversion", "Enclosure of patio or alfresco", "Accessibility modifications"],
  }),
  standard("ATTACHED_GRANNY_FLAT", "Attached granny flat", "granny_flat", "A secondary dwelling connected to the principal home.", reportSections.granny, { aliases: ["secondary dwelling"], mutuallyExclusiveWith: ["DETACHED_GRANNY_FLAT"] }),
  standard("DETACHED_GRANNY_FLAT", "Detached granny flat", "granny_flat", "A separate secondary dwelling on the same property.", reportSections.granny, { aliases: ["secondary dwelling"], mutuallyExclusiveWith: ["ATTACHED_GRANNY_FLAT"] }),
  standard("SWIMMING_POOL", "Swimming pool", "pool_spa", "A new swimming pool without a connected spa.", reportSections.pool, { mutuallyExclusiveWith: ["POOL_SPA"] }),
  standard("POOL_SPA", "Swimming pool and spa", "pool_spa", "One connected pool-and-spa development item.", reportSections.pool, { aliases: ["pool", "spa", "pool & spa"], mutuallyExclusiveWith: ["SWIMMING_POOL", "STANDALONE_SPA"] }),
  standard("STANDALONE_SPA", "Standalone spa", "pool_spa", "A spa installation separate from a swimming pool.", reportSections.pool, { mutuallyExclusiveWith: ["POOL_SPA"] }),
  standard("KIDDIE_POOL", "Kiddie pool", "pool_spa", "A small purpose-designed pool installation.", reportSections.pool),
  standard("POOL_RELOCATION", "Pool relocation", "pool_spa", "Remove or relocate an existing pool.", reportSections.pool),
  standard("POOL_ALTERATION", "Pool enlargement or alteration", "pool_spa", "Alter the size, depth or configuration of an existing pool.", reportSections.pool),
  standard("POOL_HOUSE", "Pool house", "pool_spa", "A separate enclosed structure associated with the pool.", reportSections.structure),
  standard("CABANA", "Cabana", "pool_spa", "A poolside shade or entertaining structure.", reportSections.outdoor),
  standard("DECK", "Deck", "outdoor_living", "A new or enlarged outdoor deck.", reportSections.outdoor),
  standard("ALFRESCO", "Alfresco area", "outdoor_living", "A covered outdoor living area connected to the home.", reportSections.outdoor),
  standard("PERGOLA", "Pergola", "outdoor_living", "A freestanding or attached shade structure.", reportSections.outdoor),
  standard("PATIO", "Patio", "outdoor_living", "A paved or roofed outdoor area.", reportSections.outdoor),
  standard("OUTDOOR_KITCHEN", "Outdoor kitchen", "outdoor_living", "A serviced external cooking and entertaining area.", reportSections.outdoor),
  standard("COVERED_ENTERTAINMENT", "Covered entertainment area", "outdoor_living", "A coordinated roofed entertaining structure.", reportSections.outdoor),
  standard("FIREPIT_ZONE", "Firepit or outdoor entertaining zone", "outdoor_living", "A dedicated external gathering area.", reportSections.outdoor),
  standard("LANDSCAPE_REDESIGN", "Major landscape redesign", "outdoor_living", "Whole-site landscape, access and open-space planning.", reportSections.outdoor),
  standard("RETAINING_WALLS", "Retaining walls", "outdoor_living", "Assess retaining works that are not already a major-complexity trigger.", reportSections.outdoor, { aliases: ["retaining wall"] }),
  standard("TENNIS_COURT", "Tennis or recreational court", "outdoor_living", "A private court with associated access, drainage and amenity.", reportSections.outdoor),
  standard("OUTBUILDING", "Outbuilding", "garage_outbuilding", "One coordinated ancillary building.", reportSections.structure, { aliases: ["shed", "workshop", "storage building"], selectableDetails: ["Shed", "Workshop", "Storage building"] }),
  standard("DETACHED_GARAGE", "Detached garage", "garage_outbuilding", "A garage separate from the dwelling.", reportSections.structure, { aliases: ["garage"] }),
  standard("ATTACHED_GARAGE", "Attached garage", "garage_outbuilding", "A garage connected to the dwelling.", reportSections.structure),
  standard("CARPORT", "Carport", "garage_outbuilding", "A covered vehicle parking structure.", reportSections.structure),
  standard("FARM_OUTBUILDING", "Farm or rural outbuilding", "garage_outbuilding", "One rural ancillary building without a multi-building development scope.", reportSections.structure),
  standard("DETACHED_STUDIO", "Home office or detached studio", "garage_outbuilding", "A non-dwelling studio or work space.", reportSections.structure, { aliases: ["studio", "home office"] }),
  standard("GARDEN_ROOM", "Garden room, gym or games room", "garage_outbuilding", "One ancillary recreation or garden building.", reportSections.structure, { selectableDetails: ["Garden room", "Home gym", "Games room", "Greenhouse", "Gazebo"] }),
  standard("FRONT_BOUNDARY_ENTRY", "Front boundary and entry works", "garage_outbuilding", "One coordinated front fence, wall and gate item.", reportSections.structure, { aliases: ["front fence", "entry gates"], selectableDetails: ["Front fence", "Front wall", "Entry gates"] }),
  standard("BOUNDARY_FENCE", "Boundary fence", "garage_outbuilding", "Side or rear boundary fencing.", reportSections.structure),
  standard("VEHICLE_ACCESS", "Vehicle access and parking works", "garage_outbuilding", "One coordinated driveway, parking and crossover item.", reportSections.structure, { aliases: ["driveway", "parking", "crossover"], selectableDetails: ["Driveway", "Additional parking area", "Vehicle crossover"] }),
  standard("ACCESSIBLE_EXTERNAL_WORKS", "Accessible ramp or external access works", "garage_outbuilding", "External works to improve accessible entry.", reportSections.structure),
  standard("RETAIN_HOUSE_GRANNY", "Retain house and add a granny flat", "investor", "Test the retained dwelling and a secondary dwelling together.", reportSections.investor),
  standard("RETAIN_HOUSE_EXTENSION", "Retain house and add an extension", "investor", "Test improvement potential while retaining the existing house.", reportSections.investor),
  standard("COMPARE_STOREYS", "Compare single-storey and two-storey potential", "investor", "Compare two new-home development options.", reportSections.investor),
  standard("COMPARE_RENOVATE_REBUILD", "Compare renovation and knockdown-rebuild potential", "investor", "Compare two distinct investment pathways.", reportSections.investor),
  standard("MAX_BUILDING_ENVELOPE", "Maximum building-envelope assessment", "investor", "Assess broad site capacity without inventing unverified controls.", reportSections.investor),
  standard("FUTURE_POOL_GRANNY", "Future pool and granny-flat potential", "investor", "Test a staged or combined pool and secondary-dwelling opportunity.", reportSections.investor),
  standard("RENTAL_POTENTIAL", "Preliminary rental-development potential", "investor", "Planning-led rental potential only; market figures require licensed data.", reportSections.investor),
  standard("RESALE_IMPROVEMENT", "Preliminary resale-improvement potential", "investor", "Planning-led improvement options without invented valuation data.", reportSections.investor),
  standard("VACANT_LAND", "Vacant-land development assessment", "investor", "Assess planning and site-readiness for one standard dwelling outcome.", reportSections.investor),
  standard("DEVELOPMENT_STAGING", "Development staging assessment", "investor", "Consider a practical sequence for standard works.", reportSections.investor),
  quote("DUPLEX", "Duplex or dual occupancy", "Two principal dwellings or a dual-occupancy proposal.", "Duplex and dual-occupancy projects require tailored planning, design and approval-pathway assessment."),
  quote("TOWNHOUSES", "Townhouses, villas or manor houses", "Medium-density residential development.", "Multi-dwelling development requires a tailored architectural and planning scope."),
  quote("MULTI_DWELLING", "Multiple dwellings or more than two dwellings", "A residential development containing several dwellings.", "Multiple dwellings require tailored yield, access, servicing and planning assessment."),
  quote("SPECIALIST_HOUSING", "Boarding, co-living, seniors or specialist housing", "Special-purpose housing with detailed statutory requirements.", "Specialist housing requires a tailored planning and consultant scope."),
  quote("COMMERCIAL_MIXED_USE", "Commercial, childcare or mixed-use development", "A non-standard residential or mixed-use proposal.", "Commercial and mixed-use projects require a tailored scope."),
  quote("CHANGE_OF_USE", "Change of use or industrial development", "Change an approved land use or assess an industrial proposal.", "Change-of-use and industrial projects require tailored statutory review."),
  quote("SUBDIVISION", "Subdivision", "Create additional legal lots.", "Subdivision requires individual review of lot dimensions, minimum lot size, access, servicing, easements and environmental constraints."),
  quote("BOUNDARY_ADJUSTMENT", "Boundary, strata or community-title subdivision", "Alter title boundaries or ownership arrangements.", "Title and subdivision work requires a tailored survey, legal and planning scope."),
  quote("MULTIPLE_PROPERTIES", "Multiple adjoining properties or several lots", "Assess land across more than one property or title.", "Several properties or lots require a tailored cadastral and planning assessment."),
  quote("HERITAGE_COMPLEX", "Heritage-listed property or major heritage alterations", "Work affecting a heritage item or significant heritage fabric.", "Heritage work requires a tailored architectural and specialist assessment."),
  quote("ENVIRONMENTAL_COMPLEX", "Significant environmental constraints", "Bushfire, flood, biodiversity, contamination, waterfront or steep-land complexity.", "Significant environmental constraints require tailored specialist review."),
  quote("MAJOR_SITE_WORKS", "Major excavation or large retaining structures", "Substantial earthworks or structural retaining systems.", "Major site works require tailored engineering, geotechnical and planning assessment."),
  quote("RURAL_MULTIPLE_BUILDINGS", "Rural development with multiple buildings", "A coordinated rural development containing several structures.", "Multi-building rural development requires a tailored planning and servicing scope."),
  quote("SOMETHING_COMPLEX", "Something more complex", "A proposal that does not fit the standard fixed-price scope.", "The requested scope needs an FRC review before a fixed fee can be confirmed."),
];

export const DEVELOPMENT_ITEM_BY_CODE = new Map(
  DEVELOPMENT_ITEMS.map((item) => [item.code, item]),
);

