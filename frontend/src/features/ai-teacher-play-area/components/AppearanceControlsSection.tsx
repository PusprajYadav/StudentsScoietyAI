import { Palette } from "lucide-react";
import {
  PLAY_AREA_ACCENT_COLORS,
  PLAY_AREA_DESK_TONES,
  PLAY_AREA_FONT_SCALES,
  PLAY_AREA_HIGHLIGHT_COLORS,
  PLAY_AREA_INK_COLORS,
  PLAY_AREA_PAPER_STYLES,
  PLAY_AREA_PAPER_TONES,
} from "../storage";
import type { PlayAreaDocument } from "../types";
import { ColorSwatchPicker } from "./ColorSwatchPicker";

export function AppearanceControlsSection({
  activeDocument,
  onUpdateAppearance,
  className = "",
}: {
  activeDocument: PlayAreaDocument;
  onUpdateAppearance: (updater: (documentData: PlayAreaDocument) => PlayAreaDocument) => void;
  className?: string;
}) {
  const sectionClassName = `rounded-[22px] border border-slate-200 bg-white/90 p-3 shadow-[0_24px_46px_-38px_rgba(15,23,42,0.22)] sm:rounded-[28px] sm:p-4 ${
    className || ""
  }`.trim();

  return (
    <section className={sectionClassName}>
      <div className="flex items-center gap-2">
        <Palette className="h-4 w-4 text-slate-500" />
        <p className="text-sm font-semibold text-slate-900">Appearance</p>
      </div>

      <div className="mt-3 space-y-3 sm:mt-4 sm:space-y-4">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500 sm:text-[11px] sm:tracking-[0.18em]">Paper Style</p>
          <div className="mt-2 -mx-1 flex snap-x snap-mandatory gap-1.5 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0 sm:pb-0 sm:gap-2">
            {PLAY_AREA_PAPER_STYLES.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() =>
                  onUpdateAppearance((documentData) => ({
                    ...documentData,
                    appearance: { ...documentData.appearance, paperStyle: option.value },
                  }))
                }
                className={`shrink-0 snap-start rounded-full px-2.5 py-1 text-[10px] font-semibold transition sm:px-3 sm:py-1.5 sm:text-[11px] ${
                  activeDocument.appearance.paperStyle === option.value
                    ? "bg-slate-900 text-white"
                    : "border border-slate-200 bg-white text-slate-600"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <ColorSwatchPicker
          label="Desk"
          options={PLAY_AREA_DESK_TONES}
          value={activeDocument.appearance.deskTone}
          onChange={(value) =>
            onUpdateAppearance((documentData) => ({
              ...documentData,
              appearance: { ...documentData.appearance, deskTone: value },
            }))
          }
        />
        <ColorSwatchPicker
          label="Paper"
          options={PLAY_AREA_PAPER_TONES}
          value={activeDocument.appearance.paperTone}
          onChange={(value) =>
            onUpdateAppearance((documentData) => ({
              ...documentData,
              appearance: { ...documentData.appearance, paperTone: value },
            }))
          }
        />
        <ColorSwatchPicker
          label="Ink"
          options={PLAY_AREA_INK_COLORS}
          value={activeDocument.appearance.inkColor}
          onChange={(value) =>
            onUpdateAppearance((documentData) => ({
              ...documentData,
              appearance: { ...documentData.appearance, inkColor: value },
            }))
          }
        />
        <ColorSwatchPicker
          label="Accent"
          options={PLAY_AREA_ACCENT_COLORS}
          value={activeDocument.appearance.accentColor}
          onChange={(value) =>
            onUpdateAppearance((documentData) => ({
              ...documentData,
              appearance: { ...documentData.appearance, accentColor: value },
            }))
          }
        />
        <ColorSwatchPicker
          label="Highlight"
          options={PLAY_AREA_HIGHLIGHT_COLORS}
          value={activeDocument.appearance.highlightColor}
          onChange={(value) =>
            onUpdateAppearance((documentData) => ({
              ...documentData,
              appearance: { ...documentData.appearance, highlightColor: value },
            }))
          }
        />

        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500 sm:text-[11px] sm:tracking-[0.18em]">Text Size</p>
          <div className="mt-2 -mx-1 flex snap-x snap-mandatory gap-1.5 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0 sm:pb-0 sm:gap-2">
            {PLAY_AREA_FONT_SCALES.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() =>
                  onUpdateAppearance((documentData) => ({
                    ...documentData,
                    appearance: { ...documentData.appearance, fontScale: option.value },
                  }))
                }
                className={`shrink-0 snap-start rounded-full px-2.5 py-1 text-[10px] font-semibold transition sm:px-3 sm:py-1.5 sm:text-[11px] ${
                  activeDocument.appearance.fontScale === option.value
                    ? "bg-slate-900 text-white"
                    : "border border-slate-200 bg-white text-slate-600"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
