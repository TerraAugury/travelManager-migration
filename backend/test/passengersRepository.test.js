import test from "node:test";
import assert from "node:assert/strict";
import { buildPassengersRepository } from "../src/repositories/passengersRepository.js";

test("ensureByNames upserts one row per name", async () => {
  const calls = [];
  const repo = buildPassengersRepository({
    pool: {
      async query(text, params) {
        calls.push({ text, params });
        // params[0] is UUID, params[1] is name
        return { rows: [{ id: "p1", name: params[1] }], rowCount: 1 };
      }
    }
  });

  const rows = await repo.ensureByNames(["Alice", "Bob"]);
  assert.equal(rows.length, 2);
  assert.match(calls[0].text, /INSERT INTO passengers/);
  assert.match(calls[0].text, /ON CONFLICT/);
  // params[1] is the name (params[0] is the generated UUID)
  assert.deepEqual(calls.map((c) => c.params[1]), ["Alice", "Bob"]);
});

test("link methods insert mapping rows with conflict guards", async () => {
  const calls = [];
  const repo = buildPassengersRepository({
    pool: {
      async query(text, params) {
        calls.push({ text, params });
        return { rows: [], rowCount: 1 };
      }
    }
  });

  await repo.linkToTrip({ tripId: "t1", passengerIds: ["p1", "p2"] });
  await repo.linkToFlight({ flightRecordId: "f1", passengerIds: ["p1"] });
  await repo.linkToHotel({ hotelRecordId: "h1", passengerIds: ["p2"] });

  assert.match(calls[0].text, /INSERT INTO trip_passengers/);
  assert.match(calls[1].text, /INSERT INTO trip_passengers/);
  assert.match(calls[2].text, /INSERT INTO flight_passengers/);
  assert.match(calls[3].text, /INSERT INTO hotel_passengers/);
});

test("replace link methods delete old rows before insert", async () => {
  const calls = [];
  const repo = buildPassengersRepository({
    pool: {
      async query(text, params) {
        calls.push({ text, params });
        return { rows: [], rowCount: 1 };
      }
    }
  });

  await repo.replaceFlightLinks({ flightRecordId: "f1", passengerIds: ["p1"] });
  await repo.replaceHotelLinks({ hotelRecordId: "h1", passengerIds: ["p2"] });

  assert.match(calls[0].text, /DELETE FROM flight_passengers/);
  assert.match(calls[1].text, /INSERT INTO flight_passengers/);
  assert.match(calls[2].text, /DELETE FROM hotel_passengers/);
  assert.match(calls[3].text, /INSERT INTO hotel_passengers/);
});
