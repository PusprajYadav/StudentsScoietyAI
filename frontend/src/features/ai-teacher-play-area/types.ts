import type { AiTeacherTheme } from "../ai-teacher/types";

export type PlayAreaSectionType =
  | "paragraph"
  | "bullet_list"
  | "steps"
  | "flashcards"
  | "quiz"
  | "mindmap"
  | "graph";

export interface PlayAreaItemRow {
  id: string;
  title: string;
  text: string;
  highlightColor: string;
}

export interface PlayAreaFlashcard {
  id: string;
  front: string;
  back: string;
  highlightColor: string;
  accentColor: string;
}

export interface PlayAreaQuizQuestion {
  id: string;
  question: string;
  options: string[];
  answer: string;
  explanation: string;
  highlightColor: string;
}

export interface PlayAreaMindmapNode {
  id: string;
  label: string;
  parentId: string | null;
  highlightColor: string;
}

export interface PlayAreaSection {
  id: string;
  type: PlayAreaSectionType;
  title: string;
  kicker: string;
  text: string;
  highlightColor: string;
  items: PlayAreaItemRow[];
  cards: PlayAreaFlashcard[];
  questions: PlayAreaQuizQuestion[];
  nodes: PlayAreaMindmapNode[];
  graphUrl: string | null;
  graphCaption: string;
}

export interface PlayAreaAppearance {
  deskTone: string;
  paperTone: string;
  paperStyle: "ruled" | "plain";
  inkColor: string;
  accentColor: string;
  highlightColor: string;
  fontScale: "compact" | "comfortable" | "large";
  theme: AiTeacherTheme;
}

export interface PlayAreaDocument {
  id: string;
  sourceMessageId: string | null;
  sourceChatId: string | null;
  sourceToolType: string | null;
  title: string;
  subtitle: string;
  summary: string;
  tags: string[];
  appearance: PlayAreaAppearance;
  sections: PlayAreaSection[];
  createdAt: string;
  updatedAt: string;
}

export interface PlayAreaStorage {
  documents: PlayAreaDocument[];
  lastOpenedDocumentId: string | null;
}
