import * as api from "./api.js";
import {
  fillTripEditor,
  readCreateFlightBody,
  readCreateHotelBody,
  readCreateTripBody,
  readUpdateTripBody
} from "./forms.js";
import { render } from "./render.js";
import {
  getState,
  loadToken,
  setFlights,
  setHotels,
  setPassengers,
  setSelectedTripId,
  setToken,
  setTrips,
  setUser
} from "./state.js";

function getActiveTrip() {
  return getState().trips.find((trip) => trip.id === getState().selectedTripId) || null;
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
  if (!tripId) {
    setFlights([]);
    setHotels([]);
    setPassengers([]);
    return;
  }
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
  syncTripEditor();
}

function bindForms(actions) {
  document.getElementById("login-form").addEventListener("submit", actions.onLogin);
  document.getElementById("logout-btn").addEventListener("click", actions.onLogout);
  document.getElementById("trip-form").addEventListener("submit", actions.onCreateTrip);
  document.getElementById("trip-edit-form").addEventListener("submit", actions.onUpdateTrip);
  document.getElementById("flight-form").addEventListener("submit", actions.onCreateFlight);
  document.getElementById("hotel-form").addEventListener("submit", actions.onCreateHotel);
  document.getElementById("trip-select").addEventListener("change", actions.onSelectTripChange);
  document.getElementById("export-btn").addEventListener("click", actions.onExport);
  document.getElementById("import-file").addEventListener("change", actions.onImport);
}

async function bootstrap() {
  loadToken();
  const actions = {
    onSelectTrip: async (tripId) => {
      setSelectedTripId(tripId);
      await refreshTripDetails();
      syncTripEditor();
      render(`Selected trip ${tripId}.`, actions);
    },
    onDeleteTrip: async (tripId) => {
      await api.deleteTrip(getState().token, tripId);
      await fullRefresh();
      render("Trip deleted.", actions);
    },
    onDeleteFlight: async (flightId) => {
      await api.deleteFlight(getState().token, getState().selectedTripId, flightId);
      await refreshTripDetails();
      render("Flight deleted.", actions);
    },
    onDeleteHotel: async (hotelId) => {
      await api.deleteHotel(getState().token, getState().selectedTripId, hotelId);
      await refreshTripDetails();
      render("Hotel deleted.", actions);
    },
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
        setToken(null);
        setUser(null);
        setTrips([]);
        setSelectedTripId(null);
        setFlights([]);
        setHotels([]);
        setPassengers([]);
        syncTripEditor();
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
    onCreateFlight: async (event) => {
      event.preventDefault();
      const tripId = getState().selectedTripId;
      if (!tripId) throw new Error("Select a trip first.");
      await api.createFlight(getState().token, tripId, readCreateFlightBody());
      event.target.reset();
      await refreshTripDetails();
      render("Flight created.", actions);
    },
    onCreateHotel: async (event) => {
      event.preventDefault();
      const tripId = getState().selectedTripId;
      if (!tripId) throw new Error("Select a trip first.");
      await api.createHotel(getState().token, tripId, readCreateHotelBody());
      event.target.reset();
      await refreshTripDetails();
      render("Hotel created.", actions);
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
      await fullRefresh();
      render("Import completed.", actions);
    }
  };

  bindForms(actions);
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
