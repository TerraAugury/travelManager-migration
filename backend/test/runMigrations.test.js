import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { runMigrations } from "../src/migrations/runMigrations.js";

function createMockPool(appliedRows = []) {
  const calls = [];
  const client = {
    async query(text, params) {
      const sql = typeof text === "string" ? text.trim() : text;
      calls.push({ text: sql, params });
      if (sql.startsWith("SELECT version, checksum FROM schema_migrations")) {
        return { rows: appliedRows };
      }
      return { rows: [], rowCount: 1 };
    },
    release() {}
  };
  return {
    calls,
    pool: {
      async connect() {
        return client;
      }
    }
  };
}

test("runMigrations applies pending SQL files in order", async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "tm-mig-"));
  await fs.writeFile(path.join(dir, "001_first.sql"), "SELECT 1;");
  await fs.writeFile(path.join(dir, "002_second.sql"), "SELECT 2;");

  const { pool, calls } = createMockPool([]);
  const result = await runMigrations({ pool, migrationsDir: dir, logger: { info() {} } });

  assert.equal(result.available, 2);
  assert.equal(result.applied, 2);
  assert.equal(calls.filter((c) => c.text === "BEGIN").length, 2);
  assert.equal(calls.filter((c) => c.text === "COMMIT").length, 2);
  await fs.rm(dir, { recursive: true, force: true });
});

test("runMigrations fails on checksum mismatch", async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "tm-mig-"));
  await fs.writeFile(path.join(dir, "001_first.sql"), "SELECT 42;");

  const { pool } = createMockPool([{ version: "001", checksum: "different" }]);
  await assert.rejects(
    () => runMigrations({ pool, migrationsDir: dir, logger: { info() {} } }),
    /Checksum mismatch/
  );
  await fs.rm(dir, { recursive: true, force: true });
});

