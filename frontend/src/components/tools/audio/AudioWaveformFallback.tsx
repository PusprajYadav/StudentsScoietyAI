import { AlertCircle, Music4 } from "lucide-react";
import { formatDuration } from "./helpers";
import type { AudioWorkspaceFile } from "./types";

interface AudioWaveformFallbackProps {
  file: AudioWorkspaceFile | null;
  error?: string | null;
}

export function AudioWaveformFallback({ file, error }: AudioWaveformFallbackProps) {
  if (!file) {
    return (
      <section className="glass-card flex min-h-[260px] flex-col items-center justify-center px-4 py-8 text-center sm:min-h-[280px] sm:px-6">
        <div className="rounded-2xl bg-app-secondary p-3 text-brand">
          <Music4 className="h-6 w-6" />
        </div>
        <p className="mt-3 font-display text-lg font-semibold text-app-text">Audio preview</p>
        <p className="mt-1 text-sm text-app-muted">Upload a file</p>
      </section>
    );
  }

  return (
    <section className="glass-card p-4 sm:p-5">
      <div className="flex items-center gap-3">
        <div className="rounded-2xl bg-app-secondary p-3 text-brand">
          <Music4 className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="break-all text-sm font-semibold text-app-text">{file.file.name}</p>
          <p className="text-xs text-app-muted">{formatDuration(file.durationSeconds)}</p>
        </div>
      </div>

      <div className="mt-4 overflow-hidden rounded-[24px] border border-app-border bg-slate-950 p-4 text-white">
        <audio src={file.objectUrl} controls className="h-12 w-full" preload="metadata" playsInline />
      </div>

      {error ? (
        <div className="mt-4 flex items-start gap-2 rounded-[20px] border border-amber-200 bg-amber-50 px-3 py-3 text-sm text-amber-800">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <p>{error}</p>
        </div>
      ) : null}
    </section>
  );
}
