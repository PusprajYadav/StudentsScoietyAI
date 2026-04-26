import {
  AlertTriangle,
  CheckCircle2,
  Download,
  Film,
  Layers3,
  Loader2,
  Scissors,
  Sparkles,
  Volume2,
  Wand2,
} from "lucide-react";
import { startTransition, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  AUDIO_OUTPUT_PRESETS,
  processAudioInBrowser,
  type AudioEffectSettings,
  type AudioOutputFormat,
  type AudioSourceMode,
  warmBrowserAudioTools,
} from "../../../lib/browserAudioTools";
import { downloadBlobNatively } from "../../../lib/nativeDownload";
import { AudioWaveformBoundary } from "./AudioWaveformBoundary";
import { AudioQueueBoard } from "./AudioQueueBoard";
import { AudioSourceDropzone } from "./AudioSourceDropzone";
import { AudioWaveformPanel } from "./AudioWaveformPanel";
import {
  clampTrimRange,
  createAudioWorkspaceFile,
  createAudioWorkspaceFileFromBlob,
  formatBytes,
  formatDuration,
  getLargeFileWarning,
  getSourceDuration,
  getSuggestedOutputName,
  getTotalSourceBytes,
  reorderItems,
  revokeWorkspaceFile,
} from "./helpers";
import type { AudioResultState, AudioWorkspaceFile } from "./types";

const AUDIO_ACCEPT = {
  "audio/*": [".mp3", ".wav", ".aac", ".m4a", ".ogg", ".oga", ".webm"],
};

const VIDEO_ACCEPT = {
  "video/*": [".mp4", ".mov", ".m4v", ".webm"],
};

const DEFAULT_EFFECTS: AudioEffectSettings = {
  volumePercent: 100,
  normalize: false,
  speed: 1,
  removeSilence: false,
  silenceThresholdDb: -36,
  silenceDuration: 0.25,
  fadeInSeconds: 0,
  fadeOutSeconds: 0,
};

function SourceModeCard({
  active,
  title,
  description,
  icon,
  onClick,
}: {
  active: boolean;
  title: string;
  description: string;
  icon: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-[18px] border p-3 text-left transition sm:rounded-[22px] sm:p-3.5 ${
        active
          ? "border-brand/45 bg-brand/10 shadow-[0_14px_36px_-30px_rgba(37,99,235,0.75)]"
          : "border-app-border bg-app-card hover:border-brand/25 hover:bg-brand/5"
      }`}
    >
      <div className="flex items-center gap-2.5 sm:gap-3">
        <div className="rounded-[16px] bg-slate-950 p-2.5 text-white sm:rounded-2xl sm:p-3">{icon}</div>
        <div className="min-w-0">
          <h3 className="font-display text-sm font-semibold tracking-tight text-app-text sm:text-base">{title}</h3>
          <p className="mt-0.5 text-xs text-app-muted">{description}</p>
        </div>
      </div>
    </button>
  );
}

export function AudioToolsApp({ showTitleBlock = true }: { showTitleBlock?: boolean }) {
  const trackedUrlsRef = useRef(new Set<string>());
  const [engineState, setEngineState] = useState<"warming" | "ready" | "error">("warming");
  const [sourceMode, setSourceMode] = useState<AudioSourceMode>("single");
  const [singleFile, setSingleFile] = useState<AudioWorkspaceFile | null>(null);
  const [videoFile, setVideoFile] = useState<AudioWorkspaceFile | null>(null);
  const [mergeFiles, setMergeFiles] = useState<AudioWorkspaceFile[]>([]);
  const [selectedMergeId, setSelectedMergeId] = useState<string | null>(null);

  const [trimEnabled, setTrimEnabled] = useState(true);
  const [trimStart, setTrimStart] = useState(0);
  const [trimEnd, setTrimEnd] = useState<number | null>(null);

  const [effects, setEffects] = useState<AudioEffectSettings>(DEFAULT_EFFECTS);
  const [outputFormat, setOutputFormat] = useState<AudioOutputFormat>("mp3");
  const [outputName, setOutputName] = useState("audio-export.mp3");
  const [outputNameTouched, setOutputNameTouched] = useState(false);

  const [processing, setProcessing] = useState(false);
  const [progressPercent, setProgressPercent] = useState(0);
  const [progressMessage, setProgressMessage] = useState("Ready when you are.");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AudioResultState | null>(null);

  function releaseAllTrackedUrls() {
    trackedUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    trackedUrlsRef.current.clear();
  }

  useEffect(() => {
    let cancelled = false;

    warmBrowserAudioTools()
      .then(() => {
        if (!cancelled) {
          setEngineState("ready");
        }
      })
      .catch(() => {
        if (!cancelled) {
          setEngineState("error");
        }
      });

    return () => {
      cancelled = true;
      releaseAllTrackedUrls();
    };
  }, []);

  const activeMergeFile = useMemo(
    () => mergeFiles.find((item) => item.id === selectedMergeId) || mergeFiles[0] || null,
    [mergeFiles, selectedMergeId]
  );

  const activeWaveformFile = sourceMode === "single" ? singleFile : sourceMode === "merge" ? activeMergeFile : null;
  const sourceDuration = getSourceDuration(sourceMode, singleFile, videoFile, mergeFiles);
  const totalSourceBytes = getTotalSourceBytes(sourceMode, singleFile, videoFile, mergeFiles);
  const largeFileWarning = getLargeFileWarning(totalSourceBytes);

  const suggestedOutputName = useMemo(
    () => getSuggestedOutputName(sourceMode, singleFile, videoFile, mergeFiles, outputFormat),
    [mergeFiles, outputFormat, singleFile, sourceMode, videoFile]
  );

  useEffect(() => {
    if (!outputNameTouched) {
      setOutputName(suggestedOutputName);
    }
  }, [outputNameTouched, suggestedOutputName]);

  useEffect(() => {
    if (mergeFiles.length === 0) {
      setSelectedMergeId(null);
      return;
    }

    if (!mergeFiles.some((item) => item.id === selectedMergeId)) {
      setSelectedMergeId(mergeFiles[0].id);
    }
  }, [mergeFiles, selectedMergeId]);

  useEffect(() => {
    const normalized = clampTrimRange(trimStart, trimEnd, sourceDuration);
    if (normalized.start !== trimStart) {
      setTrimStart(normalized.start);
    }
    if (normalized.end !== trimEnd) {
      setTrimEnd(normalized.end);
    }
  }, [sourceDuration, trimEnd, trimStart]);

  function trackWorkspaceFile(item: AudioWorkspaceFile) {
    trackedUrlsRef.current.add(item.objectUrl);
    return item;
  }

  function releaseWorkspaceItem(item: AudioWorkspaceFile | null) {
    if (!item) {
      return;
    }

    revokeWorkspaceFile(item);
    trackedUrlsRef.current.delete(item.objectUrl);
  }

  function releaseResult(nextResult: AudioResultState | null) {
    if (!nextResult) {
      return;
    }

    URL.revokeObjectURL(nextResult.objectUrl);
    trackedUrlsRef.current.delete(nextResult.objectUrl);
  }

  async function handleSingleFileUpload(files: File[]) {
    const [first] = files;
    if (!first) {
      return;
    }

    setError(null);
    const nextFile = trackWorkspaceFile(await createAudioWorkspaceFile(first));

    startTransition(() => {
      releaseWorkspaceItem(singleFile);
      setSingleFile(nextFile);
      setSourceMode("single");
      setTrimEnabled(true);
      setTrimStart(0);
      setTrimEnd(nextFile.durationSeconds);
    });
  }

  async function handleVideoFileUpload(files: File[]) {
    const [first] = files;
    if (!first) {
      return;
    }

    setError(null);
    const nextFile = trackWorkspaceFile(await createAudioWorkspaceFile(first));

    startTransition(() => {
      releaseWorkspaceItem(videoFile);
      setVideoFile(nextFile);
      setSourceMode("video");
      setTrimEnabled(true);
      setTrimStart(0);
      setTrimEnd(nextFile.durationSeconds);
      setOutputFormat("mp3");
    });
  }

  async function handleMergeUpload(files: File[]) {
    if (files.length === 0) {
      return;
    }

    setError(null);
    const preparedFiles = await Promise.all(files.map((file) => createAudioWorkspaceFile(file)));
    const trackedFiles = preparedFiles.map(trackWorkspaceFile);

    startTransition(() => {
      setMergeFiles((current) => [...current, ...trackedFiles]);
      setSourceMode("merge");
      setTrimEnabled(false);
      setTrimStart(0);
      setTrimEnd(null);
      setSelectedMergeId((current) => current || trackedFiles[0]?.id || null);
    });
  }

  function resetEffects() {
    setEffects(DEFAULT_EFFECTS);
    setTrimEnabled(true);
    setTrimStart(0);
    setTrimEnd(sourceDuration);
  }

  function updateTrimRange(range: { start: number; end: number | null }) {
    const normalized = clampTrimRange(range.start, range.end, sourceDuration);
    setTrimStart(normalized.start);
    setTrimEnd(normalized.end);
  }

  async function handleProcess() {
    const files =
      sourceMode === "single"
        ? singleFile
          ? [singleFile.file]
          : []
        : sourceMode === "video"
          ? videoFile
            ? [videoFile.file]
            : []
          : mergeFiles.map((item) => item.file);

    if ((sourceMode === "merge" && files.length < 2) || (sourceMode !== "merge" && files.length < 1)) {
      setError(sourceMode === "merge" ? "Add at least two audio files to merge." : "Upload a file before exporting.");
      return;
    }

    setError(null);
    setProcessing(true);
    setProgressPercent(0);
    setProgressMessage("Loading files into the browser audio engine...");

    try {
      const processed = await processAudioInBrowser({
        sourceMode,
        files,
        trim: {
          enabled: trimEnabled,
          start: trimStart,
          end: trimEnd,
        },
        effects,
        output: {
          format: outputFormat,
          fileName: outputName,
        },
        onProgress: setProgressPercent,
        onStatus: setProgressMessage,
      });

      const fileForPreview = new File([processed.blob], processed.name, {
        type: processed.mimeType,
        lastModified: Date.now(),
      });
      const objectUrl = URL.createObjectURL(processed.blob);
      trackedUrlsRef.current.add(objectUrl);
      const durationSource = trackWorkspaceFile(await createAudioWorkspaceFile(fileForPreview));

      const nextResult: AudioResultState = {
        blob: processed.blob,
        name: processed.name,
        format: outputFormat,
        mimeType: processed.mimeType,
        objectUrl,
        size: processed.size,
        durationSeconds: durationSource.durationSeconds,
      };

      releaseWorkspaceItem(durationSource);
      releaseResult(result);
      setResult(nextResult);
      setProgressPercent(100);
      setProgressMessage("Export ready. Preview it, download it, or load it back into the editor.");
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Audio processing failed.");
      setProgressMessage("Processing stopped.");
    } finally {
      setProcessing(false);
    }
  }

  async function handleLoadResultIntoEditor() {
    if (!result) {
      return;
    }

    try {
      setError(null);
      const nextFile = trackWorkspaceFile(
        createAudioWorkspaceFileFromBlob(result.blob, result.name, result.mimeType, result.durationSeconds)
      );

      startTransition(() => {
        releaseWorkspaceItem(singleFile);
        setSingleFile(nextFile);
        setSourceMode("single");
        setTrimEnabled(true);
        setTrimStart(0);
        setTrimEnd(nextFile.durationSeconds);
        setOutputNameTouched(false);
      });
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "The exported file could not be loaded back into the editor.");
    }
  }

  const canProcess =
    !processing &&
    (sourceMode === "single"
      ? Boolean(singleFile)
      : sourceMode === "video"
        ? Boolean(videoFile)
        : mergeFiles.length >= 2);

  const sizeDeltaPercent =
    result && totalSourceBytes > 0 ? Math.round(((result.size - totalSourceBytes) / totalSourceBytes) * 100) : null;
  const hasLoadedSource =
    sourceMode === "single" ? Boolean(singleFile) : sourceMode === "video" ? Boolean(videoFile) : mergeFiles.length > 0;
  const trimHelperText =
    sourceMode === "single"
      ? "Use the waveform or the time boxes for precise trimming."
      : sourceMode === "merge"
        ? "Trim applies to the full merged timeline after the clips are joined."
        : "Trim the extracted audio before you export it.";

  return (
    <div className="space-y-3 sm:space-y-4">
      {showTitleBlock ? (
        <section className="rounded-[22px] border border-app-border bg-[linear-gradient(135deg,_rgba(15,23,42,1),_rgba(8,47,73,0.94))] px-4 py-4 text-white shadow-[0_24px_70px_-48px_rgba(15,23,42,0.85)] sm:rounded-[28px] sm:px-5 sm:py-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-200">Audio Tools</p>
          <h1 className="mt-2 font-display text-[1.35rem] font-semibold tracking-tight sm:text-[1.85rem]">
            Cut, merge, convert
          </h1>
          <div className="mt-3 flex flex-wrap gap-2 text-[11px] sm:mt-4 sm:text-xs">
            <span className="rounded-full bg-white/10 px-2.5 py-1.5 sm:px-3">Trim</span>
            <span className="rounded-full bg-white/10 px-2.5 py-1.5 sm:px-3">Merge</span>
            <span className="rounded-full bg-white/10 px-2.5 py-1.5 sm:px-3">Extract</span>
            <span className="rounded-full bg-white/10 px-2.5 py-1.5 sm:px-3">Export</span>
          </div>
        </section>
      ) : null}

      <section className="grid gap-2.5 sm:grid-cols-3 sm:gap-3">
        <SourceModeCard
          active={sourceMode === "single"}
          title="Cut"
          description="One audio file"
          icon={<Scissors className="h-5 w-5" />}
          onClick={() => setSourceMode("single")}
        />
        <SourceModeCard
          active={sourceMode === "merge"}
          title="Merge"
          description="Join many clips"
          icon={<Layers3 className="h-5 w-5" />}
          onClick={() => setSourceMode("merge")}
        />
        <SourceModeCard
          active={sourceMode === "video"}
          title="Extract"
          description="Audio from video"
          icon={<Film className="h-5 w-5" />}
          onClick={() => setSourceMode("video")}
        />
      </section>

      <section className="grid gap-3 lg:grid-cols-[minmax(300px,0.92fr)_minmax(0,1.08fr)] xl:items-start xl:gap-4">
        <div className="min-w-0 space-y-3 sm:space-y-4">
          <section className="glass-card rounded-[22px] p-3 sm:rounded-[28px] sm:p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-app-muted">1. Upload</p>
                <h2 className="mt-1 font-display text-lg font-semibold tracking-tight text-app-text">Choose file</h2>
              </div>
              <div
                className={`self-start rounded-full px-3 py-1.5 text-xs font-semibold sm:self-auto ${
                  engineState === "ready"
                    ? "bg-emerald-500/12 text-emerald-700"
                    : engineState === "error"
                      ? "bg-rose-500/12 text-rose-700"
                      : "bg-amber-500/12 text-amber-700"
                }`}
              >
                {engineState === "ready" ? "Engine ready" : engineState === "error" ? "Engine load issue" : "Warming FFmpeg"}
              </div>
            </div>

            <div className="mt-3 space-y-3 sm:mt-4 sm:space-y-4">
              {sourceMode === "single" ? (
                <AudioSourceDropzone
                  accept={AUDIO_ACCEPT}
                  title="Audio"
                  description="MP3, WAV, AAC, OGG"
                  helperText="Tap to choose"
                  onFilesAccepted={handleSingleFileUpload}
                />
              ) : null}

              {sourceMode === "merge" ? (
                <>
                  <AudioSourceDropzone
                    accept={AUDIO_ACCEPT}
                    multiple
                    title="Many audio files"
                    description="Add clips"
                    helperText="Drag to change order"
                    onFilesAccepted={handleMergeUpload}
                  />
                  {mergeFiles.length > 0 ? (
                    <AudioQueueBoard
                      items={mergeFiles}
                      selectedId={selectedMergeId}
                      onSelect={setSelectedMergeId}
                      onMove={(fromIndex, toIndex) => {
                        if (fromIndex === toIndex) {
                          return;
                        }

                        setMergeFiles((current) => reorderItems(current, fromIndex, toIndex));
                      }}
                      onRemove={(id) => {
                        const removedItem = mergeFiles.find((item) => item.id === id) || null;
                        releaseWorkspaceItem(removedItem);
                        setMergeFiles((current) => current.filter((item) => item.id !== id));
                      }}
                      onClear={() => {
                        mergeFiles.forEach((item) => releaseWorkspaceItem(item));
                        setMergeFiles([]);
                        setSelectedMergeId(null);
                      }}
                    />
                  ) : null}
                </>
              ) : null}

              {sourceMode === "video" ? (
                <AudioSourceDropzone
                  accept={VIDEO_ACCEPT}
                  title="Video"
                  description="MP4, MOV, WEBM"
                  helperText="Best output: MP3"
                  onFilesAccepted={handleVideoFileUpload}
                />
              ) : null}

              {sourceMode === "single" && singleFile ? (
                <div className="rounded-[18px] border border-app-border bg-app-secondary/60 p-3 sm:rounded-[24px] sm:p-4">
                  <p className="break-all text-sm font-semibold text-app-text">{singleFile.file.name}</p>
                  <p className="mt-1 text-xs text-app-muted">
                    {formatDuration(singleFile.durationSeconds)} • {formatBytes(singleFile.file.size)}
                  </p>
                </div>
              ) : null}

              {sourceMode === "video" && videoFile ? (
                <div className="rounded-[18px] border border-app-border bg-app-secondary/60 p-3 sm:rounded-[24px] sm:p-4">
                  <p className="break-all text-sm font-semibold text-app-text">{videoFile.file.name}</p>
                  <p className="mt-1 text-xs text-app-muted">
                    {formatDuration(videoFile.durationSeconds)} • {formatBytes(videoFile.file.size)}
                  </p>
                </div>
              ) : null}
            </div>

            {largeFileWarning ? (
              <div className="mt-3 rounded-[18px] border border-amber-200 bg-amber-50 px-3 py-3 text-sm text-amber-800 sm:mt-4 sm:rounded-[24px] sm:px-4">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  <p>{largeFileWarning}</p>
                </div>
              </div>
            ) : null}
          </section>

          <section className="glass-card rounded-[22px] p-3 sm:rounded-[28px] sm:p-5">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-slate-950 p-3 text-white">
                <Wand2 className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-app-muted">2. Edit</p>
                <h2 className="mt-1 font-display text-lg font-semibold tracking-tight text-app-text">Trim and sound</h2>
              </div>
            </div>

            <div className="mt-3 space-y-3 sm:mt-4 sm:space-y-4">
              <div className="rounded-[18px] border border-app-border bg-app-card p-3 sm:rounded-[24px] sm:p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-app-text">Trim</p>
                    <p className="mt-1 text-xs text-app-muted">{trimHelperText}</p>
                  </div>
                  <label className="inline-flex items-center gap-2 text-sm font-semibold text-app-text">
                    <input
                      type="checkbox"
                      checked={trimEnabled}
                      onChange={(event) => setTrimEnabled(event.target.checked)}
                      className="h-4 w-4 rounded border-app-border text-brand focus:ring-brand"
                    />
                    Enable
                  </label>
                </div>

                <div className="mt-3 grid gap-3 sm:mt-4 sm:grid-cols-2">
                  <label>
                    <span className="text-xs font-semibold uppercase tracking-[0.14em] text-app-muted">Start (sec)</span>
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      value={trimStart}
                      onChange={(event) => setTrimStart(Number(event.target.value) || 0)}
                      className="input-field"
                      disabled={!hasLoadedSource || !trimEnabled}
                    />
                  </label>
                  <label>
                    <span className="text-xs font-semibold uppercase tracking-[0.14em] text-app-muted">End (sec)</span>
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      value={trimEnd ?? ""}
                      onChange={(event) => {
                        const nextValue = event.target.value.trim();
                        setTrimEnd(nextValue ? Number(nextValue) : sourceDuration);
                      }}
                      className="input-field"
                      placeholder={sourceDuration ? sourceDuration.toFixed(2) : "Until end"}
                      disabled={!hasLoadedSource || !trimEnabled}
                    />
                  </label>
                </div>
              </div>

              <div className="rounded-[18px] border border-app-border bg-app-card p-3 sm:rounded-[24px] sm:p-4">
                <div className="flex items-center gap-2">
                  <Volume2 className="h-4 w-4 text-brand" />
                  <p className="text-sm font-semibold text-app-text">Sound</p>
                </div>

                <div className="mt-3 space-y-3 sm:mt-4 sm:space-y-4">
                  <label className="block">
                    <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-[0.14em] text-app-muted">
                      <span>Volume</span>
                      <span>{effects.volumePercent}%</span>
                    </div>
                    <input
                      type="range"
                      min={25}
                      max={200}
                      step={1}
                      value={effects.volumePercent}
                      onChange={(event) =>
                        setEffects((current) => ({ ...current, volumePercent: Number(event.target.value) }))
                      }
                      className="mt-3 w-full accent-brand"
                    />
                  </label>

                  <label className="block">
                    <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-[0.14em] text-app-muted">
                      <span>Playback speed</span>
                      <span>{effects.speed.toFixed(2)}x</span>
                    </div>
                    <input
                      type="range"
                      min={0.5}
                      max={2}
                      step={0.05}
                      value={effects.speed}
                      onChange={(event) => setEffects((current) => ({ ...current, speed: Number(event.target.value) }))}
                      className="mt-3 w-full accent-brand"
                    />
                  </label>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <label>
                      <span className="text-xs font-semibold uppercase tracking-[0.14em] text-app-muted">Fade in</span>
                      <input
                        type="number"
                        min={0}
                        max={10}
                        step="0.1"
                        value={effects.fadeInSeconds}
                        onChange={(event) =>
                          setEffects((current) => ({ ...current, fadeInSeconds: Number(event.target.value) || 0 }))
                        }
                        className="input-field"
                      />
                    </label>
                    <label>
                      <span className="text-xs font-semibold uppercase tracking-[0.14em] text-app-muted">Fade out</span>
                      <input
                        type="number"
                        min={0}
                        max={10}
                        step="0.1"
                        value={effects.fadeOutSeconds}
                        onChange={(event) =>
                          setEffects((current) => ({ ...current, fadeOutSeconds: Number(event.target.value) || 0 }))
                        }
                        className="input-field"
                      />
                    </label>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="inline-flex items-center gap-2 rounded-[20px] border border-app-border bg-app-secondary/70 px-3 py-2 text-sm font-semibold text-app-text">
                      <input
                        type="checkbox"
                        checked={effects.normalize}
                        onChange={(event) => setEffects((current) => ({ ...current, normalize: event.target.checked }))}
                        className="h-4 w-4 rounded border-app-border text-brand focus:ring-brand"
                      />
                      Normalize audio level
                    </label>
                    <label className="inline-flex items-center gap-2 rounded-[20px] border border-app-border bg-app-secondary/70 px-3 py-2 text-sm font-semibold text-app-text">
                      <input
                        type="checkbox"
                        checked={effects.removeSilence}
                        onChange={(event) =>
                          setEffects((current) => ({ ...current, removeSilence: event.target.checked }))
                        }
                        className="h-4 w-4 rounded border-app-border text-brand focus:ring-brand"
                      />
                      Remove silent gaps
                    </label>
                  </div>

                  {effects.removeSilence ? (
                    <div className="grid gap-3 sm:grid-cols-2">
                      <label>
                        <span className="text-xs font-semibold uppercase tracking-[0.14em] text-app-muted">
                          Silence threshold (dB)
                        </span>
                        <input
                          type="number"
                          min={-60}
                          max={-10}
                          step="1"
                          value={effects.silenceThresholdDb}
                          onChange={(event) =>
                            setEffects((current) => ({
                              ...current,
                              silenceThresholdDb: Number(event.target.value) || -36,
                            }))
                          }
                          className="input-field"
                        />
                      </label>
                      <label>
                        <span className="text-xs font-semibold uppercase tracking-[0.14em] text-app-muted">
                          Min silence length (sec)
                        </span>
                        <input
                          type="number"
                          min={0.05}
                          max={2}
                          step="0.05"
                          value={effects.silenceDuration}
                          onChange={(event) =>
                            setEffects((current) => ({
                              ...current,
                              silenceDuration: Number(event.target.value) || 0.25,
                            }))
                          }
                          className="input-field"
                        />
                      </label>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          </section>

          <section className="glass-card rounded-[22px] p-3 sm:rounded-[28px] sm:p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-app-muted">3. Export</p>
                <h2 className="mt-1 font-display text-lg font-semibold tracking-tight text-app-text">Save file</h2>
              </div>
              <button type="button" className="btn-secondary self-start !px-3 !py-2 text-xs sm:self-auto" onClick={resetEffects}>
                Reset settings
              </button>
            </div>

            <div className="mt-3 grid gap-3 sm:mt-4 sm:grid-cols-2 sm:gap-4">
              <label>
                <span className="text-xs font-semibold uppercase tracking-[0.14em] text-app-muted">Output format</span>
                <select
                  value={outputFormat}
                  onChange={(event) => setOutputFormat(event.target.value as AudioOutputFormat)}
                  className="input-field"
                >
                  {Object.entries(AUDIO_OUTPUT_PRESETS).map(([format, preset]) => (
                    <option key={format} value={format}>
                      {preset.label}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span className="text-xs font-semibold uppercase tracking-[0.14em] text-app-muted">Custom filename</span>
                <input
                  value={outputName}
                  onChange={(event) => {
                    setOutputNameTouched(true);
                    setOutputName(event.target.value);
                  }}
                  className="input-field"
                  placeholder="audio-export.mp3"
                />
              </label>
            </div>

            <div className="mt-3 rounded-[18px] border border-app-border bg-app-secondary/60 px-3 py-3 text-sm text-app-muted sm:mt-4 sm:rounded-[22px] sm:px-4">
              <p>
                Source size: <span className="font-semibold text-app-text">{formatBytes(totalSourceBytes)}</span>
              </p>
              <p className="mt-1">
                Estimated source duration: <span className="font-semibold text-app-text">{formatDuration(sourceDuration)}</span>
              </p>
            </div>

            <div className="mt-4 sm:mt-5">
              <button type="button" className="btn-primary w-full gap-2" onClick={handleProcess} disabled={!canProcess}>
                {processing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                {processing ? "Processing in browser..." : "Export audio"}
              </button>
            </div>

            <div className="mt-3 rounded-[18px] border border-app-border bg-app-card p-3 sm:mt-4 sm:rounded-[24px] sm:p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-app-text">{progressMessage}</p>
                  <p className="mt-1 text-xs text-app-muted">Everything stays local to this browser session.</p>
                </div>
                <span className="text-sm font-semibold text-app-text">{progressPercent}%</span>
              </div>
              <div className="mt-3 h-2 rounded-full bg-app-secondary">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-emerald-500 via-sky-500 to-orange-400 transition-[width] duration-300"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>

            {error ? (
              <div className="mt-4 rounded-[24px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {error}
              </div>
            ) : null}
          </section>
        </div>

        <div className="min-w-0 space-y-3 sm:space-y-4">
          {sourceMode === "video" ? (
            <section className="glass-card rounded-[22px] p-3 sm:rounded-[28px] sm:p-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-app-muted">Video preview</p>
                  <h2 className="mt-1 break-all font-display text-xl font-semibold tracking-tight text-app-text">
                    {videoFile ? videoFile.file.name : "No video selected"}
                  </h2>
                  <p className="mt-1 text-sm text-app-muted">
                    {videoFile
                      ? `${formatDuration(videoFile.durationSeconds)} • ${formatBytes(videoFile.file.size)}`
                      : "Upload a video to extract and export its audio track."}
                  </p>
                </div>
                <div className="rounded-full bg-app-secondary px-3 py-1.5 text-xs font-semibold text-app-text">
                  Audio extract
                </div>
              </div>

              {videoFile ? (
                <div className="mt-3 overflow-hidden rounded-[20px] border border-app-border bg-slate-950 sm:mt-4 sm:rounded-[28px]">
                  <video src={videoFile.objectUrl} controls className="aspect-video w-full bg-black" playsInline />
                </div>
              ) : (
                <div className="mt-3 flex min-h-[220px] items-center justify-center rounded-[20px] border border-app-border bg-app-card px-5 text-center text-sm text-app-muted sm:mt-4 sm:min-h-[340px] sm:rounded-[28px] sm:px-6">
                  Upload a video to preview it here before exporting the audio.
                </div>
              )}
            </section>
          ) : (
            <AudioWaveformBoundary file={activeWaveformFile}>
              <AudioWaveformPanel
                file={activeWaveformFile}
                trimEnabled={sourceMode === "single" ? trimEnabled : false}
                trimStart={trimStart}
                trimEnd={trimEnd}
                playbackRate={effects.speed}
                onTrimChange={updateTrimRange}
              />
            </AudioWaveformBoundary>
          )}

          <section className="glass-card rounded-[22px] p-3 sm:rounded-[28px] sm:p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-app-muted">4. Result</p>
                <h2 className="mt-1 break-all font-display text-lg font-semibold tracking-tight text-app-text">
                  {result ? result.name : "No export yet"}
                </h2>
                <p className="mt-1 text-sm text-app-muted">
                  {result
                    ? `${AUDIO_OUTPUT_PRESETS[result.format].label} • ${formatDuration(result.durationSeconds)}`
                    : "Run an export to preview the finished file, compare sizes, and download it."}
                </p>
              </div>
              {result ? (
                <div className="inline-flex items-center gap-2 rounded-full bg-emerald-500/12 px-3 py-1.5 text-xs font-semibold text-emerald-700">
                  <CheckCircle2 className="h-4 w-4" />
                  Ready
                </div>
              ) : null}
            </div>

            {result ? (
              <>
                <div className="mt-3 rounded-[20px] border border-app-border bg-slate-950 px-3 py-3 text-white sm:mt-4 sm:rounded-[28px] sm:px-4 sm:py-4">
                  <audio src={result.objectUrl} controls className="h-12 w-full" preload="metadata" playsInline />
                </div>

                <div className="mt-3 grid gap-2 sm:mt-4 sm:grid-cols-3">
                  <div className="rounded-[18px] border border-app-border bg-app-card p-3 sm:rounded-[22px] sm:p-4">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-app-muted">Before</p>
                    <p className="mt-2 text-lg font-semibold text-app-text">{formatBytes(totalSourceBytes)}</p>
                  </div>
                  <div className="rounded-[18px] border border-app-border bg-app-card p-3 sm:rounded-[22px] sm:p-4">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-app-muted">After</p>
                    <p className="mt-2 text-lg font-semibold text-app-text">{formatBytes(result.size)}</p>
                  </div>
                  <div className="rounded-[18px] border border-app-border bg-app-card p-3 sm:rounded-[22px] sm:p-4">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-app-muted">Delta</p>
                    <p className="mt-2 text-lg font-semibold text-app-text">
                      {sizeDeltaPercent === null ? "n/a" : `${sizeDeltaPercent > 0 ? "+" : ""}${sizeDeltaPercent}%`}
                    </p>
                  </div>
                </div>

                <div className="mt-3 flex flex-col gap-2 sm:mt-4 sm:flex-row">
                  <button
                    type="button"
                    className="btn-primary flex-1 gap-2"
                    onClick={() => {
                      void downloadBlobNatively(result.blob, result.name);
                    }}
                  >
                    <Download className="h-4 w-4" />
                    Download result
                  </button>
                  <button type="button" className="btn-secondary flex-1 gap-2" onClick={handleLoadResultIntoEditor}>
                    <Scissors className="h-4 w-4" />
                    Load result into editor
                  </button>
                </div>
              </>
            ) : (
              <div className="mt-3 flex min-h-[180px] items-center justify-center rounded-[20px] border border-app-border bg-app-card px-5 text-center sm:mt-4 sm:min-h-[240px] sm:rounded-[28px] sm:px-6">
                <div>
                  <p className="font-display text-lg font-semibold text-app-text">Preview, then iterate.</p>
                  <p className="mt-2 max-w-md text-sm leading-6 text-app-muted">
                    Export once, listen to the result, and load it back into the editor if you want to chain another pass.
                  </p>
                </div>
              </div>
            )}
          </section>
        </div>
      </section>
    </div>
  );
}
