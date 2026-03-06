import { TOKEN_STORAGE_KEY, FLIGHT_PROVIDER_STORAGE_KEY } from "./config.js";

const state = {
  token: null,
  user: null,
  trips: [],
  selectedTripId: null,
  flights: [],
  hotels: [],
  passengers: [],
  showPastTrips: false,
  flightProvider: "aerodatabox"
};

function getLocalStorage() {
  try {
    if (typeof window === "undefined") return null;
    return window.localStorage || null;
  } catch {
    return null;
  }
}

function getSessionStorage() {
  try {
    if (typeof window === "undefined") return null;
    return window.sessionStorage || null;
  } catch {
    return null;
  }
}

export function getState() {
  return state;
}

export function loadToken() {
  const storage = getSessionStorage();
  state.token = storage?.getItem(TOKEN_STORAGE_KEY) || null;
  return state.token;
}

export function setToken(token) {
  const storage = getSessionStorage();
  state.token = token || null;
  if (state.token) {
    storage?.setItem(TOKEN_STORAGE_KEY, state.token);
  } else {
    storage?.removeItem(TOKEN_STORAGE_KEY);
  }
}

export function setUser(user) {
  state.user = user || null;
}

export function setTrips(trips) {
  state.trips = Array.isArray(trips) ? trips : [];
  if (!state.selectedTripId) return;
  const selectedTrip = state.trips.find((trip) => trip.id === state.selectedTripId);
  if (!selectedTrip || (!state.showPastTrips && isPastTrip(selectedTrip))) {
    state.selectedTripId = getVisibleTrips(state.trips)[0]?.id || null;
    if (!state.selectedTripId) {
      state.flights = [];
      state.hotels = [];
      state.passengers = [];
    }
  }
}

export function setSelectedTripId(tripId) {
  const requested = tripId || null;
  if (!requested) {
    state.selectedTripId = null;
    state.flights = [];
    state.hotels = [];
    state.passengers = [];
    return;
  }
  const requestedTrip = state.trips.find((trip) => trip.id === requested);
  if (!requestedTrip) {
    state.selectedTripId = null;
    state.flights = [];
    state.hotels = [];
    state.passengers = [];
    return;
  }
  if (state.showPastTrips || !isPastTrip(requestedTrip)) {
    state.selectedTripId = requested;
    return;
  }
  state.selectedTripId = getVisibleTrips(state.trips)[0]?.id || null;
  if (!state.selectedTripId) {
    state.flights = [];
    state.hotels = [];
    state.passengers = [];
  }
}

export function setFlights(flights) {
  state.flights = Array.isArray(flights) ? flights : [];
}

export function setHotels(hotels) {
  state.hotels = Array.isArray(hotels) ? hotels : [];
}

export function setPassengers(passengers) {
  state.passengers = Array.isArray(passengers) ? passengers : [];
}

function toIsoDay(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  const direct = /^(\d{4}-\d{2}-\d{2})/.exec(raw);
  if (direct) return direct[1];
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return "";
  const year = String(d.getFullYear());
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function localTodayIso() {
  return toIsoDay(new Date());
}

export function isPastTrip(trip, referenceDate = localTodayIso()) {
  const lastDay = toIsoDay(trip?.end_date) || toIsoDay(trip?.start_date);
  if (!lastDay || !referenceDate) return false;
  return lastDay < referenceDate;
}

export function getVisibleTrips(trips = state.trips) {
  const rows = Array.isArray(trips) ? trips : [];
  if (state.showPastTrips) return rows;
  return rows.filter((trip) => !isPastTrip(trip));
}

export function setShowPastTrips(showPastTrips) {
  state.showPastTrips = !!showPastTrips;
}

export function getShowPastTrips() {
  return state.showPastTrips;
}

export function loadFlightProvider() {
  const raw = getLocalStorage()?.getItem(FLIGHT_PROVIDER_STORAGE_KEY) || "";
  state.flightProvider = raw === "aviationstack" || raw === "flightera" ? raw : "aerodatabox";
  return state.flightProvider;
}

export function setFlightProvider(provider) {
  const value = provider === "aviationstack" || provider === "flightera" ? provider : "aerodatabox";
  state.flightProvider = value;
  getLocalStorage()?.setItem(FLIGHT_PROVIDER_STORAGE_KEY, value);
}

export function getFlightProvider() {
  return state.flightProvider;
}
