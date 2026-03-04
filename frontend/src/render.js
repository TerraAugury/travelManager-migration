import { getState } from "./state.js";
import { renderAdminUsers } from "./adminUsers.js";
import { buildFlightDisplayBuckets, formatLayover } from "./flightGrouping.js";
import { syncTripForms } from "./ui.js";

function fmtDate(v) { return v ? String(v).slice(0, 10) : "–"; }
function fmtDT(v) { return v ? String(v).replace("T", " ").slice(0, 16) : "–"; }
function esc(s) { return String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"); }
function toDate(v) { const d = new Date(v || ""); return Number.isNaN(d.getTime()) ? null : d; }
function syncAdminMenu(user) {
  const isAdmin = user?.role === "admin";
  document.querySelectorAll(".admin-only-menu").forEach((el) => {
    el.classList.toggle("hidden", !isAdmin);
  });
}

function formatTripMonthYear(startDate) {
  const raw = String(startDate || "").trim();
  if (!raw) return "";
  const isoDate = /^(\d{4})-(\d{2})-\d{2}$/.exec(raw);
  if (isoDate) return `${isoDate[2]}/${isoDate[1]}`;
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return "";
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = String(d.getFullYear());
  return `${month}/${year}`;
}

export function buildTripSelectLabel(trip) {
  const name = String(trip?.name || "").trim() || "Unnamed trip";
  const monthYear = formatTripMonthYear(trip?.start_date);
  return monthYear ? `${name} (${monthYear})` : name;
}

function renderTripSelect(trips, selectedTripId) {
  const select = document.getElementById("trip-select");
  if (!select) return;
  select.innerHTML = `<option value="">Select a trip…</option><option value="__new__">➕ Create New Trip</option>`;
  trips.forEach((trip) => {
    const opt = document.createElement("option");
    opt.value = trip.id;
    opt.textContent = buildTripSelectLabel(trip);
    if (trip.id === selectedTripId) opt.selected = true;
    select.appendChild(opt);
  });
}

function renderEventTiles(flights, hotels, actions) {
  const list = document.getElementById("trip-events-list");
  if (!list) return;
  list.innerHTML = "";

  const flightBuckets = buildFlightDisplayBuckets(flights);
  const events = [
    ...flightBuckets.map((f) => ({ type: "flight", date: f.flights[0]?.departure_scheduled || "", data: f })),
    ...hotels.map((h) => ({ type: "hotel", date: h.check_in_date || "", data: h }))
  ].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));

  if (!events.length) {
    list.innerHTML = '<div class="tiles-empty">No flights or hotels yet. Use the buttons above to add.</div>';
    return;
  }

  events.forEach(({ type, data }) => {
    const tile = document.createElement("div");
    tile.className = "event-tile";
    if (type === "flight") {
      const first = data.flights[0];
      if (!first) {
        return;
      }
      if (data.type === "connecting" && data.flights.length > 1) {
        const last = data.flights[data.flights.length - 1];
        const pnr = data.pnr ? ` · PNR: ${esc(data.pnr)}` : "";
        const pax = Array.isArray(data.pax) && data.pax.length ? ` · ${esc(data.pax.join(", "))}` : "";
        const legs = [];
        for (let i = 0; i < data.flights.length; i += 1) {
          const leg = data.flights[i];
          const dep = esc(leg.departure_airport_code || "?");
          const arr = esc(leg.arrival_airport_code || "?");
          const fl = esc(leg.flight_number || "Flight");
          const al = leg.airline ? ` (${esc(leg.airline)})` : "";
          const ed = actions.isEditingFlight?.(leg.id) ? " · ✏️ editing" : "";
          legs.push(`<div class="event-tile-meta">${fl}${al} · ${dep} → ${arr} · ${fmtDT(leg.departure_scheduled)} → ${fmtDT(leg.arrival_scheduled)}${ed}</div>`);
          legs.push(`<div class="event-tile-actions"><button type="button" class="btn btn-ghost btn-xs mobile-icon-btn mobile-icon-edit" aria-label="Edit flight leg" title="Edit flight leg" data-edit-flight="${esc(leg.id)}"><span class="mobile-icon-text">Edit leg</span></button><button type="button" class="btn btn-danger btn-xs mobile-icon-btn mobile-icon-delete" aria-label="Delete flight leg" title="Delete flight leg" data-del-flight="${esc(leg.id)}"><span class="mobile-icon-text">Delete leg</span></button></div>`);
          if (i < data.flights.length - 1) {
            const next = data.flights[i + 1];
            const layover = formatLayover(toDate(leg.arrival_scheduled) || toDate(leg.departure_scheduled) || first.depAt, toDate(next.departure_scheduled) || next.depAt);
            const airport = esc(leg.arrival_airport_code || "transfer airport");
            if (layover) legs.push(`<div class="event-tile-meta">Layover ${esc(layover)} in ${airport}</div>`);
          }
        }
        tile.innerHTML = `<div class="event-tile-header"><div><div class="event-tile-title">Connecting flights · ${esc(first.departure_airport_code || "?")} → ${esc(last.arrival_airport_code || "?")}</div><div class="event-tile-meta">${fmtDT(first.departure_scheduled)}${pnr}${pax}</div></div><span class="event-tile-badge">✈︎ Flight</span></div>${legs.join("")}`;
      } else {
        const dep = esc(first.departure_airport_code || "?");
        const arr = esc(first.arrival_airport_code || "?");
        const fl = esc(first.flight_number || "Flight");
        const al = first.airline ? ` (${esc(first.airline)})` : "";
        const pax = Array.isArray(first.passenger_names) ? esc(first.passenger_names.join(", ")) : "";
        const pnr = first.pnr ? ` · PNR: ${esc(first.pnr)}` : "";
        const ed = actions.isEditingFlight?.(first.id) ? " · ✏️ editing" : "";
        tile.innerHTML = `<div class="event-tile-header"><div>
          <div class="event-tile-title">${fl}${al} · ${dep} → ${arr}</div>
          <div class="event-tile-meta">${fmtDT(first.departure_scheduled)}${pnr}${pax ? ` · ${pax}` : ""}${ed}</div>
          </div><span class="event-tile-badge">✈︎ Flight</span></div>
          <div class="event-tile-actions">
            <button type="button" class="btn btn-ghost btn-xs mobile-icon-btn mobile-icon-edit" aria-label="Edit flight" title="Edit flight" data-edit-flight="${esc(first.id)}"><span class="mobile-icon-text">Edit</span></button>
            <button type="button" class="btn btn-danger btn-xs mobile-icon-btn mobile-icon-delete" aria-label="Delete flight" title="Delete flight" data-del-flight="${esc(first.id)}"><span class="mobile-icon-text">Delete</span></button>
          </div>`;
      }
    } else {
      const name = esc(data.hotel_name || "Hotel");
      const conf = data.confirmation_id ? ` · #${esc(data.confirmation_id)}` : "";
      const pax  = Array.isArray(data.passenger_names) ? esc(data.passenger_names.join(", ")) : "";
      const ed   = actions.isEditingHotel?.(data.id) ? " · ✏️ editing" : "";
      tile.innerHTML = `<div class="event-tile-header"><div>
        <div class="event-tile-title">${name}</div>
        <div class="event-tile-meta">${fmtDate(data.check_in_date)} → ${fmtDate(data.check_out_date)} · ${data.pax_count ?? "?"} guests · ${esc(data.payment_type || "")}${conf}${pax ? ` · ${pax}` : ""}${ed}</div>
        </div><span class="event-tile-badge hotel">🛏 Hotel</span></div>
        <div class="event-tile-actions">
          <button type="button" class="btn btn-ghost btn-xs mobile-icon-btn mobile-icon-edit" aria-label="Edit hotel" title="Edit hotel" data-edit-hotel="${esc(data.id)}"><span class="mobile-icon-text">Edit</span></button>
          <button type="button" class="btn btn-danger btn-xs mobile-icon-btn mobile-icon-delete" aria-label="Delete hotel" title="Delete hotel" data-del-hotel="${esc(data.id)}"><span class="mobile-icon-text">Delete</span></button>
        </div>`;
    }
    list.appendChild(tile);
  });

  list.onclick = (e) => {
    const ef = e.target.closest("[data-edit-flight]")?.dataset.editFlight;
    const df = e.target.closest("[data-del-flight]")?.dataset.delFlight;
    const eh = e.target.closest("[data-edit-hotel]")?.dataset.editHotel;
    const dh = e.target.closest("[data-del-hotel]")?.dataset.delHotel;
    if (ef) actions.onEditFlight?.(ef);
    if (df) actions.onDeleteFlight?.(df);
    if (eh) actions.onEditHotel?.(eh);
    if (dh) actions.onDeleteHotel?.(dh);
  };
}

export function render(actions = {}) {
  const state    = getState();
  const authPanel = document.getElementById("auth-panel");
  const appPanel  = document.getElementById("app-panel");
  const userLine  = document.getElementById("user-line");

  if (state.user) {
    authPanel.classList.add("hidden");
    appPanel.classList.remove("hidden");
    userLine.textContent = `${state.user.display_name} (${state.user.email})`;
  } else {
    authPanel.classList.remove("hidden");
    appPanel.classList.add("hidden");
    userLine.textContent = "";
  }
  syncAdminMenu(state.user);

  renderTripSelect(state.trips, state.selectedTripId);
  syncTripForms();

  const hasTrip  = !!state.selectedTripId;
  const addFlight = document.getElementById("add-flight-btn");
  const addHotel  = document.getElementById("add-hotel-btn");
  if (addFlight) addFlight.disabled = !hasTrip;
  if (addHotel)  addHotel.disabled  = !hasTrip;

  const summary = document.getElementById("trip-events-summary");
  if (summary) {
    summary.textContent = hasTrip
      ? `${state.flights.length} flight${state.flights.length !== 1 ? "s" : ""}, ${state.hotels.length} hotel${state.hotels.length !== 1 ? "s" : ""}`
      : "Select a trip to begin";
  }

  if (hasTrip) {
    renderEventTiles(state.flights, state.hotels, actions);
  } else {
    const list = document.getElementById("trip-events-list");
    if (list) list.innerHTML = '<div class="tiles-empty">Select a trip to start adding flights and hotels.</div>';
  }

  renderAdminUsers();
}
