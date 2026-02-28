import test from "node:test";
import assert from "node:assert/strict";
import { registerHealthRoutes } from "../src/routes/health.js";

function createMockApp() {
  const routes = new Map();
  return {
    routes,
    get(path, handler) {
      routes.set(path, handler);
    }
  };
}

function createMockReply() {
  return {
    codeValue: 200,
    code(statusCode) {
      this.codeValue = statusCode;
      return this;
    }
  };
}

test("registerHealthRoutes wires the /health endpoint", async () => {
  const app = createMockApp();
  await registerHealthRoutes(app, { db: { check: async () => true } });

  const healthHandler = app.routes.get("/health");
  assert.ok(healthHandler);
  const body = await healthHandler();
  assert.deepEqual(body, {
    status: "ok",
    service: "travel-manager-backend"
  });
});

test("/health/db returns ok when DB check passes", async () => {
  const app = createMockApp();
  await registerHealthRoutes(app, { db: { check: async () => true } });

  const handler = app.routes.get("/health/db");
  const request = { log: { error() {} } };
  const reply = createMockReply();
  const body = await handler(request, reply);

  assert.equal(reply.codeValue, 200);
  assert.deepEqual(body, {
    status: "ok",
    database: "connected"
  });
});

test("/health/db returns 503 when DB check throws", async () => {
  const app = createMockApp();
  await registerHealthRoutes(app, {
    db: { check: async () => Promise.reject(new Error("offline")) }
  });

  const handler = app.routes.get("/health/db");
  const request = { log: { error() {} } };
  const reply = createMockReply();
  const body = await handler(request, reply);

  assert.equal(reply.codeValue, 503);
  assert.deepEqual(body, {
    status: "degraded",
    database: "unavailable"
  });
});

