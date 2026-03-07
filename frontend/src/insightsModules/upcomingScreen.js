import { getShowPastTrips } from "../state.js";

const DAY_FMT = new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric", month: "short", year: "numeric" });
const TIME_FMT = new Intl.DateTimeFormat(undefined, { hour: "2-digit", minute: "2-digit" });

function esc(value) { return String(value ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"); }
function toDate(value) { const d = new Date(value || ""); return Number.isNaN(d.getTime()) ? null : d; }
function toIsoDay(date) { return date instanceof Date ? date.toISOString().slice(0, 10) : ""; }
function uniqNames(input) { return Array.from(new Set((Array.isArray(input) ? input : []).map((x) => String(x || "").trim()).filter(Boolean))); }
function getPassengers(trips) {
  const names = new Set();
  for (const trip of Array.isArray(trips) ? trips : []) for (const record of Array.isArray(trip?.records) ? trip.records : []) for (const name of uniqNames(record?.paxNames)) names.add(name);
  return Array.from(names).sort((a, b) => a.localeCompare(b));
}
function flightRows(trips, passenger) {
  const rows = [];
  for (const trip of Array.isArray(trips) ? trips : []) {
    for (const record of Array.isArray(trip?.records) ? trip.records : []) {
      const pax = uniqNames(record?.paxNames);
      if (passenger && !pax.includes(passenger)) continue;
      const departure = record?.route?.departure || {};
      const arrival = record?.route?.arrival || {};
      const depAt = toDate(departure?.scheduled || record?.flightDate || record?.createdAt);
      if (!depAt) continue;
      rows.push({ depAt, arrAt: toDate(arrival?.scheduled), depDay: toIsoDay(depAt), departureAirport: departure.airport || departure.iata || "?", departureIata: departure.iata || "?", arrivalAirport: arrival.airport || arrival.iata || "?", arrivalIata: arrival.iata || "?", flightNumber: record?.route?.flightNumber || "Flight", airline: record?.route?.airline || "", pnr: String(record?.pnr || "").trim(), pax });
    }
  }
  rows.sort((a, b) => a.depAt.getTime() - b.depAt.getTime());
  return rows;
}
function intersectNames(rows) { return rows.length ? rows[0].pax.filter((name) => rows.every((row) => row.pax.includes(name))) : []; }
export function formatLayover(start, end) {
  const diffMs = end.getTime() - start.getTime();
  if (!Number.isFinite(diffMs) || diffMs <= 0) return "";
  const mins = Math.floor(diffMs / 60000);
  return `${Math.floor(mins / 60)}h ${String(mins % 60).padStart(2, "0")}m`;
}
export function buildUpcomingBuckets(rows) {
  const grouped = new Map();
  const singles = [];
  for (const row of rows) {
    if (!row.pnr) { singles.push({ type: "single", flights: [row], pax: row.pax }); continue; }
    const key = `${row.depDay}__${row.pnr}`;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key).push(row);
  }
  const out = [...singles];
  for (const group of grouped.values()) {
    group.sort((a, b) => a.depAt.getTime() - b.depAt.getTime());
    const commonPax = intersectNames(group);
    if (group.length > 1 && commonPax.length > 0) out.push({ type: "connecting", flights: group, pax: commonPax });
    else for (const row of group) out.push({ type: "single", flights: [row], pax: row.pax });
  }
  out.sort((a, b) => a.flights[0].depAt.getTime() - b.flights[0].depAt.getTime());
  return out;
}
function fmtDayHeader(date) { return DAY_FMT.format(date).replace(/\./g, "").toUpperCase(); }
function fmtTime(date) { return date ? TIME_FMT.format(date) : "—"; }
function chips(names) { return names.length ? names.map((name) => `<span class="passenger-chip">${esc(name)}</span>`).join("") : '<span class="passenger-chip">No passengers</span>'; }
function renderFlightCard(row, label, passengers, past) {
  const airline = row.airline ? `${row.airline} ${row.flightNumber}` : row.flightNumber;
  return `<article class="trip-event-card flight-card upcoming-card${past ? " past" : ""}"><span class="upcoming-status-badge">Upcoming</span><div class="flight-type-row"><span class="flight-type-label">${esc(label)}</span><span class="flight-type-meta">${esc(airline)}</span></div><div class="flight-route-row"><div class="flight-airport-code">${esc(row.departureIata)}</div><span class="flight-plane-icon">✈︎</span><div class="flight-airport-code align-right">${esc(row.arrivalIata)}</div></div><div class="flight-separator"></div><div class="flight-time-row"><div class="flight-time">${esc(fmtTime(row.depAt))}</div><div class="flight-time align-right">${esc(fmtTime(row.arrAt))}</div></div><div class="flight-passengers-row"><span class="passenger-label">Passengers:</span><div class="passenger-chips">${chips(passengers)}</div></div></article>`;
}
function layoverStrip(current, next) {
  const layover = formatLayover(current.arrAt || current.depAt, next.depAt);
  if (!layover) return "";
  const airport = current.arrivalIata || current.arrivalAirport || "transfer airport";
  return `<div class="layover-strip"><span class="layover-strip-line"></span><span class="layover-strip-icon">🕒</span><span class="layover-strip-text">${esc(layover)} in ${esc(airport)}</span></div>`;
}
function renderBucket(bucket, todayStart) {
  const first = bucket.flights[0];
  const past = first.depAt < todayStart;
  if (bucket.type !== "connecting") return `<div class="upcoming-item${past ? " past" : ""}">${renderFlightCard(first, "DEPARTURE", bucket.pax, past)}</div>`;
  const last = bucket.flights[bucket.flights.length - 1];
  const stopCount = Math.max(0, bucket.flights.length - 1);
  const stopLabel = `${stopCount} stop${stopCount === 1 ? "" : "s"}`;
  const totalDuration = formatLayover(first.depAt, last.arrAt || last.depAt);
  const body = [];
  for (let i = 0; i < bucket.flights.length; i += 1) {
    body.push(renderFlightCard(bucket.flights[i], i === 0 ? "DEPARTURE" : "CONNECTING FLIGHT", bucket.pax, past));
    if (i < bucket.flights.length - 1) body.push(layoverStrip(bucket.flights[i], bucket.flights[i + 1]));
  }
  return `<section class="upcoming-item upcoming-connecting-group collapsed${past ? " past" : ""}" data-connecting-group="1"><span class="connecting-stop-badge">${esc(stopLabel)}</span><button type="button" class="connecting-summary-row" data-toggle-connecting="1"><span class="connecting-summary-route">${esc(first.departureIata)} → ${esc(last.arrivalIata)}</span><span class="connecting-summary-meta">${esc(stopLabel)}${totalDuration ? ` • ${esc(totalDuration)}` : ""}</span></button><div class="connecting-group-body">${body.join("")}</div></section>`;
}
function renderGroups(buckets, todayStart) {
  const grouped = new Map();
  for (const bucket of buckets) {
    const key = toIsoDay(bucket.flights[0].depAt);
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key).push(bucket);
  }
  return Array.from(grouped.entries()).map(([dayKey, dayBuckets]) => {
    const date = new Date(`${dayKey}T12:00:00Z`);
    const today = dayKey === toIsoDay(todayStart);
    return `<section class="upcoming-group"><div class="upcoming-group-head${today ? " today" : ""}"><span class="upcoming-group-date">${esc(fmtDayHeader(date))}</span><span class="upcoming-group-line"></span></div><div class="upcoming-group-items">${dayBuckets.map((bucket) => renderBucket(bucket, todayStart)).join("")}</div></section>`;
  }).join("");
}

export function renderUpcomingScreen({ trips, upcomingState, els }) {
  const listEl = els["upcoming-list"];
  const emptyEl = els["upcoming-empty"];
  const passSelect = els["upcoming-passenger"];
  if (!listEl || !emptyEl) return;
  const passengers = getPassengers(trips);
  if (passSelect) {
    passSelect.innerHTML = '<option value="">All passengers</option>';
    for (const passenger of passengers) passSelect.insertAdjacentHTML("beforeend", `<option value="${esc(passenger)}"${passenger === upcomingState.passenger ? " selected" : ""}>${esc(passenger)}</option>`);
    if (upcomingState.passenger && !passengers.includes(upcomingState.passenger)) { upcomingState.passenger = ""; passSelect.value = ""; }
  }
  upcomingState.passenger = passSelect ? (passSelect.value || "") : upcomingState.passenger;
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const includePast = getShowPastTrips();
  const rows = flightRows(trips, upcomingState.passenger).filter((row) => includePast || row.depAt >= todayStart);
  const buckets = buildUpcomingBuckets(rows);
  if (!buckets.length) { emptyEl.classList.remove("hidden"); listEl.innerHTML = ""; return; }
  emptyEl.classList.add("hidden");
  listEl.innerHTML = `<div class="upcoming-groups">${renderGroups(buckets, todayStart)}</div>`;
  listEl.querySelectorAll("[data-connecting-group]").forEach((group) => {
    const body = group.querySelector(".connecting-group-body");
    if (body) body.style.maxHeight = "0px";
  });
  listEl.onclick = (event) => {
    const target = event.target instanceof Element ? event.target.closest("[data-toggle-connecting]") : null;
    if (!target) return;
    const group = target.closest("[data-connecting-group]");
    const body = group?.querySelector(".connecting-group-body");
    if (!group || !body) return;
    const collapsed = group.classList.toggle("collapsed");
    group.classList.toggle("expanded", !collapsed);
    body.style.maxHeight = collapsed ? "0px" : `${body.scrollHeight}px`;
  };
}
