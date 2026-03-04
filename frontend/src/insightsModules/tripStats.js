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

function hotelNights(hotel) {
  const inDate = toDate(hotel?.checkInDate);
  const outDate = toDate(hotel?.checkOutDate);
  if (!inDate || !outDate) return 0;
  const ms = outDate.getTime() - inDate.getTime();
  return Math.max(0, Math.round(ms / 86400000));
}

function collectStats(trips) {
  let totalTrips = 0;
  let totalFlights = 0;
  let totalNights = 0;
  const paxStats = new Map();
  for (const trip of Array.isArray(trips) ? trips : []) {
    totalTrips += 1;
    for (const record of Array.isArray(trip?.records) ? trip.records : []) {
      totalFlights += 1;
      for (const nameRaw of Array.isArray(record?.paxNames) ? record.paxNames : []) {
        const name = String(nameRaw || "").trim();
        if (!name) continue;
        if (!paxStats.has(name)) paxStats.set(name, { flights: 0, trips: new Set() });
        const item = paxStats.get(name);
        item.flights += 1;
        if (trip?.id) item.trips.add(trip.id);
      }
    }
    for (const hotel of Array.isArray(trip?.hotels) ? trip.hotels : []) {
      totalNights += hotelNights(hotel);
    }
  }
  const passengers = Array.from(paxStats.entries())
    .map(([name, data]) => ({ name, flights: data.flights, tripCount: data.trips.size }))
    .sort((a, b) => a.name.localeCompare(b.name));
  return { totalTrips, totalFlights, totalNights, passengers };
}

export function renderAllTripsDetails(allTrips, statsEl, paxEl, emptyEl) {
  if (!statsEl || !paxEl || !emptyEl) return;
  const hasData = Array.isArray(allTrips) && allTrips.length > 0;
  if (!hasData) {
    statsEl.classList.add("hidden");
    paxEl.classList.add("hidden");
    emptyEl.classList.remove("hidden");
    return;
  }

  const stats = collectStats(allTrips);
  emptyEl.classList.add("hidden");
  statsEl.classList.remove("hidden");
  paxEl.classList.remove("hidden");

  statsEl.innerHTML = `<div class="stats-grid"><div class="secondary-card" style="padding:10px 12px;"><div style="display:flex;justify-content:space-between;align-items:center;"><span>Trips</span><strong>${stats.totalTrips}</strong></div></div><div class="secondary-card" style="padding:10px 12px;"><div style="display:flex;justify-content:space-between;align-items:center;"><span>Flights</span><strong>${stats.totalFlights}</strong></div></div><div class="secondary-card" style="padding:10px 12px;"><div style="display:flex;justify-content:space-between;align-items:center;"><span>Hotel nights</span><strong>${stats.totalNights}</strong></div></div></div>`;

  if (!stats.passengers.length) {
    paxEl.innerHTML = '<div class="tiles-empty">No passengers yet.</div>';
    return;
  }
  paxEl.innerHTML = `<div style="font-size:14px;font-weight:600;margin:10px 0 8px;">Passengers (${stats.passengers.length})</div><div class="stats-grid">${stats.passengers.map((passenger) => `<div class="secondary-card" style="padding:10px 12px;"><div style="display:flex;justify-content:space-between;align-items:center;"><span>${esc(passenger.name)}</span><span class="tag-soft">${passenger.tripCount} trip${passenger.tripCount === 1 ? "" : "s"}</span></div><div style="margin-top:6px;font-size:12px;color:var(--muted);">Flights: <strong>${passenger.flights}</strong></div></div>`).join("")}</div>`;
}
