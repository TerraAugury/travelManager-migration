import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

function migrationPath() {
  const here = path.dirname(fileURLToPath(import.meta.url));
  return path.resolve(here, "../migrations/001_initial_schema.sql");
}

test("initial schema defines required tables and safety constraints", async () => {
  const sql = await fs.readFile(migrationPath(), "utf8");
  const normalized = sql.replace(/\s+/g, " ").toLowerCase();

  assert.match(normalized, /create table if not exists users/);
  assert.match(normalized, /create table if not exists trips/);
  assert.match(normalized, /create table if not exists flight_records/);
  assert.match(normalized, /create table if not exists hotel_records/);
  assert.match(normalized, /check \(pax_count > 0\)/);
  assert.match(normalized, /check \(check_out_date >= check_in_date\)/);
  assert.match(normalized, /references users\(id\) on delete restrict/);
});

