import test from "node:test";
import assert from "node:assert/strict";
import { requireRequestUser } from "../src/auth/requestUser.js";

function cMock(headers = {}) {
  return {
    req: {
      header(name) { return headers[name.toLowerCase()] ?? null; }
    }
  };
}

test("rejects request without bearer token when dev fallback disabled", async () => {
  const out = await requireRequestUser(
    cMock({}),
    {
      allowDevHeaderAuth: false,
      usersRepository: { async findActiveById() { return null; } },
      sessionsRepository: { async findActiveByToken() { return null; } }
    }
  );
  assert.equal(out._status, 401);
  assert.match(out.error, /Missing bearer token/);
});

test("authenticates by bearer token when session and user are valid", async () => {
  const userId = "5f8ce478-0fb5-4f84-9df4-c7bc844f039f";
  const out = await requireRequestUser(
    cMock({ authorization: "Bearer token-value" }),
    {
      allowDevHeaderAuth: false,
      usersRepository: { async findActiveById() { return { id: userId, email: "a@b.com" }; } },
      sessionsRepository: { async findActiveByToken() { return { id: "s1", user_id: userId }; } }
    }
  );
  assert.ok(!out.error);
  assert.equal(out.user.email, "a@b.com");
  assert.equal(out.token, "token-value");
});

test("supports x-user-id fallback when explicitly enabled", async () => {
  const userId = "5f8ce478-0fb5-4f84-9df4-c7bc844f039f";
  const out = await requireRequestUser(
    cMock({ "x-user-id": userId }),
    {
      allowDevHeaderAuth: true,
      usersRepository: { async findActiveById() { return { id: userId, email: "dev@local" }; } },
      sessionsRepository: { async findActiveByToken() { return null; } }
    }
  );
  assert.ok(!out.error);
  assert.equal(out.user.email, "dev@local");
});
