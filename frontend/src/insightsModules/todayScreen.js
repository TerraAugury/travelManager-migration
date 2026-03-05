const REFRESH_WINDOW_MS = 15 * 60 * 1000;
const refreshedAtByFlight = new Map();
const cachedStatusByFlight = new Map();

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

function throttleMinutesLeft(resetAt) {
  const diffMs = Math.max(0, Number(resetAt || 0) - Date.now());
  return Math.max(1, Math.ceil(diffMs / 60000));
}

function sinceMinutes(when) {
  const diffMs = Math.max(0, Date.now() - Number(when || 0));
  return Math.floor(diffMs / 60000);
}

function setStatus(card, text) {
  const statusEl = card?.querySelector(".today-flight-status");
  if (!statusEl) return;
  statusEl.textContent = String(text || "–");
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
    <div class="today-flight-passengers">${esc(passengerText)}</div>
    <button class="btn btn-xs today-refresh-btn" data-flight-number="${esc(flightNumber)}" data-flight-date="${esc(date || "")}">Refresh status</button>
  </div>`;
}

async function refreshCard({ button, card, token, api }) {
  const flightNumber = String(button.getAttribute("data-flight-number") || "").trim().toUpperCase();
  const date = String(button.getAttribute("data-flight-date") || "").trim();
  const refreshedAt = refreshedAtByFlight.get(flightNumber);
  const cachedStatus = cachedStatusByFlight.get(flightNumber);
  if (refreshedAt && cachedStatus && Date.now() - refreshedAt < REFRESH_WINDOW_MS) {
    const mins = sinceMinutes(refreshedAt);
    setStatus(card, `${cachedStatus} Last updated ${mins} min ago.`);
    return;
  }

  button.disabled = true;
  const prevLabel = button.textContent;
  button.textContent = "Refreshing…";
  try {
    const out = await api.lookupFlight(token, flightNumber, "aerodatabox", date, true);
    const status = normalizeStatus(out);
    refreshedAtByFlight.set(flightNumber, Date.now());
    cachedStatusByFlight.set(flightNumber, status);
    setStatus(card, status);
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
    button.addEventListener("click", () => {
      const card = button.closest(".today-flight-card");
      if (!card) return;
      void refreshCard({ button, card, token, api });
    });
  });
}
