import test from "node:test";
import assert from "node:assert/strict";
import { buildFixedWindowRateLimiter } from "../src/security/rateLimiter.js";

test("buildFixedWindowRateLimiter blocks after max attempts within window", () => {
  const limiter = buildFixedWindowRateLimiter({
    windowMs: 60_000,
    maxAttempts: 2
  });

  assert.equal(limiter.consume("ip|email").allowed, true);
  assert.equal(limiter.consume("ip|email").allowed, true);

  const blocked = limiter.consume("ip|email");
  assert.equal(blocked.allowed, false);
  assert.equal(blocked.retryAfterSeconds > 0, true);
});
