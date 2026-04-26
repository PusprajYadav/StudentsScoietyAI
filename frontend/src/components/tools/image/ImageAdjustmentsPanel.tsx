interface ImageAdjustmentsPanelProps {
  brightness: number;
  contrast: number;
  saturation: number;
  hasImage: boolean;
  processing: boolean;
  onBrightnessChange: (value: number) => void;
  onContrastChange: (value: number) => void;
  onSaturationChange: (value: number) => void;
  onApplyAdjustments: () => void;
  onDownloadCurrent: () => void;
}

export function ImageAdjustmentsPanel({
  brightness,
  contrast,
  saturation,
  hasImage,
  processing,
  onBrightnessChange,
  onContrastChange,
  onSaturationChange,
  onApplyAdjustments,
  onDownloadCurrent,
}: ImageAdjustmentsPanelProps) {
  return (
    <div className="space-y-2.5">
      <label className="block text-xs font-medium text-app-muted">
        Brightness ({brightness})
        <input
          type="range"
          min={-80}
          max={80}
          value={brightness}
          onChange={(event) => onBrightnessChange(Number(event.target.value))}
          className="mt-2 h-2 w-full cursor-pointer appearance-none rounded-full bg-brand/15"
        />
      </label>
      <label className="block text-xs font-medium text-app-muted">
        Contrast ({contrast})
        <input
          type="range"
          min={-80}
          max={80}
          value={contrast}
          onChange={(event) => onContrastChange(Number(event.target.value))}
          className="mt-2 h-2 w-full cursor-pointer appearance-none rounded-full bg-brand/15"
        />
      </label>
      <label className="block text-xs font-medium text-app-muted">
        Saturation ({saturation})
        <input
          type="range"
          min={-80}
          max={80}
          value={saturation}
          onChange={(event) => onSaturationChange(Number(event.target.value))}
          className="mt-2 h-2 w-full cursor-pointer appearance-none rounded-full bg-brand/15"
        />
      </label>
      <div className="grid gap-2">
        <button type="button" className="btn-secondary w-full !px-3 !py-2 text-xs" onClick={onApplyAdjustments} disabled={!hasImage || processing}>
          Apply Adjustments
        </button>
        <button type="button" className="btn-secondary w-full !px-3 !py-2 text-xs" onClick={onDownloadCurrent} disabled={!hasImage || processing}>
          Download Current Image
        </button>
      </div>
    </div>
  );
}
