import { countryFlag } from "./countryFlags.js";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const WEEKDAYS = ["M", "T", "W", "T", "F", "S", "S"];

function pad2(value) {
  return String(value).padStart(2, "0");
}

function dayKey(year, monthIndex, day) {
  return `${year}-${pad2(monthIndex + 1)}-${pad2(day)}`;
}

function daysInUtcMonth(year, monthIndex) {
  return new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
}

function mondayOffset(year, monthIndex) {
  const jsWeekday = new Date(Date.UTC(year, monthIndex, 1)).getUTCDay();
  return (jsWeekday + 6) % 7;
}

function renderWeekdayRow(esc) {
  return WEEKDAYS.map((label) => `<div class="daycount-cal-dow">${esc(label)}</div>`).join("");
}

function renderPaddingCells(count) {
  let html = "";
  for (let idx = 0; idx < count; idx += 1) html += '<div class="daycount-cal-empty"></div>';
  return html;
}

function renderDayCell(year, monthIndex, day, dailyMap, esc) {
  const key = dayKey(year, monthIndex, day);
  const country = dailyMap?.[key] || "";
  const flag = country ? countryFlag(country) : "";
  const flagHtml = flag ? `<span class="daycount-cal-flag">${esc(flag)}</span>` : "";
  return `<div class="daycount-cal-day"><span class="daycount-cal-num">${esc(String(day))}</span>${flagHtml}</div>`;
}

function renderMonth(year, monthIndex, dailyMap, esc) {
  const monthName = MONTHS[monthIndex];
  const offset = mondayOffset(year, monthIndex);
  const days = daysInUtcMonth(year, monthIndex);
  let cells = renderPaddingCells(offset);
  for (let day = 1; day <= days; day += 1) {
    cells += renderDayCell(year, monthIndex, day, dailyMap, esc);
  }
  return `<section class="daycount-cal-month"><div class="daycount-cal-month-header">${esc(monthName)}</div><div class="daycount-cal-grid">${renderWeekdayRow(esc)}</div><div class="daycount-cal-grid">${cells}</div></section>`;
}

export function renderCalendarView(year, dailyMap, esc) {
  const safeYear = Number.parseInt(String(year), 10);
  if (!Number.isFinite(safeYear)) return '<div class="daycount-calendar"></div>';
  const safeEsc = typeof esc === "function" ? esc : (value) => String(value ?? "");
  let monthsHtml = "";
  for (let monthIndex = 0; monthIndex < 12; monthIndex += 1) {
    monthsHtml += renderMonth(safeYear, monthIndex, dailyMap || {}, safeEsc);
  }
  return `<div class="daycount-calendar">${monthsHtml}</div>`;
}
