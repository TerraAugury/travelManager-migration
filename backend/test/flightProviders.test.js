import test from "node:test";
import assert from "node:assert/strict";
import { lookupFlightera } from "../src/services/flightProviders.js";

test("lookupFlightera returns normalized shape", async () => {
  const originalFetch = globalThis.fetch;
  try {
    globalThis.fetch = async () => ({
      ok: true,
      headers: new Headers({
        "x-ratelimit-requests-remaining": "99",
        "x-ratelimit-requests-limit": "100",
        "x-ratelimit-requests-reset": "1700"
      }),
      json: async () => ([{
        flnr: "BA123",
        status: "live",
        airline_name: "British Airways",
        departure_name: "London Heathrow",
        departure_iata: "LHR",
        arrival_name: "John F. Kennedy International",
        arrival_iata: "JFK",
        scheduled_departure_local: "2026-03-05T10:00:00+00:00",
        scheduled_arrival_local: "2026-03-05T14:00:00+00:00",
        actual_departure_is_estimated: true,
        actual_departure_local: "2026-03-05T10:20:00+00:00",
        departure_terminal: "5",
        departure_checkin: "A",
        departure_gate: "A12",
        arrival_baggage: "7"
      }])
    });
    const result = await lookupFlightera("BA123", "2026-03-05", "testkey");
    const expectedKeys = [
      "flight_number", "status", "airline", "departure_airport_name", "departure_airport_code",
      "arrival_airport_name", "arrival_airport_code", "departure_scheduled", "arrival_scheduled",
      "scheduledTime", "revisedTime", "predictedTime", "runwayTime", "terminal", "checkInDesk",
      "gate", "baggageBelt", "rateLimitRequestsRemaining", "rateLimitRequestsLimit", "rateLimitRequestsReset"
    ];
    assert.deepEqual(Object.keys(result).sort(), expectedKeys.sort());
    assert.equal(result.flight_number, "BA123");
    assert.equal(result.status, "EnRoute");
    assert.equal(result.scheduledTime, "2026-03-05T10:00:00+00:00");
    assert.equal(result.predictedTime, "2026-03-05T10:20:00+00:00");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("lookupFlightera throws 404 when no flight data found", async () => {
  const originalFetch = globalThis.fetch;
  try {
    globalThis.fetch = async () => ({ ok: true, json: async () => ([]) });
    await assert.rejects(
      () => lookupFlightera("ZZ0", "2026-03-05", "testkey"),
      (err) => { assert.equal(err.status, 404); return true; }
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("lookupFlightera throws 502 on non-ok upstream response", async () => {
  const originalFetch = globalThis.fetch;
  try {
    globalThis.fetch = async () => ({ ok: false, status: 429, json: async () => ({}) });
    await assert.rejects(
      () => lookupFlightera("BA123", "2026-03-05", "testkey"),
      (err) => { assert.equal(err.status, 502); return true; }
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});
