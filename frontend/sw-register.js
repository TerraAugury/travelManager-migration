if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("/sw.js?v=8", { updateViaCache: "none" }).catch(() => {});
}
