import { Loader2, MoveHorizontal, Pause, Play, RotateCcw, Scissors } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import WaveSurfer from "wavesurfer.js";
import RegionsPlugin, { type Region } from "wavesurfer.js/plugins/regions";
import TimelinePlugin from "wavesurfer.js/plugins/timeline";
import { formatDuration } from "./helpers";
import { AudioWaveformFallback } from "./AudioWaveformFallback";
import type { AudioWorkspaceFile } from "./types";

interface AudioWaveformPanelProps {
  file: AudioWorkspaceFile | null;
  trimEnabled: boolean;
  trimStart: number;
  trimEnd: number | null;
  playbackRate: number;
  onTrimChange: (range: { start: number; end: number | null }) => void;
}

function getInitialZoom(durationSeconds: number | null | undefined) {
  const safeDuration = Number.isFinite(durationSeconds) ? (durationSeconds ?? 0) : 0;

  if (safeDuration >= 180) {
    return 18;
  }

  if (safeDuration >= 120) {
    return 24;
  }

  if (safeDuration >= 90) {
    return 28;
  }

  if (safeDuration >= 60) {
    return 36;
  }

  if (safeDuration >= 30) {
    return 48;
  }

  return 72;
}

export function AudioWaveformPanel({
  file,
  trimEnabled,
  trimStart,
  trimEnd,
  playbackRate,
  onTrimChange,
}: AudioWaveformPanelProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const timelineRef = useRef<HTMLDivElement>(null);
  const wavesurferRef = useRef<WaveSurfer | null>(null);
  const regionPluginRef = useRef<RegionsPlugin | null>(null);
  const regionRef = useRef<Region | null>(null);
  const syncingRegionRef = useRef(false);
  const onTrimChangeRef = useRef(onTrimChange);
  const dragSelectionCleanupRef = useRef<(() => void) | null>(null);

  const [ready, setReady] = useState(false);
  const [playing, setPlaying] = useState(false);
  const recommendedZoom = getInitialZoom(file?.durationSeconds);
  const [zoom, setZoom] = useState(recommendedZoom);
  const [currentTime, setCurrentTime] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [waveformReady, setWaveformReady] = useState(false);
  const [loadingPercent, setLoadingPercent] = useState(0);

  const duration = ready ? wavesurferRef.current?.getDuration() || file?.durationSeconds || 0 : file?.durationSeconds || 0;
  const isLoadingWaveform = Boolean(file) && !waveformReady && !error;
  const waveformContentWidth = Math.max(360, Math.ceil(Math.max(duration, file?.durationSeconds ?? 0, 10) * zoom));

  useEffect(() => {
    onTrimChangeRef.current = onTrimChange;
  }, [onTrimChange]);

  useEffect(() => {
    setZoom(recommendedZoom);

    const wavesurfer = wavesurferRef.current;
    if (!wavesurfer || wavesurfer.options.minPxPerSec === recommendedZoom) {
      return;
    }

    wavesurfer.setOptions({
      minPxPerSec: recommendedZoom,
    });
    wavesurfer.setScroll(0);
  }, [recommendedZoom, file?.id]);

  useEffect(() => {
    if (file || !wavesurferRef.current) {
      return;
    }

    dragSelectionCleanupRef.current?.();
    dragSelectionCleanupRef.current = null;
    regionRef.current = null;
    regionPluginRef.current = null;
    wavesurferRef.current.destroy();
    wavesurferRef.current = null;
    setReady(false);
    setPlaying(false);
    setCurrentTime(0);
    setWaveformReady(false);
    setLoadingPercent(0);
    setError(null);
  }, [file]);

  useEffect(() => {
    if (!file || !containerRef.current || !timelineRef.current || wavesurferRef.current) {
      return;
    }

    let wavesurfer: WaveSurfer | null = null;
    let regions: RegionsPlugin | null = null;

    try {
      regions = RegionsPlugin.create();
      const timeline = TimelinePlugin.create({
        container: timelineRef.current,
        height: 22,
        style: {
          color: "rgba(226,232,240,0.8)",
        },
      });
      wavesurfer = WaveSurfer.create({
        container: containerRef.current,
        height: 156,
        waveColor: ["rgba(34, 211, 238, 0.95)", "rgba(96, 165, 250, 0.75)"],
        progressColor: ["rgba(248, 250, 252, 0.95)", "rgba(191, 219, 254, 0.95)"],
        cursorColor: "#f8fafc",
        cursorWidth: 2,
        dragToSeek: {
          debounceTime: 80,
        },
        autoScroll: false,
        autoCenter: false,
        fillParent: true,
        hideScrollbar: true,
        minPxPerSec: recommendedZoom,
        normalize: true,
        audioRate: 1,
        backend: "WebAudio",
        plugins: [regions, timeline],
      });
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Waveform could not be opened for this file.");
      return;
    }

    wavesurferRef.current = wavesurfer;
    regionPluginRef.current = regions;

    wavesurfer.on("load", () => {
      setLoadingPercent(0);
      setWaveformReady(false);
      setError(null);
    });
    wavesurfer.on("loading", (percent) => {
      setLoadingPercent(percent);
    });
    wavesurfer.on("decode", () => {
      setLoadingPercent(100);
    });
    wavesurfer.on("ready", () => {
      setReady(true);
      setCurrentTime(0);
      wavesurfer.setScroll(0);
    });
    wavesurfer.on("redrawcomplete", () => setWaveformReady(true));
    wavesurfer.on("play", () => setPlaying(true));
    wavesurfer.on("pause", () => setPlaying(false));
    wavesurfer.on("timeupdate", (time) => setCurrentTime(time));
    wavesurfer.on("error", (nextError) => {
      setError(nextError.message || "The browser could not render a waveform for this file.");
      setWaveformReady(false);
    });

    regions.on("region-created", (region) => {
      if (regionRef.current && regionRef.current.id !== region.id) {
        regionRef.current.remove();
      }

      regionRef.current = region;
      onTrimChangeRef.current({
        start: region.start,
        end: region.end,
      });
    });

    regions.on("region-updated", (region) => {
      if (syncingRegionRef.current) {
        return;
      }

      regionRef.current = region;
      onTrimChangeRef.current({
        start: region.start,
        end: region.end,
      });
    });

    regions.on("region-clicked", (region, event) => {
      event.stopPropagation();
      region.play(true);
    });
  }, [file, recommendedZoom]);

  useEffect(() => {
    return () => {
      dragSelectionCleanupRef.current?.();
      dragSelectionCleanupRef.current = null;
      regionRef.current = null;
      regionPluginRef.current = null;
      wavesurferRef.current?.destroy();
      wavesurferRef.current = null;
    };
  }, []);

  useEffect(() => {
    const wavesurfer = wavesurferRef.current;
    const regions = regionPluginRef.current;
    if (!wavesurfer || !file) {
      return;
    }

    setReady(false);
    setPlaying(false);
    setCurrentTime(0);
    setError(null);
    setWaveformReady(false);
    setLoadingPercent(0);
    regionRef.current = null;
    regions?.clearRegions();
    wavesurfer.stop();
    wavesurfer.setScroll(0);

    void wavesurfer.loadBlob(file.file).catch((nextError) => {
      setError(nextError instanceof Error ? nextError.message : "Waveform could not be opened for this file.");
      setWaveformReady(false);
    });
  }, [file]);

  useEffect(() => {
    const regionPlugin = regionPluginRef.current;
    if (!regionPlugin || !ready) {
      return;
    }

    dragSelectionCleanupRef.current?.();
    dragSelectionCleanupRef.current = null;

    if (!trimEnabled) {
      return;
    }

    dragSelectionCleanupRef.current = regionPlugin.enableDragSelection(
      {
        color: "rgba(56, 189, 248, 0.22)",
        drag: true,
        resize: true,
      },
      2
    );

    return () => {
      dragSelectionCleanupRef.current?.();
      dragSelectionCleanupRef.current = null;
    };
  }, [ready, trimEnabled]);

  useEffect(() => {
    if (!wavesurferRef.current) {
      return;
    }

    wavesurferRef.current.setOptions({ audioRate: playbackRate });
  }, [playbackRate]);

  useEffect(() => {
    if (!wavesurferRef.current || !file) {
      return;
    }

    if (wavesurferRef.current.options.minPxPerSec === zoom) {
      return;
    }

    wavesurferRef.current.zoom(zoom);
  }, [file, zoom]);

  useEffect(() => {
    const wavesurfer = wavesurferRef.current;
    const regionPlugin = regionPluginRef.current;
    if (!wavesurfer || !regionPlugin || !ready) {
      return;
    }

    if (!trimEnabled) {
      regionRef.current?.remove();
      regionRef.current = null;
      return;
    }

    syncingRegionRef.current = true;

    const resolvedDuration = wavesurfer.getDuration() || file?.durationSeconds || 0;
    const safeStart = Math.min(Math.max(0, trimStart), resolvedDuration);
    const rawEnd = trimEnd ?? resolvedDuration;
    const safeEnd = Math.min(Math.max(safeStart + 0.05, rawEnd), resolvedDuration);

    if (!Number.isFinite(resolvedDuration) || resolvedDuration <= 0 || safeEnd <= safeStart) {
      syncingRegionRef.current = false;
      return;
    }

    if (!regionRef.current) {
      try {
        regionRef.current = regionPlugin.addRegion({
          start: safeStart,
          end: safeEnd,
          color: "rgba(56, 189, 248, 0.18)",
          drag: true,
          resize: true,
        });
      } catch (nextError) {
        setError(nextError instanceof Error ? nextError.message : "Trim selection could not be prepared.");
        syncingRegionRef.current = false;
        return;
      }
    } else {
      try {
        regionRef.current.setOptions({
          start: safeStart,
          end: safeEnd,
        });
      } catch (nextError) {
        setError(nextError instanceof Error ? nextError.message : "Trim selection could not be updated.");
      }
    }

    window.setTimeout(() => {
      syncingRegionRef.current = false;
    }, 0);
  }, [file?.durationSeconds, ready, trimEnabled, trimEnd, trimStart]);

  if (!file) {
    return <AudioWaveformFallback file={file} />;
  }

  if (error && !waveformReady) {
    return <AudioWaveformFallback file={file} error={error} />;
  }

  return (
    <section className="glass-card rounded-[22px] p-3 sm:rounded-[28px] sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="break-all text-sm font-semibold text-app-text">{file.file.name}</p>
          <p className="mt-1 text-xs text-app-muted">
            {formatDuration(duration)} • {trimEnabled ? "Drag handles or use the trim boxes" : "Preview mode"}
          </p>
        </div>

        <div className="self-start rounded-full bg-app-secondary px-3 py-1.5 text-[11px] font-semibold text-app-text">
          {trimEnabled ? "Trim ready" : "Preview only"}
        </div>
      </div>

      <div className="mt-3 overflow-hidden rounded-[20px] border border-app-border bg-slate-950 text-white shadow-[0_24px_64px_-44px_rgba(15,23,42,0.8)] sm:mt-4 sm:rounded-[24px]">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-300 sm:py-2.5 sm:text-[11px]">
          <span>Waveform preview</span>
          <span>{waveformContentWidth > 960 ? "Horizontal scroll enabled" : "Auto fit"}</span>
        </div>

        <div className="audio-panel-scroll overflow-x-auto px-2 py-2.5 sm:px-3 sm:py-3">
          <div className="min-w-full" style={{ minWidth: `${waveformContentWidth}px` }}>
            <div className="relative">
              <div ref={containerRef} className="audio-waveform min-h-[132px] sm:min-h-[180px]" />
              {isLoadingWaveform ? (
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-[20px] bg-slate-950/72">
                  <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-slate-900/90 px-3 py-2 text-xs font-semibold text-slate-100 shadow-lg">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>{loadingPercent > 0 ? `${loadingPercent}%` : "Loading"}</span>
                  </div>
                </div>
              ) : null}
            </div>
            <div ref={timelineRef} className="audio-waveform mt-2 min-h-[24px] px-1 sm:min-h-[26px]" />
          </div>
        </div>

        <div className="border-t border-white/10 px-3 py-2 text-[10px] text-slate-300 sm:text-[11px]">
          Swipe or scroll sideways to review long clips without stretching the page.
        </div>
      </div>

      <div className="mt-3 flex flex-col gap-3 sm:mt-4">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="btn-primary min-h-[42px] min-w-[96px] flex-1 gap-2 !rounded-full !px-3 sm:min-h-0 sm:min-w-[116px] sm:flex-none sm:!px-4"
            onClick={() => {
              void wavesurferRef.current?.playPause();
            }}
            disabled={!ready}
          >
            {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            <span>{playing ? "Pause" : "Play"}</span>
          </button>

          <button
            type="button"
            className="btn-secondary min-h-[42px] min-w-[96px] flex-1 gap-2 !rounded-full !px-3 sm:min-h-0 sm:min-w-[116px] sm:flex-none sm:!px-4"
            onClick={() => {
              if (regionRef.current) {
                regionRef.current.play(true);
                return;
              }

              if (trimEnabled && wavesurferRef.current) {
                const safeStart = Math.min(Math.max(0, trimStart), duration);
                const safeEnd = Math.min(Math.max(safeStart + 0.05, trimEnd ?? duration), duration);
                void wavesurferRef.current.play(safeStart, safeEnd);
              }
            }}
            disabled={!ready || (!trimEnabled && !regionRef.current)}
          >
            <Scissors className="h-4 w-4" />
            <span>Play cut</span>
          </button>

          <button
            type="button"
            className="btn-secondary min-h-[42px] min-w-[96px] flex-1 gap-2 !rounded-full !px-3 sm:min-h-0 sm:min-w-[116px] sm:flex-none sm:!px-4"
            onClick={() => {
              onTrimChange({ start: 0, end: duration });
              wavesurferRef.current?.setTime(0);
            }}
            disabled={!ready}
          >
            <RotateCcw className="h-4 w-4" />
            <span>Reset</span>
          </button>
        </div>

        <div className="flex flex-col gap-3 rounded-[18px] border border-app-border bg-app-card/70 px-3 py-3 sm:rounded-[22px] sm:flex-row sm:items-center sm:justify-between">
          <div className="inline-flex items-center gap-1.5 text-xs text-app-muted">
            <MoveHorizontal className="h-3.5 w-3.5" />
            <p>{trimEnabled ? "Drag the trim region or scroll the graph" : "Scroll the graph to inspect audio"}</p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
            <p className="text-xs font-semibold text-app-text">
              {formatDuration(currentTime)} / {formatDuration(duration)}
            </p>
            <label className="flex min-w-0 items-center gap-3" htmlFor="audio-waveform-zoom">
              <span className="shrink-0 text-xs font-semibold uppercase tracking-[0.14em] text-app-muted">Zoom</span>
              <input
                id="audio-waveform-zoom"
                type="range"
                min={16}
                max={180}
                step={2}
                value={zoom}
                onChange={(event) => setZoom(Number(event.target.value))}
                className="w-full min-w-[120px] accent-brand sm:w-32"
              />
            </label>
          </div>
        </div>
      </div>

      {error && waveformReady ? <p className="mt-3 rounded-2xl bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p> : null}
    </section>
  );
}
