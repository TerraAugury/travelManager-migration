const CHEVRON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>';
const SELECTS = new Map();
let outsideBound = false;

function esc(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function closeAll(except = null) {
  for (const state of SELECTS.values()) {
    const open = state.button.getAttribute("aria-expanded") === "true";
    if (!open || state.wrap === except) continue;
    state.button.setAttribute("aria-expanded", "false");
    state.list.classList.add("hidden");
  }
}

function updateOptions(select, state) {
  const selected = select.options[select.selectedIndex];
  state.text.textContent = selected?.textContent || "Select…";
  state.button.disabled = !!select.disabled;
  state.list.innerHTML = Array.from(select.options).map((option) => {
    const value = option.value;
    const active = value === select.value ? " selected" : "";
    const disabled = option.disabled ? " disabled" : "";
    const selectedAttr = value === select.value ? ' aria-selected="true"' : ' aria-selected="false"';
    return `<button type="button" class="custom-select-option${active}" role="option" data-value="${esc(value)}"${selectedAttr}${disabled}>${esc(option.textContent || "")}</button>`;
  }).join("");
}

function setSelectValue(select, value) {
  if (select.value === value) return;
  select.value = value;
  select.dispatchEvent(new Event("change", { bubbles: true }));
}

function initCustomSelect(select) {
  if (!(select instanceof HTMLSelectElement) || select.dataset.native === "1") return;
  if (!select.id) select.id = `custom-select-${SELECTS.size + 1}`;
  if (SELECTS.has(select.id)) return;
  const wrap = document.createElement("div");
  wrap.className = "custom-select";
  const button = document.createElement("button");
  button.type = "button";
  button.className = "custom-select-btn";
  button.setAttribute("aria-haspopup", "listbox");
  button.setAttribute("aria-expanded", "false");
  const list = document.createElement("div");
  list.className = "custom-select-list hidden";
  list.id = `${select.id}-listbox`;
  list.setAttribute("role", "listbox");
  button.setAttribute("aria-controls", list.id);
  const text = document.createElement("span");
  text.className = "custom-select-text";
  const icon = document.createElement("span");
  icon.className = "custom-select-icon";
  icon.innerHTML = CHEVRON;
  button.append(text, icon);
  wrap.append(button, list);
  select.classList.add("native-control-hidden");
  select.after(wrap);

  const state = { wrap, button, text, list };
  SELECTS.set(select.id, state);
  const refresh = () => updateOptions(select, state);
  select.addEventListener("change", refresh);
  new MutationObserver(refresh).observe(select, { childList: true, subtree: true, attributes: true });

  button.addEventListener("click", () => {
    const shouldOpen = button.getAttribute("aria-expanded") !== "true";
    closeAll(shouldOpen ? wrap : null);
    button.setAttribute("aria-expanded", shouldOpen ? "true" : "false");
    list.classList.toggle("hidden", !shouldOpen);
  });

  button.addEventListener("keydown", (event) => {
    if (event.key !== "ArrowDown") return;
    event.preventDefault();
    button.setAttribute("aria-expanded", "true");
    list.classList.remove("hidden");
    list.querySelector(".custom-select-option:not(:disabled)")?.focus();
  });

  list.addEventListener("click", (event) => {
    const option = event.target instanceof Element ? event.target.closest(".custom-select-option") : null;
    if (!option || option.hasAttribute("disabled")) return;
    setSelectValue(select, option.getAttribute("data-value") || "");
    closeAll();
    button.focus();
  });

  list.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      event.preventDefault();
      closeAll();
      button.focus();
    }
  });

  refresh();
}

export function initCustomSelects() {
  document.querySelectorAll("select").forEach((select) => initCustomSelect(select));
  if (outsideBound) return;
  outsideBound = true;
  document.addEventListener("click", (event) => {
    const target = event.target instanceof Element ? event.target.closest(".custom-select") : null;
    if (!target) closeAll();
  });
}

export function initPastTripsSwitch() {
  const input = document.getElementById("show-past-trips");
  const toggle = document.getElementById("show-past-trips-switch");
  if (!(input instanceof HTMLInputElement) || !(toggle instanceof HTMLElement)) return;
  if (toggle.dataset.bound === "1") {
    toggle.setAttribute("aria-checked", input.checked ? "true" : "false");
    toggle.classList.toggle("on", input.checked);
    return;
  }
  const sync = () => {
    toggle.setAttribute("aria-checked", input.checked ? "true" : "false");
    toggle.classList.toggle("on", input.checked);
    toggle.classList.toggle("disabled", input.disabled);
  };
  toggle.dataset.bound = "1";
  toggle.addEventListener("click", () => {
    if (input.disabled) return;
    input.checked = !input.checked;
    input.dispatchEvent(new Event("change", { bubbles: true }));
    sync();
  });
  input.addEventListener("change", sync);
  sync();
}

export function syncCustomControls() {
  initCustomSelects();
  initPastTripsSwitch();
}
