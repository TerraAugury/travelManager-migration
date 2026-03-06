import { airportToCountry } from "./airportCountries.js";

export function hasPassenger(entry, passenger) {
  const names = Array.isArray(entry?.paxNames) ? entry.paxNames : [];
  return names.some((name) => String(name || "").trim() === passenger);
}

export function mapIataToCountry(code) {
  const iata = String(code || "").trim().toUpperCase();
  return airportToCountry[iata] || "Other";
}

export function startOfUtcDay(date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

export function getPassengerFlights(trips, passenger) {
  const flights = [];
  for (const trip of Array.isArray(trips) ? trips : []) {
    for (const record of Array.isArray(trip?.records) ? trip.records : []) {
      if (!hasPassenger(record, passenger)) continue;
      const dateRaw = record?.route?.departure?.scheduled || record?.flightDate || record?.createdAt;
      const date = new Date(dateRaw || "");
      if (Number.isNaN(date.getTime())) continue;
      flights.push({
        date,
        departureCountry: mapIataToCountry(record?.route?.departure?.iata),
        arrivalCountry: mapIataToCountry(record?.route?.arrival?.iata)
      });
    }
  }
  flights.sort((a, b) => a.date.getTime() - b.date.getTime());
  return flights;
}
