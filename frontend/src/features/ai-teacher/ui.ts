import type { CSSProperties } from "react";
import type { LucideIcon } from "lucide-react";
import {
  BookOpen,
  Brain,
  FileText,
  Image,
  Lightbulb,
  MessageSquare,
  PenLine,
} from "lucide-react";
import type {
  AiTeacherMessage,
  AiTeacherModelRoute,
  AiTeacherRoutePriority,
  AiTeacherStructuredBlock,
  AiTeacherTheme,
  AiTeacherToolType,
} from "./types";

export const handwritingStyle: CSSProperties = {
  fontFamily: '"Patrick Hand", "Kalam", cursive',
};

export type ToolOption = {
  id: AiTeacherToolType;
  label: string;
  promptLabel: string;
  placeholder: string;
  hint: string;
  icon: LucideIcon;
};

export const TOOL_OPTIONS: ToolOption[] = [
  {
    id: "ask_question",
    label: "Ask Question",
    promptLabel: "Ask Question",
    placeholder: "Ask a doubt or follow-up.",
    hint: "Great for clarifications and direct explanations.",
    icon: MessageSquare,
  },
  {
    id: "notes",
    label: "Generate Notes",
    promptLabel: "Notes",
    placeholder: "Turn this into crystal-clear notebook notes.",
    hint: "Best for classroom-ready notes and revision pages.",
    icon: PenLine,
  },
  {
    id: "summary",
    label: "Summary",
    promptLabel: "Summary",
    placeholder: "Summarize this topic or source.",
    hint: "Keeps the answer compact, clear, and exam-friendly.",
    icon: FileText,
  },
  {
    id: "quiz",
    label: "Quiz",
    promptLabel: "Quiz",
    placeholder: "Make a quiz from this topic. Default is 3 questions.",
    hint: "Instant self-test with right/wrong feedback in the chat.",
    icon: Brain,
  },
  {
    id: "mindmap",
    label: "Mindmap",
    promptLabel: "Mindmap",
    placeholder: "Build a simple mindmap.",
    hint: "Organizes topics into branches and subtopics.",
    icon: BookOpen,
  },
  {
    id: "practical_use",
    label: "Practical Use",
    promptLabel: "Practical Use",
    placeholder: "Show real-world uses.",
    hint: "Connects theory to examples, projects, and daily use.",
    icon: Lightbulb,
  },
  {
    id: "image_solver",
    label: "Image Solver",
    promptLabel: "Image Solver",
    placeholder: "Solve this image or worksheet.",
    hint: "Works with images, PDFs, and short math prompts.",
    icon: Image,
  },
];

export const PROVIDER_SUGGESTIONS = [
  "openai",
  "anthropic",
  "gemini",
  "groq",
  "deepseek",
  "cloudflare",
  "xai",
  "moonshot",
  "openrouter",
  "mistral",
] as const;

export const PRIORITY_OPTIONS: AiTeacherRoutePriority[] = ["cheap", "fast", "balanced", "best"];
export const DEFAULT_AI_TEACHER_BUSY_MESSAGE = "Server is too much busy there pls try again later.";

export const THEME_META: Record<
  AiTeacherTheme,
  {
    chip: string;
    accent: string;
    border: string;
    glow: string;
    paper: string;
    line: string;
    surface: string;
    text: string;
  }
> = {
  yellow: {
    chip: "border-amber-200 bg-amber-100 text-amber-900",
    accent: "bg-amber-500/15 text-amber-900",
    border: "border-amber-200/80",
    glow: "rgba(251,191,36,0.16)",
    paper: "rgba(255,247,194,0.76)",
    line: "rgba(148,163,184,0.22)",
    surface: "from-amber-50 via-white to-amber-100/80",
    text: "text-amber-900",
  },
  blue: {
    chip: "border-sky-200 bg-sky-100 text-sky-900",
    accent: "bg-sky-500/15 text-sky-900",
    border: "border-sky-200/80",
    glow: "rgba(56,189,248,0.16)",
    paper: "rgba(219,234,254,0.78)",
    line: "rgba(125,211,252,0.2)",
    surface: "from-sky-50 via-white to-blue-100/80",
    text: "text-sky-900",
  },
  pink: {
    chip: "border-pink-200 bg-pink-100 text-pink-900",
    accent: "bg-pink-500/15 text-pink-900",
    border: "border-pink-200/80",
    glow: "rgba(244,114,182,0.16)",
    paper: "rgba(252,231,243,0.82)",
    line: "rgba(251,113,133,0.17)",
    surface: "from-pink-50 via-white to-rose-100/80",
    text: "text-pink-900",
  },
  green: {
    chip: "border-emerald-200 bg-emerald-100 text-emerald-900",
    accent: "bg-emerald-500/15 text-emerald-900",
    border: "border-emerald-200/80",
    glow: "rgba(16,185,129,0.15)",
    paper: "rgba(220,252,231,0.82)",
    line: "rgba(74,222,128,0.18)",
    surface: "from-emerald-50 via-white to-green-100/80",
    text: "text-emerald-900",
  },
};

const FLASHCARD_PASTELS = ["#fde68a", "#bfdbfe", "#fecdd3", "#bbf7d0", "#ddd6fe", "#fbcfe8"];
export type AiTeacherQuizQuestion = NonNullable<AiTeacherStructuredBlock["questions"]>[number];
export type SpaceNoteVariant = "rocket" | "planet" | "moon";

export function getToolOption(toolType: AiTeacherToolType) {
  return TOOL_OPTIONS.find((option) => option.id === toolType) || TOOL_OPTIONS[0];
}

export function getTheme(theme?: string | null): AiTeacherTheme {
  if (theme === "blue" || theme === "pink" || theme === "green" || theme === "yellow") {
    return theme;
  }
  return "yellow";
}

export function notebookStyle(theme: AiTeacherTheme): CSSProperties {
  const meta = THEME_META[theme];
  return {
    backgroundColor: "#ffffff",
    backgroundImage: [
      "linear-gradient(180deg, rgba(255,255,255,0.98), rgba(255,255,255,0.98))",
      `repeating-linear-gradient(180deg, transparent, transparent 31px, ${meta.line} 31px, ${meta.line} 32px)`,
    ].join(", "),
    backgroundPosition: "0 0, 0 62px",
    boxShadow: `0 22px 48px -34px ${meta.glow}`,
  };
}

export function formatDateLabel(value?: string | null) {
  if (!value) {
    return "Just now";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Just now";
  }

  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

export function formatRelativeCount(count?: number) {
  if (!count) {
    return "No turns yet";
  }
  return `${count} turn${count === 1 ? "" : "s"}`;
}

export function formatFileSize(size: number) {
  if (!Number.isFinite(size) || size <= 0) {
    return "0 KB";
  }
  if (size >= 1024 * 1024) {
    return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  }
  return `${Math.max(1, Math.round(size / 1024))} KB`;
}

function hashString(input: string) {
  let hash = 0;
  for (let index = 0; index < input.length; index += 1) {
    hash = (hash << 5) - hash + input.charCodeAt(index);
    hash |= 0;
  }
  return Math.abs(hash);
}

export function getFlashcardColor(seed: string) {
  return FLASHCARD_PASTELS[hashString(seed) % FLASHCARD_PASTELS.length];
}

export function toBulletItems(items?: AiTeacherStructuredBlock["items"]) {
  return (items || []).filter((item): item is string => typeof item === "string" && item.trim().length > 0);
}

export function toStepItems(items?: AiTeacherStructuredBlock["items"]) {
  return (items || []).filter(
    (item): item is { title?: string; text?: string } =>
      Boolean(item) && typeof item === "object" && (String(item.title || "").trim() || String(item.text || "").trim())
  );
}

export function summarizeMessage(message: AiTeacherMessage) {
  if (message.role === "assistant") {
    return (
      message.content.message ||
      message.content.plain_text_fallback ||
      message.content.title ||
      "Structured answer ready."
    );
  }
  return message.input_text || message.content.plain_text_fallback || "User prompt";
}

export function getRelevantPlatformRoutes(routes: AiTeacherModelRoute[], toolType: AiTeacherToolType) {
  return [...routes]
    .filter((route) => route.tool_type === "default" || route.tool_type === toolType)
    .sort((left, right) => {
      const leftToolRank = left.tool_type === toolType ? 0 : 1;
      const rightToolRank = right.tool_type === toolType ? 0 : 1;
      if (leftToolRank !== rightToolRank) {
        return leftToolRank - rightToolRank;
      }

      return (left.sort_order ?? 100) - (right.sort_order ?? 100);
    });
}

export function formatPriorityLabel(priority: AiTeacherRoutePriority) {
  return priority.charAt(0).toUpperCase() + priority.slice(1);
}

export function formatRouteOption(route: AiTeacherModelRoute) {
  const toolText =
    route.tool_type === "default"
      ? "All tools"
      : route.tool_type === "social_reply"
        ? "Social Reply"
        : getToolOption(route.tool_type).promptLabel;
  const providerLabel = route.provider_label || route.provider_slug || route.provider;
  return `${route.label} · ${providerLabel} · ${toolText}`;
}

export function getConnectionModeLabel(mode: "platform" | "saved_key" | "paste_key" | "local_ollama") {
  if (mode === "saved_key") {
    return "Saved key";
  }
  if (mode === "paste_key") {
    return "Pasted key";
  }
  if (mode === "local_ollama") {
    return "Local Ollama";
  }
  return "Platform AI";
}

export function getPlatformChoiceLabel(choice: string, routes: AiTeacherModelRoute[]) {
  if (choice.startsWith("route:")) {
    const routeId = choice.slice("route:".length);
    return routes.find((route) => route.id === routeId)?.label || "Selected route";
  }

  const priority = (choice.split(":")[1] as AiTeacherRoutePriority | undefined) || "balanced";
  return `Auto ${formatPriorityLabel(priority)}`;
}

export function getSpaceNoteVariant(seed: string): SpaceNoteVariant {
  return (["rocket", "planet", "moon"] as const)[hashString(seed) % 3];
}

export function normalizeQuizOptionText(value?: string | null) {
  return String(value || "")
    .replace(/^\s*[A-D][).:\-]\s*/i, "")
    .trim();
}

export function resolveQuizAnswerIndex(question: AiTeacherQuizQuestion) {
  if (typeof question.answer_index === "number" && Number.isFinite(question.answer_index)) {
    const boundedIndex = Math.max(0, Math.floor(question.answer_index));
    if (boundedIndex < (question.options?.length || 0)) {
      return boundedIndex;
    }
  }

  const normalizedAnswer = normalizeQuizOptionText(question.answer);
  if (!normalizedAnswer || !question.options?.length) {
    return -1;
  }

  const optionMatchIndex = question.options.findIndex(
    (option) => normalizeQuizOptionText(option).toLowerCase() === normalizedAnswer.toLowerCase()
  );
  if (optionMatchIndex >= 0) {
    return optionMatchIndex;
  }

  if (/^[A-D]$/i.test(normalizedAnswer)) {
    const letterIndex = normalizedAnswer.toUpperCase().charCodeAt(0) - 65;
    if (letterIndex >= 0 && letterIndex < question.options.length) {
      return letterIndex;
    }
  }

  return -1;
}
