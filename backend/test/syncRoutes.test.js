import test from "node:test";
import assert from "node:assert/strict";
import { registerSyncRoutes } from "../src/routes/sync.js";

function appMock() {
  const routes = new Map();
  return {
    routes,
    get(path, handler) { routes.set(`GET ${path}`, handler); },
    put(path, handler) { routes.set(`PUT ${path}`, handler); }
  };
}

function replyMock() {
  return { statusCode: 200, code(v) { this.statusCode = v; return this; } };
}

function depsMock() {
  const user = { id: "5f8ce478-0fb5-4f84-9df4-c7bc844f039f", email: "a@b.com" };
  return {
    allowDevHeaderAuth: false,
    usersRepository: { async findActiveById() { return user; } },
    sessionsRepository: { async findActiveByToken() { return { id: "s1", user_id: user.id }; } },
    legacyTripsExportService: { async exportByOwner() { return [{ id: "t1", name: "Trip" }]; } },
    legacyTripsImportService: { async replaceForOwner() { return { importedTrips: 1 }; } }
  };
}

test("GET /sync/trips returns legacy trips for authenticated user", async () => {
  const app = appMock();
  const deps = depsMock();
  await registerSyncRoutes(app, deps);

  const handler = app.routes.get("GET /sync/trips");
  const body = await handler({ headers: { authorization: "Bearer token" } }, replyMock());
  assert.equal(Array.isArray(body), true);
  assert.equal(body[0].name, "Trip");
});

test("PUT /sync/trips rejects non-array body", async () => {
  const app = appMock();
  const deps = depsMock();
  await registerSyncRoutes(app, deps);

  const handler = app.routes.get("PUT /sync/trips");
  const reply = replyMock();
  const body = await handler({ headers: { authorization: "Bearer token" }, body: {} }, reply);
  assert.equal(reply.statusCode, 400);
  assert.match(body.error, /array of trips/);
});

