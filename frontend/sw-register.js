if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("/sw.js?v=25", { updateViaCache: "none" }).catch(() => {});
}
