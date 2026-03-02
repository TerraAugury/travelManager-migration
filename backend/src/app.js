import Fastify from "fastify";
import { registerAuthRoutes } from "./routes/auth.js";
import { registerHealthRoutes } from "./routes/health.js";
import { registerTripRoutes } from "./routes/trips.js";
import { registerFlightRoutes } from "./routes/flights.js";
import { registerHotelRoutes } from "./routes/hotels.js";
import { registerPassengerRoutes } from "./routes/passengers.js";
import { registerSyncRoutes } from "./routes/sync.js";
import { buildUsersRepository } from "./repositories/usersRepository.js";
import { buildSessionsRepository } from "./repositories/sessionsRepository.js";
import { buildTripsRepository } from "./repositories/tripsRepository.js";
import { buildFlightsRepository } from "./repositories/flightsRepository.js";
import { buildHotelsRepository } from "./repositories/hotelsRepository.js";
import { buildPassengersRepository } from "./repositories/passengersRepository.js";
import { buildLegacyTripsExportService } from "./services/legacyTripsExport.js";
import { buildLegacyTripsImportService } from "./services/legacyTripsImport.js";

export async function buildApp(deps) {
  const app = Fastify({
    logger: true
  });
  const repositories = {
    allowDevHeaderAuth: Boolean(deps.config?.allowDevHeaderAuth),
    authLoginRateLimitWindowMs: Number(
      deps.config?.authLoginRateLimitWindowMs || 15 * 60 * 1000
    ),
    authLoginRateLimitMaxAttempts: Number(
      deps.config?.authLoginRateLimitMaxAttempts || 10
    ),
    usersRepository: buildUsersRepository({ pool: deps.db.pool }),
    sessionsRepository: buildSessionsRepository({ pool: deps.db.pool }),
    tripsRepository: buildTripsRepository({ pool: deps.db.pool }),
    flightsRepository: buildFlightsRepository({ pool: deps.db.pool }),
    hotelsRepository: buildHotelsRepository({ pool: deps.db.pool }),
    passengersRepository: buildPassengersRepository({ pool: deps.db.pool })
  };
  const services = {
    legacyTripsExportService: buildLegacyTripsExportService(repositories),
    legacyTripsImportService: buildLegacyTripsImportService({ pool: deps.db.pool })
  };
  const context = {
    ...repositories,
    ...services
  };

  app.get("/", async () => {
    return {
      service: "travel-manager-backend",
      docs: "Use /health, /health/db, and /trips endpoints.",
      auth: "Use /auth/login then send Authorization: Bearer <token>."
    };
  });

  await registerHealthRoutes(app, deps);
  await registerAuthRoutes(app, context);
  await registerTripRoutes(app, context);
  await registerFlightRoutes(app, context);
  await registerHotelRoutes(app, context);
  await registerPassengerRoutes(app, context);
  await registerSyncRoutes(app, context);

  app.setErrorHandler((error, request, reply) => {
    request.log.error({ err: error }, "Unhandled error");
    reply.code(500).send({ error: "Internal server error" });
  });

  return app;
}
