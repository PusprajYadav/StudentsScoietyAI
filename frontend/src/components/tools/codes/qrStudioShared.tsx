import type { ReactNode } from "react";
import { Link2, type LucideIcon } from "lucide-react";

export function ContentTypeButton({
  active,
  icon: Icon,
  label,
  onClick,
}: {
  active: boolean;
  icon: typeof Link2;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={`flex min-h-[54px] items-center justify-center rounded-[16px] border px-2 py-2 text-center transition ${
        active ? "border-brand bg-brand/10 text-brand shadow-[0_14px_28px_-24px_rgba(37,99,235,0.8)]" : "border-app-border bg-app-card text-app-muted hover:border-brand/25 hover:text-app-text"
      }`}
      onClick={onClick}
    >
      <span className="flex flex-col items-center gap-2">
        <Icon className="h-3.5 w-3.5" />
        <span className="text-[9px] font-semibold uppercase tracking-[0.14em]">{label}</span>
      </span>
    </button>
  );
}

export function StyleChoice({
  active,
  label,
  preview,
  onClick,
}: {
  active: boolean;
  label: string;
  preview: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={`flex items-center justify-between gap-2 rounded-[18px] border px-2.5 py-2.5 text-left transition ${
        active ? "border-brand bg-brand/10 text-brand" : "border-app-border bg-app-card hover:border-brand/25"
      }`}
      onClick={onClick}
    >
      <span className="text-xs font-semibold">{label}</span>
      <span className="rounded-2xl bg-app-secondary p-1.5">{preview}</span>
    </button>
  );
}

export function ManageHeader({
  icon: Icon,
  title,
  copy,
}: {
  icon: LucideIcon;
  title: string;
  copy: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="rounded-[16px] bg-brand/10 p-2 text-brand">
        <Icon className="h-4 w-4" />
      </div>
      <div>
        <h3 className="font-display text-[0.92rem] font-semibold tracking-tight text-app-text">{title}</h3>
        <p className="text-[11px] text-app-muted">{copy}</p>
      </div>
    </div>
  );
}
