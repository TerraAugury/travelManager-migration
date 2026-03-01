import { getState } from "./state.js";
import { syncTripForms } from "./ui.js";

function fmtDate(v) { return v ? String(v).slice(0, 10) : "–"; }
function fmtDT(v) { return v ? String(v).replace("T", " ").slice(0, 16) : "–"; }
function esc(s) { return String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"); }

function renderTripSelect(trips, selectedTripId) {
  const select = document.getElementById("trip-select");
  if (!select) return;
  select.innerHTML = `<option value="">Select a trip…</option><option value="__new__">➕ Create New Trip</option>`;
  trips.forEach((trip) => {
    const opt = document.createElement("option");
    opt.value = trip.id;
    opt.textContent = trip.name;
    if (trip.id === selectedTripId) opt.selected = true;
    select.appendChild(opt);
  });
}

function renderEventTiles(flights, hotels, actions) {
  const list = document.getElementById("trip-events-list");
  if (!list) return;
  list.innerHTML = "";

  const events = [
    ...flights.map((f) => ({ type: "flight", date: f.departure_scheduled || "", data: f })),
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
      const dep = esc(data.departure_airport_code || "?");
      const arr = esc(data.arrival_airport_code || "?");
      const fl  = esc(data.flight_number || "Flight");
      const al  = data.airline ? ` (${esc(data.airline)})` : "";
      const pax = Array.isArray(data.passenger_names) ? esc(data.passenger_names.join(", ")) : "";
      const pnr = data.pnr ? ` · PNR: ${esc(data.pnr)}` : "";
      const ed  = actions.isEditingFlight?.(data.id) ? " · ✏️ editing" : "";
      tile.innerHTML = `<div class="event-tile-header"><div>
        <div class="event-tile-title">${fl}${al} · ${dep} → ${arr}</div>
        <div class="event-tile-meta">${fmtDT(data.departure_scheduled)}${pnr}${pax ? ` · ${pax}` : ""}${ed}</div>
        </div><span class="event-tile-badge">✈︎ Flight</span></div>
        <div class="event-tile-actions">
          <button type="button" class="btn btn-ghost btn-xs" data-edit-flight="${esc(data.id)}">Edit</button>
          <button type="button" class="btn btn-danger btn-xs" data-del-flight="${esc(data.id)}">Delete</button>
        </div>`;
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
          <button type="button" class="btn btn-ghost btn-xs" data-edit-hotel="${esc(data.id)}">Edit</button>
          <button type="button" class="btn btn-danger btn-xs" data-del-hotel="${esc(data.id)}">Delete</button>
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

export function render(_logLine = null, actions = {}) {
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
}
