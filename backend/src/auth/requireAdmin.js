import { requireRequestUser } from "./requestUser.js";

export async function requireAdmin(c, deps) {
  const auth = await requireRequestUser(c, deps);
  if (auth.error) return auth;
  if (auth.user.role !== "admin") {
    return { error: "Forbidden.", _status: 403 };
  }
  return auth;
}
