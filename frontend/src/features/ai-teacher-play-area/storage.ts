import type { AiTeacherMessage, AiTeacherStructuredBlock, AiTeacherTheme } from "../ai-teacher/types";
import type {
  PlayAreaDocument,
  PlayAreaFlashcard,
  PlayAreaItemRow,
  PlayAreaMindmapNode,
  PlayAreaQuizQuestion,
  PlayAreaSection,
  PlayAreaStorage,
} from "./types";

export const AI_TEACHER_PLAY_AREA_STORAGE_KEY = "student-society-ai-teacher-play-area-v1";

export const PLAY_AREA_DESK_TONES = [
  {
    label: "Oak Desk",
    value:
      "linear-gradient(90deg, rgba(187,141,95,0.95) 0%, rgba(205,164,118,0.96) 14%, rgba(182,132,85,0.95) 28%, rgba(215,179,136,0.98) 42%, rgba(191,146,100,0.96) 56%, rgba(225,191,150,0.98) 70%, rgba(188,142,96,0.96) 84%, rgba(214,172,128,0.98) 100%)",
  },
  {
    label: "Maple Desk",
    value:
      "linear-gradient(90deg, rgba(230,198,161,0.98) 0%, rgba(214,181,140,0.97) 18%, rgba(236,208,174,0.99) 36%, rgba(219,188,150,0.98) 54%, rgba(238,211,177,0.99) 72%, rgba(222,190,151,0.98) 100%)",
  },
  {
    label: "Slate Table",
    value:
      "linear-gradient(135deg, rgba(30,41,59,0.98) 0%, rgba(51,65,85,0.98) 48%, rgba(15,23,42,0.99) 100%)",
  },
] as const;

export const PLAY_AREA_PAPER_TONES = [
  { label: "Ivory", value: "#fffdf6" },
  { label: "Cream", value: "#fff8e7" },
  { label: "Mist", value: "#f8fafc" },
  { label: "Blush", value: "#fff1f2" },
] as const;

export const PLAY_AREA_PAPER_STYLES = [
  { label: "Ruled", value: "ruled" },
  { label: "Plain", value: "plain" },
] as const;

export const PLAY_AREA_INK_COLORS = [
  { label: "Charcoal", value: "#1f2937" },
  { label: "Navy", value: "#1d3557" },
  { label: "Forest", value: "#14532d" },
  { label: "Espresso", value: "#5b3924" },
] as const;

export const PLAY_AREA_ACCENT_COLORS = [
  { label: "Blue", value: "#2563eb" },
  { label: "Amber", value: "#d97706" },
  { label: "Rose", value: "#e11d48" },
  { label: "Emerald", value: "#059669" },
] as const;

export const PLAY_AREA_HIGHLIGHT_COLORS = [
  { label: "Lemon", value: "#fef08a" },
  { label: "Mint", value: "#bbf7d0" },
  { label: "Sky", value: "#bfdbfe" },
  { label: "Peach", value: "#fed7aa" },
  { label: "Pink", value: "#fbcfe8" },
] as const;

export const PLAY_AREA_FONT_SCALES = [
  { label: "Compact", value: "compact" },
  { label: "Comfort", value: "comfortable" },
  { label: "Large", value: "large" },
] as const;

function createId(prefix: string) {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function normalizeTheme(theme?: string | null): AiTeacherTheme {
  if (theme === "blue" || theme === "pink" || theme === "green" || theme === "yellow") {
    return theme;
  }
  return "blue";
}

function getDefaultAppearance(theme?: string | null) {
  const resolvedTheme = normalizeTheme(theme);
  const accentByTheme: Record<AiTeacherTheme, string> = {
    yellow: "#d97706",
    blue: "#2563eb",
    pink: "#db2777",
    green: "#059669",
  };

  const highlightByTheme: Record<AiTeacherTheme, string> = {
    yellow: "#fef08a",
    blue: "#bfdbfe",
    pink: "#fbcfe8",
    green: "#bbf7d0",
  };

  return {
    deskTone: PLAY_AREA_DESK_TONES[2].value,
    paperTone: PLAY_AREA_PAPER_TONES[0].value,
    paperStyle: "ruled",
    inkColor: PLAY_AREA_INK_COLORS[0].value,
    accentColor: accentByTheme[resolvedTheme],
    highlightColor: highlightByTheme[resolvedTheme],
    fontScale: "comfortable",
    theme: resolvedTheme,
  };
}

function normalizeStringArray(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter((item): item is string => typeof item === "string").map((item) => item.trim()).filter(Boolean);
}

function createItemRow(input?: Partial<PlayAreaItemRow>): PlayAreaItemRow {
  return {
    id: input?.id || createId("item"),
    title: input?.title || "",
    text: input?.text || "",
    highlightColor: input?.highlightColor || PLAY_AREA_HIGHLIGHT_COLORS[0].value,
  };
}

function createFlashcard(input?: Partial<PlayAreaFlashcard>): PlayAreaFlashcard {
  return {
    id: input?.id || createId("card"),
    front: input?.front || "",
    back: input?.back || "",
    highlightColor: input?.highlightColor || PLAY_AREA_HIGHLIGHT_COLORS[0].value,
    accentColor: input?.accentColor || PLAY_AREA_ACCENT_COLORS[0].value,
  };
}

function createQuizQuestion(input?: Partial<PlayAreaQuizQuestion>): PlayAreaQuizQuestion {
  return {
    id: input?.id || createId("quiz"),
    question: input?.question || "",
    options: Array.isArray(input?.options) ? input.options.map((option) => String(option || "")) : ["", "", "", ""],
    answer: input?.answer || "",
    explanation: input?.explanation || "",
    highlightColor: input?.highlightColor || PLAY_AREA_HIGHLIGHT_COLORS[0].value,
  };
}

function createMindmapNode(input?: Partial<PlayAreaMindmapNode>): PlayAreaMindmapNode {
  return {
    id: input?.id || createId("node"),
    label: input?.label || "",
    parentId: input?.parentId ?? null,
    highlightColor: input?.highlightColor || PLAY_AREA_HIGHLIGHT_COLORS[0].value,
  };
}

export function createPlayAreaSection(type: PlayAreaSection["type"], input?: Partial<PlayAreaSection>): PlayAreaSection {
  const resolvedType = input?.type || type;
  return {
    id: input?.id || createId("section"),
    type: resolvedType,
    title: input?.title || "",
    kicker: input?.kicker || "",
    text: input?.text || "",
    highlightColor: input?.highlightColor || PLAY_AREA_HIGHLIGHT_COLORS[0].value,
    items: Array.isArray(input?.items) ? input.items.map((item) => createItemRow(item)) : [],
    cards: Array.isArray(input?.cards) ? input.cards.map((card) => createFlashcard(card)) : [],
    questions: Array.isArray(input?.questions) ? input.questions.map((question) => createQuizQuestion(question)) : [],
    nodes: Array.isArray(input?.nodes) ? input.nodes.map((node) => createMindmapNode(node)) : [],
    graphUrl: input?.graphUrl || null,
    graphCaption: input?.graphCaption || "",
  };
}

function toolLabel(toolType?: string | null) {
  if (!toolType) {
    return "Study Output";
  }

  return toolType
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function sectionFromBlock(block: AiTeacherStructuredBlock, message: AiTeacherMessage): PlayAreaSection {
  if (block.type === "flashcards") {
    return createPlayAreaSection("flashcards", {
      title: block.title || "Flashcards",
      kicker: "Flashcard deck",
      cards: (block.cards || []).map((card) =>
        createFlashcard({
          front: card.front || "",
          back: card.back || "",
        })
      ),
    });
  }

  if (block.type === "steps") {
    return createPlayAreaSection("steps", {
      title: block.title || "Steps",
      kicker: "Step-by-step",
      items: (block.items || []).map((item) =>
        createItemRow(
          typeof item === "string"
            ? { text: item }
            : {
                title: item.title || "",
                text: item.text || "",
              }
        )
      ),
    });
  }

  if (block.type === "bullet_list") {
    return createPlayAreaSection("bullet_list", {
      title: block.title || "Key Notes",
      kicker: "Notebook notes",
      items: (block.items || []).map((item) =>
        createItemRow(
          typeof item === "string"
            ? { text: item }
            : {
                title: item.title || "",
                text: item.text || "",
              }
        )
      ),
    });
  }

  if (block.type === "quiz") {
    return createPlayAreaSection("quiz", {
      title: block.title || "Quiz",
      kicker: "Practice set",
      questions: (block.questions || []).map((question) =>
        createQuizQuestion({
          question: question.question || "",
          options: question.options || ["", "", "", ""],
          answer: question.answer || "",
          explanation: question.explanation || "",
        })
      ),
    });
  }

  if (block.type === "mindmap") {
    return createPlayAreaSection("mindmap", {
      title: block.title || "Mindmap",
      kicker: "Concept map",
      nodes: (block.nodes || []).map((node) =>
        createMindmapNode({
          id: node.id || createId("node"),
          label: node.label || "",
          parentId: node.parent_id ?? null,
        })
      ),
    });
  }

  if (block.type === "graph") {
    return createPlayAreaSection("graph", {
      title: block.title || "Graph",
      kicker: "Visual",
      graphUrl: block.url || null,
      graphCaption: block.caption || "",
    });
  }

  return createPlayAreaSection("paragraph", {
    title: block.title || toolLabel(message.tool_type),
    kicker: message.tool_type === "notes" || message.tool_type === "summary" ? "Notebook note" : "Answer",
    text: block.text || normalizeStringArray(block.items)[0] || "",
  });
}

export function createEmptyPlayAreaDocument() {
  const createdAt = new Date().toISOString();

  return {
    id: createId("playarea"),
    sourceMessageId: null,
    sourceChatId: null,
    sourceToolType: null,
    title: "New PlayArea Document",
    subtitle: "Editable notebook, flashcards, and study blocks",
    summary: "",
    tags: ["playarea", "draft"],
    appearance: getDefaultAppearance("yellow"),
    sections: [
      createPlayAreaSection("paragraph", {
        title: "Notebook Notes",
        kicker: "Editable notes",
        text: "Start typing your study notes here.",
      }),
      createPlayAreaSection("flashcards", {
        title: "Flashcards",
        kicker: "Revision deck",
        cards: [
          createFlashcard({
            front: "Front of card",
            back: "Back of card",
          }),
        ],
      }),
    ],
    createdAt,
    updatedAt: createdAt,
  } satisfies PlayAreaDocument;
}

export function createPlayAreaDocumentFromMessage(message: AiTeacherMessage): PlayAreaDocument {
  const createdAt = new Date().toISOString();
  const blocks = Array.isArray(message.content.blocks) ? message.content.blocks : [];
  const derivedSections =
    blocks.length > 0
      ? blocks.map((block) => sectionFromBlock(block, message))
      : [
          createPlayAreaSection("paragraph", {
            title: message.content.title || toolLabel(message.tool_type),
            kicker: "Notebook note",
            text: message.content.plain_text_fallback || message.content.message || "Structured answer ready.",
          }),
        ];

  return {
    id: createId("playarea"),
    sourceMessageId: message.id,
    sourceChatId: message.chat_id,
    sourceToolType: message.tool_type,
    title: message.content.title || `${toolLabel(message.tool_type)} Workspace`,
    subtitle: message.provider_name ? `Generated via ${message.provider_name}` : "Exported from AI Teacher",
    summary: message.content.message || message.content.plain_text_fallback || "",
    tags: [toolLabel(message.tool_type).toLowerCase(), "ai-teacher"],
    appearance: getDefaultAppearance(message.content.theme),
    sections: derivedSections,
    createdAt,
    updatedAt: createdAt,
  };
}

function normalizeSection(section: unknown): PlayAreaSection | null {
  if (!section || typeof section !== "object") {
    return null;
  }

  const candidate = section as Partial<PlayAreaSection>;
  const type = candidate.type;

  if (
    type !== "paragraph" &&
    type !== "bullet_list" &&
    type !== "steps" &&
    type !== "flashcards" &&
    type !== "quiz" &&
    type !== "mindmap" &&
    type !== "graph"
  ) {
    return null;
  }

  return createPlayAreaSection(type, {
    id: typeof candidate.id === "string" ? candidate.id : undefined,
    title: typeof candidate.title === "string" ? candidate.title : "",
    kicker: typeof candidate.kicker === "string" ? candidate.kicker : "",
    text: typeof candidate.text === "string" ? candidate.text : "",
    highlightColor: typeof candidate.highlightColor === "string" ? candidate.highlightColor : undefined,
    items: Array.isArray(candidate.items) ? candidate.items : [],
    cards: Array.isArray(candidate.cards) ? candidate.cards : [],
    questions: Array.isArray(candidate.questions) ? candidate.questions : [],
    nodes: Array.isArray(candidate.nodes) ? candidate.nodes : [],
    graphUrl: typeof candidate.graphUrl === "string" ? candidate.graphUrl : null,
    graphCaption: typeof candidate.graphCaption === "string" ? candidate.graphCaption : "",
  });
}

function normalizeDocument(document: unknown): PlayAreaDocument | null {
  if (!document || typeof document !== "object") {
    return null;
  }

  const candidate = document as Partial<PlayAreaDocument>;
  const createdAt = typeof candidate.createdAt === "string" ? candidate.createdAt : new Date().toISOString();
  const updatedAt = typeof candidate.updatedAt === "string" ? candidate.updatedAt : createdAt;
  const rawSections = Array.isArray(candidate.sections) ? candidate.sections : [];
  const sections = rawSections.map(normalizeSection).filter((section): section is PlayAreaSection => Boolean(section));

  return {
    id: typeof candidate.id === "string" ? candidate.id : createId("playarea"),
    sourceMessageId: typeof candidate.sourceMessageId === "string" ? candidate.sourceMessageId : null,
    sourceChatId: typeof candidate.sourceChatId === "string" ? candidate.sourceChatId : null,
    sourceToolType: typeof candidate.sourceToolType === "string" ? candidate.sourceToolType : null,
    title: typeof candidate.title === "string" && candidate.title.trim() ? candidate.title : "Untitled PlayArea Document",
    subtitle: typeof candidate.subtitle === "string" ? candidate.subtitle : "",
    summary: typeof candidate.summary === "string" ? candidate.summary : "",
    tags: normalizeStringArray(candidate.tags),
    appearance: {
      ...getDefaultAppearance((candidate.appearance as { theme?: string } | undefined)?.theme),
      ...(candidate.appearance || {}),
    },
    sections: sections.length ? sections : createEmptyPlayAreaDocument().sections,
    createdAt,
    updatedAt,
  };
}

export function normalizePlayAreaStorage(value: unknown): PlayAreaStorage {
  if (!value || typeof value !== "object") {
    return {
      documents: [createEmptyPlayAreaDocument()],
      lastOpenedDocumentId: null,
    };
  }

  const candidate = value as Partial<PlayAreaStorage>;
  const documents = Array.isArray(candidate.documents)
    ? candidate.documents.map(normalizeDocument).filter((document): document is PlayAreaDocument => Boolean(document))
    : [];

  return {
    documents: documents.length ? documents : [createEmptyPlayAreaDocument()],
    lastOpenedDocumentId: typeof candidate.lastOpenedDocumentId === "string" ? candidate.lastOpenedDocumentId : null,
  };
}

export function loadPlayAreaStorage(): PlayAreaStorage {
  if (typeof window === "undefined") {
    return normalizePlayAreaStorage(null);
  }

  const raw = window.localStorage.getItem(AI_TEACHER_PLAY_AREA_STORAGE_KEY);
  if (!raw) {
    return normalizePlayAreaStorage(null);
  }

  try {
    return normalizePlayAreaStorage(JSON.parse(raw));
  } catch {
    return normalizePlayAreaStorage(null);
  }
}

export function savePlayAreaStorage(storage: PlayAreaStorage) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(AI_TEACHER_PLAY_AREA_STORAGE_KEY, JSON.stringify(storage));
}

export function savePlayAreaDocument(document: PlayAreaDocument) {
  const storage = loadPlayAreaStorage();
  const nextStorage: PlayAreaStorage = {
    documents: [document, ...storage.documents.filter((item) => item.id !== document.id)],
    lastOpenedDocumentId: document.id,
  };
  savePlayAreaStorage(nextStorage);
  return nextStorage;
}

export function normalizePlayAreaDocumentSnapshot(value: unknown) {
  const normalized = normalizeDocument(value);
  if (!normalized) {
    throw new Error("This is not a valid AI Teacher PlayArea document.");
  }
  return normalized;
}

export function importPlayAreaDocumentSnapshot(value: unknown) {
  const normalized = normalizeDocument(value);
  if (!normalized) {
    throw new Error("This file is not a valid AI Teacher PlayArea document.");
  }

  const importedAt = new Date().toISOString();
  return {
    ...normalized,
    id: createId("playarea"),
    sourceMessageId: null,
    sourceChatId: null,
    title: normalized.title.endsWith("Imported") ? normalized.title : `${normalized.title} Imported`,
    tags: Array.from(new Set([...normalized.tags, "imported"])),
    createdAt: importedAt,
    updatedAt: importedAt,
  } satisfies PlayAreaDocument;
}

export function deletePlayAreaDocument(documentId: string) {
  const storage = loadPlayAreaStorage();
  const remaining = storage.documents.filter((document) => document.id !== documentId);
  const fallbackDocuments = remaining.length ? remaining : [createEmptyPlayAreaDocument()];
  const nextStorage: PlayAreaStorage = {
    documents: fallbackDocuments,
    lastOpenedDocumentId: fallbackDocuments[0]?.id || null,
  };
  savePlayAreaStorage(nextStorage);
  return nextStorage;
}

export function duplicatePlayAreaDocument(document: PlayAreaDocument) {
  const createdAt = new Date().toISOString();
  const duplicate: PlayAreaDocument = {
    ...document,
    id: createId("playarea"),
    title: `${document.title} Copy`,
    createdAt,
    updatedAt: createdAt,
  };
  return savePlayAreaDocument(duplicate);
}
