const CACHE = "tm-v2";
const STATIC = [
  "/",
  "/styles.css",
  "/insights.css",
  "/map.css",
  "/manifest.json",
  "/icons/icon.svg",
  "/sw-register.js",
  "/src/main.js",
  "/src/api.js",
  "/src/config.js",
  "/src/forms.js",
  "/src/insights.js",
  "/src/legacyAdapter.js",
  "/src/render.js",
  "/src/state.js",
  "/src/ui.js",
  "/vendor/leaflet.css",
  "/vendor/leaflet.js"
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(STATIC)));
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (e) => {
  const { method } = e.request;
  const { pathname } = new URL(e.request.url);
  if (
    method !== "GET" ||
    pathname.startsWith("/api/") ||
    pathname.startsWith("/health")
  ) {
    return;
  }
  e.respondWith(
    caches.match(e.request).then((cached) => {
      if (cached) return cached;
      return fetch(e.request).then((res) => {
        if (res.ok) {
          const clone = res.clone();
          caches.open(CACHE).then((c) => c.put(e.request, clone));
        }
        return res;
      });
    })
  );
});
