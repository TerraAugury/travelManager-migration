import test from "node:test";
import assert from "node:assert/strict";
import { lookupAviationStack, lookupAeroDataBox } from "../src/services/flightProviders.js";

test("lookupAviationStack returns normalized result on first ok response", async () => {
  const originalFetch = globalThis.fetch;
  try {
    globalThis.fetch = async () => ({
      ok: true,
      json: async () => ({
        data: [{
          flight: { iata: "BA123" },
          flight_status: "active",
          airline: { name: "British Airways" },
          departure: { airport: "London Heathrow", iata: "LHR", scheduled: "2026-03-05T10:00:00.000Z" },
          arrival: { airport: "New York JFK", iata: "JFK", scheduled: "2026-03-05T18:00:00.000Z" }
        }]
      })
    });
    const result = await lookupAviationStack("BA123", "testkey");
    assert.equal(result.flight_number, "BA123");
    assert.equal(result.status, "active");
    assert.equal(result.airline, "British Airways");
    assert.equal(result.departure_airport_code, "LHR");
    assert.equal(result.departure_airport_name, "London Heathrow");
    assert.equal(result.arrival_airport_code, "JFK");
    assert.equal(result.arrival_airport_name, "New York JFK");
    assert.equal(result.departure_scheduled, "2026-03-05T10:00:00.000Z");
    assert.equal(result.arrival_scheduled, "2026-03-05T18:00:00.000Z");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("lookupAviationStack falls back to query-string key on non-ok first response", async () => {
  const originalFetch = globalThis.fetch;
  let callCount = 0;
  let secondUrl = "";
  try {
    globalThis.fetch = async (url) => {
      callCount++;
      if (callCount === 1) return { ok: false, json: async () => ({}) };
      secondUrl = url;
      return {
        ok: true,
        json: async () => ({ data: [{ flight: { iata: "LH100" }, airline: {}, departure: {}, arrival: {} }] })
      };
    };
    await lookupAviationStack("LH100", "mykey");
    assert.equal(callCount, 2);
    assert.ok(secondUrl.includes("access_key="), `Expected access_key in URL, got: ${secondUrl}`);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("lookupAviationStack throws 404 when data array is empty", async () => {
  const originalFetch = globalThis.fetch;
  try {
    globalThis.fetch = async () => ({ ok: true, json: async () => ({ data: [] }) });
    await assert.rejects(
      () => lookupAviationStack("XX999", "testkey"),
      (err) => { assert.equal(err.status, 404); return true; }
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("lookupAeroDataBox returns normalized result", async () => {
  const originalFetch = globalThis.fetch;
  try {
    globalThis.fetch = async () => ({
      ok: true,
      json: async () => ([{
        number: "EK202",
        status: "Landed",
        airline: { name: "Emirates" },
        departure: { airport: { name: "Dubai Intl", iata: "DXB" }, scheduledTime: { utc: "2026-03-05T02:00:00Z" } },
        arrival: { airport: { name: "London Heathrow", iata: "LHR" }, scheduledTime: { utc: "2026-03-05T06:15:00Z" } }
      }])
    });
    const result = await lookupAeroDataBox("EK202", "2026-03-05", "testkey");
    assert.equal(result.flight_number, "EK202");
    assert.equal(result.status, "Landed");
    assert.equal(result.airline, "Emirates");
    assert.equal(result.departure_airport_code, "DXB");
    assert.equal(result.departure_airport_name, "Dubai Intl");
    assert.equal(result.arrival_airport_code, "LHR");
    assert.equal(result.arrival_airport_name, "London Heathrow");
    assert.equal(result.departure_scheduled, "2026-03-05T02:00:00Z");
    assert.equal(result.arrival_scheduled, "2026-03-05T06:15:00Z");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("lookupAeroDataBox uses today's UTC date when date is null", async () => {
  const originalFetch = globalThis.fetch;
  let capturedUrl = "";
  try {
    globalThis.fetch = async (url) => {
      capturedUrl = url;
      return {
        ok: true,
        json: async () => ([{ number: "TK1", airline: {}, departure: { airport: {}, scheduledTime: {} }, arrival: { airport: {}, scheduledTime: {} } }])
      };
    };
    await lookupAeroDataBox("TK1", null, "testkey");
    const today = new Date().toISOString().slice(0, 10);
    assert.ok(capturedUrl.includes(today), `Expected URL to contain ${today}, got: ${capturedUrl}`);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("lookupAeroDataBox throws 404 when array is empty", async () => {
  const originalFetch = globalThis.fetch;
  try {
    globalThis.fetch = async () => ({ ok: true, json: async () => ([]) });
    await assert.rejects(
      () => lookupAeroDataBox("ZZ0", "2026-03-05", "testkey"),
      (err) => { assert.equal(err.status, 404); return true; }
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});
