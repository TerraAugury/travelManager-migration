function toLocalDateTime(value) {
  const raw = String(value || "").trim();
  const match = /^(\d{4}-\d{2}-\d{2})[T\s](\d{2}:\d{2})/.exec(raw);
  return match ? `${match[1]}T${match[2]}` : null;
}

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
  const departureScheduled = f.departure?.scheduled || null;
  const arrivalScheduled = f.arrival?.scheduled || null;
  return {
    flight_number: f.flight?.iata || fn,
    status: f.flight_status || null,
    airline: f.airline?.name || null,
    departure_airport_name: f.departure?.airport || null,
    departure_airport_code: f.departure?.iata || null,
    departure_scheduled_local: toLocalDateTime(f.departure?.scheduled_local) || toLocalDateTime(departureScheduled),
    departure_timezone: f.departure?.timezone || null,
    arrival_airport_name: f.arrival?.airport || null,
    arrival_airport_code: f.arrival?.iata || null,
    arrival_scheduled_local: toLocalDateTime(f.arrival?.scheduled_local) || toLocalDateTime(arrivalScheduled),
    arrival_timezone: f.arrival?.timezone || null,
    departure_scheduled: departureScheduled,
    arrival_scheduled: arrivalScheduled
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
  const toNum = (value) => {
    const parsed = Number.parseInt(String(value || ""), 10);
    return Number.isFinite(parsed) ? parsed : null;
  };
  const getHeader = (name) => {
    if (typeof res?.headers?.get !== "function") return null;
    return res.headers.get(name);
  };
  const json = await res.json();
  const f = Array.isArray(json) ? json[0] : null;
  if (!f) throw { status: 404, message: `No flight found for ${fn}.` };
  const departure = f.departure || {};
  const arrival = f.arrival || {};
  const pick = (...values) => {
    for (const value of values) {
      if (value !== undefined && value !== null && String(value).trim() !== "") return value;
    }
    return null;
  };
  const departureScheduled = pick(departure?.scheduledTime?.local, departure?.scheduledTime?.utc);
  const arrivalScheduled = pick(arrival?.scheduledTime?.local, arrival?.scheduledTime?.utc);
  return {
    flight_number: f.number || fn,
    status: f.status || null,
    airline: f.airline?.name || null,
    departure_airport_name: departure?.airport?.name || null,
    departure_airport_code: departure?.airport?.iata || null,
    departure_scheduled_local: toLocalDateTime(departure?.scheduledTime?.local) || toLocalDateTime(departureScheduled),
    departure_timezone: pick(departure?.airport?.timeZone, departure?.airport?.timezone),
    arrival_airport_name: arrival?.airport?.name || null,
    arrival_airport_code: arrival?.airport?.iata || null,
    arrival_scheduled_local: toLocalDateTime(arrival?.scheduledTime?.local) || toLocalDateTime(arrivalScheduled),
    arrival_timezone: pick(arrival?.airport?.timeZone, arrival?.airport?.timezone),
    departure_scheduled: departureScheduled,
    arrival_scheduled: arrivalScheduled,
    scheduledTime: pick(departureScheduled, arrivalScheduled),
    revisedTime: pick(departure?.revisedTime?.local, departure?.revisedTime?.utc, arrival?.revisedTime?.local, arrival?.revisedTime?.utc),
    predictedTime: pick(departure?.predictedTime?.local, departure?.predictedTime?.utc, arrival?.predictedTime?.local, arrival?.predictedTime?.utc),
    runwayTime: pick(departure?.runwayTime?.local, departure?.runwayTime?.utc, arrival?.runwayTime?.local, arrival?.runwayTime?.utc),
    terminal: pick(departure?.terminal, arrival?.terminal),
    checkInDesk: pick(departure?.checkInDesk, arrival?.checkInDesk),
    gate: pick(departure?.gate, arrival?.gate),
    baggageBelt: pick(arrival?.baggageBelt, departure?.baggageBelt),
    rateLimitRequestsRemaining: toNum(getHeader("x-ratelimit-requests-remaining")),
    rateLimitRequestsLimit: toNum(getHeader("x-ratelimit-requests-limit")),
    rateLimitRequestsReset: toNum(getHeader("x-ratelimit-requests-reset"))
  };
}

export async function lookupFlightera(fn, date, key) {
  const flightDate = date || new Date().toISOString().slice(0, 10);
  const url = new URL("https://flightera-flight-data.p.rapidapi.com/flight/info");
  url.searchParams.set("flnr", fn);
  url.searchParams.set("date", flightDate);
  const res = await fetch(url.toString(), {
    headers: {
      "X-RapidAPI-Key": key,
      "X-RapidAPI-Host": "flightera-flight-data.p.rapidapi.com"
    }
  });
  if (!res.ok) throw { status: 502, message: "Upstream flight lookup error." };
  const toNum = (value) => {
    const parsed = Number.parseInt(String(value || ""), 10);
    return Number.isFinite(parsed) ? parsed : null;
  };
  const getHeader = (name) => {
    if (typeof res?.headers?.get !== "function") return null;
    return res.headers.get(name);
  };
  const json = await res.json();
  const f = Array.isArray(json) ? json[0] : null;
  if (!f) throw { status: 404, message: `No flight found for ${fn}.` };
  const pick = (...values) => {
    for (const value of values) {
      if (value !== undefined && value !== null && String(value).trim() !== "") return value;
    }
    return null;
  };
  const departureScheduled = pick(f.scheduled_departure_local, f.scheduled_departure_utc);
  const arrivalScheduled = pick(f.scheduled_arrival_local, f.scheduled_arrival_utc);
  const estimatedDeparture = f.actual_departure_is_estimated ? pick(f.actual_departure_local, f.actual_departure_utc) : null;
  const estimatedArrival = f.actual_arrival_is_estimated ? pick(f.actual_arrival_local, f.actual_arrival_utc) : null;
  const status = pick(
    { sched: "Scheduled", live: "EnRoute", canc: "Cancelled", landed: "Landed", diverted: "Diverted", unknown: "Unknown" }[String(f.status || "").toLowerCase()],
    f.status
  );
  return {
    flight_number: pick(f.flnr, fn),
    status,
    airline: pick(f.airline_name),
    departure_airport_name: pick(f.departure_name),
    departure_airport_code: pick(f.departure_iata),
    departure_scheduled_local: toLocalDateTime(f.scheduled_departure_local) || toLocalDateTime(departureScheduled),
    departure_timezone: pick(f.departure_timezone, f.departure_tz),
    arrival_airport_name: pick(f.arrival_name),
    arrival_airport_code: pick(f.arrival_iata),
    arrival_scheduled_local: toLocalDateTime(f.scheduled_arrival_local) || toLocalDateTime(arrivalScheduled),
    arrival_timezone: pick(f.arrival_timezone, f.arrival_tz),
    departure_scheduled: departureScheduled,
    arrival_scheduled: arrivalScheduled,
    scheduledTime: pick(departureScheduled, arrivalScheduled),
    revisedTime: null,
    predictedTime: pick(estimatedDeparture, estimatedArrival),
    runwayTime: null,
    terminal: pick(f.departure_terminal, f.arrival_terminal),
    checkInDesk: pick(f.departure_checkin),
    gate: pick(f.departure_gate, f.arrival_gate),
    baggageBelt: pick(f.arrival_baggage),
    rateLimitRequestsRemaining: toNum(getHeader("x-ratelimit-requests-remaining")),
    rateLimitRequestsLimit: toNum(getHeader("x-ratelimit-requests-limit")),
    rateLimitRequestsReset: toNum(getHeader("x-ratelimit-requests-reset"))
  };
}
