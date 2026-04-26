import type { ToolOption } from "../ui";

export function ToolModeButton({
  option,
  active,
  onClick,
  compact = false,
  showActiveLabel = true,
}: {
  option: ToolOption;
  active: boolean;
  onClick: () => void;
  compact?: boolean;
  showActiveLabel?: boolean;
}) {
  const Icon = option.icon;
  const renderActiveLabel = active && showActiveLabel;

  return (
    <button
      type="button"
      onClick={onClick}
      title={option.label}
      aria-pressed={active}
      className={
        active
          ? compact
            ? renderActiveLabel
              ? "inline-flex items-center gap-1.5 rounded-full bg-slate-900 px-3 py-2 text-[11px] font-semibold text-white shadow-[0_12px_26px_-18px_rgba(15,23,42,0.72)]"
              : "inline-flex h-10 w-10 items-center justify-center rounded-full bg-slate-900 text-white shadow-[0_12px_26px_-18px_rgba(15,23,42,0.72)]"
            : "inline-flex items-center gap-2 rounded-full bg-slate-900 px-3.5 py-2 text-xs font-semibold text-white shadow-[0_12px_26px_-18px_rgba(15,23,42,0.72)]"
          : compact
            ? "inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 transition hover:border-slate-300 hover:text-slate-700"
            : "inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 transition hover:border-slate-300 hover:text-slate-700"
      }
    >
      <Icon className="h-4 w-4 shrink-0" />
      {renderActiveLabel ? (
        <span className={compact ? "max-w-[7.5rem] truncate" : "max-w-[9rem] truncate"}>
          {option.promptLabel}
        </span>
      ) : (
        <span className="sr-only">{option.promptLabel}</span>
      )}
    </button>
  );
}
