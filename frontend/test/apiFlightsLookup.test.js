import test from "node:test";
import assert from "node:assert/strict";
import { getAeroDataBoxBalance, listFlightsToday, lookupFlight } from "../src/api.js";

function mockFetch({ ok = true, status = 200, body = {} } = {}) {
  const calls = [];
  globalThis.fetch = async (url, options = {}) => {
    calls.push({ url, options });
    return {
      ok,
      status,
      async text() {
        return JSON.stringify(body);
      }
    };
  };
  return calls;
}

test("lookupFlight appends live=1 for live refresh requests", async () => {
  const calls = mockFetch({ body: { ok: true } });
  await lookupFlight("token-1", "LX123", "aerodatabox", "2026-03-05", true);
  assert.equal(calls[0].url, "/api/flights/lookup?fn=LX123&provider=aerodatabox&date=2026-03-05&live=1");
});

test("lookupFlight does not append live when omitted", async () => {
  const calls = mockFetch({ body: { ok: true } });
  await lookupFlight("token-1", "LX123", "aerodatabox", "2026-03-05");
  assert.equal(calls[0].url, "/api/flights/lookup?fn=LX123&provider=aerodatabox&date=2026-03-05");
});

test("lookupFlight surfaces status and resetAt on API errors", async () => {
  mockFetch({
    ok: false,
    status: 429,
    body: {
      error: "Rate limit: flight status may only be refreshed once every 15 minutes.",
      resetAt: 1760000000000
    }
  });
  await assert.rejects(
    () => lookupFlight("token-1", "LX123", "aerodatabox", "2026-03-05", true),
    (error) => {
      assert.equal(error.status, 429);
      assert.equal(error.resetAt, 1760000000000);
      return true;
    }
  );
});

test("listFlightsToday normalizes missing flights payload to an array", async () => {
  mockFetch({ body: { date: "2026-03-05" } });
  const out = await listFlightsToday("token-1");
  assert.deepEqual(out, { date: "2026-03-05", flights: [] });
});

test("getAeroDataBoxBalance normalizes numeric fields", async () => {
  mockFetch({ body: { creditsRemaining: "12", requestsRemaining: "98", requestsLimit: "100", requestsReset: "1700" } });
  const out = await getAeroDataBoxBalance("token-1");
  assert.deepEqual(out, { creditsRemaining: 12, requestsRemaining: 98, requestsLimit: 100, requestsReset: 1700 });
});
