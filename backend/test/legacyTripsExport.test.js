import test from "node:test";
import assert from "node:assert/strict";
import { buildLegacyTripsExportService } from "../src/services/legacyTripsExport.js";

test("exportByOwner returns legacy JSON shape", async () => {
  const service = buildLegacyTripsExportService({
    tripsRepository: {
      async listByOwner() {
        return [{ id: "t1", name: "Trip", created_at: "2026-01-01", updated_at: "2026-01-02" }];
      }
    },
    flightsRepository: {
      async listByOwner() {
        return [{
          id: "f1",
          trip_id: "t1",
          created_at: "2026-01-03",
          flight_number: "LH438",
          airline: "Lufthansa",
          pnr: "ABC123",
          departure_airport_name: "Frankfurt",
          departure_airport_code: "FRA",
          departure_scheduled: "2026-02-01T08:00:00.000Z",
          arrival_airport_name: "JFK",
          arrival_airport_code: "JFK",
          arrival_scheduled: "2026-02-01T12:00:00.000Z",
          passenger_names: ["Alice"]
        }];
      }
    },
    hotelsRepository: {
      async listByOwner() {
        return [{
          id: "h1",
          trip_id: "t1",
          created_at: "2026-01-05",
          hotel_name: "Hilton",
          check_in_date: "2026-02-01",
          check_out_date: "2026-02-04",
          pax_count: 2,
          payment_type: "prepaid",
          confirmation_id: "H-1",
          passenger_names: ["Alice"]
        }];
      }
    }
  });

  const out = await service.exportByOwner("user-1");
  assert.equal(out.length, 1);
  assert.equal(out[0].records[0].route.departure.iata, "FRA");
  assert.equal(out[0].hotels[0].hotelName, "Hilton");
});
