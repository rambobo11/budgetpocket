type Bucket = {
  count: number;
  resetAt: number;
};

const buckets = new Map<string, Bucket>();

/**
 * Rate limit mémoire (par instance). Suffisant pour Vercel serverless
 * en défense de base ; pour multi-région, brancher Redis plus tard.
 */
export function rateLimit(
  key: string,
  {
    limit,
    windowMs,
  }: {
    limit: number;
    windowMs: number;
  }
): { ok: true } | { ok: false; retryAfterSec: number } {
  pruneRateLimitBuckets();

  const now = Date.now();
  const current = buckets.get(key);

  if (!current || now >= current.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true };
  }

  if (current.count >= limit) {
    return {
      ok: false,
      retryAfterSec: Math.max(1, Math.ceil((current.resetAt - now) / 1000)),
    };
  }

  current.count += 1;
  return { ok: true };
}

/** Nettoyage opportuniste pour éviter une Map qui grossit à l’infini. */
export function pruneRateLimitBuckets() {
  const now = Date.now();
  if (buckets.size < 200) {
    for (const [key, bucket] of buckets) {
      if (now >= bucket.resetAt) buckets.delete(key);
    }
    return;
  }

  for (const [key, bucket] of buckets) {
    if (now >= bucket.resetAt) buckets.delete(key);
  }
}
