if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("/sw.js?v=18", { updateViaCache: "none" }).catch(() => {});
}
