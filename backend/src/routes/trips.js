import { requireRequestUser } from "../auth/requestUser.js";
import {
  isUuid,
  toOptionalDate,
  toTrimmedString
} from "../http/validation.js";
import { sendError } from "../http/responses.js";

function validateTripDates(startDate, endDate) {
  if (startDate && endDate && endDate < startDate) {
    return "endDate must be greater than or equal to startDate.";
  }
  return null;
}

function parseTripBody(body, { requireName }) {
  const name = toTrimmedString(body?.name, { field: "name", required: requireName, max: 120 });
  if (name.error) return { error: name.error };
  const notes = toTrimmedString(body?.notes, { field: "notes", required: false, max: 4000 });
  if (notes.error) return { error: notes.error };
  const startDate = toOptionalDate(body?.startDate, { field: "startDate" });
  if (startDate.error) return { error: startDate.error };
  const endDate = toOptionalDate(body?.endDate, { field: "endDate" });
  if (endDate.error) return { error: endDate.error };

  const dateError = validateTripDates(startDate.value, endDate.value);
  if (dateError) return { error: dateError };
  return {
    value: {
      name: name.value,
      notes: notes.value,
      startDate: startDate.value,
      endDate: endDate.value
    }
  };
}

export function registerTripRoutes(app, deps) {
  const { tripsRepository } = deps;

  app.get("/trips", async (c) => {
    const auth = await requireRequestUser(c, deps);
    if (auth.error) return c.json({ error: auth.error }, auth._status || 401);
    const rows = await tripsRepository.listByOwner(auth.user.id);
    return c.json({ items: rows });
  });

  app.get("/trips/:tripId", async (c) => {
    const auth = await requireRequestUser(c, deps);
    if (auth.error) return c.json({ error: auth.error }, auth._status || 401);
    const tripId = c.req.param("tripId");
    if (!isUuid(tripId)) return sendError(c, 400, "Invalid tripId.");
    const row = await tripsRepository.getById(tripId, auth.user.id);
    if (!row) return sendError(c, 404, "Trip not found.");
    return c.json(row);
  });

  app.post("/trips", async (c) => {
    const auth = await requireRequestUser(c, deps);
    if (auth.error) return c.json({ error: auth.error }, auth._status || 401);
    const parsed = parseTripBody(await c.req.json(), { requireName: true });
    if (parsed.error) return sendError(c, 400, parsed.error);

    const row = await tripsRepository.create({
      ownerUserId: auth.user.id,
      name: parsed.value.name,
      notes: parsed.value.notes,
      startDate: parsed.value.startDate,
      endDate: parsed.value.endDate
    });
    return c.json(row, 201);
  });

  app.patch("/trips/:tripId", async (c) => {
    const auth = await requireRequestUser(c, deps);
    if (auth.error) return c.json({ error: auth.error }, auth._status || 401);
    const tripId = c.req.param("tripId");
    if (!isUuid(tripId)) return sendError(c, 400, "Invalid tripId.");
    const parsed = parseTripBody(await c.req.json(), { requireName: false });
    if (parsed.error) return sendError(c, 400, parsed.error);

    const row = await tripsRepository.update(tripId, auth.user.id, parsed.value);
    if (!row) return sendError(c, 404, "Trip not found.");
    return c.json(row);
  });

  app.delete("/trips/:tripId", async (c) => {
    const auth = await requireRequestUser(c, deps);
    if (auth.error) return c.json({ error: auth.error }, auth._status || 401);
    const tripId = c.req.param("tripId");
    if (!isUuid(tripId)) return sendError(c, 400, "Invalid tripId.");
    const removed = await tripsRepository.remove(tripId, auth.user.id);
    if (!removed) return sendError(c, 404, "Trip not found.");
    return new Response(null, { status: 204 });
  });
}
