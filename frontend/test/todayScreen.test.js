import test from "node:test";
import assert from "node:assert/strict";
import { setFlightProvider } from "../src/state.js";
import { renderTodayScreen } from "../src/insightsModules/todayScreen.js";

function classListMock() {
  return {
    add() {},
    remove() {}
  };
}

function createCard() {
  const statusEl = { textContent: "", classList: { add() {}, remove() {} } };
  const metaEl = { innerHTML: "" };
  return {
    querySelector(selector) {
      if (selector === ".today-flight-status") return statusEl;
      if (selector === ".today-flight-live-meta") return metaEl;
      return null;
    }
  };
}

function createFlightsEl() {
  const flightsEl = {
    classList: classListMock(),
    _buttons: [],
    _innerHTML: "",
    set innerHTML(value) {
      this._innerHTML = value;
      const match = String(value).match(/data-flight-number=\"([^\"]+)\".*data-flight-date=\"([^\"]*)\"/);
      const attrs = { "data-flight-number": match?.[1] || "", "data-flight-date": match?.[2] || "" };
      const card = createCard();
      const listeners = {};
      this._buttons = [{
        disabled: false,
        textContent: "Refresh status",
        getAttribute(name) { return attrs[name] || ""; },
        addEventListener(type, fn) { listeners[type] = fn; },
        closest(selector) { return selector === ".today-flight-card" ? card : null; },
        click() { listeners.click?.(); }
      }];
    },
    get innerHTML() { return this._innerHTML; },
    querySelectorAll(selector) {
      return selector === ".today-refresh-btn" ? this._buttons : [];
    }
  };
  return flightsEl;
}

test("Today refresh uses provider from state", async () => {
  const previousDocument = globalThis.document;
  const balanceEl = { textContent: "" };
  globalThis.document = {
    getElementById(id) { return id === "today-balance" ? balanceEl : null; }
  };
  setFlightProvider("flightera");
  const emptyEl = { textContent: "", classList: classListMock() };
  const flightsEl = createFlightsEl();
  let calledWith = null;
  const api = {
    async listFlightsToday() {
      return {
        date: "2026-03-06",
        flights: [{
          id: "f1",
          flightNumber: "BA123",
          airline: "BA",
          departureCode: "LHR",
          arrivalCode: "JFK",
          departureScheduled: "2026-03-06T10:00:00+00:00",
          arrivalScheduled: "2026-03-06T14:00:00+00:00",
          passengerNames: ["Alice"]
        }]
      };
    },
    async lookupFlight(...args) {
      calledWith = args;
      return { status: "Scheduled" };
    }
  };
  try {
    await renderTodayScreen({
      els: { "today-empty": emptyEl, "today-flights": flightsEl },
      token: "token-1",
      api,
      esc: (v) => String(v)
    });
    flightsEl.querySelectorAll(".today-refresh-btn")[0].click();
    await new Promise((resolve) => setTimeout(resolve, 0));
    assert.equal(calledWith[2], "flightera");
  } finally {
    globalThis.document = previousDocument;
  }
});
