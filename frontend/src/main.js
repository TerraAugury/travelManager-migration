import * as api from "./api.js";
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

async function refreshTrips() {
  const trips = await api.listTrips(getState().token);
  setTrips(trips);
  if (!getState().selectedTripId && trips.length) {
    setSelectedTripId(trips[0].id);
  }
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
}

function bindForms(actions) {
  const loginForm = document.getElementById("login-form");
  const logoutBtn = document.getElementById("logout-btn");
  const tripForm = document.getElementById("trip-form");
  const flightForm = document.getElementById("flight-form");
  const hotelForm = document.getElementById("hotel-form");
  const tripSelect = document.getElementById("trip-select");
  const exportBtn = document.getElementById("export-btn");
  const importFile = document.getElementById("import-file");

  loginForm.addEventListener("submit", actions.onLogin);
  logoutBtn.addEventListener("click", actions.onLogout);
  tripForm.addEventListener("submit", actions.onCreateTrip);
  flightForm.addEventListener("submit", actions.onCreateFlight);
  hotelForm.addEventListener("submit", actions.onCreateHotel);
  tripSelect.addEventListener("change", actions.onSelectTripChange);
  exportBtn.addEventListener("click", actions.onExport);
  importFile.addEventListener("change", actions.onImport);
}

async function bootstrap() {
  loadToken();
  const actions = {
    onSelectTrip: async (tripId) => {
      setSelectedTripId(tripId);
      await refreshTripDetails();
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
        render("Logged out.", actions);
      }
    },
    onCreateTrip: async (event) => {
      event.preventDefault();
      const name = document.getElementById("trip-name").value.trim();
      const startDate = document.getElementById("trip-start").value || null;
      const endDate = document.getElementById("trip-end").value || null;
      await api.createTrip(getState().token, { name, startDate, endDate });
      event.target.reset();
      await fullRefresh();
      render("Trip created.", actions);
    },
    onCreateFlight: async (event) => {
      event.preventDefault();
      const tripId = getState().selectedTripId;
      if (!tripId) throw new Error("Select a trip first.");
      const body = {
        flightNumber: document.getElementById("flight-number").value.trim(),
        departureAirportCode: document.getElementById("flight-dep-code").value.trim(),
        arrivalAirportCode: document.getElementById("flight-arr-code").value.trim(),
        passengerNames: []
      };
      await api.createFlight(getState().token, tripId, body);
      event.target.reset();
      await refreshTripDetails();
      render("Flight created.", actions);
    },
    onCreateHotel: async (event) => {
      event.preventDefault();
      const tripId = getState().selectedTripId;
      if (!tripId) throw new Error("Select a trip first.");
      const body = {
        hotelName: document.getElementById("hotel-name").value.trim(),
        checkInDate: document.getElementById("hotel-checkin").value,
        checkOutDate: document.getElementById("hotel-checkout").value,
        paxCount: 1,
        paymentType: "prepaid",
        passengerNames: []
      };
      await api.createHotel(getState().token, tripId, body);
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
      const payload = JSON.parse(await file.text());
      await api.importLegacyTrips(getState().token, payload);
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

