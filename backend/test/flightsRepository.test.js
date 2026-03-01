import test from "node:test";
import assert from "node:assert/strict";
import { buildFlightsRepository } from "../src/repositories/flightsRepository.js";

test("create flight checks trip ownership then inserts", async () => {
  const calls = [];
  const repo = buildFlightsRepository({
    pool: {
      async query(text, params) {
        calls.push({ text, params });
        if (/SELECT id FROM trips/.test(text)) return { rows: [{ id: "trip-1" }], rowCount: 1 };
        return { rows: [{ id: "flight-1" }], rowCount: 1 };
      }
    }
  });

  const row = await repo.create({
    tripId: "trip-1",
    ownerUserId: "user-1",
    flightNumber: "LH438",
    airline: "Lufthansa",
    pnr: "ABC123",
    departureAirportName: "Frankfurt",
    departureAirportCode: "FRA",
    departureScheduled: "2026-03-01T08:00:00.000Z",
    arrivalAirportName: "New York JFK",
    arrivalAirportCode: "JFK",
    arrivalScheduled: "2026-03-01T12:00:00.000Z"
  });

  assert.equal(row.id, "flight-1");
  // First call is ownership check
  assert.match(calls[0].text, /SELECT id FROM trips/);
  assert.deepEqual(calls[0].params, ["trip-1", "user-1"]);
  // Second call is the INSERT
  assert.match(calls[1].text, /INSERT INTO flight_records/);
  // params: [id(uuid), tripId, ownerUserId, ...]
  assert.equal(calls[1].params[1], "trip-1");
  assert.equal(calls[1].params[2], "user-1");
});

test("remove flight deletes only for owner", async () => {
  const calls = [];
  const repo = buildFlightsRepository({
    pool: {
      async query(text, params) {
        calls.push({ text, params });
        return { rows: [], rowCount: 1 };
      }
    }
  });

  const removed = await repo.remove({ flightId: "f1", ownerUserId: "u1" });
  assert.equal(removed, true);
  assert.match(calls[0].text, /DELETE FROM flight_records/);
  assert.deepEqual(calls[0].params, ["f1", "u1"]);
});

test("update flight uses ownership-guarded subquery", async () => {
  const calls = [];
  const repo = buildFlightsRepository({
    pool: {
      async query(text, params) {
        calls.push({ text, params });
        return { rows: [{ id: "f-updated", trip_id: "trip-1" }], rowCount: 1 };
      }
    }
  });

  const row = await repo.update({
    flightId: "f1",
    ownerUserId: "u1",
    flightNumber: "BA123",
    airline: "BA",
    pnr: "XYZ123",
    departureAirportName: "LHR",
    departureAirportCode: "LHR",
    departureScheduled: "2026-03-01T12:00:00.000Z",
    arrivalAirportName: "JFK",
    arrivalAirportCode: "JFK",
    arrivalScheduled: "2026-03-01T16:00:00.000Z"
  });

  assert.equal(row.id, "f-updated");
  assert.match(calls[0].text, /UPDATE flight_records/);
  assert.match(calls[0].text, /SELECT id FROM trips/);
  assert.deepEqual(calls[0].params.slice(0, 2), ["f1", "u1"]);
});
