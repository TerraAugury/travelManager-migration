import { getPassengerFlights, startOfUtcDay } from "./daycountData.js";
import { renderCalendarView } from "./daycountCalendar.js";

const MONTHS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
const HALF_YEAR_DAYS = 183;
const YEAR_DAYS = 366;

function esc(value) { return String(value ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"); }
function getPassengers(trips) {
  const names = new Set();
  for (const trip of Array.isArray(trips) ? trips : []) {
    for (const record of Array.isArray(trip?.records) ? trip.records : []) for (const name of Array.isArray(record?.paxNames) ? record.paxNames : []) if (String(name || "").trim()) names.add(String(name).trim());
    for (const hotel of Array.isArray(trip?.hotels) ? trip.hotels : []) for (const name of Array.isArray(hotel?.paxNames) ? hotel.paxNames : []) if (String(name || "").trim()) names.add(String(name).trim());
  }
  return Array.from(names).sort((a, b) => a.localeCompare(b));
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
function formatUtcDayKey(date) { return startOfUtcDay(date).toISOString().slice(0, 10); }
function addDailyCountry(out, country, start, end) {
  if (!(start < end)) return;
  const key = country || "Other";
  for (let cursor = new Date(start); cursor < end; cursor = new Date(cursor.getTime() + 86400000)) out[formatUtcDayKey(cursor)] = key;
}

export function buildDailyCountryMap(trips, passenger) {
  const flights = getPassengerFlights(trips, passenger);
  if (!flights.length) return {};
  const years = Array.from(new Set(flights.map((f) => f.date.getUTCFullYear()))).sort((a, b) => a - b);
  const out = {};
  for (const year of years) {
    const yearStart = new Date(Date.UTC(year, 0, 1));
    const yearEnd = new Date(Date.UTC(year + 1, 0, 1));
    const byDay = {};
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
      addDailyCountry(byDay, currentCountry, cursor, depDay);
      currentCountry = flight.arrivalCountry || "Other";
      cursor = new Date(depDay);
    }
    addDailyCountry(byDay, currentCountry, cursor, yearEnd);
    out[year] = byDay;
  }
  return out;
}
function renderYearChips(yearList, years, selectedYear) { yearList.innerHTML = years.map((year) => `<button class="chip-button ${year === selectedYear ? "active" : ""}" data-year="${year}">${year}</button>`).join(""); }
function ensureYearRow(yearList, toggleBtn) {
  const field = yearList.closest(".field");
  if (!field || !toggleBtn) return;
  let row = field.querySelector(".daycount-year-row");
  if (!row) {
    row = document.createElement("div");
    row.className = "daycount-year-row";
    yearList.before(row);
    row.append(yearList);
    row.append(toggleBtn);
    toggleBtn.classList.add("btn-text", "daycount-view-btn");
  }
}
function countryCard(country, months, selectedCountry, selectedMonth) {
  const total = months.reduce((sum, value) => sum + Number(value || 0), 0);
  const over = total > HALF_YEAR_DAYS;
  const width = Math.min(100, Math.round((total / YEAR_DAYS) * 100));
  const cells = MONTHS.map((label, index) => {
    const value = Number(months[index] || 0);
    const active = selectedCountry === country && selectedMonth === index ? "active" : "";
    const zero = value === 0 ? "zero" : "";
    const overClass = over && value > 0 ? "over" : "";
    return `<button type="button" class="daycount-month ${active}" data-country="${esc(country)}" data-month="${index}"><div class="label">${label}</div><div class="value ${zero} ${overClass}">${value}</div></button>`;
  }).join("");
  return `<article class="daycount-country"><div class="daycount-country-header"><span class="daycount-country-name">${esc(country)}</span><span class="daycount-country-total${over ? " over" : ""}">${total}</span></div><div class="daycount-progress-track"><span class="daycount-progress-fill${over ? " over" : ""}" style="width:${width}%"></span><span class="daycount-progress-tick" aria-hidden="true"></span></div><div class="daycount-months">${cells}</div></article>`;
}

export function renderDaycountView({ trips, daycountState, els }) {
  const passSelect = els["daycount-passenger"]; const yearList = els["daycount-year-list"]; const resultsEl = els["daycount-results"]; const emptyEl = els["daycount-empty"]; const toggleBtn = document.getElementById("daycount-view-toggle");
  if (!passSelect || !yearList || !resultsEl || !emptyEl) return;
  ensureYearRow(yearList, toggleBtn);
  const passengers = getPassengers(trips);
  passSelect.innerHTML = '<option value="">Select passenger</option>';
  for (const passenger of passengers) passSelect.insertAdjacentHTML("beforeend", `<option value="${esc(passenger)}"${passenger === daycountState.passenger ? " selected" : ""}>${esc(passenger)}</option>`);
  if (!passengers.includes(daycountState.passenger)) { daycountState.passenger = ""; daycountState.monthSelection = null; }
  if (toggleBtn) toggleBtn.textContent = daycountState.viewMode === "calendar" ? "List view" : "Calendar view";
  if (!daycountState.passenger) { emptyEl.textContent = passengers.length ? "Choose a passenger to view travel summary." : "No passengers yet."; emptyEl.classList.remove("hidden"); yearList.innerHTML = ""; resultsEl.innerHTML = ""; return; }
  const summary = buildMonthSummary(trips, daycountState.passenger);
  const years = Object.keys(summary).map((y) => Number.parseInt(y, 10)).sort((a, b) => b - a);
  if (!years.length) { emptyEl.textContent = "No travel data for this passenger."; emptyEl.classList.remove("hidden"); yearList.innerHTML = ""; resultsEl.innerHTML = ""; return; }
  if (!years.includes(daycountState.year)) { daycountState.year = years[0]; daycountState.monthSelection = null; }
  renderYearChips(yearList, years, daycountState.year);
  if (daycountState.viewMode === "calendar") {
    const dailyMap = buildDailyCountryMap(trips, daycountState.passenger);
    emptyEl.classList.add("hidden");
    resultsEl.innerHTML = renderCalendarView(daycountState.year, dailyMap[daycountState.year] || {}, esc);
    return;
  }
  const byCountry = summary[daycountState.year] || {};
  const countries = Object.keys(byCountry).sort((a, b) => a.localeCompare(b));
  if (!countries.length) { emptyEl.textContent = "No travel data for this year."; emptyEl.classList.remove("hidden"); resultsEl.innerHTML = ""; return; }
  emptyEl.classList.add("hidden");
  const selectedCountry = daycountState.monthSelection?.country || "";
  const selectedMonth = daycountState.monthSelection?.monthIndex;
  resultsEl.innerHTML = countries.map((country) => countryCard(country, byCountry[country] || new Array(12).fill(0), selectedCountry, selectedMonth)).join("");
}
