import { requireRequestUser } from "../auth/requestUser.js";

const LIST_TODAY_FLIGHTS_SQL = `SELECT
  fr.id,
  fr.trip_id,
  t.name AS trip_name,
  fr.flight_number,
  fr.airline,
  fr.departure_airport_code,
  fr.departure_airport_name,
  fr.arrival_airport_code,
  fr.arrival_airport_name,
  fr.departure_scheduled,
  fr.arrival_scheduled,
  COALESCE(group_concat(DISTINCT p.name), '') AS passenger_names_csv
FROM flight_records fr
JOIN trips t ON t.id = fr.trip_id
LEFT JOIN trip_passengers tp ON tp.trip_id = t.id
LEFT JOIN passengers p ON p.id = tp.passenger_id
WHERE t.owner_user_id = $1
  AND (
    DATE(fr.departure_scheduled) = DATE('now')
    OR DATE(fr.arrival_scheduled) = DATE('now')
  )
GROUP BY
  fr.id,
  fr.trip_id,
  t.name,
  fr.flight_number,
  fr.airline,
  fr.departure_airport_code,
  fr.departure_airport_name,
  fr.arrival_airport_code,
  fr.arrival_airport_name,
  fr.departure_scheduled,
  fr.arrival_scheduled
ORDER BY COALESCE(fr.departure_scheduled, fr.arrival_scheduled, fr.created_at), fr.created_at`;

function toPassengerNames(csv) {
  if (!csv) return [];
  return String(csv)
    .split(",")
    .map((name) => name.trim())
    .filter(Boolean);
}

function toFlight(row) {
  return {
    id: row.id,
    tripId: row.trip_id,
    tripName: row.trip_name,
    flightNumber: row.flight_number,
    airline: row.airline,
    departureCode: row.departure_airport_code,
    departureAirportName: row.departure_airport_name,
    arrivalCode: row.arrival_airport_code,
    arrivalAirportName: row.arrival_airport_name,
    departureScheduled: row.departure_scheduled,
    arrivalScheduled: row.arrival_scheduled,
    passengerNames: toPassengerNames(row.passenger_names_csv)
  };
}

export function registerFlightsTodayRoutes(app, deps) {
  const { pool } = deps;
  for (const base of ["", "/api"]) {
    const path = (suffix) => `${base}${suffix}`;
    app.get(path("/flights/today"), async (c) => {
      const auth = await requireRequestUser(c, deps);
      if (auth.error) return c.json({ error: auth.error }, auth._status || 401);

      const result = await pool.query(LIST_TODAY_FLIGHTS_SQL, [auth.user.id]);
      const date = new Date().toISOString().slice(0, 10);
      return c.json({
        date,
        flights: result.rows.map(toFlight)
      });
    });
  }
}
