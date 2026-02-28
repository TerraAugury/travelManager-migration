import Fastify from "fastify";
import { registerHealthRoutes } from "./routes/health.js";

export async function buildApp(deps) {
  const app = Fastify({
    logger: true
  });

  app.get("/", async () => {
    return {
      service: "travel-manager-backend",
      docs: "Use /health and /health/db for readiness checks."
    };
  });

  await registerHealthRoutes(app, deps);

  app.setErrorHandler((error, request, reply) => {
    request.log.error({ err: error }, "Unhandled error");
    reply.code(500).send({ error: "Internal server error" });
  });

  return app;
}

