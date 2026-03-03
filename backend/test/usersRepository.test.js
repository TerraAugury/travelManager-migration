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

test("findAll applies role and active filters", async () => {
  const calls = [];
  const repo = buildUsersRepository({
    pool: {
      async query(text, params) {
        calls.push({ text, params });
        return { rows: [{ id: "u3" }] };
      }
    }
  });

  const rows = await repo.findAll({ role: "user", active: 1 });
  assert.equal(rows[0].id, "u3");
  assert.match(calls[0].text, /\(\$1 IS NULL OR role = \$1\)/);
  assert.match(calls[0].text, /\(\$2 IS NULL OR is_active = \$2\)/);
  assert.deepEqual(calls[0].params, ["user", 1]);
});

test("create inserts user and returns public fields", async () => {
  const calls = [];
  const repo = buildUsersRepository({
    pool: {
      async query(text, params) {
        calls.push({ text, params });
        return { rows: [{ id: "u4", email: "new@example.com" }] };
      }
    }
  });

  const row = await repo.create({
    email: "new@example.com",
    displayName: "New User",
    passwordHash: "hash-value",
    role: "admin"
  });
  assert.equal(row.id, "u4");
  assert.match(calls[0].text, /INSERT INTO users/);
  assert.equal(calls[0].params[1], "new@example.com");
  assert.equal(calls[0].params[2], "New User");
  assert.equal(calls[0].params[3], "hash-value");
  assert.equal(calls[0].params[4], "admin");
});

test("update applies patch values using COALESCE", async () => {
  const calls = [];
  const repo = buildUsersRepository({
    pool: {
      async query(text, params) {
        calls.push({ text, params });
        return { rows: [{ id: "u5", display_name: "Updated" }] };
      }
    }
  });

  const row = await repo.update("u5", {
    displayName: "Updated",
    role: "user",
    isActive: 0,
    passwordHash: "new-hash"
  });
  assert.equal(row.id, "u5");
  assert.match(calls[0].text, /UPDATE users/);
  assert.match(calls[0].text, /display_name = COALESCE/);
  assert.deepEqual(calls[0].params, ["u5", "Updated", "user", 0, "new-hash"]);
});
