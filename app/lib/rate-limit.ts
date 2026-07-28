type Bucket = { count: number; resetAt: number };
const globalBuckets = globalThis as typeof globalThis & { __frcRateLimits?: Map<string, Bucket> };
const buckets = globalBuckets.__frcRateLimits ?? new Map<string, Bucket>();
if (!globalBuckets.__frcRateLimits) globalBuckets.__frcRateLimits = buckets;

export function checkRateLimit(key: string, limit = 3, windowMs = 60 * 60 * 1000) {
  const now = Date.now();
  const current = buckets.get(key);
  if (!current || current.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: limit - 1, resetAt: now + windowMs };
  }
  if (current.count >= limit) return { allowed: false, remaining: 0, resetAt: current.resetAt };
  current.count += 1;
  return { allowed: true, remaining: limit - current.count, resetAt: current.resetAt };
}
