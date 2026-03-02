// =========================
// Day Count Helpers (per-passenger, per-country, per-month)
// =========================

import { getPassengerFlights } from "./flights.js";

export function getPassengerYears(trips, passengerName) {
  const years = new Set();
  for (const f of getPassengerFlights(trips, passengerName)) {
    years.add(f.date.getFullYear());
  }
  return Array.from(years).sort((a, b) => a - b);
}

export function calculateDaysByCountry(trips, passengerName, year) {
  const flights = getPassengerFlights(trips, passengerName);
  const yearStart = new Date(Date.UTC(year, 0, 1));
  const yearEnd = new Date(Date.UTC(year + 1, 0, 1));

  if (!flights.length) {
    return { countries: {}, years: [], rangesByCountry: {} };
  }

  const formatAirportLabel = (name, code) => {
    const nameText = (name || "").toString().trim();
    const codeText = (code || "").toString().trim();
    if (nameText && codeText) {
      const normName = nameText.toUpperCase();
      const normCode = codeText.toUpperCase();
      if (normName.includes(normCode)) return nameText;
      return `${nameText} (${codeText})`;
    }
    return nameText || codeText;
  };

  const toUtcDateStart = (date) => new Date(Date.UTC(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate()
  ));

  // Determine country at year start by simulating all flights up to the year boundary.
  let currentCountry = flights[0].departureCountry || "Other";
  let lastArrival = null;
  for (const f of flights) {
    const depDay = toUtcDateStart(f.date);
    if (depDay < yearStart) {
      // Move to arrival country if different.
      if (f.arrivalCountry) {
        currentCountry = f.arrivalCountry;
        lastArrival = f;
      }
    } else {
      break;
    }
  }

  let cursor = new Date(yearStart);
  let entryFlight = lastArrival;
  const stays = [];
  for (const f of flights) {
    const depDay = toUtcDateStart(f.date);
    if (depDay < yearStart) continue;
    if (depDay >= yearEnd) break;

    // Close current stay up to flight departure
    stays.push({
      country: currentCountry,
      start: new Date(cursor),
      end: new Date(depDay),
      entryFlight,
      exitFlight: f
    });

    // Move to arrival country (if differs)
    if (f.arrivalCountry) {
      currentCountry = f.arrivalCountry;
      entryFlight = f;
    }
    cursor = new Date(depDay);
  }

  // Final stay to year end
  stays.push({
    country: currentCountry,
    start: new Date(cursor),
    end: new Date(yearEnd),
    entryFlight,
    exitFlight: null
  });

  // Aggregate days per country/month
  const countries = {};
  const rangesByCountry = {};
  for (const stay of stays) {
    const country = stay.country || "Other";
    if (!countries[country]) {
      countries[country] = Array(12).fill(0);
    }
    if (!rangesByCountry[country]) {
      rangesByCountry[country] = Array.from({ length: 12 }, () => []);
    }
    let ptr = new Date(stay.start);
    while (ptr < stay.end) {
      const monthEnd = new Date(Date.UTC(ptr.getUTCFullYear(), ptr.getUTCMonth() + 1, 1));
      const sliceEnd = monthEnd < stay.end ? monthEnd : stay.end;
      const days = Math.ceil((sliceEnd - ptr) / (1000 * 60 * 60 * 24));
      if (days > 0) {
        const monthIndex = ptr.getUTCMonth();
        countries[country][monthIndex] += days;
        const exitDate = new Date(sliceEnd);
        exitDate.setUTCDate(exitDate.getUTCDate() - 1);
        const entry = stay.entryFlight ? {
          airportLabel: formatAirportLabel(stay.entryFlight.arrivalName, stay.entryFlight.arrivalCode),
          fromLabel: formatAirportLabel(stay.entryFlight.departureName, stay.entryFlight.departureCode),
          fromCountry: stay.entryFlight.departureCountry || ""
        } : null;
        const exit = stay.exitFlight ? {
          airportLabel: formatAirportLabel(stay.exitFlight.departureName, stay.exitFlight.departureCode),
          toLabel: formatAirportLabel(stay.exitFlight.arrivalName, stay.exitFlight.arrivalCode),
          toCountry: stay.exitFlight.arrivalCountry || ""
        } : null;
        rangesByCountry[country][monthIndex].push({
          entryDay: ptr.getUTCDate(),
          exitDay: exitDate.getUTCDate(),
          entryAirportLabel: entry?.airportLabel || "",
          entryFromLabel: entry?.fromLabel || "",
          entryFromCountry: entry?.fromCountry || "",
          exitAirportLabel: exit?.airportLabel || "",
          exitToLabel: exit?.toLabel || "",
          exitToCountry: exit?.toCountry || ""
        });
      }
      ptr = sliceEnd;
    }
  }

  return { countries, years: getPassengerYears(trips, passengerName), rangesByCountry };
}

export function buildDailyCountryMap(trips, passenger, year) {
  const flights = getPassengerFlights(trips, passenger);
  if (!flights.length) return {};
  const yearStr = String(year);
  const yearStart = `${yearStr}-01-01`;

  // One event per flight: country changes on departure date (matches calculateDaysByCountry)
  const events = flights
    .filter(f => f.arrivalCountry)
    .map(f => ({
      dateStr: `${f.date.getUTCFullYear()}-${String(f.date.getUTCMonth() + 1).padStart(2, "0")}-${String(f.date.getUTCDate()).padStart(2, "0")}`,
      country: f.arrivalCountry
    }));

  // Determine starting country (last arrival before the year)
  let currentCountry = flights[0].departureCountry || null;
  for (const e of events) {
    if (e.dateStr < yearStart) { currentCountry = e.country; } else { break; }
  }

  // Walk every day of the year, applying arrival events as they occur
  const result = {};
  let ei = events.findIndex(e => e.dateStr >= yearStart);
  if (ei === -1) ei = events.length;
  for (let m = 0; m < 12; m++) {
    const dim = new Date(Date.UTC(year, m + 1, 0)).getUTCDate();
    for (let d = 1; d <= dim; d++) {
      const ds = `${yearStr}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      while (ei < events.length && events[ei].dateStr <= ds) { currentCountry = events[ei++].country; }
      if (currentCountry) result[ds] = currentCountry;
    }
  }
  return result;
}
