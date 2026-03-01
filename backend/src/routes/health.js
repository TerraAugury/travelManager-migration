export function registerHealthRoutes(app, deps) {
  const { db } = deps;

  app.get("/health", (c) =>
    c.json({ status: "ok", service: "travel-manager-backend" })
  );

  app.get("/health/db", async (c) => {
    try {
      const connected = await db.check();
      return c.json({
        status: connected ? "ok" : "degraded",
        database: connected ? "connected" : "unavailable"
      });
    } catch {
      return c.json({ status: "degraded", database: "unavailable" }, 503);
    }
  });
}

