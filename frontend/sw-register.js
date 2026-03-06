if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("/sw.js?v=22", { updateViaCache: "none" }).catch(() => {});
}
