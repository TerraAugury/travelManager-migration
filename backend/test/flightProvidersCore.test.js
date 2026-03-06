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
    assert.equal(result.departure_scheduled_local, "2026-03-05T10:00");
    assert.equal(result.departure_timezone, null);
    assert.equal(result.arrival_airport_code, "JFK");
    assert.equal(result.arrival_airport_name, "New York JFK");
    assert.equal(result.arrival_scheduled_local, "2026-03-05T18:00");
    assert.equal(result.arrival_timezone, null);
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
        departure: {
          airport: { name: "Dubai Intl", iata: "DXB" },
          scheduledTime: { local: "2026-03-05T06:00:00+04:00", utc: "2026-03-05T02:00:00Z" },
          revisedTime: { local: "2026-03-05T06:15:00+04:00", utc: "2026-03-05T02:15:00Z" },
          predictedTime: { local: "2026-03-05T06:20:00+04:00", utc: "2026-03-05T02:20:00Z" },
          runwayTime: { local: "2026-03-05T06:25:00+04:00", utc: "2026-03-05T02:25:00Z" },
          terminal: "3",
          checkInDesk: "A18",
          gate: "B5"
        },
        arrival: {
          airport: { name: "London Heathrow", iata: "LHR" },
          scheduledTime: { local: "2026-03-05T06:15:00+00:00", utc: "2026-03-05T06:15:00Z" },
          baggageBelt: "7"
        }
      }])
    });
    const result = await lookupAeroDataBox("EK202", "2026-03-05", "testkey");
    assert.equal(result.flight_number, "EK202");
    assert.equal(result.status, "Landed");
    assert.equal(result.airline, "Emirates");
    assert.equal(result.departure_airport_code, "DXB");
    assert.equal(result.departure_airport_name, "Dubai Intl");
    assert.equal(result.departure_scheduled_local, "2026-03-05T06:00");
    assert.equal(result.departure_timezone, null);
    assert.equal(result.arrival_airport_code, "LHR");
    assert.equal(result.arrival_airport_name, "London Heathrow");
    assert.equal(result.arrival_scheduled_local, "2026-03-05T06:15");
    assert.equal(result.arrival_timezone, null);
    assert.equal(result.departure_scheduled, "2026-03-05T06:00:00+04:00");
    assert.equal(result.arrival_scheduled, "2026-03-05T06:15:00+00:00");
    assert.equal(result.scheduledTime, "2026-03-05T06:00:00+04:00");
    assert.equal(result.revisedTime, "2026-03-05T06:15:00+04:00");
    assert.equal(result.predictedTime, "2026-03-05T06:20:00+04:00");
    assert.equal(result.runwayTime, "2026-03-05T06:25:00+04:00");
    assert.equal(result.terminal, "3");
    assert.equal(result.checkInDesk, "A18");
    assert.equal(result.gate, "B5");
    assert.equal(result.baggageBelt, "7");
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
      return { ok: true, json: async () => ([{ number: "TK1", airline: {}, departure: { airport: {}, scheduledTime: {} }, arrival: { airport: {}, scheduledTime: {} } }]) };
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
