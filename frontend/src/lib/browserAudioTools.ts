import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile } from "@ffmpeg/util";
import coreURL from "@ffmpeg/core?url";
import wasmURL from "@ffmpeg/core/wasm?url";
import classWorkerURL from "@ffmpeg/ffmpeg/worker?url";

export type AudioSourceMode = "single" | "merge" | "video";
export type AudioOutputFormat = "mp3" | "wav" | "aac" | "ogg";

export interface AudioTrimSettings {
  enabled: boolean;
  start: number;
  end: number | null;
}

export interface AudioEffectSettings {
  volumePercent: number;
  normalize: boolean;
  speed: number;
  removeSilence: boolean;
  silenceThresholdDb: number;
  silenceDuration: number;
  fadeInSeconds: number;
  fadeOutSeconds: number;
}

export interface AudioOutputSettings {
  format: AudioOutputFormat;
  fileName: string;
}

export interface AudioProcessingRequest {
  sourceMode: AudioSourceMode;
  files: File[];
  trim: AudioTrimSettings;
  effects: AudioEffectSettings;
  output: AudioOutputSettings;
  onStatus?: (message: string) => void;
  onProgress?: (progressPercent: number) => void;
}

export interface BrowserProcessedAudioFile {
  blob: Blob;
  name: string;
  mimeType: string;
  size: number;
}

export class AudioToolError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AudioToolError";
  }
}

export const AUDIO_OUTPUT_PRESETS: Record<
  AudioOutputFormat,
  { label: string; extension: string; mimeType: string }
> = {
  mp3: {
    label: "MP3",
    extension: "mp3",
    mimeType: "audio/mpeg",
  },
  wav: {
    label: "WAV",
    extension: "wav",
    mimeType: "audio/wav",
  },
  aac: {
    label: "AAC (M4A)",
    extension: "m4a",
    mimeType: "audio/mp4",
  },
  ogg: {
    label: "OGG",
    extension: "ogg",
    mimeType: "audio/ogg",
  },
};

let ffmpegPromise: Promise<FFmpeg> | null = null;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function formatSeconds(value: number) {
  const safe = Number.isFinite(value) ? Math.max(0, value) : 0;
  const fixed = safe.toFixed(3);
  return fixed.replace(/\.?0+$/, "");
}

function sanitizeFileBaseName(value: string, fallback = "audio-export") {
  const trimmed = value.trim();
  const withoutExtension = trimmed.replace(/\.[A-Za-z0-9]+$/, "");
  const sanitized = withoutExtension
    .replace(/[^A-Za-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");

  return sanitized || fallback;
}

function sanitizeFsName(fileName: string, fallback: string) {
  const normalized = fileName
    .replace(/[^A-Za-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");

  return normalized || fallback;
}

function inferSourceExtension(file: File) {
  const trimmed = file.name.trim();
  const dotIndex = trimmed.lastIndexOf(".");
  if (dotIndex > -1 && dotIndex < trimmed.length - 1) {
    return trimmed.slice(dotIndex + 1).toLowerCase();
  }

  const mime = file.type.toLowerCase();
  if (mime.includes("mpeg")) return "mp3";
  if (mime.includes("wav")) return "wav";
  if (mime.includes("ogg")) return "ogg";
  if (mime.includes("aac")) return "aac";
  if (mime.includes("mp4")) return "mp4";
  if (mime.includes("webm")) return "webm";
  return "bin";
}

function buildAudioFilterChain(trim: AudioTrimSettings, effects: AudioEffectSettings) {
  const filters: string[] = [];
  const normalizedStart = Math.max(0, trim.start);
  const normalizedEnd = trim.end !== null && Number.isFinite(trim.end) ? Math.max(0, trim.end) : null;

  if (trim.enabled) {
    const trimParts: string[] = [];

    if (normalizedStart > 0) {
      trimParts.push(`start=${formatSeconds(normalizedStart)}`);
    }

    if (normalizedEnd !== null && normalizedEnd > normalizedStart) {
      trimParts.push(`end=${formatSeconds(normalizedEnd)}`);
    }

    if (trimParts.length > 0) {
      filters.push(`atrim=${trimParts.join(":")}`);
      filters.push("asetpts=PTS-STARTPTS");
    }
  }

  const speed = clamp(effects.speed, 0.5, 2);
  if (Math.abs(speed - 1) > 0.001) {
    filters.push(`atempo=${speed.toFixed(3)}`);
  }

  if (effects.removeSilence) {
    const threshold = clamp(effects.silenceThresholdDb, -65, -10);
    const duration = clamp(effects.silenceDuration, 0.05, 2);
    filters.push(
      `silenceremove=start_periods=1:start_duration=${formatSeconds(duration)}:start_threshold=${threshold}dB:stop_periods=-1:stop_duration=${formatSeconds(duration)}:stop_threshold=${threshold}dB`
    );
  }

  if (effects.normalize) {
    filters.push("dynaudnorm=f=200:g=15:p=0.92:m=10");
  }

  const volumeMultiplier = clamp(effects.volumePercent, 0, 250) / 100;
  if (Math.abs(volumeMultiplier - 1) > 0.001) {
    filters.push(`volume=${volumeMultiplier.toFixed(3)}`);
  }

  if (effects.fadeInSeconds > 0.01) {
    filters.push(`afade=t=in:st=0:d=${formatSeconds(effects.fadeInSeconds)}`);
  }

  if (effects.fadeOutSeconds > 0.01) {
    filters.push(`areverse,afade=t=in:st=0:d=${formatSeconds(effects.fadeOutSeconds)},areverse`);
  }

  return filters;
}

function buildOutputCodecArgs(format: AudioOutputFormat) {
  switch (format) {
    case "wav":
      return ["-c:a", "pcm_s16le"];
    case "aac":
      return ["-c:a", "aac", "-b:a", "192k"];
    case "ogg":
      return ["-c:a", "libvorbis", "-q:a", "5"];
    case "mp3":
    default:
      return ["-c:a", "libmp3lame", "-b:a", "192k"];
  }
}

async function getSharedFfmpeg() {
  if (!ffmpegPromise) {
    ffmpegPromise = (async () => {
      const ffmpeg = new FFmpeg();
      await ffmpeg.load({
        coreURL,
        wasmURL,
        classWorkerURL,
      });
      return ffmpeg;
    })().catch((error) => {
      ffmpegPromise = null;
      throw error;
    });
  }

  return ffmpegPromise;
}

function buildFailureMessage(logs: string[], fallback: string) {
  const recentLog = [...logs].reverse().find((entry) => entry.trim());
  if (!recentLog) {
    return fallback;
  }

  const normalized = recentLog.toLowerCase();
  if (normalized.includes("does not contain any stream") || normalized.includes("stream map")) {
    return "No usable audio track was found in the selected file.";
  }

  if (normalized.includes("cannot allocate memory") || normalized.includes("memory")) {
    return "This file is too large for the available browser memory on this device.";
  }

  if (normalized.includes("invalid data found")) {
    return "One of the selected files could not be decoded in the browser.";
  }

  return recentLog;
}

export async function warmBrowserAudioTools() {
  await getSharedFfmpeg();
}

export async function processAudioInBrowser(
  request: AudioProcessingRequest
): Promise<BrowserProcessedAudioFile> {
  const { files, sourceMode, trim, effects, output, onProgress, onStatus } = request;

  if (sourceMode === "merge" && files.length < 2) {
    throw new AudioToolError("Add at least two audio files to merge them.");
  }

  if (sourceMode !== "merge" && files.length < 1) {
    throw new AudioToolError("Choose a file to start editing.");
  }

  const ffmpeg = await getSharedFfmpeg();
  const logs: string[] = [];
  const outputPreset = AUDIO_OUTPUT_PRESETS[output.format];
  const safeBaseName = sanitizeFileBaseName(output.fileName);
  const outputPath = `job-output.${outputPreset.extension}`;
  const inputPaths: string[] = [];
  const filesToCleanup: string[] = [];
  const directoriesToCleanup: string[] = [];
  const filterChain = buildAudioFilterChain(trim, effects);
  const jobDir = `job-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  const handleLog = ({ message }: { message: string }) => {
    logs.push(message);
  };
  const handleProgress = ({ progress }: { progress: number }) => {
    if (onProgress) {
      onProgress(clamp(Math.round(progress * 100), 0, 99));
    }
  };

  ffmpeg.on("log", handleLog);
  ffmpeg.on("progress", handleProgress);

  try {
    onStatus?.("Preparing browser audio engine...");
    onProgress?.(4);
    await ffmpeg.createDir(jobDir);
    directoriesToCleanup.push(jobDir);

    onStatus?.("Loading files into memory...");

    for (const [index, file] of files.entries()) {
      const extension = inferSourceExtension(file);
      const inputPath = `${jobDir}/${String(index).padStart(2, "0")}-${sanitizeFsName(file.name, `input-${index}.${extension}`)}`;
      await ffmpeg.writeFile(inputPath, await fetchFile(file));
      inputPaths.push(inputPath);
      filesToCleanup.push(inputPath);
      onProgress?.(Math.min(20, 8 + Math.round(((index + 1) / files.length) * 12)));
    }

    const args: string[] = [];
    inputPaths.forEach((inputPath) => {
      args.push("-i", inputPath);
    });

    if (sourceMode === "merge") {
      const filterParts: string[] = [];
      const normalizedLabels: string[] = [];

      inputPaths.forEach((_, index) => {
        const label = `a${index}`;
        filterParts.push(
          `[${index}:a:0]aresample=44100,aformat=sample_fmts=fltp:channel_layouts=stereo[${label}]`
        );
        normalizedLabels.push(`[${label}]`);
      });

      const concatLabel = filterChain.length ? "merged_base" : "audio_out";
      filterParts.push(`${normalizedLabels.join("")}concat=n=${inputPaths.length}:v=0:a=1[${concatLabel}]`);

      if (filterChain.length > 0) {
        filterParts.push(`[${concatLabel}]${filterChain.join(",")}[audio_out]`);
      }

      args.push("-filter_complex", filterParts.join(";"), "-map", "[audio_out]");
    } else {
      args.push("-map", "0:a:0", "-vn");

      if (filterChain.length > 0) {
        args.push("-filter:a", filterChain.join(","));
      }
    }

    args.push("-ar", "44100", "-ac", "2", ...buildOutputCodecArgs(output.format), `${jobDir}/${outputPath}`);
    filesToCleanup.push(`${jobDir}/${outputPath}`);

    onStatus?.("Processing audio in your browser...");
    onProgress?.(24);

    const exitCode = await ffmpeg.exec(args);
    if (exitCode !== 0) {
      throw new AudioToolError(buildFailureMessage(logs, "Audio processing failed in the browser."));
    }

    onStatus?.("Preparing your download...");
    onProgress?.(100);

    const outputData = await ffmpeg.readFile(`${jobDir}/${outputPath}`);
    if (!(outputData instanceof Uint8Array)) {
      throw new AudioToolError("The browser returned an unexpected audio file format.");
    }

    return {
      blob: new Blob([outputData], { type: outputPreset.mimeType }),
      name: `${safeBaseName}.${outputPreset.extension}`,
      mimeType: outputPreset.mimeType,
      size: outputData.byteLength,
    };
  } catch (error) {
    if (error instanceof AudioToolError) {
      throw error;
    }

    if (error instanceof Error) {
      throw new AudioToolError(error.message || buildFailureMessage(logs, "Audio processing failed."));
    }

    throw new AudioToolError(buildFailureMessage(logs, "Audio processing failed."));
  } finally {
    ffmpeg.off("log", handleLog);
    ffmpeg.off("progress", handleProgress);

    for (const filePath of filesToCleanup.reverse()) {
      try {
        await ffmpeg.deleteFile(filePath);
      } catch {
        // Ignore cleanup errors to avoid masking the real result.
      }
    }

    for (const directoryPath of directoriesToCleanup.reverse()) {
      try {
        await ffmpeg.deleteDir(directoryPath);
      } catch {
        // Ignore cleanup errors to avoid masking the real result.
      }
    }
  }
}
