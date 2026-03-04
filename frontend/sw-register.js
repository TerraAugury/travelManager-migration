if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("/sw.js?v=12", { updateViaCache: "none" }).catch(() => {});
}
