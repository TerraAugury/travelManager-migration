import * as api from "./api.js";
import { getOfflineData, setOfflineData } from "./offlineCache.js";
import { getState } from "./state.js";
import { syncCustomControls } from "./customControls.js";
function esc(value) { return String(value ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"); }
function getElements() {
  const ids = ["daycount-passenger", "daycount-year-list", "daycount-results", "daycount-empty", "daycount-upcoming-list", "daycount-upcoming-empty", "upcoming-passenger", "upcoming-list", "upcoming-empty", "today-empty", "today-flights", "map-passenger", "map-route", "map-year-list", "map-empty", "map-warning", "map-canvas", "map-fullscreen-btn", "map-badges-btn", "trip-stats-container", "trip-pax-container", "trip-details-empty"];
  return ids.reduce((acc, id) => ({ ...acc, [id]: document.getElementById(id) }), {});
}
export function createInsightsController() {
  const noop = () => {};
  const state = {
    els: null,
    legacyTrips: [],
    daycountState: { passenger: "", year: new Date().getFullYear(), monthSelection: null, viewMode: "list" },
    upcomingState: { passenger: "" },
    mapState: { passenger: null, routeKey: null, year: new Date().getFullYear(), showBadges: true, fullscreen: false, nextFlightOnly: false },
    mapController: { renderMapScreen: noop, setMapFullscreen: noop },
    renderDaycountView: noop,
    renderUpcomingScreen: noop,
    renderTodayScreen: noop,
    renderAllTripsDetails: noop,
    upcomingActions: { onEditFlight: noop, onDeleteFlight: noop },
    modulesReady: false,
    modulesPromise: null
  };
  async function importScriptModule(path) {
    try {
      const response = await fetch(path, { cache: "no-store" });
      const contentType = String(response.headers.get("content-type") || "").toLowerCase();
      if (!response.ok || !contentType.includes("javascript")) return null;
      return import(path);
    } catch {
      return null;
    }
  }
  function ensureModules() {
    if (state.modulesReady) return Promise.resolve();
    if (state.modulesPromise) return state.modulesPromise;
    state.modulesPromise = (async () => {
      const [daycountMod, mapMod, upcomingMod, todayMod, tripStatsMod] = await Promise.all([
        importScriptModule("/src/insightsModules/daycountScreen.js"),
        importScriptModule("/src/insightsModules/mapScreen.js"),
        importScriptModule("/src/insightsModules/upcomingScreen.js"),
        importScriptModule("/src/insightsModules/todayScreen.js"),
        importScriptModule("/src/insightsModules/tripStats.js")
      ]);
      if (typeof daycountMod?.renderDaycountView === "function") {
        state.renderDaycountView = daycountMod.renderDaycountView;
      }
      if (typeof mapMod?.createMapScreenController === "function") {
        state.mapController = mapMod.createMapScreenController();
      }
      if (typeof upcomingMod?.renderUpcomingScreen === "function") {
        state.renderUpcomingScreen = upcomingMod.renderUpcomingScreen;
      }
      if (typeof todayMod?.renderTodayScreen === "function") state.renderTodayScreen = todayMod.renderTodayScreen;
      if (typeof tripStatsMod?.renderAllTripsDetails === "function") {
        state.renderAllTripsDetails = tripStatsMod.renderAllTripsDetails;
      }
      state.modulesReady = true;
    })();
    return state.modulesPromise;
  }
  function render() {
    if (!state.els?.["upcoming-list"]) return;
    state.renderUpcomingScreen({ trips: state.legacyTrips, upcomingState: state.upcomingState, els: state.els, actions: state.upcomingActions });
    state.renderDaycountView({ trips: state.legacyTrips, daycountState: state.daycountState, els: state.els });
    state.renderAllTripsDetails(state.legacyTrips, state.els["trip-stats-container"], state.els["trip-pax-container"], state.els["trip-details-empty"]);
    state.mapController.renderMapScreen({ trips: state.legacyTrips, mapState: state.mapState, els: state.els });
    const nextBtn = document.getElementById("map-next-flight-btn");
    if (nextBtn) { nextBtn.classList.toggle("hidden", !state.mapState.passenger); nextBtn.textContent = state.mapState.nextFlightOnly ? "All flights" : "Next flight"; nextBtn.setAttribute("aria-pressed", state.mapState.nextFlightOnly ? "true" : "false"); }
    if (document.getElementById("screen-today")?.classList.contains("active-screen")) {
      void state.renderTodayScreen({ els: state.els, token: getState().token, api, esc, trips: state.legacyTrips });
    }
    syncCustomControls();
  }
  function bind(actions = {}) {
    state.els = getElements();
    state.upcomingActions = {
      onEditFlight: async (tripId, flightId) => {
        if (!tripId || !flightId) return;
        if (getState().selectedTripId !== tripId) await actions.onSelectTrip?.(tripId);
        actions.onEditFlight?.(flightId);
      },
      onDeleteFlight: async (tripId, flightId) => {
        if (!tripId || !flightId) return;
        if (getState().selectedTripId !== tripId) await actions.onSelectTrip?.(tripId);
        await actions.onDeleteFlight?.(flightId);
      }
    };
    const upcomingSelect = state.els["upcoming-passenger"];
    const daycountSelect = state.els["daycount-passenger"];
    const mapPassenger = state.els["map-passenger"];
    const mapRoute = state.els["map-route"];
    const mapYearList = state.els["map-year-list"];
    const mapFullscreen = state.els["map-fullscreen-btn"];
    const mapBadges = state.els["map-badges-btn"];
    const mapNext = document.getElementById("map-next-flight-btn");
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
      if (!state.mapState.passenger) state.mapState.nextFlightOnly = false;
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
    mapNext?.addEventListener("click", () => {
      if (!state.mapState.passenger) return;
      state.mapState.nextFlightOnly = !state.mapState.nextFlightOnly;
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
    document.addEventListener("click", (event) => {
      const btn = event.target instanceof Element ? event.target.closest(".tab-btn,.nav-btn") : null;
      if (btn?.getAttribute("data-screen") === "today") setTimeout(render, 0);
    });
    void ensureModules().then(render);
  }
  async function refresh(token, trips) {
    await ensureModules();
    if (!token || !Array.isArray(trips)) {
      state.legacyTrips = [];
      render();
      return;
    }
    let exported = null;
    try {
      exported = await api.exportLegacyTrips(token);
      await setOfflineData("legacyTrips", exported);
    } catch {
      exported = await getOfflineData("legacyTrips");
    }
    state.legacyTrips = Array.isArray(exported) ? exported : [];
    render();
  }
  function reset() {
    state.legacyTrips = [];
    state.daycountState = { passenger: "", year: new Date().getFullYear(), monthSelection: null, viewMode: "list" };
    state.upcomingState = { passenger: "" };
    state.mapState = { passenger: null, routeKey: null, year: new Date().getFullYear(), showBadges: true, fullscreen: false, nextFlightOnly: false };
    render();
  }
  return { bind, refresh, reset };
}
