import test from "node:test";
import assert from "node:assert/strict";
import { formatLegacyImportSuccess, importLegacyFromFile, summarizeLegacyImport } from "../src/legacyImportFeedback.js";

test("summarizeLegacyImport returns trip, flight and unique passenger counts", () => {
  const summary = summarizeLegacyImport({
    importedTrips: 2,
    items: [
      {
        records: [{ paxNames: ["Alice Smith", "Bob Ray"] }, { paxNames: ["alice   smith"] }],
        hotels: [{ paxNames: [" Bob Ray ", "Charlie Day"] }]
      },
      {
        records: [{ paxNames: ["Dana"] }],
        hotels: []
      }
    ]
  });

  assert.deepEqual(summary, { trips: 2, flights: 3, passengers: 4 });
});

test("formatLegacyImportSuccess includes all imported totals", () => {
  const message = formatLegacyImportSuccess({ trips: 1, flights: 2, passengers: 3 });
  assert.equal(message, "Import successful: 1 trip, 2 flights, 3 passengers imported.");
});

test("importLegacyFromFile parses payload and returns summary", async () => {
  const file = {
    size: 10,
    async text() { return JSON.stringify({ items: [{ records: [{}], hotels: [] }] }); }
  };
  const calls = [];
  const summary = await importLegacyFromFile(file, "tok-1", async (token, payload) => {
    calls.push({ token, payload });
    return { importedTrips: 1, items: payload.items };
  });

  assert.equal(calls.length, 1);
  assert.equal(calls[0].token, "tok-1");
  assert.equal(summary.trips, 1);
  assert.equal(summary.flights, 1);
  assert.equal(summary.passengers, 0);
});

test("importLegacyFromFile rejects files over size limit", async () => {
  const hugeFile = { size: 5 * 1024 * 1024 + 1, async text() { return "[]"; } };
  await assert.rejects(
    () => importLegacyFromFile(hugeFile, "tok-1", async () => ({ importedTrips: 0, items: [] })),
    /Import file too large/
  );
});
