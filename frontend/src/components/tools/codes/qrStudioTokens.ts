export const COMPACT_INPUT_CLASS = "input-field mt-1 !rounded-[16px] !px-3 !py-2 text-xs";
export const COMPACT_SELECT_CLASS = "input-field !mt-0 !rounded-[16px] !px-3 !py-2 text-xs";
export const COMPACT_COLOR_CLASS = "mt-1 h-10 w-full rounded-[16px] border border-app-border bg-transparent";

export function tabClass(active: boolean) {
  return active
    ? "tab-active inline-flex items-center gap-1.5 rounded-[16px] px-3 py-2 text-xs font-semibold"
    : "tab-inactive inline-flex items-center gap-1.5 rounded-[16px] px-3 py-2 text-xs font-semibold";
}

export function studioSectionTabClass(active: boolean) {
  return active
    ? "inline-flex items-center gap-1.5 rounded-full bg-brand px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-white shadow-[0_14px_28px_-24px_rgba(37,99,235,0.85)]"
    : "inline-flex items-center gap-1.5 rounded-full border border-app-border bg-app-card px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-app-muted transition hover:border-brand/25 hover:text-app-text";
}

export function sectionCardClass() {
  return "rounded-[20px] border border-app-border bg-app-card/80 p-2.5 shadow-[0_18px_42px_-34px_rgba(15,23,42,0.45)]";
}
