import { ArrowDown, ArrowUp, Eye, EyeOff, GripVertical, RotateCcw, Settings2, Trash2, X, type LucideIcon } from "lucide-react";
import { useState } from "react";

export interface WorkspaceAppManagerItem {
  id: string;
  title: string;
  subtitle: string;
  status: string;
  kindLabel: string;
  hidden: boolean;
  removable?: boolean;
  icon: LucideIcon;
  artClassName: string;
}

interface WorkspaceAppManagerSheetProps {
  title: string;
  description: string;
  items: WorkspaceAppManagerItem[];
  onMove: (id: string, direction: -1 | 1) => void;
  onToggleHidden: (id: string, hidden: boolean) => void;
  onRemove?: (id: string) => void;
  onResetOrder: () => void;
  onShowAll: () => void;
  hasCustomOrder: boolean;
}

export function WorkspaceAppManagerSheet({
  title,
  description,
  items,
  onMove,
  onToggleHidden,
  onRemove,
  onResetOrder,
  onShowAll,
  hasCustomOrder,
}: WorkspaceAppManagerSheetProps) {
  const [open, setOpen] = useState(false);
  const hiddenCount = items.filter((item) => item.hidden).length;
  const visibleCount = items.length - hiddenCount;

  return (
    <>
      <button
        type="button"
        className="native-pill inline-flex items-center gap-2 !px-3.5"
        onClick={() => setOpen(true)}
        aria-label={`Manage ${title}`}
      >
        <Settings2 className="h-4 w-4" />
        <span className="hidden sm:inline">Manage</span>
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 bg-slate-950/40" role="dialog" aria-modal="true">
          <div className="flex h-full items-end justify-center p-0 sm:p-4">
            <div className="native-sheet flex h-[88dvh] w-full max-w-3xl flex-col p-4 sm:h-full sm:rounded-[32px] sm:border sm:shadow-2xl">
            <div className="mx-auto mb-3 h-1.5 w-14 rounded-full bg-app-border sm:hidden" />
            <div className="flex items-start justify-between gap-3 pb-4">
              <div>
                <p className="font-display text-[1.55rem] font-bold tracking-tight text-brand sm:text-2xl">{title}</p>
                <p className="mt-1 text-sm text-app-muted">{description}</p>
                <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-app-muted">
                  <span className="rounded-full bg-app-secondary px-2.5 py-1">{visibleCount} visible</span>
                  <span className="rounded-full bg-app-secondary px-2.5 py-1">{hiddenCount} hidden</span>
                </div>
              </div>
              <button type="button" className="native-icon-button h-10 w-10" onClick={() => setOpen(false)} aria-label="Close">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-auto py-1">
              {items.length > 0 ? (
                <div className="space-y-3">
                  {items.map((item, index) => {
                    const Icon = item.icon;

                    return (
                      <div
                        key={item.id}
                        className="native-soft-card flex flex-col gap-3 px-3 py-3.5 sm:flex-row sm:items-center"
                      >
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-brand text-white shadow-[0_12px_24px_-16px_rgba(37,99,235,0.6)]">
                          <Icon className="h-5 w-5" />
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <GripVertical className="h-4 w-4 shrink-0 text-app-muted" />
                            <p className="truncate font-display text-[1.05rem] font-semibold text-app-text">{item.title}</p>
                          </div>
                          <p className="mt-1 truncate text-xs text-app-muted">{item.subtitle}</p>
                          <div className="mt-2 flex flex-wrap items-center gap-2">
                            <span className="rounded-full bg-app-secondary px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-app-muted">
                              {item.kindLabel}
                            </span>
                            <span
                              className={`rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] ${
                                item.hidden ? "bg-amber-500/12 text-amber-700" : "bg-emerald-500/12 text-emerald-700"
                              }`}
                            >
                              {item.hidden ? "Hidden" : item.status}
                            </span>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                          {item.removable && onRemove ? (
                            <button
                              type="button"
                              className="inline-flex items-center gap-2 rounded-full border border-rose-500/25 bg-rose-500/10 px-3.5 py-2 text-xs font-semibold text-rose-600 transition hover:border-rose-500/40 hover:bg-rose-500/15 dark:text-rose-400"
                              onClick={() => onRemove(item.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                              Remove
                            </button>
                          ) : null}

                          <button
                            type="button"
                            className="native-pill inline-flex items-center gap-2 !px-3.5 !py-2"
                            onClick={() => onToggleHidden(item.id, !item.hidden)}
                          >
                            {item.hidden ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                            {item.hidden ? "Unhide" : "Hide"}
                          </button>

                          <button
                            type="button"
                            className="native-icon-button h-10 w-10"
                            onClick={() => onMove(item.id, -1)}
                            disabled={index === 0}
                            aria-label={`Move ${item.title} up`}
                          >
                            <ArrowUp className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            className="native-icon-button h-10 w-10"
                            onClick={() => onMove(item.id, 1)}
                            disabled={index === items.length - 1}
                            aria-label={`Move ${item.title} down`}
                          >
                            <ArrowDown className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="flex h-full items-center justify-center rounded-[24px] border border-dashed border-app-border bg-app px-5 text-center text-sm text-app-muted">
                  Use Import in My Room to start building your room layout.
                </div>
              )}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-app-border pt-4">
              <p className="text-xs text-app-muted">Changes save automatically on this browser and device.</p>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  className="native-pill inline-flex items-center gap-2"
                  onClick={onShowAll}
                  disabled={hiddenCount === 0}
                >
                  <Eye className="h-4 w-4" />
                  Show all
                </button>
                <button
                  type="button"
                  className="native-pill inline-flex items-center gap-2"
                  onClick={onResetOrder}
                  disabled={!hasCustomOrder}
                >
                  <RotateCcw className="h-4 w-4" />
                  Reset order
                </button>
              </div>
            </div>
          </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
