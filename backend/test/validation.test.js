import test from "node:test";
import assert from "node:assert/strict";
import {
  isUuid,
  toOptionalDate,
  toOptionalDateTime,
  toOptionalLocalDateTime,
  toPassengerNames,
  toPositiveInt,
  toOptionalTimeZone,
  toTrimmedString
} from "../src/http/validation.js";
import { validateIataCode, validatePassengerName } from "../src/validation.js";

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
  assert.equal(toOptionalLocalDateTime("2026-02-28T12:15", { field: "local" }).value, "2026-02-28T12:15");
  assert.match(toOptionalLocalDateTime("2026-02-28T12:15:00Z", { field: "local" }).error, /YYYY-MM-DDTHH:mm/);
  assert.equal(toOptionalTimeZone("Europe/Luxembourg", { field: "tz" }).value, "Europe/Luxembourg");
  assert.match(toOptionalTimeZone("Europe Lux", { field: "tz" }).error, /timezone identifier/);
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

test("validatePassengerName enforces strict whitelist", () => {
  assert.deepEqual(validatePassengerName("Jean-Luc O'Neill"), { valid: true });
  assert.deepEqual(validatePassengerName("Мария"), { valid: true });
  assert.deepEqual(validatePassengerName("Alice123"), { valid: false, error: "Invalid passenger name" });
});

test("validateIataCode requires 3 uppercase letters", () => {
  assert.deepEqual(validateIataCode("CDG"), { valid: true });
  assert.deepEqual(validateIataCode("cdg"), { valid: false, error: "Invalid IATA code" });
  assert.deepEqual(validateIataCode("CDG1"), { valid: false, error: "Invalid IATA code" });
});
