import path from "node:path";
import { fileURLToPath } from "node:url";
import { getConfig } from "../config.js";
import { buildDb } from "../db.js";
import { runMigrations } from "../migrations/runMigrations.js";

function migrationsDir() {
  const filePath = fileURLToPath(import.meta.url);
  const base = path.dirname(filePath);
  return path.resolve(base, "../../migrations");
}

async function main() {
  const config = getConfig();
  const db = buildDb(config);
  try {
    const result = await runMigrations({
      pool: db.pool,
      migrationsDir: migrationsDir()
    });
    console.log(
      `Migrations complete. Applied ${result.applied} of ${result.available}.`
    );
  } finally {
    await db.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

