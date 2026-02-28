import test from "node:test";
import assert from "node:assert/strict";
import { buildFlightsRepository } from "../src/repositories/flightsRepository.js";

test("create flight uses ownership-guarded INSERT SELECT", async () => {
  const calls = [];
  const repo = buildFlightsRepository({
    pool: {
      async query(text, params) {
        calls.push({ text, params });
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
  assert.match(calls[0].text, /INSERT INTO flight_records/);
  assert.match(calls[0].text, /FROM trips t/);
  assert.equal(calls[0].params[0], "trip-1");
  assert.equal(calls[0].params[1], "user-1");
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

