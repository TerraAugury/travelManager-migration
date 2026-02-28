import dotenv from "dotenv";

dotenv.config();

const requiredVars = ["DATABASE_URL"];

function assertRequiredEnv() {
  const missing = requiredVars.filter((name) => !process.env[name]);
  if (missing.length) {
    throw new Error(`Missing required environment variables: ${missing.join(", ")}`);
  }
}

function parsePort(value) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0 || parsed > 65535) {
    throw new Error(`Invalid PORT value: ${value}`);
  }
  return parsed;
}

function parseBool(value, defaultValue = false) {
  if (value == null || value === "") return defaultValue;
  const normalized = String(value).trim().toLowerCase();
  if (["1", "true", "yes", "on"].includes(normalized)) return true;
  if (["0", "false", "no", "off"].includes(normalized)) return false;
  throw new Error(`Invalid boolean value: ${value}`);
}

export function getConfig() {
  assertRequiredEnv();
  return {
    env: process.env.NODE_ENV || "development",
    port: parsePort(process.env.PORT || "8000"),
    databaseUrl: process.env.DATABASE_URL,
    allowDevHeaderAuth: parseBool(process.env.DEV_AUTH_X_USER_ID_FALLBACK, false)
  };
}
