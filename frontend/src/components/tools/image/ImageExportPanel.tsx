import type { ChangeEvent } from "react";
import type { OutputMimeType } from "./types";

interface ImageExportPanelProps {
  outputType: OutputMimeType;
  outputQuality: number;
  maxWidth: string;
  maxHeight: string;
  hasImage: boolean;
  processing: boolean;
  sourceSize: number | null;
  resultSize: number | null;
  onOutputTypeChange: (value: OutputMimeType) => void;
  onOutputQualityChange: (value: number) => void;
  onMaxWidthChange: (value: string) => void;
  onMaxHeightChange: (value: string) => void;
  onExport: () => void;
  formatBytes: (bytes: number) => string;
}

function compressionPercent(sourceSize: number | null, resultSize: number | null) {
  if (!sourceSize || !resultSize || sourceSize <= 0) return "—";
  const ratio = ((sourceSize - resultSize) / sourceSize) * 100;
  if (!Number.isFinite(ratio)) return "—";
  return `${ratio >= 0 ? ratio.toFixed(1) : `+${Math.abs(ratio).toFixed(1)}`}%`;
}

function onDimensionInput(handler: (value: string) => void) {
  return (event: ChangeEvent<HTMLInputElement>) => {
    handler(event.target.value.replace(/[^0-9]/g, ""));
  };
}

export function ImageExportPanel({
  outputType,
  outputQuality,
  maxWidth,
  maxHeight,
  hasImage,
  processing,
  sourceSize,
  resultSize,
  onOutputTypeChange,
  onOutputQualityChange,
  onMaxWidthChange,
  onMaxHeightChange,
  onExport,
  formatBytes,
}: ImageExportPanelProps) {
  const qualityLabel = outputType === "image/png" ? "Compression level" : "Quality";

  return (
    <div className="space-y-2.5">
      <p className="text-xs text-app-muted">Compress and export</p>
      <label className="block text-xs font-medium text-app-muted">
        Output format
        <select className="input-field" value={outputType} onChange={(event) => onOutputTypeChange(event.target.value as OutputMimeType)}>
          <option value="image/png">PNG</option>
          <option value="image/jpeg">JPG</option>
          <option value="image/webp">WEBP</option>
        </select>
      </label>
      <label className="block text-xs font-medium text-app-muted">
        {qualityLabel} ({outputQuality})
        <input
          type="range"
          min={10}
          max={100}
          value={outputQuality}
          onChange={(event) => onOutputQualityChange(Number(event.target.value))}
          className="mt-2 h-2 w-full cursor-pointer appearance-none rounded-full bg-brand/15"
        />
      </label>
      {outputType === "image/png" ? (
        <p className="text-[11px] text-app-muted">
          Lower level now reduces photo detail and color palette for smaller PNG exports. JPG or WEBP will still compress photo-heavy images more aggressively.
        </p>
      ) : null}

      <div className="grid gap-2 sm:grid-cols-2">
        <label className="block text-xs font-medium text-app-muted">
          Max width (px)
          <input className="input-field" value={maxWidth} placeholder="Auto" inputMode="numeric" onChange={onDimensionInput(onMaxWidthChange)} />
        </label>
        <label className="block text-xs font-medium text-app-muted">
          Max height (px)
          <input className="input-field" value={maxHeight} placeholder="Auto" inputMode="numeric" onChange={onDimensionInput(onMaxHeightChange)} />
        </label>
      </div>

      <div className="rounded-2xl border border-app-border bg-app-secondary/30 p-2 text-xs text-app-muted">
        <p>Original: {sourceSize == null ? "—" : formatBytes(sourceSize)}</p>
        <p>Last export: {resultSize == null ? "—" : formatBytes(resultSize)}</p>
        <p>Compression: {compressionPercent(sourceSize, resultSize)}</p>
      </div>

      <button type="button" className="btn-primary w-full !px-3 !py-2 text-xs" onClick={onExport} disabled={!hasImage || processing}>
        {processing ? "Exporting..." : "Compress and export"}
      </button>
    </div>
  );
}
