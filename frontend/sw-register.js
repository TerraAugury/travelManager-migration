if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("/sw.js?v=30", { updateViaCache: "none" }).catch(() => {});
}
