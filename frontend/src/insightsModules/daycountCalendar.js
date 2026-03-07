import { countryFlag } from "./countryFlags.js";
import { getCountryColorMap } from "./daycountData.js";

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const WEEKDAYS = ["M", "T", "W", "T", "F", "S", "S"];
const DAY_MS = 86400000;

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

function previousDayKey(year, monthIndex, day) {
  const date = new Date(Date.UTC(year, monthIndex, day) - DAY_MS);
  return dayKey(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

function buildLegend(dailyMap, colorMap, esc) {
  const countriesInYear = new Set(Object.values(dailyMap || {}).filter(Boolean));
  const mapped = Object.entries(colorMap).filter(([country]) => countriesInYear.has(country));
  if (!mapped.length) return "";
  const items = mapped.map(([country, index]) => {
    const color = Number(index) > 0 ? `var(--country-palette-${index})` : "var(--bg-tertiary)";
    return `<span class="daycount-cal-legend-item"><span class="daycount-cal-legend-dot" style="background:${color}"></span><span class="daycount-cal-legend-name">${esc(country)}</span></span>`;
  }).join("");
  return `<div class="daycount-cal-legend">${items}</div>`;
}

function buildFallbackColorMap(dailyMap, baseMap) {
  const out = { ...(baseMap || {}) };
  let nextIndex = 1;
  const used = new Set(Object.values(out).map((value) => Number(value)).filter((value) => value > 0));
  if (used.size) {
    while (used.has(nextIndex)) nextIndex = nextIndex >= 12 ? 1 : nextIndex + 1;
  }
  for (const key of Object.keys(dailyMap || {}).sort()) {
    const country = String(dailyMap?.[key] || "").trim();
    if (!country || out[country]) continue;
    out[country] = nextIndex;
    nextIndex = nextIndex >= 12 ? 1 : nextIndex + 1;
  }
  return out;
}

function renderWeekdayRow(esc) {
  return WEEKDAYS.map((label) => `<div class="daycount-cal-dow">${esc(label)}</div>`).join("");
}

function renderPaddingCells(count) {
  let html = "";
  for (let index = 0; index < count; index += 1) html += '<div class="daycount-cal-empty" aria-hidden="true"></div>';
  return html;
}

function renderDayCell(year, monthIndex, day, dailyMap, colorMap, esc, todayKey) {
  const key = dayKey(year, monthIndex, day);
  const country = String(dailyMap?.[key] || "").trim();
  const previousCountry = String(dailyMap?.[previousDayKey(year, monthIndex, day)] || "").trim();
  const currentColorIndex = Number(colorMap?.[country] || 0);
  const previousColorIndex = Number(colorMap?.[previousCountry] || 0);
  const split = country && previousCountry && country !== previousCountry && previousColorIndex > 0;
  const hasData = currentColorIndex > 0;
  const classes = `daycount-cal-day${hasData ? " has-data" : ""}${split ? " split" : ""}${key === todayKey ? " today" : ""}`;
  const style = hasData
    ? ` style="--day-color-a:var(--country-palette-${split ? previousColorIndex : currentColorIndex});--day-color-b:var(--country-palette-${currentColorIndex});"`
    : "";
  const flag = hasData ? countryFlag(country) : "";
  const flagHtml = flag ? `<span class="daycount-cal-flag">${esc(flag)}</span>` : "";
  return `<div class="${classes}"${style}><span class="daycount-cal-num">${esc(String(day))}</span>${flagHtml}</div>`;
}

function renderMonth(year, monthIndex, dailyMap, colorMap, esc, todayKey) {
  const monthName = MONTHS[monthIndex];
  const offset = mondayOffset(year, monthIndex);
  const days = daysInUtcMonth(year, monthIndex);
  let cells = renderPaddingCells(offset);
  for (let day = 1; day <= days; day += 1) {
    cells += renderDayCell(year, monthIndex, day, dailyMap, colorMap, esc, todayKey);
  }
  return `<section class="daycount-cal-month"><div class="daycount-cal-month-header">${esc(monthName)}</div><div class="daycount-cal-week">${renderWeekdayRow(esc)}</div><div class="daycount-cal-grid">${cells}</div></section>`;
}

export function renderCalendarView(year, dailyMap, esc) {
  const safeYear = Number.parseInt(String(year), 10);
  if (!Number.isFinite(safeYear)) return '<div class="daycount-calendar"></div>';
  const safeEsc = typeof esc === "function" ? esc : (value) => String(value ?? "");
  const safeMap = dailyMap || {};
  const colorMap = buildFallbackColorMap(safeMap, getCountryColorMap());
  const todayKey = new Date().toISOString().slice(0, 10);
  const legend = buildLegend(safeMap, colorMap, safeEsc);
  let monthsHtml = "";
  for (let monthIndex = 0; monthIndex < 12; monthIndex += 1) {
    monthsHtml += renderMonth(safeYear, monthIndex, safeMap, colorMap, safeEsc, todayKey);
  }
  return `<div class="daycount-calendar">${legend}${monthsHtml}</div>`;
}
