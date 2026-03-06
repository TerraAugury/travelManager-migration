if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("/sw.js?v=20", { updateViaCache: "none" }).catch(() => {});
}
