import test from "node:test";
import assert from "node:assert/strict";
import { registerAdminUsersRoutes } from "../src/routes/adminUsers.js";

const AUTH_USER_ID = "5f8ce478-0fb5-4f84-9df4-c7bc844f039f";

function appMock() {
  const routes = new Map();
  return {
    routes,
    get(path, handler) { routes.set(`GET ${path}`, handler); },
    post(path, handler) { routes.set(`POST ${path}`, handler); },
    patch(path, handler) { routes.set(`PATCH ${path}`, handler); },
    delete(path, handler) { routes.set(`DELETE ${path}`, handler); }
  };
}

function cMock({ headers = {}, query = {}, params = {}, jsonBody = null } = {}) {
  return {
    req: {
      header(name) { return headers[name.toLowerCase()] ?? null; },
      query(name) { return query[name] ?? null; },
      param(name) { return params[name] ?? null; },
      async json() { return jsonBody; }
    },
    json(data, status = 200) { return { data, status }; }
  };
}

function depsMock({ role = "admin" } = {}) {
  const calls = { findAll: null, create: null, update: null };
  const usersRepository = {
    async findActiveById(id) {
      return { id, email: "admin@example.com", display_name: "Admin", role, is_active: 1 };
    },
    async findAll(filters) {
      calls.findAll = filters;
      return [{ id: "u1" }];
    },
    async findAuthByEmail() {
      return null;
    },
    async create(input) {
      calls.create = input;
      return { id: "u2", email: input.email, role: input.role };
    },
    async findById(id) {
      return { id, email: "target@example.com", role: "user", is_active: 1 };
    },
    async update(id, patch) {
      calls.update = { id, patch };
      return { id, email: "target@example.com", role: patch.role || "user" };
    }
  };
  return {
    deps: {
      allowDevHeaderAuth: false,
      usersRepository,
      sessionsRepository: {
        async findActiveByToken() {
          return { id: "s1", user_id: AUTH_USER_ID };
        }
      }
    },
    calls
  };
}

test("GET /api/admin/users returns 403 for non-admin users", async () => {
  const app = appMock();
  const { deps } = depsMock({ role: "user" });
  registerAdminUsersRoutes(app, deps);

  const handler = app.routes.get("GET /api/admin/users");
  const result = await handler(cMock({ headers: { authorization: "Bearer token" } }));
  assert.equal(result.status, 403);
});

test("GET /api/admin/users applies role and active filters", async () => {
  const app = appMock();
  const { deps, calls } = depsMock();
  registerAdminUsersRoutes(app, deps);

  const handler = app.routes.get("GET /api/admin/users");
  const result = await handler(
    cMock({
      headers: { authorization: "Bearer token" },
      query: { role: "user", active: "false" }
    })
  );
  assert.equal(result.status, 200);
  assert.deepEqual(calls.findAll, { role: "user", active: 0 });
});

test("POST /api/admin/users hashes password and defaults role", async () => {
  const app = appMock();
  const { deps, calls } = depsMock();
  registerAdminUsersRoutes(app, deps);

  const handler = app.routes.get("POST /api/admin/users");
  const result = await handler(
    cMock({
      headers: { authorization: "Bearer token" },
      jsonBody: {
        email: "NewUser@Example.com",
        display_name: "New User",
        password: "super-secret-pass"
      }
    })
  );
  assert.equal(result.status, 201);
  assert.equal(calls.create.email, "newuser@example.com");
  assert.equal(calls.create.role, "user");
  assert.notEqual(calls.create.passwordHash, "super-secret-pass");
  assert.match(calls.create.passwordHash, /^scrypt\$/);
});

test("PATCH /api/admin/users/:id blocks self-deactivation", async () => {
  const app = appMock();
  const { deps } = depsMock();
  registerAdminUsersRoutes(app, deps);

  const handler = app.routes.get("PATCH /api/admin/users/:id");
  const result = await handler(
    cMock({
      headers: { authorization: "Bearer token" },
      params: { id: AUTH_USER_ID },
      jsonBody: { is_active: false }
    })
  );
  assert.equal(result.status, 400);
  assert.match(result.data.error, /cannot deactivate/i);
});

test("PATCH /api/admin/users/:id hashes new password before update", async () => {
  const app = appMock();
  const { deps, calls } = depsMock();
  registerAdminUsersRoutes(app, deps);

  const handler = app.routes.get("PATCH /api/admin/users/:id");
  const result = await handler(
    cMock({
      headers: { authorization: "Bearer token" },
      params: { id: "371f0130-a576-452e-b4d5-4d26b5a84540" },
      jsonBody: { password: "rotated-secret" }
    })
  );
  assert.equal(result.status, 200);
  assert.notEqual(calls.update.patch.passwordHash, "rotated-secret");
  assert.match(calls.update.patch.passwordHash, /^scrypt\$/);
});

test("DELETE /api/admin/users/:id blocks self-delete", async () => {
  const app = appMock();
  const { deps } = depsMock();
  registerAdminUsersRoutes(app, deps);

  const handler = app.routes.get("DELETE /api/admin/users/:id");
  const result = await handler(
    cMock({
      headers: { authorization: "Bearer token" },
      params: { id: AUTH_USER_ID }
    })
  );
  assert.equal(result.status, 400);
  assert.match(result.data.error, /cannot delete/i);
});
