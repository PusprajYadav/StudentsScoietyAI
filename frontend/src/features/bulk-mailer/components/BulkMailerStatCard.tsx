import type { LucideIcon } from "lucide-react";

interface BulkMailerStatCardProps {
  title: string;
  value: string;
  hint: string;
  icon: LucideIcon;
  tone?: "brand" | "emerald" | "amber" | "slate";
}

const toneMap = {
  brand: {
    shell: "from-[#2563eb]/30 via-[#0ea5e9]/22 to-[#14b8a6]/18",
    icon: "from-[#2563eb] to-[#14b8a6] text-white",
    glow: "bg-[#38bdf8]/20",
  },
  emerald: {
    shell: "from-emerald-500/28 via-lime-400/16 to-teal-400/14",
    icon: "from-emerald-500 to-teal-500 text-white",
    glow: "bg-emerald-400/20",
  },
  amber: {
    shell: "from-amber-500/28 via-orange-400/16 to-rose-400/12",
    icon: "from-amber-500 to-orange-500 text-white",
    glow: "bg-amber-400/20",
  },
  slate: {
    shell: "from-slate-900/16 via-slate-500/10 to-sky-400/12",
    icon: "from-slate-800 to-slate-500 text-white",
    glow: "bg-slate-400/15",
  },
} as const;

export function BulkMailerStatCard({
  title,
  value,
  hint,
  icon: Icon,
  tone = "brand",
}: BulkMailerStatCardProps) {
  const palette = toneMap[tone];

  return (
    <article className={`relative overflow-hidden rounded-[28px] border border-app-border/80 bg-gradient-to-br p-[1px] shadow-[0_22px_48px_-30px_rgba(15,23,42,0.28)] ${palette.shell}`}>
      <div className="relative h-full rounded-[27px] bg-app-card/92 p-4 backdrop-blur sm:p-5">
        <div className={`absolute -right-8 -top-8 h-24 w-24 rounded-full blur-2xl ${palette.glow}`} />

        <div className="relative flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-app-muted sm:text-[11px]">
              {title}
            </p>
            <p className="mt-2 font-display text-[1.7rem] font-semibold leading-none tracking-tight text-app-text sm:text-[2rem]">
              {value}
            </p>
            <p className="mt-2 line-clamp-2 text-xs leading-5 text-app-muted sm:text-sm">
              {hint}
            </p>
          </div>

          <div className={`relative z-[1] flex h-11 w-11 shrink-0 items-center justify-center rounded-[16px] bg-gradient-to-br shadow-[0_18px_32px_-20px_rgba(15,23,42,0.45)] ${palette.icon} sm:h-12 sm:w-12`}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </div>
    </article>
  );
}
