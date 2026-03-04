const PASSENGER_NAME_PATTERN = /^[\p{L}\p{M}' \-]{1,80}$/u;
const IATA_CODE_PATTERN = /^[A-Z]{3}$/;

export function validatePassengerName(name) {
  const text = String(name ?? "");
  if (!PASSENGER_NAME_PATTERN.test(text)) {
    return { valid: false, error: "Invalid passenger name" };
  }
  return { valid: true };
}

export function validateIataCode(code) {
  const text = String(code ?? "");
  if (!IATA_CODE_PATTERN.test(text)) {
    return { valid: false, error: "Invalid IATA code" };
  }
  return { valid: true };
}
