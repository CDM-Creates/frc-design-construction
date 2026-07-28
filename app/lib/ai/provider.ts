type JsonRecord = Record<string, unknown>;

export type TextTaskConfig = {
  taskName: string;
  provider: string;
  model: string;
  system: string;
  prompt: string;
  fallback: JsonRecord;
};

export type TextTaskResult = {
  value: JsonRecord;
  provider: string;
  model: string;
  status: "complete" | "fallback";
  error?: string;
};

const extractJson = (text: string): JsonRecord => {
  const cleaned = text.trim().replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  const first = cleaned.indexOf("{");
  const last = cleaned.lastIndexOf("}");
  if (first < 0 || last <= first) throw new Error("The model did not return a JSON object.");
  const parsed = JSON.parse(cleaned.slice(first, last + 1));
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("The model returned an invalid JSON shape.");
  return parsed as JsonRecord;
};

const extractResponsesText = (payload: JsonRecord) => {
  if (typeof payload.output_text === "string") return payload.output_text;
  const output = Array.isArray(payload.output) ? payload.output : [];
  return output.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const content = Array.isArray((item as JsonRecord).content) ? (item as JsonRecord).content as unknown[] : [];
    return content.map((part) => part && typeof part === "object" && typeof (part as JsonRecord).text === "string" ? String((part as JsonRecord).text) : "").filter(Boolean);
  }).join("\n");
};

const resolveApiKey = (provider: string) => provider === "router" ? process.env.AI_ROUTER_API_KEY : process.env.OPENAI_API_KEY;

export async function runTextTask(config: TextTaskConfig): Promise<TextTaskResult> {
  const apiKey = resolveApiKey(config.provider);
  if (!apiKey) return { value: config.fallback, provider: config.provider, model: config.model, status: "fallback", error: `Missing API key for ${config.provider}.` };

  try {
    if (config.provider === "router") {
      const base = (process.env.AI_ROUTER_BASE_URL || "https://openrouter.ai/api/v1").replace(/\/$/, "");
      const response = await fetch(`${base}/chat/completions`, {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: config.model,
          temperature: 0.25,
          messages: [
            { role: "system", content: config.system },
            { role: "user", content: config.prompt },
          ],
          response_format: { type: "json_object" },
        }),
      });
      if (!response.ok) throw new Error(`Router request failed (${response.status}): ${(await response.text()).slice(0, 500)}`);
      const payload = await response.json() as JsonRecord;
      const choices = Array.isArray(payload.choices) ? payload.choices as JsonRecord[] : [];
      const message = choices[0]?.message as JsonRecord | undefined;
      const content = typeof message?.content === "string" ? message.content : "";
      return { value: extractJson(content), provider: config.provider, model: config.model, status: "complete" };
    }

    const base = (process.env.OPENAI_BASE_URL || "https://api.openai.com/v1").replace(/\/$/, "");
    const response = await fetch(`${base}/responses`, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: config.model,
        input: `${config.system}\n\nTASK\n${config.prompt}`,
        max_output_tokens: 4000,
      }),
    });
    if (!response.ok) throw new Error(`OpenAI request failed (${response.status}): ${(await response.text()).slice(0, 500)}`);
    const payload = await response.json() as JsonRecord;
    return { value: extractJson(extractResponsesText(payload)), provider: config.provider, model: config.model, status: "complete" };
  } catch (error) {
    return {
      value: config.fallback,
      provider: config.provider,
      model: config.model,
      status: "fallback",
      error: error instanceof Error ? error.message : "Unknown provider failure",
    };
  }
}

export async function generateImage(prompt: string, model: string) {
  const provider = process.env.IMAGE_PROVIDER || "openai";
  if (process.env.ENABLE_AI_IMAGES !== "true") return { provider, model, status: "skipped" as const, error: "Image generation is disabled." };
  if (provider !== "openai") return { provider, model, status: "failed" as const, error: `Image provider '${provider}' is not configured by the installed adapter.` };
  if (!process.env.OPENAI_API_KEY) return { provider, model, status: "failed" as const, error: "OPENAI_API_KEY is missing." };

  try {
    const base = (process.env.OPENAI_BASE_URL || "https://api.openai.com/v1").replace(/\/$/, "");
    const response = await fetch(`${base}/images/generations`, {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model, prompt, size: process.env.IMAGE_SIZE || "1536x1024", quality: process.env.IMAGE_QUALITY || "medium", n: 1 }),
    });
    if (!response.ok) throw new Error(`Image request failed (${response.status}): ${(await response.text()).slice(0, 500)}`);
    const payload = await response.json() as { data?: Array<{ url?: string; b64_json?: string }> };
    const image = payload.data?.[0];
    const imageUrl = image?.url || (image?.b64_json ? `data:image/png;base64,${image.b64_json}` : undefined);
    if (!imageUrl) throw new Error("The image provider returned no image data.");
    return { provider, model, status: "complete" as const, imageUrl };
  } catch (error) {
    return { provider, model, status: "failed" as const, error: error instanceof Error ? error.message : "Unknown image-generation failure" };
  }
}
