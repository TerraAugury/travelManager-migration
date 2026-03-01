import crypto from "node:crypto";
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

function sqlStr(value) {
  return `'${String(value).replace(/'/g, "''")}'`;
}

async function main() {
  const { email, password, displayName } = getSeedInput();
  const passwordHash = await hashPassword(password);
  const id = crypto.randomUUID();

  const sql = [
    `INSERT INTO users (id, email, display_name, password_hash, role, is_active)`,
    `VALUES (${sqlStr(id)}, ${sqlStr(email)}, ${sqlStr(displayName)}, ${sqlStr(passwordHash)}, 'admin', 1)`,
    `ON CONFLICT (email) DO UPDATE SET`,
    `  display_name = excluded.display_name,`,
    `  password_hash = excluded.password_hash,`,
    `  role = 'admin',`,
    `  is_active = 1;`
  ].join("\n");

  console.log("Run this SQL against your D1 database:");
  console.log("  wrangler d1 execute travel-manager --remote --command='<SQL>'");
  console.log("");
  console.log(sql);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
