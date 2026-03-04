if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("/sw.js?v=13", { updateViaCache: "none" }).catch(() => {});
}
