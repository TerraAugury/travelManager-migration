import { requireRequestUser } from "../auth/requestUser.js";
import { sendError } from "../http/responses.js";

function normalizeTripsBody(body) {
  if (Array.isArray(body)) return { value: body };
  if (Array.isArray(body?.items)) return { value: body.items };
  if (Array.isArray(body?.trips)) return { value: body.trips };
  return { error: "Body must be an array of trips or an object with items/trips." };
}

export function registerSyncRoutes(app, deps) {
  const { legacyTripsExportService, legacyTripsImportService } = deps;

  app.get("/api/sync/trips", async (c) => {
    const auth = await requireRequestUser(c, deps);
    if (auth.error) return c.json({ error: auth.error }, auth._status || 401);
    const trips = await legacyTripsExportService.exportByOwner(auth.user.id);
    return c.json(trips);
  });

  app.put("/api/sync/trips", async (c) => {
    const auth = await requireRequestUser(c, deps);
    if (auth.error) return c.json({ error: auth.error }, auth._status || 401);
    const parsed = normalizeTripsBody(await c.req.json());
    if (parsed.error) return sendError(c, 400, parsed.error);

    const result = await legacyTripsImportService.replaceForOwner(
      auth.user.id,
      parsed.value
    );
    const trips = await legacyTripsExportService.exportByOwner(auth.user.id);
    return c.json({ importedTrips: result.importedTrips, items: trips });
  });
}
