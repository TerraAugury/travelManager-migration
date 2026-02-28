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

export function parsePassengerNames(raw) {
  return String(raw || "")
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean)
    .filter((name, index, arr) => arr.indexOf(name) === index);
}

export function readCreateTripBody() {
  return {
    name: textValue("trip-name"),
    notes: textValue("trip-notes") || null,
    startDate: dateValue("trip-start"),
    endDate: dateValue("trip-end")
  };
}

export function readUpdateTripBody() {
  return {
    name: textValue("trip-edit-name") || undefined,
    notes: textValue("trip-edit-notes") || undefined,
    startDate: dateValue("trip-edit-start") || undefined,
    endDate: dateValue("trip-edit-end") || undefined
  };
}

export function fillTripEditor(trip) {
  const name = document.getElementById("trip-edit-name");
  const notes = document.getElementById("trip-edit-notes");
  const start = document.getElementById("trip-edit-start");
  const end = document.getElementById("trip-edit-end");
  if (!name || !notes || !start || !end) return;
  if (!trip) {
    name.value = "";
    notes.value = "";
    start.value = "";
    end.value = "";
    return;
  }
  name.value = trip.name || "";
  notes.value = trip.notes || "";
  start.value = trip.start_date ? String(trip.start_date).slice(0, 10) : "";
  end.value = trip.end_date ? String(trip.end_date).slice(0, 10) : "";
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
