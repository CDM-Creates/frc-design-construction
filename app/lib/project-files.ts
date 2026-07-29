import type { UploadedProjectDocument } from "./project-data";

const allowedTypes = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
]);

const maxFileSize = 10 * 1024 * 1024;
const maxFiles = 12;

type StoredProjectFileObject = {
  body: BodyInit | null;
  customMetadata?: {
    originalName?: string;
  };
  writeHttpMetadata(headers: Headers): void;
};

type ProjectFilesBucket = {
  get(key: string): Promise<StoredProjectFileObject | null>;
};

export function validateProjectFiles(files: File[]) {
  if (files.length > maxFiles) {
    throw new Error(`Upload no more than ${maxFiles} files per project.`);
  }

  for (const file of files) {
    if (!allowedTypes.has(file.type)) {
      throw new Error(
        `${file.name}: only JPG, PNG, WebP and PDF files are accepted.`
      );
    }

    if (file.size > maxFileSize) {
      throw new Error(
        `${file.name}: the maximum file size is 10 MB.`
      );
    }
  }
}

async function signValue(value: string) {
  const secret = process.env.FILE_SIGNING_SECRET;

  if (!secret) {
    return "";
  }

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    {
      name: "HMAC",
      hash: "SHA-256",
    },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(value)
  );

  return Array.from(new Uint8Array(signature))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export async function createSignedFileUrl(
  storageKey: string,
  origin: string,
  expiresInSeconds = 60 * 60 * 24 * 7
) {
  const expires = Math.floor(Date.now() / 1000) + expiresInSeconds;
  const value = `${storageKey}:${expires}`;
  const signature = await signValue(value);

  if (!signature) {
    return "";
  }

  return `${origin}/api/project-file?key=${encodeURIComponent(
    storageKey
  )}&expires=${expires}&sig=${signature}`;
}

export async function verifySignedFileRequest(
  storageKey: string,
  expires: string,
  signature: string
) {
  const expiry = Number(expires);

  if (
    !Number.isFinite(expiry) ||
    expiry < Math.floor(Date.now() / 1000)
  ) {
    return false;
  }

  const expected = await signValue(`${storageKey}:${expiry}`);

  if (!expected || expected.length !== signature.length) {
    return false;
  }

  let difference = 0;

  for (let index = 0; index < expected.length; index += 1) {
    difference |=
      expected.charCodeAt(index) ^ signature.charCodeAt(index);
  }

  return difference === 0;
}

export async function storeProjectFiles(
  projectId: string,
  files: File[],
  origin: string
): Promise<UploadedProjectDocument[]> {
  void projectId;
  void origin;

  validateProjectFiles(files);

  if (files.length > 0) {
    throw new Error(
      "Project document uploads are temporarily unavailable while storage is being configured."
    );
  }

  return [];
}

export function getProjectFilesBucket():
  | ProjectFilesBucket
  | undefined {
  return undefined;
}