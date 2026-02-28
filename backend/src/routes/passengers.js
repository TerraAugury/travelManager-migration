import { requireRequestUser } from "../auth/requestUser.js";
import { isUuid } from "../http/validation.js";
import { sendError } from "../http/responses.js";

export async function registerPassengerRoutes(app, deps) {
  const { usersRepository, tripsRepository, passengersRepository } = deps;

  app.get("/trips/:tripId/passengers", async (request, reply) => {
    const auth = await requireRequestUser(request, reply, usersRepository);
    if (auth.error) return auth;
    const { tripId } = request.params;
    if (!isUuid(tripId)) return sendError(reply, 400, "Invalid tripId.");

    const trip = await tripsRepository.getById(tripId, auth.user.id);
    if (!trip) return sendError(reply, 404, "Trip not found.");

    const items = await passengersRepository.listByTrip({
      tripId,
      ownerUserId: auth.user.id
    });
    return { items };
  });
}

