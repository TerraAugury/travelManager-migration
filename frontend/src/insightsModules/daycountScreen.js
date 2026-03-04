import { airportToCountry } from "./airportCountries.js";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function esc(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
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

function mapIataToCountry(code) {
  const iata = String(code || "").trim().toUpperCase();
  return airportToCountry[iata] || "Other";
}

function startOfUtcDay(date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function getPassengerFlights(trips, passenger) {
  const flights = [];
  for (const trip of Array.isArray(trips) ? trips : []) {
    for (const record of Array.isArray(trip?.records) ? trip.records : []) {
      if (!hasPassenger(record, passenger)) continue;
      const dateRaw = record?.route?.departure?.scheduled || record?.flightDate || record?.createdAt;
      const date = new Date(dateRaw || "");
      if (Number.isNaN(date.getTime())) continue;
      flights.push({
        date,
        departureCountry: mapIataToCountry(record?.route?.departure?.iata),
        arrivalCountry: mapIataToCountry(record?.route?.arrival?.iata)
      });
    }
  }
  flights.sort((a, b) => a.date.getTime() - b.date.getTime());
  return flights;
}

function addStay(out, year, country, start, end) {
  if (!(start < end)) return;
  const key = country || "Other";
  if (!out[year]) out[year] = {};
  if (!out[year][key]) out[year][key] = new Array(12).fill(0);
  for (let cursor = new Date(start); cursor < end;) {
    const monthEnd = new Date(Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth() + 1, 1));
    const sliceEnd = monthEnd < end ? monthEnd : end;
    const days = Math.round((sliceEnd - cursor) / 86400000);
    if (days > 0) out[year][key][cursor.getUTCMonth()] += days;
    cursor = sliceEnd;
  }
}

export function buildMonthSummary(trips, passenger) {
  const flights = getPassengerFlights(trips, passenger);
  if (!flights.length) return {};
  const years = Array.from(new Set(flights.map((f) => f.date.getUTCFullYear()))).sort((a, b) => a - b);
  const out = {};
  for (const year of years) {
    const yearStart = new Date(Date.UTC(year, 0, 1));
    const yearEnd = new Date(Date.UTC(year + 1, 0, 1));
    let currentCountry = flights[0].departureCountry || "Other";
    for (const flight of flights) {
      const depDay = startOfUtcDay(flight.date);
      if (depDay < yearStart) currentCountry = flight.arrivalCountry || "Other";
      else break;
    }
    let cursor = new Date(yearStart);
    for (const flight of flights) {
      const depDay = startOfUtcDay(flight.date);
      if (depDay < yearStart) continue;
      if (depDay >= yearEnd) break;
      addStay(out, year, currentCountry, cursor, depDay);
      currentCountry = flight.arrivalCountry || "Other";
      cursor = new Date(depDay);
    }
    addStay(out, year, currentCountry, cursor, yearEnd);
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
