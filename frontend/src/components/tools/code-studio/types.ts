import type { ComponentType, CSSProperties } from "react";
import type { Judge0LanguageKey } from "../../../lib/judge0";

export type PreviewMode = "html" | "css" | "web";
export type PreviewDevice = "mobile" | "tablet" | "laptop";
export type CodeStudioMode = Judge0LanguageKey | "web";
export type SingleEditorMode = Exclude<CodeStudioMode, "web">;
export type WebDraftKey = "html" | "css" | "javascript";

export interface CodeStudioStorage {
  selectedMode: CodeStudioMode;
  previewDevice?: PreviewDevice;
  stdin: string;
  drafts: Partial<Record<SingleEditorMode, string>>;
  webDrafts: Partial<Record<WebDraftKey, string>>;
}

export interface PreviewSnapshot {
  id: string;
  mode: PreviewMode;
  html: string;
  css: string;
  javascript: string;
}

export interface PreviewMessagePayload {
  source?: string;
  previewId?: string;
  kind?: "ready" | "console" | "error";
  payload?: {
    level?: string;
    message?: string;
    sourceUrl?: string;
    line?: number;
    column?: number;
  };
}

export interface PreviewDeviceOption {
  key: PreviewDevice;
  label: string;
  description: string;
  icon: ComponentType<{ className?: string }>;
}

export type PreviewViewportStyle = CSSProperties;
