if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("/sw.js?v=21", { updateViaCache: "none" }).catch(() => {});
}
