if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("/sw.js?v=31", { updateViaCache: "none" }).catch(() => {});
}
