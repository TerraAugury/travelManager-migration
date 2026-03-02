export function buildFixedWindowRateLimiter({
  windowMs = 15 * 60 * 1000,
  maxAttempts = 10
} = {}) {
  if (!Number.isInteger(windowMs) || windowMs <= 0) {
    throw new Error("windowMs must be a positive integer.");
  }
  if (!Number.isInteger(maxAttempts) || maxAttempts <= 0) {
    throw new Error("maxAttempts must be a positive integer.");
  }

  const buckets = new Map();

  function cleanup(now) {
    for (const [key, value] of buckets.entries()) {
      if (value.resetAt <= now) {
        buckets.delete(key);
      }
    }
  }

  function consume(key) {
    const now = Date.now();
    cleanup(now);
    const bucketKey = String(key || "unknown");
    const existing = buckets.get(bucketKey);

    if (!existing || existing.resetAt <= now) {
      buckets.set(bucketKey, {
        count: 1,
        resetAt: now + windowMs
      });
      return {
        allowed: true,
        retryAfterSeconds: 0
      };
    }

    existing.count += 1;
    if (existing.count > maxAttempts) {
      const retryAfterSeconds = Math.max(
        1,
        Math.ceil((existing.resetAt - now) / 1000)
      );
      return {
        allowed: false,
        retryAfterSeconds
      };
    }

    return {
      allowed: true,
      retryAfterSeconds: 0
    };
  }

  return {
    consume
  };
}
