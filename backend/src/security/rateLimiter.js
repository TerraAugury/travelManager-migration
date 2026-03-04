function asPositiveInteger(value, field) {
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`${field} must be a positive integer.`);
  }
  return value;
}

function readSelectRow(selectResult) {
  const rows = Array.isArray(selectResult?.results)
    ? selectResult.results
    : Array.isArray(selectResult)
      ? selectResult
      : [];
  return rows[0] || null;
}

async function maybeCleanupExpired(db, nowMs) {
  if (Math.random() >= 0.01) return;
  await db
    .prepare("DELETE FROM rate_limits WHERE reset_at <= ?")
    .bind(nowMs)
    .run();
}

export async function checkRateLimit(db, key, maxRequests, windowMs) {
  if (!db || typeof db.prepare !== "function" || typeof db.batch !== "function") {
    throw new Error("db must be a D1 binding.");
  }
  const safeMaxRequests = asPositiveInteger(maxRequests, "maxRequests");
  const safeWindowMs = asPositiveInteger(windowMs, "windowMs");
  const now = Date.now();
  const bucketKey = String(key || "unknown");
  const resetAt = now + safeWindowMs;

  const statements = [
    db
      .prepare("DELETE FROM rate_limits WHERE key = ? AND reset_at <= ?")
      .bind(bucketKey, now),
    db
      .prepare(
        "INSERT INTO rate_limits (key, count, reset_at) VALUES (?, 1, ?) ON CONFLICT(key) DO UPDATE SET count = count + 1"
      )
      .bind(bucketKey, resetAt),
    db
      .prepare("SELECT count, reset_at FROM rate_limits WHERE key = ?")
      .bind(bucketKey)
  ];
  const batchResults = await db.batch(statements);
  const row = readSelectRow(batchResults?.[2]);
  const count = Number(row?.count || 0);
  const finalResetAt = Number(row?.reset_at || resetAt);

  await maybeCleanupExpired(db, now);

  return {
    allowed: count <= safeMaxRequests,
    remaining: Math.max(0, safeMaxRequests - count),
    resetAt: finalResetAt
  };
}
