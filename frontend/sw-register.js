if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("/sw.js?v=27", { updateViaCache: "none" }).catch(() => {});
}
