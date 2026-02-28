import test from "node:test";
import assert from "node:assert/strict";
import {
  isUuid,
  toOptionalDate,
  toOptionalDateTime,
  toPassengerNames,
  toPositiveInt,
  toTrimmedString
} from "../src/http/validation.js";

test("isUuid validates canonical UUID strings", () => {
  assert.equal(isUuid("5f8ce478-0fb5-4f84-9df4-c7bc844f039f"), true);
  assert.equal(isUuid("invalid"), false);
});

test("toTrimmedString enforces required and max length", () => {
  assert.equal(toTrimmedString("  hi ", { field: "name", required: true }).value, "hi");
  assert.match(toTrimmedString("", { field: "name", required: true }).error, /required/);
  assert.match(toTrimmedString("abcd", { field: "name", max: 2 }).error, /at most 2/);
});

test("date and datetime parsers validate format", () => {
  assert.equal(toOptionalDate("2026-02-28", { field: "startDate" }).value, "2026-02-28");
  assert.match(toOptionalDate("02/28/2026", { field: "startDate" }).error, /YYYY-MM-DD/);
  assert.ok(toOptionalDateTime("2026-02-28T12:15:00Z", { field: "at" }).value.endsWith("Z"));
  assert.match(toOptionalDateTime("not-a-date", { field: "at" }).error, /valid datetime/);
});

test("toPassengerNames normalizes and deduplicates", () => {
  const out = toPassengerNames([" Alice ", "alice", "Bob", "", "  BOB "]).value;
  assert.deepEqual(out, ["Alice", "Bob"]);
});

test("toPositiveInt validates positive integers", () => {
  assert.equal(toPositiveInt(3, { field: "paxCount" }).value, 3);
  assert.match(toPositiveInt(0, { field: "paxCount" }).error, /positive integer/);
  assert.match(toPositiveInt("3.2", { field: "paxCount" }).error, /positive integer/);
});

