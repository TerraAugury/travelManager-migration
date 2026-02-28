import { getState } from "./state.js";

function fmtDate(value) {
  if (!value) return "-";
  return String(value).slice(0, 10);
}

function renderTrips(items, onDelete) {
  const list = document.getElementById("trip-list");
  list.innerHTML = "";
  if (!items.length) {
    const li = document.createElement("li");
    li.textContent = "No trips yet.";
    list.appendChild(li);
    return;
  }

  items.forEach((trip) => {
    const li = document.createElement("li");
    const info = document.createElement("div");
    info.textContent = `${trip.name} (${fmtDate(trip.start_date)} -> ${fmtDate(trip.end_date)})`;

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "danger";
    btn.textContent = "Delete";
    btn.addEventListener("click", () => onDelete(trip.id));

    li.appendChild(info);
    li.appendChild(btn);
    list.appendChild(li);
  });
}

export function render(logLine = null, onDelete = () => {}) {
  const state = getState();
  const authPanel = document.getElementById("auth-panel");
  const appPanel = document.getElementById("app-panel");
  const userLine = document.getElementById("user-line");
  const status = document.getElementById("status-log");

  if (state.user) {
    authPanel.classList.add("hidden");
    appPanel.classList.remove("hidden");
    userLine.textContent = `${state.user.display_name} (${state.user.email})`;
  } else {
    authPanel.classList.remove("hidden");
    appPanel.classList.add("hidden");
    userLine.textContent = "";
  }

  renderTrips(state.trips, onDelete);

  if (logLine) {
    const lines = status.textContent.split("\n").slice(-11);
    lines.push(logLine);
    status.textContent = lines.join("\n");
  }
}

