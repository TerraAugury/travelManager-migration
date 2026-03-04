import test from "node:test";
import assert from "node:assert/strict";
import { checkRateLimit } from "../src/security/rateLimiter.js";
import { createRateLimitsDbMock } from "./d1RateLimitsMock.js";

test("checkRateLimit blocks after max requests within a window", async () => {
  const db = createRateLimitsDbMock();
  const key = "ip|email";

  const first = await checkRateLimit(db, key, 2, 60_000);
  const second = await checkRateLimit(db, key, 2, 60_000);
  const third = await checkRateLimit(db, key, 2, 60_000);

  assert.equal(first.allowed, true);
  assert.equal(first.remaining, 1);
  assert.equal(second.allowed, true);
  assert.equal(second.remaining, 0);
  assert.equal(third.allowed, false);
  assert.equal(third.remaining, 0);
  assert.equal(Number.isFinite(third.resetAt), true);
});

test("checkRateLimit resets when window is expired", async () => {
  const db = createRateLimitsDbMock();
  const key = "ip|email";
  const now = Date.now();
  const originalNow = Date.now;

  let afterExpiry;
  try {
    Date.now = () => now;
    await checkRateLimit(db, key, 1, 1_000);
    Date.now = () => now + 1_500;
    afterExpiry = await checkRateLimit(db, key, 1, 1_000);
  } finally {
    Date.now = originalNow;
  }

  assert.equal(afterExpiry.allowed, true);
  assert.equal(afterExpiry.remaining, 0);
});
