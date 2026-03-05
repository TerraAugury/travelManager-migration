if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("/sw.js?v=17", { updateViaCache: "none" }).catch(() => {});
}
