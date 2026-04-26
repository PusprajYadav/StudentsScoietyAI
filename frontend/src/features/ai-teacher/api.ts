import {
  BACKEND_API_DEV_PROXY_PREFIX,
  requestBackend,
  requestBackendBinary,
  uploadToPresignedUrl,
} from "../../lib/backendApi";
import {
  FastApiConnectionError,
  getFastApiUnavailableMessage,
  isFastApiConnectionError,
  resolveFastApiBaseUrls,
} from "../../lib/fastApi";
import { supabase } from "../../lib/supabase";
import type {
  AiTeacherAdminConfigPayload,
  AiTeacherChat,
  AiTeacherChatTurn,
  AiTeacherFolder,
  AiTeacherModelRoute,
  AiTeacherMessage,
  AiTeacherOllamaModel,
  AiTeacherProviderConfigItem,
  AiTeacherProviderKey,
  AiTeacherProviderSlug,
  AiTeacherRoutePriority,
  AiTeacherRouteToolType,
  AiTeacherSavedItem,
  AiTeacherSettingsPayload,
  AiTeacherTheme,
  AiTeacherToolType,
} from "./types";

interface BlobUploadUrlResponse {
  upload_url: string;
  file_url: string;
  public_url: string;
  method: string;
  headers: Record<string, string>;
}

export interface AiTeacherChatInput {
  tool_type: AiTeacherToolType;
  input: string;
  file_url?: string | null;
  file_name?: string | null;
  chat_id?: string | null;
  title?: string | null;
  theme_preference?: AiTeacherTheme | null;
  provider?: string | null;
  model_name?: string | null;
  provider_api_key?: string | null;
  provider_api_key_id?: string | null;
  platform_route_id?: string | null;
  api_base?: string | null;
  api_version?: string | null;
  route_priority?: AiTeacherRoutePriority | null;
}

function normalizeAiTeacherMimeType(file: File) {
  const type = file.type.trim().toLowerCase();
  if (type) {
    return type;
  }

  const name = file.name.trim().toLowerCase();
  if (name.endsWith(".pdf")) return "application/pdf";
  if (name.endsWith(".png")) return "image/png";
  if (name.endsWith(".webp")) return "image/webp";
  if (name.endsWith(".gif")) return "image/gif";
  return "image/jpeg";
}

function resolveAiTeacherBaseUrls() {
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

async function getAiTeacherAccessToken() {
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
  if (!token) {
    throw new Error("Sign in to continue.");
  }
  return token;
}

function parseStreamEventBlock(block: string) {
  const lines = block
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  if (!lines.length) {
    return null;
  }

  let event = "message";
  const dataLines: string[] = [];
  for (const line of lines) {
    if (line.startsWith("event:")) {
      event = line.slice("event:".length).trim() || "message";
      continue;
    }
    if (line.startsWith("data:")) {
      dataLines.push(line.slice("data:".length).trim());
    }
  }

  if (!dataLines.length) {
    return null;
  }

  try {
    return {
      event,
      data: JSON.parse(dataLines.join("\n")),
    };
  } catch {
    return null;
  }
}

async function parseErrorMessage(response: Response) {
  const text = await response.text().catch(() => "");
  if (!text.trim()) {
    return `Request failed (${response.status}).`;
  }
  try {
    const payload = JSON.parse(text) as { error?: string; message?: string; detail?: string };
    return payload.error || payload.message || payload.detail || `Request failed (${response.status}).`;
  } catch {
    return text.trim();
  }
}

export async function uploadAiTeacherSource(file: File) {
  const contentType = normalizeAiTeacherMimeType(file);
  const upload = await requestBackend<BlobUploadUrlResponse>(
    `/media/blob-upload-url?${new URLSearchParams({
      namespace: "ai_teacher",
      content_type: contentType,
      file_name: file.name || "ai-teacher-source",
    }).toString()}`,
    {
      featureName: "AI Teacher",
    }
  );

  await uploadToPresignedUrl({
    uploadUrl: upload.upload_url,
    file,
    method: upload.method || "PUT",
    headers: upload.headers,
    contentType,
  });

  return upload.file_url || upload.public_url;
}

export async function listAiTeacherChats() {
  const payload = await requestBackend<{ items: AiTeacherChat[] }>("/ai-teacher/chats", {
    featureName: "AI Teacher",
  });
  return payload.items || [];
}

export async function getAiTeacherChat(chatId: string) {
  return requestBackend<{ chat: AiTeacherChat; messages: AiTeacherMessage[] }>(
    `/ai-teacher/chats/${encodeURIComponent(chatId)}`,
    {
      featureName: "AI Teacher",
    }
  );
}

export async function getAiTeacherSettings() {
  return requestBackend<AiTeacherSettingsPayload>("/ai-teacher/settings", {
    featureName: "AI Teacher",
  });
}

export async function getAiTeacherAdminConfig() {
  return requestBackend<AiTeacherAdminConfigPayload>("/ai-teacher/admin/config", {
    featureName: "AI Teacher",
  });
}

export async function saveAiTeacherProvider(input: {
  slug: AiTeacherProviderSlug;
  label?: string | null;
  description?: string | null;
  is_enabled: boolean;
  config?: Record<string, unknown>;
}) {
  const payload = await requestBackend<{ item: AiTeacherProviderConfigItem }>("/ai-teacher/admin/providers", {
    method: "POST",
    body: input,
    featureName: "AI Teacher",
  });
  return payload.item;
}

export async function saveAiTeacherProviderKey(input: {
  id?: string | null;
  scope: "platform" | "user";
  provider_slug?: AiTeacherProviderSlug;
  label: string;
  provider: string;
  api_key?: string | null;
  default_model_name?: string | null;
  api_base?: string | null;
  api_version?: string | null;
  extra_headers?: Record<string, string>;
  extra_config?: Record<string, unknown>;
  is_active: boolean;
}) {
  const payload = await requestBackend<{ item: AiTeacherProviderKey }>("/ai-teacher/provider-keys", {
    method: "POST",
    body: input,
    featureName: "AI Teacher",
  });
  return payload.item;
}

export async function deleteAiTeacherProviderKey(keyId: string) {
  await requestBackend<{ ok: boolean }>(`/ai-teacher/provider-keys/${encodeURIComponent(keyId)}`, {
    method: "DELETE",
    featureName: "AI Teacher",
  });
}

export async function saveAiTeacherModelRoute(input: {
  id?: string | null;
  provider_slug: AiTeacherProviderSlug;
  provider_key_id?: string | null;
  label: string;
  description?: string | null;
  tool_type: AiTeacherRouteToolType;
  priority: AiTeacherRoutePriority;
  provider?: string | null;
  model_name: string;
  temperature: number;
  max_output_tokens?: number | null;
  sort_order: number;
  supports_vision: boolean;
  is_enabled: boolean;
  route_config?: Record<string, unknown>;
  fallback_to_litellm?: boolean;
}) {
  const payload = await requestBackend<{ item: AiTeacherModelRoute }>("/ai-teacher/admin/model-routes", {
    method: "POST",
    body: input,
    featureName: "AI Teacher",
  });
  return payload.item;
}

export async function deleteAiTeacherModelRoute(routeId: string) {
  await requestBackend<{ ok: boolean }>(`/ai-teacher/admin/model-routes/${encodeURIComponent(routeId)}`, {
    method: "DELETE",
    featureName: "AI Teacher",
  });
}

export async function listAiTeacherOllamaModels() {
  const payload = await requestBackend<{ items: AiTeacherOllamaModel[] }>("/ai-teacher/admin/ollama/models", {
    featureName: "AI Teacher",
  });
  return payload.items || [];
}

export async function pullAiTeacherOllamaModel(modelName: string) {
  const payload = await requestBackend<{ item: { model_name: string; status?: string; digest?: string } }>(
    "/ai-teacher/admin/ollama/models/pull",
    {
      method: "POST",
      body: { model_name: modelName },
      featureName: "AI Teacher",
    }
  );
  return payload.item;
}

export async function deleteAiTeacherOllamaModel(modelName: string) {
  const payload = await requestBackend<{ item: { model_name: string; status?: string } }>(
    `/ai-teacher/admin/ollama/models/${encodeURIComponent(modelName)}`,
    {
      method: "DELETE",
      featureName: "AI Teacher",
    }
  );
  return payload.item;
}

export async function chatAiTeacher(input: AiTeacherChatInput) {
  return requestBackend<AiTeacherChatTurn>("/ai-teacher/chat", {
    method: "POST",
    body: input,
    featureName: "AI Teacher",
  });
}

export async function streamAiTeacherChat(
  input: AiTeacherChatInput,
  options: {
    onStatus?: (step: string) => void;
  } = {}
) {
  const token = await getAiTeacherAccessToken();
  const baseUrls = resolveAiTeacherBaseUrls();
  let lastError: unknown = null;

  for (let index = 0; index < baseUrls.length; index += 1) {
    const baseUrl = baseUrls[index];

    try {
      const response = await fetch(`${baseUrl}/ai-teacher/chat/stream`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(input),
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error(await parseErrorMessage(response));
      }

      if (!response.body) {
        throw new Error("Streaming is not available right now.");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let finalResult: AiTeacherChatTurn | null = null;

      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        const blocks = buffer.split("\n\n");
        buffer = blocks.pop() || "";

        for (const block of blocks) {
          const parsed = parseStreamEventBlock(block);
          if (!parsed) {
            continue;
          }

          if (parsed.event === "status") {
            options.onStatus?.(String((parsed.data as { step?: string }).step || "thinking"));
            continue;
          }

          if (parsed.event === "error") {
            throw new Error(String((parsed.data as { message?: string }).message || "AI Teacher failed to respond."));
          }

          if (parsed.event === "result") {
            finalResult = parsed.data as AiTeacherChatTurn;
          }
        }
      }

      const trailing = buffer + decoder.decode();
      if (trailing.trim()) {
        const parsed = parseStreamEventBlock(trailing.trim());
        if (parsed?.event === "result") {
          finalResult = parsed.data as AiTeacherChatTurn;
        }
        if (parsed?.event === "error") {
          throw new Error(String((parsed.data as { message?: string }).message || "AI Teacher failed to respond."));
        }
      }

      if (!finalResult) {
        throw new Error("AI Teacher stream ended before a final response was returned.");
      }

      return finalResult;
    } catch (error) {
      lastError = error;
      if (!isFastApiConnectionError(error)) {
        throw error;
      }

      if (!(baseUrl.startsWith("/") && index < baseUrls.length - 1)) {
        break;
      }
    }
  }

  if (lastError && !isFastApiConnectionError(lastError)) {
    throw lastError;
  }

  throw new FastApiConnectionError(getFastApiUnavailableMessage("AI Teacher"));
}

export async function generateAiTeacher(input: AiTeacherChatInput) {
  return chatAiTeacher(input);
}

export async function listAiTeacherFolders() {
  const payload = await requestBackend<{ items: AiTeacherFolder[] }>("/ai-teacher/folders", {
    featureName: "AI Teacher",
  });
  return payload.items || [];
}

export async function createAiTeacherFolder(input: { name: string; color_theme: AiTeacherTheme }) {
  const payload = await requestBackend<{ folder: AiTeacherFolder }>("/ai-teacher/folders", {
    method: "POST",
    body: input,
    featureName: "AI Teacher",
  });
  return payload.folder;
}

export async function listAiTeacherSavedItems(folderId?: string | null) {
  const payload = await requestBackend<{ items: AiTeacherSavedItem[] }>(
    `/ai-teacher/saved-items${folderId ? `?folder_id=${encodeURIComponent(folderId)}` : ""}`,
    {
      featureName: "AI Teacher",
    }
  );
  return payload.items || [];
}

export async function saveAiTeacherItem(input: { message_id: string; folder_id?: string | null; title?: string | null }) {
  const payload = await requestBackend<{ item: AiTeacherSavedItem }>("/ai-teacher/save", {
    method: "POST",
    body: input,
    featureName: "AI Teacher",
  });
  return payload.item;
}

export async function exportAiTeacherPdf(input: { message_id: string; title?: string | null }) {
  const bytes = await requestBackendBinary("/ai-teacher/export-pdf", {
    method: "POST",
    body: input,
    featureName: "AI Teacher",
  });
  return new Blob([bytes], { type: "application/pdf" });
}
