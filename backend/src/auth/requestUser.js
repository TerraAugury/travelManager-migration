import { isUuid } from "../http/validation.js";

function getBearerToken(c) {
  const auth = c.req.header("authorization");
  if (!auth) return null;
  const match = String(auth).match(/^Bearer\s+(.+)$/i);
  return match ? match[1].trim() : null;
}

async function byToken(c, usersRepository, sessionsRepository) {
  const token = getBearerToken(c);
  if (!token) return null;

  const session = await sessionsRepository.findActiveByToken(token);
  if (!session) return { error: "Invalid or expired token." };

  const user = await usersRepository.findActiveById(session.user_id);
  if (!user) return { error: "User not found or inactive." };

  return { user, session, token };
}

async function byDevHeader(c, usersRepository) {
  const userId = c.req.header("x-user-id");
  if (!isUuid(userId)) return { error: "Missing or invalid x-user-id header." };

  const user = await usersRepository.findActiveById(userId);
  if (!user) return { error: "User not found or inactive." };
  return { user, session: null, token: null };
}

export async function requireRequestUser(c, deps) {
  const { usersRepository, sessionsRepository, allowDevHeaderAuth = false } = deps;

  const tokenAuth = await byToken(c, usersRepository, sessionsRepository);
  if (tokenAuth?.user) return tokenAuth;
  if (tokenAuth?.error && !allowDevHeaderAuth) {
    return { error: tokenAuth.error, _status: 401 };
  }

  if (!allowDevHeaderAuth) {
    return { error: "Missing bearer token.", _status: 401 };
  }

  const headerAuth = await byDevHeader(c, usersRepository);
  if (headerAuth.user) return headerAuth;
  return { error: headerAuth.error, _status: 401 };
}

