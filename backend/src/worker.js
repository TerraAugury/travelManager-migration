import { buildApp } from "./app.js";

export default {
  async fetch(request, env) {
    const app = buildApp({ db: env.DB, env });
    return app.fetch(request, env);
  }
};
