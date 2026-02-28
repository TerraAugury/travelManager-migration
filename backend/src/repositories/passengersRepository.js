export function buildPassengersRepository({ pool }) {
  async function ensureByNames(names) {
    const results = [];
    for (const name of names) {
      const insert = await pool.query(
        `INSERT INTO passengers (name)
         VALUES ($1)
         ON CONFLICT ((LOWER(name))) DO UPDATE SET name = EXCLUDED.name
         RETURNING id, name`,
        [name]
      );
      results.push(insert.rows[0]);
    }
    return results;
  }

  async function linkToTrip({ tripId, passengerIds }) {
    for (const passengerId of passengerIds) {
      await pool.query(
        `INSERT INTO trip_passengers (trip_id, passenger_id)
         VALUES ($1, $2)
         ON CONFLICT (trip_id, passenger_id) DO NOTHING`,
        [tripId, passengerId]
      );
    }
  }

  async function linkToFlight({ flightRecordId, passengerIds }) {
    for (const passengerId of passengerIds) {
      await pool.query(
        `INSERT INTO flight_passengers (flight_record_id, passenger_id)
         VALUES ($1, $2)
         ON CONFLICT (flight_record_id, passenger_id) DO NOTHING`,
        [flightRecordId, passengerId]
      );
    }
  }

  async function replaceFlightLinks({ flightRecordId, passengerIds }) {
    await pool.query("DELETE FROM flight_passengers WHERE flight_record_id = $1", [flightRecordId]);
    await linkToFlight({ flightRecordId, passengerIds });
  }

  async function linkToHotel({ hotelRecordId, passengerIds }) {
    for (const passengerId of passengerIds) {
      await pool.query(
        `INSERT INTO hotel_passengers (hotel_record_id, passenger_id)
         VALUES ($1, $2)
         ON CONFLICT (hotel_record_id, passenger_id) DO NOTHING`,
        [hotelRecordId, passengerId]
      );
    }
  }

  async function replaceHotelLinks({ hotelRecordId, passengerIds }) {
    await pool.query("DELETE FROM hotel_passengers WHERE hotel_record_id = $1", [hotelRecordId]);
    await linkToHotel({ hotelRecordId, passengerIds });
  }

  async function listByTrip({ tripId, ownerUserId }) {
    const result = await pool.query(
      `SELECT p.id, p.name
       FROM trip_passengers tp
       JOIN trips t ON t.id = tp.trip_id
       JOIN passengers p ON p.id = tp.passenger_id
       WHERE tp.trip_id = $1 AND t.owner_user_id = $2
       ORDER BY LOWER(p.name)`,
      [tripId, ownerUserId]
    );
    return result.rows;
  }

  return {
    ensureByNames,
    linkToTrip,
    linkToFlight,
    replaceFlightLinks,
    linkToHotel,
    replaceHotelLinks,
    listByTrip
  };
}
