import {
  toOptionalDateTime,
  toOptionalLocalDateTime,
  toOptionalTimeZone,
  toPassengerNames,
  toTrimmedString
} from "../http/validation.js";
import { validateIataCode, validatePassengerName } from "../validation.js";

export function parseFlightBody(body) {
  const flightNumber = toTrimmedString(body?.flightNumber, { field: "flightNumber", required: true, max: 24 });
  if (flightNumber.error) return { error: flightNumber.error };
  const airline = toTrimmedString(body?.airline, { field: "airline", max: 120 });
  if (airline.error) return { error: airline.error };
  const pnr = toTrimmedString(body?.pnr, { field: "pnr", max: 24 });
  if (pnr.error) return { error: pnr.error };
  const depName = toTrimmedString(body?.departureAirportName, { field: "departureAirportName", max: 180 });
  if (depName.error) return { error: depName.error };
  const depCode = toTrimmedString(body?.departureAirportCode, { field: "departureAirportCode", max: 8 });
  if (depCode.error) return { error: depCode.error };
  const arrName = toTrimmedString(body?.arrivalAirportName, { field: "arrivalAirportName", max: 180 });
  if (arrName.error) return { error: arrName.error };
  const arrCode = toTrimmedString(body?.arrivalAirportCode, { field: "arrivalAirportCode", max: 8 });
  if (arrCode.error) return { error: arrCode.error };
  const depAt = toOptionalDateTime(body?.departureScheduled, { field: "departureScheduled" });
  if (depAt.error) return { error: depAt.error };
  const arrAt = toOptionalDateTime(body?.arrivalScheduled, { field: "arrivalScheduled" });
  if (arrAt.error) return { error: arrAt.error };
  const depLocal = toOptionalLocalDateTime(body?.departureScheduledLocal, { field: "departureScheduledLocal" });
  if (depLocal.error) return { error: depLocal.error };
  const arrLocal = toOptionalLocalDateTime(body?.arrivalScheduledLocal, { field: "arrivalScheduledLocal" });
  if (arrLocal.error) return { error: arrLocal.error };
  const depTz = toOptionalTimeZone(body?.departureTimezone, { field: "departureTimezone" });
  if (depTz.error) return { error: depTz.error };
  const arrTz = toOptionalTimeZone(body?.arrivalTimezone, { field: "arrivalTimezone" });
  if (arrTz.error) return { error: arrTz.error };

  const names = toPassengerNames(body?.passengerNames);
  for (const name of names.value) {
    const nameValidation = validatePassengerName(name);
    if (!nameValidation.valid) return { error: nameValidation.error };
  }
  if (depCode.value) {
    const depValidation = validateIataCode(depCode.value.toUpperCase());
    if (!depValidation.valid) return { error: depValidation.error };
  }
  if (arrCode.value) {
    const arrValidation = validateIataCode(arrCode.value.toUpperCase());
    if (!arrValidation.valid) return { error: arrValidation.error };
  }
  return {
    value: {
      flightNumber: flightNumber.value?.toUpperCase(),
      airline: airline.value,
      pnr: pnr.value?.toUpperCase() || null,
      departureAirportName: depName.value,
      departureAirportCode: depCode.value?.toUpperCase() || null,
      arrivalAirportName: arrName.value,
      arrivalAirportCode: arrCode.value?.toUpperCase() || null,
      departureScheduled: depAt.value,
      arrivalScheduled: arrAt.value,
      departureScheduledLocal: depLocal.value,
      arrivalScheduledLocal: arrLocal.value,
      departureTimezone: depTz.value,
      arrivalTimezone: arrTz.value,
      passengerNames: names.value
    }
  };
}
