import { Hono } from "hono";
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
import { buildDb } from "./db.js";

export function buildApp({ db: d1, env }) {
  const app = new Hono();
  const db = buildDb(d1);
  const allowDevHeaderAuth = env?.DEV_AUTH_X_USER_ID_FALLBACK === "true";
  const repositories = {
    allowDevHeaderAuth,
    authLoginRateLimitWindowMs: Number(env?.AUTH_LOGIN_RATE_LIMIT_WINDOW_MS || 15 * 60 * 1000),
    authLoginRateLimitMaxAttempts: Number(env?.AUTH_LOGIN_RATE_LIMIT_MAX_ATTEMPTS || 10),
    usersRepository: buildUsersRepository({ pool: db.pool }),
    sessionsRepository: buildSessionsRepository({ pool: db.pool }),
    tripsRepository: buildTripsRepository({ pool: db.pool }),
    flightsRepository: buildFlightsRepository({ pool: db.pool }),
    hotelsRepository: buildHotelsRepository({ pool: db.pool }),
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
  registerHotelRoutes(app, context);
  registerPassengerRoutes(app, context);
  registerSyncRoutes(app, context);

  app.onError((err, c) => {
    console.error("Unhandled error", err);
    return c.json({ error: "Internal server error" }, 500);
  });

  return app;
}
