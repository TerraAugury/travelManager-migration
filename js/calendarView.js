import { buildDailyCountryMap } from "./daycount.js";
import { countryToFlag } from "./countryFlags.js";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

// Monday-first day-of-week header
const DOW_ROW = ["M", "T", "W", "T", "F", "S", "S"]
  .map(l => `<div class="cal-weekday">${l}</div>`).join("");

export function renderCalendarView({ trips, daycountState, els }) {
  const resultsEl = els["daycount-results"];
  if (!resultsEl) return;

  const { passenger, year } = daycountState;
  const dayMap = buildDailyCountryMap(trips, passenger, year);
  const yearStr = String(year);

  const monthsHtml = MONTH_NAMES.map((name, m) => {
    const daysInMonth = new Date(Date.UTC(year, m + 1, 0)).getUTCDate();
    // Offset blank cells so the 1st falls on the right weekday (Mon = col 0)
    const offset = (new Date(Date.UTC(year, m, 1)).getUTCDay() + 6) % 7;
    let cells = '<div class="cal-day blank"></div>'.repeat(offset);

    for (let d = 1; d <= daysInMonth; d++) {
      const ds = `${yearStr}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      const country = dayMap[ds];
      const flag = country ? countryToFlag(country) : "";
      const cls = country ? "cal-day" : "cal-day no-data";
      const title = country ? ` title="${country}"` : "";
      cells += `<div class="${cls}"${title}><span class="cal-day-num">${d}</span>`
             + `<span class="cal-day-flag">${flag}</span></div>`;
    }

    return `<div class="cal-month">`
         + `<div class="cal-month-title">${name}</div>`
         + `<div class="cal-grid">${DOW_ROW}${cells}</div>`
         + `</div>`;
  }).join("");

  resultsEl.innerHTML = `<div class="cal-year">${monthsHtml}</div>`;
}
