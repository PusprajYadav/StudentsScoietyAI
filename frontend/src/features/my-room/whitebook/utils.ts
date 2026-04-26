import type {
  WhitebookExportPayload,
  WhitebookImageCrop,
  WhitebookImageLayer,
  WhitebookNotebook,
  WhitebookPage,
  WhitebookPoint,
  WhitebookShareRecord,
  WhitebookStroke,
  WhitebookTextLayer,
} from "./types";

const WHITEBOOK_VERSION = 1 as const;
const DEFAULT_NOTEBOOK_TITLE = "Untitled WhiteBook";
const DEFAULT_PAGE_NAME = "Page 1";
const PREVIEW_WIDTH = 1200;
const PREVIEW_HEIGHT = 820;
const DEFAULT_PUBLIC_WHITEBOOK_ORIGIN = "https://studentsociety.in";

export const whitebookInkPalette = [
  "#111827",
  "#2563eb",
  "#0f766e",
  "#16a34a",
  "#dc2626",
  "#ca8a04",
  "#7c3aed",
] as const;

export const whitebookStrokeSizes = [2, 4, 6, 10, 14] as const;

function clampNumber(value: unknown, fallback: number, min: number, max: number) {
  const numericValue = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(numericValue)) {
    return fallback;
  }

  return Math.min(max, Math.max(min, numericValue));
}

function normalizeString(value: unknown, fallback: string) {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function escapeSvgText(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function escapeSvgAttribute(value: string) {
  return escapeSvgText(value);
}

function uint8ArrayToBase64Url(bytes: Uint8Array) {
  let binary = "";

  for (let index = 0; index < bytes.length; index += 1) {
    binary += String.fromCharCode(bytes[index]);
  }

  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64UrlToUint8Array(value: string) {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return bytes;
}

async function gzipBytes(bytes: Uint8Array) {
  if (typeof CompressionStream === "undefined") {
    return null;
  }

  const stream = new CompressionStream("gzip");
  const writer = stream.writable.getWriter();
  await writer.write(bytes);
  await writer.close();
  const output = await new Response(stream.readable).arrayBuffer();
  return new Uint8Array(output);
}

async function gunzipBytes(bytes: Uint8Array) {
  if (typeof DecompressionStream === "undefined") {
    throw new Error("This browser cannot open compressed WhiteBook shares.");
  }

  const stream = new DecompressionStream("gzip");
  const writer = stream.writable.getWriter();
  await writer.write(bytes);
  await writer.close();
  const output = await new Response(stream.readable).arrayBuffer();
  return new Uint8Array(output);
}

export function getWhitebookBaseUrl() {
  const configuredOrigin = import.meta.env.VITE_PUBLIC_APP_URL?.trim().replace(/\/$/, "");

  if (configuredOrigin) {
    return configuredOrigin;
  }

  if (typeof window === "undefined" || !window.location?.origin) {
    return DEFAULT_PUBLIC_WHITEBOOK_ORIGIN;
  }

  const { hostname, origin } = window.location;
  const isLocalHost =
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "[::1]";

  return isLocalHost ? DEFAULT_PUBLIC_WHITEBOOK_ORIGIN : origin;
}

function normalizeImageCrop(value: unknown, naturalWidth: number, naturalHeight: number): WhitebookImageCrop {
  const record = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  const safeNaturalWidth = Math.max(1, naturalWidth);
  const safeNaturalHeight = Math.max(1, naturalHeight);
  const x = clampNumber(record.x, 0, 0, Math.max(0, safeNaturalWidth - 1));
  const y = clampNumber(record.y, 0, 0, Math.max(0, safeNaturalHeight - 1));
  const width = clampNumber(record.width, safeNaturalWidth - x, 1, safeNaturalWidth - x);
  const height = clampNumber(record.height, safeNaturalHeight - y, 1, safeNaturalHeight - y);

  return {
    x,
    y,
    width,
    height,
  };
}

function normalizePoint(value: unknown): WhitebookPoint | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const record = value as Record<string, unknown>;
  return {
    x: clampNumber(record.x, 0, -500000, 500000),
    y: clampNumber(record.y, 0, -500000, 500000),
  };
}

function normalizeStroke(value: unknown): WhitebookStroke | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const record = value as Record<string, unknown>;
  const tool = record.tool === "highlighter" ? "highlighter" : record.tool === "pen" ? "pen" : null;
  if (!tool) {
    return null;
  }

  const points = Array.isArray(record.points)
    ? record.points.map(normalizePoint).filter((point): point is WhitebookPoint => Boolean(point))
    : [];

  if (!points.length) {
    return null;
  }

  return {
    id: normalizeString(record.id, createWhitebookEntityId("wb_stroke")),
    type: "stroke",
    tool,
    color: normalizeString(record.color, tool === "highlighter" ? "#2563eb" : "#111827"),
    size: clampNumber(record.size, tool === "highlighter" ? 10 : 4, 1, 48),
    opacity: clampNumber(record.opacity, tool === "highlighter" ? 0.32 : 1, 0.12, 1),
    points,
    createdAt: normalizeString(record.createdAt, new Date().toISOString()),
  };
}

function normalizeImageLayer(value: unknown): WhitebookImageLayer | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const record = value as Record<string, unknown>;
  const src = normalizeString(record.src, "");
  if (!src) {
    return null;
  }

  const naturalWidth = clampNumber(record.naturalWidth, 1200, 1, 20000);
  const naturalHeight = clampNumber(record.naturalHeight, 900, 1, 20000);

  return {
    id: normalizeString(record.id, createWhitebookEntityId("wb_image")),
    type: "image",
    src,
    name: normalizeString(record.name, "Imported image"),
    x: clampNumber(record.x, 0, -500000, 500000),
    y: clampNumber(record.y, 0, -500000, 500000),
    width: clampNumber(record.width, Math.min(560, naturalWidth), 24, 20000),
    height: clampNumber(record.height, Math.min(420, naturalHeight), 24, 20000),
    naturalWidth,
    naturalHeight,
    crop: normalizeImageCrop(record.crop, naturalWidth, naturalHeight),
    createdAt: normalizeString(record.createdAt, new Date().toISOString()),
    updatedAt: normalizeString(record.updatedAt, new Date().toISOString()),
  };
}

function normalizeTextLayer(value: unknown): WhitebookTextLayer | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const record = value as Record<string, unknown>;
  const text = typeof record.text === "string" ? record.text.replace(/\r\n?/g, "\n").trim() : "";
  if (!text) {
    return null;
  }

  return {
    id: normalizeString(record.id, createWhitebookEntityId("wb_text")),
    type: "text",
    text,
    x: clampNumber(record.x, 0, -500000, 500000),
    y: clampNumber(record.y, 0, -500000, 500000),
    color: normalizeString(record.color, "#111827"),
    fontSize: clampNumber(record.fontSize, 22, 12, 240),
    createdAt: normalizeString(record.createdAt, new Date().toISOString()),
    updatedAt: normalizeString(record.updatedAt, new Date().toISOString()),
  };
}

function splitWhitebookTextLines(value: string) {
  return value.replace(/\r\n?/g, "\n").split("\n");
}

function estimateWhitebookTextBounds(textLayer: WhitebookTextLayer) {
  const lines = splitWhitebookTextLines(textLayer.text);
  const lineHeight = textLayer.fontSize * 1.35;
  const longestLineLength = lines.reduce((max, line) => Math.max(max, line.length), 0);

  return {
    width: Math.max(textLayer.fontSize * 0.72, longestLineLength * textLayer.fontSize * 0.62),
    height: Math.max(lineHeight, lines.length * lineHeight),
  };
}

function collectPageBounds(page: WhitebookPage | null | undefined) {
  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;

  (page?.strokes || []).forEach((stroke) => {
    stroke.points.forEach((point) => {
      minX = Math.min(minX, point.x - stroke.size);
      minY = Math.min(minY, point.y - stroke.size);
      maxX = Math.max(maxX, point.x + stroke.size);
      maxY = Math.max(maxY, point.y + stroke.size);
    });
  });

  (page?.images || []).forEach((image) => {
    minX = Math.min(minX, image.x);
    minY = Math.min(minY, image.y);
    maxX = Math.max(maxX, image.x + image.width);
    maxY = Math.max(maxY, image.y + image.height);
  });

  (page?.texts || []).forEach((textLayer) => {
    const bounds = estimateWhitebookTextBounds(textLayer);
    minX = Math.min(minX, textLayer.x);
    minY = Math.min(minY, textLayer.y);
    maxX = Math.max(maxX, textLayer.x + bounds.width);
    maxY = Math.max(maxY, textLayer.y + bounds.height);
  });

  if (!Number.isFinite(minX) || !Number.isFinite(minY) || !Number.isFinite(maxX) || !Number.isFinite(maxY)) {
    return null;
  }

  return { minX, minY, maxX, maxY };
}

function buildPreviewImageMarkup(image: WhitebookImageLayer, clipId: string) {
  const cropWidth = Math.max(1, image.crop.width);
  const cropHeight = Math.max(1, image.crop.height);
  const scaleX = image.width / cropWidth;
  const scaleY = image.height / cropHeight;
  const sourceX = image.x - image.crop.x * scaleX;
  const sourceY = image.y - image.crop.y * scaleY;

  return `
    <g>
      <clipPath id="${clipId}">
        <rect x="${image.x}" y="${image.y}" width="${image.width}" height="${image.height}" rx="16" ry="16" />
      </clipPath>
      <image
        href="${escapeSvgAttribute(image.src)}"
        x="${sourceX}"
        y="${sourceY}"
        width="${image.naturalWidth * scaleX}"
        height="${image.naturalHeight * scaleY}"
        preserveAspectRatio="none"
        clip-path="url(#${clipId})"
      />
      <rect x="${image.x}" y="${image.y}" width="${image.width}" height="${image.height}" rx="16" ry="16" fill="none" stroke="#dbe4f0" stroke-width="3" />
    </g>
  `;
}

function buildPreviewTextMarkup(textLayer: WhitebookTextLayer) {
  const lineHeight = Number((textLayer.fontSize * 1.35).toFixed(2));
  const lines = splitWhitebookTextLines(textLayer.text);
  const tspans = lines
    .map((line, index) => {
      const y = Number((textLayer.y + textLayer.fontSize + index * lineHeight).toFixed(2));
      return `<tspan x="${textLayer.x}" y="${y}">${escapeSvgText(line || " ")}</tspan>`;
    })
    .join("");

  return `
    <text
      fill="${escapeSvgAttribute(textLayer.color)}"
      font-size="${textLayer.fontSize}"
      font-weight="600"
      font-family="ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
    >
      ${tspans}
    </text>
  `;
}

export function createWhitebookEntityId(prefix: string) {
  const randomPart = Math.random().toString(36).slice(2, 10);
  return `${prefix}_${Date.now().toString(36)}_${randomPart}`;
}

export function slugifyWhitebookSeed(value: string) {
  const normalized = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);

  return normalized || "whitebook";
}

export function createWhitebookShareSlug(seed: string) {
  return `${slugifyWhitebookSeed(seed)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function createWhitebookPage(name = DEFAULT_PAGE_NAME): WhitebookPage {
  const now = new Date().toISOString();
  return {
    id: createWhitebookEntityId("wb_page"),
    name,
    images: [],
    strokes: [],
    texts: [],
    createdAt: now,
    updatedAt: now,
  };
}

export function createWhitebookNotebook(title = "My WhiteBook"): WhitebookNotebook {
  const now = new Date().toISOString();
  const firstPage = createWhitebookPage();
  return {
    id: createWhitebookEntityId("wb_book"),
    title,
    pages: [firstPage],
    activePageId: firstPage.id,
    coverSvg: buildWhitebookPreviewSvg(firstPage),
    sourceShareSlug: null,
    lastSharedShareSlug: null,
    createdAt: now,
    updatedAt: now,
    lastOpenedAt: now,
  };
}

export function cloneWhitebookNotebook(notebook: WhitebookNotebook) {
  if (typeof structuredClone === "function") {
    return structuredClone(notebook);
  }

  return JSON.parse(JSON.stringify(notebook)) as WhitebookNotebook;
}

export function buildWhitebookStrokePath(points: WhitebookPoint[]) {
  if (!points.length) {
    return "";
  }

  if (points.length === 1) {
    const point = points[0];
    return `M ${point.x} ${point.y} L ${point.x + 0.01} ${point.y + 0.01}`;
  }

  const [first, ...rest] = points;
  let path = `M ${first.x} ${first.y}`;

  for (let index = 0; index < rest.length; index += 1) {
    const current = rest[index];
    const previous = points[index];
    const midpointX = (previous.x + current.x) / 2;
    const midpointY = (previous.y + current.y) / 2;
    path += ` Q ${previous.x} ${previous.y} ${midpointX} ${midpointY}`;
  }

  const lastPoint = points[points.length - 1];
  path += ` T ${lastPoint.x} ${lastPoint.y}`;
  return path;
}

export function countWhitebookPageItems(page: WhitebookPage | null | undefined) {
  return (page?.images.length || 0) + (page?.strokes.length || 0) + (page?.texts.length || 0);
}

export function buildWhitebookPreviewSvg(page: WhitebookPage | null | undefined) {
  const bounds = collectPageBounds(page);

  if (!bounds) {
    return `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${PREVIEW_WIDTH} ${PREVIEW_HEIGHT}" fill="none">
        <rect width="${PREVIEW_WIDTH}" height="${PREVIEW_HEIGHT}" rx="44" fill="#f8fafc"/>
        <rect x="36" y="36" width="${PREVIEW_WIDTH - 72}" height="${PREVIEW_HEIGHT - 72}" rx="32" fill="#ffffff" stroke="#dbe4f0"/>
        <path d="M144 218H396" stroke="#d7e3f4" stroke-width="18" stroke-linecap="round"/>
        <path d="M144 302H616" stroke="#e2e8f0" stroke-width="16" stroke-linecap="round"/>
        <path d="M144 386H548" stroke="#e2e8f0" stroke-width="16" stroke-linecap="round"/>
        <path d="M144 470H694" stroke="#e2e8f0" stroke-width="16" stroke-linecap="round"/>
        <path d="M776 280C776 227.517 818.517 185 871 185H980V280C980 332.483 937.483 375 885 375H871C818.517 375 776 332.483 776 280Z" fill="#dbeafe"/>
        <path d="M820 420L860 462L950 356" stroke="#2563eb" stroke-width="28" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    `.trim();
  }

  const padding = 120;
  const width = Math.max(1, bounds.maxX - bounds.minX);
  const height = Math.max(1, bounds.maxY - bounds.minY);
  const scale = Math.min((PREVIEW_WIDTH - padding * 2) / width, (PREVIEW_HEIGHT - padding * 2) / height);
  const safeScale = Number.isFinite(scale) && scale > 0 ? scale : 1;
  const translateX = (PREVIEW_WIDTH - width * safeScale) / 2 - bounds.minX * safeScale;
  const translateY = (PREVIEW_HEIGHT - height * safeScale) / 2 - bounds.minY * safeScale;
  const imageMarkup = (page?.images || [])
    .map((image) => buildPreviewImageMarkup(image, `wb-preview-${image.id}`))
    .join("");
  const strokeMarkup = (page?.strokes || [])
    .map((stroke) => {
      const path = buildWhitebookStrokePath(stroke.points);
      const opacity = clampNumber(stroke.opacity, stroke.tool === "highlighter" ? 0.32 : 1, 0.12, 1);
      return `<path d="${path}" stroke="${escapeSvgAttribute(stroke.color)}" stroke-width="${stroke.size}" stroke-linecap="round" stroke-linejoin="round" fill="none" opacity="${opacity}"/>`;
    })
    .join("");
  const textMarkup = (page?.texts || []).map((textLayer) => buildPreviewTextMarkup(textLayer)).join("");

  return `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${PREVIEW_WIDTH} ${PREVIEW_HEIGHT}" fill="none">
      <rect width="${PREVIEW_WIDTH}" height="${PREVIEW_HEIGHT}" rx="44" fill="#f8fafc"/>
      <rect x="36" y="36" width="${PREVIEW_WIDTH - 72}" height="${PREVIEW_HEIGHT - 72}" rx="32" fill="#ffffff" stroke="#dbe4f0"/>
      <g opacity="0.52" stroke="#e7edf5">
        <path d="M36 166H${PREVIEW_WIDTH - 36}" />
        <path d="M36 296H${PREVIEW_WIDTH - 36}" />
        <path d="M36 426H${PREVIEW_WIDTH - 36}" />
        <path d="M36 556H${PREVIEW_WIDTH - 36}" />
        <path d="M36 686H${PREVIEW_WIDTH - 36}" />
      </g>
      <g transform="translate(${translateX} ${translateY}) scale(${safeScale})">
        ${imageMarkup}
        ${strokeMarkup}
        ${textMarkup}
      </g>
    </svg>
  `.trim();
}

export function toWhitebookPreviewDataUrl(svg: string | null | undefined) {
  if (!svg) {
    return "";
  }

  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

export function normalizeWhitebookPage(input: unknown, fallbackIndex = 0): WhitebookPage {
  const now = new Date().toISOString();

  if (!input || typeof input !== "object") {
    return createWhitebookPage(`Page ${fallbackIndex + 1}`);
  }

  const record = input as Record<string, unknown>;
  const images = Array.isArray(record.images)
    ? record.images.map(normalizeImageLayer).filter((image): image is WhitebookImageLayer => Boolean(image))
    : [];
  const strokes = Array.isArray(record.strokes)
    ? record.strokes.map(normalizeStroke).filter((stroke): stroke is WhitebookStroke => Boolean(stroke))
    : [];
  const texts = Array.isArray(record.texts)
    ? record.texts.map(normalizeTextLayer).filter((textLayer): textLayer is WhitebookTextLayer => Boolean(textLayer))
    : [];

  return {
    id: normalizeString(record.id, createWhitebookEntityId("wb_page")),
    name: normalizeString(record.name, `Page ${fallbackIndex + 1}`),
    images,
    strokes,
    texts,
    createdAt: normalizeString(record.createdAt, now),
    updatedAt: normalizeString(record.updatedAt, now),
  };
}

export function normalizeWhitebookExportPayload(input: unknown): WhitebookExportPayload {
  const now = new Date().toISOString();
  const record = input && typeof input === "object" ? (input as Record<string, unknown>) : {};
  const pages = Array.isArray(record.pages)
    ? record.pages.map((page, index) => normalizeWhitebookPage(page, index))
    : [createWhitebookPage()];
  const activePageIdCandidate = typeof record.activePageId === "string" ? record.activePageId : pages[0]?.id;
  const activePageId = pages.some((page) => page.id === activePageIdCandidate) ? activePageIdCandidate : pages[0].id;

  return {
    version: WHITEBOOK_VERSION,
    title: normalizeString(record.title, DEFAULT_NOTEBOOK_TITLE),
    pages,
    activePageId,
    coverSvg:
      typeof record.coverSvg === "string" && record.coverSvg.trim()
        ? record.coverSvg
        : buildWhitebookPreviewSvg(pages.find((page) => page.id === activePageId) || pages[0]),
    sourceShareSlug:
      typeof record.sourceShareSlug === "string" && record.sourceShareSlug.trim() ? record.sourceShareSlug : null,
    exportedAt: normalizeString(record.exportedAt, now),
  };
}

export function normalizeWhitebookNotebook(input: unknown): WhitebookNotebook {
  const record = input && typeof input === "object" ? (input as Record<string, unknown>) : {};
  const exported = normalizeWhitebookExportPayload({
    title: record.title,
    pages: record.pages,
    activePageId: record.activePageId,
    coverSvg: record.coverSvg,
    sourceShareSlug: record.sourceShareSlug,
  });
  const now = new Date().toISOString();

  return {
    id: normalizeString(record.id, createWhitebookEntityId("wb_book")),
    title: exported.title,
    pages: exported.pages,
    activePageId: exported.activePageId,
    coverSvg: exported.coverSvg,
    sourceShareSlug: exported.sourceShareSlug,
    lastSharedShareSlug:
      typeof record.lastSharedShareSlug === "string" && record.lastSharedShareSlug.trim()
        ? record.lastSharedShareSlug
        : null,
    createdAt: normalizeString(record.createdAt, now),
    updatedAt: normalizeString(record.updatedAt, now),
    lastOpenedAt: normalizeString(record.lastOpenedAt, now),
  };
}

export function buildWhitebookExportPayload(notebook: WhitebookNotebook): WhitebookExportPayload {
  const normalized = normalizeWhitebookNotebook(notebook);
  return {
    version: WHITEBOOK_VERSION,
    title: normalized.title,
    pages: normalized.pages,
    activePageId: normalized.activePageId,
    coverSvg: normalized.coverSvg,
    sourceShareSlug: normalized.sourceShareSlug,
    exportedAt: new Date().toISOString(),
  };
}

export function createImportedWhitebookNotebook(
  payload: WhitebookExportPayload,
  options?: {
    title?: string;
    sourceShareSlug?: string | null;
  }
) {
  const now = new Date().toISOString();
  const normalized = normalizeWhitebookExportPayload(payload);
  const pages = normalized.pages.map((page, index) => ({
    ...normalizeWhitebookPage(page, index),
    id: createWhitebookEntityId("wb_page"),
    images: page.images.map((image) => ({
      ...image,
      id: createWhitebookEntityId("wb_image"),
      createdAt: now,
      updatedAt: now,
    })),
    strokes: page.strokes.map((stroke) => ({
      ...stroke,
      id: createWhitebookEntityId("wb_stroke"),
    })),
    texts: page.texts.map((textLayer) => ({
      ...textLayer,
      id: createWhitebookEntityId("wb_text"),
      createdAt: now,
      updatedAt: now,
    })),
    createdAt: now,
    updatedAt: now,
  }));
  const activePageIndex = normalized.pages.findIndex((page) => page.id === normalized.activePageId);
  const activePage = pages[Math.max(0, activePageIndex)] || pages[0];
  const title = options?.title?.trim() || `${normalized.title} Copy`;

  return {
    id: createWhitebookEntityId("wb_book"),
    title,
    pages,
    activePageId: activePage.id,
    coverSvg: buildWhitebookPreviewSvg(activePage),
    sourceShareSlug: options?.sourceShareSlug ?? normalized.sourceShareSlug,
    lastSharedShareSlug: null,
    createdAt: now,
    updatedAt: now,
    lastOpenedAt: now,
  } satisfies WhitebookNotebook;
}

export function getWhitebookActivePage(notebook: WhitebookNotebook) {
  return notebook.pages.find((page) => page.id === notebook.activePageId) || notebook.pages[0] || null;
}

export function replaceWhitebookPage(notebook: WhitebookNotebook, pageId: string, nextPage: WhitebookPage) {
  const now = new Date().toISOString();
  const nextPages = notebook.pages.map((page) => (page.id === pageId ? nextPage : page));
  const activePage = nextPages.find((page) => page.id === notebook.activePageId) || nextPages[0] || nextPage;
  return {
    ...notebook,
    pages: nextPages,
    coverSvg: buildWhitebookPreviewSvg(activePage),
    updatedAt: now,
    lastOpenedAt: now,
  };
}

export function buildPublicWhitebookPath(shareSlug: string, username: string) {
  return `/app/myroom/whitebook/live/${shareSlug}/${username}`;
}

export function buildPublicWhitebookUrl(record: Pick<WhitebookShareRecord, "share_slug" | "owner">) {
  const username = record.owner?.username || "student";
  const path = buildPublicWhitebookPath(record.share_slug, username);
  return new URL(path, getWhitebookBaseUrl()).toString();
}

export async function buildEmbeddedWhitebookUrl(
  payload: WhitebookExportPayload,
  options?: {
    username?: string;
  }
) {
  const normalized = normalizeWhitebookExportPayload(payload);
  const json = JSON.stringify(normalized);
  const sourceBytes = new TextEncoder().encode(json);
  const compressedBytes = await gzipBytes(sourceBytes);
  const encoded = uint8ArrayToBase64Url(compressedBytes || sourceBytes);
  const codec = compressedBytes ? "gzip" : "raw";
  const username = options?.username?.trim() || "student";
  const url = new URL(buildPublicWhitebookPath("embedded", username), getWhitebookBaseUrl());

  url.searchParams.set("codec", codec);
  url.searchParams.set("snapshot", encoded);

  if (url.toString().length > 120000) {
    throw new Error("This WhiteBook is too large for embedded post sharing. Please use a smaller board or configure the live WhiteBook share table.");
  }

  return url.toString();
}

export async function parseEmbeddedWhitebookPayloadFromLinkUrl(linkUrl: string | null | undefined) {
  if (!linkUrl) {
    return null;
  }

  try {
    const parsed = new URL(linkUrl, getWhitebookBaseUrl());
    const encoded = parsed.searchParams.get("snapshot");
    if (!encoded) {
      return null;
    }

    const codec = parsed.searchParams.get("codec");
    const encodedBytes = base64UrlToUint8Array(encoded);
    const bytes = codec === "gzip" ? await gunzipBytes(encodedBytes) : encodedBytes;
    const json = new TextDecoder().decode(bytes);
    return normalizeWhitebookExportPayload(JSON.parse(json));
  } catch {
    return null;
  }
}

export function parseWhitebookShareSlug(linkUrl: string | null | undefined) {
  if (!linkUrl) {
    return null;
  }

  try {
    const parsed = new URL(linkUrl, getWhitebookBaseUrl());
    if (parsed.searchParams.has("snapshot")) {
      return null;
    }

    const match = parsed.pathname.match(/\/app\/myroom\/whitebook\/live\/([^/]+)/);
    return match?.[1] || null;
  } catch {
    return null;
  }
}

export function getWhitebookOwnerLabel(record: Pick<WhitebookShareRecord, "owner">) {
  return record.owner?.full_name?.trim() || record.owner?.username?.trim() || "Student";
}
