import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";

function versionFromFilename(filename) {
  const match = filename.match(/^(\d+)_.*\.sql$/);
  if (!match) {
    throw new Error(`Invalid migration filename: ${filename}`);
  }
  return match[1];
}

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

async function loadMigrations(migrationsDir) {
  const entries = await fs.readdir(migrationsDir, { withFileTypes: true });
  const files = entries
    .filter((entry) => entry.isFile() && entry.name.endsWith(".sql"))
    .map((entry) => entry.name)
    .sort((a, b) => a.localeCompare(b));

  const migrations = [];
  for (const filename of files) {
    const fullPath = path.join(migrationsDir, filename);
    const sql = await fs.readFile(fullPath, "utf8");
    migrations.push({
      version: versionFromFilename(filename),
      filename,
      checksum: sha256(sql),
      sql
    });
  }
  return migrations;
}

export async function runMigrations({ pool, migrationsDir, logger = console }) {
  const migrations = await loadMigrations(migrationsDir);
  const client = await pool.connect();
  let appliedCount = 0;

  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version TEXT PRIMARY KEY,
        filename TEXT NOT NULL,
        checksum TEXT NOT NULL,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    const appliedRows = await client.query(
      "SELECT version, checksum FROM schema_migrations"
    );
    const applied = new Map(
      (appliedRows.rows || []).map((row) => [row.version, row.checksum])
    );

    for (const migration of migrations) {
      const previous = applied.get(migration.version);
      if (previous && previous !== migration.checksum) {
        throw new Error(
          `Checksum mismatch for migration ${migration.filename}.`
        );
      }
      if (previous) {
        continue;
      }

      logger.info(`Applying migration ${migration.filename}`);
      await client.query("BEGIN");
      try {
        await client.query(migration.sql);
        await client.query(
          `INSERT INTO schema_migrations (version, filename, checksum)
           VALUES ($1, $2, $3)`,
          [migration.version, migration.filename, migration.checksum]
        );
        await client.query("COMMIT");
        appliedCount += 1;
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      }
    }

    return {
      available: migrations.length,
      applied: appliedCount
    };
  } finally {
    client.release();
  }
}

