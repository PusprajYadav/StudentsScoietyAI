import type { ReactNode } from "react";
import { ChevronDown, ChevronUp, Trash2 } from "lucide-react";
import type { PlayAreaDocument, PlayAreaSection } from "../types";
import { buildPaperStyle } from "../utils";

export function SectionWrapper({
  documentData,
  section,
  children,
  onTitleChange,
  onKickerChange,
  onMoveUp,
  onMoveDown,
  canMoveUp,
  canMoveDown,
  onRemove,
}: {
  documentData: PlayAreaDocument;
  section: PlayAreaSection;
  children: ReactNode;
  onTitleChange: (value: string) => void;
  onKickerChange: (value: string) => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onRemove: () => void;
}) {
  return (
    <section className="min-w-0 rounded-[22px] border border-white/70 p-3 shadow-[0_24px_54px_-40px_rgba(15,23,42,0.45)] sm:rounded-[28px] sm:p-4" style={buildPaperStyle(documentData, section.highlightColor)}>
      <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1 pl-3 sm:pl-10">
          <input
            value={section.kicker}
            onChange={(event) => onKickerChange(event.target.value)}
            className="w-full bg-transparent text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500 outline-none sm:text-[11px] sm:tracking-[0.22em]"
            placeholder="Section label"
          />
          <input
            value={section.title}
            onChange={(event) => onTitleChange(event.target.value)}
            className="mt-1 w-full bg-transparent text-[1.18rem] font-semibold tracking-tight outline-none sm:text-[1.45rem]"
            style={{ color: documentData.appearance.inkColor }}
            placeholder="Section title"
          />
        </div>

        <div className="flex items-center justify-end gap-1.5 self-end sm:self-auto sm:gap-2">
          <button
            type="button"
            onClick={onMoveUp}
            disabled={!canMoveUp}
            className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white/90 text-slate-500 transition hover:border-slate-300 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-40 sm:h-10 sm:w-10"
            aria-label="Move section up"
          >
            <ChevronUp className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={onMoveDown}
            disabled={!canMoveDown}
            className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white/90 text-slate-500 transition hover:border-slate-300 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-40 sm:h-10 sm:w-10"
            aria-label="Move section down"
          >
            <ChevronDown className="h-4 w-4" />
          </button>
          <button type="button" onClick={onRemove} className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white/90 text-slate-500 transition hover:border-rose-200 hover:text-rose-600 sm:h-10 sm:w-10" aria-label="Remove section">
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="mt-3 min-w-0 pl-0 sm:mt-4 sm:pl-10">{children}</div>
    </section>
  );
}
