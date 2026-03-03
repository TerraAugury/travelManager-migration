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
  const sql1 = await fs.readFile(migrationPath(), "utf8");
  const sql2 = await fs.readFile(
    path.resolve(path.dirname(migrationPath()), "002_sessions.sql"),
    "utf8"
  );
  const normalized = `${sql1}\n${sql2}`.replace(/\s+/g, " ").toLowerCase();

  assert.match(normalized, /create table if not exists users/);
  assert.match(normalized, /create table if not exists trips/);
  assert.match(normalized, /create table if not exists flight_records/);
  assert.match(normalized, /create table if not exists hotel_records/);
  assert.match(normalized, /create table if not exists sessions/);
  assert.match(normalized, /default 'user' check \(role in \('admin', 'user'\)\)/);
  assert.match(normalized, /check \(pax_count > 0\)/);
  assert.match(normalized, /check \(check_out_date >= check_in_date\)/);
  assert.match(normalized, /references users\(id\) on delete restrict/);
});
