import { buildFlightDisplayBuckets, formatLayover } from "./flightGrouping.js";
import { confirmAction } from "./confirmDialog.js";

const DAY_FMT = new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric", month: "short", year: "numeric" });
function esc(v) { return String(v ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"); }
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
  if (!key) return "–";
  const [y, m, d] = key.split("-").map((part) => Number(part));
  const dt = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  return Number.isNaN(dt.getTime()) ? key : dt.toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });
}
function hhmm(value) {
  const raw = String(value || "");
  const m = /T(\d{2}:\d{2})/.exec(raw);
  if (m) return m[1];
  return "–";
}
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
function chips(names) {
  const list = Array.isArray(names) ? names.filter(Boolean) : [];
  return list.map((name) => `<span class="passenger-chip">${esc(name)}</span>`).join("");
}
function flightTitle(flight) {
  const parts = [String(flight?.airline || "").trim(), String(flight?.flight_number || "").trim()].filter(Boolean);
  return parts.join(" ") || "Flight";
}
function depLocalDateTime(flight) {
  return flight?.departure_scheduled_local || flight?.departure_scheduled;
}
function arrLocalDateTime(flight) {
  return flight?.arrival_scheduled_local || flight?.arrival_scheduled;
}
function flightLegCard(flight, label) {
  return `<article class="trip-event-card flight-card"><div class="event-card-top"><span class="event-kicker">${esc(label)}</span><span class="event-title">${esc(flightTitle(flight))}</span></div><div class="event-card-actions"><button type="button" class="evt-pill-btn" data-edit-flight="${esc(flight.id)}">Edit</button><button type="button" class="evt-icon-btn" aria-label="Delete flight" data-del-flight="${esc(flight.id)}">🗑</button></div><div class="route-row"><div class="route-side"><div class="route-code">${esc(flight?.departure_airport_code || "?")}</div><div class="route-time">${esc(hhmm(depLocalDateTime(flight)))}</div></div><div class="route-center">✈︎</div><div class="route-side align-right"><div class="route-code">${esc(flight?.arrival_airport_code || "?")}</div><div class="route-time">${esc(hhmm(arrLocalDateTime(flight)))}</div></div></div><div class="event-passengers"><span class="passenger-label">Passengers:</span><div class="passenger-chips">${chips(flight?.passenger_names)}</div></div></article>`;
}
function layoverCard(prevFlight, nextFlight) {
  const prevAt = prevFlight?.arrival_scheduled || prevFlight?.departure_scheduled || arrLocalDateTime(prevFlight) || depLocalDateTime(prevFlight) || "";
  const nextAt = nextFlight?.departure_scheduled || depLocalDateTime(nextFlight) || "";
  const layover = formatLayover(new Date(prevAt), new Date(nextAt));
  const airport = String(prevFlight?.arrival_airport_name || prevFlight?.arrival_airport_code || "transfer airport");
  return `<article class="trip-event-card layover-card"><div class="event-card-top"><span class="event-kicker">LAYOVER</span><span class="layover-icon">🕒</span></div><div class="layover-text">${esc(layover || "Layover")} in ${esc(airport)}</div></article>`;
}
function hotelCard(hotel) {
  const copyValue = hotel?.confirmation_id ? esc(hotel.confirmation_id) : "";
  const nights = nightsLabel(hotel?.check_in_date, hotel?.check_out_date);
  return `<article class="trip-event-card hotel-card"><div class="event-card-top"><span class="event-kicker">HOTEL</span><span class="event-title">${esc(hotel?.hotel_name || "Hotel")}</span></div><div class="event-card-actions"><button type="button" class="evt-pill-btn"${copyValue ? ` data-copy-hotel-id="${copyValue}"` : " disabled"}>${copyValue ? "Copy ID" : "No ID"}</button><button type="button" class="evt-icon-btn" aria-label="Delete hotel" data-del-hotel="${esc(hotel.id)}">🗑</button></div><div class="route-row"><div class="route-side"><div class="route-code hotel-label">Check-in</div><div class="route-time">${esc(shortDate(hotel?.check_in_date))}</div></div><div class="route-center">🛏</div><div class="route-side align-right"><div class="route-code hotel-label">Check-out</div><div class="route-time">${esc(shortDate(hotel?.check_out_date))}${nights ? ` · ${esc(nights)}` : ""}</div></div></div><div class="hotel-meta">🔑 ${esc(String(hotel?.pax_count || 0))} guests • ${esc(paymentLabel(hotel?.payment_type))}</div></article>`;
}
function summaryText(flightCount, hotelCount) {
  const parts = [];
  if (flightCount) parts.push(`${flightCount} flight${flightCount === 1 ? "" : "s"}`);
  if (hotelCount) parts.push(`${hotelCount} hotel${hotelCount === 1 ? "" : "s"}`);
  return parts.join(" • ") || "No events";
}
function copyText(value) {
  if (!value || !navigator?.clipboard?.writeText) return;
  navigator.clipboard.writeText(value).catch(() => {});
}
function buildDays(flights, hotels) {
  const map = new Map();
  const buckets = buildFlightDisplayBuckets(flights);
  for (const bucket of buckets) {
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
export function renderTripEvents(flights, hotels, actions = {}) {
  const list = document.getElementById("trip-events-list");
  if (!list) return;
  const days = buildDays(flights, hotels);
  if (!days.length) {
    list.innerHTML = '<div class="tiles-empty">No flights or hotels yet. Use the buttons above to add.</div>';
    return;
  }
  list.innerHTML = days.map((day) => {
    const events = day.events.slice().sort((a, b) => a.sort.localeCompare(b.sort)).map((event) => {
      if (event.type === "hotel") return hotelCard(event.data);
      const legs = event.data?.flights || [];
      if (event.data?.type !== "connecting" || legs.length < 2) return flightLegCard(legs[0], "DEPARTURE");
      const out = [flightLegCard(legs[0], "DEPARTURE")];
      for (let i = 1; i < legs.length; i += 1) {
        out.push(layoverCard(legs[i - 1], legs[i]));
        out.push(flightLegCard(legs[i], "CONNECTING FLIGHT"));
      }
      return out.join("");
    }).join("");
    return `<section class="day-tile"><header class="day-head"><div class="day-head-main"><span class="day-icon">✈︎</span><h3 class="day-title">${esc(dayLabel(day.key))}</h3></div><span class="day-summary-chip">${esc(summaryText(day.flights, day.hotels))}</span></header><div class="day-divider"></div><div class="day-events">${events}</div></section>`;
  }).join("");
  list.onclick = async (event) => {
    const target = event.target instanceof Element ? event.target : null;
    const editFlight = target?.closest("[data-edit-flight]")?.dataset.editFlight;
    const delFlight = target?.closest("[data-del-flight]")?.dataset.delFlight;
    const delHotel = target?.closest("[data-del-hotel]")?.dataset.delHotel;
    const copyHotelId = target?.closest("[data-copy-hotel-id]")?.dataset.copyHotelId;
    if (editFlight) {
      actions.onEditFlight?.(editFlight);
      return;
    }
    if (delFlight) {
      const confirmed = await confirmAction({
        title: "Delete flight?",
        message: "You are about to delete this flight record.",
        confirmText: "Confirm",
        cancelText: "Cancel",
        danger: true
      });
      if (!confirmed) return;
      await actions.onDeleteFlight?.(delFlight);
      return;
    }
    if (delHotel) {
      const confirmed = await confirmAction({
        title: "Delete hotel?",
        message: "You are about to delete this hotel booking record.",
        confirmText: "Confirm",
        cancelText: "Cancel",
        danger: true
      });
      if (!confirmed) return;
      await actions.onDeleteHotel?.(delHotel);
      return;
    }
    if (copyHotelId) copyText(copyHotelId);
  };
}
