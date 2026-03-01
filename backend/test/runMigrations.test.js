// runMigrations.js removed — D1 migrations are managed by wrangler d1 migrations apply.
// Migration SQL files live in backend/migrations/ and are applied via:
//   npm run migrate:local    (local dev)
//   npm run migrate:remote   (production)
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const migrationsDir = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../migrations"
);

test("migration files exist and are named correctly", async () => {
  const files = (await fs.readdir(migrationsDir))
    .filter((f) => f.endsWith(".sql"))
    .sort();
  assert.ok(files.length >= 2, "expected at least 2 migration files");
  assert.ok(files[0].startsWith("001_"), "first file should start with 001_");
  assert.ok(files[1].startsWith("002_"), "second file should start with 002_");
});
