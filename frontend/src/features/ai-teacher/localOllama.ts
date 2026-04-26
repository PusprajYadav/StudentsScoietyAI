import { getDocument, VerbosityLevel } from "pdfjs-dist/build/pdf.mjs";
import { ensurePdfJsRuntime } from "../../lib/pdfjsRuntime";
import type { AiTeacherMessage, AiTeacherOllamaModel, AiTeacherToolType } from "./types";

const DEFAULT_LOCAL_OLLAMA_BASE_URLS = ["http://127.0.0.1:11434", "http://localhost:11434"];
const DEFAULT_LOCAL_OLLAMA_MESSAGE = "Local Ollama is not reachable. Start Ollama and try again.";
const MAX_SOURCE_CHARS = 24000;
const SOURCE_CHUNK_SIZE = 1400;
const SOURCE_CHUNK_OVERLAP = 220;

const TOOL_INSTRUCTIONS: Record<AiTeacherToolType, string> = {
  ask_question: "Answer clearly, directly, and step by step where helpful.",
  notes: "Turn the material into premium notebook-style study notes with clear headings, key ideas, quick recall cues, and strong revision clarity.",
  summary: "Write a concise but high-clarity summary with the big picture and must-remember points.",
  quiz: "Create exactly 3 multiple-choice questions by default unless the user asks for another number, and include the correct answers with brief explanations.",
  mindmap: "Organize the answer into a mindmap-like hierarchy with main topics and branches.",
  image_solver: "Solve what is shown in the image or worksheet step by step and explain the reasoning.",
  practical_use: "Explain practical uses, real examples, and simple applications.",
};

type LocalSourceKind = "none" | "image" | "pdf" | "text";

interface LocalSourceContext {
  kind: LocalSourceKind;
  fileName: string | null;
  mimeType: string | null;
  summary: string | null;
  promptContext: string | null;
  images: string[];
}

export interface LocalOllamaGenerateResult {
  text: string;
  provider: "ollama";
  model: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  sourceFileName: string | null;
  sourceMimeType: string | null;
  sourceContextSummary: string | null;
  sourceKind: LocalSourceKind;
}

export class LocalOllamaConnectionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LocalOllamaConnectionError";
  }
}

export function isLocalOllamaConnectionError(error: unknown) {
  return error instanceof LocalOllamaConnectionError;
}

function normalizeUrl(value: string | null | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed.replace(/\/$/, "") : null;
}

function getLocalOllamaBaseUrls() {
  const envBaseUrl = normalizeUrl(import.meta.env.VITE_OLLAMA_BASE_URL as string | undefined);
  return [envBaseUrl, ...DEFAULT_LOCAL_OLLAMA_BASE_URLS].filter(
    (value, index, array): value is string => Boolean(value) && array.indexOf(value) === index
  );
}

function looksLikeConnectionFailure(error: unknown) {
  if (error instanceof LocalOllamaConnectionError) {
    return true;
  }

  if (!(error instanceof Error)) {
    return false;
  }

  const message = error.message.trim().toLowerCase();
  return (
    error instanceof TypeError ||
    message.includes("failed to fetch") ||
    message.includes("networkerror") ||
    message.includes("load failed") ||
    message.includes("network request failed")
  );
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

async function requestLocalOllama(
  path: string,
  options: {
    method?: string;
    body?: BodyInit | Record<string, unknown> | null;
  } = {}
) {
  const body =
    options.body && !(options.body instanceof FormData) && !(options.body instanceof Blob) && typeof options.body !== "string"
      ? JSON.stringify(options.body)
      : options.body ?? undefined;
  const headers =
    body && typeof body === "string"
      ? {
          "Content-Type": "application/json",
        }
      : undefined;

  let lastError: unknown = null;

  for (const baseUrl of getLocalOllamaBaseUrls()) {
    try {
      const response = await fetch(`${baseUrl}${path}`, {
        method: options.method || "GET",
        headers,
        body,
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error(await parseErrorMessage(response));
      }

      return response;
    } catch (error) {
      lastError = error;
      if (!looksLikeConnectionFailure(error)) {
        throw error;
      }
    }
  }

  if (lastError instanceof Error && !looksLikeConnectionFailure(lastError)) {
    throw lastError;
  }

  throw new LocalOllamaConnectionError(DEFAULT_LOCAL_OLLAMA_MESSAGE);
}

async function requestLocalOllamaJson<T>(
  path: string,
  options: {
    method?: string;
    body?: BodyInit | Record<string, unknown> | null;
  } = {}
) {
  const response = await requestLocalOllama(path, options);
  return (await response.json()) as T;
}

function normalizeOllamaModel(item: unknown): AiTeacherOllamaModel | null {
  if (!item || typeof item !== "object") {
    return null;
  }

  const record = item as {
    name?: string;
    digest?: string;
    size?: number;
    modified_at?: string | null;
    details?: {
      family?: string;
      parameter_size?: string;
      quantization_level?: string;
    };
  };

  return {
    name: String(record.name || ""),
    digest: String(record.digest || ""),
    size_bytes: Number(record.size || 0),
    modified_at: record.modified_at || null,
    family: String(record.details?.family || ""),
    parameter_size: String(record.details?.parameter_size || ""),
    quantization_level: String(record.details?.quantization_level || ""),
  };
}

export async function listLocalOllamaModels() {
  const payload = await requestLocalOllamaJson<{ models?: unknown[] }>("/api/tags");
  const models = Array.isArray(payload.models) ? payload.models : [];
  return models
    .map((item) => normalizeOllamaModel(item))
    .filter((item): item is AiTeacherOllamaModel => Boolean(item?.name));
}

export async function pullLocalOllamaModel(
  modelName: string,
  options: {
    onStatus?: (status: string) => void;
  } = {}
) {
  const response = await requestLocalOllama("/api/pull", {
    method: "POST",
    body: {
      model: modelName,
      stream: true,
    },
  });

  if (!response.body) {
    const payload = (await response.json().catch(() => ({}))) as { status?: string; digest?: string };
    return {
      model_name: modelName,
      status: String(payload.status || "pulled"),
      digest: String(payload.digest || ""),
    };
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let lastStatus = "pulled";
  let lastDigest = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) {
        continue;
      }
      try {
        const payload = JSON.parse(trimmed) as { status?: string; digest?: string };
        lastStatus = String(payload.status || lastStatus || "pulling");
        lastDigest = String(payload.digest || lastDigest || "");
        options.onStatus?.(lastStatus);
      } catch {
        continue;
      }
    }
  }

  if (buffer.trim()) {
    try {
      const payload = JSON.parse(buffer.trim()) as { status?: string; digest?: string };
      lastStatus = String(payload.status || lastStatus || "pulled");
      lastDigest = String(payload.digest || lastDigest || "");
      options.onStatus?.(lastStatus);
    } catch {
      // ignore trailing partial data
    }
  }

  return {
    model_name: modelName,
    status: lastStatus,
    digest: lastDigest,
  };
}

export async function deleteLocalOllamaModel(modelName: string) {
  const payload = await requestLocalOllamaJson<{ status?: string }>("/api/delete", {
    method: "DELETE",
    body: { model: modelName },
  });

  return {
    model_name: modelName,
    status: String(payload.status || "deleted"),
  };
}

export function supportsLocalOllamaVisionModel(modelName: string) {
  const normalized = modelName.trim().toLowerCase();
  return [
    "llava",
    "vision",
    "vl",
    "omni",
    "qwen2.5-vl",
    "qwen-vl",
    "bakllava",
    "moondream",
    "gemma3",
    "minicpm-v",
  ].some((token) => normalized.includes(token));
}

function estimateTokenCount(value: string) {
  const normalized = value.trim();
  return normalized ? Math.max(1, Math.ceil(normalized.length / 4)) : 0;
}

function chunkText(text: string) {
  const clean = text.replace(/\s+/g, " ").trim();
  if (!clean) {
    return [];
  }

  const chunks: string[] = [];
  let start = 0;
  while (start < clean.length) {
    const end = Math.min(clean.length, start + SOURCE_CHUNK_SIZE);
    chunks.push(clean.slice(start, end));
    if (end >= clean.length) {
      break;
    }
    start = Math.max(end - SOURCE_CHUNK_OVERLAP, start + 1);
  }
  return chunks;
}

function tokenize(text: string) {
  return [...new Set(text.toLowerCase().match(/[a-z0-9][a-z0-9_-]{2,}/g) || [])];
}

function selectRelevantChunks(query: string, text: string) {
  const chunks = chunkText(text);
  if (!chunks.length) {
    return [];
  }

  const queryTokens = tokenize(query);
  if (!queryTokens.length) {
    return chunks.slice(0, 6);
  }

  return [...chunks]
    .map((chunk, index) => {
      const lowered = chunk.toLowerCase();
      const score = queryTokens.reduce((total, token) => total + (lowered.includes(token) ? 2 : 0), 0);
      return { chunk, score, index };
    })
    .sort((left, right) => {
      if (right.score !== left.score) {
        return right.score - left.score;
      }
      return left.index - right.index;
    })
    .slice(0, 6)
    .sort((left, right) => left.index - right.index)
    .map((item) => item.chunk);
}

async function fileToBase64(file: File) {
  const buffer = await file.arrayBuffer();
  let binary = "";
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;

  for (let index = 0; index < bytes.length; index += chunkSize) {
    const slice = bytes.subarray(index, index + chunkSize);
    binary += String.fromCharCode(...slice);
  }

  return btoa(binary);
}

async function extractPdfText(file: File) {
  ensurePdfJsRuntime();
  const task = getDocument({
    data: await file.arrayBuffer(),
    verbosity: VerbosityLevel.ERRORS,
    disableWorker: true,
  });
  const pdf = await task.promise;
  const pages: string[] = [];

  try {
    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
      const page = await pdf.getPage(pageNumber);
      const content = await page.getTextContent();
      const pageText = content.items
        .map((item) => {
          if (!item || typeof item !== "object" || !("str" in item)) {
            return "";
          }
          return String(item.str || "");
        })
        .join(" ")
        .replace(/\s+/g, " ")
        .trim();

      if (pageText) {
        pages.push(`Page ${pageNumber}: ${pageText}`);
      }

      if (pages.join("\n\n").length >= MAX_SOURCE_CHARS) {
        break;
      }
    }
  } finally {
    await pdf.destroy();
  }

  return pages.join("\n\n").slice(0, MAX_SOURCE_CHARS);
}

function isPdfFile(file: File) {
  return file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
}

function isImageFile(file: File) {
  return file.type.startsWith("image/") || /\.(png|jpe?g|gif|webp)$/i.test(file.name);
}

function isTextLikeFile(file: File) {
  return (
    file.type.startsWith("text/") ||
    /\.(txt|md|markdown|json|csv|tsv|html?|xml|yaml|yml|js|ts|tsx|jsx|py|java|c|cpp|h)$/i.test(file.name)
  );
}

async function buildLocalSourceContext(file: File | null, prompt: string) {
  if (!file) {
    return {
      kind: "none",
      fileName: null,
      mimeType: null,
      summary: null,
      promptContext: null,
      images: [],
    } satisfies LocalSourceContext;
  }

  if (isImageFile(file)) {
    return {
      kind: "image",
      fileName: file.name,
      mimeType: file.type || "image/*",
      summary: "Image attached for local Ollama vision analysis.",
      promptContext: null,
      images: [await fileToBase64(file)],
    } satisfies LocalSourceContext;
  }

  const text =
    isPdfFile(file) ? await extractPdfText(file) : isTextLikeFile(file) ? (await file.text()).slice(0, MAX_SOURCE_CHARS) : "";

  const selectedChunks = selectRelevantChunks(prompt, text);
  const promptContext = selectedChunks.length
    ? selectedChunks.map((chunk, index) => `Excerpt ${index + 1}:\n${chunk}`).join("\n\n")
    : null;

  return {
    kind: isPdfFile(file) ? "pdf" : "text",
    fileName: file.name,
    mimeType: file.type || (isPdfFile(file) ? "application/pdf" : "text/plain"),
    summary: promptContext
      ? `${selectedChunks.length} source excerpt${selectedChunks.length === 1 ? "" : "s"} loaded from ${file.name}.`
      : `Attached source ${file.name} had no readable text to extract locally.`,
    promptContext,
    images: [],
  } satisfies LocalSourceContext;
}

function summarizeMessageText(message: AiTeacherMessage) {
  if (message.role === "user") {
    return message.input_text?.trim() || "";
  }
  return (
    (typeof message.content.plain_text_fallback === "string" ? message.content.plain_text_fallback : "") ||
    (typeof message.content.message === "string" ? message.content.message : "")
  ).trim();
}

function buildConversationTranscript(messages: AiTeacherMessage[]) {
  const recentMessages = messages.slice(-6);
  return recentMessages
    .map((message) => {
      const text = summarizeMessageText(message);
      if (!text) {
        return "";
      }
      return `${message.role === "assistant" ? "Assistant" : "User"}: ${text}`;
    })
    .filter(Boolean)
    .join("\n\n");
}

function buildDefaultPrompt(toolType: AiTeacherToolType, hasImage: boolean, hasSourceText: boolean) {
  if (toolType === "image_solver" && hasImage) {
    return "Read the attached image carefully and solve it step by step.";
  }
  if (hasSourceText) {
    return "Use the attached source and help me properly.";
  }
  return "Help me with this topic clearly.";
}

export async function generateWithLocalOllama(input: {
  toolType: AiTeacherToolType;
  modelName: string;
  prompt: string;
  recentMessages: AiTeacherMessage[];
  selectedFile?: File | null;
}) {
  const source = await buildLocalSourceContext(input.selectedFile || null, input.prompt);
  if (source.kind === "image" && !supportsLocalOllamaVisionModel(input.modelName)) {
    throw new Error("This local model cannot read images. Pull a vision model like llava or qwen2.5-vl.");
  }

  const userPrompt =
    input.prompt.trim() || buildDefaultPrompt(input.toolType, source.kind === "image", Boolean(source.promptContext));
  const transcript = buildConversationTranscript(input.recentMessages);

  const promptSections = [
    `Study mode: ${input.toolType}`,
    transcript ? `Recent conversation:\n${transcript}` : "",
    source.promptContext ? `Source excerpts:\n${source.promptContext}` : "",
    `Student request:\n${userPrompt}`,
  ].filter(Boolean);

  const payload = await requestLocalOllamaJson<{
    response?: string;
    prompt_eval_count?: number;
    eval_count?: number;
  }>("/api/generate", {
    method: "POST",
    body: {
      model: input.modelName,
      stream: false,
      system: [
        "You are AI Teacher inside Student Society.",
        "Use attached source excerpts when provided.",
        "Do not guess from the file name alone.",
        "If the source is missing a detail, say that clearly.",
        TOOL_INSTRUCTIONS[input.toolType],
      ].join(" "),
      prompt: promptSections.join("\n\n"),
      images: source.images.length ? source.images : undefined,
    },
  });

  const text = String(payload.response || "").trim();
  if (!text) {
    throw new Error("Local Ollama returned an empty response.");
  }

  const promptTokens = Number(payload.prompt_eval_count || estimateTokenCount(promptSections.join("\n\n")));
  const completionTokens = Number(payload.eval_count || estimateTokenCount(text));

  return {
    text,
    provider: "ollama" as const,
    model: input.modelName,
    promptTokens,
    completionTokens,
    totalTokens: promptTokens + completionTokens,
    sourceFileName: source.fileName,
    sourceMimeType: source.mimeType,
    sourceContextSummary: source.summary,
    sourceKind: source.kind,
  } satisfies LocalOllamaGenerateResult;
}
