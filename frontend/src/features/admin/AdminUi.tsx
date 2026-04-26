import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

function joinClasses(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

interface AdminPanelCardProps {
  children: ReactNode;
  className?: string;
}

export function AdminPanelCard({ children, className = "" }: AdminPanelCardProps) {
  return (
    <section
      className={joinClasses(
        "rounded-[18px] border border-slate-200 bg-white p-3 shadow-[0_16px_34px_-32px_rgba(15,23,42,0.2)]",
        className
      )}
    >
      {children}
    </section>
  );
}

interface AdminSectionHeadingProps {
  icon: LucideIcon;
  title: string;
  description: string;
  eyebrow?: string;
  iconClassName?: string;
  className?: string;
  badge?: ReactNode;
}

export function AdminSectionHeading({
  icon: Icon,
  title,
  description,
  eyebrow = "Admin",
  iconClassName = "from-[#2563eb] to-[#38bdf8]",
  className = "",
  badge = null,
}: AdminSectionHeadingProps) {
  return (
    <div className={joinClasses("flex min-w-0 items-start gap-3", className)}>
      <div
        className={joinClasses(
          "flex h-10 w-10 shrink-0 items-center justify-center rounded-[14px] bg-gradient-to-br text-white shadow-[0_14px_28px_-20px_rgba(37,99,235,0.72)]",
          iconClassName
        )}
      >
        <Icon className="h-4 w-4" />
      </div>

      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-brand">{eyebrow}</p>
          {badge}
        </div>
        <p className="mt-1 font-display text-[18px] font-semibold tracking-tight text-slate-900">{title}</p>
        <p className="mt-1 text-[12px] leading-5 text-slate-500">{description}</p>
      </div>
    </div>
  );
}

export interface AdminMiniStatItem {
  label: string;
  value: ReactNode;
  hint?: string;
  icon?: LucideIcon;
  toneClassName?: string;
}

interface AdminMiniStatGridProps {
  items: AdminMiniStatItem[];
  className?: string;
  columnsClassName?: string;
}

export function AdminMiniStatGrid({
  items,
  className = "",
  columnsClassName = "sm:grid-cols-3",
}: AdminMiniStatGridProps) {
  return (
    <div className={joinClasses("grid gap-2", columnsClassName, className)}>
      {items.map((item) => {
        const Icon = item.icon;

        return (
          <div
            key={item.label}
            className="rounded-[14px] border border-slate-200 bg-slate-50 px-3 py-2.5"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                  {item.label}
                </p>
                <p className="mt-1 text-[13px] font-semibold text-slate-900">{item.value}</p>
                {item.hint ? (
                  <p className="mt-1 text-[10px] text-slate-500">{item.hint}</p>
                ) : null}
              </div>

              {Icon ? (
                <div
                  className={joinClasses(
                    "flex h-8 w-8 shrink-0 items-center justify-center rounded-[12px]",
                    item.toneClassName || "bg-brand/10 text-brand"
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                </div>
              ) : null}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export interface AdminPillTabItem {
  id: string;
  label: string;
  description?: string;
  count?: ReactNode;
  icon?: LucideIcon;
  activeClassName?: string;
}

interface AdminPillTabsProps {
  tabs: AdminPillTabItem[];
  activeId: string;
  onChange: (id: string) => void;
  className?: string;
  size?: "md" | "lg";
}

export function AdminPillTabs({
  tabs,
  activeId,
  onChange,
  className = "",
  size = "md",
}: AdminPillTabsProps) {
  const isLarge = size === "lg";

  return (
    <div className={joinClasses("flex flex-wrap gap-2", className)}>
      {tabs.map((tab) => {
        const active = tab.id === activeId;
        const Icon = tab.icon;

        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            className={joinClasses(
              "rounded-[16px] border text-left transition",
              isLarge ? "px-3.5 py-3" : "px-3 py-2.5",
              active
                ? joinClasses(
                    "border-transparent text-white shadow-[0_14px_24px_-18px_rgba(37,99,235,0.7)]",
                    tab.activeClassName || "bg-gradient-to-r from-[#2563eb] to-[#38bdf8]"
                  )
                : "border-slate-200 bg-slate-50 text-slate-900 hover:border-brand/20 hover:bg-white"
            )}
          >
            <div className="flex items-center gap-3">
              {Icon ? (
                <div
                  className={joinClasses(
                    "flex items-center justify-center rounded-[12px]",
                    isLarge ? "h-9 w-9" : "h-8 w-8",
                    active ? "bg-white/18 text-white" : "bg-white text-brand"
                  )}
                >
                  <Icon className={isLarge ? "h-4 w-4" : "h-3.5 w-3.5"} />
                </div>
              ) : null}

              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className={isLarge ? "text-sm font-semibold" : "text-[13px] font-semibold"}>
                    {tab.label}
                  </p>
                  {tab.count !== undefined && tab.count !== null ? (
                    <span
                      className={joinClasses(
                        "rounded-full px-2 py-0.5 text-[10px] font-semibold",
                        active ? "bg-white/18 text-white" : "bg-white text-slate-600"
                      )}
                    >
                      {tab.count}
                    </span>
                  ) : null}
                </div>
                {tab.description ? (
                  <p className={joinClasses("mt-0.5", active ? "text-white/80" : "text-slate-500", isLarge ? "text-[11px]" : "text-[10px]")}>
                    {tab.description}
                  </p>
                ) : null}
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
