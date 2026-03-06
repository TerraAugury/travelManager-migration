const UUID_V4_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isUuid(value) {
  return UUID_V4_PATTERN.test(String(value || ""));
}

export function toTrimmedString(value, { field, required = false, max = 255 } = {}) {
  const text = value == null ? "" : String(value).trim();
  if (!text && required) {
    return { error: `${field} is required.` };
  }
  if (text && text.length > max) {
    return { error: `${field} must be at most ${max} characters.` };
  }
  return { value: text || null };
}

export function toOptionalDate(value, { field } = {}) {
  if (value == null || value === "") {
    return { value: null };
  }
  const text = String(value).trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    return { error: `${field} must be YYYY-MM-DD.` };
  }
  return { value: text };
}

export function toOptionalDateTime(value, { field } = {}) {
  if (value == null || value === "") {
    return { value: null };
  }
  const text = String(value).trim();
  const d = new Date(text);
  if (Number.isNaN(d.getTime())) {
    return { error: `${field} must be a valid datetime.` };
  }
  return { value: d.toISOString() };
}

export function toOptionalLocalDateTime(value, { field } = {}) {
  if (value == null || value === "") {
    return { value: null };
  }
  const text = String(value).trim();
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(text)) {
    return { error: `${field} must be YYYY-MM-DDTHH:mm.` };
  }
  return { value: text };
}

export function toOptionalTimeZone(value, { field } = {}) {
  if (value == null || value === "") {
    return { value: null };
  }
  const text = String(value).trim();
  if (text.length > 120 || !/^[A-Za-z0-9_+\-./]+$/.test(text)) {
    return { error: `${field} must be a valid timezone identifier.` };
  }
  return { value: text };
}

export function toPassengerNames(value) {
  if (!Array.isArray(value)) {
    return { value: [] };
  }
  const map = new Map();
  for (const item of value) {
    const text = String(item || "").trim().replace(/\s+/g, " ");
    if (!text) continue;
    const key = text.toLowerCase();
    if (!map.has(key)) {
      map.set(key, text);
    }
  }
  return { value: Array.from(map.values()) };
}

export function toPositiveInt(value, { field } = {}) {
  const n = Number(value);
  if (!Number.isInteger(n) || n <= 0) {
    return { error: `${field} must be a positive integer.` };
  }
  return { value: n };
}
