import crypto from "node:crypto";

export function buildTripsRepository({ pool }) {
  async function listByOwner(ownerUserId) {
    const result = await pool.query(
      `SELECT id, owner_user_id, name, notes, start_date, end_date, created_at, updated_at
       FROM trips
       WHERE owner_user_id = $1
       ORDER BY COALESCE(start_date, '9999-12-31'), created_at`,
      [ownerUserId]
    );
    return result.rows;
  }

  async function getById(tripId, ownerUserId) {
    const result = await pool.query(
      `SELECT id, owner_user_id, name, notes, start_date, end_date, created_at, updated_at
       FROM trips
       WHERE id = $1 AND owner_user_id = $2`,
      [tripId, ownerUserId]
    );
    return result.rows[0] || null;
  }

  async function create(input) {
    const { ownerUserId, name, notes = null, startDate = null, endDate = null } = input;
    const id = crypto.randomUUID();
    const result = await pool.query(
      `INSERT INTO trips (id, owner_user_id, name, notes, start_date, end_date)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, owner_user_id, name, notes, start_date, end_date, created_at, updated_at`,
      [id, ownerUserId, name, notes, startDate, endDate]
    );
    return result.rows[0];
  }

  async function update(tripId, ownerUserId, patch) {
    const { name, notes, startDate, endDate } = patch;
    const result = await pool.query(
      `UPDATE trips
       SET
         name = COALESCE($3, name),
         notes = COALESCE($4, notes),
         start_date = COALESCE($5, start_date),
         end_date = COALESCE($6, end_date),
         updated_at = datetime('now')
       WHERE id = $1 AND owner_user_id = $2
       RETURNING id, owner_user_id, name, notes, start_date, end_date, created_at, updated_at`,
      [tripId, ownerUserId, name ?? null, notes ?? null, startDate ?? null, endDate ?? null]
    );
    return result.rows[0] || null;
  }

  async function remove(tripId, ownerUserId) {
    const result = await pool.query(
      "DELETE FROM trips WHERE id = $1 AND owner_user_id = $2",
      [tripId, ownerUserId]
    );
    return result.rowCount > 0;
  }

  return {
    listByOwner,
    getById,
    create,
    update,
    remove
  };
}
