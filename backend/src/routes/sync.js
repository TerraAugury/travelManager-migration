import { requireRequestUser } from "../auth/requestUser.js";
import { sendError } from "../http/responses.js";

export function registerSyncRoutes(app, deps) {
  const { legacyTripsExportService, legacyTripsImportService } = deps;

  app.get("/sync/trips", async (c) => {
    const auth = await requireRequestUser(c, deps);
    if (auth.error) return c.json({ error: auth.error }, auth._status || 401);
    const trips = await legacyTripsExportService.exportByOwner(auth.user.id);
    return c.json(trips);
  });

  app.put("/sync/trips", async (c) => {
    const auth = await requireRequestUser(c, deps);
    if (auth.error) return c.json({ error: auth.error }, auth._status || 401);
    const body = await c.req.json();
    if (!Array.isArray(body)) {
      return sendError(c, 400, "Body must be an array of trips.");
    }

    const result = await legacyTripsImportService.replaceForOwner(
      auth.user.id,
      body
    );
    const trips = await legacyTripsExportService.exportByOwner(auth.user.id);
    return c.json({ importedTrips: result.importedTrips, items: trips });
  });
}

