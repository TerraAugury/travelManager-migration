import test from "node:test";
import assert from "node:assert/strict";
import { hashPassword, verifyPassword } from "../src/security/passwords.js";

test("hashPassword returns scrypt-formatted value", async () => {
  const hash = await hashPassword("correct-horse-battery");
  const parts = hash.split("$");
  assert.equal(parts.length, 3);
  assert.equal(parts[0], "scrypt");
  assert.ok(parts[1].length > 0);
  assert.ok(parts[2].length > 0);
});

test("verifyPassword validates the original password", async () => {
  const password = "family-travel-password";
  const hash = await hashPassword(password);
  assert.equal(await verifyPassword(password, hash), true);
  assert.equal(await verifyPassword("wrong-password", hash), false);
});

test("hashPassword rejects weak or empty passwords", async () => {
  await assert.rejects(() => hashPassword(""), /at least 8 characters/);
  await assert.rejects(() => hashPassword("short"), /at least 8 characters/);
});
