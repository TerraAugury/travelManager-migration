import * as api from "./api.js";
import { bindFlightLookup, fillFlightForm, fillHotelForm, fillTripEditor, readCreateFlightBody, readCreateHotelBody, readCreateTripBody, readUpdateTripBody } from "./forms.js";
import { createInsightsController } from "./insights.js";
import { render } from "./render.js";
import { bindUI, closeOverlay, setOverlayEditMode, syncFlightProviderSelect } from "./ui.js";
import { getState, getFlightProvider, loadFlightProvider, setFlights, setHotels, setPassengers, setSelectedTripId, setTrips, setUser } from "./state.js";

let editingFlightId = null;
let editingHotelId  = null;
const insights = createInsightsController();

function getActiveTrip() { return getState().trips.find((t) => t.id === getState().selectedTripId) || null; }
function clearEventEditors() { editingFlightId = null; editingHotelId = null; fillFlightForm(null); fillHotelForm(null); }
function syncTripEditor() { fillTripEditor(getActiveTrip()); }

async function refreshTrips() {
  const trips = await api.listTrips();
  setTrips(trips);
  if (!getState().selectedTripId && trips.length) setSelectedTripId(trips[0].id);
}
async function refreshTripDetails() {
  const { selectedTripId: tripId } = getState();
  if (!tripId) return setFlights([]), setHotels([]), setPassengers([]);
  const [flights, hotels, passengers] = await Promise.all([
    api.listFlights(tripId),
    api.listHotels(tripId),
    api.listPassengers(tripId)
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
  await insights.refresh(getState().trips);
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
  bindFlightLookup((fn, date) => api.lookupFlight(fn, getFlightProvider(), date));
}

async function bootstrap() {
  loadFlightProvider(); syncFlightProviderSelect();
  const actions = {
    onSelectTrip: async (tripId) => {
      setSelectedTripId(tripId);
      clearEventEditors();
      await refreshTripDetails();
      syncTripEditor();
      render(actions);
    },
    onDeleteTrip: async (tripId) => {
      await api.deleteTrip(tripId);
      clearEventEditors();
      await fullRefresh();
      render(actions);
    },
    onEditFlight: (flightId) => {
      editingFlightId = flightId;
      fillFlightForm(getState().flights.find((f) => f.id === flightId) || null);
      setOverlayEditMode("flight", true);
      render(actions);
    },
    onDeleteFlight: async (flightId) => {
      await api.deleteFlight(getState().selectedTripId, flightId);
      if (editingFlightId === flightId) { fillFlightForm(null); editingFlightId = null; }
      await refreshTripDetails();
      await insights.refresh(getState().trips);
      render(actions);
    },
    onEditHotel: (hotelId) => {
      editingHotelId = hotelId;
      fillHotelForm(getState().hotels.find((h) => h.id === hotelId) || null);
      setOverlayEditMode("hotel", true);
      render(actions);
    },
    onDeleteHotel: async (hotelId) => {
      await api.deleteHotel(getState().selectedTripId, hotelId);
      if (editingHotelId === hotelId) { fillHotelForm(null); editingHotelId = null; }
      await refreshTripDetails();
      await insights.refresh(getState().trips);
      render(actions);
    },
    isEditingFlight: (id) => id === editingFlightId,
    isEditingHotel:  (id) => id === editingHotelId,
    onLogin: async (event) => {
      event.preventDefault();
      const email    = document.getElementById("login-email").value.trim();
      const password = document.getElementById("login-password").value;
      const out = await api.login(email, password);
      setUser(out.user);
      await fullRefresh();
      render(actions);
    },
    onLogout: async () => {
      try { await api.logout(); } catch { /* ignore */ } finally {
        setUser(null); setTrips([]); setSelectedTripId(null);
        setFlights([]); setHotels([]); setPassengers([]); clearEventEditors(); syncTripEditor();
        insights.reset();
        render(actions);
      }
    },
    onCreateTrip: async (event) => {
      event.preventDefault();
      const trip = await api.createTrip(readCreateTripBody());
      event.target.reset();
      if (trip?.id) setSelectedTripId(trip.id);
      await fullRefresh();
      render(actions);
    },
    onUpdateTrip: async (event) => {
      event.preventDefault();
      const tripId = getState().selectedTripId;
      if (!tripId) throw new Error("Select a trip first.");
      await api.updateTrip(tripId, readUpdateTripBody());
      await fullRefresh();
      render(actions);
    },
    onUpsertFlight: async (event) => {
      event.preventDefault();
      const tripId = getState().selectedTripId;
      if (!tripId) throw new Error("Select a trip first.");
      const body = readCreateFlightBody();
      if (editingFlightId) await api.updateFlight(tripId, editingFlightId, body);
      else                 await api.createFlight(tripId, body);
      event.target.reset();
      editingFlightId = null;
      closeOverlay("flight-overlay");
      await refreshTripDetails();
      await insights.refresh(getState().trips);
      render(actions);
    },
    onUpsertHotel: async (event) => {
      event.preventDefault();
      const tripId = getState().selectedTripId;
      if (!tripId) throw new Error("Select a trip first.");
      const body = readCreateHotelBody();
      if (editingHotelId) await api.updateHotel(tripId, editingHotelId, body);
      else                await api.createHotel(tripId, body);
      event.target.reset();
      editingHotelId = null;
      closeOverlay("hotel-overlay");
      await refreshTripDetails();
      await insights.refresh(getState().trips);
      render(actions);
    },
    onSelectTripChange: async (event) => {
      const val = event.target.value;
      if (val === "__new__") return; // ui.js handles form visibility toggle
      return actions.onSelectTrip(val || null);
    },
    onExport: async () => {
      const payload = await api.exportLegacyTrips();
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
      await api.importLegacyTrips(JSON.parse(await file.text()));
      event.target.value = "";
      clearEventEditors();
      await fullRefresh();
      render(actions);
    }
  };

  bindForms(actions);
  bindUI(actions);
  insights.bind();
  render(actions);

  try {
    setUser(await api.me());
    await fullRefresh();
    render(actions);
  } catch {
    render(actions);
  }
}
bootstrap().catch(console.error);
