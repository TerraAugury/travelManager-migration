if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("/sw.js?v=16", { updateViaCache: "none" }).catch(() => {});
}
