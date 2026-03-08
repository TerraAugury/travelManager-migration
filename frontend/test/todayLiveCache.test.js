import test from "node:test";
import assert from "node:assert/strict";
import { loadTodayLiveCache, saveTodayLiveCache } from "../src/insightsModules/todayLiveCache.js";

function withLocalStorage(fn) {
  const previousWindow = globalThis.window;
  const store = new Map();
  globalThis.window = {
    localStorage: {
      getItem(key) { return store.has(key) ? store.get(key) : null; },
      setItem(key, value) { store.set(key, String(value)); }
    }
  };
  try {
    fn(store);
  } finally {
    globalThis.window = previousWindow;
  }
}

test("today live cache persists and loads entries", () => {
  withLocalStorage(() => {
    saveTodayLiveCache("user-1", {
      refreshedAtEntries: [["BA123", 1760000000000]],
      cachedLiveEntries: [["BA123", { status: "On time", lookup: { status: "Scheduled" } }]],
      latestQuota: { remaining: 10, limit: 600, unitsRemaining: 580 }
    });
    const out = loadTodayLiveCache("user-1");
    assert.equal(out.refreshedAtEntries.length, 1);
    assert.equal(out.cachedLiveEntries.length, 1);
    assert.equal(out.cachedLiveEntries[0][1].status, "On time");
    assert.equal(out.latestQuota.remaining, 10);
  });
});

test("today live cache is scoped by user id", () => {
  withLocalStorage(() => {
    saveTodayLiveCache("user-a", { refreshedAtEntries: [["BA123", 1]], cachedLiveEntries: [["BA123", { status: "On time" }]], latestQuota: null });
    saveTodayLiveCache("user-b", { refreshedAtEntries: [["LH400", 2]], cachedLiveEntries: [["LH400", { status: "Delayed" }]], latestQuota: null });
    const a = loadTodayLiveCache("user-a");
    const b = loadTodayLiveCache("user-b");
    assert.equal(a.cachedLiveEntries[0][0], "BA123");
    assert.equal(b.cachedLiveEntries[0][0], "LH400");
  });
});
