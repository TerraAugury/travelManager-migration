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

function cMock({ headers = {}, jsonBody = null } = {}) {
  return {
    req: {
      header(name) { return headers[name.toLowerCase()] ?? null; },
      async json() { return jsonBody; }
    },
    json(data, status = 200) { return { data, status }; }
  };
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
  registerSyncRoutes(app, deps);

  const handler = app.routes.get("GET /api/sync/trips");
  const result = await handler(cMock({ headers: { authorization: "Bearer token" } }));
  assert.equal(Array.isArray(result.data), true);
  assert.equal(result.data[0].name, "Trip");
});

test("PUT /sync/trips rejects non-array body", async () => {
  const app = appMock();
  const deps = depsMock();
  registerSyncRoutes(app, deps);

  const handler = app.routes.get("PUT /api/sync/trips");
  const result = await handler(cMock({
    headers: { authorization: "Bearer token" },
    jsonBody: {}
  }));
  assert.equal(result.status, 400);
  assert.match(result.data.error, /array of trips/);
});
