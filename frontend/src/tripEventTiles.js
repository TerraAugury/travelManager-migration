import { buildConnectingMeta, buildFlightDisplayBuckets } from "./flightGrouping.js";
import { confirmAction } from "./confirmDialog.js";

const DAY_FMT = new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric", month: "short", year: "numeric" });
const PLANE_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M17.8 19.2 16 11l4-4a1 1 0 0 0-1.4-1.4l-4 4-8.2-1.8a1 1 0 0 0-.9 1.7L9 12l-3.5 2.5a1 1 0 0 0 .9 1.7l8.2-1.8 2.4 2.4a1 1 0 0 0 1.7-.9Z"/></svg>';
const BED_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 19h20"/><path d="M3 19v-8h18v8"/><path d="M3 11V7a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v4"/><path d="M13 9h6a2 2 0 0 1 2 2"/></svg>';
const CLOCK_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v6l4 2"/></svg>';
const TRASH_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/></svg>';

function esc(v) { return String(v ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\"/g, "&quot;"); }
function dayKey(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  const iso = /^(\d{4}-\d{2}-\d{2})/.exec(raw);
  if (iso) return iso[1];
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? "" : d.toISOString().slice(0, 10);
}
function dayLabel(key) {
  const d = new Date(`${key}T12:00:00Z`);
  return Number.isNaN(d.getTime()) ? key : DAY_FMT.format(d).replace(/(\d{4})$/, "$1");
}
function shortDate(value) {
  const key = dayKey(value);
  if (!key) return "-";
  const [y, m, d] = key.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  return Number.isNaN(dt.getTime()) ? key : dt.toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });
}
function hhmm(value) { return /T(\d{2}:\d{2})/.exec(String(value || ""))?.[1] || "-"; }
function paymentLabel(value) {
  const key = String(value || "").toLowerCase();
  if (key === "prepaid") return "Already paid";
  if (key === "pay_at_hotel") return "Pay at hotel";
  return key || "Unknown";
}
function nightsLabel(checkIn, checkOut) {
  const inDate = new Date(`${dayKey(checkIn)}T00:00:00Z`);
  const outDate = new Date(`${dayKey(checkOut)}T00:00:00Z`);
  if (Number.isNaN(inDate.getTime()) || Number.isNaN(outDate.getTime())) return "";
  const nights = Math.max(0, Math.round((outDate - inDate) / 86400000));
  return nights ? `${nights} night${nights === 1 ? "" : "s"}` : "";
}
function chips(names) { return (Array.isArray(names) ? names.filter(Boolean) : []).map((name) => `<span class="passenger-chip">${esc(name)}</span>`).join(""); }
function flightTitle(flight) { return [String(flight?.airline || "").trim(), String(flight?.flight_number || "").trim()].filter(Boolean).join(" ") || "Flight"; }
function depLocalDateTime(flight) { return flight?.departure_scheduled_local || flight?.departure_scheduled; }
function arrLocalDateTime(flight) { return flight?.arrival_scheduled_local || flight?.arrival_scheduled; }
function parseDate(value) {
  const raw = String(value || "").trim();
  if (!raw) return null;
  const normalized = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(raw) ? `${raw}:00` : raw;
  const date = new Date(normalized);
  return Number.isNaN(date.getTime()) ? null : date;
}
function statusBadge(flight) {
  const raw = String(flight?.status || "").toLowerCase();
  const dep = parseDate(flight?.departure_scheduled || depLocalDateTime(flight));
  const arr = parseDate(flight?.arrival_scheduled || arrLocalDateTime(flight));
  if (raw.includes("delay") || raw.includes("cancel")) return { text: "Delayed", className: "delayed" };
  if (raw.includes("landed") || raw.includes("arriv") || raw.includes("past") || (arr && arr.getTime() < Date.now())) return { text: "Past", className: "past" };
  if (dep && dep.getTime() > Date.now()) return { text: "Upcoming", className: "upcoming" };
  if (raw || dep || arr) return { text: "Confirmed", className: "confirmed" };
  return null;
}
function flightLegCard(flight, label, connecting = false) {
  const status = statusBadge(flight);
  return `<article class="trip-event-card flight-card${status ? " has-status" : ""}${connecting ? " connecting-leg" : ""}">${status ? `<span class="flight-status-badge status-${status.className}">${esc(status.text)}</span>` : ""}<div class="flight-type-row"><span class="flight-type-label">${esc(label)}</span><span class="flight-type-meta">${esc(flightTitle(flight))}</span></div><div class="flight-action-row"><button type="button" class="evt-pill-btn" data-edit-flight="${esc(flight?.id || "")}">Edit</button><button type="button" class="evt-icon-btn" aria-label="Delete flight" data-del-flight="${esc(flight?.id || "")}">${TRASH_ICON}</button></div><div class="flight-route-row"><div class="flight-airport-code">${esc(flight?.departure_airport_code || "?")}</div><span class="flight-plane-icon">${PLANE_ICON}</span><div class="flight-airport-code align-right">${esc(flight?.arrival_airport_code || "?")}</div></div><div class="flight-separator" role="presentation"></div><div class="flight-time-row"><div class="flight-time">${esc(hhmm(depLocalDateTime(flight)))}</div><div class="flight-time align-right">${esc(hhmm(arrLocalDateTime(flight)))}</div></div><div class="flight-passengers-row"><span class="passenger-label">Passengers:</span><div class="passenger-chips">${chips(flight?.passenger_names)}</div></div></article>`;
}
function layoverStrip(layover) {
  const duration = layover?.duration || "Layover";
  const airport = layover?.airport ? ` in ${layover.airport}` : "";
  return `<div class="layover-strip"><span class="layover-strip-line" aria-hidden="true"></span><span class="layover-strip-icon">${CLOCK_ICON}</span><span class="layover-strip-text">${esc(duration)}${esc(airport)}</span></div>`;
}
function connectingGroup(bucket, collapsedByDefault) {
  const legs = bucket?.flights || [];
  const meta = buildConnectingMeta(legs);
  const stopCount = meta?.stopCount || Math.max(0, legs.length - 1);
  const stopLabel = `${stopCount} stop${stopCount === 1 ? "" : "s"}`;
  const collapsedClass = collapsedByDefault ? " collapsed" : " expanded";
  const summaryDuration = meta?.totalDuration ? ` • ${meta.totalDuration}` : "";
  const summaryRoute = `${meta?.originCode || "?"} → ${meta?.destinationCode || "?"}`;
  const body = [];
  for (let i = 0; i < legs.length; i += 1) {
    body.push(flightLegCard(legs[i], i === 0 ? "DEPARTURE" : "CONNECTING FLIGHT", true));
    if (i < legs.length - 1) body.push(layoverStrip(meta?.layovers?.[i]));
  }
  return `<section class="connecting-group${collapsedClass}" data-connecting-group="1"><span class="connecting-stop-badge">${esc(stopLabel)}</span><button type="button" class="connecting-summary-row" data-toggle-connecting="1"><span class="connecting-summary-route">${esc(summaryRoute)}</span><span class="connecting-summary-meta">${esc(stopLabel)}${esc(summaryDuration)}</span></button><div class="connecting-group-body">${body.join("")}</div></section>`;
}
function hotelCard(hotel) {
  const copyValue = hotel?.confirmation_id ? esc(hotel.confirmation_id) : "";
  const nights = nightsLabel(hotel?.check_in_date, hotel?.check_out_date);
  return `<article class="trip-event-card hotel-card"><div class="hotel-type-row"><span class="event-kicker">HOTEL</span></div><div class="hotel-name">${esc(hotel?.hotel_name || "Hotel")}</div><div class="hotel-stay-row"><div class="hotel-stay-col"><div class="hotel-stay-label">Check-in</div><div class="hotel-stay-date">${esc(shortDate(hotel?.check_in_date))}</div></div><span class="hotel-bed-icon">${BED_ICON}</span><div class="hotel-stay-col align-right"><div class="hotel-stay-label">Check-out</div><div class="hotel-stay-date">${esc(shortDate(hotel?.check_out_date))}</div>${nights ? `<div class="hotel-nights">${esc(nights)}</div>` : ""}</div></div><div class="hotel-meta-row">${esc(String(hotel?.pax_count || 0))} guests • ${esc(paymentLabel(hotel?.payment_type))}</div><div class="event-card-actions"><button type="button" class="evt-pill-btn"${copyValue ? ` data-copy-hotel-id="${copyValue}"` : " disabled"}>${copyValue ? "Copy ID" : "No ID"}</button><button type="button" class="evt-icon-btn" aria-label="Delete hotel" data-del-hotel="${esc(hotel?.id || "")}">${TRASH_ICON}</button></div></article>`;
}
function summaryText(flightCount, hotelCount) {
  const parts = [];
  if (flightCount) parts.push(`${flightCount} flight${flightCount === 1 ? "" : "s"}`);
  if (hotelCount) parts.push(`${hotelCount} hotel${hotelCount === 1 ? "" : "s"}`);
  return parts.join(" • ") || "No events";
}
function copyText(value) { if (value && navigator?.clipboard?.writeText) navigator.clipboard.writeText(value).catch(() => {}); }
function buildDays(flights, hotels) {
  const map = new Map();
  for (const bucket of buildFlightDisplayBuckets(flights)) {
    const first = bucket?.flights?.[0];
    const key = dayKey(depLocalDateTime(first));
    if (!key) continue;
    const day = map.get(key) || { key, events: [], flights: 0, hotels: 0 };
    day.events.push({ type: "flight", sort: String(depLocalDateTime(first) || `${key}T00:00`), data: bucket });
    day.flights += Math.max(0, bucket?.flights?.length || 0);
    map.set(key, day);
  }
  for (const hotel of hotels || []) {
    const key = dayKey(hotel?.check_in_date);
    if (!key) continue;
    const day = map.get(key) || { key, events: [], flights: 0, hotels: 0 };
    day.events.push({ type: "hotel", sort: `${key}T23:59`, data: hotel });
    day.hotels += 1;
    map.set(key, day);
  }
  return Array.from(map.values()).sort((a, b) => a.key.localeCompare(b.key));
}
function setConnectingExpanded(group, expanded) {
  const body = group?.querySelector(".connecting-group-body");
  if (!body) return;
  group.classList.toggle("collapsed", !expanded);
  group.classList.toggle("expanded", expanded);
  body.style.maxHeight = expanded ? `${body.scrollHeight}px` : "0px";
}
function initConnectingGroups(root) {
  root.querySelectorAll("[data-connecting-group]").forEach((group) => setConnectingExpanded(group, !group.classList.contains("collapsed")));
}

export function renderTripEvents(flights, hotels, actions = {}, options = {}) {
  const list = document.getElementById("trip-events-list");
  if (!list) return;
  const days = buildDays(flights, hotels);
  if (!days.length) {
    list.innerHTML = '<div class="tiles-empty">No flights or hotels yet. Use the buttons above to add.</div>';
    return;
  }
  const collapsedByDefault = !!options.defaultConnectingCollapsed;
  list.innerHTML = days.map((day) => {
    const events = day.events.slice().sort((a, b) => a.sort.localeCompare(b.sort)).map((event) => {
      if (event.type === "hotel") return hotelCard(event.data);
      const legs = event.data?.flights || [];
      if (event.data?.type !== "connecting" || legs.length < 2) return flightLegCard(legs[0], "DEPARTURE");
      return connectingGroup(event.data, collapsedByDefault);
    }).join("");
    return `<section class="day-tile"><header class="day-head"><div class="day-head-main"><span class="day-icon">${PLANE_ICON}</span><h3 class="day-title">${esc(dayLabel(day.key))}</h3></div><span class="day-summary-chip">${esc(summaryText(day.flights, day.hotels))}</span></header><div class="day-divider"></div><div class="day-events">${events}</div></section>`;
  }).join("");
  initConnectingGroups(list);
  list.onclick = async (event) => {
    const target = event.target instanceof Element ? event.target : null;
    const toggle = target?.closest("[data-toggle-connecting]");
    if (toggle) {
      const group = toggle.closest("[data-connecting-group]");
      if (group) setConnectingExpanded(group, group.classList.contains("collapsed"));
      return;
    }
    const editFlight = target?.closest("[data-edit-flight]")?.dataset.editFlight;
    const delFlight = target?.closest("[data-del-flight]")?.dataset.delFlight;
    const delHotel = target?.closest("[data-del-hotel]")?.dataset.delHotel;
    const copyHotelId = target?.closest("[data-copy-hotel-id]")?.dataset.copyHotelId;
    if (editFlight) return actions.onEditFlight?.(editFlight);
    if (delFlight) {
      const confirmed = await confirmAction({ title: "Delete flight?", message: "You are about to delete this flight record.", confirmText: "Confirm", cancelText: "Cancel", danger: true });
      if (confirmed) await actions.onDeleteFlight?.(delFlight);
      return;
    }
    if (delHotel) {
      const confirmed = await confirmAction({ title: "Delete hotel?", message: "You are about to delete this hotel booking record.", confirmText: "Confirm", cancelText: "Cancel", danger: true });
      if (confirmed) await actions.onDeleteHotel?.(delHotel);
      return;
    }
    if (copyHotelId) copyText(copyHotelId);
  };
}
