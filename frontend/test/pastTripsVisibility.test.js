import test from "node:test";
import assert from "node:assert/strict";
import { getState, getVisibleTrips, setSelectedTripId, setShowPastTrips, setTrips } from "../src/state.js";

test("trip visibility filter hides past trips by default and can show them", () => {
  const sampleTrips = [
    { id: "past", name: "Past", start_date: "1999-01-01", end_date: "1999-01-10" },
    { id: "future", name: "Future", start_date: "2999-01-01", end_date: "2999-01-10" }
  ];

  setShowPastTrips(false);
  setTrips(sampleTrips);
  assert.deepEqual(getVisibleTrips().map((trip) => trip.id), ["future"]);

  setSelectedTripId("past");
  assert.equal(getState().selectedTripId, "future");

  setShowPastTrips(true);
  setSelectedTripId("past");
  assert.deepEqual(getVisibleTrips().map((trip) => trip.id), ["past", "future"]);
  assert.equal(getState().selectedTripId, "past");

  setShowPastTrips(false);
  setTrips([]);
  setSelectedTripId(null);
});
