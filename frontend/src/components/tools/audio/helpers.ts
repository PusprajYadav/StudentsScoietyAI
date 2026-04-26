import type { AudioOutputFormat, AudioSourceMode } from "../../../lib/browserAudioTools";
import type { AudioWorkspaceFile, WorkspaceMediaKind } from "./types";

function inferMediaKind(file: File): WorkspaceMediaKind {
  if (file.type.startsWith("video/")) {
    return "video";
  }

  return "audio";
}

function loadMediaDuration(url: string, kind: WorkspaceMediaKind) {
  return new Promise<number | null>((resolve) => {
    const element = document.createElement(kind === "video" ? "video" : "audio");

    const cleanup = () => {
      if ("pause" in element && typeof element.pause === "function") {
        element.pause();
      }
      element.onloadedmetadata = null;
      element.onerror = null;
      element.src = "";
      element.removeAttribute("src");
    };

    element.preload = "metadata";
    element.onloadedmetadata = () => {
      const duration = Number.isFinite(element.duration) ? element.duration : null;
      cleanup();
      resolve(duration);
    };
    element.onerror = () => {
      cleanup();
      resolve(null);
    };
    element.src = url;
  });
}

export async function createAudioWorkspaceFile(file: File): Promise<AudioWorkspaceFile> {
  const objectUrl = URL.createObjectURL(file);
  const kind = inferMediaKind(file);
  const durationSeconds = await loadMediaDuration(objectUrl, kind);

  return {
    id: `${file.name}-${file.size}-${file.lastModified}-${Math.random().toString(36).slice(2, 8)}`,
    file,
    kind,
    objectUrl,
    durationSeconds,
  };
}

export function createAudioWorkspaceFileFromBlob(
  blob: Blob,
  fileName: string,
  mimeType: string,
  durationSeconds: number | null
): AudioWorkspaceFile {
  const file = new File([blob], fileName, {
    type: mimeType,
    lastModified: Date.now(),
  });

  return {
    id: `${file.name}-${file.size}-${file.lastModified}-${Math.random().toString(36).slice(2, 8)}`,
    file,
    kind: "audio",
    objectUrl: URL.createObjectURL(blob),
    durationSeconds,
  };
}

export function revokeWorkspaceFile(item: AudioWorkspaceFile | null | undefined) {
  if (!item) {
    return;
  }

  URL.revokeObjectURL(item.objectUrl);
}

export function reorderItems<T>(items: readonly T[], startIndex: number, endIndex: number) {
  const next = [...items];
  const [moved] = next.splice(startIndex, 1);
  next.splice(endIndex, 0, moved);
  return next;
}

export function formatBytes(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) {
    return "0 B";
  }

  const units = ["B", "KB", "MB", "GB"];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / 1024 ** index;
  return `${value.toFixed(value >= 10 || index === 0 ? 0 : 1)} ${units[index]}`;
}

export function formatDuration(seconds: number | null | undefined) {
  if (!Number.isFinite(seconds) || seconds === null || seconds === undefined) {
    return "Unknown";
  }

  const safe = Math.max(0, Math.round(seconds));
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const secs = safe % 60;

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  }

  return `${minutes}:${String(secs).padStart(2, "0")}`;
}

export function sanitizeOutputName(value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    return "audio-export";
  }

  return trimmed
    .replace(/\.[A-Za-z0-9]+$/, "")
    .replace(/[^A-Za-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

export function getSuggestedOutputName(
  mode: AudioSourceMode,
  singleFile: AudioWorkspaceFile | null,
  videoFile: AudioWorkspaceFile | null,
  mergeFiles: AudioWorkspaceFile[],
  format: AudioOutputFormat
) {
  const extensionSuffix = format === "aac" ? "m4a" : format;

  if (mode === "single" && singleFile) {
    return `${sanitizeOutputName(singleFile.file.name) || "edited-audio"}-edited.${extensionSuffix}`;
  }

  if (mode === "video" && videoFile) {
    return `${sanitizeOutputName(videoFile.file.name) || "video-audio"}-audio.${extensionSuffix}`;
  }

  if (mode === "merge" && mergeFiles.length > 0) {
    return `merged-audio.${extensionSuffix}`;
  }

  return `audio-export.${extensionSuffix}`;
}

export function getTotalSourceBytes(
  mode: AudioSourceMode,
  singleFile: AudioWorkspaceFile | null,
  videoFile: AudioWorkspaceFile | null,
  mergeFiles: AudioWorkspaceFile[]
) {
  if (mode === "single") {
    return singleFile?.file.size ?? 0;
  }

  if (mode === "video") {
    return videoFile?.file.size ?? 0;
  }

  return mergeFiles.reduce((total, item) => total + item.file.size, 0);
}

export function getSourceDuration(
  mode: AudioSourceMode,
  singleFile: AudioWorkspaceFile | null,
  videoFile: AudioWorkspaceFile | null,
  mergeFiles: AudioWorkspaceFile[]
) {
  if (mode === "single") {
    return singleFile?.durationSeconds ?? null;
  }

  if (mode === "video") {
    return videoFile?.durationSeconds ?? null;
  }

  if (mergeFiles.length === 0) {
    return null;
  }

  const durations = mergeFiles.map((item) => item.durationSeconds).filter((value): value is number => value !== null);
  if (durations.length !== mergeFiles.length) {
    return null;
  }

  return durations.reduce((total, value) => total + value, 0);
}

export function clampTrimRange(start: number, end: number | null, durationSeconds: number | null) {
  const safeStart = Math.max(0, start);
  const safeEnd = end === null ? durationSeconds : Math.max(0, end);

  if (safeEnd !== null && safeEnd <= safeStart) {
    return {
      start: safeStart,
      end: safeStart + 0.1,
    };
  }

  return {
    start: safeStart,
    end: safeEnd,
  };
}

export function getLargeFileWarning(totalBytes: number) {
  if (totalBytes >= 140 * 1024 * 1024) {
    return "Large files can hit browser memory limits, especially on mobile devices. If processing feels slow, try shorter clips first.";
  }

  if (totalBytes >= 60 * 1024 * 1024) {
    return "This is a medium-to-large file for in-browser processing. Expect longer waveform decode and export times.";
  }

  return null;
}
