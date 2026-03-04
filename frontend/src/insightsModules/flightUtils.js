function pad2(num) {
  return String(num).padStart(2, "0");
}

function localDateKey(dateObj) {
  if (!(dateObj instanceof Date) || Number.isNaN(dateObj.getTime())) return "";
  return `${dateObj.getFullYear()}-${pad2(dateObj.getMonth() + 1)}-${pad2(dateObj.getDate())}`;
}

function flightDateKey(flight) {
  if (typeof flight?.departureTime === "string" && flight.departureTime.length >= 10) {
    return flight.departureTime.slice(0, 10);
  }
  return localDateKey(flight?.date);
}

function includesPassenger(names, passengerName) {
  return names.some((name) => name === passengerName);
}

export function normalizeFlightNumber(flightNumber) {
  return String(flightNumber || "").trim().replace(/\s+/g, " ").toUpperCase();
}

export function normalizePassengerNames(names) {
  const seen = new Map();
  for (const raw of Array.isArray(names) ? names : []) {
    const cleaned = String(raw || "").trim().replace(/\s+/g, " ");
    if (!cleaned) continue;
    const key = cleaned.toLowerCase();
    if (!seen.has(key)) seen.set(key, cleaned);
  }
  return Array.from(seen.values()).sort((a, b) => a.localeCompare(b));
}

export function getPassengerFlights(trips, passengerName) {
  const includeAll = passengerName === null;
  if (!includeAll && !passengerName) return [];
  const flights = [];

  for (const trip of Array.isArray(trips) ? trips : []) {
    for (const record of Array.isArray(trip?.records) ? trip.records : []) {
      if (!record?.route) continue;
      const paxNames = normalizePassengerNames(record?.paxNames);
      if (!includeAll && !includesPassenger(paxNames, passengerName)) continue;

      const dep = record.route.departure || {};
      const arr = record.route.arrival || {};
      const dateRaw = dep.scheduled || record.flightDate || record.createdAt;
      const date = new Date(dateRaw || "");
      if (Number.isNaN(date.getTime())) continue;

      flights.push({
        date,
        flightNumber: String(record?.route?.flightNumber || ""),
        airline: record?.route?.airline || "",
        pnr: String(record?.pnr || "").trim(),
        paxNames,
        departureCode: String(dep?.iata || "").trim().toUpperCase(),
        arrivalCode: String(arr?.iata || "").trim().toUpperCase(),
        departureName: String(dep?.airport || "").trim(),
        arrivalName: String(arr?.airport || "").trim(),
        departureTime: dep?.scheduled || null,
        arrivalTime: arr?.scheduled || null
      });
    }
  }

  flights.sort((a, b) => a.date.getTime() - b.date.getTime());
  return flights;
}

export function dedupeFlightsForMap(flights) {
  const seen = new Map();
  const unique = [];

  for (const flight of Array.isArray(flights) ? flights : []) {
    const fn = normalizeFlightNumber(flight?.flightNumber || "");
    const dep = String(flight?.departureCode || "").trim().toUpperCase();
    const arr = String(flight?.arrivalCode || "").trim().toUpperCase();
    const dateKey = flightDateKey(flight);

    if (fn && dep && arr && dateKey) {
      const key = `${fn}__${dateKey}__${dep}__${arr}`;
      const existing = seen.get(key);
      if (existing) {
        existing.paxNames = normalizePassengerNames([...(existing.paxNames || []), ...(flight.paxNames || [])]);
        if (!existing.airline && flight.airline) existing.airline = flight.airline;
        if (!existing.departureName && flight.departureName) existing.departureName = flight.departureName;
        if (!existing.arrivalName && flight.arrivalName) existing.arrivalName = flight.arrivalName;
        if (!existing.departureTime && flight.departureTime) existing.departureTime = flight.departureTime;
        if (!existing.arrivalTime && flight.arrivalTime) existing.arrivalTime = flight.arrivalTime;
        if (!existing.pnr && flight.pnr) existing.pnr = flight.pnr;
        continue;
      }
      const base = { ...flight, paxNames: normalizePassengerNames(flight?.paxNames) };
      seen.set(key, base);
      unique.push(base);
      continue;
    }

    unique.push(flight);
  }

  return unique;
}
