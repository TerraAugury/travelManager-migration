import test from "node:test";
import assert from "node:assert/strict";
import { buildFlightsRepository } from "../src/repositories/flightsRepository.js";

test("create flight checks shared access then inserts", async () => {
  const calls = [];
  const accessCalls = [];
  const repo = buildFlightsRepository({
    tripSharesRepository: {
      async hasAccess(userId, tripId) {
        accessCalls.push([userId, tripId]);
        return true;
      }
    },
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
    departureScheduledLocal: "2026-03-01T09:00",
    departureTimezone: "Europe/Berlin",
    arrivalAirportName: "New York JFK",
    arrivalAirportCode: "JFK",
    arrivalScheduled: "2026-03-01T12:00:00.000Z",
    arrivalScheduledLocal: "2026-03-01T07:00",
    arrivalTimezone: "America/New_York"
  });

  assert.equal(row.id, "flight-1");
  assert.deepEqual(accessCalls[0], ["user-1", "trip-1"]);
  assert.match(calls[0].text, /INSERT INTO flight_records/);
  // params: [id(uuid), tripId, ownerUserId, ...]
  assert.equal(calls[0].params[1], "trip-1");
  assert.equal(calls[0].params[2], "user-1");
  assert.equal(calls[0].params[9], "2026-03-01T09:00");
  assert.equal(calls[0].params[10], "Europe/Berlin");
  assert.equal(calls[0].params[14], "2026-03-01T07:00");
  assert.equal(calls[0].params[15], "America/New_York");
});

test("remove flight checks access by trip before delete", async () => {
  const calls = [];
  const accessCalls = [];
  const repo = buildFlightsRepository({
    tripSharesRepository: {
      async hasAccess(userId, tripId) {
        accessCalls.push([userId, tripId]);
        return true;
      }
    },
    pool: {
      async query(text, params) {
        calls.push({ text, params });
        if (/SELECT trip_id FROM flight_records/.test(text)) {
          return { rows: [{ trip_id: "trip-1" }], rowCount: 1 };
        }
        return { rows: [], rowCount: 1 };
      }
    }
  });

  const removed = await repo.remove({ flightId: "f1", ownerUserId: "u1" });
  assert.equal(removed, true);
  assert.match(calls[0].text, /SELECT trip_id FROM flight_records/);
  assert.deepEqual(calls[0].params, ["f1"]);
  assert.deepEqual(accessCalls[0], ["u1", "trip-1"]);
  assert.match(calls[1].text, /DELETE FROM flight_records/);
  assert.deepEqual(calls[1].params, ["f1"]);
});

test("update flight checks access by trip before update", async () => {
  const calls = [];
  const accessCalls = [];
  const repo = buildFlightsRepository({
    tripSharesRepository: {
      async hasAccess(userId, tripId) {
        accessCalls.push([userId, tripId]);
        return true;
      }
    },
    pool: {
      async query(text, params) {
        calls.push({ text, params });
        if (/SELECT trip_id FROM flight_records/.test(text)) {
          return { rows: [{ trip_id: "trip-1" }], rowCount: 1 };
        }
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
    departureScheduledLocal: "2026-03-01T12:00",
    departureTimezone: "Europe/London",
    arrivalAirportName: "JFK",
    arrivalAirportCode: "JFK",
    arrivalScheduled: "2026-03-01T16:00:00.000Z",
    arrivalScheduledLocal: "2026-03-01T11:00",
    arrivalTimezone: "America/New_York"
  });

  assert.equal(row.id, "f-updated");
  assert.match(calls[0].text, /SELECT trip_id FROM flight_records/);
  assert.deepEqual(calls[0].params, ["f1"]);
  assert.deepEqual(accessCalls[0], ["u1", "trip-1"]);
  assert.match(calls[1].text, /UPDATE flight_records/);
  assert.deepEqual(calls[1].params.slice(0, 2), ["f1", "u1"]);
  assert.equal(calls[1].params[8], "2026-03-01T12:00");
  assert.equal(calls[1].params[9], "Europe/London");
  assert.equal(calls[1].params[13], "2026-03-01T11:00");
  assert.equal(calls[1].params[14], "America/New_York");
});

test("listByOwner returns owned and shared trips", async () => {
  const calls = [];
  const repo = buildFlightsRepository({
    tripSharesRepository: { async hasAccess() { return true; } },
    pool: {
      async query(text, params) {
        calls.push({ text, params });
        return { rows: [{ id: "f1" }], rowCount: 1 };
      }
    }
  });

  const rows = await repo.listByOwner("owner-1");
  assert.equal(rows.length, 1);
  assert.match(calls[0].text, /trip_shares/);
  assert.deepEqual(calls[0].params, ["owner-1"]);
});
