import crypto from "node:crypto";

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

function normalizeLocalDateTime(input, fallbackDate = null) {
  const raw = String(input || "").trim();
  const match = /^(\d{4}-\d{2}-\d{2})[T\s](\d{2}:\d{2})/.exec(raw);
  if (match) return `${match[1]}T${match[2]}`;
  if (fallbackDate && /^\d{4}-\d{2}-\d{2}$/.test(fallbackDate)) return `${fallbackDate}T00:00`;
  return null;
}

function normalizeTimeZone(input) {
  const raw = String(input || "").trim();
  if (!raw || raw.length > 120 || !/^[A-Za-z0-9_+\-./]+$/.test(raw)) return null;
  return raw;
}

function normalizePaxCount(value) {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

async function ensurePassenger(pool, name) {
  const id = crypto.randomUUID();
  const result = await pool.query(
    `INSERT INTO passengers (id, name)
     VALUES ($1, $2)
     ON CONFLICT(name COLLATE NOCASE) DO UPDATE SET name = excluded.name
     RETURNING id`,
    [id, name]
  );
  return result.rows[0].id;
}

async function linkPair(pool, table, leftCol, leftId, rightCol, rightId) {
  await pool.query(
    `INSERT INTO ${table} (${leftCol}, ${rightCol})
     VALUES ($1, $2)
     ON CONFLICT (${leftCol}, ${rightCol}) DO NOTHING`,
    [leftId, rightId]
  );
}

export function buildLegacyTripsImportService({ pool }) {
  async function replaceForOwner(ownerUserId, payloadTrips) {
    const trips = Array.isArray(payloadTrips) ? payloadTrips : [];
    let createdTrips = 0;

    await pool.query("DELETE FROM trips WHERE owner_user_id = $1", [ownerUserId]);

    for (const trip of trips) {
      const tripName = normText(trip?.name || "Imported trip", 120) || "Imported trip";
      const tripId = crypto.randomUUID();
      await pool.query(
        `INSERT INTO trips (id, owner_user_id, name, notes)
         VALUES ($1, $2, $3, $4)`,
        [tripId, ownerUserId, tripName, null]
      );
      createdTrips += 1;

      for (const rec of Array.isArray(trip?.records) ? trip.records : []) {
        const route = rec?.route || {};
        const dep = route?.departure || {};
        const arr = route?.arrival || {};
        const depScheduledRaw = dep?.scheduledLocal || dep?.scheduled_local || dep?.scheduled || null;
        const arrScheduledRaw = arr?.scheduledLocal || arr?.scheduled_local || arr?.scheduled || null;
        const depIso = normalizeIso(dep?.scheduled, rec?.flightDate);
        const arrIso = normalizeIso(arr?.scheduled, rec?.flightDate);
        const depLocal = normalizeLocalDateTime(
          dep?.scheduledLocal || dep?.scheduled_local || rec?.departureScheduledLocal || rec?.departure_scheduled_local || dep?.scheduled,
          rec?.flightDate
        );
        const arrLocal = normalizeLocalDateTime(
          arr?.scheduledLocal || arr?.scheduled_local || rec?.arrivalScheduledLocal || rec?.arrival_scheduled_local || arr?.scheduled,
          rec?.flightDate
        );
        const depTz = normalizeTimeZone(dep?.timezone || dep?.timeZone || dep?.tz || rec?.departureTimezone || rec?.departure_timezone);
        const arrTz = normalizeTimeZone(arr?.timezone || arr?.timeZone || arr?.tz || rec?.arrivalTimezone || rec?.arrival_timezone);
        const flightId = crypto.randomUUID();

        await pool.query(
          `INSERT INTO flight_records (
             id, trip_id, created_by_user_id, flight_number, airline, pnr,
             departure_airport_name, departure_airport_code, departure_scheduled, departure_scheduled_local, departure_timezone,
             arrival_airport_name, arrival_airport_code, arrival_scheduled, arrival_scheduled_local, arrival_timezone
           ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)`,
          [
            flightId, tripId, ownerUserId,
            normText(route?.flightNumber, 24),
            normText(route?.airline, 120) || null,
            normText(rec?.pnr, 24) || null,
            normText(dep?.airport, 180) || null,
            normText(dep?.iata, 8) || null,
            depIso,
            depLocal || normalizeLocalDateTime(depScheduledRaw, rec?.flightDate),
            depTz,
            normText(arr?.airport, 180) || null,
            normText(arr?.iata, 8) || null,
            arrIso,
            arrLocal || normalizeLocalDateTime(arrScheduledRaw, rec?.flightDate),
            arrTz
          ]
        );

        for (const name of normalizePassengerNames(rec?.paxNames)) {
          const passengerId = await ensurePassenger(pool, name);
          await linkPair(pool, "trip_passengers", "trip_id", tripId, "passenger_id", passengerId);
          await linkPair(pool, "flight_passengers", "flight_record_id", flightId, "passenger_id", passengerId);
        }
      }

      for (const hotel of Array.isArray(trip?.hotels) ? trip.hotels : []) {
        const checkInDate = /^\d{4}-\d{2}-\d{2}$/.test(String(hotel?.checkInDate || ""))
          ? String(hotel.checkInDate) : "1970-01-01";
        const checkOutDate = /^\d{4}-\d{2}-\d{2}$/.test(String(hotel?.checkOutDate || ""))
          ? String(hotel.checkOutDate) : checkInDate;
        const hotelId = crypto.randomUUID();

        await pool.query(
          `INSERT INTO hotel_records (
             id, trip_id, created_by_user_id, hotel_name, confirmation_id,
             check_in_date, check_out_date, pax_count, payment_type
           ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
          [
            hotelId, tripId, ownerUserId,
            normText(hotel?.hotelName || "Hotel", 180) || "Hotel",
            normText(hotel?.confirmationId || hotel?.id, 64) || null,
            checkInDate, checkOutDate,
            normalizePaxCount(hotel?.paxCount),
            hotel?.paymentType === "pay_at_hotel" ? "pay_at_hotel" : "prepaid"
          ]
        );

        for (const name of normalizePassengerNames(hotel?.paxNames)) {
          const passengerId = await ensurePassenger(pool, name);
          await linkPair(pool, "trip_passengers", "trip_id", tripId, "passenger_id", passengerId);
          await linkPair(pool, "hotel_passengers", "hotel_record_id", hotelId, "passenger_id", passengerId);
        }
      }
    }

    return { importedTrips: createdTrips };
  }

  return {
    replaceForOwner
  };
}
