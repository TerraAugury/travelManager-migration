import test from "node:test";
import assert from "node:assert/strict";
import { buildLegacyTripsImportService } from "../src/services/legacyTripsImport.js";

function createPoolMock() {
  const calls = [];
  const client = {
    async query(text, params) {
      const sql = String(text).trim();
      calls.push({ text: sql, params });
      if (/RETURNING id/.test(sql)) {
        if (/INSERT INTO trips/.test(sql)) return { rows: [{ id: "trip-1" }], rowCount: 1 };
        if (/INSERT INTO flight_records/.test(sql)) return { rows: [{ id: "flight-1" }], rowCount: 1 };
        if (/INSERT INTO hotel_records/.test(sql)) return { rows: [{ id: "hotel-1" }], rowCount: 1 };
        if (/INSERT INTO passengers/.test(sql)) return { rows: [{ id: "p1" }], rowCount: 1 };
      }
      return { rows: [], rowCount: 1 };
    },
    release() {}
  };
  return {
    calls,
    pool: {
      async connect() {
        return client;
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
  assert.equal(calls[0].text, "BEGIN");
  assert.match(calls[1].text, /DELETE FROM trips/);
  assert.equal(calls[calls.length - 1].text, "COMMIT");
});

