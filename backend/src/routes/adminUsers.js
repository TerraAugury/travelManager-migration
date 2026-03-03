import { requireAdmin } from "../auth/requireAdmin.js";
import { sendError } from "../http/responses.js";
import { isUuid, toTrimmedString } from "../http/validation.js";
import { hashPassword } from "../security/passwords.js";

const ALLOWED_ROLES = new Set(["admin", "user"]);
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function hasOwn(value, key) {
  return Object.prototype.hasOwnProperty.call(value || {}, key);
}

async function requireAdminRequest(c, deps) {
  const auth = await requireAdmin(c, deps);
  if (auth.error) {
    return { response: sendError(c, auth._status || 401, auth.error) };
  }
  return { auth };
}

function parseRole(value, { required = false } = {}) {
  const role = toTrimmedString(value, { field: "role", required, max: 16 });
  if (role.error) return { error: role.error };
  if (!role.value) return { value: null };
  const normalized = role.value.toLowerCase();
  if (!ALLOWED_ROLES.has(normalized)) {
    return { error: "role must be one of: admin, user." };
  }
  return { value: normalized };
}

function parseFlag(value, { field, required = false } = {}) {
  if (typeof value === "boolean") {
    return { value: value ? 1 : 0 };
  }
  if (value === 1 || value === 0) {
    return { value };
  }
  const text = toTrimmedString(value, { field, required, max: 5 });
  if (text.error) return { error: text.error };
  if (!text.value) return { value: null };
  const normalized = text.value.toLowerCase();
  if (normalized === "true" || normalized === "1") return { value: 1 };
  if (normalized === "false" || normalized === "0") return { value: 0 };
  return { error: `${field} must be true or false.` };
}

function parseCreateBody(body) {
  const email = toTrimmedString(body?.email, { field: "email", required: true, max: 255 });
  if (email.error) return { error: email.error };
  if (!EMAIL_PATTERN.test(email.value)) return { error: "email must be a valid email address." };
  const password = toTrimmedString(body?.password, {
    field: "password",
    required: true,
    max: 1024
  });
  if (password.error) return { error: password.error };
  if (password.value.length < 8) return { error: "password must be at least 8 characters long." };
  const displayName = toTrimmedString(body?.display_name, {
    field: "display_name",
    required: true,
    max: 120
  });
  if (displayName.error) return { error: displayName.error };
  const role = parseRole(body?.role ?? "user", { required: true });
  if (role.error) return { error: role.error };
  return {
    value: {
      email: email.value.toLowerCase(),
      password: password.value,
      displayName: displayName.value,
      role: role.value
    }
  };
}

function parsePatchBody(body) {
  const patch = {};
  let changed = 0;
  if (hasOwn(body, "display_name")) {
    const displayName = toTrimmedString(body?.display_name, {
      field: "display_name",
      required: false,
      max: 120
    });
    if (displayName.error) return { error: displayName.error };
    if (!displayName.value) return { error: "display_name cannot be empty." };
    patch.displayName = displayName.value;
    changed += 1;
  }
  if (hasOwn(body, "role")) {
    const role = parseRole(body?.role, { required: true });
    if (role.error) return { error: role.error };
    patch.role = role.value;
    changed += 1;
  }
  if (hasOwn(body, "is_active")) {
    const isActive = parseFlag(body?.is_active, { field: "is_active", required: true });
    if (isActive.error) return { error: isActive.error };
    patch.isActive = isActive.value;
    changed += 1;
  }
  if (hasOwn(body, "password")) {
    const password = toTrimmedString(body?.password, {
      field: "password",
      required: false,
      max: 1024
    });
    if (password.error) return { error: password.error };
    if (!password.value) return { error: "password cannot be empty." };
    if (password.value.length < 8) return { error: "password must be at least 8 characters long." };
    patch.password = password.value;
    changed += 1;
  }
  if (changed === 0) return { error: "At least one field is required." };
  return { value: patch };
}

export function registerAdminUsersRoutes(app, deps) {
  const { usersRepository } = deps;

  app.get("/api/admin/users", async (c) => {
    const gate = await requireAdminRequest(c, deps);
    if (gate.response) return gate.response;
    const role = c.req.query("role");
    const active = c.req.query("active");
    const roleFilter = role == null ? { value: null } : parseRole(role, { required: true });
    if (roleFilter.error) return sendError(c, 400, roleFilter.error);
    const activeFilter = active == null ? { value: null } : parseFlag(active, { field: "active", required: true });
    if (activeFilter.error) return sendError(c, 400, activeFilter.error);

    const items = await usersRepository.findAll({
      role: roleFilter.value,
      active: activeFilter.value
    });
    return c.json({ items });
  });

  app.post("/api/admin/users", async (c) => {
    const gate = await requireAdminRequest(c, deps);
    if (gate.response) return gate.response;
    const parsed = parseCreateBody(await c.req.json());
    if (parsed.error) return sendError(c, 400, parsed.error);
    const existing = await usersRepository.findAuthByEmail(parsed.value.email);
    if (existing) return sendError(c, 409, "A user with this email already exists.");
    const passwordHash = await hashPassword(parsed.value.password);
    const created = await usersRepository.create({
      email: parsed.value.email,
      displayName: parsed.value.displayName,
      passwordHash,
      role: parsed.value.role
    });
    return c.json(created, 201);
  });

  app.patch("/api/admin/users/:id", async (c) => {
    const gate = await requireAdminRequest(c, deps);
    if (gate.response) return gate.response;
    const userId = c.req.param("id");
    if (!isUuid(userId)) return sendError(c, 400, "Invalid user id.");
    const parsed = parsePatchBody(await c.req.json());
    if (parsed.error) return sendError(c, 400, parsed.error);
    if (parsed.value.isActive === 0 && gate.auth.user.id === userId) {
      return sendError(c, 400, "You cannot deactivate your own account.");
    }
    const existing = await usersRepository.findById(userId);
    if (!existing) return sendError(c, 404, "User not found.");
    const passwordHash = parsed.value.password ? await hashPassword(parsed.value.password) : null;
    const updated = await usersRepository.update(userId, {
      displayName: parsed.value.displayName,
      role: parsed.value.role,
      isActive: parsed.value.isActive,
      passwordHash
    });
    return c.json(updated);
  });

  app.delete("/api/admin/users/:id", async (c) => {
    const gate = await requireAdminRequest(c, deps);
    if (gate.response) return gate.response;
    const userId = c.req.param("id");
    if (!isUuid(userId)) return sendError(c, 400, "Invalid user id.");
    if (gate.auth.user.id === userId) {
      return sendError(c, 400, "You cannot delete your own account.");
    }
    const existing = await usersRepository.findById(userId);
    if (!existing) return sendError(c, 404, "User not found.");
    await usersRepository.update(userId, { isActive: 0 });
    return new Response(null, { status: 204 });
  });
}
