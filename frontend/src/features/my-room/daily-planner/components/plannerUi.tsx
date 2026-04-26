import {
  ArrowUpRight,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock3,
  LayoutGrid,
  Target,
  Wifi,
  WifiOff,
  type LucideIcon,
} from "lucide-react";
import type { ReactNode } from "react";
import { getPlannerShareCategoryLabel, getPlannerShareTypeLabel } from "../../../../lib/plannerPost";
import type { SharedPlannerReport } from "../types";
import {
  addDaysToDateKey,
  clampPercent,
  formatMinutes,
  formatPlannerDate,
  formatShortDateLabel,
  parseDateKey,
} from "../utils";
import type { PlannerTab } from "../viewModels";

export interface PlannerTabItem {
  id: PlannerTab;
  label: string;
  helper: string;
  count: string;
  icon: LucideIcon;
}

const weekdayFormatter = new Intl.DateTimeFormat(undefined, { weekday: "short" });

function buildDateStrip(selectedDate: string) {
  return Array.from({ length: 7 }, (_, index) => addDaysToDateKey(selectedDate, index - 3));
}

function getMetricToneClasses(tone: "brand" | "emerald" | "amber" | "slate") {
  if (tone === "emerald") {
    return {
      shell: "border-emerald-500/10",
      dot: "bg-emerald-500 text-white",
    };
  }

  if (tone === "amber") {
    return {
      shell: "border-amber-500/10",
      dot: "bg-amber-500 text-white",
    };
  }

  if (tone === "slate") {
    return {
      shell: "border-slate-400/10",
      dot: "bg-slate-700 text-white dark:bg-slate-500",
    };
  }

  return {
    shell: "border-brand/10",
    dot: "bg-brand text-white",
  };
}

function getTabToneClasses(tab: PlannerTab) {
  if (tab === "tasks") {
    return {
      active: "border-brand/20 bg-brand/8 text-app-text shadow-[0_18px_34px_-28px_rgba(37,99,235,0.45)]",
      icon: "bg-brand/10 text-brand",
      line: "bg-brand",
    };
  }

  if (tab === "study") {
    return {
      active: "border-cyan-500/20 bg-cyan-500/8 text-app-text shadow-[0_18px_34px_-28px_rgba(6,182,212,0.42)]",
      icon: "bg-cyan-500/10 text-cyan-600 dark:text-cyan-300",
      line: "bg-cyan-500",
    };
  }

  if (tab === "targets") {
    return {
      active: "border-violet-500/20 bg-violet-500/8 text-app-text shadow-[0_18px_34px_-28px_rgba(139,92,246,0.42)]",
      icon: "bg-violet-500/10 text-violet-600 dark:text-violet-300",
      line: "bg-violet-500",
    };
  }

  if (tab === "shared") {
    return {
      active: "border-emerald-500/20 bg-emerald-500/8 text-app-text shadow-[0_18px_34px_-28px_rgba(16,185,129,0.42)]",
      icon: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-300",
      line: "bg-emerald-500",
    };
  }

  return {
    active: "border-brand/20 bg-brand/8 text-app-text shadow-[0_18px_34px_-28px_rgba(37,99,235,0.45)]",
    icon: "bg-brand/10 text-brand",
    line: "bg-brand",
  };
}

function getStatusChip(selectedDate: string, todayKey: string, selectedDateIsPast: boolean) {
  if (selectedDateIsPast) {
    return "Past";
  }

  if (selectedDate === todayKey) {
    return "Today";
  }

  return "Next";
}

function MiniStat({
  icon: Icon,
  value,
  label,
}: {
  icon: LucideIcon;
  value: string;
  label: string;
}) {
  return (
    <div className="tracker-panel-soft border-app-border bg-app-card px-3 py-3">
      <div className="flex items-center justify-between gap-2">
        <span className="inline-flex h-9 w-9 items-center justify-center rounded-[16px] bg-app-secondary text-brand">
          <Icon className="h-4 w-4" />
        </span>
        <p className="font-display text-[1.2rem] font-semibold tracking-tight text-app-text">{value}</p>
      </div>
      <p className="mt-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-app-muted">{label}</p>
    </div>
  );
}

export function MetricCard({
  label,
  value,
  detail: _detail,
  tone = "brand",
}: {
  label: string;
  value: string;
  detail: string;
  tone?: "brand" | "emerald" | "amber" | "slate";
}) {
  const toneClasses = getMetricToneClasses(tone);

  return (
    <div className={`tracker-panel-soft border bg-app-card p-3 ${toneClasses.shell}`}>
      <div className="flex items-center justify-between gap-2">
        <span className={`inline-flex h-8 w-8 items-center justify-center rounded-full text-[10px] font-bold ${toneClasses.dot}`}>
          •
        </span>
        <p className="font-display text-[1.2rem] font-semibold tracking-tight text-app-text sm:text-[1.45rem]">{value}</p>
      </div>
      <p className="mt-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-app-muted">{label}</p>
    </div>
  );
}

export function ProgressBar({
  value,
  tone = "brand",
}: {
  value: number;
  tone?: "brand" | "emerald" | "amber";
}) {
  const fillClassName =
    tone === "emerald"
      ? "from-emerald-400 to-emerald-500"
      : tone === "amber"
        ? "from-amber-400 to-amber-500"
        : "from-brand to-blue-500";

  return (
    <div className="h-2 overflow-hidden rounded-full bg-app-secondary">
      <div className={`h-full rounded-full bg-gradient-to-r ${fillClassName} transition-all duration-300`} style={{ width: `${clampPercent(value)}%` }} />
    </div>
  );
}

export function SectionCard({
  title,
  description: _description,
  right,
  children,
}: {
  title: string;
  description: string;
  right?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="tracker-panel p-3 sm:p-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-display text-[1.02rem] font-semibold tracking-tight text-app-text sm:text-[1.14rem]">{title}</h2>
        {right ? <div className="shrink-0">{right}</div> : null}
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

export function EmptyMessage({ message }: { message: string }) {
  return (
    <div className="tracker-panel-soft flex items-center justify-center gap-3 px-4 py-5">
      <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-app-secondary text-brand">
        <LayoutGrid className="h-4 w-4" />
      </span>
      <p className="text-[11px] font-medium text-app-muted">{message}</p>
    </div>
  );
}

export function PlannerHeroSection({
  isOnline,
  selectedDate,
  todayKey,
  selectedDateIsPast,
  overallPercent,
  taskCount,
  completedTaskCount,
  targetCount,
  totalStudyMinutes,
  onPrevious,
  onNext,
  onChangeDate,
}: {
  isOnline: boolean;
  selectedDate: string;
  todayKey: string;
  selectedDateIsPast: boolean;
  overallPercent: number;
  taskCount: number;
  completedTaskCount: number;
  targetCount: number;
  totalStudyMinutes: number;
  onPrevious: () => void;
  onNext: () => void;
  onChangeDate: (value: string) => void;
}) {
  const weekStrip = buildDateStrip(selectedDate);

  return (
    <section className="tracker-panel p-3 sm:p-4">
      <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="tracker-chip tracker-chip-active">{formatShortDateLabel(selectedDate)}</span>
            <span className="tracker-chip">{getStatusChip(selectedDate, todayKey, selectedDateIsPast)}</span>
            <span className="tracker-chip">
              {isOnline ? <Wifi className="h-3.5 w-3.5" /> : <WifiOff className="h-3.5 w-3.5" />}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
            <MiniStat icon={LayoutGrid} value={`${overallPercent}%`} label="Total" />
            <MiniStat icon={CalendarDays} value={`${taskCount}`} label="Tasks" />
            <MiniStat icon={Target} value={`${targetCount}`} label="Targets" />
            <MiniStat icon={Clock3} value={formatMinutes(totalStudyMinutes)} label="Study" />
          </div>

          <div className="tracker-panel-soft flex items-center justify-between gap-3 border-app-border bg-app-card px-3 py-3">
            <div className="min-w-0">
              <p className="truncate font-display text-[1.12rem] font-semibold tracking-tight text-app-text sm:text-[1.28rem]">
                {formatPlannerDate(selectedDate)}
              </p>
              <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-app-muted">
                {completedTaskCount} done
              </p>
            </div>
            <span className="tracker-chip">{selectedDateIsPast ? "Lock" : "Edit"}</span>
          </div>
        </div>

        <div className="tracker-panel-soft border-app-border bg-app-card p-3">
          <div className="-mx-1 overflow-x-auto pb-1 scrollbar-none">
            <div className="flex min-w-max gap-2 px-1">
              {weekStrip.map((dateKey) => {
                const isSelected = dateKey === selectedDate;
                const parsedDate = parseDateKey(dateKey);

                return (
                  <button
                    key={dateKey}
                    type="button"
                    onClick={() => onChangeDate(dateKey)}
                    className={`w-[64px] shrink-0 rounded-[20px] border px-2 py-3 text-center transition ${
                      isSelected
                        ? "border-brand/25 bg-brand/10 shadow-[0_16px_28px_-24px_rgba(37,99,235,0.55)]"
                        : "border-app-border bg-app-secondary/60 hover:bg-app-secondary"
                    }`}
                  >
                    <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-app-muted">
                      {weekdayFormatter.format(parsedDate).slice(0, 1)}
                    </p>
                    <p className="mt-2 font-display text-[1.05rem] font-semibold tracking-tight text-app-text">
                      {parsedDate.getDate()}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mt-3 grid grid-cols-[48px_minmax(0,1fr)_48px] gap-2">
            <button type="button" onClick={onPrevious} className="tracker-action-ghost h-12 w-12 px-0" aria-label="Previous day">
              <ChevronLeft className="h-4 w-4" />
            </button>

            <label className="tracker-panel-soft flex items-center gap-2 border-app-border bg-app-secondary/50 px-3 py-3 text-sm text-app-text">
              <CalendarDays className="h-4 w-4 text-brand" />
              <span className="sr-only">Choose date</span>
              <input
                type="date"
                value={selectedDate}
                onChange={(event) => onChangeDate(event.target.value || todayKey)}
                className="w-full bg-transparent text-sm font-medium outline-none"
              />
            </label>

            <button type="button" onClick={onNext} className="tracker-action-ghost h-12 w-12 px-0" aria-label="Next day">
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

export function PlannerTabSection({
  items,
  activeTab,
  onSelectTab,
  selectedDate,
  selectedDateIsPast,
  todayKey,
}: {
  items: PlannerTabItem[];
  activeTab: PlannerTab;
  onSelectTab: (tab: PlannerTab) => void;
  selectedDate: string;
  selectedDateIsPast: boolean;
  todayKey: string;
}) {
  const activeTabMeta = items.find((item) => item.id === activeTab) || items[0];
  const activeTone = getTabToneClasses(activeTabMeta.id);

  return (
    <section className="tracker-panel p-3 sm:p-4">
      <div className="-mx-1 overflow-x-auto pb-1 scrollbar-none">
        <div className="flex min-w-max gap-2 px-1 sm:grid sm:min-w-0 sm:grid-cols-5 sm:px-0">
          {items.map((item) => {
            const tone = getTabToneClasses(item.id);
            const active = activeTab === item.id;

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectTab(item.id)}
                className={`w-[136px] shrink-0 rounded-[22px] border px-3 py-3 text-left transition sm:w-auto ${
                  active ? tone.active : "border-app-border bg-app-card hover:bg-app-secondary/60"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className={`inline-flex h-9 w-9 items-center justify-center rounded-[16px] ${tone.icon}`}>
                    <item.icon className="h-4 w-4" />
                  </span>
                  <span className="text-[11px] font-semibold text-app-text">{item.count}</span>
                </div>
                <p className="mt-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-app-muted">{item.label}</p>
                <div className={`mt-2 h-1 w-10 rounded-full ${tone.line}`} />
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between gap-3 rounded-[20px] border border-app-border bg-app-secondary/50 px-3 py-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className={`inline-flex h-10 w-10 items-center justify-center rounded-[16px] ${activeTone.icon}`}>
            <activeTabMeta.icon className="h-4 w-4" />
          </span>
          <p className="truncate font-display text-[1rem] font-semibold tracking-tight text-app-text">{activeTabMeta.label}</p>
        </div>
        <span className="tracker-chip">{selectedDateIsPast ? "Past" : selectedDate === todayKey ? "Today" : formatShortDateLabel(selectedDate)}</span>
      </div>
    </section>
  );
}

export function PlannerOverviewSection({
  overallPercent,
  taskCount,
  targetCount,
  completedTaskCount,
  taskPercent,
  totalStudyMinutes,
  studyEntryCount,
  totalStudyTaskUnits,
}: {
  overallPercent: number;
  taskCount: number;
  targetCount: number;
  completedTaskCount: number;
  taskPercent: number;
  totalStudyMinutes: number;
  studyEntryCount: number;
  totalStudyTaskUnits: number;
}) {
  return (
    <SectionCard title="Overview" description="">
      <div className="grid gap-2.5 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Total" value={`${overallPercent}%`} detail="" />
        <MetricCard label="Done" value={`${completedTaskCount}/${taskCount || 0}`} detail="" tone="emerald" />
        <MetricCard label="Study" value={formatMinutes(totalStudyMinutes)} detail="" tone="amber" />
        <MetricCard label="Units" value={`${targetCount + totalStudyTaskUnits + studyEntryCount}`} detail="" tone="slate" />
      </div>
    </SectionCard>
  );
}

export function SharedReportsList({ reports }: { reports: SharedPlannerReport[] }) {
  if (reports.length === 0) {
    return <EmptyMessage message="No shares" />;
  }

  return (
    <div className="space-y-2.5">
      {reports.map((report) => (
        <article key={report.id} className="tracker-panel-soft border-app-border bg-app-card p-3">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-app-text">{report.title}</p>
              <div className="mt-1 flex flex-wrap items-center gap-1.5">
                <span className="rounded-full bg-app-secondary px-2 py-0.5 text-[9px] font-semibold text-app-muted">
                  {formatShortDateLabel(report.date)}
                </span>
                <span className="rounded-full bg-app-secondary px-2 py-0.5 text-[9px] font-semibold text-app-muted">
                  {getPlannerShareTypeLabel(report.shareType)}
                </span>
                <span className="rounded-full bg-brand/10 px-2 py-0.5 text-[9px] font-semibold text-brand">
                  {getPlannerShareCategoryLabel(report.category)}
                </span>
              </div>
            </div>
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-app-secondary text-app-text">
              <ArrowUpRight className="h-4 w-4" />
            </span>
          </div>
        </article>
      ))}
    </div>
  );
}
