import * as api from "./api.js";
import { fillFlightForm, fillHotelForm, fillTripEditor, readCreateFlightBody, readCreateHotelBody, readCreateTripBody, readUpdateTripBody } from "./forms.js";
import { createInsightsController } from "./insights.js";
import { render } from "./render.js";
import { bindUI, closeOverlay, setOverlayEditMode } from "./ui.js";
import { getState, loadToken, setFlights, setHotels, setPassengers, setSelectedTripId, setToken, setTrips, setUser } from "./state.js";

let editingFlightId = null;
let editingHotelId  = null;
const insights = createInsightsController();

function getActiveTrip() { return getState().trips.find((t) => t.id === getState().selectedTripId) || null; }
function clearEventEditors() { editingFlightId = null; editingHotelId = null; fillFlightForm(null); fillHotelForm(null); }
function syncTripEditor() { fillTripEditor(getActiveTrip()); }

async function refreshTrips() {
  const trips = await api.listTrips(getState().token);
  setTrips(trips);
  if (!getState().selectedTripId && trips.length) setSelectedTripId(trips[0].id);
}
async function refreshTripDetails() {
  const { selectedTripId: tripId, token } = getState();
  if (!tripId) return setFlights([]), setHotels([]), setPassengers([]);
  const [flights, hotels, passengers] = await Promise.all([
    api.listFlights(token, tripId),
    api.listHotels(token, tripId),
    api.listPassengers(token, tripId)
  ]);
  setFlights(flights);
  setHotels(hotels);
  setPassengers(passengers);
}
async function fullRefresh() {
  await refreshTrips();
  await refreshTripDetails();
  if (!getState().flights.some((x) => x.id === editingFlightId)) editingFlightId = null;
  if (!getState().hotels.some((x) => x.id === editingHotelId))   editingHotelId  = null;
  await insights.refresh(getState().token, getState().trips);
  syncTripEditor();
}

function bindForms(actions) {
  document.getElementById("login-form").addEventListener("submit", actions.onLogin);
  document.getElementById("logout-btn").addEventListener("click",  actions.onLogout);
  document.getElementById("trip-form").addEventListener("submit",  actions.onCreateTrip);
  document.getElementById("trip-edit-form").addEventListener("submit", actions.onUpdateTrip);
  document.getElementById("flight-form").addEventListener("submit", actions.onUpsertFlight);
  document.getElementById("hotel-form").addEventListener("submit",  actions.onUpsertHotel);
  document.getElementById("trip-select").addEventListener("change", actions.onSelectTripChange);
  document.getElementById("export-btn").addEventListener("click",   actions.onExport);
  document.getElementById("import-file").addEventListener("change", actions.onImport);
}

async function bootstrap() {
  loadToken();
  const actions = {
    onSelectTrip: async (tripId) => {
      setSelectedTripId(tripId);
      clearEventEditors();
      await refreshTripDetails();
      syncTripEditor();
      render(null, actions);
    },
    onDeleteTrip: async (tripId) => {
      await api.deleteTrip(getState().token, tripId);
      clearEventEditors();
      await fullRefresh();
      render(null, actions);
    },
    onEditFlight: (flightId) => {
      editingFlightId = flightId;
      fillFlightForm(getState().flights.find((f) => f.id === flightId) || null);
      setOverlayEditMode("flight", true);
      render(null, actions);
    },
    onDeleteFlight: async (flightId) => {
      await api.deleteFlight(getState().token, getState().selectedTripId, flightId);
      if (editingFlightId === flightId) { fillFlightForm(null); editingFlightId = null; }
      await refreshTripDetails();
      await insights.refresh(getState().token, getState().trips);
      render(null, actions);
    },
    onEditHotel: (hotelId) => {
      editingHotelId = hotelId;
      fillHotelForm(getState().hotels.find((h) => h.id === hotelId) || null);
      setOverlayEditMode("hotel", true);
      render(null, actions);
    },
    onDeleteHotel: async (hotelId) => {
      await api.deleteHotel(getState().token, getState().selectedTripId, hotelId);
      if (editingHotelId === hotelId) { fillHotelForm(null); editingHotelId = null; }
      await refreshTripDetails();
      await insights.refresh(getState().token, getState().trips);
      render(null, actions);
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
      await fullRefresh();
      render(null, actions);
    },
    onLogout: async () => {
      try { if (getState().token) await api.logout(getState().token); } finally {
        setToken(null); setUser(null); setTrips([]); setSelectedTripId(null);
        setFlights([]); setHotels([]); setPassengers([]); clearEventEditors(); syncTripEditor();
        insights.reset();
        render(null, actions);
      }
    },
    onCreateTrip: async (event) => {
      event.preventDefault();
      const trip = await api.createTrip(getState().token, readCreateTripBody());
      event.target.reset();
      if (trip?.id) setSelectedTripId(trip.id);
      await fullRefresh();
      render(null, actions);
    },
    onUpdateTrip: async (event) => {
      event.preventDefault();
      const tripId = getState().selectedTripId;
      if (!tripId) throw new Error("Select a trip first.");
      await api.updateTrip(getState().token, tripId, readUpdateTripBody());
      await fullRefresh();
      render(null, actions);
    },
    onUpsertFlight: async (event) => {
      event.preventDefault();
      const tripId = getState().selectedTripId;
      if (!tripId) throw new Error("Select a trip first.");
      const body = readCreateFlightBody();
      if (editingFlightId) await api.updateFlight(getState().token, tripId, editingFlightId, body);
      else                 await api.createFlight(getState().token, tripId, body);
      event.target.reset();
      editingFlightId = null;
      closeOverlay("flight-overlay");
      await refreshTripDetails();
      await insights.refresh(getState().token, getState().trips);
      render(null, actions);
    },
    onUpsertHotel: async (event) => {
      event.preventDefault();
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
      render(null, actions);
    },
    onSelectTripChange: async (event) => {
      const val = event.target.value;
      if (val === "__new__") return; // ui.js handles form visibility toggle
      return actions.onSelectTrip(val || null);
    },
    onExport: async () => {
      const payload = await api.exportLegacyTrips(getState().token);
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
      const url  = URL.createObjectURL(blob);
      const link = Object.assign(document.createElement("a"), { href: url, download: "trips-legacy-export.json" });
      document.body.appendChild(link); link.click(); document.body.removeChild(link);
      URL.revokeObjectURL(url);
    },
    onImport: async (event) => {
      const file = event.target.files?.[0];
      if (!file) return;
      if (file.size > 5 * 1024 * 1024) throw new Error("Import file too large (max 5 MB).");
      await api.importLegacyTrips(getState().token, JSON.parse(await file.text()));
      event.target.value = "";
      clearEventEditors();
      await fullRefresh();
      render(null, actions);
    }
  };

  bindForms(actions);
  bindUI(actions);
  insights.bind();
  render(null, actions);

  if (!getState().token) return;
  try {
    setUser(await api.me(getState().token));
    await fullRefresh();
    render(null, actions);
  } catch {
    await actions.onLogout();
  }
}
bootstrap().catch(console.error);
