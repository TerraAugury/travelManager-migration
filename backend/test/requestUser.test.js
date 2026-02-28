import test from "node:test";
import assert from "node:assert/strict";
import { requireRequestUser } from "../src/auth/requestUser.js";

function createReply() {
  return {
    statusCode: 200,
    code(value) {
      this.statusCode = value;
      return this;
    }
  };
}

test("requireRequestUser rejects missing header", async () => {
  const reply = createReply();
  const request = { headers: {} };
  const usersRepository = { async findActiveById() { return null; } };
  const out = await requireRequestUser(request, reply, usersRepository);
  assert.equal(reply.statusCode, 401);
  assert.match(out.error, /x-user-id/);
});

test("requireRequestUser rejects unknown user", async () => {
  const reply = createReply();
  const request = { headers: { "x-user-id": "5f8ce478-0fb5-4f84-9df4-c7bc844f039f" } };
  const usersRepository = { async findActiveById() { return null; } };
  const out = await requireRequestUser(request, reply, usersRepository);
  assert.equal(reply.statusCode, 401);
  assert.match(out.error, /not found/);
});

test("requireRequestUser returns user when header and user are valid", async () => {
  const reply = createReply();
  const request = { headers: { "x-user-id": "5f8ce478-0fb5-4f84-9df4-c7bc844f039f" } };
  const usersRepository = {
    async findActiveById() {
      return { id: "5f8ce478-0fb5-4f84-9df4-c7bc844f039f", email: "a@b.com" };
    }
  };
  const out = await requireRequestUser(request, reply, usersRepository);
  assert.equal(reply.statusCode, 200);
  assert.equal(out.user.email, "a@b.com");
});

