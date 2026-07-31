export const REPORT_PROMPT_VERSION = "FRC_REPORT_PROMPTS_2026_02";

const systemRules = [
  "Use only the supplied structured data.",
  "Cite every property-specific factual finding.",
  "Distinguish official facts, uploaded-document facts, client statements and AI inferences.",
  "Never invent missing controls or generate fake official documents.",
  "Preserve every required section and mandatory section code.",
  "Identify missing and conflicting information.",
  "Assign risk levels conservatively and avoid approval guarantees.",
  "Do not provide legal, engineering or surveying certification.",
  "Use Australian English and clear professional language.",
  "Return schema-valid JSON only.",
];

export type ReportPromptDefinition = {
  id: string;
  version: typeof REPORT_PROMPT_VERSION;
  purpose: string;
  system: string;
};

export const REPORT_PROMPTS: ReportPromptDefinition[] = [
  ["document_extraction", "Extract document facts with page or drawing citations; never infer omitted values."],
  ["reference_interpretation", "Summarise public reference material without copying protected plans or implying design permission."],
  ["report_section_drafting", "Draft one required section from allowed evidence while preserving its section code."],
  ["factual_validation", "Reject unsupported property facts, guarantees, certifications and source-status inflation."],
  ["source_validation", "Confirm that every factual statement maps to an allowed source identifier."],
  ["risk_register", "Create conservative risks, consequences and actions from supported evidence and declared unknowns."],
  ["action_plan", "Create a prioritised, persona-aware action sequence without changing price or scope."],
  ["final_synthesis", "Assemble all validated sections without dropping, renaming or duplicating mandatory sections."],
].map(([id, purpose]) => ({
  id: `frc_${id}`,
  version: REPORT_PROMPT_VERSION,
  purpose,
  system: [...systemRules, purpose].join("\n"),
}));

export const REPORT_PROMPT_BY_ID = new Map(REPORT_PROMPTS.map((prompt) => [prompt.id, prompt]));
