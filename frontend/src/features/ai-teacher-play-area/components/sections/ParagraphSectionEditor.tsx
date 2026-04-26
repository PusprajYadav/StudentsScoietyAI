import type { PlayAreaDocument, PlayAreaSection } from "../../types";
import { getFontScaleValue, handwritingStyle } from "../../utils";
import { AutoGrowTextarea } from "../AutoGrowTextarea";

export function ParagraphSectionEditor({
  documentData,
  section,
  onChange,
}: {
  documentData: PlayAreaDocument;
  section: PlayAreaSection;
  onChange: (nextSection: PlayAreaSection) => void;
}) {
  const fontScale = getFontScaleValue(documentData.appearance.fontScale);
  const writingLineHeight = 36;
  const writingRuleOffset = 27;
  const writingPadTop = 10;
  const writingGuideOffset = "2.55rem";
  const writingGuideEdge = "2.63rem";
  const writingGuide =
    `linear-gradient(90deg, transparent 0 ${writingGuideOffset}, rgba(244,63,94,0.14) ${writingGuideOffset} ${writingGuideEdge}, transparent ${writingGuideEdge} 100%)`;
  const writingRules = `repeating-linear-gradient(180deg, transparent 0 ${writingRuleOffset}px, rgba(59,130,246,0.11) ${writingRuleOffset}px ${writingRuleOffset + 1}px, transparent ${writingRuleOffset + 1}px ${writingLineHeight}px)`;

  return (
    <div className="min-w-0 rounded-[20px] border border-white/75 bg-white/70 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)] sm:rounded-[26px] sm:p-5">
      <div
        className="rounded-[20px] border border-slate-200/80 px-3 py-3 shadow-[0_18px_34px_-30px_rgba(15,23,42,0.22)] sm:rounded-[24px] sm:px-5 sm:py-5"
        style={{
          backgroundColor: documentData.appearance.paperTone,
        }}
      >
        <div className="pl-3 sm:pl-8">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Editable note</p>
          <div
            className="mt-3 overflow-hidden rounded-[18px] border border-slate-200/75 bg-white/25 sm:rounded-[20px]"
            style={{
              backgroundColor: documentData.appearance.paperTone,
              backgroundImage:
                documentData.appearance.paperStyle === "plain"
                  ? writingGuide
                  : `${writingGuide}, ${writingRules}`,
              backgroundPosition:
                documentData.appearance.paperStyle === "plain"
                  ? `0 ${writingPadTop}px`
                  : `0 ${writingPadTop}px, 0 ${writingPadTop}px`,
            }}
          >
            <AutoGrowTextarea
              value={section.text}
              onChange={(value) => onChange({ ...section, text: value })}
              className="w-full resize-none bg-transparent pb-3 pl-[3rem] pr-3 pt-[10px] text-[1.02rem] outline-none sm:pl-[3.75rem] sm:pr-4 sm:text-[1.12rem]"
              style={{
                ...handwritingStyle,
                color: documentData.appearance.inkColor,
                fontSize: `${1.12 * fontScale}rem`,
                lineHeight: `${writingLineHeight}px`,
              }}
              minRows={8}
              rowHeightPx={writingLineHeight}
              placeholder="Write your notebook notes here."
            />
          </div>
        </div>
      </div>
    </div>
  );
}
