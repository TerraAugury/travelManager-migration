import { getState } from "./state.js";

function textValue(id) {
  return (document.getElementById(id)?.value || "").trim();
}

function dateValue(id) {
  return document.getElementById(id)?.value || null;
}

function intValue(id, fallback = 1) {
  const value = Number.parseInt(document.getElementById(id)?.value || "", 10);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

function toDateTimeLocal(value) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}

function toIsoDay(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

function minIsoDay(current, candidate) {
  if (!candidate) return current;
  return !current || candidate < current ? candidate : current;
}

function maxIsoDay(current, candidate) {
  if (!candidate) return current;
  return !current || candidate > current ? candidate : current;
}

function deriveTripRangeFromDetails() {
  const { flights, hotels } = getState();
  let start = "";
  let end = "";
  for (const flight of Array.isArray(flights) ? flights : []) {
    const dep = toIsoDay(flight?.departure_scheduled);
    const arr = toIsoDay(flight?.arrival_scheduled);
    start = minIsoDay(start, dep || arr);
    end = maxIsoDay(end, arr || dep);
  }
  for (const hotel of Array.isArray(hotels) ? hotels : []) {
    const checkIn = toIsoDay(hotel?.check_in_date);
    const checkOut = toIsoDay(hotel?.check_out_date);
    start = minIsoDay(start, checkIn || checkOut);
    end = maxIsoDay(end, checkOut || checkIn);
  }
  return { start, end };
}

export function parsePassengerNames(raw) {
  return String(raw || "")
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean)
    .filter((name, index, arr) => arr.indexOf(name) === index);
}

export function readCreateTripBody() {
  return {
    name: textValue("trip-name")
  };
}

export function readUpdateTripBody() {
  return {
    name: textValue("trip-edit-name") || undefined
  };
}

export function fillTripEditor(trip) {
  const name = document.getElementById("trip-edit-name");
  const start = document.getElementById("trip-edit-start");
  const end = document.getElementById("trip-edit-end");
  if (!name) return;
  if (!trip) {
    name.value = "";
    if (start) start.value = "";
    if (end) end.value = "";
    return;
  }
  name.value = trip.name || "";
  const fallback = deriveTripRangeFromDetails();
  if (start) start.value = toIsoDay(trip.start_date) || fallback.start || "";
  if (end) end.value = toIsoDay(trip.end_date) || fallback.end || "";
}

export function fillFlightForm(flight) {
  const fields = {
    "flight-number": flight?.flight_number || "",
    "flight-airline": flight?.airline || "",
    "flight-pnr": flight?.pnr || "",
    "flight-dep-name": flight?.departure_airport_name || "",
    "flight-dep-code": flight?.departure_airport_code || "",
    "flight-arr-name": flight?.arrival_airport_name || "",
    "flight-arr-code": flight?.arrival_airport_code || "",
    "flight-dep-time": toDateTimeLocal(flight?.departure_scheduled),
    "flight-arr-time": toDateTimeLocal(flight?.arrival_scheduled),
    "flight-passengers": Array.isArray(flight?.passenger_names) ? flight.passenger_names.join(", ") : ""
  };
  Object.entries(fields).forEach(([id, value]) => {
    const element = document.getElementById(id);
    if (element) element.value = value;
  });
}

export function fillHotelForm(hotel) {
  const fields = {
    "hotel-name": hotel?.hotel_name || "",
    "hotel-confirmation": hotel?.confirmation_id || "",
    "hotel-checkin": hotel?.check_in_date ? String(hotel.check_in_date).slice(0, 10) : "",
    "hotel-checkout": hotel?.check_out_date ? String(hotel.check_out_date).slice(0, 10) : "",
    "hotel-pax": String(hotel?.pax_count || 1),
    "hotel-payment": hotel?.payment_type || "prepaid",
    "hotel-passengers": Array.isArray(hotel?.passenger_names) ? hotel.passenger_names.join(", ") : ""
  };
  Object.entries(fields).forEach(([id, value]) => {
    const element = document.getElementById(id);
    if (element) element.value = value;
  });
}

export function bindFlightLookup(lookupFn) {
  const btn = document.getElementById("flight-lookup-btn");
  if (!btn) return;
  btn.addEventListener("click", async () => {
    const fn = (document.getElementById("flight-number")?.value || "").trim();
    if (!fn) return;
    const status = document.getElementById("flight-lookup-status");
    btn.disabled = true; btn.textContent = "…";
    try {
      fillFlightForm(await lookupFn(fn));
      if (status) status.textContent = "✓ Details auto-filled";
    } catch (e) {
      if (status) status.textContent = `⚠ ${e.message}`;
    } finally { btn.disabled = false; btn.textContent = "Lookup"; }
  });
}

export function readCreateFlightBody() {
  return {
    flightNumber: textValue("flight-number"),
    airline: textValue("flight-airline") || null,
    pnr: textValue("flight-pnr") || null,
    departureAirportName: textValue("flight-dep-name") || null,
    departureAirportCode: textValue("flight-dep-code") || null,
    arrivalAirportName: textValue("flight-arr-name") || null,
    arrivalAirportCode: textValue("flight-arr-code") || null,
    departureScheduled: dateValue("flight-dep-time"),
    arrivalScheduled: dateValue("flight-arr-time"),
    passengerNames: parsePassengerNames(textValue("flight-passengers"))
  };
}

export function readCreateHotelBody() {
  return {
    hotelName: textValue("hotel-name"),
    confirmationId: textValue("hotel-confirmation") || null,
    checkInDate: dateValue("hotel-checkin"),
    checkOutDate: dateValue("hotel-checkout"),
    paxCount: intValue("hotel-pax", 1),
    paymentType: textValue("hotel-payment") || "prepaid",
    passengerNames: parsePassengerNames(textValue("hotel-passengers"))
  };
}
