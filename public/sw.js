const SHELL_CACHE = "peniel-shell-v2";
const ASSET_CACHE = "peniel-assets-v2";
const APP_SHELL = [
  "/", "/index.html", "/manifest.webmanifest", "/church-logo.png",
  "/pwa-192.png", "/pwa-512.png", "/pwa-maskable-512.png", "/apple-touch-icon.png", "/favicon.ico",
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(SHELL_CACHE).then((cache) => cache.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key.startsWith("peniel-") && ![SHELL_CACHE, ASSET_CACHE].includes(key)).map((key) => caches.delete(key)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== "GET" || url.origin !== self.location.origin || url.pathname.startsWith("/api/")) return;

  if (request.mode === "navigate") {
    event.respondWith(fetch(request).then((response) => {
      if (response.ok) {
        const copy = response.clone();
        caches.open(SHELL_CACHE).then((cache) => cache.put("/index.html", copy));
      }
      return response;
    }).catch(async () => (await caches.match(request)) || (await caches.match("/index.html")) || Response.error()));
    return;
  }

  if (url.pathname.startsWith("/assets/")) {
    event.respondWith(caches.open(ASSET_CACHE).then(async (cache) => {
      const cached = await cache.match(request);
      if (cached) return cached;
      const response = await fetch(request);
      if (response.ok) cache.put(request, response.clone());
      return response;
    }));
  }
});
