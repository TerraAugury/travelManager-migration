import { requireRequestUser } from "../auth/requestUser.js";
import { sendError } from "../http/responses.js";

export async function registerSyncRoutes(app, deps) {
  const { legacyTripsExportService, legacyTripsImportService } = deps;

  app.get("/sync/trips", async (request, reply) => {
    const auth = await requireRequestUser(request, reply, deps);
    if (auth.error) return auth;

    const trips = await legacyTripsExportService.exportByOwner(auth.user.id);
    return trips;
  });

  app.put("/sync/trips", async (request, reply) => {
    const auth = await requireRequestUser(request, reply, deps);
    if (auth.error) return auth;
    if (!Array.isArray(request.body)) {
      return sendError(reply, 400, "Body must be an array of trips.");
    }

    const result = await legacyTripsImportService.replaceForOwner(
      auth.user.id,
      request.body
    );
    const trips = await legacyTripsExportService.exportByOwner(auth.user.id);
    return {
      importedTrips: result.importedTrips,
      items: trips
    };
  });
}

