if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("/sw.js?v=33", { updateViaCache: "none" }).catch(() => {});
}
