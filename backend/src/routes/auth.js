import { requireRequestUser } from "../auth/requestUser.js";
import { sendError } from "../http/responses.js";
import { toTrimmedString } from "../http/validation.js";
import { verifyPassword } from "../security/passwords.js";
import { buildFixedWindowRateLimiter } from "../security/rateLimiter.js";
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

function getClientIp(c) {
  const cf = c.req.header("CF-Connecting-IP");
  if (cf) return cf;
  const forwarded = String(c.req.header("x-forwarded-for") || "")
    .split(",")[0]
    .trim();
  return forwarded || "unknown";
}

export async function registerAuthRoutes(app, deps) {
  const {
    usersRepository,
    sessionsRepository,
    authLoginRateLimitWindowMs = 15 * 60 * 1000,
    authLoginRateLimitMaxAttempts = 10
  } = deps;
  const loginLimiter = buildFixedWindowRateLimiter({
    windowMs: authLoginRateLimitWindowMs,
    maxAttempts: authLoginRateLimitMaxAttempts
  });

  app.post("/api/auth/login", async (c) => {
    const parsed = parseLoginBody(await c.req.json());
    if (parsed.error) return sendError(c, 400, parsed.error);

    const emailForKey = parsed.value?.email || "unknown";
    const rateLimitKey = `${getClientIp(c)}|${emailForKey}`;
    const limit = loginLimiter.consume(rateLimitKey);
    if (!limit.allowed) {
      c.header("Retry-After", String(limit.retryAfterSeconds));
      return sendError(c, 429, "Too many login attempts. Please try again later.");
    }

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

  app.get("/api/auth/me", async (c) => {
    const auth = await requireRequestUser(c, deps);
    if (auth.error) return c.json({ error: auth.error }, auth._status || 401);
    return c.json({
      id: auth.user.id,
      email: auth.user.email,
      display_name: auth.user.display_name,
      role: auth.user.role
    });
  });

  app.post("/api/auth/logout", async (c) => {
    const auth = await requireRequestUser(c, deps);
    if (auth.error) return c.json({ error: auth.error }, auth._status || 401);
    if (auth.token) {
      await sessionsRepository.revokeToken(auth.token);
    }
    return c.json({ ok: true });
  });
}
