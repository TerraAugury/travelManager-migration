import test from "node:test";
import assert from "node:assert/strict";
import { buildTripSelectLabel } from "../src/render.js";

test("buildTripSelectLabel appends month/year from ISO start date", () => {
  const label = buildTripSelectLabel({ name: "Hamburg", start_date: "2026-02-12" });
  assert.equal(label, "Hamburg (02/2026)");
});

test("buildTripSelectLabel handles datetime start date", () => {
  const label = buildTripSelectLabel({ name: "Paris", start_date: "2027-11-01T09:00:00.000Z" });
  assert.equal(label, "Paris (11/2027)");
});

test("buildTripSelectLabel falls back to trip name when start date is missing", () => {
  const label = buildTripSelectLabel({ name: "Berlin", start_date: null });
  assert.equal(label, "Berlin");
});
