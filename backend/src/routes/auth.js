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

  app.post("/auth/login", async (request, reply) => {
    const parsed = parseLoginBody(request.body);
    if (parsed.error) return sendError(reply, 400, parsed.error);

    const user = await usersRepository.findAuthByEmail(parsed.value.email);
    const valid =
      user &&
      user.is_active &&
      verifyPassword(parsed.value.password, user.password_hash);
    if (!valid) {
      return sendError(reply, 401, "Invalid email or password.");
    }

    const token = generateAuthToken();
    const session = await sessionsRepository.create({ userId: user.id, token });

    return {
      token,
      expiresAt: session.expires_at,
      user: {
        id: user.id,
        email: user.email,
        display_name: user.display_name,
        role: user.role
      }
    };
  });

  app.get("/auth/me", async (request, reply) => {
    const auth = await requireRequestUser(request, reply, deps);
    if (auth.error) return auth;
    return {
      id: auth.user.id,
      email: auth.user.email,
      display_name: auth.user.display_name,
      role: auth.user.role
    };
  });

  app.post("/auth/logout", async (request, reply) => {
    const auth = await requireRequestUser(request, reply, deps);
    if (auth.error) return auth;
    if (auth.token) {
      await sessionsRepository.revokeToken(auth.token);
    }
    return { ok: true };
  });
}

