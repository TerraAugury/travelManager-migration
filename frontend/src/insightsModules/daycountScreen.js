const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

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

function toIsoDay(value) {
  return String(value || "").slice(0, 10);
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
    for (const hotel of Array.isArray(trip?.hotels) ? trip.hotels : []) {
      for (const name of Array.isArray(hotel?.paxNames) ? hotel.paxNames : []) {
        const n = String(name || "").trim();
        if (n) names.add(n);
      }
    }
  }
  return Array.from(names).sort((a, b) => a.localeCompare(b));
}

function hasPassenger(entry, passenger) {
  const names = Array.isArray(entry?.paxNames) ? entry.paxNames : [];
  return names.some((name) => String(name || "").trim() === passenger);
}

function addMonthCount(out, country, date) {
  if (!date) return;
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth();
  if (!out[year]) out[year] = {};
  if (!out[year][country]) out[year][country] = new Array(12).fill(0);
  out[year][country][month] += 1;
}

function addHotelNights(out, hotel) {
  const inDate = toDate(hotel?.checkInDate);
  const outDate = toDate(hotel?.checkOutDate);
  if (!inDate || !outDate || outDate <= inDate) return;
  for (let cursor = new Date(inDate); cursor < outDate; cursor.setUTCDate(cursor.getUTCDate() + 1)) {
    addMonthCount(out, "Hotel stay", new Date(cursor));
  }
}

function countryFromFlight(record) {
  const iata = String(record?.route?.arrival?.iata || "").trim().toUpperCase();
  if (iata) return iata;
  const airport = String(record?.route?.arrival?.airport || "").trim();
  return airport || "Unknown";
}

function buildMonthSummary(trips, passenger) {
  const out = {};
  for (const trip of Array.isArray(trips) ? trips : []) {
    for (const record of Array.isArray(trip?.records) ? trip.records : []) {
      if (!hasPassenger(record, passenger)) continue;
      const date = toDate(record?.route?.departure?.scheduled || toIsoDay(record?.flightDate) || record?.createdAt);
      addMonthCount(out, countryFromFlight(record), date);
    }
    for (const hotel of Array.isArray(trip?.hotels) ? trip.hotels : []) {
      if (!hasPassenger(hotel, passenger)) continue;
      addHotelNights(out, hotel);
    }
  }
  return out;
}

function renderYearChips(yearList, years, selectedYear) {
  yearList.innerHTML = years
    .map((year) => `<button class="chip-button ${year === selectedYear ? "active" : ""}" data-year="${year}">${year}</button>`)
    .join("");
}

export function renderDaycountView({ trips, daycountState, els }) {
  const passSelect = els["daycount-passenger"];
  const yearList = els["daycount-year-list"];
  const resultsEl = els["daycount-results"];
  const emptyEl = els["daycount-empty"];
  const toggleBtn = document.getElementById("daycount-view-toggle");
  if (!passSelect || !yearList || !resultsEl || !emptyEl) return;

  const passengers = getPassengers(trips);
  passSelect.innerHTML = '<option value="">Select passenger</option>';
  for (const passenger of passengers) {
    const selected = passenger === daycountState.passenger ? " selected" : "";
    passSelect.insertAdjacentHTML("beforeend", `<option value="${esc(passenger)}"${selected}>${esc(passenger)}</option>`);
  }

  if (!passengers.includes(daycountState.passenger)) {
    daycountState.passenger = "";
    daycountState.monthSelection = null;
  }
  if (toggleBtn) {
    toggleBtn.textContent = daycountState.viewMode === "calendar" ? "List view" : "Calendar view";
  }
  if (!daycountState.passenger) {
    emptyEl.textContent = passengers.length ? "Choose a passenger to view travel summary." : "No passengers yet.";
    emptyEl.classList.remove("hidden");
    yearList.innerHTML = "";
    resultsEl.innerHTML = "";
    return;
  }

  const summary = buildMonthSummary(trips, daycountState.passenger);
  const years = Object.keys(summary).map((y) => Number.parseInt(y, 10)).sort((a, b) => b - a);
  if (!years.length) {
    emptyEl.textContent = "No travel data for this passenger.";
    emptyEl.classList.remove("hidden");
    yearList.innerHTML = "";
    resultsEl.innerHTML = "";
    return;
  }
  if (!years.includes(daycountState.year)) {
    daycountState.year = years[0];
    daycountState.monthSelection = null;
  }
  renderYearChips(yearList, years, daycountState.year);

  const byCountry = summary[daycountState.year] || {};
  const countries = Object.keys(byCountry).sort((a, b) => a.localeCompare(b));
  if (!countries.length) {
    emptyEl.textContent = "No travel data for this year.";
    emptyEl.classList.remove("hidden");
    resultsEl.innerHTML = "";
    return;
  }

  emptyEl.classList.add("hidden");
  const selectedCountry = daycountState.monthSelection?.country || "";
  const selectedMonth = daycountState.monthSelection?.monthIndex;
  resultsEl.innerHTML = countries.map((country) => {
    const months = byCountry[country] || new Array(12).fill(0);
    const total = months.reduce((sum, value) => sum + Number(value || 0), 0);
    const cells = MONTHS.map((label, index) => {
      const value = Number(months[index] || 0);
      const active = selectedCountry === country && selectedMonth === index ? "active" : "";
      const zero = value === 0 ? "zero" : "";
      return `<button type="button" class="daycount-month ${active}" data-country="${esc(country)}" data-month="${index}"><div class="label">${label}</div><div class="value ${zero}">${value}</div></button>`;
    }).join("");
    return `<div class="daycount-country"><div class="daycount-country-header"><span>${esc(country)}</span><span>${total} days</span></div><div class="daycount-months">${cells}</div></div>`;
  }).join("");
}
