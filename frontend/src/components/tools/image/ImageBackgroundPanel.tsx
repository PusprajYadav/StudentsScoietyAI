import type { EditMode } from "./types";

interface ImageBackgroundPanelProps {
  mode: EditMode;
  bgTolerance: number;
  brushSize: number;
  pickedColorHex: string | null;
  hasImage: boolean;
  hasPickedColor: boolean;
  processing: boolean;
  onModeChange: (mode: EditMode) => void;
  onToleranceChange: (value: number) => void;
  onBrushSizeChange: (value: number) => void;
  onRemoveSampledBackground: () => void;
  onDownloadCurrent: () => void;
}

export function ImageBackgroundPanel({
  mode,
  bgTolerance,
  brushSize,
  pickedColorHex,
  hasImage,
  hasPickedColor,
  processing,
  onModeChange,
  onToleranceChange,
  onBrushSizeChange,
  onRemoveSampledBackground,
  onDownloadCurrent,
}: ImageBackgroundPanelProps) {
  return (
    <div className="space-y-2.5">
      <div className="pb-1">
        <div className="grid grid-cols-3 gap-2">
          <button
            type="button"
            className={
              mode === "pick_bg"
                ? "tab-active min-h-[40px] w-full rounded-[18px] px-2 py-2 text-[9px] font-semibold leading-tight sm:text-[10px]"
                : "tab-inactive min-h-[40px] w-full rounded-[18px] px-2 py-2 text-[9px] leading-tight sm:text-[10px]"
            }
            onClick={() => onModeChange("pick_bg")}
          >
            Pick BG Color
          </button>
          <button
            type="button"
            className={
              mode === "erase"
                ? "tab-active min-h-[40px] w-full rounded-[18px] px-2 py-2 text-[9px] font-semibold leading-tight sm:text-[10px]"
                : "tab-inactive min-h-[40px] w-full rounded-[18px] px-2 py-2 text-[9px] leading-tight sm:text-[10px]"
            }
            onClick={() => onModeChange("erase")}
          >
            Erase BG Area
          </button>
          <button
            type="button"
            className={
              mode === "none"
                ? "tab-active min-h-[40px] w-full rounded-[18px] px-2 py-2 text-[9px] font-semibold leading-tight sm:text-[10px]"
                : "tab-inactive min-h-[40px] w-full rounded-[18px] px-2 py-2 text-[9px] leading-tight sm:text-[10px]"
            }
            onClick={() => onModeChange("none")}
          >
            Cursor
          </button>
        </div>
      </div>

      <label className="block text-xs font-medium text-app-muted">
        Tolerance ({bgTolerance})
        <input
          type="range"
          min={5}
          max={160}
          value={bgTolerance}
          onChange={(event) => onToleranceChange(Number(event.target.value))}
          className="mt-2 h-2 w-full cursor-pointer appearance-none rounded-full bg-brand/15"
        />
      </label>
      <label className="block text-xs font-medium text-app-muted">
        Eraser size ({brushSize}px)
        <input
          type="range"
          min={6}
          max={80}
          value={brushSize}
          onChange={(event) => onBrushSizeChange(Number(event.target.value))}
          className="mt-2 h-2 w-full cursor-pointer appearance-none rounded-full bg-brand/15"
        />
      </label>
      <div className="flex flex-wrap items-center gap-2 text-xs text-app-muted">
        <span>Sampled color:</span>
        <span className="inline-block h-4 w-4 rounded border border-app-border" style={{ background: pickedColorHex || "transparent" }} />
        <span>{pickedColorHex || "Not selected"}</span>
      </div>

      <div className="grid gap-2">
        <button
          type="button"
          className="btn-primary w-full !px-3 !py-2 text-xs"
          onClick={onRemoveSampledBackground}
          disabled={!hasImage || !hasPickedColor || processing}
        >
          Remove Sampled Background
        </button>
        <button type="button" className="btn-secondary w-full !px-3 !py-2 text-xs" onClick={onDownloadCurrent} disabled={!hasImage || processing}>
          Download Current Image
        </button>
      </div>
    </div>
  );
}
