import type { AustralianJurisdiction } from "../planning-simulation/australian-planning-sources";

export type PublicPropertyResearchResult = {
  summary: string;
  findings: Array<{
    field: string;
    value: string;
    sourceUrl: string;
    sourceTitle: string;
    sourceAuthority: string;
    locator: string;
    confidence: "high" | "medium" | "low";
    verificationState: "official_page_found_requires_property_confirmation" | "public_lead_only" | "not_found";
  }>;
  missing: string[];
  warnings: string[];
};

const schema = {
  type: "object",
  additionalProperties: false,
  required: ["summary", "findings", "missing", "warnings"],
  properties: {
    summary: { type: "string" },
    findings: {
      type: "array",
      maxItems: 40,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["field", "value", "sourceUrl", "sourceTitle", "sourceAuthority", "locator", "confidence", "verificationState"],
        properties: {
          field: { type: "string" }, value: { type: "string" }, sourceUrl: { type: "string" }, sourceTitle: { type: "string" }, sourceAuthority: { type: "string" }, locator: { type: "string" },
          confidence: { type: "string", enum: ["high", "medium", "low"] },
          verificationState: { type: "string", enum: ["official_page_found_requires_property_confirmation", "public_lead_only", "not_found"] },
        },
      },
    },
    missing: { type: "array", items: { type: "string" } },
    warnings: { type: "array", items: { type: "string" } },
  },
} as const;

function outputText(payload: unknown) {
  const record = payload && typeof payload === "object" ? payload as Record<string, unknown> : {};
  if (typeof record.output_text === "string") return record.output_text;
  for (const output of Array.isArray(record.output) ? record.output : []) {
    if (!output || typeof output !== "object") continue;
    for (const content of Array.isArray((output as { content?: unknown }).content) ? (output as { content: unknown[] }).content : []) {
      if (content && typeof content === "object" && typeof (content as { text?: unknown }).text === "string") return (content as { text: string }).text;
    }
  }
  return "";
}

export async function researchAustralianProperty(input: { address: string; jurisdiction: AustralianJurisdiction }) {
  if (process.env.PROPERTY_RESEARCH_AI_ENABLED !== "true") return null;
  const apiKey = process.env.OPENAI_API_KEY?.trim() ?? "";
  if (!apiKey) throw new Error("PROPERTY_RESEARCH_AI_ENABLED is true but OPENAI_API_KEY is missing.");
  const officialUrls = input.jurisdiction.sources.map((source) => source.url).join("\n");
  const prompt = [
    "Research public planning and property information for the exact Australian address below.",
    "Use official government, council, legislation, land-authority and utility sources first. Public third-party pages may be retained only as unverified leads.",
    "Do not bypass logins, payments, robots controls or access restrictions. Do not invent a title, survey, certificate, approval, zone, overlay, hazard result, owner identity or service route.",
    "Search-result snippets alone are not evidence. Record an official page only when the page is directly accessible and relevant; otherwise mark it as a lead requiring property confirmation.",
    "Look for address identity, local authority, cadastral reference, zone, planning scheme, overlays, heritage, bushfire, flood, contamination notices, biodiversity, utilities, previous public applications and current planning provisions.",
    `Address: ${input.address}`,
    `Jurisdiction: ${input.jurisdiction.name}`,
    `Known official starting points:\n${officialUrls}`,
  ].join("\n");
  const response = await fetch(`${(process.env.OPENAI_BASE_URL || "https://api.openai.com/v1").replace(/\/$/, "")}/responses`, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: process.env.PROPERTY_RESEARCH_AI_MODEL || "gpt-5.6-terra",
      input: prompt,
      tools: [{ type: "web_search" }],
      text: { format: { type: "json_schema", name: "frc_public_property_research", strict: true, schema } },
    }),
  });
  if (!response.ok) throw new Error(`OpenAI public property research failed (${response.status}).`);
  const text = outputText(await response.json());
  if (!text) throw new Error("OpenAI public property research returned no structured result.");
  return JSON.parse(text) as PublicPropertyResearchResult;
}
