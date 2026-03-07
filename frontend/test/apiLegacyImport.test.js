import test from "node:test";
import assert from "node:assert/strict";
import { importLegacyTrips } from "../src/api.js";

function mockFetch() {
  const calls = [];
  globalThis.fetch = async (url, options = {}) => {
    calls.push({ url, options });
    return {
      ok: true,
      status: 200,
      async text() {
        return JSON.stringify({ importedTrips: 1 });
      }
    };
  };
  return calls;
}

test("importLegacyTrips sends items array when payload is wrapped", async () => {
  const calls = mockFetch();
  await importLegacyTrips({ items: [{ name: "Trip A" }] });
  assert.equal(calls[0].url, "/api/sync/trips");
  assert.equal(calls[0].options.method, "PUT");
  assert.equal(calls[0].options.body, JSON.stringify([{ name: "Trip A" }]));
});
