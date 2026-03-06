import test from "node:test";
import assert from "node:assert/strict";
import { buildHotelsRepository } from "../src/repositories/hotelsRepository.js";

test("create hotel checks shared access then inserts", async () => {
  const calls = [];
  const accessCalls = [];
  const repo = buildHotelsRepository({
    tripSharesRepository: {
      async hasAccess(userId, tripId) {
        accessCalls.push([userId, tripId]);
        return true;
      }
    },
    pool: {
      async query(text, params) {
        calls.push({ text, params });
        return { rows: [{ id: "hotel-1" }], rowCount: 1 };
      }
    }
  });

  const row = await repo.create({
    tripId: "trip-1",
    ownerUserId: "user-1",
    hotelName: "Hilton",
    confirmationId: "H-ABC",
    checkInDate: "2026-03-01",
    checkOutDate: "2026-03-04",
    paxCount: 2,
    paymentType: "prepaid"
  });

  assert.equal(row.id, "hotel-1");
  assert.deepEqual(accessCalls[0], ["user-1", "trip-1"]);
  assert.match(calls[0].text, /INSERT INTO hotel_records/);
  assert.equal(calls[0].params[1], "trip-1");
  assert.equal(calls[0].params[2], "user-1");
});

test("remove hotel checks access by trip before delete", async () => {
  const calls = [];
  const accessCalls = [];
  const repo = buildHotelsRepository({
    tripSharesRepository: {
      async hasAccess(userId, tripId) {
        accessCalls.push([userId, tripId]);
        return true;
      }
    },
    pool: {
      async query(text, params) {
        calls.push({ text, params });
        if (/SELECT trip_id FROM hotel_records/.test(text)) {
          return { rows: [{ trip_id: "trip-1" }], rowCount: 1 };
        }
        return { rows: [], rowCount: 1 };
      }
    }
  });

  const removed = await repo.remove({ hotelId: "h1", ownerUserId: "u1" });
  assert.equal(removed, true);
  assert.match(calls[0].text, /SELECT trip_id FROM hotel_records/);
  assert.deepEqual(calls[0].params, ["h1"]);
  assert.deepEqual(accessCalls[0], ["u1", "trip-1"]);
  assert.match(calls[1].text, /DELETE FROM hotel_records/);
  assert.deepEqual(calls[1].params, ["h1"]);
});

test("update hotel checks access by trip before update", async () => {
  const calls = [];
  const accessCalls = [];
  const repo = buildHotelsRepository({
    tripSharesRepository: {
      async hasAccess(userId, tripId) {
        accessCalls.push([userId, tripId]);
        return true;
      }
    },
    pool: {
      async query(text, params) {
        calls.push({ text, params });
        if (/SELECT trip_id FROM hotel_records/.test(text)) {
          return { rows: [{ trip_id: "trip-1" }], rowCount: 1 };
        }
        return { rows: [{ id: "h-updated", trip_id: "trip-1" }], rowCount: 1 };
      }
    }
  });

  const row = await repo.update({
    hotelId: "h1",
    ownerUserId: "u1",
    hotelName: "Marriott",
    confirmationId: "C-123",
    checkInDate: "2026-04-01",
    checkOutDate: "2026-04-03",
    paxCount: 2,
    paymentType: "prepaid"
  });

  assert.equal(row.id, "h-updated");
  assert.match(calls[0].text, /SELECT trip_id FROM hotel_records/);
  assert.deepEqual(calls[0].params, ["h1"]);
  assert.deepEqual(accessCalls[0], ["u1", "trip-1"]);
  assert.match(calls[1].text, /UPDATE hotel_records/);
  assert.deepEqual(calls[1].params.slice(0, 2), ["h1", "u1"]);
});

test("listByOwner returns owned and shared trips", async () => {
  const calls = [];
  const repo = buildHotelsRepository({
    tripSharesRepository: { async hasAccess() { return true; } },
    pool: {
      async query(text, params) {
        calls.push({ text, params });
        return { rows: [{ id: "h1" }], rowCount: 1 };
      }
    }
  });

  const rows = await repo.listByOwner("owner-1");
  assert.equal(rows.length, 1);
  assert.match(calls[0].text, /trip_shares/);
  assert.deepEqual(calls[0].params, ["owner-1"]);
});
