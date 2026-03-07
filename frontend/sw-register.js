if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("/sw.js?v=35", { updateViaCache: "none" }).catch(() => {});
}
