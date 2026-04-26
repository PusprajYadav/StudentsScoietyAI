import type {
  StudyNoteAttachment,
  StudyNoteEntry,
  StudyNoteFolder,
  StudyNotesSharePreview,
  StudyNotesShareRecord,
  StudyNotesShareSnapshot,
  StudyNotesStorage,
  TranscriptSegment,
} from "./types";

export const STORAGE_KEY = "student-society-study-notes-v6";
export const LEGACY_STORAGE_KEYS = [
  "student-society-study-notes-v5",
  "student-society-study-notes-v4",
  "student-society-study-notes-v3",
  "student-society-study-notes-v2",
] as const;
export const DEFAULT_FOLDER_NAME = "General";
const DEFAULT_PUBLIC_STUDY_NOTES_ORIGIN = "https://studentsociety.in";

const YOUTUBE_ID_PATTERN = /^[\w-]{11}$/;
const YOUTUBE_TIME_PARAM_PATTERN = /[?#&](?:start|t)=([0-9hms]+)/i;
const YOUTUBE_END_PARAM_PATTERN = /[?#&]end=([0-9hms]+)/i;
const SHARED_ENTRY_FOLDER_ID = "shared-study-notes-folder";

export function createFolder(
  name: string,
  createdAt = new Date().toISOString(),
  updatedAt = createdAt,
  options?: {
    videoUrl?: string;
    transcriptText?: string;
    sourceShareSlug?: string | null;
    lastSharedShareSlug?: string | null;
  }
): StudyNoteFolder {
  return {
    id: crypto.randomUUID(),
    name: name.trim(),
    videoUrl: normalizeStudyVideoUrl(options?.videoUrl || ""),
    transcriptText: options?.transcriptText || "",
    sourceShareSlug: options?.sourceShareSlug || null,
    lastSharedShareSlug: options?.lastSharedShareSlug || null,
    createdAt,
    updatedAt,
  };
}

export function createDefaultStorage(): StudyNotesStorage {
  return {
    folders: [createFolder(DEFAULT_FOLDER_NAME)],
    entries: [],
  };
}

export function formatTime(seconds: number) {
  if (!Number.isFinite(seconds) || seconds <= 0) {
    return "0:00";
  }

  const whole = Math.floor(seconds);
  const minutes = Math.floor(whole / 60);
  const remainder = whole % 60;
  return `${minutes}:${String(remainder).padStart(2, "0")}`;
}

function safelyParseUrl(value: string) {
  try {
    return new URL(value);
  } catch {
    try {
      return new URL(`https://${value}`);
    } catch {
      return null;
    }
  }
}

function readTimeParam(rawUrl: string, pattern: RegExp) {
  const match = rawUrl.match(pattern);
  return match?.[1] || "";
}

function normalizeUrlHostname(hostname: string) {
  return hostname
    .toLowerCase()
    .replace(/^www\./, "")
    .replace(/^m\./, "");
}

function appendSharedVideoParams(target: URL, source: string) {
  const parsedSource = safelyParseUrl(source);
  const list = parsedSource?.searchParams.get("list") || "";
  const time = readTimeParam(source, YOUTUBE_TIME_PARAM_PATTERN);
  const end = readTimeParam(source, YOUTUBE_END_PARAM_PATTERN);

  if (list) {
    target.searchParams.set("list", list);
  }

  if (time) {
    target.searchParams.set("t", time);
  }

  if (end) {
    target.searchParams.set("end", end);
  }
}

export function extractYouTubeVideoId(value: string) {
  const trimmed = value.trim();

  if (!trimmed) {
    return null;
  }

  if (YOUTUBE_ID_PATTERN.test(trimmed)) {
    return trimmed;
  }

  const parsed = safelyParseUrl(trimmed);

  if (!parsed) {
    return null;
  }

  const hostname = normalizeUrlHostname(parsed.hostname);
  const pathSegments = parsed.pathname.split("/").filter(Boolean);

  if (hostname === "youtu.be") {
    const id = pathSegments[0] || "";
    return YOUTUBE_ID_PATTERN.test(id) ? id : null;
  }

  if (
    hostname === "youtube.com" ||
    hostname === "music.youtube.com" ||
    hostname === "youtube-nocookie.com"
  ) {
    const watchId = parsed.searchParams.get("v") || "";

    if (YOUTUBE_ID_PATTERN.test(watchId)) {
      return watchId;
    }

    const embeddedId = ["embed", "v", "shorts", "live"].includes(pathSegments[0] || "") ? pathSegments[1] || "" : "";
    return YOUTUBE_ID_PATTERN.test(embeddedId) ? embeddedId : null;
  }

  return null;
}

export function isYouTubeVideoSource(value: string) {
  return Boolean(extractYouTubeVideoId(value));
}

export function normalizeStudyVideoUrl(value: string) {
  const trimmed = value.trim();

  if (!trimmed) {
    return "";
  }

  const youtubeId = extractYouTubeVideoId(trimmed);

  if (youtubeId) {
    const normalized = new URL(`https://www.youtube-nocookie.com/watch?v=${youtubeId}`);
    appendSharedVideoParams(normalized, trimmed);
    return normalized.toString();
  }

  const parsed = safelyParseUrl(trimmed);
  return parsed?.toString() || trimmed;
}

export function buildExternalVideoUrl(value: string) {
  const trimmed = value.trim();

  if (!trimmed) {
    return "";
  }

  const youtubeId = extractYouTubeVideoId(trimmed);

  if (youtubeId) {
    const watchUrl = new URL(`https://www.youtube.com/watch?v=${youtubeId}`);
    appendSharedVideoParams(watchUrl, trimmed);
    return watchUrl.toString();
  }

  return normalizeStudyVideoUrl(trimmed);
}

export function sanitizeFileName(value: string) {
  return value.trim().replace(/[^\w.-]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "") || "study-notes";
}

export function parseTags(value: string) {
  return Array.from(
    new Set(
      value
        .split(",")
        .map((entry) => entry.trim())
        .filter(Boolean)
    )
  );
}

export function normalizeTags(value: unknown) {
  return Array.isArray(value)
    ? Array.from(new Set(value.filter((entry): entry is string => typeof entry === "string" && Boolean(entry.trim()))))
    : [];
}

export function normalizeAttachments(value: unknown): StudyNoteAttachment[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((entry) => {
      if (!entry || typeof entry !== "object") {
        return null;
      }

      const item = entry as Partial<StudyNoteAttachment>;
      return {
        id: typeof item.id === "string" && item.id ? item.id : crypto.randomUUID(),
        name: typeof item.name === "string" && item.name.trim() ? item.name : "image",
        dataUrl: typeof item.dataUrl === "string" ? item.dataUrl : "",
      } satisfies StudyNoteAttachment;
    })
    .filter((entry): entry is StudyNoteAttachment => Boolean(entry?.dataUrl));
}

export function buildEntryDisplayTitle(input: {
  title?: string;
  body?: string;
  attachments?: StudyNoteAttachment[];
  timestampSeconds?: number;
}) {
  const title = input.title?.trim();

  if (title) {
    return title;
  }

  const body = input.body?.trim() || "";

  if (body) {
    const words = body.split(/\s+/);
    const preview = words.slice(0, 8).join(" ");
    return words.length > 8 ? `${preview}...` : preview;
  }

  if (input.attachments?.length) {
    return input.attachments[0].name || `Image note ${formatTime(input.timestampSeconds || 0)}`;
  }

  return `Notes ${formatTime(input.timestampSeconds || 0)}`;
}

export function buildEntrySummary(entry: StudyNoteEntry) {
  if (entry.body.trim()) {
    const words = entry.body.trim().split(/\s+/);
    const preview = words.slice(0, 18).join(" ");
    return words.length > 18 ? `${preview}...` : preview;
  }

  if (entry.attachments.length) {
    return `${entry.attachments.length} image${entry.attachments.length === 1 ? "" : "s"}`;
  }

  return buildEntryDisplayTitle(entry);
}

function parseTimecode(value: string) {
  const clean = value.trim().replace(/^\[|\]$/g, "").replace(",", ".");

  if (!clean) {
    return null;
  }

  const parts = clean.split(":").map((part) => part.trim());

  if (parts.length < 2 || parts.length > 3) {
    return null;
  }

  const seconds = Number(parts[parts.length - 1]);
  const minutes = Number(parts[parts.length - 2]);
  const hours = parts.length === 3 ? Number(parts[0]) : 0;

  if (![seconds, minutes, hours].every((part) => Number.isFinite(part) && part >= 0)) {
    return null;
  }

  return hours * 3600 + minutes * 60 + seconds;
}

export function parseTranscriptSegments(source: string) {
  const normalized = source.replace(/\r/g, "").trim();

  if (!normalized) {
    return [] as TranscriptSegment[];
  }

  if (normalized.includes("-->")) {
    return normalized
      .split(/\n\s*\n/)
      .map((block) => {
        const lines = block
          .split("\n")
          .map((line) => line.trim())
          .filter(Boolean);
        const timingLineIndex = lines.findIndex((line) => line.includes("-->"));

        if (timingLineIndex === -1) {
          return null;
        }

        const start = parseTimecode(lines[timingLineIndex].split("-->")[0] || "");
        const text = lines.slice(timingLineIndex + 1).join(" ").trim();

        if (start === null || !text) {
          return null;
        }

        return {
          id: crypto.randomUUID(),
          startSeconds: start,
          text,
        } satisfies TranscriptSegment;
      })
      .filter((segment): segment is TranscriptSegment => Boolean(segment));
  }

  return normalized
    .split("\n")
    .map((line) => {
      const trimmed = line.trim();

      if (!trimmed) {
        return null;
      }

      const match = trimmed.match(/^\[?(\d{1,2}:\d{2}(?::\d{2})?(?:[.,]\d{1,3})?)\]?\s*(.*)$/);

      if (!match) {
        return null;
      }

      const start = parseTimecode(match[1]);
      const text = match[2]?.trim();

      if (start === null || !text) {
        return null;
      }

      return {
        id: crypto.randomUUID(),
        startSeconds: start,
        text,
      } satisfies TranscriptSegment;
    })
    .filter((segment): segment is TranscriptSegment => Boolean(segment));
}

function normalizeFolderRecord(
  entry: unknown,
  now: string,
  fallbackVideoUrl = "",
  fallbackTranscriptText = ""
): StudyNoteFolder | null {
  if (!entry || typeof entry !== "object") {
    return null;
  }

  const item = entry as Partial<StudyNoteFolder>;

  if (typeof item.name !== "string" || !item.name.trim()) {
    return null;
  }

  return {
    id: typeof item.id === "string" && item.id ? item.id : crypto.randomUUID(),
    name: item.name.trim(),
    videoUrl: normalizeStudyVideoUrl(typeof item.videoUrl === "string" ? item.videoUrl : fallbackVideoUrl),
    transcriptText: typeof item.transcriptText === "string" ? item.transcriptText : fallbackTranscriptText,
    sourceShareSlug: typeof item.sourceShareSlug === "string" && item.sourceShareSlug.trim() ? item.sourceShareSlug : null,
    lastSharedShareSlug:
      typeof item.lastSharedShareSlug === "string" && item.lastSharedShareSlug.trim() ? item.lastSharedShareSlug : null,
    createdAt: typeof item.createdAt === "string" ? item.createdAt : now,
    updatedAt: typeof item.updatedAt === "string" ? item.updatedAt : now,
  } satisfies StudyNoteFolder;
}

function normalizeDirectEntries(
  source: unknown[],
  folderIds: Set<string>,
  defaultFolderId: string,
  now: string
) {
  return source
    .map((entry) => {
      if (!entry || typeof entry !== "object") {
        return null;
      }

      const item = entry as Partial<StudyNoteEntry>;
      const title = typeof item.title === "string" ? item.title : "";
      const body = typeof item.body === "string" ? item.body : "";
      const attachments = normalizeAttachments(item.attachments);

      if (!title.trim() && !body.trim() && !attachments.length) {
        return null;
      }

      return {
        id: typeof item.id === "string" && item.id ? item.id : crypto.randomUUID(),
        folderId:
          typeof item.folderId === "string" && folderIds.has(item.folderId) ? item.folderId : defaultFolderId,
        title,
        body,
        tags: normalizeTags(item.tags),
        timestampSeconds:
          typeof item.timestampSeconds === "number" && Number.isFinite(item.timestampSeconds) ? item.timestampSeconds : 0,
        attachments,
        createdAt: typeof item.createdAt === "string" ? item.createdAt : now,
        updatedAt: typeof item.updatedAt === "string" ? item.updatedAt : now,
      } satisfies StudyNoteEntry;
    })
    .filter((entry): entry is StudyNoteEntry => Boolean(entry));
}

export function normalizeStudyNotesStorage(value: string | null): StudyNotesStorage | null {
  if (!value) {
    return null;
  }

  try {
    const parsed = JSON.parse(value) as {
      videoUrl?: unknown;
      transcriptText?: unknown;
      folders?: unknown;
      files?: unknown;
      entries?: unknown;
      notes?: unknown;
    };
    const now = new Date().toISOString();
    const legacyVideoUrl = typeof parsed.videoUrl === "string" ? normalizeStudyVideoUrl(parsed.videoUrl) : "";
    const legacyTranscriptText = typeof parsed.transcriptText === "string" ? parsed.transcriptText : "";
    const fallbackFolder = createFolder(DEFAULT_FOLDER_NAME, now, now, {
      videoUrl: legacyVideoUrl,
      transcriptText: legacyTranscriptText,
    });
    const folders = Array.isArray(parsed.folders)
      ? parsed.folders
          .map((entry) => normalizeFolderRecord(entry, now, legacyVideoUrl, legacyTranscriptText))
          .filter((entry): entry is StudyNoteFolder => Boolean(entry))
      : [];

    const resolvedFolders = folders.length ? folders : [fallbackFolder];
    const folderIds = new Set(resolvedFolders.map((folder) => folder.id));
    const defaultFolderId = resolvedFolders[0].id;
    const directEntrySource = Array.isArray(parsed.entries) ? parsed.entries : null;

    if (Array.isArray(parsed.files) && directEntrySource) {
      const fileMap = new Map<
        string,
        {
          folderId: string;
          name: string;
          tags: string[];
        }
      >();

      parsed.files.forEach((entry) => {
        if (!entry || typeof entry !== "object") {
          return;
        }

        const item = entry as {
          id?: unknown;
          folderId?: unknown;
          name?: unknown;
          tags?: unknown;
        };

        if (typeof item.id !== "string" || typeof item.name !== "string" || !item.name.trim()) {
          return;
        }

        fileMap.set(item.id, {
          folderId: typeof item.folderId === "string" && folderIds.has(item.folderId) ? item.folderId : defaultFolderId,
          name: item.name.trim(),
          tags: normalizeTags(item.tags),
        });
      });

      const entries = directEntrySource
        .map((entry) => {
          if (!entry || typeof entry !== "object") {
            return null;
          }

          const item = entry as {
            id?: unknown;
            fileId?: unknown;
            body?: unknown;
            timestampSeconds?: unknown;
            attachments?: unknown;
            createdAt?: unknown;
            updatedAt?: unknown;
          };
          const file = typeof item.fileId === "string" ? fileMap.get(item.fileId) : null;
          const body = typeof item.body === "string" ? item.body : "";
          const attachments = normalizeAttachments(item.attachments);

          if (!file || (!body.trim() && !attachments.length)) {
            return null;
          }

          return {
            id: typeof item.id === "string" && item.id ? item.id : crypto.randomUUID(),
            folderId: file.folderId,
            title: file.name,
            body,
            tags: file.tags,
            timestampSeconds:
              typeof item.timestampSeconds === "number" && Number.isFinite(item.timestampSeconds) ? item.timestampSeconds : 0,
            attachments,
            createdAt: typeof item.createdAt === "string" ? item.createdAt : now,
            updatedAt: typeof item.updatedAt === "string" ? item.updatedAt : now,
          } satisfies StudyNoteEntry;
        })
        .filter((entry): entry is StudyNoteEntry => Boolean(entry));

      return {
        folders: resolvedFolders,
        entries,
      };
    }

    if (directEntrySource) {
      return {
        folders: resolvedFolders,
        entries: normalizeDirectEntries(directEntrySource, folderIds, defaultFolderId, now),
      };
    }

    if (Array.isArray(parsed.notes)) {
      return {
        folders: resolvedFolders,
        entries: normalizeDirectEntries(parsed.notes, folderIds, defaultFolderId, now),
      };
    }

    return null;
  } catch {
    return null;
  }
}

export function loadStudyNotesStorage() {
  if (typeof window === "undefined") {
    return createDefaultStorage();
  }

  return (
    normalizeStudyNotesStorage(window.localStorage.getItem(STORAGE_KEY)) ||
    LEGACY_STORAGE_KEYS.map((key) => normalizeStudyNotesStorage(window.localStorage.getItem(key))).find(Boolean) ||
    createDefaultStorage()
  );
}

export function saveStudyNotesStorage(storage: StudyNotesStorage) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      folders: storage.folders,
      entries: storage.entries,
    })
  );
}

export function slugifyStudyNotesSeed(value: string) {
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  return normalized || "study-notes";
}

export function createStudyNotesShareSlug(seed: string) {
  return `${slugifyStudyNotesSeed(seed)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function buildStudyNotesShareSnapshot(input: {
  folder: StudyNoteFolder;
  entries: StudyNoteEntry[];
}): StudyNotesShareSnapshot {
  const entries = input.entries
    .filter((entry) => entry.folderId === input.folder.id)
    .sort((left, right) => left.timestampSeconds - right.timestampSeconds)
    .map((entry) => ({
      ...entry,
      folderId: SHARED_ENTRY_FOLDER_ID,
      attachments: entry.attachments.map((attachment) => ({
        ...attachment,
      })),
    }));

  return {
    version: 1,
    folder: {
      name: input.folder.name,
      videoUrl: normalizeStudyVideoUrl(input.folder.videoUrl),
      transcriptText: input.folder.transcriptText,
      createdAt: input.folder.createdAt,
      updatedAt: input.folder.updatedAt,
    },
    entries,
    exportedAt: new Date().toISOString(),
  };
}

export function normalizeStudyNotesShareSnapshot(input: unknown): StudyNotesShareSnapshot {
  const now = new Date().toISOString();

  if (!input || typeof input !== "object") {
    return {
      version: 1,
      folder: {
        name: DEFAULT_FOLDER_NAME,
        videoUrl: "",
        transcriptText: "",
        createdAt: now,
        updatedAt: now,
      },
      entries: [],
      exportedAt: now,
    };
  }

  const record = input as {
    version?: unknown;
    folder?: unknown;
    entries?: unknown;
    exportedAt?: unknown;
  };
  const folderRecord = record.folder && typeof record.folder === "object" ? (record.folder as Record<string, unknown>) : {};
  const entries = Array.isArray(record.entries)
    ? normalizeDirectEntries(record.entries, new Set([SHARED_ENTRY_FOLDER_ID]), SHARED_ENTRY_FOLDER_ID, now).map((entry) => ({
        ...entry,
        folderId: SHARED_ENTRY_FOLDER_ID,
      }))
    : [];

  return {
    version: 1,
    folder: {
      name: typeof folderRecord.name === "string" && folderRecord.name.trim() ? folderRecord.name.trim() : DEFAULT_FOLDER_NAME,
      videoUrl: normalizeStudyVideoUrl(typeof folderRecord.videoUrl === "string" ? folderRecord.videoUrl : ""),
      transcriptText: typeof folderRecord.transcriptText === "string" ? folderRecord.transcriptText : "",
      createdAt: typeof folderRecord.createdAt === "string" ? folderRecord.createdAt : now,
      updatedAt: typeof folderRecord.updatedAt === "string" ? folderRecord.updatedAt : now,
    },
    entries,
    exportedAt: typeof record.exportedAt === "string" ? record.exportedAt : now,
  };
}

function truncatePreviewText(value: string | null) {
  if (!value) {
    return null;
  }

  const trimmed = value.trim();

  if (!trimmed) {
    return null;
  }

  return trimmed.length > 220 ? `${trimmed.slice(0, 217)}...` : trimmed;
}

export function buildStudyNotesSharePreviewFields(snapshotInput: unknown) {
  const snapshot = normalizeStudyNotesShareSnapshot(snapshotInput);
  const entries = [...snapshot.entries].sort((left, right) => left.timestampSeconds - right.timestampSeconds);
  const attachmentCount = entries.reduce((total, entry) => total + entry.attachments.length, 0);
  const latestTimestampSeconds = entries.reduce((latest, entry) => Math.max(latest, entry.timestampSeconds), 0);
  const previewText =
    truncatePreviewText(
      entries.find((entry) => entry.body.trim())?.body ||
        entries.find((entry) => entry.title.trim())?.title ||
        entries[0]?.attachments[0]?.name ||
        null
    ) || null;
  const previewImageDataUrl =
    entries
      .flatMap((entry) => entry.attachments)
      .find((attachment) => typeof attachment.dataUrl === "string" && Boolean(attachment.dataUrl.trim()))
      ?.dataUrl || null;

  return {
    folderName: snapshot.folder.name,
    videoUrl: snapshot.folder.videoUrl,
    entryCount: entries.length,
    attachmentCount,
    latestTimestampSeconds,
    previewText,
    previewImageDataUrl,
  };
}

function cloneImportedAttachment(attachment: StudyNoteAttachment): StudyNoteAttachment {
  return {
    ...attachment,
    id: crypto.randomUUID(),
  };
}

export function makeUniqueStudyNotesFolderName(name: string, folders: StudyNoteFolder[]) {
  const baseName = name.trim() || DEFAULT_FOLDER_NAME;
  const lowerCaseNames = new Set(folders.map((folder) => folder.name.trim().toLowerCase()));

  if (!lowerCaseNames.has(baseName.toLowerCase())) {
    return baseName;
  }

  const copyBase = `${baseName} Copy`;

  if (!lowerCaseNames.has(copyBase.toLowerCase())) {
    return copyBase;
  }

  let index = 2;

  while (lowerCaseNames.has(`${copyBase} ${index}`.toLowerCase())) {
    index += 1;
  }

  return `${copyBase} ${index}`;
}

export function importStudyNotesSnapshotToLocal(input: {
  snapshot: unknown;
  sourceShareSlug?: string | null;
}) {
  const storage = loadStudyNotesStorage();
  const snapshot = normalizeStudyNotesShareSnapshot(input.snapshot);
  const folder = createFolder(
    makeUniqueStudyNotesFolderName(snapshot.folder.name, storage.folders),
    snapshot.folder.createdAt,
    snapshot.folder.updatedAt,
    {
      videoUrl: snapshot.folder.videoUrl,
      transcriptText: snapshot.folder.transcriptText,
      sourceShareSlug: input.sourceShareSlug || null,
      lastSharedShareSlug: null,
    }
  );
  const entries = snapshot.entries.map((entry) => ({
    ...entry,
    id: crypto.randomUUID(),
    folderId: folder.id,
    attachments: entry.attachments.map(cloneImportedAttachment),
  }));

  const nextStorage = {
    folders: [...storage.folders, folder],
    entries: [...storage.entries, ...entries],
  } satisfies StudyNotesStorage;

  saveStudyNotesStorage(nextStorage);

  return {
    storage: nextStorage,
    folder,
    entries,
  };
}

export function getStudyNotesBaseUrl() {
  const configuredOrigin = import.meta.env.VITE_PUBLIC_APP_URL?.trim().replace(/\/$/, "");

  if (configuredOrigin) {
    return configuredOrigin;
  }

  if (typeof window === "undefined" || !window.location?.origin) {
    return DEFAULT_PUBLIC_STUDY_NOTES_ORIGIN;
  }

  const { hostname, origin } = window.location;
  const isLocalHost =
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "0.0.0.0" ||
    hostname === "[::1]";

  return isLocalHost ? DEFAULT_PUBLIC_STUDY_NOTES_ORIGIN : origin;
}

export function buildPublicStudyNotesPath(shareSlug: string, username: string) {
  return `/app/myroom/video-notes-maker/shared/${shareSlug}/${username}`;
}

export function buildPublicStudyNotesUrl(record: Pick<StudyNotesShareRecord, "share_slug" | "owner">) {
  const username = record.owner?.username || "student";
  const path = buildPublicStudyNotesPath(record.share_slug, username);
  return new URL(path, getStudyNotesBaseUrl()).toString();
}

export function parseStudyNotesShareSlug(linkUrl: string | null | undefined) {
  if (!linkUrl) {
    return null;
  }

  try {
    const parsed = new URL(linkUrl, getStudyNotesBaseUrl());
    const match = parsed.pathname.match(
      /\/app\/(?:myroom\/video-notes-maker|tools\/study-notes)\/shared\/([^/]+)/
    );
    return match?.[1] || null;
  } catch {
    return null;
  }
}

function normalizeOwnerPreview(value: unknown): StudyNotesSharePreview["owner"] {
  return value && typeof value === "object" ? (value as StudyNotesSharePreview["owner"]) : null;
}

export function normalizeStudyNotesSharePreview(row: Record<string, unknown>): StudyNotesSharePreview {
  return {
    id: typeof row.id === "string" ? row.id : "",
    title: typeof row.title === "string" && row.title.trim() ? row.title.trim() : "Shared Video Notes Maker",
    folderName: typeof row.folder_name === "string" && row.folder_name.trim() ? row.folder_name.trim() : DEFAULT_FOLDER_NAME,
    shareSlug: typeof row.share_slug === "string" ? row.share_slug : "",
    previewText: truncatePreviewText(typeof row.preview_text === "string" ? row.preview_text : null),
    previewImageDataUrl:
      typeof row.preview_image_data_url === "string" && row.preview_image_data_url.trim()
        ? row.preview_image_data_url
        : null,
    entryCount: Number(row.entry_count) > 0 ? Number(row.entry_count) : 0,
    attachmentCount: Number(row.attachment_count) > 0 ? Number(row.attachment_count) : 0,
    latestTimestampSeconds:
      Number(row.latest_timestamp_seconds) > 0 ? Number(row.latest_timestamp_seconds) : 0,
    videoUrl: typeof row.video_url === "string" ? normalizeStudyVideoUrl(row.video_url) : "",
    owner: normalizeOwnerPreview(row.owner),
  };
}

export function normalizeStudyNotesShareRecord(row: Record<string, unknown>): StudyNotesShareRecord {
  const preview = normalizeStudyNotesSharePreview(row);

  return {
    id: preview.id,
    owner_id: typeof row.owner_id === "string" ? row.owner_id : "",
    title: preview.title,
    folder_name: preview.folderName,
    snapshot: normalizeStudyNotesShareSnapshot(row.snapshot),
    preview_text: preview.previewText,
    preview_image_data_url: preview.previewImageDataUrl,
    share_slug: preview.shareSlug,
    entry_count: preview.entryCount,
    attachment_count: preview.attachmentCount,
    latest_timestamp_seconds: preview.latestTimestampSeconds,
    video_url: preview.videoUrl,
    created_at: typeof row.created_at === "string" ? row.created_at : new Date().toISOString(),
    updated_at: typeof row.updated_at === "string" ? row.updated_at : new Date().toISOString(),
    owner: preview.owner,
  };
}
