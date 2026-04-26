import {
  APP_OFFLINE_WORKER_PATH,
  APP_RUNTIME_CACHE_PREFIX,
  APP_RUNTIME_VERSION_KEY,
  APP_VERSION,
} from "./appVersion";
import { isNativePlatform } from "./capacitorNotifications";

function clearRuntimeLocalKeys() {
  if (typeof window === "undefined") {
    return;
  }

  const keysToRemove: string[] = [];

  for (let index = 0; index < window.localStorage.length; index += 1) {
    const key = window.localStorage.key(index);

    if (!key || !key.startsWith("student-society:runtime:")) {
      continue;
    }

    keysToRemove.push(key);
  }

  keysToRemove.forEach((key) => window.localStorage.removeItem(key));
}

async function clearRuntimeCaches() {
  if (typeof window === "undefined" || !("caches" in window)) {
    return;
  }

  const cacheKeys = await window.caches.keys();
  await Promise.all(
    cacheKeys
      .filter((key) => key.startsWith(APP_RUNTIME_CACHE_PREFIX))
      .map((key) => window.caches.delete(key))
  );
}

async function unregisterOfflineWorkers() {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) {
    return;
  }

  const registrations = await navigator.serviceWorker.getRegistrations();
  await Promise.all(registrations.map((registration) => registration.unregister()));
}

export interface RuntimeCacheSummary {
  supported: boolean;
  cacheCount: number;
  requestCount: number;
  cacheNames: string[];
}

function shouldUseOfflineWorker() {
  if (typeof window === "undefined") {
    return false;
  }

  if (isNativePlatform()) {
    return false;
  }

  // Never use the offline worker on the Vite dev server. It can serve stale
  // chunks and keep old PDF.js bundles alive after code changes.
  if (import.meta.env.DEV) {
    return false;
  }

  if (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") {
    return false;
  }

  return true;
}

async function syncRuntimeVersion() {
  if (typeof window === "undefined") {
    return;
  }

  const storedVersion = window.localStorage.getItem(APP_RUNTIME_VERSION_KEY);

  if (storedVersion === APP_VERSION) {
    return;
  }

  await clearRuntimeCaches();
  clearRuntimeLocalKeys();
  window.localStorage.setItem(APP_RUNTIME_VERSION_KEY, APP_VERSION);
}

async function registerOfflineWorker() {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) {
    return;
  }

  if (!shouldUseOfflineWorker()) {
    await unregisterOfflineWorkers();
    await clearRuntimeCaches();
    return;
  }

  const registration = await navigator.serviceWorker.register(APP_OFFLINE_WORKER_PATH, {
    scope: "/",
  });

  void registration.update().catch(() => undefined);
}

export async function clearRuntimeCachesFromDevice() {
  await clearRuntimeCaches();
}

export async function clearRuntimeLocalState() {
  clearRuntimeLocalKeys();
}

export async function getRuntimeCacheSummary(): Promise<RuntimeCacheSummary> {
  if (typeof window === "undefined" || !("caches" in window)) {
    return {
      supported: false,
      cacheCount: 0,
      requestCount: 0,
      cacheNames: [],
    };
  }

  const cacheNames = (await window.caches.keys()).filter((key) => key.startsWith(APP_RUNTIME_CACHE_PREFIX));
  let requestCount = 0;

  for (const cacheName of cacheNames) {
    const cache = await window.caches.open(cacheName);
    const requests = await cache.keys();
    requestCount += requests.length;
  }

  return {
    supported: true,
    cacheCount: cacheNames.length,
    requestCount,
    cacheNames,
  };
}

export async function refreshOfflineWorkerRegistration() {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) {
    return;
  }

  const registrations = await navigator.serviceWorker.getRegistrations();
  await Promise.all(registrations.map((registration) => registration.update().catch(() => undefined)));
}

export async function initializeAppRuntime() {
  if (typeof window === "undefined") {
    return;
  }

  await syncRuntimeVersion();
  await registerOfflineWorker();
}
