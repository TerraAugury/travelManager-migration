import { requireRequestUser } from "../auth/requestUser.js";
import { sendError } from "../http/responses.js";
import { toTrimmedString } from "../http/validation.js";
import { verifyPassword } from "../security/passwords.js";
import { generateAuthToken } from "../security/tokens.js";

function parseLoginBody(body) {
  const email = toTrimmedString(body?.email, {
    field: "email",
    required: true,
    max: 255
  });
  if (email.error) return { error: email.error };
  const password = toTrimmedString(body?.password, {
    field: "password",
    required: true,
    max: 1024
  });
  if (password.error) return { error: password.error };

  return {
    value: {
      email: email.value.toLowerCase(),
      password: password.value
    }
  };
}

export async function registerAuthRoutes(app, deps) {
  const { usersRepository, sessionsRepository } = deps;

  app.post("/auth/login", async (c) => {
    const parsed = parseLoginBody(await c.req.json());
    if (parsed.error) return sendError(c, 400, parsed.error);

    const user = await usersRepository.findAuthByEmail(parsed.value.email);
    const valid =
      user &&
      user.is_active &&
      (await verifyPassword(parsed.value.password, user.password_hash));
    if (!valid) return sendError(c, 401, "Invalid email or password.");

    const token = generateAuthToken();
    const session = await sessionsRepository.create({ userId: user.id, token });

    return c.json({
      token,
      expiresAt: session.expires_at,
      user: {
        id: user.id,
        email: user.email,
        display_name: user.display_name,
        role: user.role
      }
    });
  });

  app.get("/auth/me", async (c) => {
    const auth = await requireRequestUser(c, deps);
    if (auth.error) return c.json({ error: auth.error }, auth._status || 401);
    return c.json({
      id: auth.user.id,
      email: auth.user.email,
      display_name: auth.user.display_name,
      role: auth.user.role
    });
  });

  app.post("/auth/logout", async (c) => {
    const auth = await requireRequestUser(c, deps);
    if (auth.error) return c.json({ error: auth.error }, auth._status || 401);
    if (auth.token) {
      await sessionsRepository.revokeToken(auth.token);
    }
    return c.json({ ok: true });
  });
}

