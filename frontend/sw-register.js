if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("/sw.js?v=24", { updateViaCache: "none" }).catch(() => {});
}
