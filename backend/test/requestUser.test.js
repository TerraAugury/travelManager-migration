import test from "node:test";
import assert from "node:assert/strict";
import { requireRequestUser } from "../src/auth/requestUser.js";

function replyMock() {
  return {
    statusCode: 200,
    code(value) {
      this.statusCode = value;
      return this;
    }
  };
}

test("rejects request without bearer token when dev fallback disabled", async () => {
  const reply = replyMock();
  const out = await requireRequestUser(
    { headers: {} },
    reply,
    {
      allowDevHeaderAuth: false,
      usersRepository: { async findActiveById() { return null; } },
      sessionsRepository: { async findActiveByToken() { return null; } }
    }
  );
  assert.equal(reply.statusCode, 401);
  assert.match(out.error, /Missing bearer token/);
});

test("authenticates by bearer token when session and user are valid", async () => {
  const reply = replyMock();
  const userId = "5f8ce478-0fb5-4f84-9df4-c7bc844f039f";
  const out = await requireRequestUser(
    { headers: { authorization: "Bearer token-value" } },
    reply,
    {
      allowDevHeaderAuth: false,
      usersRepository: { async findActiveById() { return { id: userId, email: "a@b.com" }; } },
      sessionsRepository: { async findActiveByToken() { return { id: "s1", user_id: userId }; } }
    }
  );
  assert.equal(reply.statusCode, 200);
  assert.equal(out.user.email, "a@b.com");
  assert.equal(out.token, "token-value");
});

test("supports x-user-id fallback when explicitly enabled", async () => {
  const reply = replyMock();
  const userId = "5f8ce478-0fb5-4f84-9df4-c7bc844f039f";
  const out = await requireRequestUser(
    { headers: { "x-user-id": userId } },
    reply,
    {
      allowDevHeaderAuth: true,
      usersRepository: { async findActiveById() { return { id: userId, email: "dev@local" }; } },
      sessionsRepository: { async findActiveByToken() { return null; } }
    }
  );
  assert.equal(reply.statusCode, 200);
  assert.equal(out.user.email, "dev@local");
});

