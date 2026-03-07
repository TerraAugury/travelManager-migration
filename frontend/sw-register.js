if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("/sw.js?v=23", { updateViaCache: "none" }).catch(() => {});
}
