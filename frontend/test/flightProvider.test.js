import test from "node:test";
import assert from "node:assert/strict";
import { getFlightProvider, loadFlightProvider, setFlightProvider } from "../src/state.js";

function makeMockLocalStorage() {
  const store = new Map();
  return {
    getItem(k) { return store.has(k) ? store.get(k) : null; },
    setItem(k, v) { store.set(k, v); },
    removeItem(k) { store.delete(k); },
    _store: store
  };
}

test("loadFlightProvider defaults to aviationstack when storage is empty", () => {
  const previousWindow = globalThis.window;
  const ls = makeMockLocalStorage();
  try {
    globalThis.window = { localStorage: ls };
    setFlightProvider("aviationstack"); // reset module state
    ls._store.clear();
    const result = loadFlightProvider();
    assert.equal(result, "aviationstack");
    assert.equal(getFlightProvider(), "aviationstack");
  } finally {
    globalThis.window = previousWindow;
  }
});

test("setFlightProvider persists aerodatabox to localStorage", () => {
  const previousWindow = globalThis.window;
  const ls = makeMockLocalStorage();
  try {
    globalThis.window = { localStorage: ls };
    setFlightProvider("aerodatabox");
    assert.equal(getFlightProvider(), "aerodatabox");
    assert.equal(ls._store.get("tm_flight_provider"), "aerodatabox");
  } finally {
    globalThis.window = previousWindow;
  }
});

test("setFlightProvider normalizes unknown values to aviationstack", () => {
  const previousWindow = globalThis.window;
  const ls = makeMockLocalStorage();
  try {
    globalThis.window = { localStorage: ls };
    setFlightProvider("unknown");
    assert.equal(getFlightProvider(), "aviationstack");
  } finally {
    globalThis.window = previousWindow;
  }
});

test("loadFlightProvider reads persisted aerodatabox from storage", () => {
  const previousWindow = globalThis.window;
  const ls = makeMockLocalStorage();
  try {
    globalThis.window = { localStorage: ls };
    ls._store.set("tm_flight_provider", "aerodatabox");
    const result = loadFlightProvider();
    assert.equal(result, "aerodatabox");
    assert.equal(getFlightProvider(), "aerodatabox");
  } finally {
    globalThis.window = previousWindow;
  }
});
