import test from "node:test";
import assert from "node:assert/strict";
import { buildUsersRepository } from "../src/repositories/usersRepository.js";

test("findActiveById queries active user by id", async () => {
  const calls = [];
  const repo = buildUsersRepository({
    pool: {
      async query(text, params) {
        calls.push({ text, params });
        return { rows: [{ id: "u1", email: "admin@example.com" }] };
      }
    }
  });

  const row = await repo.findActiveById("u1");
  assert.equal(row.email, "admin@example.com");
  assert.match(calls[0].text, /FROM users/);
  assert.match(calls[0].text, /is_active = TRUE/);
  assert.deepEqual(calls[0].params, ["u1"]);
});

test("findByEmail uses case-insensitive query", async () => {
  const calls = [];
  const repo = buildUsersRepository({
    pool: {
      async query(text, params) {
        calls.push({ text, params });
        return { rows: [] };
      }
    }
  });

  const row = await repo.findByEmail("USER@EXAMPLE.COM");
  assert.equal(row, null);
  assert.match(calls[0].text, /LOWER\(email\) = LOWER\(\$1\)/);
  assert.deepEqual(calls[0].params, ["USER@EXAMPLE.COM"]);
});

test("findAuthByEmail selects password hash for auth flow", async () => {
  const calls = [];
  const repo = buildUsersRepository({
    pool: {
      async query(text, params) {
        calls.push({ text, params });
        return { rows: [{ id: "u2", password_hash: "hash" }] };
      }
    }
  });

  const row = await repo.findAuthByEmail("login@example.com");
  assert.equal(row.id, "u2");
  assert.match(calls[0].text, /password_hash/);
  assert.deepEqual(calls[0].params, ["login@example.com"]);
});
