import { BACKEND_API_DEV_PROXY_PREFIX } from "../backendApi";
import { resolveFastApiBaseUrls } from "../fastApi";

const DEFAULT_REALTIME_MESSAGE_TTL_SECONDS = 300;

function normalizeBaseUrl(value: string) {
  return value.trim().replace(/\/$/, "");
}

export function resolveRealtimeMessageTtlSeconds() {
  const rawValue = import.meta.env.VITE_REALTIME_MESSAGE_TTL_SECONDS?.trim();
  if (!rawValue) {
    return DEFAULT_REALTIME_MESSAGE_TTL_SECONDS;
  }

  const parsed = Number.parseInt(rawValue, 10);
  if (!Number.isFinite(parsed) || parsed < 1) {
    return DEFAULT_REALTIME_MESSAGE_TTL_SECONDS;
  }

  return parsed;
}

export function resolveRealtimeRelayBaseUrl() {
  return resolveFastApiBaseUrls({
    proxyPrefix: BACKEND_API_DEV_PROXY_PREFIX,
    envKeys: [
      "VITE_REALTIME_RELAY_BASE_URL",
      "VITE_BACKEND_BASE_URL",
      "VITE_FASTAPI_API_BASE_URL",
    ],
    errorMessage:
      "Realtime relay is not configured. Set VITE_BACKEND_BASE_URL or VITE_REALTIME_RELAY_BASE_URL.",
  })[0];
}

export function resolveRealtimeRelayWebSocketUrl() {
  const baseUrl = normalizeBaseUrl(resolveRealtimeRelayBaseUrl());

  if (baseUrl.startsWith("/")) {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    return `${protocol}//${window.location.host}${baseUrl}/realtime/ws`;
  }

  const url = new URL(baseUrl);
  url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
  url.pathname = `${url.pathname.replace(/\/$/, "")}/realtime/ws`;
  url.search = "";
  url.hash = "";
  return url.toString();
}
