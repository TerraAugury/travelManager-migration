function toLocalSortKey(value) {
  const raw = String(value || "").trim();
  const m = /^(\d{4}-\d{2}-\d{2})[T\s](\d{2}:\d{2})/.exec(raw);
  return m ? `${m[1]}T${m[2]}` : "";
}

function parseDateTime(value) {
  const raw = String(value || "").trim();
  if (!raw) return null;
  const normalized = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(raw) ? `${raw}:00` : raw;
  const date = new Date(normalized);
  return Number.isNaN(date.getTime()) ? null : date;
}

function depDate(row) {
  return parseDateTime(row?.departure_scheduled_local || row?.departure_scheduled || row?.depAt);
}

function arrDate(row) {
  return parseDateTime(row?.arrival_scheduled_local || row?.arrival_scheduled || row?.arrAt);
}

function depCode(row) {
  return String(row?.departure_airport_code || row?.departureIata || "?").trim() || "?";
}

function arrCode(row) {
  return String(row?.arrival_airport_code || row?.arrivalIata || "?").trim() || "?";
}

function arrAirport(row) {
  return String(row?.arrival_airport_name || row?.arrivalAirport || row?.arrival_airport_code || row?.arrivalIata || "transfer airport").trim() || "transfer airport";
}

function uniqNames(input) {
  return Array.from(new Set((Array.isArray(input) ? input : []).map((x) => String(x || "").trim()).filter(Boolean)));
}

function intersectNames(rows) {
  if (!rows.length) return [];
  return rows[0].pax.filter((name) => rows.every((row) => row.pax.includes(name)));
}

export function formatLayover(start, end) {
  const diffMs = end.getTime() - start.getTime();
  if (!Number.isFinite(diffMs) || diffMs <= 0) return "";
  const mins = Math.floor(diffMs / 60000);
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${h}h ${String(m).padStart(2, "0")}m`;
}

function normalizeFlightRow(flight) {
  const depAt = toLocalSortKey(flight?.departure_scheduled_local || flight?.departure_scheduled);
  if (!depAt) return null;
  return {
    ...flight,
    depAt,
    arrAt: toLocalSortKey(flight?.arrival_scheduled_local || flight?.arrival_scheduled),
    depDay: depAt.slice(0, 10),
    pnr: String(flight?.pnr || "").trim(),
    pax: uniqNames(flight?.passenger_names)
  };
}

export function buildFlightDisplayBuckets(flights) {
  const rows = (Array.isArray(flights) ? flights : [])
    .map(normalizeFlightRow)
    .filter(Boolean)
    .sort((a, b) => a.depAt.localeCompare(b.depAt));

  const grouped = new Map();
  const singles = [];
  for (const row of rows) {
    if (!row.pnr) {
      singles.push({ type: "single", flights: [row], pax: row.pax, depAt: row.depAt });
      continue;
    }
    const key = `${row.depDay}__${row.pnr}`;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key).push(row);
  }

  const out = [...singles];
  for (const group of grouped.values()) {
    group.sort((a, b) => a.depAt.localeCompare(b.depAt));
    const commonPax = intersectNames(group);
    if (group.length > 1 && commonPax.length > 0) {
      out.push({
        type: "connecting",
        flights: group,
        pnr: group[0].pnr,
        pax: commonPax,
        depAt: group[0].depAt
      });
    } else {
      for (const row of group) {
        out.push({ type: "single", flights: [row], pax: row.pax, depAt: row.depAt });
      }
    }
  }
  out.sort((a, b) => a.depAt.localeCompare(b.depAt));
  return out;
}

export function buildConnectingMeta(flights) {
  const legs = (Array.isArray(flights) ? flights : []).filter(Boolean);
  if (legs.length < 2) return null;
  const first = legs[0];
  const last = legs[legs.length - 1];
  const firstDep = depDate(first);
  const lastArr = arrDate(last) || depDate(last);
  const layovers = [];
  for (let i = 0; i < legs.length - 1; i += 1) {
    const current = legs[i];
    const next = legs[i + 1];
    const from = arrDate(current) || depDate(current);
    const to = depDate(next);
    const duration = from && to ? formatLayover(from, to) : "";
    layovers.push({ duration, airport: arrAirport(current) });
  }
  return {
    originCode: depCode(first),
    destinationCode: arrCode(last),
    stopCount: Math.max(0, legs.length - 1),
    totalDuration: firstDep && lastArr ? formatLayover(firstDep, lastArr) : "",
    layovers
  };
}
