import crypto from "node:crypto";
import { sharedTripAccessWhere } from "./sharedAccessSql.js";

const DERIVED_START_SQL = `COALESCE(
  t.start_date,
  (
    SELECT MIN(d)
    FROM (
      SELECT COALESCE(substr(fr.departure_scheduled_local, 1, 10), substr(fr.departure_scheduled, 1, 10)) AS d
      FROM flight_records fr
      WHERE fr.trip_id = t.id AND (fr.departure_scheduled_local IS NOT NULL OR fr.departure_scheduled IS NOT NULL)
      UNION ALL
      SELECT hr.check_in_date AS d
      FROM hotel_records hr
      WHERE hr.trip_id = t.id AND hr.check_in_date IS NOT NULL
    )
  )
)`;

const DERIVED_END_SQL = `COALESCE(
  t.end_date,
  (
    SELECT MAX(d)
    FROM (
      SELECT COALESCE(substr(fr.arrival_scheduled_local, 1, 10), substr(fr.arrival_scheduled, 1, 10)) AS d
      FROM flight_records fr
      WHERE fr.trip_id = t.id AND (fr.arrival_scheduled_local IS NOT NULL OR fr.arrival_scheduled IS NOT NULL)
      UNION ALL
      SELECT COALESCE(substr(fr.departure_scheduled_local, 1, 10), substr(fr.departure_scheduled, 1, 10)) AS d
      FROM flight_records fr
      WHERE fr.trip_id = t.id AND (fr.departure_scheduled_local IS NOT NULL OR fr.departure_scheduled IS NOT NULL)
      UNION ALL
      SELECT hr.check_out_date AS d
      FROM hotel_records hr
      WHERE hr.trip_id = t.id AND hr.check_out_date IS NOT NULL
      UNION ALL
      SELECT hr.check_in_date AS d
      FROM hotel_records hr
      WHERE hr.trip_id = t.id AND hr.check_in_date IS NOT NULL
    )
  )
)`;

export function buildTripsRepository({ pool }) {
  async function listAccessible(userId) {
    const result = await pool.query(
      `SELECT
         t.id,
         t.owner_user_id,
         t.name,
         t.notes,
         CASE WHEN t.owner_user_id = $1 THEN 0 ELSE 1 END AS is_shared,
         ${DERIVED_START_SQL} AS start_date,
         ${DERIVED_END_SQL} AS end_date,
         t.created_at,
         t.updated_at
       FROM trips t
       WHERE ${sharedTripAccessWhere({ tripAlias: "t", userParam: "$1" })}
       ORDER BY COALESCE(${DERIVED_START_SQL}, '9999-12-31'), t.created_at`,
      [userId]
    );
    return result.rows;
  }

  async function getById(tripId, userId) {
    const result = await pool.query(
      `SELECT
         t.id,
         t.owner_user_id,
         t.name,
         t.notes,
         CASE WHEN t.owner_user_id = $2 THEN 0 ELSE 1 END AS is_shared,
         ${DERIVED_START_SQL} AS start_date,
         ${DERIVED_END_SQL} AS end_date,
         t.created_at,
         t.updated_at
       FROM trips t
       WHERE t.id = $1
         AND ${sharedTripAccessWhere({ tripAlias: "t", userParam: "$2" })}`,
      [tripId, userId]
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
    listAccessible,
    listByOwner: listAccessible,
    getById,
    create,
    update,
    remove
  };
}
