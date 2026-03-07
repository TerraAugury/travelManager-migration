const STATUS_CLASSES = ["on-time", "delayed", "cancelled", "landed"];
const PLANE_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M17.8 19.2 16 11l4-4a1 1 0 0 0-1.4-1.4l-4 4-8.2-1.8a1 1 0 0 0-.9 1.7L9 12l-3.5 2.5a1 1 0 0 0 .9 1.7l8.2-1.8 2.4 2.4a1 1 0 0 0 1.7-.9Z"/></svg>';

export function fallbackEsc(value) {
  return String(value ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\"/g, "&quot;");
}

export function hhmm(value) { return /T(\d{2}:\d{2})/.exec(String(value || ""))?.[1] || "--:--"; }
export function sinceMinutes(when) { return Math.floor(Math.max(0, Date.now() - Number(when || 0)) / 60000); }
export function throttleMinutesLeft(resetAt) { return Math.max(1, Math.ceil(Math.max(0, Number(resetAt || 0) - Date.now()) / 60000)); }

function liveTime(value) {
  const text = String(value || "").trim();
  if (!text) return "";
  const hhmmValue = /T(\d{2}:\d{2})/.exec(text)?.[1];
  if (hhmmValue) return hhmmValue;
  const date = new Date(text);
  return Number.isNaN(date.getTime()) ? text : date.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", hour12: false });
}

export function normalizeStatus(lookup) {
  const text = String(lookup?.status || "").trim();
  if (!text) return "Status unavailable";
  const lower = text.toLowerCase();
  if (lower.includes("cancel")) return "Cancelled";
  if (lower.includes("land")) return "Landed";
  if (lower.includes("depart") || lower.includes("enroute") || lower.includes("en route")) return "Departed";
  if (lower.includes("on time") || lower === "scheduled") return "On time";
  if (!lower.includes("delay")) return text;
  const raw = String(text.match(/(\d+)\s*(m|min|minute)/i)?.[1] || "").trim();
  const delay = Number(raw || lookup?.delay_minutes || lookup?.delayMinutes || 0);
  return Number.isFinite(delay) && delay > 0 ? `Delayed (${delay}m)` : "Delayed";
}

function statusClass(text) {
  const lower = String(text || "").toLowerCase();
  if (lower.startsWith("on time") || lower.startsWith("depart")) return "on-time";
  if (lower.startsWith("delayed")) return "delayed";
  if (lower.startsWith("cancel")) return "cancelled";
  if (lower.startsWith("land")) return "landed";
  return "";
}

function badgeClass(text) {
  const lower = String(text || "").toLowerCase();
  if (lower.startsWith("delayed") || lower.startsWith("cancel")) return "status-delayed";
  if (lower.startsWith("land")) return "status-past";
  if (lower.startsWith("on time") || lower.startsWith("depart")) return "status-confirmed";
  return "status-past";
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
  return fields.filter((f) => f.value).map((f) => `<span class="today-live-item${f.cls ? ` ${f.cls}` : ""}">${fallbackEsc(f.label)}: ${fallbackEsc(f.value)}</span>`).join(" | ");
}

function utcDay(value) {
  const date = new Date(String(value || ""));
  if (!Number.isNaN(date.getTime())) return date.toISOString().slice(0, 10);
  return /^(\d{4}-\d{2}-\d{2})/.exec(String(value || ""))?.[1] || "";
}

function flightTypeLabel(flight, date) {
  const depDay = utcDay(flight?.departureScheduled);
  const arrDay = utcDay(flight?.arrivalScheduled);
  if (depDay === date && arrDay !== date) return "DEPARTURE";
  if (arrDay === date && depDay !== date) return "ARRIVAL";
  return "DEPARTURE";
}

function todayTitle(isoDate) {
  void isoDate;
  return "Next flight";
}

export function renderTodayHeader(date, count, esc) {
  return `<header class="today-page-head"><h2 class="today-page-title">${esc(todayTitle(date))}</h2><p class="today-page-subtitle">${esc(`${count} flight${count === 1 ? "" : "s"} (today + tomorrow)`)}</p></header>`;
}

export function renderTodayCard(flight, date, esc) {
  const flightNumber = String(flight?.flightNumber || "").trim();
  const airline = String(flight?.airline || "").trim();
  const depCode = String(flight?.departureCode || "").trim() || "?";
  const arrCode = String(flight?.arrivalCode || "").trim() || "?";
  const passengers = Array.isArray(flight?.passengerNames) ? flight.passengerNames : [];
  const heading = airline ? `${flightNumber} (${airline})` : flightNumber || "Unknown flight";
  return `<article class="trip-event-card flight-card today-flight-card" data-flight-id="${esc(flight?.id || "")}"><span class="today-flight-status flight-status-badge status-past">Status unavailable</span><div class="flight-type-row"><span class="flight-type-label">${esc(flightTypeLabel(flight, date))}</span><span class="flight-type-meta">${esc(heading)}</span></div><div class="flight-action-row today-flight-actions"><button class="btn btn-ghost btn-xs today-refresh-btn" data-flight-number="${esc(flightNumber)}" data-flight-date="${esc(date || "")}">Refresh status</button></div><div class="flight-route-row"><div class="flight-airport-code">${esc(depCode)}</div><span class="flight-plane-icon">${PLANE_ICON}</span><div class="flight-airport-code align-right">${esc(arrCode)}</div></div><div class="flight-separator" role="presentation"></div><div class="flight-time-row"><div class="flight-time">${esc(hhmm(flight?.departureScheduled))}</div><div class="flight-time align-right">${esc(hhmm(flight?.arrivalScheduled))}</div></div><div class="flight-passengers-row"><span class="passenger-label">Passengers:</span><div class="passenger-chips">${passengers.length ? passengers.map((name) => `<span class="passenger-chip">${esc(name)}</span>`).join("") : "<span class=\"passenger-chip\">No passengers</span>"}</div></div><div class="today-flight-live-meta"></div></article>`;
}

export function applyCardStatus(card, text, lookup = null, suffix = "") {
  const statusEl = card?.querySelector(".today-flight-status");
  if (!statusEl) return;
  const safeText = String(text || "-");
  statusEl.textContent = safeText;
  statusEl.classList.remove(...STATUS_CLASSES);
  const cls = statusClass(safeText);
  if (cls) statusEl.classList.add(cls);
  statusEl.classList.remove("status-upcoming", "status-confirmed", "status-delayed", "status-past");
  statusEl.classList.add("flight-status-badge", badgeClass(safeText));
  const detailsEl = card.querySelector(".today-flight-live-meta");
  if (!detailsEl) return;
  detailsEl.innerHTML = [liveDetails(lookup), fallbackEsc(suffix)].filter(Boolean).join(" | ");
}
