import { Sparkles } from "lucide-react";
import type { AiTeacherToolType } from "../types";
import { TOOL_OPTIONS, getToolOption } from "../ui";
import { ToolModeButton } from "./ToolModeButton";

export function EmptyChatState({
  toolType,
  onToolChange,
  fullscreen = false,
}: {
  toolType: AiTeacherToolType;
  onToolChange: (toolType: AiTeacherToolType) => void;
  fullscreen?: boolean;
}) {
  const tool = getToolOption(toolType);
  const ToolIcon = tool.icon;

  return (
    <section className={`flex px-1 py-2 ${fullscreen ? "min-h-[34vh] items-start" : "min-h-[24vh] items-center justify-center"} sm:px-2 sm:py-4 sm:min-h-[34vh]`}>
      <div
        className={`w-full rounded-[22px] border border-slate-200 bg-[radial-gradient(circle_at_top_left,_rgba(56,189,248,0.14),_transparent_28%),radial-gradient(circle_at_bottom_right,_rgba(251,191,36,0.12),_transparent_26%),linear-gradient(180deg,rgba(255,255,255,0.98),rgba(248,250,252,0.98))] p-3.5 shadow-[0_24px_60px_-44px_rgba(15,23,42,0.4)] sm:rounded-[28px] sm:p-5 ${
          fullscreen ? "max-w-6xl" : "max-w-3xl"
        }`}
      >
        <div className={`flex flex-col gap-3 sm:gap-4 ${fullscreen ? "lg:flex-row lg:items-start lg:justify-between" : "sm:flex-row sm:items-end sm:justify-between"}`}>
          <div className="min-w-0">
            <div className="inline-flex items-center gap-1.5 rounded-full border border-white/90 bg-white/90 px-2.5 py-1 text-[9px] font-semibold uppercase tracking-[0.18em] text-slate-500 shadow-sm sm:gap-2 sm:px-3 sm:text-[10px]">
              <Sparkles className="h-3 w-3 text-slate-700 sm:h-3.5 sm:w-3.5" />
              One chat, all study modes
            </div>
            <h2 className="mt-2.5 text-[1.7rem] font-semibold leading-[1.05] tracking-tight text-slate-900 sm:mt-3 sm:text-[2rem]">
              Notebook-quality learning in one screen
            </h2>
            <p className="mt-1.5 max-w-xl text-[12.5px] leading-5 text-slate-600 sm:mt-2 sm:text-sm sm:leading-6">
              Upload once, switch modes instantly, get clearer notes, and practice with quizzes that check answers right away.
            </p>

            <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/92 px-3 py-2 text-[11px] font-semibold text-slate-900 shadow-sm sm:hidden">
              <ToolIcon className="h-3.5 w-3.5" />
              <span className="truncate">{tool.promptLabel}</span>
            </div>
          </div>

          <div className="hidden rounded-[22px] border border-white/90 bg-white/85 px-4 py-3 shadow-sm sm:block">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">Active mode</p>
            <div className="mt-2 inline-flex items-center gap-2 rounded-full bg-slate-900 px-3 py-2 text-xs font-semibold text-white">
              <ToolIcon className="h-4 w-4" />
              <span>{tool.promptLabel}</span>
            </div>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-1.5 sm:hidden">
          {TOOL_OPTIONS.map((option) => (
            <ToolModeButton
              key={option.id}
              option={option}
              active={option.id === toolType}
              onClick={() => onToolChange(option.id)}
              compact
              showActiveLabel={false}
            />
          ))}
        </div>

        <div className="mt-4 hidden flex-wrap items-center gap-2 sm:flex">
          {TOOL_OPTIONS.map((option) => (
            <ToolModeButton
              key={option.id}
              option={option}
              active={option.id === toolType}
              onClick={() => onToolChange(option.id)}
            />
          ))}
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <span className="rounded-full border border-slate-200 bg-white/85 px-3 py-1.5 text-[11px] font-medium text-slate-600">
            Notebook notes
          </span>
          <span className="rounded-full border border-slate-200 bg-white/85 px-3 py-1.5 text-[11px] font-medium text-slate-600">
            3-question quiz by default
          </span>
          <span className="rounded-full border border-slate-200 bg-white/85 px-3 py-1.5 text-[11px] font-medium text-slate-600">
            Instant answer check
          </span>
        </div>
      </div>
    </section>
  );
}
