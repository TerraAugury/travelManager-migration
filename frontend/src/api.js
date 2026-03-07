import { API_BASE } from "./config.js";

async function request(path, options = {}, token = null) {
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {})
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
    credentials: "include"
  });

  const text = await response.text();
  const body = text ? JSON.parse(text) : null;
  if (!response.ok) {
    const message = body?.error || `HTTP ${response.status}`;
    const error = new Error(message);
    error.status = response.status;
    error.body = body;
    error.resetAt = Number(body?.resetAt || 0) || null;
    throw error;
  }
  return body;
}

export async function login(email, password) {
  return request("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password })
  });
}

export async function me(token) {
  return request("/auth/me", {}, token);
}

export async function logout(token) {
  return request("/auth/logout", { method: "POST" }, token);
}

export async function listTrips(token) {
  const payload = await request("/trips", {}, token);
  return payload?.items || [];
}

export async function listShares(token) { const payload = await request("/trips/shares", {}, token); return payload?.items || []; }
export async function createShare(token, { email, tripId }) { return request("/trips/shares", { method: "POST", body: JSON.stringify({ email, tripId: tripId || null }) }, token); }
export async function deleteShare(token, shareId) { return request(`/trips/shares/${encodeURIComponent(shareId)}`, { method: "DELETE" }, token); }

export async function createTrip(token, body) {
  return request("/trips", {
    method: "POST",
    body: JSON.stringify(body)
  }, token);
}

export async function deleteTrip(token, tripId) {
  return request(`/trips/${tripId}`, { method: "DELETE" }, token);
}

export async function updateTrip(token, tripId, body) {
  return request(`/trips/${tripId}`, {
    method: "PATCH",
    body: JSON.stringify(body)
  }, token);
}

export async function listFlights(token, tripId) {
  const payload = await request(`/trips/${tripId}/flights`, {}, token);
  return payload?.items || [];
}

export async function createFlight(token, tripId, body) {
  return request(`/trips/${tripId}/flights`, {
    method: "POST",
    body: JSON.stringify(body)
  }, token);
}

export async function updateFlight(token, tripId, flightId, body) {
  return request(`/trips/${tripId}/flights/${flightId}`, {
    method: "PATCH",
    body: JSON.stringify(body)
  }, token);
}

export async function deleteFlight(token, tripId, flightId) {
  return request(`/trips/${tripId}/flights/${flightId}`, { method: "DELETE" }, token);
}

export async function listHotels(token, tripId) {
  const payload = await request(`/trips/${tripId}/hotels`, {}, token);
  return payload?.items || [];
}

export async function createHotel(token, tripId, body) {
  return request(`/trips/${tripId}/hotels`, {
    method: "POST",
    body: JSON.stringify(body)
  }, token);
}

export async function updateHotel(token, tripId, hotelId, body) {
  return request(`/trips/${tripId}/hotels/${hotelId}`, {
    method: "PATCH",
    body: JSON.stringify(body)
  }, token);
}

export async function deleteHotel(token, tripId, hotelId) {
  return request(`/trips/${tripId}/hotels/${hotelId}`, { method: "DELETE" }, token);
}

export async function listPassengers(token, tripId) {
  const payload = await request(`/trips/${tripId}/passengers`, {}, token);
  return payload?.items || [];
}

export async function lookupFlight(token, flightNumber, provider, date, live = false) {
  const params = new URLSearchParams({ fn: flightNumber });
  if (provider && provider !== "aviationstack") params.set("provider", provider);
  if (date) params.set("date", date);
  if (live === true) params.set("live", "1");
  return request(`/flights/lookup?${params.toString()}`, {}, token);
}

export async function listFlightsToday(token) {
  const payload = await request("/flights/today", {}, token);
  return {
    date: payload?.date || "",
    flights: Array.isArray(payload?.flights) ? payload.flights : []
  };
}

export async function getAeroDataBoxBalance(token) {
  const payload = await request("/flights/aerodatabox/balance", {}, token);
  return {
    creditsRemaining: Number.isFinite(Number(payload?.creditsRemaining)) ? Number(payload.creditsRemaining) : null,
    requestsRemaining: Number.isFinite(Number(payload?.requestsRemaining)) ? Number(payload.requestsRemaining) : null,
    requestsLimit: Number.isFinite(Number(payload?.requestsLimit)) ? Number(payload.requestsLimit) : null,
    requestsReset: Number.isFinite(Number(payload?.requestsReset)) ? Number(payload.requestsReset) : null
  };
}

export async function exportLegacyTrips(token) {
  return request("/sync/trips", {}, token);
}

function normalizeImportTripsPayload(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.trips)) return payload.trips;
  return payload;
}

export async function importLegacyTrips(token, trips) {
  const normalized = normalizeImportTripsPayload(trips);
  return request("/sync/trips", {
    method: "PUT",
    body: JSON.stringify(normalized)
  }, token);
}

export async function listUsers(token, filters = {}) {
  const params = new URLSearchParams();
  if (filters.role) params.set("role", filters.role);
  if (filters.active === "true" || filters.active === "false") {
    params.set("active", filters.active);
  }
  const query = params.toString();
  const payload = await request(`/admin/users${query ? `?${query}` : ""}`, {}, token);
  return payload?.items || [];
}

export async function createUser(token, body) {
  return request("/admin/users", {
    method: "POST",
    body: JSON.stringify(body)
  }, token);
}

export async function updateUser(token, userId, body) {
  return request(`/admin/users/${encodeURIComponent(userId)}`, {
    method: "PATCH",
    body: JSON.stringify(body)
  }, token);
}

export async function deleteUser(token, userId) {
  return request(`/admin/users/${encodeURIComponent(userId)}`, {
    method: "DELETE"
  }, token);
}
