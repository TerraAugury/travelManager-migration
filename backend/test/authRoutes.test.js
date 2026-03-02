import test from "node:test";
import assert from "node:assert/strict";
import { registerAuthRoutes } from "../src/routes/auth.js";
import { hashPassword } from "../src/security/passwords.js";

function appMock() {
  const routes = new Map();
  return {
    routes,
    get(path, handler) { routes.set(`GET ${path}`, handler); },
    post(path, handler) { routes.set(`POST ${path}`, handler); }
  };
}

function replyMock() {
  return {
    statusCode: 200,
    headers: {},
    code(v) { this.statusCode = v; return this; },
    header(name, value) { this.headers[name] = value; return this; }
  };
}

test("POST /auth/login returns token for valid credentials", async () => {
  const app = appMock();
  const passwordHash = hashPassword("super-secret-pass");
  await registerAuthRoutes(app, {
    allowDevHeaderAuth: false,
    usersRepository: {
      async findAuthByEmail() {
        return { id: "u1", email: "a@b.com", display_name: "A", role: "admin", is_active: true, password_hash: passwordHash };
      },
      async findActiveById() { return { id: "u1", email: "a@b.com", display_name: "A", role: "admin" }; }
    },
    sessionsRepository: {
      async create() { return { id: "s1", expires_at: "2099-01-01T00:00:00Z" }; },
      async findActiveByToken() { return { id: "s1", user_id: "u1" }; },
      async revokeToken() { return true; }
    }
  });

  const handler = app.routes.get("POST /auth/login");
  const reply = replyMock();
  const body = await handler({ body: { email: "a@b.com", password: "super-secret-pass" } }, reply);
  assert.equal(reply.statusCode, 200);
  assert.ok(body.token);
  assert.equal(body.user.email, "a@b.com");
});

test("POST /auth/login rejects invalid credentials", async () => {
  const app = appMock();
  await registerAuthRoutes(app, {
    allowDevHeaderAuth: false,
    usersRepository: { async findAuthByEmail() { return null; }, async findActiveById() { return null; } },
    sessionsRepository: { async create() { return null; }, async findActiveByToken() { return null; }, async revokeToken() { return false; } }
  });

  const handler = app.routes.get("POST /auth/login");
  const reply = replyMock();
  const body = await handler({ body: { email: "bad@bad.com", password: "wrong-pass" } }, reply);
  assert.equal(reply.statusCode, 401);
  assert.match(body.error, /Invalid email or password/);
});

test("POST /auth/login applies rate limit", async () => {
  const app = appMock();
  await registerAuthRoutes(app, {
    allowDevHeaderAuth: false,
    authLoginRateLimitWindowMs: 60_000,
    authLoginRateLimitMaxAttempts: 1,
    usersRepository: { async findAuthByEmail() { return null; }, async findActiveById() { return null; } },
    sessionsRepository: { async create() { return null; }, async findActiveByToken() { return null; }, async revokeToken() { return false; } }
  });

  const handler = app.routes.get("POST /auth/login");
  const firstReply = replyMock();
  await handler({ body: { email: "a@b.com", password: "bad-pass" }, headers: {}, ip: "127.0.0.1" }, firstReply);
  assert.equal(firstReply.statusCode, 401);

  const secondReply = replyMock();
  const secondBody = await handler(
    { body: { email: "a@b.com", password: "bad-pass" }, headers: {}, ip: "127.0.0.1" },
    secondReply
  );
  assert.equal(secondReply.statusCode, 429);
  assert.match(secondBody.error, /Too many login attempts/);
});
