import { TOKEN_STORAGE_KEY } from "./config.js";

const state = {
  token: null,
  user: null,
  trips: []
};

export function getState() {
  return state;
}

export function loadToken() {
  state.token = localStorage.getItem(TOKEN_STORAGE_KEY) || null;
  return state.token;
}

export function setToken(token) {
  state.token = token || null;
  if (state.token) {
    localStorage.setItem(TOKEN_STORAGE_KEY, state.token);
  } else {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
  }
}

export function setUser(user) {
  state.user = user || null;
}

export function setTrips(trips) {
  state.trips = Array.isArray(trips) ? trips : [];
}

