if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("/sw.js?v=19", { updateViaCache: "none" }).catch(() => {});
}
