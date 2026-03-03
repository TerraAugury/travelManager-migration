import { requireRequestUser } from "../auth/requestUser.js";
import {
  isUuid,
  toOptionalDate,
  toPassengerNames,
  toPositiveInt,
  toTrimmedString
} from "../http/validation.js";
import { sendError } from "../http/responses.js";

const PAYMENT_TYPES = new Set(["prepaid", "pay_at_hotel"]);

function parseHotelBody(body) {
  const hotelName = toTrimmedString(body?.hotelName, { field: "hotelName", required: true, max: 180 });
  if (hotelName.error) return { error: hotelName.error };
  const confirmationId = toTrimmedString(body?.confirmationId, { field: "confirmationId", max: 64 });
  if (confirmationId.error) return { error: confirmationId.error };
  const checkInDate = toOptionalDate(body?.checkInDate, { field: "checkInDate" });
  if (checkInDate.error || !checkInDate.value) return { error: "checkInDate is required." };
  const checkOutDate = toOptionalDate(body?.checkOutDate, { field: "checkOutDate" });
  if (checkOutDate.error || !checkOutDate.value) return { error: "checkOutDate is required." };
  if (checkOutDate.value < checkInDate.value) {
    return { error: "checkOutDate must be greater than or equal to checkInDate." };
  }
  const paxCount = toPositiveInt(body?.paxCount, { field: "paxCount" });
  if (paxCount.error) return { error: paxCount.error };
  const paymentType = String(body?.paymentType || "").trim();
  if (!PAYMENT_TYPES.has(paymentType)) return { error: "paymentType is invalid." };
  const names = toPassengerNames(body?.passengerNames);

  return {
    value: {
      hotelName: hotelName.value,
      confirmationId: confirmationId.value,
      checkInDate: checkInDate.value,
      checkOutDate: checkOutDate.value,
      paxCount: paxCount.value,
      paymentType,
      passengerNames: names.value
    }
  };
}

export function registerHotelRoutes(app, deps) {
  const { tripsRepository, hotelsRepository, passengersRepository } = deps;
  for (const base of ["", "/api"]) {
    const path = (suffix) => `${base}${suffix}`;

    app.get(path("/trips/:tripId/hotels"), async (c) => {
      const auth = await requireRequestUser(c, deps);
      if (auth.error) return c.json({ error: auth.error }, auth._status || 401);
      const tripId = c.req.param("tripId");
      if (!isUuid(tripId)) return sendError(c, 400, "Invalid tripId.");
      const trip = await tripsRepository.getById(tripId, auth.user.id);
      if (!trip) return sendError(c, 404, "Trip not found.");
      const hotels = await hotelsRepository.listByTrip({ tripId, ownerUserId: auth.user.id });
      const items = await Promise.all(
        hotels.map(async (h) => ({
          ...h,
          passenger_names: await passengersRepository.listPassengersForHotel(h.id)
        }))
      );
      return c.json({ items });
    });

    app.post(path("/trips/:tripId/hotels"), async (c) => {
      const auth = await requireRequestUser(c, deps);
      if (auth.error) return c.json({ error: auth.error }, auth._status || 401);
      const tripId = c.req.param("tripId");
      if (!isUuid(tripId)) return sendError(c, 400, "Invalid tripId.");
      const parsed = parseHotelBody(await c.req.json());
      if (parsed.error) return sendError(c, 400, parsed.error);

      const created = await hotelsRepository.create({
        tripId,
        ownerUserId: auth.user.id,
        ...parsed.value
      });
      if (!created) return sendError(c, 404, "Trip not found.");

      const passengers = await passengersRepository.ensureByNames(parsed.value.passengerNames);
      const passengerIds = passengers.map((p) => p.id);
      await passengersRepository.linkToTrip({ tripId, passengerIds });
      await passengersRepository.linkToHotel({ hotelRecordId: created.id, passengerIds });

      return c.json({ ...created, passenger_names: passengers.map((p) => p.name) }, 201);
    });

    app.patch(path("/trips/:tripId/hotels/:hotelId"), async (c) => {
      const auth = await requireRequestUser(c, deps);
      if (auth.error) return c.json({ error: auth.error }, auth._status || 401);
      const tripId = c.req.param("tripId");
      const hotelId = c.req.param("hotelId");
      if (!isUuid(tripId) || !isUuid(hotelId)) {
        return sendError(c, 400, "Invalid tripId or hotelId.");
      }
      const parsed = parseHotelBody(await c.req.json());
      if (parsed.error) return sendError(c, 400, parsed.error);

      const updated = await hotelsRepository.update({
        hotelId,
        ownerUserId: auth.user.id,
        ...parsed.value
      });
      if (!updated || updated.trip_id !== tripId) return sendError(c, 404, "Hotel not found.");

      const passengers = await passengersRepository.ensureByNames(parsed.value.passengerNames);
      const passengerIds = passengers.map((p) => p.id);
      await passengersRepository.linkToTrip({ tripId, passengerIds });
      await passengersRepository.replaceHotelLinks({ hotelRecordId: hotelId, passengerIds });

      return c.json({ ...updated, passenger_names: passengers.map((p) => p.name) });
    });

    app.delete(path("/trips/:tripId/hotels/:hotelId"), async (c) => {
      const auth = await requireRequestUser(c, deps);
      if (auth.error) return c.json({ error: auth.error }, auth._status || 401);
      const tripId = c.req.param("tripId");
      const hotelId = c.req.param("hotelId");
      if (!isUuid(tripId) || !isUuid(hotelId)) {
        return sendError(c, 400, "Invalid tripId or hotelId.");
      }
      const removed = await hotelsRepository.remove({ hotelId, ownerUserId: auth.user.id });
      if (!removed) return sendError(c, 404, "Hotel not found.");
      return new Response(null, { status: 204 });
    });
  }
}
