import { isUuid } from "../http/validation.js";

function getHeaderValue(headers, name) {
  const value = headers?.[name];
  return Array.isArray(value) ? value[0] : value;
}

function getBearerToken(headers) {
  const auth = getHeaderValue(headers, "authorization");
  if (!auth) return null;
  const match = String(auth).match(/^Bearer\s+(.+)$/i);
  return match ? match[1].trim() : null;
}

async function byToken(headers, usersRepository, sessionsRepository) {
  const token = getBearerToken(headers);
  if (!token) return null;

  const session = await sessionsRepository.findActiveByToken(token);
  if (!session) return { error: "Invalid or expired token." };

  const user = await usersRepository.findActiveById(session.user_id);
  if (!user) return { error: "User not found or inactive." };

  return { user, session, token };
}

async function byDevHeader(headers, usersRepository) {
  const userId = getHeaderValue(headers, "x-user-id");
  if (!isUuid(userId)) return { error: "Missing or invalid x-user-id header." };

  const user = await usersRepository.findActiveById(userId);
  if (!user) return { error: "User not found or inactive." };
  return { user, session: null, token: null };
}

export async function requireRequestUser(request, reply, deps) {
  const { usersRepository, sessionsRepository, allowDevHeaderAuth = false } = deps;

  const tokenAuth = await byToken(request.headers, usersRepository, sessionsRepository);
  if (tokenAuth?.user) return tokenAuth;
  if (tokenAuth?.error && !allowDevHeaderAuth) {
    reply.code(401);
    return { error: tokenAuth.error };
  }

  if (!allowDevHeaderAuth) {
    reply.code(401);
    return { error: "Missing bearer token." };
  }

  const headerAuth = await byDevHeader(request.headers, usersRepository);
  if (headerAuth.user) return headerAuth;
  reply.code(401);
  return { error: headerAuth.error };
}

