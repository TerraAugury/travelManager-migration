import test from "node:test";
import assert from "node:assert/strict";
import { buildUpcomingBuckets, formatLayover } from "../src/insightsModules/upcomingScreen.js";

function d(value) {
  return new Date(value);
}

test("buildUpcomingBuckets groups same-day same-PNR flights with shared passenger as connecting", () => {
  const rows = [
    {
      depAt: d("2026-02-12T08:00:00Z"),
      arrAt: d("2026-02-12T10:00:00Z"),
      depDay: "2026-02-12",
      pnr: "ABC123",
      pax: ["Olivier", "Lina"]
    },
    {
      depAt: d("2026-02-12T12:15:00Z"),
      arrAt: d("2026-02-12T14:00:00Z"),
      depDay: "2026-02-12",
      pnr: "ABC123",
      pax: ["Olivier"]
    }
  ];
  const buckets = buildUpcomingBuckets(rows);
  assert.equal(buckets.length, 1);
  assert.equal(buckets[0].type, "connecting");
  assert.equal(buckets[0].flights.length, 2);
  assert.deepEqual(buckets[0].pax, ["Olivier"]);
});

test("buildUpcomingBuckets keeps flights separate when shared passenger is missing", () => {
  const rows = [
    { depAt: d("2026-02-12T08:00:00Z"), arrAt: d("2026-02-12T10:00:00Z"), depDay: "2026-02-12", pnr: "ABC123", pax: ["A"] },
    { depAt: d("2026-02-12T12:00:00Z"), arrAt: d("2026-02-12T14:00:00Z"), depDay: "2026-02-12", pnr: "ABC123", pax: ["B"] }
  ];
  const buckets = buildUpcomingBuckets(rows);
  assert.equal(buckets.length, 2);
  assert.equal(buckets[0].type, "single");
  assert.equal(buckets[1].type, "single");
});

test("formatLayover returns hour/minute format", () => {
  const out = formatLayover(d("2026-02-12T10:00:00Z"), d("2026-02-12T12:35:00Z"));
  assert.equal(out, "2h 35m");
});
