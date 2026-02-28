import test from "node:test";
import assert from "node:assert/strict";
import { buildApp } from "../src/app.js";

async function withApp(dbImpl, run) {
  const app = await buildApp({ db: dbImpl });
  try {
    await run(app);
  } finally {
    await app.close();
  }
}

test("GET /health returns service readiness payload", async () => {
  await withApp({ check: async () => true }, async (app) => {
    const response = await app.inject({
      method: "GET",
      url: "/health"
    });

    assert.equal(response.statusCode, 200);
    assert.deepEqual(response.json(), {
      status: "ok",
      service: "travel-manager-backend"
    });
  });
});

test("GET /health/db returns ok when database is reachable", async () => {
  await withApp({ check: async () => true }, async (app) => {
    const response = await app.inject({
      method: "GET",
      url: "/health/db"
    });

    assert.equal(response.statusCode, 200);
    assert.deepEqual(response.json(), {
      status: "ok",
      database: "connected"
    });
  });
});

test("GET /health/db returns degraded when check returns false", async () => {
  await withApp({ check: async () => false }, async (app) => {
    const response = await app.inject({
      method: "GET",
      url: "/health/db"
    });

    assert.equal(response.statusCode, 200);
    assert.deepEqual(response.json(), {
      status: "degraded",
      database: "unavailable"
    });
  });
});

test("GET /health/db returns 503 when database check throws", async () => {
  await withApp(
    { check: async () => Promise.reject(new Error("db offline")) },
    async (app) => {
      const response = await app.inject({
        method: "GET",
        url: "/health/db"
      });

      assert.equal(response.statusCode, 503);
      assert.deepEqual(response.json(), {
        status: "degraded",
        database: "unavailable"
      });
    }
  );
});

