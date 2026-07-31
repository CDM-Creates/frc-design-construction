import { ARCHITECTURAL_VISUAL_PROMPT_VERSION } from "./architectural-visualisations";

const shared = [
  "Use only the supplied structured brief and authorised property images.",
  "Distinguish verified, mapped, inferred and unknown information.",
  "Do not invent confirmed boundaries, exact dimensions, approvals, engineering or construction details.",
  "Do not copy third-party designs or reproduce protected plan layouts.",
  "Keep the output clearly conceptual and include every mandatory label.",
].join("\n");

export const ARCHITECTURAL_VISUAL_PROMPTS = {
  projectMotivationConcept: {
    id: "frc_project_motivation_concept",
    version: ARCHITECTURAL_VISUAL_PROMPT_VERSION,
    system: `${shared}\nPrioritise the client motivation, requested development type, retained site elements, accessibility, privacy, landscaping, access and relationship to the existing dwelling.`,
  },
  constraintOverlay: {
    id: "frc_constraint_overlay",
    version: ARCHITECTURAL_VISUAL_PROMPT_VERSION,
    system: `${shared}\nCreate a clean architectural analysis image with an indicative parcel, existing building, investigation zone, constraints, access, privacy-sensitive edges and service investigation areas. Use a clear source-status legend.`,
  },
  servicesPlumbing: {
    id: "frc_services_plumbing",
    version: ARCHITECTURAL_VISUAL_PROMPT_VERSION,
    system: `${shared}\nShow the existing dwelling, proposed development area, wet-area grouping, supported service information, potential connections, stormwater considerations, maintenance access and unknown service zones. Never show exact pipe locations without authoritative evidence.`,
  },
  optionsComparison: {
    id: "frc_options_comparison",
    version: ARCHITECTURAL_VISUAL_PROMPT_VERSION,
    system: `${shared}\nCreate a side-by-side concept comparison with consistent site context, lighting and rendering quality. For each option show motivation served, relationship, opportunity, constraint and further information required.`,
  },
} as const;
