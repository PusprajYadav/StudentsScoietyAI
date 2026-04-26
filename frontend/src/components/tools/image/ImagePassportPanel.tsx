import type { PassportPreset } from "./types";

interface ImagePassportPanelProps {
  presets: PassportPreset[];
  presetId: string;
  layout: "single" | "sheet4";
  hasImage: boolean;
  processing: boolean;
  onPresetChange: (value: string) => void;
  onLayoutChange: (value: "single" | "sheet4") => void;
  onGenerate: () => void;
  onDownloadCurrent: () => void;
}

export function ImagePassportPanel({
  presets,
  presetId,
  layout,
  hasImage,
  processing,
  onPresetChange,
  onLayoutChange,
  onGenerate,
  onDownloadCurrent,
}: ImagePassportPanelProps) {
  return (
    <div className="space-y-2.5">
      <label className="block text-xs font-medium text-app-muted">
        Preset
        <select className="input-field" value={presetId} onChange={(event) => onPresetChange(event.target.value)}>
          {presets.map((preset) => (
            <option key={preset.id} value={preset.id}>
              {preset.label}
            </option>
          ))}
        </select>
      </label>
      <label className="block text-xs font-medium text-app-muted">
        Layout
        <select className="input-field" value={layout} onChange={(event) => onLayoutChange(event.target.value as "single" | "sheet4")}>
          <option value="single">Single photo</option>
          <option value="sheet4">2 x 2 sheet (4 photos)</option>
        </select>
      </label>
      <div className="grid gap-2">
        <button type="button" className="btn-secondary w-full !px-3 !py-2 text-xs" onClick={onGenerate} disabled={!hasImage || processing}>
          Generate Passport Output
        </button>
        <button type="button" className="btn-secondary w-full !px-3 !py-2 text-xs" onClick={onDownloadCurrent} disabled={!hasImage || processing}>
          Download Current Image
        </button>
      </div>
    </div>
  );
}
