import test from "node:test";
import assert from "node:assert/strict";
import { buildDailyCountryMap, buildMonthSummary } from "../src/insightsModules/daycountScreen.js";

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

function getMonth(summary, year, country, monthIndex) {
  return summary[year]?.[country]?.[monthIndex] ?? 0;
}

function getYearTotal(summary, year) {
  const byCountry = summary[year] || {};
  return Object.values(byCountry).reduce((sum, months) => sum + months.reduce((m, v) => m + v, 0), 0);
}

test("single flight: departure day excluded, arrival day included", () => {
  const trips = tripsFromRecords([
    flight({ date: "2025-01-10", from: "JFK", to: "CDG" })
  ]);
  const summary = buildMonthSummary(trips, "Alice");
  assert.equal(getMonth(summary, 2025, "United States", 0), 9);
  assert.equal(getMonth(summary, 2025, "France", 0), 22);
});

test("two flights same month split days across three countries", () => {
  const trips = tripsFromRecords([
    flight({ date: "2025-01-05", from: "JFK", to: "CDG" }),
    flight({ date: "2025-01-20", from: "CDG", to: "FRA" })
  ]);
  const summary = buildMonthSummary(trips, "Alice");
  assert.equal(getMonth(summary, 2025, "United States", 0), 4);
  assert.equal(getMonth(summary, 2025, "France", 0), 15);
  assert.equal(getMonth(summary, 2025, "Germany", 0), 12);
});

test("cross-month stay carries into following months", () => {
  const trips = tripsFromRecords([
    flight({ date: "2025-01-25", from: "JFK", to: "CDG" })
  ]);
  const summary = buildMonthSummary(trips, "Alice");
  assert.equal(getMonth(summary, 2025, "France", 0), 7);
  assert.equal(getMonth(summary, 2025, "France", 1), 28);
});

test("year boundary: passenger starts year in prior arrival country", () => {
  const trips = tripsFromRecords([
    flight({ date: "2024-12-15", from: "JFK", to: "CDG" }),
    flight({ date: "2025-03-10", from: "CDG", to: "FRA" })
  ]);
  const summary = buildMonthSummary(trips, "Alice");
  assert.equal(getMonth(summary, 2025, "France", 0), 31);
  assert.equal(getMonth(summary, 2025, "France", 1), 28);
  assert.equal(getMonth(summary, 2025, "France", 2), 9);
});

test("no flights in year: that year is absent", () => {
  const trips = tripsFromRecords([
    flight({ date: "2024-03-10", from: "JFK", to: "CDG" }),
    flight({ date: "2026-07-01", from: "CDG", to: "FRA" })
  ]);
  const summary = buildMonthSummary(trips, "Alice");
  assert.equal(Object.prototype.hasOwnProperty.call(summary, "2025"), false);
});

test("total days per year are 365 or 366", () => {
  const trips = tripsFromRecords([
    flight({ date: "2024-01-10", from: "JFK", to: "CDG" }),
    flight({ date: "2025-01-10", from: "CDG", to: "FRA" })
  ]);
  const summary = buildMonthSummary(trips, "Alice");
  assert.equal(getYearTotal(summary, 2024), 366);
  assert.equal(getYearTotal(summary, 2025), 365);
});

test("buildDailyCountryMap maps each day and switches country on departure day", () => {
  const trips = tripsFromRecords([
    flight({ date: "2025-01-10", from: "JFK", to: "CDG" })
  ]);
  const map = buildDailyCountryMap(trips, "Alice");
  assert.equal(map[2025]["2025-01-09"], "United States");
  assert.equal(map[2025]["2025-01-10"], "France");
  assert.equal(map[2025]["2025-12-31"], "France");
  assert.equal(Object.keys(map[2025]).length, 365);
});

test("buildDailyCountryMap carries prior-year arrival country into Jan 1", () => {
  const trips = tripsFromRecords([
    flight({ date: "2024-12-15", from: "JFK", to: "CDG" }),
    flight({ date: "2025-03-10", from: "CDG", to: "FRA" })
  ]);
  const map = buildDailyCountryMap(trips, "Alice");
  assert.equal(map[2025]["2025-01-01"], "France");
  assert.equal(map[2025]["2025-03-09"], "France");
  assert.equal(map[2025]["2025-03-10"], "Germany");
});
