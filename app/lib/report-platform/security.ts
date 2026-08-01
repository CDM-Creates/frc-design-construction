export function createAccessToken() {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function hashAccessToken(token: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token));
  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function tokenMatches(token: string, expectedHash: string) {
  const actual = await hashAccessToken(token);
  if (actual.length !== expectedHash.length) return false;
  let difference = 0;
  for (let index = 0; index < actual.length; index += 1) {
    difference |= actual.charCodeAt(index) ^ expectedHash.charCodeAt(index);
  }
  return difference === 0;
}

function serverSigningSecret() {
  const configured = process.env.PROPERTY_RESEARCH_SIGNING_SECRET || process.env.FILE_SIGNING_SECRET;
  if (configured && configured.length >= 32 && !configured.includes("replace-with")) return configured;
  if (process.env.PAYMENTS_LIVE_ENABLED === "true") throw new Error("PROPERTY_RESEARCH_SIGNING_SECRET or FILE_SIGNING_SECRET must be configured for live checkout.");
  return "frc-non-live-property-research-proof-2026";
}

async function hmac(value: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(serverSigningSecret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return Buffer.from(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(value))).toString("base64url");
}

export async function createServerProof(payload: Record<string, unknown>) {
  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${encoded}.${await hmac(encoded)}`;
}

export async function verifyServerProof<T extends Record<string, unknown>>(proof: string): Promise<T> {
  const [encoded, signature] = proof.split(".");
  if (!encoded || !signature || signature !== await hmac(encoded)) throw new Error("The property-research proof is invalid.");
  const payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")) as T;
  const expiresAt = typeof payload.expiresAt === "string" ? new Date(payload.expiresAt).getTime() : 0;
  if (!expiresAt || expiresAt < Date.now()) throw new Error("The property-research proof has expired. Check the property again.");
  return payload;
}

export function safeRequestMetadata(request: Request) {
  return {
    userAgent: (request.headers.get("user-agent") ?? "").slice(0, 240),
    country: (request.headers.get("cf-ipcountry") ?? "").slice(0, 8),
  };
}
