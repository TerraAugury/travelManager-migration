import { getPassengerFlights, dedupeFlightsForMap, normalizePassengerNames } from "./flightUtils.js";
import {
  buildCityIndexFromAirportCoords,
  mapFlightToCityRoute,
  computeBearingDegrees,
  buildGreatCircleArcLatLngs,
  estimateArcSegments
} from "./mapGeo.js";
import { renderMapFlightsLayers, repositionBadges } from "./mapRender.js";
function esc(value) {
  return String(value ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
function getPassengerNamesFromFlights(flights) {
  const all = [];
  for (const flight of flights || []) all.push(...(flight.paxNames || []));
  return normalizePassengerNames(all);
}

export function createMapScreenController() {
  const cityIndex = buildCityIndexFromAirportCoords();
  let mapInstance = null;
  let mapRoutesLayer = null;
  let mapAirportsLayer = null;
  let mapLabelsLayer = null;
  let mapEventsBound = false;
  let mapTabEventsBound = false;
  let lastBadgeData = [];
  let lastMapState = null;
  let lastBounds = null;

  function ensureMapInitialized(els) {
    const mapEl = els["map-canvas"];
    if (!mapEl) return false;
    if (mapInstance) return true;
    if (!window.L || typeof window.L.map !== "function") return false;
    mapInstance = window.L.map(mapEl, { zoomControl: true });
    window.L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(mapInstance);
    mapInstance.createPane("routesPane").style.zIndex = 300;
    mapInstance.createPane("airportsPane").style.zIndex = 450;
    mapInstance.createPane("labelsPane").style.zIndex = 500;
    mapRoutesLayer = window.L.featureGroup().addTo(mapInstance);
    mapAirportsLayer = window.L.layerGroup().addTo(mapInstance);
    mapLabelsLayer = window.L.layerGroup().addTo(mapInstance);
    mapInstance.setView([20, 0], 2);
    return true;
  }

  function refitMapToVisibleBounds() {
    if (!mapInstance) return;
    setTimeout(() => {
      mapInstance.invalidateSize();
      if (lastBounds && lastBounds.isValid && lastBounds.isValid()) {
        mapInstance.fitBounds(lastBounds, { padding: [18, 18] });
      }
    }, 0);
  }

  function renderMapControls({ trips, mapState, els }) {
    const passSelect = els["map-passenger"];
    const routeSelect = els["map-route"];
    const yearList = els["map-year-list"];
    const allFlights = dedupeFlightsForMap(getPassengerFlights(trips, null));
    const yearsSet = new Set();
    for (const flight of allFlights) {
      if (mapState.passenger && !(flight.paxNames || []).includes(mapState.passenger)) continue;
      const info = mapFlightToCityRoute(flight, cityIndex);
      if (!info) continue;
      if (mapState.routeKey && info.routeKey !== mapState.routeKey) continue;
      yearsSet.add(flight.date.getFullYear());
    }
    const years = Array.from(yearsSet).sort((a, b) => a - b);
    const currentYear = new Date().getFullYear();
    mapState.year = years.length
      ? (years.includes(mapState.year) ? mapState.year : (years.includes(currentYear) ? currentYear : years[years.length - 1]))
      : currentYear;
    if (yearList) {
      yearList.innerHTML = years.map((y) => `<button class="chip-button ${y === mapState.year ? "active" : ""}" data-year="${y}">${y}</button>`).join("");
    }

    const mappedForYear = allFlights
      .filter((flight) => flight.date.getFullYear() === mapState.year)
      .map((flight) => ({ flight, info: mapFlightToCityRoute(flight, cityIndex) }))
      .filter((row) => row.info);

    const routeRows = mapState.passenger
      ? mappedForYear.filter((row) => (row.flight.paxNames || []).includes(mapState.passenger))
      : mappedForYear;
    const routesMap = new Map();
    routeRows.forEach((row) => routesMap.set(row.info.routeKey, (routesMap.get(row.info.routeKey) || 0) + 1));
    const routes = Array.from(routesMap.entries()).sort((a, b) => b[1] - a[1]).map(([key]) => key);
    if (mapState.routeKey && !routes.includes(mapState.routeKey)) mapState.routeKey = null;
    if (routeSelect) {
      routeSelect.innerHTML = '<option value="__all__">All routes</option>';
      routes.forEach((key) => routeSelect.insertAdjacentHTML("beforeend", `<option value="${esc(key)}">${esc(key.replace(/__/g, " <-> "))}</option>`));
      routeSelect.value = mapState.routeKey || "__all__";
    }

    const paxOptions2 = getPassengerNamesFromFlights(
      mapState.routeKey ? mappedForYear.filter((row) => row.info.routeKey === mapState.routeKey).map((row) => row.flight) : mappedForYear.map((row) => row.flight)
    );
    if (mapState.passenger && !paxOptions2.includes(mapState.passenger)) mapState.passenger = null;
    if (passSelect) {
      passSelect.innerHTML = '<option value="__all__">All passengers</option>';
      paxOptions2.forEach((name) => passSelect.insertAdjacentHTML("beforeend", `<option value="${esc(name)}">${esc(name)}</option>`));
      passSelect.value = mapState.passenger || "__all__";
    }
  }

  function renderMapFlights({ trips, mapState, els }) {
    const mapEl = els["map-canvas"];
    const emptyEl = els["map-empty"];
    const warnEl = els["map-warning"];
    if (!mapEl || !emptyEl || !warnEl) return;
    if (!ensureMapInitialized(els)) {
      emptyEl.textContent = "Map library not loaded. Check your internet connection or Leaflet import.";
      emptyEl.classList.remove("hidden");
      mapEl.classList.add("hidden");
      warnEl.classList.add("hidden");
      warnEl.textContent = "";
      return;
    }
    lastMapState = mapState;
    lastBadgeData = renderMapFlightsLayers({
      trips, mapState, els, mapInstance, mapRoutesLayer, mapAirportsLayer, mapLabelsLayer, cityIndex,
      getPassengerFlights, dedupeFlightsForMap,
      computeBearingDegrees, buildGreatCircleArcLatLngs, estimateArcSegments, esc
    }) || [];
    if (mapRoutesLayer?.getBounds) {
      const bounds = mapRoutesLayer.getBounds();
      lastBounds = bounds && bounds.isValid && bounds.isValid() ? bounds : null;
    } else {
      lastBounds = null;
    }
    if (!mapEventsBound) {
      const onMapViewChange = () => {
        repositionBadges({ mapInstance, mapLabelsLayer, badgeData: lastBadgeData, mapState: lastMapState });
      };
      mapInstance.on("zoomend", onMapViewChange);
      mapInstance.on("moveend", onMapViewChange);
      mapEventsBound = true;
    }
    if (!mapTabEventsBound) {
      document.addEventListener("click", (event) => {
        const btn = event.target instanceof Element ? event.target.closest('[data-screen="map"]') : null;
        if (!btn) return;
        refitMapToVisibleBounds();
      });
      mapTabEventsBound = true;
    }
  }

  function syncMapActionButtons({ mapState, els }) {
    const fsBtn = els["map-fullscreen-btn"];
    const badgesBtn = els["map-badges-btn"];
    if (fsBtn) fsBtn.textContent = mapState.fullscreen ? "Exit full screen" : "Full screen";
    if (badgesBtn) {
      badgesBtn.textContent = mapState.showBadges ? "Hide badges" : "Show badges";
      badgesBtn.setAttribute("aria-pressed", mapState.showBadges ? "true" : "false");
    }
  }

  function setMapFullscreen({ on, mapState, els }) {
    mapState.fullscreen = !!on;
    document.body.classList.toggle("map-fullscreen", mapState.fullscreen);
    syncMapActionButtons({ mapState, els });
    refitMapToVisibleBounds();
  }

  function renderMapScreen({ trips, mapState, els }) {
    renderMapControls({ trips, mapState, els });
    renderMapFlights({ trips, mapState, els });
    syncMapActionButtons({ mapState, els });
  }

  return { renderMapControls, renderMapFlights, renderMapScreen, setMapFullscreen, syncMapActionButtons };
}
