import test from "node:test";
import assert from "node:assert/strict";
import { buildTripsRepository } from "../src/repositories/tripsRepository.js";

function mockPool(returnRows = [{}]) {
  const calls = [];
  return {
    calls,
    pool: {
      async query(text, params) {
        calls.push({ text, params });
        return { rows: returnRows, rowCount: returnRows.length };
      }
    }
  };
}

test("create trip uses parameterized INSERT query", async () => {
  const { pool, calls } = mockPool([{ id: "trip-1", name: "Summer" }]);
  const repo = buildTripsRepository({ pool });

  const row = await repo.create({
    ownerUserId: "user-1",
    name: "Summer",
    notes: "Family vacation",
    startDate: "2026-07-01",
    endDate: "2026-07-12"
  });

  assert.equal(row.id, "trip-1");
  assert.equal(calls.length, 1);
  assert.match(calls[0].text, /INSERT INTO trips/);
  // params: [id(uuid), ownerUserId, name, notes, startDate, endDate]
  assert.equal(calls[0].params.length, 6);
  assert.equal(calls[0].params[1], "user-1");
  assert.equal(calls[0].params[2], "Summer");
});

test("remove returns true only when DELETE removed rows", async () => {
  const calls = [];
  const repo = buildTripsRepository({
    pool: {
      async query(text, params) {
        calls.push({ text, params });
        return { rows: [], rowCount: 1 };
      }
    }
  });

  const deleted = await repo.remove("trip-2", "user-2");
  assert.equal(deleted, true);
  assert.match(calls[0].text, /DELETE FROM trips/);
  assert.deepEqual(calls[0].params, ["trip-2", "user-2"]);
});

test("listByOwner derives start_date and end_date when base trip dates are null", async () => {
  const calls = [];
  const repo = buildTripsRepository({
    pool: {
      async query(text, params) {
        calls.push({ text, params });
        return { rows: [{ id: "trip-3", start_date: "2026-02-12", end_date: "2026-02-18" }], rowCount: 1 };
      }
    }
  });

  const rows = await repo.listByOwner("user-3");
  assert.equal(rows[0].start_date, "2026-02-12");
  assert.equal(rows[0].end_date, "2026-02-18");
  assert.match(calls[0].text, /COALESCE\(\s*t\.start_date/i);
  assert.match(calls[0].text, /substr\(fr\.departure_scheduled_local, 1, 10\)/i);
  assert.match(calls[0].text, /substr\(fr\.departure_scheduled, 1, 10\)/i);
  assert.match(calls[0].text, /hr\.check_in_date/i);
  assert.match(calls[0].text, /COALESCE\(\s*t\.end_date/i);
  assert.match(calls[0].text, /substr\(fr\.arrival_scheduled_local, 1, 10\)/i);
  assert.match(calls[0].text, /substr\(fr\.arrival_scheduled, 1, 10\)/i);
  assert.match(calls[0].text, /hr\.check_out_date/i);
  assert.deepEqual(calls[0].params, ["user-3"]);
});
