function esc(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function toDate(value) {
  const d = new Date(value || "");
  return Number.isNaN(d.getTime()) ? null : d;
}

function getPassengers(trips) {
  const names = new Set();
  for (const trip of Array.isArray(trips) ? trips : []) {
    for (const record of Array.isArray(trip?.records) ? trip.records : []) {
      for (const name of Array.isArray(record?.paxNames) ? record.paxNames : []) {
        const n = String(name || "").trim();
        if (n) names.add(n);
      }
    }
  }
  return Array.from(names).sort((a, b) => a.localeCompare(b));
}

function collectFlights(trips, filters) {
  const rows = [];
  for (const trip of Array.isArray(trips) ? trips : []) {
    for (const record of Array.isArray(trip?.records) ? trip.records : []) {
      const names = Array.isArray(record?.paxNames) ? record.paxNames : [];
      if (filters.passenger && !names.some((name) => String(name || "").trim() === filters.passenger)) continue;
      const depAt = toDate(record?.route?.departure?.scheduled || record?.flightDate || record?.createdAt);
      if (!depAt) continue;
      if (filters.year && depAt.getFullYear() !== filters.year) continue;
      const depCode = String(record?.route?.departure?.iata || record?.route?.departure?.airport || "?").trim();
      const arrCode = String(record?.route?.arrival?.iata || record?.route?.arrival?.airport || "?").trim();
      const routeKey = `${depCode} -> ${arrCode}`;
      if (filters.routeKey && filters.routeKey !== routeKey) continue;
      rows.push({ depAt, routeKey, depCode, arrCode, pax: names });
    }
  }
  rows.sort((a, b) => a.depAt.getTime() - b.depAt.getTime());
  return rows;
}

function syncPassengerSelect(select, passengers, selectedPassenger) {
  if (!select) return selectedPassenger || null;
  select.innerHTML = '<option value="__all__">All passengers</option>';
  for (const passenger of passengers) {
    const selected = passenger === selectedPassenger ? " selected" : "";
    select.insertAdjacentHTML("beforeend", `<option value="${esc(passenger)}"${selected}>${esc(passenger)}</option>`);
  }
  if (selectedPassenger && !passengers.includes(selectedPassenger)) {
    select.value = "__all__";
    return null;
  }
  return select.value === "__all__" ? null : select.value;
}

function syncYearButtons(container, years, selectedYear) {
  if (!container) return selectedYear;
  if (!years.length) {
    container.innerHTML = "";
    return selectedYear;
  }
  const effective = years.includes(selectedYear) ? selectedYear : years[0];
  container.innerHTML = years
    .map((year) => `<button class="chip-button ${year === effective ? "active" : ""}" data-year="${year}">${year}</button>`)
    .join("");
  return effective;
}

function syncRouteSelect(select, routes, selectedRoute) {
  if (!select) return selectedRoute || null;
  select.innerHTML = '<option value="__all__">All routes</option>';
  for (const route of routes) {
    const selected = route === selectedRoute ? " selected" : "";
    select.insertAdjacentHTML("beforeend", `<option value="${esc(route)}"${selected}>${esc(route)}</option>`);
  }
  if (selectedRoute && !routes.includes(selectedRoute)) {
    select.value = "__all__";
    return null;
  }
  return select.value === "__all__" ? null : select.value;
}

export function createMapScreenController() {
  function setMapFullscreen({ on, mapState, els }) {
    const enabled = Boolean(on);
    mapState.fullscreen = enabled;
    document.body.classList.toggle("map-fullscreen", enabled);
    if (els["map-fullscreen-btn"]) {
      els["map-fullscreen-btn"].textContent = enabled ? "Exit full screen" : "Full screen";
    }
  }

  function renderMapScreen({ trips, mapState, els }) {
    const mapCanvas = els["map-canvas"];
    const emptyEl = els["map-empty"];
    const warningEl = els["map-warning"];
    const passengerSelect = els["map-passenger"];
    const routeSelect = els["map-route"];
    const yearList = els["map-year-list"];
    const badgesBtn = els["map-badges-btn"];
    if (!mapCanvas || !emptyEl || !warningEl) return;

    const passengers = getPassengers(trips);
    mapState.passenger = syncPassengerSelect(passengerSelect, passengers, mapState.passenger);
    const allFlights = collectFlights(trips, { passenger: mapState.passenger, year: null, routeKey: null });
    const years = Array.from(new Set(allFlights.map((f) => f.depAt.getFullYear()))).sort((a, b) => b - a);
    mapState.year = syncYearButtons(yearList, years, mapState.year);
    const yearFlights = collectFlights(trips, { passenger: mapState.passenger, year: mapState.year, routeKey: null });
    const routes = Array.from(new Set(yearFlights.map((f) => f.routeKey))).sort((a, b) => a.localeCompare(b));
    mapState.routeKey = syncRouteSelect(routeSelect, routes, mapState.routeKey);
    const flights = collectFlights(trips, {
      passenger: mapState.passenger,
      year: mapState.year,
      routeKey: mapState.routeKey
    });

    if (badgesBtn) badgesBtn.textContent = mapState.showBadges ? "Hide badges" : "Show badges";
    if (!flights.length) {
      mapCanvas.classList.add("hidden");
      emptyEl.classList.remove("hidden");
      warningEl.classList.add("hidden");
      return;
    }

    emptyEl.classList.add("hidden");
    mapCanvas.classList.remove("hidden");
    warningEl.classList.remove("hidden");
    warningEl.textContent = "Map route list mode is active for this build.";
    const totals = new Map();
    for (const flight of flights) {
      totals.set(flight.routeKey, (totals.get(flight.routeKey) || 0) + 1);
    }
    const rows = Array.from(totals.entries()).sort((a, b) => b[1] - a[1]);
    mapCanvas.innerHTML = `<div class="insight-list">${rows.map(([route, count]) => `<div class="flight-tile"><div class="flight-tile-header"><span>${esc(route)}</span>${mapState.showBadges ? `<span class="tag-soft">${count}</span>` : ""}</div></div>`).join("")}</div>`;
  }

  return { renderMapScreen, setMapFullscreen };
}
