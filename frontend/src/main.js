import * as api from "./api.js";
import { fillFlightForm, fillHotelForm, fillTripEditor, readCreateFlightBody, readCreateHotelBody, readCreateTripBody, readUpdateTripBody } from "./forms.js";
import { createInsightsController } from "./insights.js";
import { formatLegacyImportError, formatLegacyImportSuccess, importLegacyFromFile } from "./legacyImportFeedback.js";
import { bindMainForms } from "./mainBindings.js";
import { clearOfflineData, getOfflineData, setOfflineData } from "./offlineCache.js";
import { createOfflineRefresh } from "./offlineRefresh.js";
import { requireOnline, syncOfflineUi } from "./offlineUi.js";
import "./shareOverlay.js";
import { render } from "./render.js";
import { bindUI, closeOverlay, setOverlayEditMode, syncFlightProviderSelect } from "./ui.js";
import { getState, getFlightProvider, loadFlightProvider, loadToken, setFlights, setHotels, setPassengers, setSelectedTripId, setToken, setTrips, setUser } from "./state.js";
let editingFlightId = null;
let editingHotelId  = null;
let isOffline = false;
const insights = createInsightsController();
function clearEventEditors() { editingFlightId = null; editingHotelId = null; fillFlightForm(null); fillHotelForm(null); }
function syncTripEditor() { fillTripEditor(getState().trips.find((t) => t.id === getState().selectedTripId) || null); }
function renderApp(actions) { render(actions); syncOfflineUi(isOffline); }
function setOffline(next) { isOffline = Boolean(next); syncOfflineUi(isOffline); }
const offline = createOfflineRefresh({ api, getState, setTrips, setSelectedTripId, setFlights, setHotels, setPassengers, setOfflineData, getOfflineData, setOffline });
const { refreshTrips, refreshTripDetails } = offline;
async function fullRefresh() {
  await refreshTrips();
  await refreshTripDetails();
  if (!getState().flights.some((x) => x.id === editingFlightId)) editingFlightId = null;
  if (!getState().hotels.some((x) => x.id === editingHotelId))   editingHotelId  = null;
  await insights.refresh(getState().token, getState().trips);
  syncTripEditor();
}
async function bootstrap() {
  loadToken(); loadFlightProvider(); syncFlightProviderSelect();
  const actions = {
    onSelectTrip: async (tripId) => {
      setSelectedTripId(tripId);
      clearEventEditors();
      await refreshTripDetails();
      syncTripEditor();
      renderApp(actions);
    },
    onDeleteTrip: async (tripId) => {
      if (!requireOnline(isOffline)) return;
      await api.deleteTrip(getState().token, tripId);
      clearEventEditors();
      await fullRefresh();
      renderApp(actions);
    },
    onEditFlight: (flightId) => {
      editingFlightId = flightId;
      fillFlightForm(getState().flights.find((f) => f.id === flightId) || null);
      setOverlayEditMode("flight", true);
      renderApp(actions);
    },
    onDeleteFlight: async (flightId) => {
      if (!requireOnline(isOffline)) return;
      await api.deleteFlight(getState().token, getState().selectedTripId, flightId);
      if (editingFlightId === flightId) { fillFlightForm(null); editingFlightId = null; }
      await refreshTripDetails();
      await insights.refresh(getState().token, getState().trips);
      renderApp(actions);
    },
    onEditHotel: (hotelId) => {
      editingHotelId = hotelId;
      fillHotelForm(getState().hotels.find((h) => h.id === hotelId) || null);
      setOverlayEditMode("hotel", true);
      renderApp(actions);
    },
    onDeleteHotel: async (hotelId) => {
      if (!requireOnline(isOffline)) return;
      await api.deleteHotel(getState().token, getState().selectedTripId, hotelId);
      if (editingHotelId === hotelId) { fillHotelForm(null); editingHotelId = null; }
      await refreshTripDetails();
      await insights.refresh(getState().token, getState().trips);
      renderApp(actions);
    },
    isEditingFlight: (id) => id === editingFlightId,
    isEditingHotel:  (id) => id === editingHotelId,
    onLogin: async (event) => {
      event.preventDefault();
      const email    = document.getElementById("login-email").value.trim();
      const password = document.getElementById("login-password").value;
      const out = await api.login(email, password);
      setToken(out.token);
      setUser(out.user);
      setOffline(false);
      await setOfflineData("user", out.user);
      await fullRefresh();
      renderApp(actions);
    },
    onLogout: async () => {
      try { if (getState().token) await api.logout(getState().token); } finally {
        await clearOfflineData();
        setOffline(false);
        setToken(null); setUser(null); setTrips([]); setSelectedTripId(null);
        setFlights([]); setHotels([]); setPassengers([]); clearEventEditors(); syncTripEditor();
        insights.reset();
        renderApp(actions);
      }
    },
    onCreateTrip: async (event) => {
      event.preventDefault();
      if (!requireOnline(isOffline)) return;
      const trip = await api.createTrip(getState().token, readCreateTripBody());
      event.target.reset();
      if (trip?.id) setSelectedTripId(trip.id);
      await fullRefresh();
      renderApp(actions);
    },
    onUpdateTrip: async (event) => {
      event.preventDefault();
      if (!requireOnline(isOffline)) return;
      const tripId = getState().selectedTripId;
      if (!tripId) throw new Error("Select a trip first.");
      await api.updateTrip(getState().token, tripId, readUpdateTripBody());
      await fullRefresh();
      renderApp(actions);
    },
    onUpsertFlight: async (event) => {
      event.preventDefault();
      if (!requireOnline(isOffline)) return;
      const tripId = getState().selectedTripId;
      if (!tripId) throw new Error("Select a trip first.");
      const body = readCreateFlightBody();
      if (editingFlightId && (document.getElementById("flight-overlay-title")?.textContent || "").startsWith("Edit")) await api.updateFlight(getState().token, tripId, editingFlightId, body);
      else                 await api.createFlight(getState().token, tripId, body);
      event.target.reset();
      editingFlightId = null;
      closeOverlay("flight-overlay");
      await refreshTripDetails();
      await insights.refresh(getState().token, getState().trips);
      renderApp(actions);
    },
    onUpsertHotel: async (event) => {
      event.preventDefault();
      if (!requireOnline(isOffline)) return;
      const tripId = getState().selectedTripId;
      if (!tripId) throw new Error("Select a trip first.");
      const body = readCreateHotelBody();
      if (editingHotelId) await api.updateHotel(getState().token, tripId, editingHotelId, body);
      else                await api.createHotel(getState().token, tripId, body);
      event.target.reset();
      editingHotelId = null;
      closeOverlay("hotel-overlay");
      await refreshTripDetails();
      await insights.refresh(getState().token, getState().trips);
      renderApp(actions);
    },
    onSelectTripChange: async (event) => {
      const val = event.target.value;
      if (val === "__new__") return; // ui.js handles form visibility toggle
      return actions.onSelectTrip(val || null);
    },
    onExport: async () => {
      if (!requireOnline(isOffline)) return;
      const payload = await api.exportLegacyTrips(getState().token);
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
      const url  = URL.createObjectURL(blob);
      const link = Object.assign(document.createElement("a"), { href: url, download: "trips-legacy-export.json" });
      document.body.appendChild(link); link.click(); document.body.removeChild(link);
      URL.revokeObjectURL(url);
    },
    onImport: async (event) => {
      if (!requireOnline(isOffline)) return;
      const file = event.target.files?.[0];
      try {
        const summary = await importLegacyFromFile(file, getState().token, api.importLegacyTrips);
        if (!summary) return;
        clearEventEditors();
        await fullRefresh();
        renderApp(actions);
        window.alert(formatLegacyImportSuccess(summary));
      } catch (error) {
        window.alert(formatLegacyImportError(error));
      } finally {
        event.target.value = "";
      }
    }
  };
  bindMainForms(actions, { api, getState, getFlightProvider });
  bindUI(actions);
  insights.bind(actions);
  renderApp(actions);
  if (!getState().token) return;
  try {
    const user = await api.me(getState().token);
    setUser(user);
    setOffline(false);
    await setOfflineData("user", user);
    await fullRefresh();
    renderApp(actions);
  } catch {
    const cachedUser = await getOfflineData("user");
    if (!cachedUser) return actions.onLogout();
    setUser(cachedUser);
    setOffline(true);
    await fullRefresh();
    renderApp(actions);
  }
}
bootstrap().catch(console.error);
