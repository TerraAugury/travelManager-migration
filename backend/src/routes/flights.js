import { requireRequestUser } from "../auth/requestUser.js";
import {
  isUuid,
  toOptionalDateTime,
  toPassengerNames,
  toTrimmedString
} from "../http/validation.js";
import { sendError } from "../http/responses.js";

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

export async function registerFlightRoutes(app, deps) {
  const { tripsRepository, flightsRepository, passengersRepository } = deps;

  app.get("/trips/:tripId/flights", async (request, reply) => {
    const auth = await requireRequestUser(request, reply, deps);
    if (auth.error) return auth;
    const { tripId } = request.params;
    if (!isUuid(tripId)) return sendError(reply, 400, "Invalid tripId.");
    const trip = await tripsRepository.getById(tripId, auth.user.id);
    if (!trip) return sendError(reply, 404, "Trip not found.");
    const items = await flightsRepository.listByTrip({ tripId, ownerUserId: auth.user.id });
    return { items };
  });

  app.post("/trips/:tripId/flights", async (request, reply) => {
    const auth = await requireRequestUser(request, reply, deps);
    if (auth.error) return auth;
    const { tripId } = request.params;
    if (!isUuid(tripId)) return sendError(reply, 400, "Invalid tripId.");
    const parsed = parseFlightBody(request.body);
    if (parsed.error) return sendError(reply, 400, parsed.error);

    const created = await flightsRepository.create({
      tripId,
      ownerUserId: auth.user.id,
      ...parsed.value
    });
    if (!created) return sendError(reply, 404, "Trip not found.");

    const passengers = await passengersRepository.ensureByNames(parsed.value.passengerNames);
    const passengerIds = passengers.map((p) => p.id);
    await passengersRepository.linkToTrip({ tripId, passengerIds });
    await passengersRepository.linkToFlight({ flightRecordId: created.id, passengerIds });

    reply.code(201);
    return {
      ...created,
      passenger_names: passengers.map((p) => p.name)
    };
  });

  app.patch("/trips/:tripId/flights/:flightId", async (request, reply) => {
    const auth = await requireRequestUser(request, reply, deps);
    if (auth.error) return auth;
    const { tripId, flightId } = request.params;
    if (!isUuid(tripId) || !isUuid(flightId)) {
      return sendError(reply, 400, "Invalid tripId or flightId.");
    }
    const parsed = parseFlightBody(request.body);
    if (parsed.error) return sendError(reply, 400, parsed.error);

    const updated = await flightsRepository.update({
      flightId,
      ownerUserId: auth.user.id,
      ...parsed.value
    });
    if (!updated || updated.trip_id !== tripId) return sendError(reply, 404, "Flight not found.");

    const passengers = await passengersRepository.ensureByNames(parsed.value.passengerNames);
    const passengerIds = passengers.map((p) => p.id);
    await passengersRepository.linkToTrip({ tripId, passengerIds });
    await passengersRepository.replaceFlightLinks({ flightRecordId: flightId, passengerIds });

    return {
      ...updated,
      passenger_names: passengers.map((p) => p.name)
    };
  });

  app.delete("/trips/:tripId/flights/:flightId", async (request, reply) => {
    const auth = await requireRequestUser(request, reply, deps);
    if (auth.error) return auth;
    const { tripId, flightId } = request.params;
    if (!isUuid(tripId) || !isUuid(flightId)) {
      return sendError(reply, 400, "Invalid tripId or flightId.");
    }
    const removed = await flightsRepository.remove({ flightId, ownerUserId: auth.user.id });
    if (!removed) return sendError(reply, 404, "Flight not found.");
    reply.code(204);
    return null;
  });
}
