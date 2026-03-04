if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("/sw.js?v=11", { updateViaCache: "none" }).catch(() => {});
}
