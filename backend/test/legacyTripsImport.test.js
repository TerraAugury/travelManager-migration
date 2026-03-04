import test from "node:test";
import assert from "node:assert/strict";
import { buildLegacyTripsImportService } from "../src/services/legacyTripsImport.js";

function createPoolMock() {
  const calls = [];
  return {
    calls,
    pool: {
      async query(text, params) {
        const sql = String(text).trim();
        calls.push({ text: sql, params });
        if (/INSERT INTO passengers/.test(sql)) return { rows: [{ id: "p1" }], rowCount: 1 };
        return { rows: [], rowCount: 1 };
      }
    }
  };
}

test("replaceForOwner deletes old trips and imports new payload", async () => {
  const { pool, calls } = createPoolMock();
  const service = buildLegacyTripsImportService({ pool });

  const payload = [{
    name: "Family Spring",
    records: [{
      flightDate: "2026-04-01",
      pnr: "ABCD12",
      paxNames: ["Alice"],
      route: {
        flightNumber: "LH438",
        departure: { airport: "Frankfurt", iata: "FRA", scheduled: "2026-04-01T08:00:00Z" },
        arrival: { airport: "JFK", iata: "JFK", scheduled: "2026-04-01T12:00:00Z" }
      }
    }],
    hotels: [{
      hotelName: "Hilton",
      checkInDate: "2026-04-01",
      checkOutDate: "2026-04-05",
      paxCount: 2,
      paymentType: "prepaid",
      paxNames: ["Alice"]
    }]
  }];

  const result = await service.replaceForOwner("user-1", payload);
  assert.equal(result.importedTrips, 1);
  assert.match(calls[0].text, /DELETE FROM trips/);
  assert.match(calls[1].text, /INSERT INTO trips/);
  const hotelInsert = calls.find((c) => /INSERT INTO hotel_records/.test(c.text));
  assert.ok(hotelInsert);
  assert.equal(hotelInsert.params[7], 2);
});

test("replaceForOwner normalizes invalid paxCount to 1", async () => {
  const { pool, calls } = createPoolMock();
  const service = buildLegacyTripsImportService({ pool });
  await service.replaceForOwner("user-1", [{
    name: "X",
    records: [],
    hotels: [{ hotelName: "H", checkInDate: "2026-04-01", checkOutDate: "2026-04-03", paxCount: "abc" }]
  }]);

  const hotelInsert = calls.find((c) => /INSERT INTO hotel_records/.test(c.text));
  assert.ok(hotelInsert);
  assert.equal(hotelInsert.params[7], 1);
});
