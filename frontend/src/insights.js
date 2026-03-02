import * as api from "./api.js";
import { buildLegacyTrips } from "./legacyAdapter.js";
import { renderDaycountView } from "../../js/daycountScreen.js";
import { createMapScreenController } from "../../js/mapScreen.js";
import { renderUpcomingScreen } from "../../js/upcomingScreen.js";
import { renderAllTripsDetails } from "../../js/tripStats.js";

function getElements() {
  const ids = [
    "daycount-passenger",
    "daycount-year-list",
    "daycount-results",
    "daycount-empty",
    "daycount-upcoming-list",
    "daycount-upcoming-empty",
    "upcoming-passenger",
    "upcoming-list",
    "upcoming-empty",
    "map-passenger",
    "map-route",
    "map-year-list",
    "map-empty",
    "map-warning",
    "map-canvas",
    "map-fullscreen-btn",
    "map-badges-btn",
    "trip-stats-container",
    "trip-pax-container",
    "trip-details-empty"
  ];
  return ids.reduce((acc, id) => ({ ...acc, [id]: document.getElementById(id) }), {});
}

export function createInsightsController() {
  const state = {
    els: null,
    legacyTrips: [],
    detailsByTripId: new Map(),
    daycountState: { passenger: "", year: new Date().getFullYear(), monthSelection: null, viewMode: "list" },
    upcomingState: { passenger: "" },
    mapState: { passenger: null, routeKey: null, year: new Date().getFullYear(), showBadges: true, fullscreen: false },
    mapController: createMapScreenController()
  };

  function render() {
    if (!state.els?.["upcoming-list"]) return;
    renderUpcomingScreen({ trips: state.legacyTrips, upcomingState: state.upcomingState, els: state.els });
    renderDaycountView({ trips: state.legacyTrips, daycountState: state.daycountState, els: state.els });
    renderAllTripsDetails(
      state.legacyTrips,
      state.els["trip-stats-container"],
      state.els["trip-pax-container"],
      state.els["trip-details-empty"]
    );
    state.mapController.renderMapScreen({ trips: state.legacyTrips, mapState: state.mapState, els: state.els });
  }

  function bind() {
    state.els = getElements();
    const upcomingSelect = state.els["upcoming-passenger"];
    const daycountSelect = state.els["daycount-passenger"];
    const mapPassenger = state.els["map-passenger"];
    const mapRoute = state.els["map-route"];
    const mapYearList = state.els["map-year-list"];
    const mapFullscreen = state.els["map-fullscreen-btn"];
    const mapBadges = state.els["map-badges-btn"];
    const yearList = state.els["daycount-year-list"];
    const daycountResults = state.els["daycount-results"];

    upcomingSelect?.addEventListener("change", () => {
      state.upcomingState.passenger = upcomingSelect.value || "";
      render();
    });
    daycountSelect?.addEventListener("change", () => {
      state.daycountState.passenger = daycountSelect.value || "";
      state.daycountState.monthSelection = null;
      render();
    });
    mapPassenger?.addEventListener("change", () => {
      state.mapState.passenger = mapPassenger.value === "__all__" ? null : mapPassenger.value || null;
      render();
    });
    mapRoute?.addEventListener("change", () => {
      state.mapState.routeKey = mapRoute.value === "__all__" ? null : mapRoute.value || null;
      render();
    });
    mapYearList?.addEventListener("click", (event) => {
      const button = event.target.closest("[data-year]");
      if (!button) return;
      state.mapState.year = Number.parseInt(button.getAttribute("data-year") || "", 10);
      render();
    });
    mapBadges?.addEventListener("click", () => {
      state.mapState.showBadges = !state.mapState.showBadges;
      render();
    });
    mapFullscreen?.addEventListener("click", () => {
      state.mapController.setMapFullscreen({ on: !state.mapState.fullscreen, mapState: state.mapState, els: state.els });
      render();
    });
    yearList?.addEventListener("click", (event) => {
      const button = event.target.closest("[data-year]");
      if (!button) return;
      state.daycountState.year = Number.parseInt(button.getAttribute("data-year") || "", 10);
      state.daycountState.monthSelection = null;
      render();
    });
    document.getElementById("daycount-view-toggle")?.addEventListener("click", () => {
      state.daycountState.viewMode = state.daycountState.viewMode === "calendar" ? "list" : "calendar";
      render();
    });
    daycountResults?.addEventListener("click", (event) => {
      const button = event.target.closest("[data-country][data-month]");
      if (!button) return;
      const country = button.getAttribute("data-country") || "";
      const monthIndex = Number.parseInt(button.getAttribute("data-month") || "", 10);
      const selected = state.daycountState.monthSelection;
      state.daycountState.monthSelection =
        selected?.country === country && selected?.monthIndex === monthIndex
          ? null
          : { country, monthIndex };
      render();
    });
  }

  async function refresh(token, trips) {
    if (!token || !Array.isArray(trips)) {
      state.legacyTrips = [];
      state.detailsByTripId = new Map();
      render();
      return;
    }
    const entries = await Promise.all(
      trips.map(async (trip) => {
        const [flights, hotels, passengers] = await Promise.all([
          api.listFlights(token, trip.id),
          api.listHotels(token, trip.id),
          api.listPassengers(token, trip.id)
        ]);
        return [trip.id, { flights, hotels, passengers }];
      })
    );
    state.detailsByTripId = new Map(entries);
    state.legacyTrips = buildLegacyTrips(trips, state.detailsByTripId);
    render();
  }

  function reset() {
    state.legacyTrips = [];
    state.detailsByTripId = new Map();
    state.daycountState = { passenger: "", year: new Date().getFullYear(), monthSelection: null, viewMode: "list" };
    state.upcomingState = { passenger: "" };
    state.mapState = { passenger: null, routeKey: null, year: new Date().getFullYear(), showBadges: true, fullscreen: false };
    render();
  }

  return { bind, refresh, reset };
}
