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

function getPassengers(trips) {
  const names = new Set();
  for (const trip of Array.isArray(trips) ? trips : []) {
    for (const record of Array.isArray(trip?.records) ? trip.records : []) {
      for (const name of Array.isArray(record?.paxNames) ? record.paxNames : []) {
        const n = String(name || "").trim();
        if (n) names.add(n);
      }
    }
  }
  return Array.from(names).sort((a, b) => a.localeCompare(b));
}

function flightRows(trips, passenger) {
  const rows = [];
  for (const trip of Array.isArray(trips) ? trips : []) {
    for (const record of Array.isArray(trip?.records) ? trip.records : []) {
      const names = Array.isArray(record?.paxNames) ? record.paxNames : [];
      if (passenger && !names.some((name) => String(name || "").trim() === passenger)) continue;
      const departure = record?.route?.departure || {};
      const arrival = record?.route?.arrival || {};
      const depAt = toDate(departure?.scheduled || record?.flightDate || record?.createdAt);
      if (!depAt) continue;
      rows.push({
        depAt,
        departureAirport: departure.airport || departure.iata || "?",
        departureIata: departure.iata || "?",
        arrivalAirport: arrival.airport || arrival.iata || "?",
        arrivalIata: arrival.iata || "?",
        flightNumber: record?.route?.flightNumber || "Flight",
        airline: record?.route?.airline || "",
        pnr: record?.pnr || "",
        pax: names
      });
    }
  }
  rows.sort((a, b) => a.depAt.getTime() - b.depAt.getTime());
  return rows;
}

function formatDate(value) {
  const d = toDate(value);
  if (!d) return "Unknown date";
  return d.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  });
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

  if (!rows.length) {
    emptyEl.classList.remove("hidden");
    listEl.innerHTML = "";
    return;
  }

  emptyEl.classList.add("hidden");
  listEl.innerHTML = rows.map((row) => {
    const airline = row.airline ? ` (${esc(row.airline)})` : "";
    const pnr = row.pnr ? ` · PNR ${esc(row.pnr)}` : "";
    const pax = row.pax.length ? ` · ${esc(row.pax.join(", "))}` : "";
    return `<div class="flight-tile"><div class="flight-tile-header"><div class="flight-tile-header-left"><span class="event-type-icon">✈︎</span><span>${esc(formatDate(row.depAt))}</span></div><span>${esc(row.flightNumber)}${airline}</span></div><div class="segment-main-row"><div>${esc(row.departureAirport)} (${esc(row.departureIata)})</div><div class="segment-icon">→</div><div class="segment-side-right">${esc(row.arrivalAirport)} (${esc(row.arrivalIata)})</div></div><div class="segment-time">${pnr}${pax}</div></div>`;
  }).join("");
}
