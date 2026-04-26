import type { ReactNode } from "react";

export function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: ReactNode;
  hint?: string;
}) {
  return (
    <label className="grid gap-2">
      <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-app-muted">{label}</span>
      {children}
      {hint ? <span className="text-[11px] text-app-muted">{hint}</span> : null}
    </label>
  );
}

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`input-shell h-10 rounded-[14px] px-3 py-2 text-[13px] ${props.className || ""}`.trim()}
    />
  );
}

export function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={`input-shell min-h-[96px] resize-y rounded-[14px] px-3 py-2 text-[13px] ${props.className || ""}`.trim()}
    />
  );
}

export function SectionCard({
  title,
  actions,
  children,
}: {
  title: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="surface-card rounded-[24px] p-4 sm:p-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-display text-base font-semibold text-app-text">{title}</h2>
        {actions}
      </div>
      <div className="mt-4 space-y-3">{children}</div>
    </section>
  );
}

