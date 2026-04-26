import { supabase } from "./supabase";
import {
  FastApiConnectionError,
  getFastApiUnavailableMessage,
  isFastApiConnectionError,
  resolveFastApiBaseUrls,
} from "./fastApi";

export const BACKEND_API_DEV_PROXY_PREFIX = "/__backend-api-proxy";

export type BackendAuthMode = "required" | "optional" | "none";

function getBackendApiBaseUrls() {
  return resolveFastApiBaseUrls({
    proxyPrefix: BACKEND_API_DEV_PROXY_PREFIX,
    envKeys: [
      "VITE_BACKEND_BASE_URL",
      "VITE_FASTAPI_API_BASE_URL",
      "VITE_BULK_MAILER_API_BASE_URL",
      "VITE_INSTAGRAM_AUTOMATION_API_BASE_URL",
    ],
    errorMessage:
      "Backend API is not configured. Set VITE_BACKEND_BASE_URL or VITE_FASTAPI_API_BASE_URL for production or run the local FastAPI server for development.",
  });
}

export function isBackendApiConfigured() {
  try {
    return getBackendApiBaseUrls().length > 0;
  } catch {
    return false;
  }
}

async function getAccessToken(required: boolean) {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (session?.access_token) {
    return session.access_token;
  }

  const {
    data: { session: refreshedSession },
  } = await supabase.auth.refreshSession().catch(() => ({ data: { session: null } }));

  const token = refreshedSession?.access_token || null;

  if (required && !token) {
    throw new Error("Sign in to continue.");
  }

  return token;
}

function buildRequestBody(
  body: BodyInit | Record<string, unknown> | null | undefined,
  headers: Record<string, string>
) {
  if (body === null || body === undefined) {
    return undefined;
  }

  if (body instanceof FormData || body instanceof Blob || body instanceof URLSearchParams || typeof body === "string") {
    return body;
  }

  headers["Content-Type"] = "application/json";
  return JSON.stringify(body);
}

function extractErrorMessage(payload: unknown, fallback: string) {
  if (typeof payload === "string" && payload.trim()) {
    return payload.trim();
  }

  if (!payload || typeof payload !== "object") {
    return fallback;
  }

  const record = payload as {
    error?: string | { message?: string };
    message?: string;
    detail?:
      | string
      | Array<{
          msg?: string;
          loc?: Array<string | number>;
        }>;
  };

  if (typeof record.error === "string" && record.error.trim()) {
    return record.error.trim();
  }

  if (record.error && typeof record.error === "object" && typeof record.error.message === "string") {
    return record.error.message;
  }

  if (typeof record.message === "string" && record.message.trim()) {
    return record.message.trim();
  }

  if (typeof record.detail === "string" && record.detail.trim()) {
    return record.detail.trim();
  }

  if (Array.isArray(record.detail) && record.detail.length > 0) {
    const [firstIssue] = record.detail;

    if (firstIssue) {
      const fieldPath = Array.isArray(firstIssue.loc)
        ? firstIssue.loc
            .filter((value) => value !== "body")
            .map((value) => String(value))
            .join(".")
        : "";
      const issueMessage = typeof firstIssue.msg === "string" ? firstIssue.msg.trim() : "";

      if (fieldPath && issueMessage) {
        return `${fieldPath}: ${issueMessage}`;
      }

      if (issueMessage) {
        return issueMessage;
      }
    }
  }

  return fallback;
}

function shouldRetryWithNextBackendBaseUrl(
  baseUrl: string,
  response: Response,
  index: number,
  totalAttempts: number
) {
  return response.status === 404 && index < totalAttempts - 1 && baseUrl.startsWith("/");
}

export async function requestBackend<T>(
  path: string,
  options: {
    method?: string;
    body?: BodyInit | Record<string, unknown> | null;
    headers?: Record<string, string>;
    auth?: BackendAuthMode;
    signal?: AbortSignal;
    featureName?: string;
  } = {}
): Promise<T> {
  const authMode = options.auth || "required";
  const token = await getAccessToken(authMode === "required");
  const baseUrls = getBackendApiBaseUrls();
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const headers: Record<string, string> = { ...(options.headers || {}) };

  if (authMode !== "none" && token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const body = buildRequestBody(options.body, headers);
  const featureName = options.featureName || "Backend";
  let lastError: unknown = null;

  for (let index = 0; index < baseUrls.length; index += 1) {
    const baseUrl = baseUrls[index];

    try {
      const response = await fetch(`${baseUrl}${normalizedPath}`, {
        method: options.method || "GET",
        headers,
        body,
        cache: "no-store",
        signal: options.signal,
      });

      if (shouldRetryWithNextBackendBaseUrl(baseUrl, response, index, baseUrls.length)) {
        continue;
      }

      const responseText = await response.text();
      let payload: unknown = null;

      if (responseText) {
        try {
          payload = JSON.parse(responseText);
        } catch {
          payload = responseText;
        }
      }

      if (!response.ok) {
        throw new Error(extractErrorMessage(payload, `Request failed (${response.status}).`));
      }

      return payload as T;
    } catch (error) {
      lastError = error;
      if (error instanceof SyntaxError) {
        throw new Error(`${featureName} backend returned invalid JSON.`);
      }
      if (!isFastApiConnectionError(error)) {
        throw error;
      }
    }
  }

  if (lastError && !isFastApiConnectionError(lastError)) {
    throw lastError;
  }

  throw new FastApiConnectionError(getFastApiUnavailableMessage(featureName));
}

export async function requestBackendBinary(
  path: string,
  options: {
    method?: string;
    body?: BodyInit | Record<string, unknown> | null;
    headers?: Record<string, string>;
    auth?: BackendAuthMode;
    signal?: AbortSignal;
    featureName?: string;
  } = {}
) {
  const authMode = options.auth || "required";
  const token = await getAccessToken(authMode === "required");
  const baseUrls = getBackendApiBaseUrls();
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const headers: Record<string, string> = { ...(options.headers || {}) };

  if (authMode !== "none" && token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const body = buildRequestBody(options.body, headers);
  const featureName = options.featureName || "Backend";
  let lastError: unknown = null;

  for (let index = 0; index < baseUrls.length; index += 1) {
    const baseUrl = baseUrls[index];

    try {
      const response = await fetch(`${baseUrl}${normalizedPath}`, {
        method: options.method || "GET",
        headers,
        body,
        cache: "no-store",
        signal: options.signal,
      });

      if (shouldRetryWithNextBackendBaseUrl(baseUrl, response, index, baseUrls.length)) {
        continue;
      }

      if (!response.ok) {
        const responseText = await response.text().catch(() => "");
        let payload: unknown = null;

        if (responseText) {
          try {
            payload = JSON.parse(responseText);
          } catch {
            payload = responseText;
          }
        }

        throw new Error(
          extractErrorMessage(payload, `Request failed (${response.status}).`)
        );
      }

      return response.arrayBuffer();
    } catch (error) {
      lastError = error;
      if (!isFastApiConnectionError(error)) {
        throw error;
      }
    }
  }

  if (lastError && !isFastApiConnectionError(lastError)) {
    throw lastError;
  }

  throw new FastApiConnectionError(getFastApiUnavailableMessage(featureName));
}

export async function requestBackendVoid(
  path: string,
  options: {
    method?: string;
    body?: BodyInit | Record<string, unknown> | null;
    headers?: Record<string, string>;
    auth?: BackendAuthMode;
    signal?: AbortSignal;
    featureName?: string;
  } = {}
) {
  return requestBackend<null>(path, options);
}

export async function uploadToPresignedUrl(input: {
  uploadUrl: string;
  file: Blob;
  method?: string;
  headers?: Record<string, string>;
  contentType?: string;
}) {
  const requestInit: RequestInit = {
    method: input.method || "PUT",
    body:
      input.contentType && input.file.type !== input.contentType
        ? input.file.slice(0, input.file.size, input.contentType)
        : input.file,
  };

  if (input.headers && Object.keys(input.headers).length > 0) {
    requestInit.headers = input.headers;
  }

  const response = await fetch(input.uploadUrl, requestInit);

  if (!response.ok) {
    const responseText = await response.text().catch(() => "");
    const details = responseText.trim();
    throw new Error(details ? `Upload failed (${response.status}): ${details}` : `Upload failed (${response.status}).`);
  }
}
