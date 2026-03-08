import { getFlightProvider } from "../state.js";
import {
  applyCardStatus,
  fallbackEsc,
  normalizeStatus,
  renderTodayCard,
  renderTodayHeader,
  sinceMinutes,
  throttleMinutesLeft
} from "./todayFlightCard.js";
import { loadTodayLiveCache, saveTodayLiveCache } from "./todayLiveCache.js";

const REFRESH_WINDOW_MS = 15 * 60 * 1000;
const API_UNITS_PER_CALL = 2;
const API_UNITS_LIMIT = 600;
const refreshedAtByFlight = new Map();
const cachedLiveByFlight = new Map();
let latestQuota = null;
let activeRefreshCount = 0;
let cacheUser = "anon";

function toNum(value) { const parsed = Number.parseInt(String(value || ""), 10); return Number.isFinite(parsed) ? parsed : null; }

function providerName() { const provider = getFlightProvider(); if (provider === "flightera") return "Flightera"; if (provider === "aviationstack") return "AviationStack"; return "AeroDataBox"; }

function setTopSpinner(visible) { const spinner = document.getElementById("today-refresh-indicator"); if (spinner) spinner.classList.toggle("hidden", !visible); }
function utcDay(value) { const date = new Date(String(value || "")); if (!Number.isNaN(date.getTime())) return date.toISOString().slice(0, 10); return /^(\d{4}-\d{2}-\d{2})/.exec(String(value || ""))?.[1] || ""; }
function twoDayWindow(baseDate) { const base = new Date(`${String(baseDate || new Date().toISOString().slice(0, 10))}T00:00:00Z`); const tomorrow = new Date(base.getTime() + 86400000); return [base.toISOString().slice(0, 10), tomorrow.toISOString().slice(0, 10)]; }
function inWindow(flight, dayA, dayB) { const dep = utcDay(flight?.departureScheduled); const arr = utcDay(flight?.arrivalScheduled); return dep === dayA || dep === dayB || arr === dayA || arr === dayB; }
function lookupDay(flight, dayA, dayB) { const dep = utcDay(flight?.departureScheduled); const arr = utcDay(flight?.arrivalScheduled); if (dep === dayA || dep === dayB) return dep; if (arr === dayA || arr === dayB) return arr; return dayA; }
function mapRecord(trip, record) {
  const dep = record?.route?.departure || {};
  const arr = record?.route?.arrival || {};
  return {
    id: String(record?.id || ""),
    tripId: String(trip?.id || ""),
    tripName: String(trip?.name || ""),
    flightNumber: String(record?.route?.flightNumber || ""),
    airline: String(record?.route?.airline || ""),
    departureCode: String(dep?.iata || "").toUpperCase(),
    departureAirportName: String(dep?.airport || ""),
    arrivalCode: String(arr?.iata || "").toUpperCase(),
    arrivalAirportName: String(arr?.airport || ""),
    departureScheduled: dep?.scheduled || null,
    arrivalScheduled: arr?.scheduled || null,
    passengerNames: Array.isArray(record?.paxNames) ? record.paxNames : []
  };
}
function legacyWindowFlights(trips, dayA, dayB) {
  const out = [];
  for (const trip of Array.isArray(trips) ? trips : []) {
    for (const record of Array.isArray(trip?.records) ? trip.records : []) {
      const flight = mapRecord(trip, record);
      if (inWindow(flight, dayA, dayB)) out.push(flight);
    }
  }
  return out;
}
function mergeFlights(primary, secondary) {
  const mergedByKey = new Map();
  for (const flight of [...(Array.isArray(primary) ? primary : []), ...(Array.isArray(secondary) ? secondary : [])]) {
    const key = `${String(flight?.flightNumber || "").toUpperCase()}|${flight?.departureScheduled || ""}|${flight?.arrivalScheduled || ""}|${flight?.departureCode || ""}|${flight?.arrivalCode || ""}`;
    const names = Array.isArray(flight?.passengerNames) ? flight.passengerNames.map((name) => String(name || "").trim()).filter(Boolean) : [];
    if (!mergedByKey.has(key)) {
      mergedByKey.set(key, { ...flight, passengerNames: [...new Set(names)] });
      continue;
    }
    const existing = mergedByKey.get(key);
    existing.passengerNames = [...new Set([...(Array.isArray(existing?.passengerNames) ? existing.passengerNames : []), ...names])];
  }
  return [...mergedByKey.values()].sort((a, b) => String(a?.departureScheduled || "").localeCompare(String(b?.departureScheduled || "")));
}
function setCacheUser(userId) {
  const next = String(userId || "anon").trim() || "anon";
  if (next === cacheUser) return;
  cacheUser = next;
  refreshedAtByFlight.clear();
  cachedLiveByFlight.clear();
  latestQuota = null;
  const stored = loadTodayLiveCache(cacheUser);
  if (!stored) return;
  for (const [key, when] of stored.refreshedAtEntries || []) refreshedAtByFlight.set(key, when);
  for (const [key, cached] of stored.cachedLiveEntries || []) cachedLiveByFlight.set(key, cached);
  latestQuota = stored.latestQuota || null;
}
function persistLiveCache() { saveTodayLiveCache(cacheUser, { refreshedAtEntries: [...refreshedAtByFlight.entries()], cachedLiveEntries: [...cachedLiveByFlight.entries()], latestQuota }); }

function renderBalance(balance) {
  const el = document.getElementById("today-balance");
  if (!el) return;
  if (balance) {
    const remaining = toNum(balance.rateLimitRequestsRemaining);
    const limit = toNum(balance.rateLimitRequestsLimit);
    if (remaining !== null && limit !== null) {
      const used = Math.max(0, limit - remaining);
      latestQuota = {
        remaining,
        limit,
        unitsRemaining: Math.max(0, API_UNITS_LIMIT - (used * API_UNITS_PER_CALL))
      };
    }
  }
  el.textContent = latestQuota
    ? `${providerName()} quota remaining: ${latestQuota.remaining}/${latestQuota.limit} requests | ${latestQuota.unitsRemaining}/${API_UNITS_LIMIT} API units`
    : `${providerName()} quota: refresh a flight status to load remaining requests.`;
}

async function refreshCard({ button, card, token, api }) {
  const flightNumber = String(button.getAttribute("data-flight-number") || "").trim().toUpperCase();
  const date = String(button.getAttribute("data-flight-date") || "").trim();
  const refreshedAt = refreshedAtByFlight.get(flightNumber);
  const cached = cachedLiveByFlight.get(flightNumber);
  if (refreshedAt && cached && Date.now() - refreshedAt < REFRESH_WINDOW_MS) {
    applyCardStatus(card, cached.status, cached.lookup, `Last updated ${sinceMinutes(refreshedAt)} min ago.`);
    return;
  }
  button.disabled = true;
  const prev = button.textContent;
  button.textContent = "Refreshing…";
  activeRefreshCount += 1;
  setTopSpinner(activeRefreshCount > 0);
  try {
    const out = await api.lookupFlight(token, flightNumber, getFlightProvider(), date, true);
    const status = normalizeStatus(out);
    refreshedAtByFlight.set(flightNumber, Date.now());
    cachedLiveByFlight.set(flightNumber, { status, lookup: out });
    applyCardStatus(card, status, out);
    renderBalance(out);
    persistLiveCache();
  } catch (error) {
    if (Number(error?.status) === 429) {
      const resetAt = error?.resetAt || error?.body?.resetAt;
      applyCardStatus(card, `Status was recently refreshed. Try again in ${throttleMinutesLeft(resetAt)} minutes.`);
    } else {
      applyCardStatus(card, "Could not fetch live status.");
    }
  } finally {
    button.disabled = false;
    button.textContent = prev || "Refresh status";
    activeRefreshCount = Math.max(0, activeRefreshCount - 1);
    setTopSpinner(activeRefreshCount > 0);
  }
}

export { normalizeStatus };

export async function renderTodayScreen({ els, token, api, esc, trips, userId }) {
  const emptyEl = els?.["today-empty"];
  const flightsEl = els?.["today-flights"];
  if (!emptyEl || !flightsEl || !token) return;
  const safeEsc = typeof esc === "function" ? esc : fallbackEsc;
  setCacheUser(userId);
  renderBalance(null);
  const today = new Date().toISOString().slice(0, 10);
  let dayA;
  let dayB;
  let flights;
  let failed = false;
  try {
    const payload = await api.listFlightsToday(token);
    [dayA, dayB] = twoDayWindow(payload?.date || today);
    const apiFlights = Array.isArray(payload?.flights) ? payload.flights.filter((f) => inWindow(f, dayA, dayB)) : [];
    flights = mergeFlights(apiFlights, legacyWindowFlights(trips, dayA, dayB));
  } catch {
    [dayA, dayB] = twoDayWindow(today);
    flights = mergeFlights([], legacyWindowFlights(trips, dayA, dayB));
    failed = true;
  }
  if (!flights.length) {
    const msg = failed
      ? "Could not load flights for today and tomorrow."
      : "No departures or arrivals are scheduled for today or tomorrow.";
    emptyEl.innerHTML = `${renderTodayHeader(dayA, 0, safeEsc)}<div class="today-empty-wrap"><div class="today-empty-icon">✈️</div><h3 class="today-empty-title">No flights for today and tomorrow</h3><p class="today-empty-subtitle">${msg}</p></div>`;
    emptyEl.classList.remove("hidden");
    flightsEl.classList.add("hidden");
    flightsEl.innerHTML = "";
    return;
  }
  emptyEl.classList.add("hidden");
  flightsEl.classList.remove("hidden");
  flightsEl.innerHTML = `${renderTodayHeader(dayA, flights.length, safeEsc)}<div id="today-refresh-indicator" class="today-refresh-indicator hidden" aria-live="polite"><span class="today-refresh-spinner" aria-hidden="true"></span></div><div class="today-list">${flights.map((flight) => renderTodayCard(flight, lookupDay(flight, dayA, dayB), safeEsc)).join("")}</div>`;
  flightsEl.querySelectorAll(".today-refresh-btn").forEach((button) => {
    const flightNumber = String(button.getAttribute("data-flight-number") || "").trim().toUpperCase();
    const refreshedAt = refreshedAtByFlight.get(flightNumber);
    const cached = cachedLiveByFlight.get(flightNumber);
    if (cached?.lookup) renderBalance(cached.lookup);
    if (cached) {
      const suffix = refreshedAt ? `Last updated ${sinceMinutes(refreshedAt)} min ago.` : "";
      applyCardStatus(button.closest(".today-flight-card"), cached.status, cached.lookup, suffix);
    }
    button.addEventListener("click", () => {
      const card = button.closest(".today-flight-card");
      if (card) void refreshCard({ button, card, token, api });
    });
  });
}
