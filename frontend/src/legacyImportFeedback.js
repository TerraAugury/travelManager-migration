const MAX_IMPORT_BYTES = 5 * 1024 * 1024;

function normalizePassengerName(value) {
  return String(value || "").trim().replace(/\s+/g, " ").slice(0, 120).toLowerCase();
}

function countImportedFlights(items) {
  return items.reduce((sum, trip) => {
    const records = Array.isArray(trip?.records) ? trip.records : [];
    return sum + records.length;
  }, 0);
}

function countImportedPassengers(items) {
  const uniqueNames = new Set();
  for (const trip of items) {
    const records = Array.isArray(trip?.records) ? trip.records : [];
    const hotels = Array.isArray(trip?.hotels) ? trip.hotels : [];
    for (const record of records) {
      for (const name of Array.isArray(record?.paxNames) ? record.paxNames : []) {
        const key = normalizePassengerName(name);
        if (key) uniqueNames.add(key);
      }
    }
    for (const hotel of hotels) {
      for (const name of Array.isArray(hotel?.paxNames) ? hotel.paxNames : []) {
        const key = normalizePassengerName(name);
        if (key) uniqueNames.add(key);
      }
    }
  }
  return uniqueNames.size;
}

function pluralize(count, label) {
  return `${count} ${label}${count === 1 ? "" : "s"}`;
}

export function summarizeLegacyImport(result) {
  const items = Array.isArray(result?.items) ? result.items : [];
  const rawTrips = Number(result?.importedTrips);
  const importedTrips = Number.isFinite(rawTrips) ? Math.max(0, Math.trunc(rawTrips)) : items.length;
  return {
    trips: importedTrips,
    flights: countImportedFlights(items),
    passengers: countImportedPassengers(items)
  };
}

export function formatLegacyImportSuccess(summary) {
  return `Import successful: ${pluralize(summary.trips, "trip")}, ${pluralize(summary.flights, "flight")}, ${pluralize(summary.passengers, "passenger")} imported.`;
}

export function formatLegacyImportError(error) {
  const detail = String(error?.message || "Unknown error.");
  return `Import failed: ${detail}`;
}

export async function importLegacyFromFile(file, token, importLegacyTrips) {
  if (!file) return null;
  if (Number(file.size || 0) > MAX_IMPORT_BYTES) throw new Error("Import file too large (max 5 MB).");
  const payload = JSON.parse(await file.text());
  const result = await importLegacyTrips(token, payload);
  return summarizeLegacyImport(result);
}
