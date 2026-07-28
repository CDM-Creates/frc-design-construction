declare module "cloudflare:workers" {
  export const env: Record<string, unknown>;
}

declare interface Fetcher {
  fetch(request: Request): Promise<Response>;
}

declare interface D1Database {
  readonly __frcD1Brand?: true;
}

declare interface R2PutOptions {
  httpMetadata?: { contentType?: string };
  customMetadata?: Record<string, string>;
}

declare interface R2ObjectBody {
  body: ReadableStream;
  customMetadata?: Record<string, string>;
  writeHttpMetadata(headers: Headers): void;
}

declare interface R2Bucket {
  put(key: string, value: ArrayBuffer | ReadableStream | Blob | string, options?: R2PutOptions): Promise<unknown>;
  get(key: string): Promise<R2ObjectBody | null>;
}
