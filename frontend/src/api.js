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
    headers
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

export async function deleteHotel(token, tripId, hotelId) {
  return request(`/trips/${tripId}/hotels/${hotelId}`, { method: "DELETE" }, token);
}

export async function listPassengers(token, tripId) {
  const payload = await request(`/trips/${tripId}/passengers`, {}, token);
  return payload?.items || [];
}

export async function exportLegacyTrips(token) {
  return request("/sync/trips", {}, token);
}

export async function importLegacyTrips(token, trips) {
  return request("/sync/trips", {
    method: "PUT",
    body: JSON.stringify(trips)
  }, token);
}
