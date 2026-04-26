import type { EditMode } from "./types";

interface ImageTransformPanelProps {
  mode: EditMode;
  hasCropRect: boolean;
  hasImage: boolean;
  processing: boolean;
  onModeChange: (mode: EditMode) => void;
  onApplyCrop: () => void;
  onRotateLeft: () => void;
  onRotateRight: () => void;
  onFlipHorizontal: () => void;
  onFlipVertical: () => void;
  onDownloadCurrent: () => void;
}

export function ImageTransformPanel({
  mode,
  hasCropRect,
  hasImage,
  processing,
  onModeChange,
  onApplyCrop,
  onRotateLeft,
  onRotateRight,
  onFlipHorizontal,
  onFlipVertical,
  onDownloadCurrent,
}: ImageTransformPanelProps) {
  return (
    <div className="space-y-2.5">
      <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
        <button
          type="button"
          className={
            mode === "crop"
              ? "tab-active w-full rounded-[18px] px-3 py-2 text-[10px] font-semibold leading-tight sm:rounded-full sm:text-xs"
              : "tab-inactive w-full rounded-[18px] px-3 py-2 text-[10px] leading-tight sm:rounded-full sm:text-xs"
          }
          onClick={() => onModeChange("crop")}
        >
          Select Crop Area
        </button>
        <button type="button" className="btn-secondary !px-3 !py-2 text-xs" onClick={onApplyCrop} disabled={!hasCropRect || processing}>
          Apply Crop
        </button>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <button type="button" className="btn-secondary !px-2.5 !py-2 text-[11px]" onClick={onRotateLeft} disabled={!hasImage || processing}>Rotate Left</button>
        <button type="button" className="btn-secondary !px-2.5 !py-2 text-[11px]" onClick={onRotateRight} disabled={!hasImage || processing}>Rotate Right</button>
        <button type="button" className="btn-secondary !px-2.5 !py-2 text-[11px]" onClick={onFlipHorizontal} disabled={!hasImage || processing}>Flip H</button>
        <button type="button" className="btn-secondary !px-2.5 !py-2 text-[11px]" onClick={onFlipVertical} disabled={!hasImage || processing}>Flip V</button>
      </div>
      <button type="button" className="btn-secondary w-full !px-3 !py-2 text-xs" onClick={onDownloadCurrent} disabled={!hasImage || processing}>
        Download Current Image
      </button>
    </div>
  );
}
