export const APP_VERSION = import.meta.env.VITE_APP_VERSION?.trim() || "local-dev";

export const APP_RUNTIME_VERSION_KEY = "student-society:runtime:version";
export const APP_RUNTIME_CACHE_PREFIX = "student-society-runtime";
export const APP_OFFLINE_WORKER_PATH = `/offline-sw.js?v=${encodeURIComponent(APP_VERSION)}`;
