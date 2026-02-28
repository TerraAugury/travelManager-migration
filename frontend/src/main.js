import * as api from "./api.js";
import { fillFlightForm, fillHotelForm, fillTripEditor, readCreateFlightBody, readCreateHotelBody, readCreateTripBody, readUpdateTripBody } from "./forms.js";
import { createInsightsController } from "./insights.js";
import { render } from "./render.js";
import { getState, loadToken, setFlights, setHotels, setPassengers, setSelectedTripId, setToken, setTrips, setUser } from "./state.js";

let editingFlightId = null;
let editingHotelId = null;
const insights = createInsightsController();

function getActiveTrip() {
  return getState().trips.find((trip) => trip.id === getState().selectedTripId) || null;
}
function clearEventEditors() {
  editingFlightId = null;
  editingHotelId = null;
  fillFlightForm(null);
  fillHotelForm(null);
}
function syncTripEditor() {
  fillTripEditor(getActiveTrip());
}
async function refreshTrips() {
  const trips = await api.listTrips(getState().token);
  setTrips(trips);
  if (!getState().selectedTripId && trips.length) setSelectedTripId(trips[0].id);
}
async function refreshTripDetails() {
  const tripId = getState().selectedTripId;
  if (!tripId) return setFlights([]), setHotels([]), setPassengers([]);
  const token = getState().token;
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
  if (!getState().hotels.some((x) => x.id === editingHotelId)) editingHotelId = null;
  await insights.refresh(getState().token, getState().trips);
  syncTripEditor();
}
function bindForms(actions) {
  document.getElementById("login-form").addEventListener("submit", actions.onLogin);
  document.getElementById("logout-btn").addEventListener("click", actions.onLogout);
  document.getElementById("trip-form").addEventListener("submit", actions.onCreateTrip);
  document.getElementById("trip-edit-form").addEventListener("submit", actions.onUpdateTrip);
  document.getElementById("flight-form").addEventListener("submit", actions.onUpsertFlight);
  document.getElementById("hotel-form").addEventListener("submit", actions.onUpsertHotel);
  document.getElementById("trip-select").addEventListener("change", actions.onSelectTripChange);
  document.getElementById("export-btn").addEventListener("click", actions.onExport);
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
      render(`Selected trip ${tripId}.`, actions);
    },
    onDeleteTrip: async (tripId) => {
      await api.deleteTrip(getState().token, tripId);
      clearEventEditors();
      await fullRefresh();
      render("Trip deleted.", actions);
    },
    onEditFlight: (flightId) => {
      editingFlightId = flightId;
      fillFlightForm(getState().flights.find((f) => f.id === flightId) || null);
      render(`Editing flight ${flightId}. Submit form to save.`, actions);
    },
    onDeleteFlight: async (flightId) => {
      await api.deleteFlight(getState().token, getState().selectedTripId, flightId);
      if (editingFlightId === flightId) fillFlightForm(null), editingFlightId = null;
      await refreshTripDetails();
      await insights.refresh(getState().token, getState().trips);
      render("Flight deleted.", actions);
    },
    onEditHotel: (hotelId) => {
      editingHotelId = hotelId;
      fillHotelForm(getState().hotels.find((h) => h.id === hotelId) || null);
      render(`Editing hotel ${hotelId}. Submit form to save.`, actions);
    },
    onDeleteHotel: async (hotelId) => {
      await api.deleteHotel(getState().token, getState().selectedTripId, hotelId);
      if (editingHotelId === hotelId) fillHotelForm(null), editingHotelId = null;
      await refreshTripDetails();
      await insights.refresh(getState().token, getState().trips);
      render("Hotel deleted.", actions);
    },
    isEditingFlight: (id) => id === editingFlightId,
    isEditingHotel: (id) => id === editingHotelId,
    onLogin: async (event) => {
      event.preventDefault();
      const email = document.getElementById("login-email").value.trim();
      const password = document.getElementById("login-password").value;
      const out = await api.login(email, password);
      setToken(out.token);
      setUser(out.user);
      await fullRefresh();
      render("Login successful.", actions);
    },
    onLogout: async () => {
      try {
        if (getState().token) await api.logout(getState().token);
      } finally {
        setToken(null), setUser(null), setTrips([]), setSelectedTripId(null);
        setFlights([]), setHotels([]), setPassengers([]), clearEventEditors(), syncTripEditor();
        insights.reset();
        render("Logged out.", actions);
      }
    },
    onCreateTrip: async (event) => {
      event.preventDefault();
      await api.createTrip(getState().token, readCreateTripBody());
      event.target.reset();
      await fullRefresh();
      render("Trip created.", actions);
    },
    onUpdateTrip: async (event) => {
      event.preventDefault();
      const tripId = getState().selectedTripId;
      if (!tripId) throw new Error("Select a trip first.");
      await api.updateTrip(getState().token, tripId, readUpdateTripBody());
      await fullRefresh();
      render("Trip updated.", actions);
    },
    onUpsertFlight: async (event) => {
      event.preventDefault();
      const tripId = getState().selectedTripId;
      if (!tripId) throw new Error("Select a trip first.");
      const body = readCreateFlightBody();
      if (editingFlightId) await api.updateFlight(getState().token, tripId, editingFlightId, body);
      else await api.createFlight(getState().token, tripId, body);
      event.target.reset();
      editingFlightId = null;
      await refreshTripDetails();
      await insights.refresh(getState().token, getState().trips);
      render("Flight saved.", actions);
    },
    onUpsertHotel: async (event) => {
      event.preventDefault();
      const tripId = getState().selectedTripId;
      if (!tripId) throw new Error("Select a trip first.");
      const body = readCreateHotelBody();
      if (editingHotelId) await api.updateHotel(getState().token, tripId, editingHotelId, body);
      else await api.createHotel(getState().token, tripId, body);
      event.target.reset();
      editingHotelId = null;
      await refreshTripDetails();
      await insights.refresh(getState().token, getState().trips);
      render("Hotel saved.", actions);
    },
    onSelectTripChange: async (event) => actions.onSelectTrip(event.target.value || null),
    onExport: async () => {
      const payload = await api.exportLegacyTrips(getState().token);
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "trips-legacy-export.json";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      render("Legacy export downloaded.", actions);
    },
    onImport: async (event) => {
      const file = event.target.files?.[0];
      if (!file) return;
      await api.importLegacyTrips(getState().token, JSON.parse(await file.text()));
      event.target.value = "";
      clearEventEditors();
      await fullRefresh();
      render("Import completed.", actions);
    }
  };
  bindForms(actions);
  insights.bind();
  render("Bootstrapping...", actions);
  if (!getState().token) return;
  try {
    setUser(await api.me(getState().token));
    await fullRefresh();
    render("Session restored.", actions);
  } catch {
    await actions.onLogout();
    render("Previous session expired. Please sign in.", actions);
  }
}
bootstrap().catch((error) => render(`Fatal: ${error.message}`));
