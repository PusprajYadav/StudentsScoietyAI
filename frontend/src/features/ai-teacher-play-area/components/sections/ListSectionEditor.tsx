import { Plus, Trash2 } from "lucide-react";
import type { PlayAreaDocument, PlayAreaItemRow, PlayAreaSection } from "../../types";
import { createEditorId, getFontScaleValue, handwritingStyle } from "../../utils";
import { AutoGrowTextarea } from "../AutoGrowTextarea";

export function ListSectionEditor({
  documentData,
  section,
  onChange,
}: {
  documentData: PlayAreaDocument;
  section: PlayAreaSection;
  onChange: (nextSection: PlayAreaSection) => void;
}) {
  const isSteps = section.type === "steps";
  const fontScale = getFontScaleValue(documentData.appearance.fontScale);

  function updateItem(itemId: string, updater: (item: PlayAreaItemRow) => PlayAreaItemRow) {
    onChange({
      ...section,
      items: section.items.map((candidate) => (candidate.id === itemId ? updater(candidate) : candidate)),
    });
  }

  return (
    <div className="min-w-0 space-y-3">
      {section.items.map((item, itemIndex) => (
        <div key={item.id} className="rounded-[20px] border border-white/80 bg-white/82 p-3 shadow-[0_16px_28px_-26px_rgba(15,23,42,0.28)] sm:rounded-[24px] sm:p-4">
          <div className="flex items-start justify-between gap-3">
            <div
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-slate-900 sm:mt-1 sm:h-10 sm:w-10"
              style={{ backgroundColor: item.highlightColor || section.highlightColor }}
            >
              {isSteps ? itemIndex + 1 : "•"}
            </div>
            <button
              type="button"
              onClick={() =>
                onChange({
                  ...section,
                  items: section.items.filter((candidate) => candidate.id !== item.id),
                })
              }
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 transition hover:border-rose-200 hover:text-rose-600 sm:h-10 sm:w-10"
              aria-label="Remove row"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
          <div className="mt-3 min-w-0 space-y-2.5 sm:space-y-3">
            <input
              value={item.title}
              onChange={(event) => updateItem(item.id, (current) => ({ ...current, title: event.target.value }))}
              className="w-full rounded-[16px] border border-slate-200/70 bg-white/75 px-3 py-2 text-sm font-semibold text-slate-900 outline-none transition focus:border-slate-400"
              placeholder={isSteps ? `Step ${itemIndex + 1}` : "Optional title"}
            />
            <AutoGrowTextarea
              value={item.text}
              onChange={(value) => updateItem(item.id, (current) => ({ ...current, text: value }))}
              className="w-full rounded-[18px] border border-slate-200/70 bg-white/75 px-3 py-2.5 text-[1.04rem] leading-7 outline-none transition focus:border-slate-400"
              style={{ ...handwritingStyle, fontSize: `${1.04 * fontScale}rem` }}
              minRows={3}
              placeholder="Write item text"
            />
          </div>
        </div>
      ))}

      <button
        type="button"
        onClick={() =>
          onChange({
            ...section,
            items: [
              ...section.items,
              {
                id: createEditorId("item"),
                title: isSteps ? `Step ${section.items.length + 1}` : "",
                text: "",
                highlightColor: section.highlightColor,
              },
            ],
          })
        }
        className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-slate-200 bg-white/92 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-slate-300 sm:w-auto"
      >
        <Plus className="h-4 w-4" />
        Add row
      </button>
    </div>
  );
}
