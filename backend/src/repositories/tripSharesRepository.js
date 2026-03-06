import crypto from "node:crypto";

function toBool(value) {
  return value === true || value === 1 || value === "1";
}

export function buildTripSharesRepository({ pool }) {
  async function listByOwner(ownerUserId) {
    const result = await pool.query(
      `SELECT
         ts.id,
         ts.owner_user_id,
         ts.shared_with_user_id,
         ts.trip_id,
         ts.permission,
         ts.created_at,
         u.display_name AS shared_with_display_name,
         u.email AS shared_with_email
       FROM trip_shares ts
       JOIN users u ON u.id = ts.shared_with_user_id
       WHERE ts.owner_user_id = $1
       ORDER BY ts.created_at DESC, ts.id`,
      [ownerUserId]
    );
    return result.rows;
  }

  async function listBySharedWith(sharedWithUserId) {
    const result = await pool.query(
      `SELECT
         ts.id,
         ts.owner_user_id,
         ts.shared_with_user_id,
         ts.trip_id,
         ts.permission,
         ts.created_at,
         u.display_name AS owner_display_name,
         u.email AS owner_email
       FROM trip_shares ts
       JOIN users u ON u.id = ts.owner_user_id
       WHERE ts.shared_with_user_id = $1
       ORDER BY ts.created_at DESC, ts.id`,
      [sharedWithUserId]
    );
    return result.rows;
  }

  async function create({ ownerUserId, sharedWithEmail, tripId }) {
    const targetUser = await pool.query(
      `SELECT id, email, display_name
       FROM users
       WHERE LOWER(email) = LOWER($1)`,
      [sharedWithEmail]
    );
    const sharedWith = targetUser.rows[0] || null;
    if (!sharedWith) throw { status: 404, message: "User not found." };

    if (tripId) {
      const tripCheck = await pool.query(
        `SELECT id
         FROM trips
         WHERE id = $1 AND owner_user_id = $2`,
        [tripId, ownerUserId]
      );
      if (!tripCheck.rows[0]) throw { status: 404, message: "Trip not found." };
    }

    const id = crypto.randomUUID();
    const result = await pool.query(
      `INSERT INTO trip_shares (
         id, owner_user_id, shared_with_user_id, trip_id
       )
       VALUES ($1, $2, $3, $4)
       RETURNING id, owner_user_id, shared_with_user_id, trip_id, permission, created_at`,
      [id, ownerUserId, sharedWith.id, tripId ?? null]
    );
    const created = result.rows[0] || null;
    if (!created) return null;
    return {
      ...created,
      shared_with_display_name: sharedWith.display_name,
      shared_with_email: sharedWith.email
    };
  }

  async function remove(shareId, ownerUserId) {
    const result = await pool.query(
      `DELETE FROM trip_shares
       WHERE id = $1 AND owner_user_id = $2`,
      [shareId, ownerUserId]
    );
    return result.rowCount > 0;
  }

  async function hasAccess(userId, tripId) {
    const result = await pool.query(
      `SELECT EXISTS (
         SELECT 1
         FROM trips t
         WHERE t.id = $2
           AND (
             t.owner_user_id = $1
             OR EXISTS (
               SELECT 1
               FROM trip_shares ts
               WHERE ts.owner_user_id = t.owner_user_id
                 AND ts.shared_with_user_id = $1
                 AND (ts.trip_id = t.id OR ts.trip_id IS NULL)
             )
           )
       ) AS has_access`,
      [userId, tripId]
    );
    return toBool(result.rows[0]?.has_access);
  }

  return {
    listByOwner,
    listBySharedWith,
    create,
    remove,
    hasAccess
  };
}
