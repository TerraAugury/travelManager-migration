import test from "node:test";
import assert from "node:assert/strict";
import { normalizeStatus } from "../src/insightsModules/todayScreen.js";

test("normalizeStatus maps provider statuses for Today screen", () => {
  assert.equal(normalizeStatus({ status: "EnRoute" }), "Departed");
  assert.equal(normalizeStatus({ status: "Landed" }), "Landed");
  assert.equal(normalizeStatus({ status: "Scheduled" }), "On time");
  assert.equal(normalizeStatus({ status: "Delayed" }), "Delayed");
  assert.equal(normalizeStatus({ status: "Cancelled" }), "Cancelled");
  assert.equal(normalizeStatus({ status: "" }), "Status unavailable");
});
