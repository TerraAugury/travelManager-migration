function toLocalSortKey(value) {
  const raw = String(value || "").trim();
  const m = /^(\d{4}-\d{2}-\d{2})[T\s](\d{2}:\d{2})/.exec(raw);
  return m ? `${m[1]}T${m[2]}` : "";
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
