if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("/sw.js?v=26", { updateViaCache: "none" }).catch(() => {});
}
