import test from "node:test";
import assert from "node:assert/strict";
import { registerFlightsTodayRoutes } from "../src/routes/flightsToday.js";

function appMock() {
  const routes = new Map();
  return {
    routes,
    get(path, handler) { routes.set(`GET ${path}`, handler); }
  };
}

function cMock(headers = {}, env = {}) {
  return {
    env,
    req: {
      header(name) { return headers[name.toLowerCase()] ?? null; }
    },
    json(data, status = 200) { return { data, status }; }
  };
}

function depsMock({ rows = [] } = {}) {
  const user = { id: "5f8ce478-0fb5-4f84-9df4-c7bc844f039f", email: "user@site.com" };
  const calls = [];
  return {
    calls,
    deps: {
      allowDevHeaderAuth: false,
      usersRepository: { async findActiveById() { return user; } },
      sessionsRepository: { async findActiveByToken() { return { id: "session-1", user_id: user.id }; } },
      pool: {
        async query(text, params) {
          calls.push({ text, params });
          return { rows };
        }
      }
    }
  };
}

test("GET /api/flights/today returns today's flights for authenticated user", async () => {
  const app = appMock();
  const today = new Date().toISOString().slice(0, 10);
  const { deps, calls } = depsMock({
    rows: [{
      id: "flight-1",
      trip_id: "trip-1",
      trip_name: "Work Travel",
      flight_number: "LX123",
      airline: "SWISS",
      departure_airport_code: "LUX",
      departure_airport_name: "Luxembourg Airport",
      arrival_airport_code: "JFK",
      arrival_airport_name: "John F. Kennedy International",
      departure_scheduled: "2026-03-05T10:00:00.000Z",
      arrival_scheduled: "2026-03-05T14:00:00.000Z",
      passenger_names_csv: "Alice Smith,Bob Jones"
    }]
  });
  registerFlightsTodayRoutes(app, deps);

  const handler = app.routes.get("GET /api/flights/today");
  const result = await handler(cMock({ authorization: "Bearer token" }));

  assert.equal(result.status, 200);
  assert.equal(result.data.date, today);
  assert.equal(result.data.flights.length, 1);
  assert.deepEqual(result.data.flights[0], {
    id: "flight-1",
    tripId: "trip-1",
    tripName: "Work Travel",
    flightNumber: "LX123",
    airline: "SWISS",
    departureCode: "LUX",
    departureAirportName: "Luxembourg Airport",
    arrivalCode: "JFK",
    arrivalAirportName: "John F. Kennedy International",
    departureScheduled: "2026-03-05T10:00:00.000Z",
    arrivalScheduled: "2026-03-05T14:00:00.000Z",
    passengerNames: ["Alice Smith", "Bob Jones"]
  });
  assert.equal(calls[0].params[0], "5f8ce478-0fb5-4f84-9df4-c7bc844f039f");
  assert.match(calls[0].text, /LEFT JOIN trip_passengers/i);
  assert.match(calls[0].text, /DATE\(fr\.departure_scheduled\) = DATE\('now'\)/i);
  assert.match(calls[0].text, /DATE\(fr\.arrival_scheduled\) = DATE\('now'\)/i);
});

test("GET /api/flights/today returns empty flights list when none are scheduled today", async () => {
  const app = appMock();
  const today = new Date().toISOString().slice(0, 10);
  const { deps } = depsMock({ rows: [] });
  registerFlightsTodayRoutes(app, deps);

  const handler = app.routes.get("GET /api/flights/today");
  const result = await handler(cMock({ authorization: "Bearer token" }));

  assert.equal(result.status, 200);
  assert.deepEqual(result.data, { date: today, flights: [] });
});

test("GET /api/flights/today returns 401 without authentication", async () => {
  const app = appMock();
  const { deps, calls } = depsMock({ rows: [] });
  registerFlightsTodayRoutes(app, deps);

  const handler = app.routes.get("GET /api/flights/today");
  const result = await handler(cMock({}));

  assert.equal(result.status, 401);
  assert.match(result.data.error, /Missing bearer token/i);
  assert.equal(calls.length, 0);
});

test("GET /api/flights/aerodatabox/balance returns upstream balance and headers", async () => {
  const app = appMock();
  const { deps } = depsMock({ rows: [] });
  registerFlightsTodayRoutes(app, deps);
  const handler = app.routes.get("GET /api/flights/aerodatabox/balance");
  const originalFetch = globalThis.fetch;
  try {
    globalThis.fetch = async () => ({
      ok: true,
      headers: new Headers({
        "x-ratelimit-requests-remaining": "58",
        "x-ratelimit-requests-limit": "600",
        "x-ratelimit-requests-reset": "1234"
      }),
      text: async () => JSON.stringify({
        creditsRemaining: 321,
        lastRefilledUtc: "2026-03-06T10:00:00Z",
        lastDeductedUtc: "2026-03-06T10:30:00Z"
      })
    });
    const result = await handler(cMock({ authorization: "Bearer token" }, { AERODATABOX_API_KEY: "abc" }));
    assert.equal(result.status, 200);
    assert.deepEqual(result.data, {
      creditsRemaining: 321,
      lastRefilledUtc: "2026-03-06T10:00:00Z",
      lastDeductedUtc: "2026-03-06T10:30:00Z",
      requestsRemaining: 58,
      requestsLimit: 600,
      requestsReset: 1234
    });
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("GET /api/flights/aerodatabox/balance exposes upstream error details", async () => {
  const app = appMock();
  const { deps } = depsMock({ rows: [] });
  registerFlightsTodayRoutes(app, deps);
  const handler = app.routes.get("GET /api/flights/aerodatabox/balance");
  const originalFetch = globalThis.fetch;
  try {
    globalThis.fetch = async () => ({
      ok: false,
      status: 403,
      text: async () => JSON.stringify({ message: "Forbidden" })
    });
    const result = await handler(cMock({ authorization: "Bearer token" }, { AERODATABOX_API_KEY: "abc" }));
    assert.equal(result.status, 502);
    assert.equal(result.data.upstreamStatus, 403);
    assert.deepEqual(result.data.upstreamBody, { message: "Forbidden" });
  } finally {
    globalThis.fetch = originalFetch;
  }
});
