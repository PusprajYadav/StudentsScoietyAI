import { supabase } from "../../lib/supabase";
import {
  FastApiConnectionError,
  getFastApiUnavailableMessage,
  isFastApiConnectionError,
  resolveFastApiBaseUrls,
} from "../../lib/fastApi";
import type {
  InstagramCommentDmRuleRow,
  InstagramCommentRuleRow,
  InstagramDmRuleRow,
  JsonMap,
} from "../../types/database";
import type {
  InstagramCommentDmRuleDraft,
  InstagramCommentRuleDraft,
  InstagramDashboardData,
  InstagramDmRuleDraft,
  InstagramMediaItem,
} from "./types";

const INSTAGRAM_OAUTH_REDIRECT_URI = "https://studentsociety.in/app/tools/instagram-automation";
const INSTAGRAM_OAUTH_DIALOG_VERSION = "v25.0";

function getInstagramAutomationApiBaseUrls() {
  return resolveFastApiBaseUrls({
    proxyPrefix: "/__instagram-automation-api-proxy",
    envKeys: [
      "VITE_INSTAGRAM_AUTOMATION_API_BASE_URL",
      "VITE_FASTAPI_DEV_API_BASE_URL",
      "VITE_BACKEND_BASE_URL",
      "VITE_FASTAPI_API_BASE_URL",
      "VITE_BULK_MAILER_API_BASE_URL",
    ],
    errorMessage:
      "Instagram Automation backend is not configured. Set VITE_BACKEND_BASE_URL or VITE_FASTAPI_API_BASE_URL for production or run the local FastAPI server for development.",
  });
}

function isLoopbackInstagramBaseUrl(value: string) {
  try {
    const parsed = new URL(value, typeof window === "undefined" ? "http://localhost" : window.location.origin);
    return parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1" || parsed.hostname === "::1";
  } catch {
    return false;
  }
}

function getInstagramAttemptTimeout(baseUrl: string, attemptIndex: number, totalAttempts: number, fallbackTimeout: number) {
  if (attemptIndex >= totalAttempts - 1) {
    return fallbackTimeout;
  }

  return Math.min(fallbackTimeout, isLoopbackInstagramBaseUrl(baseUrl) ? 3500 : 6000);
}

async function fetchInstagramApiResponse(path: string, init: RequestInit, timeoutMs: number) {
  const baseUrls = getInstagramAutomationApiBaseUrls();

  for (let index = 0; index < baseUrls.length; index += 1) {
    const baseUrl = baseUrls[index];
    const controller = new AbortController();
    const timeoutId = window.setTimeout(
      () => controller.abort(),
      getInstagramAttemptTimeout(baseUrl, index, baseUrls.length, timeoutMs)
    );

    try {
      return await fetch(`${baseUrl}${path}`, {
        ...init,
        cache: "no-store",
        signal: init.signal ?? controller.signal,
      });
    } catch (error) {
      const isLastAttempt = index >= baseUrls.length - 1;

      if (error instanceof DOMException && error.name === "AbortError") {
        if (!isLastAttempt) {
          continue;
        }

        throw new Error("Instagram Automation request timed out. Check the backend connection and try again.");
      }

      if (isFastApiConnectionError(error)) {
        if (!isLastAttempt) {
          continue;
        }

        throw new FastApiConnectionError(getFastApiUnavailableMessage("Instagram Automation"));
      }

      throw error;
    } finally {
      window.clearTimeout(timeoutId);
    }
  }

  throw new FastApiConnectionError(getFastApiUnavailableMessage("Instagram Automation"));
}

function extractInstagramAuthMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  if (error && typeof error === "object") {
    const message =
      "message" in error && typeof error.message === "string" ? error.message.trim() : "";
    const details =
      "details" in error && typeof error.details === "string" ? error.details.trim() : "";
    const hint = "hint" in error && typeof error.hint === "string" ? error.hint.trim() : "";

    const pieces = [message, details, hint].filter(Boolean);
    if (pieces.length > 0) {
      return pieces.join(" ");
    }
  }

  return fallback;
}

async function getAccessToken() {
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();

  if (error) {
    throw new Error(extractInstagramAuthMessage(error, "Sign in to use Instagram Automation."));
  }

  const expiresAtMs = (session?.expires_at || 0) * 1000;
  if (session?.access_token && expiresAtMs > Date.now() + 30_000) {
    return session.access_token;
  }

  const { data: refreshed, error: refreshError } = await supabase.auth.refreshSession();
  if (refreshError) {
    throw new Error(extractInstagramAuthMessage(refreshError, "Sign in to use Instagram Automation."));
  }

  return refreshed.session?.access_token || null;
}

function normalizeInstagramAuthUrl(authUrl: string, redirectUri?: string) {
  let parsed: URL;

  try {
    parsed = new URL(authUrl);
  } catch {
    throw new Error("Instagram OAuth URL is invalid.");
  }

  const clientId = parsed.searchParams.get("client_id")?.trim();
  if (!clientId) {
    throw new Error("META_APP_ID is missing from the Instagram OAuth login URL.");
  }

  parsed.protocol = "https:";
  parsed.hostname = "www.facebook.com";
  parsed.pathname = `/${INSTAGRAM_OAUTH_DIALOG_VERSION}/dialog/oauth`;
  parsed.searchParams.set("client_id", clientId);
  parsed.searchParams.set(
    "redirect_uri",
    redirectUri?.trim() || parsed.searchParams.get("redirect_uri")?.trim() || INSTAGRAM_OAUTH_REDIRECT_URI
  );
  parsed.searchParams.set("response_type", "code");

  return parsed.toString();
}

async function parseApiResponse<T>(response: Response): Promise<T> {
  const payload = (await response.json().catch(() => ({}))) as {
    error?: string;
    detail?: string;
    data?: T;
  };

  if (!response.ok) {
    throw new Error(payload.detail || payload.error || `Request failed (${response.status}).`);
  }

  return payload.data as T;
}

async function callInstagramApi<T>(path: string, init?: RequestInit) {
  const accessToken = await getAccessToken();
  if (!accessToken) {
    throw new Error("Sign in to use Instagram Automation.");
  }

  try {
    const response = await fetchInstagramApiResponse(
      path,
      {
        ...init,
        headers: {
          Authorization: `Bearer ${accessToken}`,
          ...(init?.body ? { "Content-Type": "application/json" } : {}),
          ...(init?.headers || {}),
        },
      },
      25000
    );

    return parseApiResponse<T>(response);
  } catch (error) {
    if (error instanceof FastApiConnectionError) {
      throw error;
    }

    throw error;
  }
}

export async function loadInstagramAutomationDashboard(includeMedia: boolean = true) {
  return callInstagramApi<InstagramDashboardData>(
    `/api/instagram-automation/dashboard?include_media=${includeMedia ? "true" : "false"}`
  );
}

export async function getInstagramConnectUrl() {
  const payload = await callInstagramApi<{ auth_url: string; state: string; redirect_uri?: string }>(
    "/api/instagram-automation/auth/connect-url"
  );

  return {
    ...payload,
    auth_url: normalizeInstagramAuthUrl(payload.auth_url, payload.redirect_uri),
  };
}

export async function completeInstagramConnection(input: { code: string; state: string }) {
  return callInstagramApi<InstagramDashboardData["account"]>("/api/instagram-automation/auth/complete", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function setInstagramAutomationEnabled(automation_enabled: boolean) {
  return callInstagramApi<InstagramDashboardData["account"]>("/api/instagram-automation/account/settings", {
    method: "POST",
    body: JSON.stringify({ automation_enabled }),
  });
}

export async function disconnectInstagramAccount() {
  return callInstagramApi<{ disconnected: boolean }>("/api/instagram-automation/account/disconnect", {
    method: "POST",
    body: JSON.stringify({}),
  });
}

export async function listInstagramMedia() {
  return callInstagramApi<InstagramMediaItem[]>("/api/instagram-automation/media");
}

export async function listInstagramMediaComments(mediaId: string) {
  return callInstagramApi<Array<JsonMap>>(`/api/instagram-automation/media/${mediaId}/comments`);
}

export async function saveInstagramCommentRule(input: InstagramCommentRuleDraft) {
  return callInstagramApi<InstagramCommentRuleRow>("/api/instagram-automation/comment-rules", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function deleteInstagramCommentRule(ruleId: string) {
  return callInstagramApi<{ deleted: boolean }>(`/api/instagram-automation/comment-rules/${ruleId}`, {
    method: "DELETE",
  });
}

export async function saveInstagramDmRule(input: InstagramDmRuleDraft) {
  return callInstagramApi<InstagramDmRuleRow>("/api/instagram-automation/dm-rules", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function deleteInstagramDmRule(ruleId: string) {
  return callInstagramApi<{ deleted: boolean }>(`/api/instagram-automation/dm-rules/${ruleId}`, {
    method: "DELETE",
  });
}

export async function saveInstagramCommentDmRule(input: InstagramCommentDmRuleDraft) {
  return callInstagramApi<InstagramCommentDmRuleRow>("/api/instagram-automation/comment-dm-rules", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function deleteInstagramCommentDmRule(ruleId: string) {
  return callInstagramApi<{ deleted: boolean }>(`/api/instagram-automation/comment-dm-rules/${ruleId}`, {
    method: "DELETE",
  });
}
