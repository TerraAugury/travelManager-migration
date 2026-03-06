import test from "node:test";
import assert from "node:assert/strict";
import { buildDailyCountryMap } from "../src/insightsModules/daycountScreen.js";
import { countryFlag } from "../src/insightsModules/countryFlags.js";
import { renderCalendarView } from "../src/insightsModules/daycountCalendar.js";

function flight({ date, from, to, pax = "Alice" }) {
  return {
    paxNames: [pax],
    route: {
      departure: { scheduled: `${date}T10:00:00Z`, iata: from },
      arrival: { iata: to }
    }
  };
}

function tripsFromRecords(records) {
  return [{ records, hotels: [] }];
}

function esc(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

test("buildDailyCountryMap assigns expected countries for two flights", () => {
  const trips = tripsFromRecords([
    flight({ date: "2025-01-05", from: "CDG", to: "JFK" }),
    flight({ date: "2025-01-10", from: "JFK", to: "CDG" })
  ]);
  const map = buildDailyCountryMap(trips, "Alice")[2025] || {};
  assert.equal(map["2025-01-01"], "France");
  assert.equal(map["2025-01-04"], "France");
  assert.equal(map["2025-01-05"], "United States");
  assert.equal(map["2025-01-09"], "United States");
  assert.equal(map["2025-01-10"], "France");
  assert.equal(map["2025-12-31"], "France");
});

test("countryFlag maps known country and falls back to white flag", () => {
  assert.equal(countryFlag("France"), "🇫🇷");
  assert.equal(countryFlag("Unknown"), "🏳");
});

test("renderCalendarView includes country flag for mapped day", () => {
  const html = renderCalendarView(2025, { "2025-01-05": "France" }, esc);
  assert.match(html, /🇫🇷/);
});
