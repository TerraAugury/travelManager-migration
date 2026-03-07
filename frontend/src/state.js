import { FLIGHT_PROVIDER_STORAGE_KEY } from "./config.js";

const state = {
  user: null,
  trips: [],
  selectedTripId: null,
  flights: [],
  hotels: [],
  passengers: [],
  flightProvider: "aviationstack"
};

function getLocalStorage() {
  try {
    if (typeof window === "undefined") return null;
    return window.localStorage || null;
  } catch {
    return null;
  }
}

export function getState() {
  return state;
}

export function setUser(user) {
  state.user = user || null;
}

export function setTrips(trips) {
  state.trips = Array.isArray(trips) ? trips : [];
  if (state.selectedTripId && !state.trips.find((t) => t.id === state.selectedTripId)) {
    state.selectedTripId = null;
    state.flights = [];
    state.hotels = [];
    state.passengers = [];
  }
}

export function setSelectedTripId(tripId) {
  state.selectedTripId = tripId || null;
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

export function loadFlightProvider() {
  const raw = getLocalStorage()?.getItem(FLIGHT_PROVIDER_STORAGE_KEY) || "";
  state.flightProvider = raw === "aerodatabox" ? "aerodatabox" : "aviationstack";
  return state.flightProvider;
}

export function setFlightProvider(provider) {
  const value = provider === "aerodatabox" ? "aerodatabox" : "aviationstack";
  state.flightProvider = value;
  getLocalStorage()?.setItem(FLIGHT_PROVIDER_STORAGE_KEY, value);
}

export function getFlightProvider() {
  return state.flightProvider;
}
