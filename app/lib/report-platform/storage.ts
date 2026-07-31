import { getPlatformMode } from "./config";

export type StoredPrivateFile = {
  storageReference: string;
  sha256: string;
  safeFilename: string;
  detectedMimeType: string;
  automatedInterpretationEligible: boolean;
};

export interface PrivateStorageProvider {
  readonly name: string;
  put(input: { orderId: string; documentId: string; file: File }): Promise<StoredPrivateFile>;
  get(storageReference: string): Promise<{ bytes: Uint8Array; contentType: string; filename: string } | null>;
  remove(storageReference: string): Promise<void>;
}

const maximumFileBytes = 25 * 1024 * 1024;
export const MAX_FILES_PER_DOCUMENT_CATEGORY = 10;
export const MAX_BYTES_PER_ORDER = 150 * 1024 * 1024;

const extensionMime: Record<string, string> = {
  pdf: "application/pdf",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  tif: "image/tiff",
  tiff: "image/tiff",
  dwg: "application/acad",
  dxf: "application/dxf",
};

const allowedMimeTypes = new Set(Object.values(extensionMime));

function extensionFor(filename: string) {
  return filename.toLowerCase().split(".").pop() ?? "";
}

export function sanitiseFilename(filename: string) {
  const extension = extensionFor(filename);
  const base = filename
    .slice(0, Math.max(1, filename.length - (extension ? extension.length + 1 : 0)))
    .normalize("NFKD")
    .replace(/[^\w.-]+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^[-.]+|[-.]+$/g, "")
    .slice(0, 120) || "document";
  return extension ? `${base}.${extension}` : base;
}

function startsWith(bytes: Uint8Array, signature: number[]) {
  return signature.every((value, index) => bytes[index] === value);
}

function detectMime(bytes: Uint8Array, extension: string) {
  if (startsWith(bytes, [0x25, 0x50, 0x44, 0x46, 0x2d])) return "application/pdf";
  if (startsWith(bytes, [0xff, 0xd8, 0xff])) return "image/jpeg";
  if (startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return "image/png";
  if (startsWith(bytes, [0x49, 0x49, 0x2a, 0x00]) || startsWith(bytes, [0x4d, 0x4d, 0x00, 0x2a])) return "image/tiff";
  const prefix = new TextDecoder("ascii").decode(bytes.slice(0, 32));
  if (/^AC10\d{2}/.test(prefix) && extension === "dwg") return "application/acad";
  if (/^\s*0\s*(SECTION|EOF)/i.test(prefix) && extension === "dxf") return "application/dxf";
  return "";
}

export async function validatePrivateFile(file: File) {
  if (!file.name || file.name.length > 240) throw new Error("The filename is missing or too long.");
  if (file.size < 1) throw new Error(`${file.name}: empty files cannot be uploaded.`);
  if (file.size > maximumFileBytes) throw new Error(`${file.name}: the maximum file size is 25 MB.`);
  const extension = extensionFor(file.name);
  const expectedMime = extensionMime[extension];
  if (!expectedMime) throw new Error(`${file.name}: use PDF, JPG, JPEG, PNG, TIFF, DWG or DXF.`);
  if (file.type && !allowedMimeTypes.has(file.type) && file.type !== "application/octet-stream") {
    throw new Error(`${file.name}: the browser-reported file type is not supported.`);
  }
  const bytes = new Uint8Array(await file.arrayBuffer());
  const detectedMimeType = detectMime(bytes.slice(0, 64), extension);
  if (!detectedMimeType || detectedMimeType !== expectedMime) {
    throw new Error(`${file.name}: the file content does not match its extension.`);
  }
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  const sha256 = Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
  return {
    bytes,
    detectedMimeType,
    sha256,
    safeFilename: sanitiseFilename(file.name),
    automatedInterpretationEligible: !["application/acad", "application/dxf"].includes(detectedMimeType),
  };
}

class LocalPrivateStorageProvider implements PrivateStorageProvider {
  readonly name = "local-private-test-storage";

  async put(input: { orderId: string; documentId: string; file: File }) {
    const [validated, fs, path] = await Promise.all([
      validatePrivateFile(input.file),
      import("node:fs/promises"),
      import("node:path"),
    ]);
    const root = process.env.FRC_LOCAL_PRIVATE_STORAGE_DIR || path.join(process.cwd(), ".frc-private-storage");
    const orderDirectory = path.resolve(root, input.orderId);
    const rootResolved = path.resolve(root);
    if (!orderDirectory.startsWith(`${rootResolved}${path.sep}`)) throw new Error("Unsafe private storage path.");
    await fs.mkdir(orderDirectory, { recursive: true });
    const storedName = `${input.documentId}-${validated.safeFilename}`;
    const absolutePath = path.resolve(orderDirectory, storedName);
    if (!absolutePath.startsWith(`${orderDirectory}${path.sep}`)) throw new Error("Unsafe private storage path.");
    await fs.writeFile(absolutePath, validated.bytes, { flag: "wx", mode: 0o600 });
    return {
      storageReference: `local-private://${input.orderId}/${storedName}`,
      sha256: validated.sha256,
      safeFilename: validated.safeFilename,
      detectedMimeType: validated.detectedMimeType,
      automatedInterpretationEligible: validated.automatedInterpretationEligible,
    };
  }

  async get(storageReference: string) {
    const match = /^local-private:\/\/([a-f0-9-]+)\/([^/]+)$/.exec(storageReference);
    if (!match) return null;
    const [fs, path] = await Promise.all([import("node:fs/promises"), import("node:path")]);
    const root = process.env.FRC_LOCAL_PRIVATE_STORAGE_DIR || path.join(process.cwd(), ".frc-private-storage");
    const absolutePath = path.resolve(root, match[1], match[2]);
    const rootResolved = path.resolve(root);
    if (!absolutePath.startsWith(`${rootResolved}${path.sep}`)) return null;
    try {
      const bytes = new Uint8Array(await fs.readFile(absolutePath));
      const extension = extensionFor(match[2]);
      return { bytes, contentType: extensionMime[extension] ?? "application/octet-stream", filename: match[2].replace(/^[a-f0-9-]+-/, "") };
    } catch {
      return null;
    }
  }

  async remove(storageReference: string) {
    const match = /^local-private:\/\/([a-f0-9-]+)\/([^/]+)$/.exec(storageReference);
    if (!match) return;
    const [fs, path] = await Promise.all([import("node:fs/promises"), import("node:path")]);
    const root = process.env.FRC_LOCAL_PRIVATE_STORAGE_DIR || path.join(process.cwd(), ".frc-private-storage");
    const absolutePath = path.resolve(root, match[1], match[2]);
    const rootResolved = path.resolve(root);
    if (!absolutePath.startsWith(`${rootResolved}${path.sep}`)) return;
    try {
      await fs.unlink(absolutePath);
    } catch {
      // Removing a missing test object is idempotent.
    }
  }
}

type R2ObjectLike = {
  arrayBuffer(): Promise<ArrayBuffer>;
  httpMetadata?: { contentType?: string };
  customMetadata?: Record<string, string>;
};

type R2BucketLike = {
  put(
    key: string,
    value: Uint8Array,
    options?: {
      httpMetadata?: { contentType?: string };
      customMetadata?: Record<string, string>;
    },
  ): Promise<unknown>;
  get(key: string): Promise<R2ObjectLike | null>;
  delete(key: string): Promise<void>;
};

async function getR2Bucket() {
  const { env } = await import("cloudflare:workers");
  const bucket = (env as unknown as { PROJECT_FILES?: R2BucketLike })
    .PROJECT_FILES;
  if (!bucket) {
    throw new Error(
      "Cloudflare R2 binding `PROJECT_FILES` is unavailable. Keep `.openai/hosting.json` configured with that binding.",
    );
  }
  return bucket;
}

class R2PrivateStorageProvider implements PrivateStorageProvider {
  readonly name = "cloudflare-r2-private-storage";

  async put(input: { orderId: string; documentId: string; file: File }) {
    const validated = await validatePrivateFile(input.file);
    const key = `orders/${input.orderId}/documents/${input.documentId}/${validated.safeFilename}`;
    const bucket = await getR2Bucket();
    await bucket.put(key, validated.bytes, {
      httpMetadata: { contentType: validated.detectedMimeType },
      customMetadata: {
        filename: validated.safeFilename,
        sha256: validated.sha256,
      },
    });
    return {
      storageReference: `r2-private://${key}`,
      sha256: validated.sha256,
      safeFilename: validated.safeFilename,
      detectedMimeType: validated.detectedMimeType,
      automatedInterpretationEligible:
        validated.automatedInterpretationEligible,
    };
  }

  async get(storageReference: string) {
    const key = storageReference.startsWith("r2-private://")
      ? storageReference.slice("r2-private://".length)
      : "";
    if (!/^orders\/[a-f0-9-]+\/documents\/[a-f0-9-]+\/[^/]+$/.test(key)) {
      return null;
    }
    const object = await (await getR2Bucket()).get(key);
    if (!object) return null;
    return {
      bytes: new Uint8Array(await object.arrayBuffer()),
      contentType:
        object.httpMetadata?.contentType ?? "application/octet-stream",
      filename:
        object.customMetadata?.filename ?? key.split("/").at(-1) ?? "document",
    };
  }

  async remove(storageReference: string) {
    const key = storageReference.startsWith("r2-private://")
      ? storageReference.slice("r2-private://".length)
      : "";
    if (!/^orders\/[a-f0-9-]+\/documents\/[a-f0-9-]+\/[^/]+$/.test(key)) {
      return;
    }
    await (await getR2Bucket()).delete(key);
  }
}

let provider: PrivateStorageProvider | null = null;

export function getPrivateStorageProvider() {
  provider ??= getPlatformMode() === "test"
    ? new LocalPrivateStorageProvider()
    : new R2PrivateStorageProvider();
  return provider;
}
