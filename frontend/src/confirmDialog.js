let dialogRoot = null;
let titleNode = null;
let messageNode = null;
let confirmBtn = null;
let cancelBtn = null;
let pendingResolve = null;
let previousBodyOverflow = "";
let previousActiveElement = null;

function handleClose(accepted) {
  if (!dialogRoot) return;
  if (document.activeElement instanceof HTMLElement && dialogRoot.contains(document.activeElement)) {
    document.activeElement.blur();
  }
  dialogRoot.classList.add("hidden");
  dialogRoot.inert = true;
  dialogRoot.setAttribute("aria-hidden", "true");
  document.body.style.overflow = previousBodyOverflow;
  document.removeEventListener("keydown", onKeydown);
  if (previousActiveElement instanceof HTMLElement && document.contains(previousActiveElement)) {
    previousActiveElement.focus();
  }
  previousActiveElement = null;
  const resolve = pendingResolve;
  pendingResolve = null;
  if (resolve) resolve(Boolean(accepted));
}

function onKeydown(event) {
  if (event.key === "Escape") {
    event.preventDefault();
    handleClose(false);
  }
}

function ensureDialog() {
  if (dialogRoot) return;
  dialogRoot = document.createElement("div");
  dialogRoot.className = "confirm-overlay hidden";
  dialogRoot.inert = true;
  dialogRoot.setAttribute("aria-hidden", "true");
  dialogRoot.innerHTML = `
    <div class="confirm-backdrop" data-confirm-cancel="1"></div>
    <section class="confirm-card" role="dialog" aria-modal="true" aria-labelledby="confirm-title">
      <h3 id="confirm-title" class="confirm-title"></h3>
      <p class="confirm-message"></p>
      <div class="confirm-actions">
        <button type="button" class="btn btn-ghost" data-confirm-cancel="1">Cancel</button>
        <button type="button" class="btn btn-danger" data-confirm-ok="1">Confirm</button>
      </div>
    </section>
  `;
  document.body.appendChild(dialogRoot);
  titleNode = dialogRoot.querySelector(".confirm-title");
  messageNode = dialogRoot.querySelector(".confirm-message");
  confirmBtn = dialogRoot.querySelector("[data-confirm-ok]");
  cancelBtn = dialogRoot.querySelector(".confirm-actions [data-confirm-cancel]");
  dialogRoot.querySelectorAll("[data-confirm-cancel]").forEach((node) => {
    node.addEventListener("click", () => handleClose(false));
  });
  confirmBtn.addEventListener("click", () => handleClose(true));
}

export function confirmAction(options = {}) {
  ensureDialog();
  if (pendingResolve) handleClose(false);
  const title = String(options.title || "Please confirm");
  const message = String(options.message || "Are you sure you want to continue?");
  const confirmText = String(options.confirmText || "Confirm");
  const cancelText = String(options.cancelText || "Cancel");
  const isDanger = options.danger !== false;

  titleNode.textContent = title;
  messageNode.textContent = message;
  confirmBtn.textContent = confirmText;
  cancelBtn.textContent = cancelText;
  confirmBtn.className = `btn ${isDanger ? "btn-danger" : "btn-primary"}`;

  previousActiveElement = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  dialogRoot.classList.remove("hidden");
  dialogRoot.inert = false;
  dialogRoot.setAttribute("aria-hidden", "false");
  previousBodyOverflow = document.body.style.overflow;
  document.body.style.overflow = "hidden";
  document.addEventListener("keydown", onKeydown);
  confirmBtn.focus();

  return new Promise((resolve) => {
    pendingResolve = resolve;
  });
}
