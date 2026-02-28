import test from "node:test";
import assert from "node:assert/strict";
import { buildLegacyTrips } from "../src/legacyAdapter.js";

test("buildLegacyTrips maps API rows to legacy-compatible shape", () => {
  const trips = [{ id: "t1", name: "Summer", notes: "Family", start_date: "2026-07-01", end_date: "2026-07-10" }];
  const details = new Map([
    [
      "t1",
      {
        flights: [
          {
            id: "f1",
            flight_number: "LH438",
            departure_airport_code: "FRA",
            arrival_airport_code: "JFK",
            departure_scheduled: "2026-07-01T10:00:00.000Z",
            arrival_scheduled: "2026-07-01T14:00:00.000Z",
            passenger_names: ["Alice", "Bob"]
          }
        ],
        hotels: [
          {
            id: "h1",
            hotel_name: "Hilton",
            check_in_date: "2026-07-01",
            check_out_date: "2026-07-04",
            payment_type: "prepaid",
            pax_count: 2,
            passenger_names: ["Alice", "Bob"]
          }
        ]
      }
    ]
  ]);

  const out = buildLegacyTrips(trips, details);
  assert.equal(out.length, 1);
  assert.equal(out[0].records.length, 1);
  assert.equal(out[0].records[0].route.flightNumber, "LH438");
  assert.equal(out[0].records[0].route.departure.iata, "FRA");
  assert.equal(out[0].hotels.length, 1);
  assert.equal(out[0].hotels[0].hotelName, "Hilton");
});
