import type { CSSProperties } from "react";
import {
  PLAY_AREA_ACCENT_COLORS,
  PLAY_AREA_HIGHLIGHT_COLORS,
  createPlayAreaSection,
} from "./storage";
import type {
  PlayAreaDocument,
  PlayAreaMindmapNode,
  PlayAreaSectionType,
} from "./types";

export const handwritingStyle: CSSProperties = {
  fontFamily: '"Patrick Hand", "Kalam", cursive',
};

export const surfaceInputClassName =
  "w-full rounded-[18px] border border-slate-200/80 bg-white/85 px-3 py-2 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-slate-400";
export const chipButtonClassName =
  "inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/90 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-slate-300";

export function createEditorId(prefix: string) {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function sanitizeFileName(value: string) {
  return value
    .trim()
    .replace(/[^\w.-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "") || "ai-teacher-playarea";
}

export function formatDateLabel(value: string) {
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

export function buildPaperStyle(documentData: PlayAreaDocument, highlightColor?: string): CSSProperties {
  const lineColor = "rgba(59,130,246,0.12)";
  const marginLine = `linear-gradient(90deg, transparent 0 3.1rem, rgba(244,63,94,0.18) 3.1rem 3.17rem, transparent 3.17rem 100%)`;
  const glow = highlightColor || documentData.appearance.highlightColor;
  const layers =
    documentData.appearance.paperStyle === "plain"
      ? []
      : [`repeating-linear-gradient(180deg, transparent 0 31px, ${lineColor} 31px 32px)`];

  return {
    backgroundColor: documentData.appearance.paperTone,
    backgroundImage: [marginLine, ...layers].join(", "),
    backgroundPosition: layers.length ? "0 0, 0 8px" : "0 0",
    boxShadow: `0 26px 52px -36px ${glow}`,
    color: documentData.appearance.inkColor,
  };
}

export function buildDeskStyle(documentData: PlayAreaDocument): CSSProperties {
  return {
    backgroundImage: `${documentData.appearance.deskTone}, repeating-linear-gradient(90deg, rgba(255,255,255,0.08) 0 1px, transparent 1px 78px)`,
  };
}

export function buildMindmapDepths(nodes: PlayAreaMindmapNode[]) {
  const depthMap = new Map<string, number>();

  function resolveDepth(node: PlayAreaMindmapNode): number {
    if (depthMap.has(node.id)) {
      return depthMap.get(node.id) || 0;
    }

    const parent = nodes.find((candidate) => candidate.id === node.parentId);
    const depth = parent ? resolveDepth(parent) + 1 : 0;
    depthMap.set(node.id, depth);
    return depth;
  }

  nodes.forEach((node) => {
    resolveDepth(node);
  });

  return depthMap;
}

export function getFontScaleValue(scale: PlayAreaDocument["appearance"]["fontScale"]) {
  if (scale === "compact") {
    return 0.93;
  }
  if (scale === "large") {
    return 1.12;
  }
  return 1;
}

export function buildSectionTemplate(type: PlayAreaSectionType) {
  switch (type) {
    case "bullet_list":
      return createPlayAreaSection("bullet_list", {
        title: "Key Notes",
        kicker: "Notebook notes",
        items: [{ id: createEditorId("item"), title: "", text: "Add a note line", highlightColor: PLAY_AREA_HIGHLIGHT_COLORS[0].value }],
      });
    case "steps":
      return createPlayAreaSection("steps", {
        title: "Steps",
        kicker: "Step-by-step",
        items: [{ id: createEditorId("item"), title: "Step 1", text: "Explain the first step", highlightColor: PLAY_AREA_HIGHLIGHT_COLORS[0].value }],
      });
    case "flashcards":
      return createPlayAreaSection("flashcards", {
        title: "Flashcards",
        kicker: "Revision deck",
        cards: [{ id: createEditorId("card"), front: "Front of card", back: "Back of card", highlightColor: PLAY_AREA_HIGHLIGHT_COLORS[0].value, accentColor: PLAY_AREA_ACCENT_COLORS[0].value }],
      });
    case "quiz":
      return createPlayAreaSection("quiz", {
        title: "Quiz",
        kicker: "Practice set",
        questions: [{ id: createEditorId("quiz"), question: "Add your question", options: ["Option A", "Option B", "Option C", "Option D"], answer: "Option A", explanation: "", highlightColor: PLAY_AREA_HIGHLIGHT_COLORS[0].value }],
      });
    case "mindmap":
      return createPlayAreaSection("mindmap", {
        title: "Mindmap",
        kicker: "Concept map",
        nodes: [{ id: createEditorId("node"), label: "Main Topic", parentId: null, highlightColor: PLAY_AREA_HIGHLIGHT_COLORS[0].value }],
      });
    case "graph":
      return createPlayAreaSection("graph", {
        title: "Graph",
        kicker: "Visual",
      });
    default:
      return createPlayAreaSection("paragraph", {
        title: "Notebook Notes",
        kicker: "Editable notes",
        text: "Start typing here.",
      });
  }
}
