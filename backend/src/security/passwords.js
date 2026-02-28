import crypto from "node:crypto";

const PREFIX = "scrypt";

export function hashPassword(plainTextPassword) {
  if (!plainTextPassword || plainTextPassword.length < 8) {
    throw new Error("Password must be at least 8 characters long.");
  }

  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(plainTextPassword, salt, 64).toString("hex");
  return `${PREFIX}$${salt}$${hash}`;
}

export function verifyPassword(plainTextPassword, storedHash) {
  const [prefix, salt, expected] = String(storedHash || "").split("$");
  if (prefix !== PREFIX || !salt || !expected) {
    return false;
  }
  const actual = crypto.scryptSync(plainTextPassword, salt, 64).toString("hex");
  return crypto.timingSafeEqual(
    Buffer.from(actual, "utf8"),
    Buffer.from(expected, "utf8")
  );
}

