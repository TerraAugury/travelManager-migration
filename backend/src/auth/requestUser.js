import { isUuid } from "../http/validation.js";

export async function requireRequestUser(request, reply, usersRepository) {
  const header = request.headers?.["x-user-id"];
  const userId = Array.isArray(header) ? header[0] : header;

  if (!isUuid(userId)) {
    reply.code(401);
    return { error: "Missing or invalid x-user-id header." };
  }

  const user = await usersRepository.findActiveById(userId);
  if (!user) {
    reply.code(401);
    return { error: "User not found or inactive." };
  }

  return { user };
}

