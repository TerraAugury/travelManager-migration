const CACHE = "tm-v22";
const STATIC = [
  "/",
  "/styles.css",
  "/layout.css",
  "/tripTiles.css",
  "/overlays.css",
  "/insights.css",
  "/map.css",
  "/manifest.json",
  "/icons/icon.svg",
  "/sw-register.js",
  "/src/main.js",
  "/src/api.js",
  "/src/confirmDialog.js",
  "/src/config.js",
  "/src/forms.js",
  "/src/flightGrouping.js",
  "/src/insights.js",
  "/src/insightsModules/airportCountries.js",
  "/src/insightsModules/airportCoords.js",
  "/src/insightsModules/daycountScreen.js",
  "/src/insightsModules/flightUtils.js",
  "/src/insightsModules/mapGeo.js",
  "/src/insightsModules/mapBadgeLayout.js",
  "/src/insightsModules/mapRender.js",
  "/src/insightsModules/mapScreen.js",
  "/src/insightsModules/todayScreen.js",
  "/src/insightsModules/upcomingScreen.js",
  "/src/insightsModules/tripStats.js",
  "/src/legacyImportFeedback.js",
  "/src/legacyAdapter.js",
  "/src/render.js",
  "/src/state.js",
  "/src/tripEventTiles.js",
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
  const url = new URL(e.request.url);
  const { pathname, protocol, origin } = url;
  if (
    method !== "GET" ||
    (protocol !== "http:" && protocol !== "https:") ||
    origin !== self.location.origin ||
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
          const contentType = String(res.headers.get("content-type") || "").toLowerCase();
          const badJsFallback = pathname.endsWith(".js") && contentType.includes("text/html");
          const clone = res.clone();
          if (!badJsFallback) {
            caches.open(CACHE).then((c) => c.put(e.request, clone)).catch(() => {});
          }
        }
        return res;
      });
    })
  );
});
