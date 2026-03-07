import { Hono } from "hono";
import { registerAuthRoutes } from "./routes/auth.js";
import { registerHealthRoutes } from "./routes/health.js";
import { registerTripRoutes } from "./routes/trips.js";
import { registerFlightRoutes } from "./routes/flights.js";
import { registerFlightsTodayRoutes } from "./routes/flightsToday.js";
import { registerHotelRoutes } from "./routes/hotels.js";
import { registerPassengerRoutes } from "./routes/passengers.js";
import { registerTripShareRoutes } from "./routes/tripShares.js";
import { registerSyncRoutes } from "./routes/sync.js";
import { registerAdminUsersRoutes } from "./routes/adminUsers.js";
import { buildUsersRepository } from "./repositories/usersRepository.js";
import { buildSessionsRepository } from "./repositories/sessionsRepository.js";
import { buildTripsRepository } from "./repositories/tripsRepository.js";
import { buildTripSharesRepository } from "./repositories/tripSharesRepository.js";
import { buildFlightsRepository } from "./repositories/flightsRepository.js";
import { buildHotelsRepository } from "./repositories/hotelsRepository.js";
import { buildPassengersRepository } from "./repositories/passengersRepository.js";
import { buildLegacyTripsExportService } from "./services/legacyTripsExport.js";
import { buildLegacyTripsImportService } from "./services/legacyTripsImport.js";
import { buildDb } from "./db.js";

export function buildApp({ db: d1, env }) {
  const app = new Hono();
  const db = buildDb(d1);
  const allowDevHeaderAuth = env?.DEV_AUTH_X_USER_ID_FALLBACK === "true";
  const tripSharesRepository = buildTripSharesRepository({ pool: db.pool });
  const repositories = {
    pool: db.pool,
    allowDevHeaderAuth,
    authLoginRateLimitWindowMs: Number(env?.AUTH_LOGIN_RATE_LIMIT_WINDOW_MS || 15 * 60 * 1000),
    authLoginRateLimitMaxAttempts: Number(env?.AUTH_LOGIN_RATE_LIMIT_MAX_ATTEMPTS || 10),
    usersRepository: buildUsersRepository({ pool: db.pool }),
    sessionsRepository: buildSessionsRepository({ pool: db.pool }),
    tripsRepository: buildTripsRepository({ pool: db.pool }),
    tripSharesRepository,
    flightsRepository: buildFlightsRepository({ pool: db.pool, tripSharesRepository }),
    hotelsRepository: buildHotelsRepository({ pool: db.pool, tripSharesRepository }),
    passengersRepository: buildPassengersRepository({ pool: db.pool })
  };
  const services = {
    legacyTripsExportService: buildLegacyTripsExportService(repositories),
    legacyTripsImportService: buildLegacyTripsImportService({ pool: db.pool })
  };
  const context = { ...repositories, ...services };

  app.get("/", (c) =>
    c.json({
      service: "travel-manager-backend",
      docs: "Use /health, /health/db, and /trips endpoints.",
      auth: "Use /auth/login then send Authorization: Bearer <token>."
    })
  );

  registerHealthRoutes(app, { db });
  registerAuthRoutes(app, context);
  registerTripRoutes(app, context);
  registerFlightRoutes(app, context);
  registerFlightsTodayRoutes(app, context);
  registerHotelRoutes(app, context);
  registerPassengerRoutes(app, context);
  registerTripShareRoutes(app, context);
  registerSyncRoutes(app, context);
  registerAdminUsersRoutes(app, context);

  app.onError((err, c) => {
    console.error("Unhandled error", err);
    return c.json({ error: "Internal server error" }, 500);
  });

  return app;
}
