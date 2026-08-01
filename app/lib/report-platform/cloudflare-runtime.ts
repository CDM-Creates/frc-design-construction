type CloudflareRuntimeModule = { env?: Record<string, unknown> };

/**
 * Keep the Cloudflare-only specifier out of Next/Vercel's server bundle.
 * A normal dynamic import is still statically externalised by Turbopack and
 * caused Vercel to attempt to load `cloudflare:workers` at route startup.
 */
export async function getCloudflareRuntimeEnv() {
  const cloudflareSpecifier = ["cloudflare", "workers"].join(":");
  const runtime = await import(/* webpackIgnore: true */ cloudflareSpecifier) as CloudflareRuntimeModule;
  if (!runtime.env) throw new Error("The Cloudflare Workers environment is unavailable.");
  return runtime.env;
}
