import test from "node:test";
import assert from "node:assert/strict";
import { buildHotelsRepository } from "../src/repositories/hotelsRepository.js";

test("create hotel uses ownership-guarded INSERT SELECT", async () => {
  const calls = [];
  const repo = buildHotelsRepository({
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
  assert.match(calls[0].text, /INSERT INTO hotel_records/);
  assert.match(calls[0].text, /FROM trips t/);
  assert.equal(calls[0].params[0], "trip-1");
  assert.equal(calls[0].params[1], "user-1");
});

test("remove hotel deletes only for owner", async () => {
  const calls = [];
  const repo = buildHotelsRepository({
    pool: {
      async query(text, params) {
        calls.push({ text, params });
        return { rows: [], rowCount: 1 };
      }
    }
  });

  const removed = await repo.remove({ hotelId: "h1", ownerUserId: "u1" });
  assert.equal(removed, true);
  assert.match(calls[0].text, /DELETE FROM hotel_records/);
  assert.deepEqual(calls[0].params, ["h1", "u1"]);
});

