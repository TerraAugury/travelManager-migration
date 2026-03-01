import { requireRequestUser } from "../auth/requestUser.js";
import { isUuid } from "../http/validation.js";
import { sendError } from "../http/responses.js";

export function registerPassengerRoutes(app, deps) {
  const { tripsRepository, passengersRepository } = deps;

  app.get("/trips/:tripId/passengers", async (c) => {
    const auth = await requireRequestUser(c, deps);
    if (auth.error) return c.json({ error: auth.error }, auth._status || 401);
    const tripId = c.req.param("tripId");
    if (!isUuid(tripId)) return sendError(c, 400, "Invalid tripId.");

    const trip = await tripsRepository.getById(tripId, auth.user.id);
    if (!trip) return sendError(c, 404, "Trip not found.");

    const items = await passengersRepository.listByTrip({
      tripId,
      ownerUserId: auth.user.id
    });
    return c.json({ items });
  });
}
