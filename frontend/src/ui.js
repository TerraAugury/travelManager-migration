import { getState, getFlightProvider, getVisibleTrips, setFlightProvider, setShowPastTrips } from "./state.js";
import { confirmAction } from "./confirmDialog.js";

const overlayReturnFocus = new Map();

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
  if (document.activeElement instanceof HTMLElement) overlayReturnFocus.set(id, document.activeElement);
  overlay.classList.remove("hidden");
  overlay.setAttribute("aria-hidden", "false");
  overlay.inert = false;
  overlay.querySelector(".overlay-close-btn")?.focus();
  document.body.style.overflow = "hidden";
}

function setFlightDateInputsEditable(editing) {
  ["flight-dep-time", "flight-arr-time"].forEach((id) => {
    const input = document.getElementById(id);
    if (input) input.disabled = !editing;
  });
}

export function closeOverlay(id) {
  const overlay = document.getElementById(id);
  if (!overlay) return;
  if (document.activeElement instanceof HTMLElement && overlay.contains(document.activeElement)) {
    document.activeElement.blur();
  }
  overlay.classList.add("hidden");
  overlay.setAttribute("aria-hidden", "true");
  overlay.inert = true;
  const returnFocus = overlayReturnFocus.get(id);
  if (returnFocus instanceof HTMLElement && document.contains(returnFocus)) returnFocus.focus();
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

export function syncFlightProviderSelect() {
  const sel = document.getElementById("flight-provider-select");
  if (sel) sel.value = getFlightProvider();
}

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
    document.getElementById("flight-form")?.reset();
    const form = document.getElementById("flight-form");
    if (form) form.dataset.departureTimezone = "", form.dataset.arrivalTimezone = "";
    const status = document.getElementById("flight-lookup-status");
    if (status) status.textContent = "";
    setOverlayEditMode("flight", false);
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
      closeOverlay("settings-overlay");
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
  document.getElementById("show-past-trips")?.addEventListener("change", async (event) => {
    const showPastTrips = event.target instanceof HTMLInputElement ? event.target.checked : false;
    setShowPastTrips(showPastTrips);
    if (typeof actions.onSelectTrip !== "function") return;
    const currentTripId = getState().selectedTripId;
    const visibleTrips = getVisibleTrips(getState().trips);
    const nextTripId = currentTripId && visibleTrips.some((trip) => trip.id === currentTripId)
      ? currentTripId
      : (visibleTrips[0]?.id || null);
    await actions.onSelectTrip(nextTripId);
  });

  // Trip delete
  document.getElementById("trip-delete-btn")?.addEventListener("click", async () => {
    const id = getState().selectedTripId;
    if (!id) return;
    const trip = getState().trips.find((row) => row.id === id);
    const label = trip?.name ? `"${trip.name}"` : "this trip";
    const confirmed = await confirmAction({
      title: "Delete trip?",
      message: `You are about to delete ${label} and all linked flights and hotels.`,
      confirmText: "Confirm",
      cancelText: "Cancel",
      danger: true
    });
    if (!confirmed) return;
    await actions.onDeleteTrip(id);
  });

  // Settings overlay
  document.getElementById("settings-btn")?.addEventListener("click", () => {
    syncFlightProviderSelect();
    openOverlay("settings-overlay");
    menuPanel?.classList.add("hidden");
  });
  document.getElementById("close-settings-overlay")?.addEventListener("click", () => closeOverlay("settings-overlay"));
  document.getElementById("flight-provider-select")?.addEventListener("change", (e) => {
    setFlightProvider(e.target.value);
  });
}

export function setOverlayEditMode(type, editing) {
  const titleEl = document.getElementById(`${type}-overlay-title`);
  if (titleEl) titleEl.textContent = editing ? `Edit ${type === "flight" ? "Flight" : "Hotel"}` : `Add ${type === "flight" ? "Flight" : "Hotel"}`;
  if (type === "flight") setFlightDateInputsEditable(editing);
  openOverlay(`${type}-overlay`);
}
