const DB_NAME = "tm-offline";
const DB_VERSION = 1;
const STORE_NAME = "cache";

let dbPromise = null;

function requestToPromise(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error("IndexedDB request failed."));
  });
}

function transactionDone(tx) {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onabort = () => reject(tx.error || new Error("IndexedDB transaction aborted."));
    tx.onerror = () => reject(tx.error || new Error("IndexedDB transaction failed."));
  });
}

function resetDbPromiseOnClose(db) {
  db.onclose = () => { dbPromise = null; };
  db.onversionchange = () => {
    db.close();
    dbPromise = null;
  };
}

export function openOfflineDb() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB unavailable."));
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) db.createObjectStore(STORE_NAME);
    };
    request.onsuccess = () => {
      const db = request.result;
      resetDbPromiseOnClose(db);
      resolve(db);
    };
    request.onerror = () => {
      dbPromise = null;
      reject(request.error || new Error("Failed to open offline cache DB."));
    };
    request.onblocked = () => {
      dbPromise = null;
      reject(new Error("Offline cache DB open blocked."));
    };
  });
  return dbPromise;
}

export async function setOfflineData(key, data) {
  try {
    const db = await openOfflineDb();
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).put(data, String(key));
    await transactionDone(tx);
  } catch {
    // Best-effort cache only.
  }
}

export async function getOfflineData(key) {
  try {
    const db = await openOfflineDb();
    const tx = db.transaction(STORE_NAME, "readonly");
    const value = await requestToPromise(tx.objectStore(STORE_NAME).get(String(key)));
    await transactionDone(tx);
    return value ?? null;
  } catch {
    return null;
  }
}

export async function clearOfflineData() {
  try {
    const db = await openOfflineDb();
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).clear();
    await transactionDone(tx);
  } catch {
    // Best-effort cache only.
  }
}
