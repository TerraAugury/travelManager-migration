import { getState } from "./state.js";

function fmtDate(value) {
  if (!value) return "-";
  return String(value).slice(0, 10);
}

function clear(el) {
  el.innerHTML = "";
}

function addEmptyItem(el, text) {
  const li = document.createElement("li");
  li.textContent = text;
  el.appendChild(li);
}

function renderTripSelect(items, selectedTripId) {
  const select = document.getElementById("trip-select");
  clear(select);
  const placeholder = document.createElement("option");
  placeholder.value = "";
  placeholder.textContent = "Select trip";
  select.appendChild(placeholder);

  items.forEach((trip) => {
    const opt = document.createElement("option");
    opt.value = trip.id;
    opt.textContent = trip.name;
    if (trip.id === selectedTripId) opt.selected = true;
    select.appendChild(opt);
  });
}

function renderTrips(items, selectedTripId, actions) {
  const list = document.getElementById("trip-list");
  clear(list);
  if (!items.length) {
    addEmptyItem(list, "No trips yet.");
    return;
  }

  items.forEach((trip) => {
    const li = document.createElement("li");
    const info = document.createElement("div");
    info.textContent = `${trip.name} (${fmtDate(trip.start_date)} -> ${fmtDate(trip.end_date)})`;

    const right = document.createElement("div");
    right.className = "row";
    const openBtn = document.createElement("button");
    openBtn.type = "button";
    openBtn.textContent = trip.id === selectedTripId ? "Active" : "Open";
    openBtn.disabled = trip.id === selectedTripId;
    openBtn.addEventListener("click", () => actions.onSelectTrip(trip.id));

    const delBtn = document.createElement("button");
    delBtn.type = "button";
    delBtn.className = "danger";
    delBtn.textContent = "Delete";
    delBtn.addEventListener("click", () => actions.onDeleteTrip(trip.id));

    right.appendChild(openBtn);
    right.appendChild(delBtn);
    li.appendChild(info);
    li.appendChild(right);
    list.appendChild(li);
  });
}

function renderEvents(listId, items, toLabel, onDelete) {
  const list = document.getElementById(listId);
  clear(list);
  if (!items.length) {
    addEmptyItem(list, "No items.");
    return;
  }
  items.forEach((item) => {
    const li = document.createElement("li");
    const info = document.createElement("div");
    info.textContent = toLabel(item);
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "danger";
    btn.textContent = "Delete";
    btn.addEventListener("click", () => onDelete(item.id));
    li.appendChild(info);
    li.appendChild(btn);
    list.appendChild(li);
  });
}

function renderPassengers(passengers) {
  const list = document.getElementById("passenger-list");
  clear(list);
  if (!passengers.length) {
    addEmptyItem(list, "No passengers.");
    return;
  }
  passengers.forEach((p) => {
    const li = document.createElement("li");
    li.textContent = p.name;
    list.appendChild(li);
  });
}

export function render(logLine = null, actions = {}) {
  const state = getState();
  const authPanel = document.getElementById("auth-panel");
  const appPanel = document.getElementById("app-panel");
  const userLine = document.getElementById("user-line");
  const status = document.getElementById("status-log");
  const detailPanel = document.getElementById("trip-detail-panel");
  const detailTitle = document.getElementById("trip-detail-title");

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
  renderTrips(state.trips, state.selectedTripId, actions);

  const activeTrip = state.trips.find((t) => t.id === state.selectedTripId) || null;
  if (!activeTrip) {
    detailPanel.classList.add("hidden");
  } else {
    detailPanel.classList.remove("hidden");
    detailTitle.textContent = `Trip Details: ${activeTrip.name}`;
    renderEvents(
      "flight-list",
      state.flights,
      (f) => `${f.flight_number || "Flight"} ${f.departure_airport_code || ""} -> ${f.arrival_airport_code || ""}`,
      actions.onDeleteFlight || (() => {})
    );
    renderEvents(
      "hotel-list",
      state.hotels,
      (h) => `${h.hotel_name || "Hotel"} (${fmtDate(h.check_in_date)} -> ${fmtDate(h.check_out_date)})`,
      actions.onDeleteHotel || (() => {})
    );
    renderPassengers(state.passengers);
  }

  if (logLine) {
    const lines = status.textContent.split("\n").slice(-11);
    lines.push(logLine);
    status.textContent = lines.join("\n");
  }
}

