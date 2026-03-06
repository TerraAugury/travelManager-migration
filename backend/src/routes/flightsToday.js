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
LEFT JOIN flight_passengers fp ON fp.flight_record_id = fr.id
LEFT JOIN trip_passengers tp ON tp.trip_id = t.id AND tp.passenger_id = fp.passenger_id
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

function toNumberHeader(value) {
  const parsed = Number.parseInt(String(value || ""), 10);
  return Number.isFinite(parsed) ? parsed : null;
}

function toJsonOrText(raw) {
  const text = String(raw || "").trim();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text.slice(0, 500);
  }
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

    app.get(path("/flights/aerodatabox/balance"), async (c) => {
      const auth = await requireRequestUser(c, deps);
      if (auth.error) return c.json({ error: auth.error }, auth._status || 401);
      const key = c.env?.AERODATABOX_API_KEY;
      if (!key) return c.json({ error: "Flight lookup not configured on this server." }, 503);

      const res = await fetch("https://aerodatabox.p.rapidapi.com/subscriptions/balance", {
        headers: {
          "X-RapidAPI-Key": key,
          "X-RapidAPI-Host": "aerodatabox.p.rapidapi.com"
        }
      });
      const raw = await res.text();
      if (!res.ok) {
        return c.json({
          error: "Could not load AeroDataBox balance.",
          upstreamStatus: res.status,
          upstreamBody: toJsonOrText(raw)
        }, 502);
      }
      const json = toJsonOrText(raw) || {};
      return c.json({
        creditsRemaining: toNumberHeader(json?.creditsRemaining),
        lastRefilledUtc: json?.lastRefilledUtc || null,
        lastDeductedUtc: json?.lastDeductedUtc || null,
        requestsRemaining: toNumberHeader(res.headers.get("x-ratelimit-requests-remaining")),
        requestsLimit: toNumberHeader(res.headers.get("x-ratelimit-requests-limit")),
        requestsReset: toNumberHeader(res.headers.get("x-ratelimit-requests-reset"))
      });
    });
  }
}
