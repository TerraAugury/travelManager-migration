function toDate(value) {
  const d = new Date(value || "");
  return Number.isNaN(d.getTime()) ? null : d;
}

function toIsoDay(date) {
  if (!(date instanceof Date)) return "";
  return date.toISOString().slice(0, 10);
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
  const depAt = toDate(flight?.departure_scheduled);
  if (!depAt) return null;
  return {
    ...flight,
    depAt,
    arrAt: toDate(flight?.arrival_scheduled),
    depDay: toIsoDay(depAt),
    pnr: String(flight?.pnr || "").trim(),
    pax: uniqNames(flight?.passenger_names)
  };
}

export function buildFlightDisplayBuckets(flights) {
  const rows = (Array.isArray(flights) ? flights : [])
    .map(normalizeFlightRow)
    .filter(Boolean)
    .sort((a, b) => a.depAt.getTime() - b.depAt.getTime());

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
    group.sort((a, b) => a.depAt.getTime() - b.depAt.getTime());
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
  out.sort((a, b) => a.depAt.getTime() - b.depAt.getTime());
  return out;
}
