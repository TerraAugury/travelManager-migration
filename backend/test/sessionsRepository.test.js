import test from "node:test";
import assert from "node:assert/strict";
import { buildSessionsRepository } from "../src/repositories/sessionsRepository.js";

test("create stores hashed token and returns session row", async () => {
  const calls = [];
  const repo = buildSessionsRepository({
    pool: {
      async query(text, params) {
        calls.push({ text, params });
        return { rows: [{ id: "s1", user_id: "u1" }], rowCount: 1 };
      }
    }
  });

  const row = await repo.create({ userId: "u1", token: "secret-token" });
  assert.equal(row.id, "s1");
  assert.match(calls[0].text, /INSERT INTO sessions/);
  assert.equal(calls[0].params[0], "u1");
  assert.notEqual(calls[0].params[1], "secret-token");
});

test("findActiveByToken queries token hash and validity window", async () => {
  const calls = [];
  const repo = buildSessionsRepository({
    pool: {
      async query(text, params) {
        calls.push({ text, params });
        return { rows: [] };
      }
    }
  });

  const row = await repo.findActiveByToken("token-value");
  assert.equal(row, null);
  assert.match(calls[0].text, /expires_at > NOW\(\)/);
  assert.notEqual(calls[0].params[0], "token-value");
});

