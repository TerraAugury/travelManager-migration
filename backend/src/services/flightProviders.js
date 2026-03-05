export async function lookupAviationStack(fn, key) {
  const baseUrl = `https://api.aviationstack.com/v1/flights?flight_iata=${encodeURIComponent(fn)}`;
  let res = await fetch(baseUrl, {
    headers: {
      "X-Api-Key": key,
      Authorization: `Bearer ${key}`
    }
  });
  if (!res.ok) {
    res = await fetch(`${baseUrl}&access_key=${encodeURIComponent(key)}`);
  }
  if (!res.ok) throw { status: 502, message: "Upstream flight lookup error." };
  const json = await res.json();
  const f = json?.data?.[0];
  if (!f) throw { status: 404, message: `No flight found for ${fn}.` };
  return {
    flight_number: f.flight?.iata || fn,
    airline: f.airline?.name || null,
    departure_airport_name: f.departure?.airport || null,
    departure_airport_code: f.departure?.iata || null,
    arrival_airport_name: f.arrival?.airport || null,
    arrival_airport_code: f.arrival?.iata || null,
    departure_scheduled: f.departure?.scheduled || null,
    arrival_scheduled: f.arrival?.scheduled || null
  };
}

export async function lookupAeroDataBox(fn, date, key) {
  const flightDate = date || new Date().toISOString().slice(0, 10);
  const url = `https://aerodatabox.p.rapidapi.com/flights/number/${encodeURIComponent(fn)}/${flightDate}`;
  const res = await fetch(url, {
    headers: {
      "X-RapidAPI-Key": key,
      "X-RapidAPI-Host": "aerodatabox.p.rapidapi.com"
    }
  });
  if (!res.ok) throw { status: 502, message: "Upstream flight lookup error." };
  const json = await res.json();
  const f = Array.isArray(json) ? json[0] : null;
  if (!f) throw { status: 404, message: `No flight found for ${fn}.` };
  return {
    flight_number: f.number || fn,
    airline: f.airline?.name || null,
    departure_airport_name: f.departure?.airport?.name || null,
    departure_airport_code: f.departure?.airport?.iata || null,
    arrival_airport_name: f.arrival?.airport?.name || null,
    arrival_airport_code: f.arrival?.airport?.iata || null,
    departure_scheduled: f.departure?.scheduledTime?.utc || null,
    arrival_scheduled: f.arrival?.scheduledTime?.utc || null
  };
}
