export type FRCService = {
  id: string;
  title: string;
  introduction: string;
  suitableFor: string;
  receives: string[];
  nextStep: string;
};

export const services: FRCService[] = [
  {
    id: "custom-home-design",
    title: "Custom Home Design",
    introduction: "A site-responsive home developed around your brief, priorities and the constraints that shape the land.",
    suitableFor: "Clients planning a new residence and seeking an architectural response rather than a standard plan.",
    receives: ["Brief and site review", "Concept options", "Design development", "Documentation matched to the agreed scope"],
    nextStep: "Begin with a consultation and the information already available for the property.",
  },
  {
    id: "single-storey-homes",
    title: "Single-Storey Homes",
    introduction: "Considered single-level planning that focuses on flow, light, accessibility and connection to outdoor space.",
    suitableFor: "Families, downsizers and clients who want everyday living resolved on one level.",
    receives: ["Site and planning review", "Room and circulation planning", "Concept design", "Documentation matched to the approval pathway"],
    nextStep: "Share the site, accommodation needs and the qualities you want the home to support.",
  },
  {
    id: "double-storey-homes",
    title: "Double-Storey Homes",
    introduction: "Two-level homes designed to organise privacy, outlook, living and site occupation with clarity.",
    suitableFor: "Sites or briefs where a second level may support the required programme, subject to planning controls.",
    receives: ["Massing and floor-planning studies", "Site and planning review", "Concept visualisation", "Coordinated documentation"],
    nextStep: "FRC can test the brief against the site dimensions and available mapped controls.",
  },
  {
    id: "duplex-design",
    title: "Duplex Design",
    introduction: "Paired-home design that considers site efficiency, address, privacy and a coherent architectural identity.",
    suitableFor: "Owner-builders, families and development clients exploring dual occupancy, subject to site constraints and planning controls.",
    receives: ["Preliminary site review", "Two-home planning studies", "Concept design", "Approval and consultant coordination where required"],
    nextStep: "Start with the property address, title information and the intended relationship between the two homes.",
  },
  {
    id: "granny-flats",
    title: "Granny Flats",
    introduction: "Compact secondary-dwelling design focused on useful space, privacy and a considered relationship to the main home.",
    suitableFor: "Households considering multigenerational living, guest accommodation or a secondary dwelling where permissible.",
    receives: ["Site fit review", "Compact accommodation planning", "Concept design", "Approval documentation matched to the selected pathway"],
    nextStep: "Provide the site plan or survey if available so access, private open space and services can be reviewed.",
  },
  {
    id: "extensions-alterations",
    title: "Extensions & Alterations",
    introduction: "Existing homes reworked with a clear distinction between what should be retained, improved, removed or added.",
    suitableFor: "Clients who value their current location but need the home to work differently.",
    receives: ["Existing-condition review", "Alteration and addition options", "Material and spatial development", "Documentation coordinated with relevant consultants"],
    nextStep: "Share existing plans, photos and the problems the current home needs to solve.",
  },
  {
    id: "townhouses-multi-dwelling",
    title: "Townhouses & Multi-Dwelling",
    introduction: "Residential development studies that balance yield, amenity, access, landscape and neighbourhood context.",
    suitableFor: "Property owners and development clients testing multi-dwelling opportunities subject to site and planning controls.",
    receives: ["Site and control review", "Preliminary planning and yield studies", "Concept development", "Consultant coordination where required"],
    nextStep: "Begin with verified property information and a discussion about the intended development model.",
  },
  {
    id: "commercial-design",
    title: "Commercial Design",
    introduction: "Workplace, hospitality, community and customer-facing environments planned around operational needs and experience.",
    suitableFor: "Businesses and organisations requiring a considered spatial response to an existing or proposed premises.",
    receives: ["Operational brief", "Spatial and circulation planning", "Concept design", "Documentation matched to the agreed project scope"],
    nextStep: "Outline the premises, intended use, stakeholder needs and any known approval requirements.",
  },
  {
    id: "visualisation",
    title: "3D Rendering & Visualisation",
    introduction: "Architectural visualisation used to understand massing, materials, atmosphere and design decisions before construction.",
    suitableFor: "Clients, project teams and approval processes that benefit from clear visual communication.",
    receives: ["Model views", "Material direction", "Exterior or interior studies", "Presentation imagery matched to the agreed purpose"],
    nextStep: "Provide current drawings or discuss the modelling information that needs to be established first.",
  },
  {
    id: "planning-approval-support",
    title: "Planning & Approval Support",
    introduction: "A structured review of available controls and the documentation needed to support an appropriate approval pathway.",
    suitableFor: "Clients who need guidance through early feasibility, council or certifier coordination and consultant inputs.",
    receives: ["Available-control review", "Information-gap register", "Approval documentation", "Coordination with relevant consultants where required"],
    nextStep: "Start with the property address, available title or survey information and the intended project scope.",
  },
];

export const processStages = [
  {
    id: "initial-consultation",
    title: "Initial Consultation",
    summary: "Define the site, project goals, current information and the decisions that need to be made first.",
    outputs: ["Initial project conversation", "Available-information review", "Recommended next-step scope"],
  },
  {
    id: "site-planning-review",
    title: "Site & Planning Review",
    summary: "Review the property, available mapping and supplied documents before relying on an assumed development envelope.",
    outputs: ["Source-aware site review", "Planning-control screen", "Missing-information and consultant list"],
  },
  {
    id: "concept-design",
    title: "Concept Design",
    summary: "Test planning, form, circulation, light and the client brief through clear design options.",
    outputs: ["Concept drawings", "Spatial options", "Initial material and visual direction"],
  },
  {
    id: "design-development",
    title: "Design Development",
    summary: "Refine the preferred direction and coordinate the decisions that turn an idea into a resolved proposal.",
    outputs: ["Developed plans and elevations", "Material and system coordination", "Consultant input where required"],
  },
  {
    id: "documentation",
    title: "Documentation",
    summary: "Prepare the drawings and schedules appropriate to the agreed approval or construction scope.",
    outputs: ["Coordinated drawing set", "Relevant schedules", "Issue and revision management"],
  },
  {
    id: "consultants-approvals",
    title: "Consultants & Approvals",
    summary: "Coordinate the project information needed by relevant authorities, consultants and certifiers.",
    outputs: ["Consultant coordination", "Submission support", "Responses to information requests within the agreed scope"],
  },
  {
    id: "construction-support",
    title: "Construction Support",
    summary: "Support design communication and project decisions during construction where included in the appointment.",
    outputs: ["Clarification of design intent", "Selected site or team coordination", "Review support matched to the agreed scope"],
  },
] as const;
