import { getConfig } from "./config.js";
import { buildDb } from "./db.js";
import { buildApp } from "./app.js";

async function start() {
  const config = getConfig();
  const db = buildDb(config);
  const app = await buildApp({ db, config });

  const closeGracefully = async () => {
    try {
      await app.close();
      await db.close();
      process.exit(0);
    } catch (error) {
      app.log.error({ err: error }, "Failed to shut down cleanly");
      process.exit(1);
    }
  };

  process.on("SIGINT", closeGracefully);
  process.on("SIGTERM", closeGracefully);

  try {
    await app.listen({
      host: "0.0.0.0",
      port: config.port
    });
  } catch (error) {
    app.log.error({ err: error }, "Startup failure");
    await db.close();
    process.exit(1);
  }
}

start();
