import test, { after } from "node:test";
import assert from "node:assert/strict";

function createIndexedDbMock() {
  const store = new Map();
  const storeNames = new Set();
  function finishTx(tx) { setTimeout(() => tx.oncomplete?.(), 0); }
  const db = {
    objectStoreNames: { contains(name) { return storeNames.has(name); } },
    createObjectStore(name) { storeNames.add(name); return {}; },
    transaction() {
      const tx = { oncomplete: null, onabort: null, onerror: null, error: null };
      tx.objectStore = () => ({
        put(value, key) {
          store.set(String(key), value);
          finishTx(tx);
        },
        get(key) {
          const req = { result: undefined, error: null, onsuccess: null, onerror: null };
          queueMicrotask(() => {
            req.result = store.has(String(key)) ? store.get(String(key)) : undefined;
            req.onsuccess?.();
            finishTx(tx);
          });
          return req;
        },
        clear() {
          store.clear();
          finishTx(tx);
        }
      });
      return tx;
    },
    close() {}
  };
  return {
    indexedDB: {
      open() {
        const req = { result: null, error: null, onupgradeneeded: null, onsuccess: null, onerror: null, onblocked: null };
        queueMicrotask(() => {
          req.result = db;
          if (!storeNames.has("cache")) req.onupgradeneeded?.();
          req.onsuccess?.();
        });
        return req;
      }
    }
  };
}

const originalIndexedDb = globalThis.indexedDB;
globalThis.indexedDB = createIndexedDbMock().indexedDB;
after(() => { globalThis.indexedDB = originalIndexedDb; });

const { clearOfflineData, getOfflineData, setOfflineData } = await import("../src/offlineCache.js");

test("setOfflineData then getOfflineData returns same value", async () => {
  await clearOfflineData();
  const trips = [{ id: "t1", name: "Trip 1" }];
  await setOfflineData("trips", trips);
  assert.deepEqual(await getOfflineData("trips"), trips);
});

test("getOfflineData returns null for missing key", async () => {
  await clearOfflineData();
  assert.equal(await getOfflineData("missing"), null);
});

test("clearOfflineData empties cache store", async () => {
  await setOfflineData("trips", [{ id: "t2" }]);
  await clearOfflineData();
  assert.equal(await getOfflineData("trips"), null);
});
