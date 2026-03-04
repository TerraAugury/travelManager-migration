import { requireRequestUser } from "../auth/requestUser.js";
import {
  isUuid,
  toOptionalDateTime,
  toPassengerNames,
  toTrimmedString
} from "../http/validation.js";
import { sendError } from "../http/responses.js";
import { validateIataCode, validatePassengerName } from "../validation.js";

function parseFlightBody(body) {
  const flightNumber = toTrimmedString(body?.flightNumber, {
    field: "flightNumber",
    required: true,
    max: 24
  });
  if (flightNumber.error) return { error: flightNumber.error };
  const airline = toTrimmedString(body?.airline, { field: "airline", max: 120 });
  if (airline.error) return { error: airline.error };
  const pnr = toTrimmedString(body?.pnr, { field: "pnr", max: 24 });
  if (pnr.error) return { error: pnr.error };
  const depName = toTrimmedString(body?.departureAirportName, { field: "departureAirportName", max: 180 });
  if (depName.error) return { error: depName.error };
  const depCode = toTrimmedString(body?.departureAirportCode, { field: "departureAirportCode", max: 8 });
  if (depCode.error) return { error: depCode.error };
  const arrName = toTrimmedString(body?.arrivalAirportName, { field: "arrivalAirportName", max: 180 });
  if (arrName.error) return { error: arrName.error };
  const arrCode = toTrimmedString(body?.arrivalAirportCode, { field: "arrivalAirportCode", max: 8 });
  if (arrCode.error) return { error: arrCode.error };
  const depAt = toOptionalDateTime(body?.departureScheduled, { field: "departureScheduled" });
  if (depAt.error) return { error: depAt.error };
  const arrAt = toOptionalDateTime(body?.arrivalScheduled, { field: "arrivalScheduled" });
  if (arrAt.error) return { error: arrAt.error };
  const names = toPassengerNames(body?.passengerNames);
  for (const name of names.value) {
    const nameValidation = validatePassengerName(name);
    if (!nameValidation.valid) return { error: nameValidation.error };
  }
  if (depCode.value) {
    const depValidation = validateIataCode(depCode.value.toUpperCase());
    if (!depValidation.valid) return { error: depValidation.error };
  }
  if (arrCode.value) {
    const arrValidation = validateIataCode(arrCode.value.toUpperCase());
    if (!arrValidation.valid) return { error: arrValidation.error };
  }
  return {
    value: {
      flightNumber: flightNumber.value?.toUpperCase(),
      airline: airline.value,
      pnr: pnr.value?.toUpperCase() || null,
      departureAirportName: depName.value,
      departureAirportCode: depCode.value?.toUpperCase() || null,
      arrivalAirportName: arrName.value,
      arrivalAirportCode: arrCode.value?.toUpperCase() || null,
      departureScheduled: depAt.value,
      arrivalScheduled: arrAt.value,
      passengerNames: names.value
    }
  };
}

export function registerFlightRoutes(app, deps) {
  const { tripsRepository, flightsRepository, passengersRepository } = deps;
  for (const base of ["", "/api"]) {
    const path = (suffix) => `${base}${suffix}`;

    app.get(path("/flights/lookup"), async (c) => {
      const auth = await requireRequestUser(c, deps);
      if (auth.error) return c.json({ error: auth.error }, auth._status || 401);
      const fn = (c.req.query("fn") || "").trim().toUpperCase().replace(/\s+/g, "");
      if (!fn || !/^[A-Z0-9]{2,8}$/.test(fn)) return sendError(c, 400, "Invalid or missing flight number (fn).");
      const key = c.env?.AVIATIONSTACK_API_KEY;
      if (!key) return sendError(c, 503, "Flight lookup not configured on this server.");
      // Use header auth to avoid leaking the key in URLs.
      const res = await fetch(`https://api.aviationstack.com/v1/flights?flight_iata=${encodeURIComponent(fn)}`, {
        headers: {
          "X-Api-Key": key,
          Authorization: `Bearer ${key}`
        }
      });
      if (!res.ok) return sendError(c, 502, "Upstream flight lookup error.");
      const json = await res.json();
      const f = json?.data?.[0];
      if (!f) return sendError(c, 404, `No flight found for ${fn}.`);
      return c.json({
        flight_number: f.flight?.iata || fn,
        airline: f.airline?.name || null,
        departure_airport_name: f.departure?.airport || null,
        departure_airport_code: f.departure?.iata || null,
        arrival_airport_name: f.arrival?.airport || null,
        arrival_airport_code: f.arrival?.iata || null,
        departure_scheduled: f.departure?.scheduled || null,
        arrival_scheduled: f.arrival?.scheduled || null
      });
    });

    app.get(path("/trips/:tripId/flights"), async (c) => {
      const auth = await requireRequestUser(c, deps);
      if (auth.error) return c.json({ error: auth.error }, auth._status || 401);
      const tripId = c.req.param("tripId");
      if (!isUuid(tripId)) return sendError(c, 400, "Invalid tripId.");
      const trip = await tripsRepository.getById(tripId, auth.user.id);
      if (!trip) return sendError(c, 404, "Trip not found.");
      const flights = await flightsRepository.listByTrip({ tripId, ownerUserId: auth.user.id });
      const items = await Promise.all(
        flights.map(async (f) => ({
          ...f,
          passenger_names: await passengersRepository.listPassengersForFlight(f.id)
        }))
      );
      return c.json({ items });
    });

    app.post(path("/trips/:tripId/flights"), async (c) => {
      const auth = await requireRequestUser(c, deps);
      if (auth.error) return c.json({ error: auth.error }, auth._status || 401);
      const tripId = c.req.param("tripId");
      if (!isUuid(tripId)) return sendError(c, 400, "Invalid tripId.");
      const parsed = parseFlightBody(await c.req.json());
      if (parsed.error) return sendError(c, 400, parsed.error);

      const created = await flightsRepository.create({
        tripId,
        ownerUserId: auth.user.id,
        ...parsed.value
      });
      if (!created) return sendError(c, 404, "Trip not found.");

      const passengers = await passengersRepository.ensureByNames(parsed.value.passengerNames);
      const passengerIds = passengers.map((p) => p.id);
      await passengersRepository.linkToTrip({ tripId, passengerIds });
      await passengersRepository.linkToFlight({ flightRecordId: created.id, passengerIds });

      return c.json({ ...created, passenger_names: passengers.map((p) => p.name) }, 201);
    });

    app.patch(path("/trips/:tripId/flights/:flightId"), async (c) => {
      const auth = await requireRequestUser(c, deps);
      if (auth.error) return c.json({ error: auth.error }, auth._status || 401);
      const tripId = c.req.param("tripId");
      const flightId = c.req.param("flightId");
      if (!isUuid(tripId) || !isUuid(flightId)) {
        return sendError(c, 400, "Invalid tripId or flightId.");
      }
      const parsed = parseFlightBody(await c.req.json());
      if (parsed.error) return sendError(c, 400, parsed.error);

      const updated = await flightsRepository.update({
        flightId,
        ownerUserId: auth.user.id,
        ...parsed.value
      });
      if (!updated || updated.trip_id !== tripId) return sendError(c, 404, "Flight not found.");

      const passengers = await passengersRepository.ensureByNames(parsed.value.passengerNames);
      const passengerIds = passengers.map((p) => p.id);
      await passengersRepository.linkToTrip({ tripId, passengerIds });
      await passengersRepository.replaceFlightLinks({ flightRecordId: flightId, passengerIds });

      return c.json({ ...updated, passenger_names: passengers.map((p) => p.name) });
    });

    app.delete(path("/trips/:tripId/flights/:flightId"), async (c) => {
      const auth = await requireRequestUser(c, deps);
      if (auth.error) return c.json({ error: auth.error }, auth._status || 401);
      const tripId = c.req.param("tripId");
      const flightId = c.req.param("flightId");
      if (!isUuid(tripId) || !isUuid(flightId)) {
        return sendError(c, 400, "Invalid tripId or flightId.");
      }
      const removed = await flightsRepository.remove({ flightId, ownerUserId: auth.user.id });
      if (!removed) return sendError(c, 404, "Flight not found.");
      return new Response(null, { status: 204 });
    });
  }
}
