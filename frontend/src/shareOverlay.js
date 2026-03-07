import * as api from "./api.js";
import { getState } from "./state.js";

let currentToken = null;
let currentTripId = null;
let isBound = false;
let returnFocusEl = null;

function esc(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function setStatus(text) {
  const status = document.getElementById("share-status");
  if (status) status.textContent = text || "";
}

function openShareOverlay() {
  const overlay = document.getElementById("share-overlay");
  if (!overlay) return;
  if (document.activeElement instanceof HTMLElement) returnFocusEl = document.activeElement;
  overlay.classList.remove("hidden");
  overlay.setAttribute("aria-hidden", "false");
  overlay.inert = false;
  overlay.querySelector(".overlay-close-btn")?.focus();
  document.body.style.overflow = "hidden";
}

function closeShareOverlay() {
  const overlay = document.getElementById("share-overlay");
  if (!overlay) return;
  const canRestore = returnFocusEl instanceof HTMLElement
    && document.contains(returnFocusEl)
    && !overlay.contains(returnFocusEl);
  if (document.activeElement instanceof HTMLElement && overlay.contains(document.activeElement)) {
    if (canRestore) returnFocusEl.focus();
    else {
      if (!document.body.hasAttribute("tabindex")) document.body.setAttribute("tabindex", "-1");
      document.body.focus();
    }
  }
  if (document.activeElement instanceof HTMLElement && overlay.contains(document.activeElement)) {
    document.activeElement.blur();
  }
  overlay.classList.add("hidden");
  overlay.setAttribute("aria-hidden", "true");
  overlay.inert = true;
  returnFocusEl = null;
  document.body.style.overflow = "";
}

function renderList(items) {
  const list = document.getElementById("share-list");
  if (!list) return;
  if (!Array.isArray(items) || items.length === 0) {
    list.innerHTML = '<p class="hint">No shares yet.</p>';
    return;
  }
  list.innerHTML = items.map((item) => {
    const email = esc(item?.shared_with_email || "");
    const scope = item?.trip_id ? "This trip only" : "All trips";
    const id = esc(item?.id || "");
    return `<div class="field-action"><span>${email}</span><span class="hint">${scope}</span><button type="button" class="btn btn-ghost btn-xs" data-share-id="${id}">Remove</button></div>`;
  }).join("");
}

function syncScopeLabel() {
  const toggle = document.getElementById("share-all-toggle");
  const label = document.getElementById("share-scope-label");
  if (!toggle || !label) return;
  label.textContent = toggle.checked ? "Share all trips" : "Share this trip only";
}

async function reloadShares() {
  if (!currentToken) return;
  const items = await api.listShares(currentToken);
  renderList(items);
}

function bindHandlers() {
  if (isBound) return;
  isBound = true;
  document.getElementById("trip-share-btn")?.addEventListener("click", async () => {
    const state = getState();
    if (!state.token) return;
    openShareOverlay();
    await renderShareOverlay(state.token, state.selectedTripId);
  });
  document.getElementById("close-share-overlay")?.addEventListener("click", () => closeShareOverlay());
  document.getElementById("cancel-share-btn")?.addEventListener("click", () => closeShareOverlay());
  document.querySelector('[data-share-overlay-close="1"]')?.addEventListener("click", () => closeShareOverlay());
  document.getElementById("share-all-toggle")?.addEventListener("change", () => syncScopeLabel());
  document.getElementById("share-submit-btn")?.addEventListener("click", async () => {
    const emailInput = document.getElementById("share-email");
    const toggle = document.getElementById("share-all-toggle");
    const email = String(emailInput?.value || "").trim();
    if (!email) return setStatus("Email is required.");
    if (!currentToken) return setStatus("You must be logged in.");
    const tripId = toggle?.checked ? null : (currentTripId || null);
    if (!tripId && !toggle?.checked) return setStatus("Select a trip or enable Share all trips.");
    const btn = document.getElementById("share-submit-btn");
    if (btn) btn.disabled = true;
    setStatus("Sharing…");
    try {
      await api.createShare(currentToken, { email, tripId });
      if (emailInput) emailInput.value = "";
      setStatus("Share created.");
      await reloadShares();
    } catch (error) {
      setStatus(error?.message || "Could not create share.");
    } finally {
      if (btn) btn.disabled = false;
    }
  });
  document.getElementById("share-list")?.addEventListener("click", async (event) => {
    const btn = event.target instanceof Element ? event.target.closest("[data-share-id]") : null;
    const shareId = btn?.getAttribute("data-share-id");
    if (!shareId || !currentToken) return;
    try {
      await api.deleteShare(currentToken, shareId);
      setStatus("Share removed.");
      await reloadShares();
    } catch (error) {
      setStatus(error?.message || "Could not remove share.");
    }
  });
}

export async function renderShareOverlay(token, tripId) {
  bindHandlers();
  currentToken = token || null;
  currentTripId = tripId || null;
  const toggle = document.getElementById("share-all-toggle");
  if (toggle) {
    toggle.disabled = !currentTripId;
    if (!currentTripId) toggle.checked = true;
  }
  syncScopeLabel();
  setStatus("");
  try {
    await reloadShares();
  } catch (error) {
    renderList([]);
    setStatus(error?.message || "Could not load shares.");
  }
}

bindHandlers();
