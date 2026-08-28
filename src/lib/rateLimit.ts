interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

/**
 * A minimal fixed-window limiter, in-memory. Good enough for a single
 * prototype instance guarding a 4-digit PIN (10,000 combinations) — without
 * it, `/api/v1/auth/phone` has no cost to an attacker guessing a phone
 * number's PIN. Not distributed and resets on restart; a real deployment
 * with multiple instances would need a shared store instead.
 */
export function checkRateLimit(key: string, max: number, windowMs: number): boolean {
  const now = Date.now();
  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (bucket.count >= max) return false;
  bucket.count++;
  return true;
}
