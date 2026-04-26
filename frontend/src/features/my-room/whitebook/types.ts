import type { ProfileRow } from "../../../types/database";

export type WhitebookInkTool = "pen" | "highlighter";
export type WhitebookTool = WhitebookInkTool | "text" | "eraser" | "hand" | "select";
export type WhitebookEraserMode = "drag" | "stroke";

export interface WhitebookPoint {
  x: number;
  y: number;
}

export interface WhitebookStroke {
  id: string;
  type: "stroke";
  tool: WhitebookInkTool;
  color: string;
  size: number;
  opacity: number;
  points: WhitebookPoint[];
  createdAt: string;
}

export interface WhitebookImageCrop {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface WhitebookImageLayer {
  id: string;
  type: "image";
  src: string;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  naturalWidth: number;
  naturalHeight: number;
  crop: WhitebookImageCrop;
  createdAt: string;
  updatedAt: string;
}

export interface WhitebookTextLayer {
  id: string;
  type: "text";
  text: string;
  x: number;
  y: number;
  color: string;
  fontSize: number;
  createdAt: string;
  updatedAt: string;
}

export interface WhitebookPage {
  id: string;
  name: string;
  images: WhitebookImageLayer[];
  strokes: WhitebookStroke[];
  texts: WhitebookTextLayer[];
  createdAt: string;
  updatedAt: string;
}

export interface WhitebookNotebook {
  id: string;
  title: string;
  pages: WhitebookPage[];
  activePageId: string;
  coverSvg: string | null;
  sourceShareSlug: string | null;
  lastSharedShareSlug: string | null;
  createdAt: string;
  updatedAt: string;
  lastOpenedAt: string;
}

export interface WhitebookExportPayload {
  version: 1;
  title: string;
  pages: WhitebookPage[];
  activePageId: string;
  coverSvg: string | null;
  sourceShareSlug: string | null;
  exportedAt: string;
}

export interface WhitebookViewport {
  zoom: number;
  offsetX: number;
  offsetY: number;
}

export interface StudentWhitebookRow {
  id: string;
  owner_id: string;
  title: string;
  snapshot: WhitebookExportPayload;
  preview_svg: string | null;
  share_slug: string;
  page_count: number;
  created_at: string;
  updated_at: string;
}

export interface StudentWhitebookWithOwner extends StudentWhitebookRow {
  owner: Pick<ProfileRow, "id" | "username" | "full_name" | "avatar_url"> | null;
}

export type WhitebookShareRecord = StudentWhitebookWithOwner;

export interface WhitebookSharePreview {
  id: string;
  title: string;
  previewSvg: string | null;
  shareSlug: string;
  pageCount: number;
  owner: Pick<ProfileRow, "id" | "username" | "full_name" | "avatar_url"> | null;
}

export interface WhitebookSharedPagePreview {
  id: string;
  name: string;
  itemCount: number;
  previewSvg: string | null;
}

export interface WhitebookSharedPostPreview {
  id: string;
  title: string;
  shareSlug: string;
  pageCount: number;
  activePageId: string;
  owner: Pick<ProfileRow, "id" | "username" | "full_name" | "avatar_url"> | null;
  pages: WhitebookSharedPagePreview[];
}
