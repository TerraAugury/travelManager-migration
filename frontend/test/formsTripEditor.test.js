import test from "node:test";
import assert from "node:assert/strict";
import { fillTripEditor } from "../src/forms.js";
import { setFlights, setHotels } from "../src/state.js";

function withDocument(nodes, fn) {
  const previous = globalThis.document;
  globalThis.document = {
    getElementById(id) {
      return nodes[id] || null;
    }
  };
  try {
    fn();
  } finally {
    globalThis.document = previous;
  }
}

function buildNodes() {
  return {
    "trip-edit-name": { value: "" },
    "trip-edit-notes": { value: "" },
    "trip-edit-start": { value: "" },
    "trip-edit-end": { value: "" }
  };
}

test("fillTripEditor derives start/end from loaded trip details", () => {
  const nodes = buildNodes();
  setFlights([{ departure_scheduled: "2026-08-07T08:00:00Z", arrival_scheduled: "2026-08-07T10:00:00Z" }]);
  setHotels([{ check_in_date: "2026-08-05", check_out_date: "2026-08-11" }]);
  withDocument(nodes, () => {
    fillTripEditor({ name: "Summer", notes: "Family", start_date: null, end_date: null });
  });
  assert.equal(nodes["trip-edit-start"].value, "2026-08-05");
  assert.equal(nodes["trip-edit-end"].value, "2026-08-11");
});

test("fillTripEditor keeps explicit trip dates when provided", () => {
  const nodes = buildNodes();
  setFlights([{ departure_scheduled: "2026-08-07T08:00:00Z", arrival_scheduled: "2026-08-07T10:00:00Z" }]);
  setHotels([{ check_in_date: "2026-08-05", check_out_date: "2026-08-11" }]);
  withDocument(nodes, () => {
    fillTripEditor({ name: "Summer", notes: "", start_date: "2026-08-01", end_date: "2026-08-14" });
  });
  assert.equal(nodes["trip-edit-start"].value, "2026-08-01");
  assert.equal(nodes["trip-edit-end"].value, "2026-08-14");
});
