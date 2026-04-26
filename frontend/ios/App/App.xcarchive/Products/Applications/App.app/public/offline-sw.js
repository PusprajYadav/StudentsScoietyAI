const searchParams = new URL(self.location.href).searchParams;
const appVersion = searchParams.get("v") || "local-dev";
const cachePrefix = "student-society-runtime";
const runtimeCacheName = `${cachePrefix}-${appVersion}`;
const shellAssets = [
  "/",
  "/index.html",
  "/logo.png",
  "/manifest.webmanifest",
  "/student-society-avatar.svg",
  "/student-society-banner.svg",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(runtimeCacheName);
      await cache.addAll(shellAssets);
      await self.skipWaiting();
    })()
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((key) => key.startsWith(cachePrefix) && key !== runtimeCacheName)
          .map((key) => caches.delete(key))
      );
      await self.clients.claim();
    })()
  );
});

async function networkFirst(request) {
  const cache = await caches.open(runtimeCacheName);

  try {
    const response = await fetch(request);
    cache.put(request, response.clone()).catch(() => undefined);
    return response;
  } catch {
    const cached = await cache.match(request);
    if (cached) {
      return cached;
    }

    return cache.match("/index.html");
  }
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(runtimeCacheName);
  const cached = await cache.match(request);
  const fetchPromise = fetch(request)
    .then((response) => {
      cache.put(request, response.clone()).catch(() => undefined);
      return response;
    })
    .catch(() => cached);

  return cached || fetchPromise;
}

self.addEventListener("fetch", (event) => {
  const { request } = event;

  if (request.method !== "GET") {
    return;
  }

  const url = new URL(request.url);

  if (url.origin !== self.location.origin) {
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(networkFirst(request));
    return;
  }

  const isStaticAsset =
    request.destination === "script" ||
    request.destination === "style" ||
    request.destination === "worker" ||
    request.destination === "font" ||
    request.destination === "image" ||
    url.pathname.startsWith("/assets/");

  if (isStaticAsset) {
    event.respondWith(staleWhileRevalidate(request));
  }
});
