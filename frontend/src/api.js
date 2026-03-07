import { API_BASE } from "./config.js";

async function request(path, options = {}) {
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {})
  };
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
    credentials: "include"
  });

  const text = await response.text();
  const body = text ? JSON.parse(text) : null;
  if (!response.ok) {
    const message = body?.error || `HTTP ${response.status}`;
    throw new Error(message);
  }
  return body;
}

export async function login(email, password) {
  return request("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password })
  });
}

export async function me() {
  return request("/auth/me", {});
}

export async function logout() {
  return request("/auth/logout", { method: "POST" });
}

export async function listTrips() {
  const payload = await request("/trips", {});
  return payload?.items || [];
}

export async function createTrip(body) {
  return request("/trips", {
    method: "POST",
    body: JSON.stringify(body)
  });
}

export async function deleteTrip(tripId) {
  return request(`/trips/${tripId}`, { method: "DELETE" });
}

export async function updateTrip(tripId, body) {
  return request(`/trips/${tripId}`, {
    method: "PATCH",
    body: JSON.stringify(body)
  });
}

export async function listFlights(tripId) {
  const payload = await request(`/trips/${tripId}/flights`, {});
  return payload?.items || [];
}

export async function createFlight(tripId, body) {
  return request(`/trips/${tripId}/flights`, {
    method: "POST",
    body: JSON.stringify(body)
  });
}

export async function updateFlight(tripId, flightId, body) {
  return request(`/trips/${tripId}/flights/${flightId}`, {
    method: "PATCH",
    body: JSON.stringify(body)
  });
}

export async function deleteFlight(tripId, flightId) {
  return request(`/trips/${tripId}/flights/${flightId}`, { method: "DELETE" });
}

export async function listHotels(tripId) {
  const payload = await request(`/trips/${tripId}/hotels`, {});
  return payload?.items || [];
}

export async function createHotel(tripId, body) {
  return request(`/trips/${tripId}/hotels`, {
    method: "POST",
    body: JSON.stringify(body)
  });
}

export async function updateHotel(tripId, hotelId, body) {
  return request(`/trips/${tripId}/hotels/${hotelId}`, {
    method: "PATCH",
    body: JSON.stringify(body)
  });
}

export async function deleteHotel(tripId, hotelId) {
  return request(`/trips/${tripId}/hotels/${hotelId}`, { method: "DELETE" });
}

export async function listPassengers(tripId) {
  const payload = await request(`/trips/${tripId}/passengers`, {});
  return payload?.items || [];
}

export async function lookupFlight(flightNumber, provider, date) {
  const params = new URLSearchParams({ fn: flightNumber });
  if (provider && provider !== "aviationstack") params.set("provider", provider);
  if (date) params.set("date", date);
  return request(`/flights/lookup?${params.toString()}`, {});
}

export async function exportLegacyTrips() {
  return request("/sync/trips", {});
}

function normalizeImportTripsPayload(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.trips)) return payload.trips;
  return payload;
}

export async function importLegacyTrips(trips) {
  const normalized = normalizeImportTripsPayload(trips);
  return request("/sync/trips", {
    method: "PUT",
    body: JSON.stringify(normalized)
  });
}

export async function listUsers(filters = {}) {
  const params = new URLSearchParams();
  if (filters.role) params.set("role", filters.role);
  if (filters.active === "true" || filters.active === "false") {
    params.set("active", filters.active);
  }
  const query = params.toString();
  const payload = await request(`/admin/users${query ? `?${query}` : ""}`, {});
  return payload?.items || [];
}

export async function createUser(body) {
  return request("/admin/users", {
    method: "POST",
    body: JSON.stringify(body)
  });
}

export async function updateUser(userId, body) {
  return request(`/admin/users/${encodeURIComponent(userId)}`, {
    method: "PATCH",
    body: JSON.stringify(body)
  });
}

export async function deleteUser(userId) {
  return request(`/admin/users/${encodeURIComponent(userId)}`, {
    method: "DELETE"
  });
}
