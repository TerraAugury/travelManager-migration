import dotenv from "dotenv";

dotenv.config();

const requiredVars = ["DATABASE_URL"];
const DEFAULT_LOGIN_LIMIT_WINDOW_MS = 15 * 60 * 1000;
const DEFAULT_LOGIN_LIMIT_MAX_ATTEMPTS = 10;

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

function parsePositiveInt(value, fieldName, defaultValue) {
  if (value == null || value === "") return defaultValue;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`${fieldName} must be a positive integer.`);
  }
  return parsed;
}

export function getConfig() {
  assertRequiredEnv();
  const env = process.env.NODE_ENV || "development";
  const devHeaderFallbackRequested = parseBool(
    process.env.DEV_AUTH_X_USER_ID_FALLBACK,
    false
  );
  if (env === "production" && devHeaderFallbackRequested) {
    throw new Error("DEV_AUTH_X_USER_ID_FALLBACK must be false in production.");
  }

  return {
    env,
    port: parsePort(process.env.PORT || "8000"),
    databaseUrl: process.env.DATABASE_URL,
    allowDevHeaderAuth: env !== "production" && devHeaderFallbackRequested,
    authLoginRateLimitWindowMs: parsePositiveInt(
      process.env.AUTH_LOGIN_RATE_LIMIT_WINDOW_MS,
      "AUTH_LOGIN_RATE_LIMIT_WINDOW_MS",
      DEFAULT_LOGIN_LIMIT_WINDOW_MS
    ),
    authLoginRateLimitMaxAttempts: parsePositiveInt(
      process.env.AUTH_LOGIN_RATE_LIMIT_MAX_ATTEMPTS,
      "AUTH_LOGIN_RATE_LIMIT_MAX_ATTEMPTS",
      DEFAULT_LOGIN_LIMIT_MAX_ATTEMPTS
    )
  };
}
