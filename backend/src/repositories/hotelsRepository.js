import crypto from "node:crypto";

export function buildHotelsRepository({ pool }) {
  async function listByOwner(ownerUserId) {
    const result = await pool.query(
      `SELECT
         hr.id, hr.trip_id, hr.created_by_user_id, hr.hotel_name, hr.confirmation_id,
         hr.check_in_date, hr.check_out_date, hr.pax_count, hr.payment_type,
         hr.created_at, hr.updated_at
       FROM hotel_records hr
       JOIN trips t ON t.id = hr.trip_id
       WHERE t.owner_user_id = $1
       ORDER BY hr.trip_id, hr.check_in_date, hr.created_at`,
      [ownerUserId]
    );
    return result.rows;
  }

  async function listByTrip({ tripId, ownerUserId }) {
    const result = await pool.query(
      `SELECT
         hr.id, hr.trip_id, hr.created_by_user_id, hr.hotel_name, hr.confirmation_id,
         hr.check_in_date, hr.check_out_date, hr.pax_count, hr.payment_type,
         hr.created_at, hr.updated_at
       FROM hotel_records hr
       JOIN trips t ON t.id = hr.trip_id
       WHERE hr.trip_id = $1 AND t.owner_user_id = $2
       ORDER BY hr.check_in_date, hr.created_at`,
      [tripId, ownerUserId]
    );
    return result.rows;
  }

  async function create(input) {
    const tripCheck = await pool.query(
      `SELECT id FROM trips WHERE id = $1 AND owner_user_id = $2`,
      [input.tripId, input.ownerUserId]
    );
    if (!tripCheck.rows[0]) return null;

    const id = crypto.randomUUID();
    const result = await pool.query(
      `INSERT INTO hotel_records (
         id, trip_id, created_by_user_id, hotel_name, confirmation_id,
         check_in_date, check_out_date, pax_count, payment_type
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING
         id, trip_id, created_by_user_id, hotel_name, confirmation_id,
         check_in_date, check_out_date, pax_count, payment_type,
         created_at, updated_at`,
      [
        id,
        input.tripId,
        input.ownerUserId,
        input.hotelName,
        input.confirmationId,
        input.checkInDate,
        input.checkOutDate,
        input.paxCount,
        input.paymentType
      ]
    );
    return result.rows[0] || null;
  }

  async function update(input) {
    const result = await pool.query(
      `UPDATE hotel_records
       SET
         hotel_name = $3,
         confirmation_id = $4,
         check_in_date = $5,
         check_out_date = $6,
         pax_count = $7,
         payment_type = $8,
         updated_at = datetime('now')
       WHERE id = $1
         AND trip_id IN (SELECT id FROM trips WHERE owner_user_id = $2)
       RETURNING
         id, trip_id, created_by_user_id, hotel_name, confirmation_id,
         check_in_date, check_out_date, pax_count, payment_type,
         created_at, updated_at`,
      [
        input.hotelId,
        input.ownerUserId,
        input.hotelName,
        input.confirmationId,
        input.checkInDate,
        input.checkOutDate,
        input.paxCount,
        input.paymentType
      ]
    );
    return result.rows[0] || null;
  }

  async function remove({ hotelId, ownerUserId }) {
    const result = await pool.query(
      `DELETE FROM hotel_records
       WHERE id = $1
         AND trip_id IN (SELECT id FROM trips WHERE owner_user_id = $2)`,
      [hotelId, ownerUserId]
    );
    return result.rowCount > 0;
  }

  return {
    listByOwner,
    listByTrip,
    create,
    update,
    remove
  };
}
