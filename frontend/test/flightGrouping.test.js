import test from "node:test";
import assert from "node:assert/strict";
import { buildFlightDisplayBuckets, formatLayover } from "../src/flightGrouping.js";

function d(value) {
  return new Date(value);
}

test("buildFlightDisplayBuckets groups same-day same-PNR flights with shared passenger", () => {
  const flights = [
    {
      departure_scheduled: "2026-02-12T08:00:00Z",
      arrival_scheduled: "2026-02-12T10:00:00Z",
      pnr: "ABC123",
      passenger_names: ["Olivier", "Lina"]
    },
    {
      departure_scheduled: "2026-02-12T12:15:00Z",
      arrival_scheduled: "2026-02-12T14:00:00Z",
      pnr: "ABC123",
      passenger_names: ["Olivier"]
    }
  ];
  const buckets = buildFlightDisplayBuckets(flights);
  assert.equal(buckets.length, 1);
  assert.equal(buckets[0].type, "connecting");
  assert.equal(buckets[0].flights.length, 2);
  assert.deepEqual(buckets[0].pax, ["Olivier"]);
});

test("buildFlightDisplayBuckets keeps flights separate when passenger overlap is missing", () => {
  const flights = [
    { departure_scheduled: "2026-02-12T08:00:00Z", arrival_scheduled: "2026-02-12T10:00:00Z", pnr: "ABC123", passenger_names: ["A"] },
    { departure_scheduled: "2026-02-12T12:00:00Z", arrival_scheduled: "2026-02-12T14:00:00Z", pnr: "ABC123", passenger_names: ["B"] }
  ];
  const buckets = buildFlightDisplayBuckets(flights);
  assert.equal(buckets.length, 2);
  assert.equal(buckets[0].type, "single");
  assert.equal(buckets[1].type, "single");
});

test("buildFlightDisplayBuckets uses local departure day for grouping", () => {
  const flights = [
    {
      departure_scheduled: "2026-03-01T23:30:00Z",
      departure_scheduled_local: "2026-03-01T23:30",
      arrival_scheduled: "2026-03-02T01:00:00Z",
      pnr: "ABC123",
      passenger_names: ["A"]
    },
    {
      departure_scheduled: "2026-03-01T23:50:00Z",
      departure_scheduled_local: "2026-03-02T00:50",
      arrival_scheduled: "2026-03-02T03:00:00Z",
      pnr: "ABC123",
      passenger_names: ["A"]
    }
  ];
  const buckets = buildFlightDisplayBuckets(flights);
  assert.equal(buckets.length, 2);
  assert.equal(buckets[0].type, "single");
  assert.equal(buckets[1].type, "single");
});

test("formatLayover returns hour/minute format", () => {
  const out = formatLayover(d("2026-02-12T10:00:00Z"), d("2026-02-12T12:35:00Z"));
  assert.equal(out, "2h 35m");
});
