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

export async function registerHotelRoutes(app, deps) {
  const { usersRepository, tripsRepository, hotelsRepository, passengersRepository } = deps;

  app.get("/trips/:tripId/hotels", async (request, reply) => {
    const auth = await requireRequestUser(request, reply, usersRepository);
    if (auth.error) return auth;
    const { tripId } = request.params;
    if (!isUuid(tripId)) return sendError(reply, 400, "Invalid tripId.");
    const trip = await tripsRepository.getById(tripId, auth.user.id);
    if (!trip) return sendError(reply, 404, "Trip not found.");
    const items = await hotelsRepository.listByTrip({ tripId, ownerUserId: auth.user.id });
    return { items };
  });

  app.post("/trips/:tripId/hotels", async (request, reply) => {
    const auth = await requireRequestUser(request, reply, usersRepository);
    if (auth.error) return auth;
    const { tripId } = request.params;
    if (!isUuid(tripId)) return sendError(reply, 400, "Invalid tripId.");
    const parsed = parseHotelBody(request.body);
    if (parsed.error) return sendError(reply, 400, parsed.error);

    const created = await hotelsRepository.create({
      tripId,
      ownerUserId: auth.user.id,
      ...parsed.value
    });
    if (!created) return sendError(reply, 404, "Trip not found.");

    const passengers = await passengersRepository.ensureByNames(parsed.value.passengerNames);
    const passengerIds = passengers.map((p) => p.id);
    await passengersRepository.linkToTrip({ tripId, passengerIds });
    await passengersRepository.linkToHotel({ hotelRecordId: created.id, passengerIds });

    reply.code(201);
    return {
      ...created,
      passenger_names: passengers.map((p) => p.name)
    };
  });

  app.delete("/trips/:tripId/hotels/:hotelId", async (request, reply) => {
    const auth = await requireRequestUser(request, reply, usersRepository);
    if (auth.error) return auth;
    const { tripId, hotelId } = request.params;
    if (!isUuid(tripId) || !isUuid(hotelId)) {
      return sendError(reply, 400, "Invalid tripId or hotelId.");
    }
    const removed = await hotelsRepository.remove({ hotelId, ownerUserId: auth.user.id });
    if (!removed) return sendError(reply, 404, "Hotel not found.");
    reply.code(204);
    return null;
  });
}

