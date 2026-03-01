import crypto from "node:crypto";

export function buildFlightsRepository({ pool }) {
  async function listByTrip({ tripId, ownerUserId }) {
    const result = await pool.query(
      `SELECT
         fr.id, fr.trip_id, fr.created_by_user_id, fr.flight_number, fr.airline, fr.pnr,
         fr.departure_airport_name, fr.departure_airport_code, fr.departure_scheduled,
         fr.arrival_airport_name, fr.arrival_airport_code, fr.arrival_scheduled,
         fr.created_at, fr.updated_at
       FROM flight_records fr
       JOIN trips t ON t.id = fr.trip_id
       WHERE fr.trip_id = $1 AND t.owner_user_id = $2
       ORDER BY COALESCE(fr.departure_scheduled, fr.created_at), fr.created_at`,
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
      `INSERT INTO flight_records (
         id, trip_id, created_by_user_id, flight_number, airline, pnr,
         departure_airport_name, departure_airport_code, departure_scheduled,
         arrival_airport_name, arrival_airport_code, arrival_scheduled
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       RETURNING
         id, trip_id, created_by_user_id, flight_number, airline, pnr,
         departure_airport_name, departure_airport_code, departure_scheduled,
         arrival_airport_name, arrival_airport_code, arrival_scheduled,
         created_at, updated_at`,
      [
        id,
        input.tripId,
        input.ownerUserId,
        input.flightNumber,
        input.airline,
        input.pnr,
        input.departureAirportName,
        input.departureAirportCode,
        input.departureScheduled,
        input.arrivalAirportName,
        input.arrivalAirportCode,
        input.arrivalScheduled
      ]
    );
    return result.rows[0] || null;
  }

  async function update(input) {
    const result = await pool.query(
      `UPDATE flight_records
       SET
         flight_number = $3,
         airline = $4,
         pnr = $5,
         departure_airport_name = $6,
         departure_airport_code = $7,
         departure_scheduled = $8,
         arrival_airport_name = $9,
         arrival_airport_code = $10,
         arrival_scheduled = $11,
         updated_at = datetime('now')
       WHERE id = $1
         AND trip_id IN (SELECT id FROM trips WHERE owner_user_id = $2)
       RETURNING
         id, trip_id, created_by_user_id, flight_number, airline, pnr,
         departure_airport_name, departure_airport_code, departure_scheduled,
         arrival_airport_name, arrival_airport_code, arrival_scheduled,
         created_at, updated_at`,
      [
        input.flightId,
        input.ownerUserId,
        input.flightNumber,
        input.airline,
        input.pnr,
        input.departureAirportName,
        input.departureAirportCode,
        input.departureScheduled,
        input.arrivalAirportName,
        input.arrivalAirportCode,
        input.arrivalScheduled
      ]
    );
    return result.rows[0] || null;
  }

  async function remove({ flightId, ownerUserId }) {
    const result = await pool.query(
      `DELETE FROM flight_records
       WHERE id = $1
         AND trip_id IN (SELECT id FROM trips WHERE owner_user_id = $2)`,
      [flightId, ownerUserId]
    );
    return result.rowCount > 0;
  }

  return {
    listByTrip,
    create,
    update,
    remove
  };
}
