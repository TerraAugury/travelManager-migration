import test from "node:test";
import assert from "node:assert/strict";
import { buildTripSharesRepository } from "../src/repositories/tripSharesRepository.js";
import { buildTripsRepository } from "../src/repositories/tripsRepository.js";

function createPool() {
  const users = [
    { id: "user-a", email: "a@site.com", display_name: "User A" },
    { id: "user-b", email: "b@site.com", display_name: "User B" }
  ];
  const trips = [
    { id: "trip-1", owner_user_id: "user-a", name: "A-1", notes: null, start_date: null, end_date: null, created_at: "2026-01-01", updated_at: "2026-01-01" },
    { id: "trip-2", owner_user_id: "user-a", name: "A-2", notes: null, start_date: null, end_date: null, created_at: "2026-01-01", updated_at: "2026-01-01" }
  ];
  const shares = [];
  return {
    async query(text, params) {
      if (/FROM users[\s\S]*LOWER\(email\)/i.test(text)) {
        const row = users.find((u) => u.email.toLowerCase() === String(params[0]).toLowerCase());
        return { rows: row ? [row] : [], rowCount: row ? 1 : 0 };
      }
      if (/SELECT id[\s\S]*FROM trips[\s\S]*owner_user_id = \$2/i.test(text)) {
        const row = trips.find((t) => t.id === params[0] && t.owner_user_id === params[1]);
        return { rows: row ? [{ id: row.id }] : [], rowCount: row ? 1 : 0 };
      }
      if (/INSERT INTO trip_shares/i.test(text)) {
        const [id, ownerUserId, sharedWithUserId, tripId] = params;
        if (ownerUserId === sharedWithUserId) throw new Error("CHECK constraint failed");
        const duplicate = shares.some((s) =>
          s.owner_user_id === ownerUserId
          && s.shared_with_user_id === sharedWithUserId
          && s.trip_id === (tripId ?? null)
        );
        if (duplicate) throw new Error("UNIQUE constraint failed");
        const row = {
          id, owner_user_id: ownerUserId, shared_with_user_id: sharedWithUserId,
          trip_id: tripId ?? null, permission: "readwrite", created_at: "2026-01-02"
        };
        shares.push(row);
        return { rows: [row], rowCount: 1 };
      }
      if (/DELETE FROM trip_shares/i.test(text)) {
        const [shareId, ownerUserId] = params;
        const idx = shares.findIndex((s) => s.id === shareId && s.owner_user_id === ownerUserId);
        if (idx < 0) return { rows: [], rowCount: 0 };
        shares.splice(idx, 1);
        return { rows: [], rowCount: 1 };
      }
      if (/SELECT EXISTS[\s\S]*FROM trips t/i.test(text)) {
        const [userId, tripId] = params;
        const trip = trips.find((t) => t.id === tripId);
        const has = !!trip && (
          trip.owner_user_id === userId
          || shares.some((s) =>
            s.shared_with_user_id === userId
            && s.owner_user_id === trip.owner_user_id
            && (s.trip_id === trip.id || s.trip_id == null)
          )
        );
        return { rows: [{ has_access: has ? 1 : 0 }], rowCount: 1 };
      }
      if (/UPDATE trips/i.test(text)) {
        const [tripId, ownerUserId, name, notes, startDate, endDate] = params;
        const row = trips.find((t) => t.id === tripId && t.owner_user_id === ownerUserId);
        if (!row) return { rows: [], rowCount: 0 };
        if (name != null) row.name = name;
        if (notes != null) row.notes = notes;
        if (startDate != null) row.start_date = startDate;
        if (endDate != null) row.end_date = endDate;
        row.updated_at = "2026-01-03";
        return { rows: [row], rowCount: 1 };
      }
      if (/DELETE FROM trips WHERE id = \$1 AND owner_user_id = \$2/i.test(text)) {
        const [tripId, ownerUserId] = params;
        const idx = trips.findIndex((t) => t.id === tripId && t.owner_user_id === ownerUserId);
        if (idx < 0) return { rows: [], rowCount: 0 };
        trips.splice(idx, 1);
        return { rows: [], rowCount: 1 };
      }
      throw new Error(`Unhandled SQL in test: ${text}`);
    }
  };
}

test("share creation + access checks + share removal", async () => {
  const pool = createPool();
  const sharesRepo = buildTripSharesRepository({ pool });
  const created = await sharesRepo.create({ ownerUserId: "user-a", sharedWithEmail: "b@site.com", tripId: "trip-1" });
  assert.equal(created.shared_with_email, "b@site.com");
  assert.equal(await sharesRepo.hasAccess("user-b", "trip-1"), true);
  assert.equal(await sharesRepo.hasAccess("user-b", "trip-2"), false);
  assert.equal(await sharesRepo.remove(created.id, "user-a"), true);
  assert.equal(await sharesRepo.hasAccess("user-b", "trip-1"), false);
});

test("share all mode grants access to all owner trips", async () => {
  const pool = createPool();
  const sharesRepo = buildTripSharesRepository({ pool });
  await sharesRepo.create({ ownerUserId: "user-a", sharedWithEmail: "b@site.com", tripId: null });
  assert.equal(await sharesRepo.hasAccess("user-b", "trip-1"), true);
  assert.equal(await sharesRepo.hasAccess("user-b", "trip-2"), true);
});

test("owner-only trip operations cannot be done by shared user", async () => {
  const pool = createPool();
  const tripsRepo = buildTripsRepository({ pool });
  const updated = await tripsRepo.update("trip-1", "user-b", { name: "Hacked" });
  assert.equal(updated, null);
  const removed = await tripsRepo.remove("trip-1", "user-b");
  assert.equal(removed, false);
});

test("self-share is rejected", async () => {
  const pool = createPool();
  const sharesRepo = buildTripSharesRepository({ pool });
  await assert.rejects(
    () => sharesRepo.create({ ownerUserId: "user-a", sharedWithEmail: "a@site.com", tripId: "trip-1" }),
    /CHECK constraint failed/
  );
});
