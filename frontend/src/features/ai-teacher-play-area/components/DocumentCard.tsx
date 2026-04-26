import type { PlayAreaDocument } from "../types";
import { formatDateLabel } from "../utils";

export function DocumentCard({
  documentData,
  active,
  onOpen,
}: {
  documentData: PlayAreaDocument;
  active: boolean;
  onOpen: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className={`w-full shrink-0 snap-start rounded-[18px] border px-2.5 py-2.5 text-left transition min-w-[210px] max-w-[228px] sm:min-w-0 sm:max-w-none sm:rounded-[22px] sm:px-4 sm:py-3 ${
        active ? "border-slate-900 bg-white shadow-[0_16px_34px_-28px_rgba(15,23,42,0.35)]" : "border-slate-200/70 bg-white/70 hover:border-slate-300 hover:bg-white"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="line-clamp-1 text-[12px] font-semibold text-slate-900 sm:text-sm">{documentData.title}</p>
          <p className="mt-1 line-clamp-2 text-[10px] leading-4 text-slate-500 sm:text-xs sm:leading-5">{documentData.subtitle || documentData.summary || "Saved PlayArea document"}</p>
        </div>
        <span className="shrink-0 rounded-full bg-slate-100 px-1.5 py-0.5 text-[8px] font-semibold uppercase tracking-[0.14em] text-slate-500 sm:px-2 sm:py-1 sm:text-[10px] sm:tracking-[0.16em]">
          {documentData.sections.length} sections
        </span>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-1 sm:mt-3 sm:gap-2">
        {documentData.tags.slice(0, 3).map((tag) => (
          <span key={tag} className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[8px] font-medium text-slate-500 sm:px-2 sm:py-1 sm:text-[10px]">
            {tag}
          </span>
        ))}
        <span className="text-[9px] text-slate-400 sm:text-[11px]">{formatDateLabel(documentData.updatedAt)}</span>
      </div>
    </button>
  );
}
