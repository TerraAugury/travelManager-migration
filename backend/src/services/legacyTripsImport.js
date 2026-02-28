function normText(value, maxLen = 255) {
  const text = String(value || "").trim();
  return text.slice(0, maxLen);
}

function normalizePassengerNames(input) {
  const map = new Map();
  for (const raw of Array.isArray(input) ? input : []) {
    const cleaned = normText(raw, 120).replace(/\s+/g, " ");
    if (!cleaned) continue;
    const key = cleaned.toLowerCase();
    if (!map.has(key)) map.set(key, cleaned);
  }
  return Array.from(map.values());
}

function normalizeIso(input, fallbackDate = null) {
  const raw = String(input || "").trim();
  if (raw) {
    const d = new Date(raw);
    if (!Number.isNaN(d.getTime())) return d.toISOString();
  }
  if (fallbackDate && /^\d{4}-\d{2}-\d{2}$/.test(fallbackDate)) {
    return `${fallbackDate}T00:00:00.000Z`;
  }
  return null;
}

async function ensurePassenger(client, name) {
  const result = await client.query(
    `INSERT INTO passengers (name)
     VALUES ($1)
     ON CONFLICT ((LOWER(name))) DO UPDATE SET name = EXCLUDED.name
     RETURNING id`,
    [name]
  );
  return result.rows[0].id;
}

async function linkPair(client, table, leftCol, leftId, rightCol, rightId) {
  await client.query(
    `INSERT INTO ${table} (${leftCol}, ${rightCol})
     VALUES ($1, $2)
     ON CONFLICT (${leftCol}, ${rightCol}) DO NOTHING`,
    [leftId, rightId]
  );
}

export function buildLegacyTripsImportService({ pool }) {
  async function replaceForOwner(ownerUserId, payloadTrips) {
    const trips = Array.isArray(payloadTrips) ? payloadTrips : [];
    const client = await pool.connect();
    let createdTrips = 0;

    try {
      await client.query("BEGIN");
      await client.query("DELETE FROM trips WHERE owner_user_id = $1", [ownerUserId]);

      for (const trip of trips) {
        const tripName = normText(trip?.name || "Imported trip", 120) || "Imported trip";
        const tripInsert = await client.query(
          `INSERT INTO trips (owner_user_id, name, notes)
           VALUES ($1, $2, $3)
           RETURNING id`,
          [ownerUserId, tripName, null]
        );
        const tripId = tripInsert.rows[0].id;
        createdTrips += 1;

        for (const rec of Array.isArray(trip?.records) ? trip.records : []) {
          const route = rec?.route || {};
          const dep = route?.departure || {};
          const arr = route?.arrival || {};
          const depIso = normalizeIso(dep?.scheduled, rec?.flightDate);
          const arrIso = normalizeIso(arr?.scheduled, rec?.flightDate);

          const flightInsert = await client.query(
            `INSERT INTO flight_records (
               trip_id, created_by_user_id, flight_number, airline, pnr,
               departure_airport_name, departure_airport_code, departure_scheduled,
               arrival_airport_name, arrival_airport_code, arrival_scheduled
             ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
             RETURNING id`,
            [
              tripId, ownerUserId, normText(route?.flightNumber, 24), normText(route?.airline, 120) || null,
              normText(rec?.pnr, 24) || null, normText(dep?.airport, 180) || null, normText(dep?.iata, 8) || null,
              depIso, normText(arr?.airport, 180) || null, normText(arr?.iata, 8) || null, arrIso
            ]
          );

          const flightId = flightInsert.rows[0].id;
          const names = normalizePassengerNames(rec?.paxNames);
          for (const name of names) {
            const passengerId = await ensurePassenger(client, name);
            await linkPair(client, "trip_passengers", "trip_id", tripId, "passenger_id", passengerId);
            await linkPair(client, "flight_passengers", "flight_record_id", flightId, "passenger_id", passengerId);
          }
        }

        for (const hotel of Array.isArray(trip?.hotels) ? trip.hotels : []) {
          const checkInDate = /^\d{4}-\d{2}-\d{2}$/.test(String(hotel?.checkInDate || ""))
            ? String(hotel.checkInDate) : "1970-01-01";
          const checkOutDate = /^\d{4}-\d{2}-\d{2}$/.test(String(hotel?.checkOutDate || ""))
            ? String(hotel.checkOutDate) : checkInDate;
          const hotelInsert = await client.query(
            `INSERT INTO hotel_records (
               trip_id, created_by_user_id, hotel_name, confirmation_id,
               check_in_date, check_out_date, pax_count, payment_type
             ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
             RETURNING id`,
            [
              tripId, ownerUserId, normText(hotel?.hotelName || "Hotel", 180) || "Hotel",
              normText(hotel?.confirmationId || hotel?.id, 64) || null, checkInDate, checkOutDate,
              Math.max(1, Number(hotel?.paxCount || 1)),
              hotel?.paymentType === "pay_at_hotel" ? "pay_at_hotel" : "prepaid"
            ]
          );

          const hotelId = hotelInsert.rows[0].id;
          const names = normalizePassengerNames(hotel?.paxNames);
          for (const name of names) {
            const passengerId = await ensurePassenger(client, name);
            await linkPair(client, "trip_passengers", "trip_id", tripId, "passenger_id", passengerId);
            await linkPair(client, "hotel_passengers", "hotel_record_id", hotelId, "passenger_id", passengerId);
          }
        }
      }

      await client.query("COMMIT");
      return { importedTrips: createdTrips };
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  return {
    replaceForOwner
  };
}

