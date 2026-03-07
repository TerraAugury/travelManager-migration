function esc(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

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

function getPassengers(trips) {
  const names = new Set();
  for (const trip of Array.isArray(trips) ? trips : []) {
    for (const record of Array.isArray(trip?.records) ? trip.records : []) {
      for (const name of uniqNames(record?.paxNames)) names.add(name);
    }
  }
  return Array.from(names).sort((a, b) => a.localeCompare(b));
}

function flightRows(trips, passenger) {
  const rows = [];
  for (const trip of Array.isArray(trips) ? trips : []) {
    for (const record of Array.isArray(trip?.records) ? trip.records : []) {
      const pax = uniqNames(record?.paxNames);
      if (passenger && !pax.includes(passenger)) continue;
      const departure = record?.route?.departure || {};
      const arrival = record?.route?.arrival || {};
      const depAt = toDate(departure?.scheduled || record?.flightDate || record?.createdAt);
      if (!depAt) continue;
      rows.push({
        depAt,
        arrAt: toDate(arrival?.scheduled),
        depDay: toIsoDay(depAt),
        departureAirport: departure.airport || departure.iata || "?",
        departureIata: departure.iata || "?",
        arrivalAirport: arrival.airport || arrival.iata || "?",
        arrivalIata: arrival.iata || "?",
        flightNumber: record?.route?.flightNumber || "Flight",
        airline: record?.route?.airline || "",
        pnr: String(record?.pnr || "").trim(),
        pax
      });
    }
  }
  rows.sort((a, b) => a.depAt.getTime() - b.depAt.getTime());
  return rows;
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

export function buildUpcomingBuckets(rows) {
  const grouped = new Map();
  const singles = [];
  for (const row of rows) {
    if (!row.pnr) {
      singles.push({ type: "single", flights: [row], pax: row.pax });
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
      out.push({ type: "connecting", flights: group, pax: commonPax });
    } else {
      for (const row of group) out.push({ type: "single", flights: [row], pax: row.pax });
    }
  }
  out.sort((a, b) => a.flights[0].depAt.getTime() - b.flights[0].depAt.getTime());
  return out;
}

function fmtDateTime(date) {
  return date.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function fmtTime(date) {
  return date.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}

function renderFlightLeg(row) {
  const airline = row.airline ? ` (${esc(row.airline)})` : "";
  return `<div class="segment-main-row"><div>${esc(row.departureAirport)} (${esc(row.departureIata)})<div class="segment-time">${esc(fmtTime(row.depAt))}</div></div><div class="segment-icon">→</div><div class="segment-side-right">${esc(row.arrivalAirport)} (${esc(row.arrivalIata)})<div class="segment-time">${row.arrAt ? esc(fmtTime(row.arrAt)) : "—"}</div></div></div><div class="segment-flight-code">${esc(row.flightNumber)}${airline}</div>`;
}

function renderBucket(bucket) {
  const first = bucket.flights[0];
  const pnrText = first.pnr ? `PNR ${esc(first.pnr)}` : "No PNR";
  const paxText = bucket.pax.length ? ` · ${esc(bucket.pax.join(", "))}` : "";
  const stopCount = Math.max(0, bucket.flights.length - 1);
  const stopLabel = `${stopCount} stop${stopCount === 1 ? "" : "s"}`;
  const route = `${esc(first.departureIata)} → ${esc(bucket.flights[bucket.flights.length - 1]?.arrivalIata || "?")}`;
  const totalDuration = bucket.flights.length > 1
    ? formatLayover(first.depAt, bucket.flights[bucket.flights.length - 1]?.arrAt || bucket.flights[bucket.flights.length - 1]?.depAt || first.depAt)
    : "";
  const legs = [];
  for (let i = 0; i < bucket.flights.length; i += 1) {
    const current = bucket.flights[i];
    legs.push(`<div class="itinerary-segment segment-flight trip-event-card flight-card connecting-leg">${renderFlightLeg(current)}</div>`);
    if (i < bucket.flights.length - 1) {
      const next = bucket.flights[i + 1];
      const layoverBase = current.arrAt || current.depAt;
      const layover = formatLayover(layoverBase, next.depAt);
      const airport = current.arrivalIata || current.arrivalAirport || "transfer airport";
      if (layover) legs.push(`<div class="layover-strip"><span class="layover-strip-line"></span><span class="layover-strip-icon">🕒</span><span class="layover-strip-text">Layover ${esc(layover)} in ${esc(airport)}</span></div>`);
    }
  }
  const title = bucket.type === "connecting" ? "Connecting flights" : "Upcoming flight";
  if (bucket.type !== "connecting") {
    return `<div class="flight-tile itinerary-tile"><div class="flight-tile-header"><div class="flight-tile-header-left"><span class="event-type-icon">✈︎</span><span>${esc(fmtDateTime(first.depAt))}</span></div><span class="segment-label">${title}</span></div><div class="segment-time">${pnrText}${paxText}</div><div class="itinerary-body">${legs.join("")}</div></div>`;
  }
  return `<section class="connecting-group collapsed" data-connecting-group="1"><span class="connecting-stop-badge">${esc(stopLabel)}</span><button class="connecting-summary-row" data-toggle-connecting="1" type="button"><span class="connecting-summary-route">${route}</span><span class="connecting-summary-meta">${esc(stopLabel)}${totalDuration ? ` • ${esc(totalDuration)}` : ""}</span></button><div class="segment-time">${pnrText}${paxText}</div><div class="connecting-group-body">${legs.join("")}</div></section>`;
}

export function renderUpcomingScreen({ trips, upcomingState, els }) {
  const listEl = els["upcoming-list"];
  const emptyEl = els["upcoming-empty"];
  const passSelect = els["upcoming-passenger"];
  if (!listEl || !emptyEl) return;

  const passengers = getPassengers(trips);
  if (passSelect) {
    passSelect.innerHTML = '<option value="">All passengers</option>';
    for (const passenger of passengers) {
      const selected = passenger === upcomingState.passenger ? " selected" : "";
      passSelect.insertAdjacentHTML("beforeend", `<option value="${esc(passenger)}"${selected}>${esc(passenger)}</option>`);
    }
    if (upcomingState.passenger && !passengers.includes(upcomingState.passenger)) {
      upcomingState.passenger = "";
      passSelect.value = "";
    }
  }

  const selectedPassenger = passSelect ? passSelect.value : upcomingState.passenger;
  upcomingState.passenger = selectedPassenger || "";
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const rows = flightRows(trips, selectedPassenger || "").filter((row) => row.depAt >= today);
  const buckets = buildUpcomingBuckets(rows);

  if (!buckets.length) {
    emptyEl.classList.remove("hidden");
    listEl.innerHTML = "";
    return;
  }
  emptyEl.classList.add("hidden");
  listEl.innerHTML = buckets.map(renderBucket).join("");
  listEl.querySelectorAll("[data-connecting-group]").forEach((group) => {
    const body = group.querySelector(".connecting-group-body");
    if (body) body.style.maxHeight = "0px";
  });
  listEl.onclick = (event) => {
    const target = event.target instanceof Element ? event.target : null;
    const toggle = target?.closest("[data-toggle-connecting]");
    if (!toggle) return;
    const group = toggle.closest("[data-connecting-group]");
    const body = group?.querySelector(".connecting-group-body");
    if (!group || !body) return;
    const collapsed = group.classList.toggle("collapsed");
    group.classList.toggle("expanded", !collapsed);
    body.style.maxHeight = collapsed ? "0px" : `${body.scrollHeight}px`;
  };
}
