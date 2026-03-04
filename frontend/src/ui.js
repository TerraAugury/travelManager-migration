import { getState } from "./state.js";

function eventElement(event) {
  return event.target instanceof Element ? event.target : null;
}

function switchScreen(screen) {
  document.querySelectorAll(".screen").forEach((s) => s.classList.remove("active-screen"));
  document.querySelectorAll(".tab-btn,.nav-btn").forEach((b) => b.classList.remove("active"));
  const el = document.getElementById(`screen-${screen}`);
  if (el) el.classList.add("active-screen");
  document.querySelectorAll(`[data-screen="${screen}"]`).forEach((b) => b.classList.add("active"));
}

function openOverlay(id) {
  const overlay = document.getElementById(id);
  if (!overlay) return;
  overlay.classList.remove("hidden");
  overlay.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
}

export function closeOverlay(id) {
  const overlay = document.getElementById(id);
  if (!overlay) return;
  overlay.classList.add("hidden");
  overlay.setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";
}

function syncTripForms() {
  const selectVal = document.getElementById("trip-select")?.value ?? "";
  const isNew = selectVal === "__new__";
  const hasTrip = !!getState().selectedTripId && !isNew;
  document.getElementById("trip-form")?.classList.toggle("hidden", !isNew);
  document.getElementById("trip-edit-form")?.classList.add("hidden");
  document.getElementById("trip-edit-actions")?.classList.toggle("hidden", !hasTrip);
}

export { syncTripForms };

export function bindUI(actions) {
  // Screen switching (supports dynamically inserted buttons)
  document.addEventListener("click", (event) => {
    const btn = eventElement(event)?.closest(".tab-btn,.nav-btn");
    const screen = btn?.dataset?.screen;
    if (!screen) return;
    event.preventDefault();
    switchScreen(screen);
  });

  // Open overlays
  document.getElementById("add-flight-btn")?.addEventListener("click", () => {
    document.getElementById("flight-overlay-title").textContent = "Add Flight";
    openOverlay("flight-overlay");
  });
  document.getElementById("add-hotel-btn")?.addEventListener("click", () => {
    document.getElementById("hotel-overlay-title").textContent = "Add Hotel";
    openOverlay("hotel-overlay");
  });

  // Close overlays
  ["close-flight-overlay", "cancel-flight-btn"].forEach((id) =>
    document.getElementById(id)?.addEventListener("click", () => closeOverlay("flight-overlay"))
  );
  ["close-hotel-overlay", "cancel-hotel-btn"].forEach((id) =>
    document.getElementById(id)?.addEventListener("click", () => closeOverlay("hotel-overlay"))
  );
  document.querySelectorAll(".overlay-backdrop").forEach((bd) =>
    bd.addEventListener("click", () => {
      closeOverlay("flight-overlay");
      closeOverlay("hotel-overlay");
    })
  );

  // Topbar menu toggle
  const menuBtn = document.getElementById("topbar-menu-btn");
  const menuPanel = document.getElementById("topbar-menu-panel");
  menuBtn?.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    menuPanel?.classList.toggle("hidden");
  });
  document.addEventListener("click", (event) => {
    if (eventElement(event)?.closest(".topbar-menu")) return;
    menuPanel?.classList.add("hidden");
  });

  // Stats toggle
  const statsToggle = document.getElementById("toggle-alltrips-btn");
  const statsCard = document.getElementById("stats-card");
  statsToggle?.addEventListener("click", () => {
    const expanded = statsToggle.getAttribute("aria-expanded") === "true";
    statsToggle.setAttribute("aria-expanded", String(!expanded));
    statsCard?.classList.toggle("hidden", expanded);
    statsToggle.textContent = expanded
      ? "Show all trips statistics"
      : "Hide all trips statistics";
  });

  // Trip select: show/hide create vs edit form
  document.getElementById("trip-select")?.addEventListener("change", () => syncTripForms());

  // Trip delete
  document.getElementById("trip-delete-btn")?.addEventListener("click", async () => {
    const id = getState().selectedTripId;
    if (id) await actions.onDeleteTrip(id);
  });
}

export function setOverlayEditMode(type, editing) {
  const titleEl = document.getElementById(`${type}-overlay-title`);
  if (titleEl) titleEl.textContent = editing ? `Edit ${type === "flight" ? "Flight" : "Hotel"}` : `Add ${type === "flight" ? "Flight" : "Hotel"}`;
  openOverlay(`${type}-overlay`);
}
