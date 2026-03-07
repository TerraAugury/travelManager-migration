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

const REFRESH_WINDOW_MS = 15 * 60 * 1000;
const API_UNITS_PER_CALL = 2;
const API_UNITS_LIMIT = 600;
const refreshedAtByFlight = new Map();
const cachedLiveByFlight = new Map();
let latestQuota = null;
let activeRefreshCount = 0;

function toNum(value) {
  const parsed = Number.parseInt(String(value || ""), 10);
  return Number.isFinite(parsed) ? parsed : null;
}

function providerName() {
  const provider = getFlightProvider();
  if (provider === "flightera") return "Flightera";
  if (provider === "aviationstack") return "AviationStack";
  return "AeroDataBox";
}

function setTopSpinner(visible) {
  const spinner = document.getElementById("today-refresh-indicator");
  if (spinner) spinner.classList.toggle("hidden", !visible);
}

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

export async function renderTodayScreen({ els, token, api, esc }) {
  const emptyEl = els?.["today-empty"];
  const flightsEl = els?.["today-flights"];
  if (!emptyEl || !flightsEl || !token) return;
  const safeEsc = typeof esc === "function" ? esc : fallbackEsc;
  renderBalance(null);
  let payload;
  try {
    payload = await api.listFlightsToday(token);
  } catch {
    const date = new Date().toISOString().slice(0, 10);
    emptyEl.innerHTML = `${renderTodayHeader(date, 0, safeEsc)}<div class="today-empty-wrap"><div class="today-empty-icon">✈️</div><h3 class="today-empty-title">No flights today</h3><p class="today-empty-subtitle">Could not load today's flights.</p></div>`;
    emptyEl.classList.remove("hidden");
    flightsEl.classList.add("hidden");
    flightsEl.innerHTML = "";
    return;
  }
  const date = String(payload?.date || new Date().toISOString().slice(0, 10));
  const flights = Array.isArray(payload?.flights) ? payload.flights : [];
  if (!flights.length) {
    emptyEl.innerHTML = `${renderTodayHeader(date, 0, safeEsc)}<div class="today-empty-wrap"><div class="today-empty-icon">✈️</div><h3 class="today-empty-title">No flights today</h3><p class="today-empty-subtitle">No departures or arrivals are scheduled for today.</p></div>`;
    emptyEl.classList.remove("hidden");
    flightsEl.classList.add("hidden");
    flightsEl.innerHTML = "";
    return;
  }
  emptyEl.classList.add("hidden");
  flightsEl.classList.remove("hidden");
  flightsEl.innerHTML = `${renderTodayHeader(date, flights.length, safeEsc)}<div id="today-refresh-indicator" class="today-refresh-indicator hidden" aria-live="polite"><span class="today-refresh-spinner" aria-hidden="true"></span></div><div class="today-list">${flights.map((flight) => renderTodayCard(flight, date, safeEsc)).join("")}</div>`;
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
