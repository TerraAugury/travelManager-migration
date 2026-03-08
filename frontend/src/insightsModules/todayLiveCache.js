const PREFIX = "tm.today.live.v1";
const MAX_ENTRIES = 64;

function getLocalStorage() {
  try {
    if (typeof window === "undefined") return null;
    return window.localStorage || null;
  } catch {
    return null;
  }
}

function keyForUser(userId) {
  const userKey = String(userId || "anon").trim() || "anon";
  return `${PREFIX}:${userKey}`;
}

function normalizeEntries(entries) {
  if (!Array.isArray(entries)) return [];
  return entries.filter((pair) => Array.isArray(pair) && pair.length === 2 && String(pair[0] || "").trim());
}

export function loadTodayLiveCache(userId) {
  try {
    const raw = getLocalStorage()?.getItem(keyForUser(userId));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return {
      refreshedAtEntries: normalizeEntries(parsed?.refreshedAtEntries)
        .map(([k, v]) => [String(k || "").toUpperCase(), Number(v || 0)])
        .filter(([, v]) => Number.isFinite(v) && v > 0),
      cachedLiveEntries: normalizeEntries(parsed?.cachedLiveEntries)
        .map(([k, v]) => [String(k || "").toUpperCase(), v])
        .filter(([, v]) => v && typeof v === "object"),
      latestQuota: parsed?.latestQuota && typeof parsed.latestQuota === "object" ? parsed.latestQuota : null
    };
  } catch {
    return null;
  }
}

export function saveTodayLiveCache(userId, snapshot) {
  try {
    const payload = {
      refreshedAtEntries: normalizeEntries(snapshot?.refreshedAtEntries).slice(-MAX_ENTRIES),
      cachedLiveEntries: normalizeEntries(snapshot?.cachedLiveEntries).slice(-MAX_ENTRIES),
      latestQuota: snapshot?.latestQuota && typeof snapshot.latestQuota === "object" ? snapshot.latestQuota : null
    };
    getLocalStorage()?.setItem(keyForUser(userId), JSON.stringify(payload));
  } catch {
    // Best-effort cache only.
  }
}
