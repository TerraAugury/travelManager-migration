import test from "node:test";
import assert from "node:assert/strict";
import { registerHealthRoutes } from "../src/routes/health.js";

function appMock() {
  const routes = new Map();
  return {
    routes,
    get(path, handler) { routes.set(path, handler); }
  };
}

function cMock() {
  return {
    json(data, status = 200) { return { data, status }; }
  };
}

test("registerHealthRoutes wires the /health endpoint", async () => {
  const app = appMock();
  registerHealthRoutes(app, { db: { check: async () => true } });

  const handler = app.routes.get("/health");
  assert.ok(handler);
  const result = await handler(cMock());
  assert.deepEqual(result.data, { status: "ok", service: "travel-manager-backend" });
  assert.equal(result.status, 200);
});

test("/health/db returns ok when DB check passes", async () => {
  const app = appMock();
  registerHealthRoutes(app, { db: { check: async () => true } });

  const handler = app.routes.get("/health/db");
  const result = await handler(cMock());
  assert.deepEqual(result.data, { status: "ok", database: "connected" });
  assert.equal(result.status, 200);
});

test("/health/db returns 503 when DB check throws", async () => {
  const app = appMock();
  registerHealthRoutes(app, { db: { check: async () => { throw new Error("offline"); } } });

  const handler = app.routes.get("/health/db");
  const result = await handler(cMock());
  assert.equal(result.status, 503);
  assert.deepEqual(result.data, { status: "degraded", database: "unavailable" });
});
