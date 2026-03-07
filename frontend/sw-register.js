if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("/sw.js?v=28", { updateViaCache: "none" }).catch(() => {});
}
