import crypto from "node:crypto";

export function generateAuthToken() {
  const value = crypto.randomBytes(32).toString("base64url");
  return `tm_${value}`;
}

export function hashAuthToken(token) {
  return crypto.createHash("sha256").update(String(token || "")).digest("hex");
}

