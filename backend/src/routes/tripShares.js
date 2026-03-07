import { requireRequestUser } from "../auth/requestUser.js";
import { sendError } from "../http/responses.js";
import { isUuid, toTrimmedString } from "../http/validation.js";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function parseCreateShareBody(body) {
  const email = toTrimmedString(body?.email, { field: "email", required: true, max: 255 });
  if (email.error) return { error: email.error };
  if (!EMAIL_PATTERN.test(email.value)) return { error: "email must be a valid email address." };

  const rawTripId = toTrimmedString(body?.tripId, { field: "tripId", required: false, max: 120 });
  if (rawTripId.error) return { error: rawTripId.error };
  if (rawTripId.value && !isUuid(rawTripId.value)) return { error: "tripId must be a valid UUID." };

  return {
    value: {
      email: email.value.toLowerCase(),
      tripId: rawTripId.value || null
    }
  };
}

function mapCreateError(err) {
  if (err?.status && err?.message) return err;
  const msg = String(err?.message || "");
  if (msg.includes("UNIQUE constraint failed")) {
    return { status: 409, message: "Share already exists." };
  }
  if (msg.includes("CHECK constraint failed")) {
    return { status: 400, message: "You cannot share trips with yourself." };
  }
  return { status: 500, message: "Internal server error." };
}

export function registerTripShareRoutes(app, deps) {
  const { tripSharesRepository } = deps;

  app.get("/api/trips/shares", async (c) => {
    const auth = await requireRequestUser(c, deps);
    if (auth.error) return c.json({ error: auth.error }, auth._status || 401);
    const items = await tripSharesRepository.listByOwner(auth.user.id);
    return c.json({ items });
  });

  app.post("/api/trips/shares", async (c) => {
    const auth = await requireRequestUser(c, deps);
    if (auth.error) return c.json({ error: auth.error }, auth._status || 401);
    const parsed = parseCreateShareBody(await c.req.json());
    if (parsed.error) return sendError(c, 400, parsed.error);

    try {
      const created = await tripSharesRepository.create({
        ownerUserId: auth.user.id,
        sharedWithEmail: parsed.value.email,
        tripId: parsed.value.tripId
      });
      return c.json(created, 201);
    } catch (err) {
      const mapped = mapCreateError(err);
      return sendError(c, mapped.status, mapped.message);
    }
  });

  app.delete("/api/trips/shares/:shareId", async (c) => {
    const auth = await requireRequestUser(c, deps);
    if (auth.error) return c.json({ error: auth.error }, auth._status || 401);
    const shareId = c.req.param("shareId");
    if (!isUuid(shareId)) return sendError(c, 400, "Invalid shareId.");
    const removed = await tripSharesRepository.remove(shareId, auth.user.id);
    if (!removed) return sendError(c, 404, "Share not found.");
    return new Response(null, { status: 204 });
  });

  app.get("/api/trips/shared-with-me", async (c) => {
    const auth = await requireRequestUser(c, deps);
    if (auth.error) return c.json({ error: auth.error }, auth._status || 401);
    const items = await tripSharesRepository.listBySharedWith(auth.user.id);
    return c.json({ items });
  });
}
