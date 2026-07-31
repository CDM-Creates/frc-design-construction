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

export function safeRequestMetadata(request: Request) {
  return {
    userAgent: (request.headers.get("user-agent") ?? "").slice(0, 240),
    country: (request.headers.get("cf-ipcountry") ?? "").slice(0, 8),
  };
}
