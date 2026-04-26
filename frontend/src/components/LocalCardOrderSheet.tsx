import { ArrowDown, ArrowUp, GripVertical, RotateCcw, Settings2, X, type LucideIcon } from "lucide-react";
import { useMemo, useState } from "react";

export interface LocalCardOrderItem {
  id: string;
  title: string;
  subtitle: string;
  status: string;
  kindLabel?: string;
  icon: LucideIcon;
  artClassName: string;
}

interface LocalCardOrderSheetProps {
  title: string;
  description: string;
  items: LocalCardOrderItem[];
  onMove: (id: string, direction: -1 | 1) => void;
  onReorder?: (orderedIds: string[]) => void;
  onReset: () => void;
  hasCustomOrder: boolean;
}

export function LocalCardOrderSheet({
  title,
  description,
  items,
  onMove,
  onReorder,
  onReset,
  hasCustomOrder,
}: LocalCardOrderSheetProps) {
  const [open, setOpen] = useState(false);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [draftOrderIds, setDraftOrderIds] = useState<string[] | null>(null);

  const itemIds = useMemo(() => items.map((item) => item.id), [items]);
  const itemLookup = useMemo(() => new Map(items.map((item) => [item.id, item])), [items]);
  const renderedItems = useMemo(
    () => (draftOrderIds ?? itemIds).map((id) => itemLookup.get(id)).filter((item): item is LocalCardOrderItem => Boolean(item)),
    [draftOrderIds, itemIds, itemLookup]
  );

  function buildReorderedIds(sourceId: string, targetId: string, ids: string[]) {
    if (sourceId === targetId) {
      return ids;
    }

    const fromIndex = ids.indexOf(sourceId);
    const targetIndex = ids.indexOf(targetId);

    if (fromIndex === -1 || targetIndex === -1) {
      return ids;
    }

    const next = [...ids];
    const [movedId] = next.splice(fromIndex, 1);
    next.splice(targetIndex, 0, movedId);
    return next;
  }

  function resetDragState() {
    setDraggedId(null);
    setDragOverId(null);
    setDraftOrderIds(null);
  }

  function previewDragPosition(targetId: string) {
    if (!draggedId || !onReorder || draggedId === targetId || dragOverId === targetId) {
      return;
    }

    setDragOverId(targetId);
    setDraftOrderIds((currentIds) => buildReorderedIds(draggedId, targetId, currentIds ?? itemIds));
  }

  function commitDrag(targetId: string) {
    if (!draggedId || !onReorder) {
      resetDragState();
      return;
    }

    const nextOrderIds =
      draftOrderIds && dragOverId === targetId
        ? draftOrderIds
        : buildReorderedIds(draggedId, targetId, draftOrderIds ?? itemIds);

    if (nextOrderIds.join("|") !== itemIds.join("|")) {
      onReorder(nextOrderIds);
    }

    resetDragState();
  }

  return (
    <>
      <button
        type="button"
        className="btn-secondary inline-flex items-center gap-2 !px-3"
        onClick={() => {
          resetDragState();
          setOpen(true);
        }}
        aria-label={`Arrange ${title}`}
      >
        <Settings2 className="h-4 w-4" />
        <span className="hidden sm:inline">Arrange</span>
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm" role="dialog" aria-modal="true">
          <div className="flex h-full items-end justify-center p-0 sm:p-4">
            <div className="native-sheet flex h-[88dvh] w-full max-w-2xl flex-col p-4 sm:h-full sm:rounded-[32px] sm:border sm:shadow-2xl">
              <div className="mx-auto mb-3 h-1.5 w-14 rounded-full bg-app-border sm:hidden" />

              <div className="flex items-start justify-between gap-3 pb-4">
                <div>
                  <p className="text-center font-display text-[1.7rem] font-bold tracking-tight text-brand sm:text-left sm:text-2xl">
                    {title}
                  </p>
                  <p className="mt-1 text-sm text-app-muted">{description}</p>
                  <div className="mt-3 inline-flex rounded-full bg-app-secondary px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-app-muted">
                    Saved only on this device
                  </div>
                  {onReorder ? (
                    <p className="mt-3 text-xs text-app-muted">
                      Drag cards or use the arrow buttons to change the order.
                    </p>
                  ) : null}
                </div>
                <button
                  type="button"
                  className="native-icon-button h-10 w-10"
                  onClick={() => {
                    resetDragState();
                    setOpen(false);
                  }}
                  aria-label="Close"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="min-h-0 flex-1 overflow-auto py-1">
                <div className="space-y-3">
                  {renderedItems.map((item, index) => {
                    const Icon = item.icon;
                    const isDragging = draggedId === item.id;
                    const isDropTarget = dragOverId === item.id && draggedId !== item.id;

                    return (
                      <div
                        key={item.id}
                        draggable={Boolean(onReorder)}
                        onDragStart={(event) => {
                          if (!onReorder) {
                            return;
                          }

                          event.dataTransfer.effectAllowed = "move";
                          event.dataTransfer.setData("text/plain", item.id);
                          setDraggedId(item.id);
                          setDragOverId(item.id);
                          setDraftOrderIds(itemIds);
                        }}
                        onDragOver={(event) => {
                          if (!onReorder || !draggedId) {
                            return;
                          }

                          event.preventDefault();
                          event.dataTransfer.dropEffect = "move";
                          previewDragPosition(item.id);
                        }}
                        onDrop={(event) => {
                          if (!onReorder) {
                            return;
                          }

                          event.preventDefault();
                          commitDrag(item.id);
                        }}
                        onDragEnd={resetDragState}
                        className={`flex items-center gap-3 rounded-[22px] border border-app-border/80 bg-app-card px-3 py-3.5 shadow-[0_16px_36px_-28px_rgba(15,23,42,0.35)] transition dark:bg-[linear-gradient(180deg,rgba(13,19,36,0.98),rgba(8,13,28,0.98))] dark:shadow-[0_18px_38px_-26px_rgba(2,6,23,0.9)] ${
                          isDragging
                            ? "border-brand/40 opacity-70"
                            : isDropTarget
                              ? "border-brand/40 bg-brand/5"
                              : ""
                        } ${onReorder ? "cursor-grab active:cursor-grabbing" : ""}`}
                      >
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-brand text-white shadow-[0_12px_24px_-16px_rgba(37,99,235,0.6)] ring-1 ring-white/10">
                          <Icon className="h-5 w-5" />
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <GripVertical className={`h-4 w-4 shrink-0 ${onReorder ? "text-app-text" : "text-app-muted"}`} />
                            <p className="truncate font-display text-[1.1rem] font-semibold leading-none text-app-text">{item.title}</p>
                          </div>
                          <p className="mt-1 truncate text-xs text-app-muted">{item.subtitle}</p>
                          <div className="mt-2 flex flex-wrap items-center gap-2 sm:hidden">
                            {item.kindLabel ? (
                              <span className="rounded-full bg-app-secondary px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-app-muted">
                                {item.kindLabel}
                              </span>
                            ) : null}
                            <span className="rounded-full bg-app-secondary px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-app-muted">
                              {item.status}
                            </span>
                          </div>
                        </div>

                        <div className="hidden items-center gap-2 sm:flex">
                          {item.kindLabel ? (
                            <span className="rounded-full bg-app-secondary px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-app-muted">
                              {item.kindLabel}
                            </span>
                          ) : null}
                          <span className="rounded-full bg-app-secondary px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-app-muted">
                            {item.status}
                          </span>
                        </div>

                        <div className="flex items-center gap-1">
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
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-app-border pt-4">
                <p className="text-xs text-app-muted">Changes save automatically on this browser and device.</p>
                <button
                  type="button"
                  className="native-pill inline-flex items-center gap-2"
                  onClick={onReset}
                  disabled={!hasCustomOrder}
                >
                  <RotateCcw className="h-4 w-4" />
                  Reset
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
