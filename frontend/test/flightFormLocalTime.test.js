import test from "node:test";
import assert from "node:assert/strict";
import { fillFlightForm, readCreateFlightBody } from "../src/forms.js";

function withDocument(nodes, fn) {
  const previousDocument = globalThis.document;
  globalThis.document = {
    getElementById(id) {
      return nodes[id] || null;
    }
  };
  try {
    return fn();
  } finally {
    globalThis.document = previousDocument;
  }
}

function buildFlightNodes() {
  return {
    "flight-form": { dataset: {} },
    "flight-number": { value: "" },
    "flight-airline": { value: "" },
    "flight-pnr": { value: "" },
    "flight-lookup-date": { value: "" },
    "flight-dep-name": { value: "" },
    "flight-dep-code": { value: "" },
    "flight-arr-name": { value: "" },
    "flight-arr-code": { value: "" },
    "flight-dep-time": { value: "" },
    "flight-arr-time": { value: "" },
    "flight-passengers": { value: "" }
  };
}

test("fillFlightForm keeps provider local wall-clock values unchanged", () => {
  const nodes = buildFlightNodes();
  withDocument(nodes, () => {
    fillFlightForm({
      flight_number: "EK202",
      departure_scheduled: "2026-03-05T02:00:00Z",
      arrival_scheduled: "2026-03-05T06:15:00Z",
      departure_scheduled_local: "2026-03-05T06:00",
      arrival_scheduled_local: "2026-03-05T06:15",
      departure_timezone: "Asia/Dubai",
      arrival_timezone: "Europe/London"
    });
  });
  assert.equal(nodes["flight-dep-time"].value, "2026-03-05T06:00");
  assert.equal(nodes["flight-arr-time"].value, "2026-03-05T06:15");
  assert.equal(nodes["flight-form"].dataset.departureTimezone, "Asia/Dubai");
  assert.equal(nodes["flight-form"].dataset.arrivalTimezone, "Europe/London");
});

test("readCreateFlightBody includes local fields and timezones", () => {
  const nodes = buildFlightNodes();
  nodes["flight-number"].value = "LX123";
  nodes["flight-airline"].value = "Luxair";
  nodes["flight-pnr"].value = "ABC123";
  nodes["flight-dep-time"].value = "2026-03-05T06:00";
  nodes["flight-arr-time"].value = "2026-03-05T07:10";
  nodes["flight-form"].dataset.departureTimezone = "Europe/Luxembourg";
  nodes["flight-form"].dataset.arrivalTimezone = "Europe/London";
  const body = withDocument(nodes, () => readCreateFlightBody());
  assert.equal(body.departureScheduledLocal, "2026-03-05T06:00");
  assert.equal(body.arrivalScheduledLocal, "2026-03-05T07:10");
  assert.equal(body.departureTimezone, "Europe/Luxembourg");
  assert.equal(body.arrivalTimezone, "Europe/London");
  assert.equal(body.departureScheduled, "2026-03-05T06:00");
});
