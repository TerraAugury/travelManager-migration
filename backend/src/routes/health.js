export async function registerHealthRoutes(app, deps) {
  const { db } = deps;

  app.get("/health", async () => {
    return {
      status: "ok",
      service: "travel-manager-backend"
    };
  });

  app.get("/health/db", async (request, reply) => {
    try {
      const connected = await db.check();
      return {
        status: connected ? "ok" : "degraded",
        database: connected ? "connected" : "unavailable"
      };
    } catch (error) {
      request.log.error({ err: error }, "Database health check failed");
      reply.code(503);
      return {
        status: "degraded",
        database: "unavailable"
      };
    }
  });
}

