import { getShowPastTrips, getState, getVisibleTrips } from "./state.js";
import { renderAdminUsers } from "./adminUsers.js";
import { renderTripEvents } from "./tripEventTiles.js";
import { syncTripForms } from "./ui.js";

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

  const showPastTripsToggle = document.getElementById("show-past-trips");
  if (showPastTripsToggle) showPastTripsToggle.checked = getShowPastTrips();
  renderTripSelect(getVisibleTrips(state.trips), state.selectedTripId);
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
    renderTripEvents(state.flights, state.hotels, actions);
  } else {
    const list = document.getElementById("trip-events-list");
    if (list) list.innerHTML = '<div class="tiles-empty">Select a trip to start adding flights and hotels.</div>';
  }

  renderAdminUsers();
}
