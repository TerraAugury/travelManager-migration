import { getConfig } from "../config.js";
import { buildDb } from "../db.js";
import { hashPassword } from "../security/passwords.js";

function getSeedInput() {
  const email = String(process.env.ADMIN_EMAIL || "").trim().toLowerCase();
  const password = String(process.env.ADMIN_PASSWORD || "");
  const displayName = String(process.env.ADMIN_DISPLAY_NAME || "Admin").trim();

  if (!email || !email.includes("@")) {
    throw new Error("ADMIN_EMAIL is required and must look like an email.");
  }
  if (!password) {
    throw new Error("ADMIN_PASSWORD is required.");
  }
  if (!displayName) {
    throw new Error("ADMIN_DISPLAY_NAME cannot be empty.");
  }

  return { email, password, displayName };
}

async function main() {
  const config = getConfig();
  const db = buildDb(config);
  try {
    const { email, password, displayName } = getSeedInput();
    const passwordHash = hashPassword(password);
    const query = `
      INSERT INTO users (email, display_name, password_hash, role, is_active)
      VALUES ($1, $2, $3, 'admin', TRUE)
      ON CONFLICT (email)
      DO UPDATE SET
        display_name = EXCLUDED.display_name,
        password_hash = EXCLUDED.password_hash,
        role = 'admin',
        is_active = TRUE
      RETURNING id, email, role, is_active
    `;
    const result = await db.pool.query(query, [email, displayName, passwordHash]);
    const row = result.rows[0];
    console.log(`Admin upserted: ${row.email} (${row.id}) role=${row.role}`);
  } finally {
    await db.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

