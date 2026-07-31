export const REFERENCE_COPYRIGHT_NOTICE =
  "Reference material helps FRC understand your intended outcome. It is not treated as an approved design, and third-party intellectual property is not reproduced.";

export type ReferenceMaterialInput = {
  reportSelectionId: string;
  propertyId: string;
  url: string | null;
  storageReference: string | null;
  title: string | null;
  supplierOrDesigner: string | null;
  modelName: string | null;
  whatClientLikes: string | null;
  exactModelIntended: boolean;
  approximateFloorAreaSqm: number | null;
  bedroomCount: number | null;
  storeyCount: number | null;
  preferredFeatures: string[];
  clientNotes: string | null;
  writtenBrief: string | null;
};

export type SafeReferenceMetadata = {
  originalUrl: string;
  pageTitle: string | null;
  accessStatus: "pending" | "accessible" | "inaccessible" | "blocked" | "invalid";
  accessedAt: string | null;
  contentType: string | null;
  extractedPublicMetadata: Record<string, string>;
};

const blockedHostnames = new Set(["localhost", "localhost.localdomain", "metadata.google.internal"]);

function isBlockedIp(hostname: string) {
  const family = /^\d{1,3}(?:\.\d{1,3}){3}$/.test(hostname) ? 4 : hostname.includes(":") ? 6 : 0;
  if (!family) return false;
  if (family === 4) {
    const parts = hostname.split(".").map(Number);
    if (parts.some((part) => part > 255)) return true;
    return parts[0] === 10 ||
      parts[0] === 127 ||
      parts[0] === 0 ||
      (parts[0] === 169 && parts[1] === 254) ||
      (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) ||
      (parts[0] === 192 && parts[1] === 168) ||
      (parts[0] === 100 && parts[1] >= 64 && parts[1] <= 127) ||
      parts[0] >= 224;
  }
  const value = hostname.toLowerCase();
  return value === "::1" || value === "::" || value.startsWith("fc") || value.startsWith("fd") || value.startsWith("fe8") || value.startsWith("fe9") || value.startsWith("fea") || value.startsWith("feb");
}

export function validateReferenceUrl(raw: string) {
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    return { valid: false as const, reason: "Enter a complete public http or https URL." };
  }
  if (!["http:", "https:"].includes(parsed.protocol)) return { valid: false as const, reason: "Only http and https reference links are supported." };
  const hostname = parsed.hostname.toLowerCase().replace(/\.$/, "");
  if (!hostname || blockedHostnames.has(hostname) || hostname.endsWith(".local") || hostname.endsWith(".internal") || isBlockedIp(hostname)) {
    return { valid: false as const, reason: "Private-network and local reference addresses are blocked." };
  }
  if (parsed.username || parsed.password) return { valid: false as const, reason: "Reference URLs must not contain credentials." };
  return { valid: true as const, url: parsed.toString() };
}

export function validateReferenceRequirement(input: ReferenceMaterialInput) {
  const hasUrl = Boolean(input.url?.trim());
  const hasFile = Boolean(input.storageReference?.trim());
  const hasBrief = Boolean(input.writtenBrief?.trim());
  if (!hasUrl && !hasFile && !hasBrief) {
    return { valid: false, issues: ["Provide at least one reference URL, uploaded visual reference or written development brief."] };
  }
  const issues: string[] = [];
  if (hasUrl) {
    const result = validateReferenceUrl(input.url!);
    if (!result.valid) issues.push(result.reason);
  }
  return { valid: issues.length === 0, issues };
}

export type ReferenceFetchOptions = {
  timeoutMs?: number;
  maximumBytes?: number;
  maximumRedirects?: number;
  fetcher?: typeof fetch;
};

export async function fetchSafeReferenceMetadata(rawUrl: string, options: ReferenceFetchOptions = {}): Promise<SafeReferenceMetadata> {
  const validated = validateReferenceUrl(rawUrl);
  if (!validated.valid) {
    return { originalUrl: rawUrl, pageTitle: null, accessStatus: "blocked", accessedAt: null, contentType: null, extractedPublicMetadata: { error: validated.reason } };
  }
  const fetcher = options.fetcher ?? fetch;
  const maximumBytes = options.maximumBytes ?? 512_000;
  const maximumRedirects = options.maximumRedirects ?? 3;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs ?? 5_000);
  let current = validated.url;
  try {
    for (let redirect = 0; redirect <= maximumRedirects; redirect += 1) {
      const response = await fetcher(current, {
        method: "GET",
        redirect: "manual",
        signal: controller.signal,
        headers: { Accept: "text/html,application/pdf;q=0.8,image/*;q=0.5" },
      });
      if (response.status >= 300 && response.status < 400) {
        const location = response.headers.get("location");
        if (!location || redirect === maximumRedirects) throw new Error("Reference redirect limit exceeded.");
        const redirected = new URL(location, current).toString();
        const safeRedirect = validateReferenceUrl(redirected);
        if (!safeRedirect.valid) throw new Error(safeRedirect.reason);
        current = safeRedirect.url;
        continue;
      }
      if (!response.ok) {
        return { originalUrl: rawUrl, pageTitle: null, accessStatus: "inaccessible", accessedAt: new Date().toISOString(), contentType: response.headers.get("content-type"), extractedPublicMetadata: { httpStatus: String(response.status) } };
      }
      const contentType = response.headers.get("content-type")?.split(";")[0].trim().toLowerCase() ?? "";
      if (!["text/html", "application/pdf", "image/jpeg", "image/png", "image/webp"].includes(contentType)) {
        throw new Error("Unsupported reference content type.");
      }
      const declaredLength = Number(response.headers.get("content-length") ?? 0);
      if (declaredLength > maximumBytes) throw new Error("Reference response is too large.");
      if (contentType !== "text/html") {
        return { originalUrl: rawUrl, pageTitle: null, accessStatus: "accessible", accessedAt: new Date().toISOString(), contentType, extractedPublicMetadata: { finalUrl: current } };
      }
      const body = await response.text();
      if (new TextEncoder().encode(body).byteLength > maximumBytes) throw new Error("Reference response is too large.");
      const title = body.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.replace(/\s+/g, " ").trim().slice(0, 300) ?? null;
      return {
        originalUrl: rawUrl,
        pageTitle: title,
        accessStatus: "accessible",
        accessedAt: new Date().toISOString(),
        contentType,
        extractedPublicMetadata: { finalUrl: current },
      };
    }
    throw new Error("Reference could not be resolved.");
  } catch (error) {
    return {
      originalUrl: rawUrl,
      pageTitle: null,
      accessStatus: error instanceof Error && /blocked|private-network|local/i.test(error.message) ? "blocked" : "inaccessible",
      accessedAt: new Date().toISOString(),
      contentType: null,
      extractedPublicMetadata: { error: error instanceof Error ? error.message : "Reference access failed." },
    };
  } finally {
    clearTimeout(timeout);
  }
}
