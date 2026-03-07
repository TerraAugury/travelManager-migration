import crypto from "node:crypto";
import { sharedTripAccessWhere } from "./sharedAccessSql.js";

const FLIGHT_SELECT_COLUMNS = `fr.id, fr.trip_id, fr.created_by_user_id, fr.flight_number, fr.airline, fr.pnr,
  fr.departure_airport_name, fr.departure_airport_code, fr.departure_scheduled,
  fr.departure_scheduled_local, fr.departure_timezone,
  fr.arrival_airport_name, fr.arrival_airport_code, fr.arrival_scheduled,
  fr.arrival_scheduled_local, fr.arrival_timezone,
  fr.created_at, fr.updated_at`;
const FLIGHT_RETURN_COLUMNS = `id, trip_id, created_by_user_id, flight_number, airline, pnr,
  departure_airport_name, departure_airport_code, departure_scheduled, departure_scheduled_local, departure_timezone,
  arrival_airport_name, arrival_airport_code, arrival_scheduled, arrival_scheduled_local, arrival_timezone,
  created_at, updated_at`;

export function buildFlightsRepository({ pool, tripSharesRepository }) {
  async function listAccessible(userId) {
    const result = await pool.query(
      `SELECT
         ${FLIGHT_SELECT_COLUMNS}
       FROM flight_records fr
       JOIN trips t ON t.id = fr.trip_id
       WHERE ${sharedTripAccessWhere({ tripAlias: "t", userParam: "$1" })}
       ORDER BY fr.trip_id, COALESCE(fr.departure_scheduled_local, fr.departure_scheduled, fr.created_at), fr.created_at`,
      [userId]
    );
    return result.rows;
  }

  async function listByTrip({ tripId, ownerUserId }) {
    const result = await pool.query(
      `SELECT
         ${FLIGHT_SELECT_COLUMNS}
       FROM flight_records fr
       JOIN trips t ON t.id = fr.trip_id
       WHERE fr.trip_id = $1
         AND ${sharedTripAccessWhere({ tripAlias: "t", userParam: "$2" })}
       ORDER BY COALESCE(fr.departure_scheduled_local, fr.departure_scheduled, fr.created_at), fr.created_at`,
      [tripId, ownerUserId]
    );
    return result.rows;
  }

  async function create(input) {
    const canAccess = await tripSharesRepository.hasAccess(input.ownerUserId, input.tripId);
    if (!canAccess) return null;

    const id = crypto.randomUUID();
    const result = await pool.query(
      `INSERT INTO flight_records (
         id, trip_id, created_by_user_id, flight_number, airline, pnr,
         departure_airport_name, departure_airport_code, departure_scheduled, departure_scheduled_local, departure_timezone,
         arrival_airport_name, arrival_airport_code, arrival_scheduled, arrival_scheduled_local, arrival_timezone
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
       RETURNING
         id, trip_id, created_by_user_id, flight_number, airline, pnr,
         departure_airport_name, departure_airport_code, departure_scheduled, departure_scheduled_local, departure_timezone,
         arrival_airport_name, arrival_airport_code, arrival_scheduled, arrival_scheduled_local, arrival_timezone,
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
        input.departureScheduledLocal,
        input.departureTimezone,
        input.arrivalAirportName,
        input.arrivalAirportCode,
        input.arrivalScheduled,
        input.arrivalScheduledLocal,
        input.arrivalTimezone
      ]
    );
    return result.rows[0] || null;
  }

  async function update(input) {
    const tripResult = await pool.query(
      `SELECT trip_id FROM flight_records WHERE id = $1`,
      [input.flightId]
    );
    const tripId = tripResult.rows[0]?.trip_id || null;
    if (!tripId) return null;
    const canAccess = await tripSharesRepository.hasAccess(input.ownerUserId, tripId);
    if (!canAccess) return null;

    const result = await pool.query(
      `UPDATE flight_records
       SET
         flight_number = $2,
         airline = $3,
         pnr = $4,
         departure_airport_name = $5,
         departure_airport_code = $6,
         departure_scheduled = $7,
         departure_scheduled_local = $8,
         departure_timezone = $9,
         arrival_airport_name = $10,
         arrival_airport_code = $11,
         arrival_scheduled = $12,
         arrival_scheduled_local = $13,
         arrival_timezone = $14,
         updated_at = datetime('now')
       WHERE id = $1
       RETURNING
         ${FLIGHT_RETURN_COLUMNS}`,
      [
        input.flightId,
        input.flightNumber,
        input.airline,
        input.pnr,
        input.departureAirportName,
        input.departureAirportCode,
        input.departureScheduled,
        input.departureScheduledLocal,
        input.departureTimezone,
        input.arrivalAirportName,
        input.arrivalAirportCode,
        input.arrivalScheduled,
        input.arrivalScheduledLocal,
        input.arrivalTimezone
      ]
    );
    return result.rows[0] || null;
  }

  async function remove({ flightId, ownerUserId }) {
    const tripResult = await pool.query(
      `SELECT trip_id FROM flight_records WHERE id = $1`,
      [flightId]
    );
    const tripId = tripResult.rows[0]?.trip_id || null;
    if (!tripId) return false;
    const canAccess = await tripSharesRepository.hasAccess(ownerUserId, tripId);
    if (!canAccess) return false;

    const result = await pool.query(
      `DELETE FROM flight_records
       WHERE id = $1`,
      [flightId]
    );
    return result.rowCount > 0;
  }

  return {
    listAccessible,
    listByOwner: listAccessible,
    listByTrip,
    create,
    update,
    remove
  };
}
