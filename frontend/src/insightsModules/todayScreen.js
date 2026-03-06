const REFRESH_WINDOW_MS = 15 * 60 * 1000;
const refreshedAtByFlight = new Map(); const cachedLiveByFlight = new Map();
const STATUS_CLASSES = ["on-time", "delayed", "cancelled", "landed"]; let latestQuota = null; const API_UNITS_PER_CALL = 2; const API_UNITS_LIMIT = 600;
function fallbackEsc(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
function hhmm(value) {
  const date = new Date(value || "");
  if (Number.isNaN(date.getTime())) return "--:--";
  return date.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", hour12: false });
}
function liveTime(value) {
  if (!value) return "";
  const text = String(value).trim();
  if (!text) return "";
  const date = new Date(text);
  if (Number.isNaN(date.getTime())) return text;
  return date.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", hour12: false });
}
export function normalizeStatus(lookup) {
  const text = String(lookup?.status || "").trim();
  if (!text) return "Status unavailable";
  const lower = text.toLowerCase();
  if (lower.includes("cancel")) return "Cancelled";
  if (lower.includes("land")) return "Landed";
  if (lower.includes("depart") || lower.includes("enroute") || lower.includes("en route")) return "Departed";
  if (lower.includes("on time") || lower === "scheduled") return "On time";
  if (lower.includes("delay")) {
    const delayRaw = String(text.match(/(\d+)\s*(m|min|minute)/i)?.[1] || "").trim();
    const delay = Number(delayRaw || lookup?.delay_minutes || lookup?.delayMinutes || 0);
    return Number.isFinite(delay) && delay > 0 ? `Delayed (${delay}m)` : "Delayed";
  }
  return text;
}
function throttleMinutesLeft(resetAt) { return Math.max(1, Math.ceil(Math.max(0, Number(resetAt || 0) - Date.now()) / 60000)); }
function toNum(value) { const parsed = Number.parseInt(String(value || ""), 10); return Number.isFinite(parsed) ? parsed : null; }
function sinceMinutes(when) {
  const diffMs = Math.max(0, Date.now() - Number(when || 0));
  return Math.floor(diffMs / 60000);
}
function statusClass(text) {
  const lower = String(text || "").toLowerCase();
  if (lower.startsWith("on time")) return "on-time";
  if (lower.startsWith("delayed")) return "delayed";
  if (lower.startsWith("cancel")) return "cancelled";
  if (lower.startsWith("land")) return "landed";
  return "";
}
function scheduleClass(actual, scheduled) {
  const actualMs = new Date(actual || "").getTime();
  const scheduledMs = new Date(scheduled || "").getTime();
  if (!Number.isFinite(actualMs) || !Number.isFinite(scheduledMs)) return "";
  return actualMs > scheduledMs ? "late" : "ontrack";
}
function liveDetails(lookup) {
  if (!lookup || typeof lookup !== "object") return "";
  const fields = [
    { label: "Scheduled", value: liveTime(lookup.scheduledTime), cls: "" },
    { label: "Revised", value: liveTime(lookup.revisedTime), cls: scheduleClass(lookup.revisedTime, lookup.scheduledTime) },
    { label: "Predicted", value: liveTime(lookup.predictedTime), cls: scheduleClass(lookup.predictedTime, lookup.scheduledTime) },
    { label: "Runway", value: liveTime(lookup.runwayTime), cls: scheduleClass(lookup.runwayTime, lookup.scheduledTime) },
    { label: "Terminal", value: String(lookup.terminal || "").trim(), cls: "" },
    { label: "Check-in desk", value: String(lookup.checkInDesk || "").trim(), cls: "" },
    { label: "Gate", value: String(lookup.gate || "").trim(), cls: "" },
    { label: "Baggage belt", value: String(lookup.baggageBelt || "").trim(), cls: "" }
  ];
  return fields
    .filter((field) => field.value)
    .map((field) => `<span class="today-live-item${field.cls ? ` ${field.cls}` : ""}">${fallbackEsc(field.label)}: ${fallbackEsc(field.value)}</span>`)
    .join(" | ");
}
function setStatus(card, text, lookup = null, suffix = "") {
  const statusEl = card?.querySelector(".today-flight-status");
  if (!statusEl) return;
  const safeText = String(text || "–");
  statusEl.textContent = safeText;
  statusEl.classList.remove(...STATUS_CLASSES);
  const cls = statusClass(safeText);
  if (cls) statusEl.classList.add(cls);
  const detailsEl = card.querySelector(".today-flight-live-meta");
  if (!detailsEl) return;
  detailsEl.innerHTML = [liveDetails(lookup), fallbackEsc(suffix)].filter(Boolean).join(" | ");
}
function renderCard(flight, date, esc) {
  const flightNumber = String(flight?.flightNumber || "").trim();
  const airline = String(flight?.airline || "").trim();
  const depCode = String(flight?.departureCode || "").trim() || "?";
  const arrCode = String(flight?.arrivalCode || "").trim() || "?";
  const depName = String(flight?.departureAirportName || "").trim() || "Unknown airport";
  const arrName = String(flight?.arrivalAirportName || "").trim() || "Unknown airport";
  const passengers = Array.isArray(flight?.passengerNames) ? flight.passengerNames : [];
  const passengerText = passengers.length ? passengers.join(", ") : "No passengers";
  const heading = airline ? `${flightNumber} (${airline})` : (flightNumber || "Unknown flight");
  return `<div class="today-flight-card" data-flight-id="${esc(flight?.id || "")}">
    <div class="today-flight-card-header"><strong>${esc(heading)}</strong> ${esc(depCode)} → ${esc(arrCode)}</div>
    <div class="today-flight-times">${esc(hhmm(flight?.departureScheduled))} - ${esc(hhmm(flight?.arrivalScheduled))}</div>
    <div class="today-flight-airports">${esc(depName)} → ${esc(arrName)}</div>
    <div class="today-flight-status">–</div>
    <div class="today-flight-live-meta"></div>
    <div class="today-flight-passengers">${esc(passengerText)}</div>
    <button class="btn btn-xs today-refresh-btn" data-flight-number="${esc(flightNumber)}" data-flight-date="${esc(date || "")}">Refresh status</button>
  </div>`;
}
function renderBalance(balance) {
  const el = document.getElementById("today-balance");
  if (!el) return;
  if (balance) {
    const remaining = toNum(balance.rateLimitRequestsRemaining);
    const limit = toNum(balance.rateLimitRequestsLimit);
    if (remaining !== null && limit !== null) {
      const used = Math.max(0, limit - remaining);
      latestQuota = { remaining, limit, unitsRemaining: Math.max(0, API_UNITS_LIMIT - (used * API_UNITS_PER_CALL)) };
    }
  }
  if (latestQuota) {
    el.textContent = `AeroDataBox quota remaining: ${latestQuota.remaining}/${latestQuota.limit} requests | ${latestQuota.unitsRemaining}/${API_UNITS_LIMIT} API units`;
    return;
  }
  el.textContent = "AeroDataBox quota: refresh a flight status to load remaining requests.";
}
async function refreshCard({ button, card, token, api }) {
  const flightNumber = String(button.getAttribute("data-flight-number") || "").trim().toUpperCase();
  const date = String(button.getAttribute("data-flight-date") || "").trim();
  const refreshedAt = refreshedAtByFlight.get(flightNumber);
  const cached = cachedLiveByFlight.get(flightNumber);
  if (refreshedAt && cached && Date.now() - refreshedAt < REFRESH_WINDOW_MS) {
    setStatus(card, cached.status, cached.lookup, `Last updated ${sinceMinutes(refreshedAt)} min ago.`);
    return;
  }
  button.disabled = true;
  const prevLabel = button.textContent;
  button.textContent = "Refreshing…";
  try {
    const out = await api.lookupFlight(token, flightNumber, "aerodatabox", date, true);
    const status = normalizeStatus(out);
    refreshedAtByFlight.set(flightNumber, Date.now());
    cachedLiveByFlight.set(flightNumber, { status, lookup: out });
    setStatus(card, status, out);
    renderBalance(out);
  } catch (error) {
    if (Number(error?.status) === 429) {
      const minutes = throttleMinutesLeft(error?.resetAt || error?.body?.resetAt);
      setStatus(card, `Status was recently refreshed. Try again in ${minutes} minutes.`);
    } else {
      setStatus(card, "Could not fetch live status.");
    }
  } finally {
    button.disabled = false;
    button.textContent = prevLabel || "Refresh status";
  }
}
export async function renderTodayScreen({ els, token, api, esc }) {
  const emptyEl = els?.["today-empty"];
  const flightsEl = els?.["today-flights"];
  if (!emptyEl || !flightsEl || !token) return;
  const safeEsc = typeof esc === "function" ? esc : fallbackEsc;
  renderBalance(null);
  let payload = null;
  try {
    payload = await api.listFlightsToday(token);
  } catch {
    emptyEl.textContent = "Could not load today's flights.";
    emptyEl.classList.remove("hidden");
    flightsEl.classList.add("hidden");
    flightsEl.innerHTML = "";
    return;
  }
  const date = String(payload?.date || new Date().toISOString().slice(0, 10));
  const flights = Array.isArray(payload?.flights) ? payload.flights : [];
  if (!flights.length) {
    emptyEl.textContent = "No flights scheduled for today.";
    emptyEl.classList.remove("hidden");
    flightsEl.classList.add("hidden");
    flightsEl.innerHTML = "";
    return;
  }
  emptyEl.classList.add("hidden");
  flightsEl.classList.remove("hidden");
  flightsEl.innerHTML = flights.map((flight) => renderCard(flight, date, safeEsc)).join("");
  flightsEl.querySelectorAll(".today-refresh-btn").forEach((button) => {
    const flightNumber = String(button.getAttribute("data-flight-number") || "").trim().toUpperCase();
    const refreshedAt = refreshedAtByFlight.get(flightNumber);
    const cached = cachedLiveByFlight.get(flightNumber);
    if (cached?.lookup) renderBalance(cached.lookup);
    if (cached) setStatus(button.closest(".today-flight-card"), cached.status, cached.lookup, refreshedAt ? `Last updated ${sinceMinutes(refreshedAt)} min ago.` : "");
    button.addEventListener("click", () => {
      const card = button.closest(".today-flight-card");
      if (!card) return;
      void refreshCard({ button, card, token, api });
    });
  });
}
