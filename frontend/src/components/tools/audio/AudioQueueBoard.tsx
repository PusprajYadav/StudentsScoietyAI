import { ArrowDown, ArrowUp, GripVertical, Trash2 } from "lucide-react";
import { useRef } from "react";
import { formatBytes, formatDuration } from "./helpers";
import type { AudioWorkspaceFile } from "./types";

interface AudioQueueBoardProps {
  items: AudioWorkspaceFile[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onMove: (fromIndex: number, toIndex: number) => void;
  onRemove: (id: string) => void;
  onClear: () => void;
}

export function AudioQueueBoard({
  items,
  selectedId,
  onSelect,
  onMove,
  onRemove,
  onClear,
}: AudioQueueBoardProps) {
  const draggedIndexRef = useRef(-1);

  return (
    <section className="glass-card rounded-[22px] p-3 sm:rounded-[28px] sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-app-muted">Queue</p>
          <h3 className="mt-1 font-display text-lg font-semibold tracking-tight text-app-text">Clip order</h3>
          <p className="mt-1 text-xs text-app-muted">Select a clip to preview it, then drag or tap the arrows to reorder.</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-app-secondary px-3 py-1.5 text-xs font-semibold text-app-text">
            {items.length} {items.length === 1 ? "clip" : "clips"}
          </span>
          <button type="button" className="btn-secondary !px-3 !py-2 text-xs" onClick={onClear}>
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="audio-panel-scroll mt-3 max-h-[320px] space-y-2.5 overflow-y-auto pr-1 sm:mt-4 sm:max-h-[360px] sm:space-y-3">
        {items.map((item, index) => (
          <div
            key={item.id}
            role="button"
            tabIndex={0}
            draggable
            onClick={() => onSelect(item.id)}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                onSelect(item.id);
              }
            }}
            onDragStart={() => {
              draggedIndexRef.current = index;
            }}
            onDragOver={(event) => {
              event.preventDefault();
            }}
            onDrop={(event) => {
              event.preventDefault();
              if (draggedIndexRef.current !== -1 && draggedIndexRef.current !== index) {
                onMove(draggedIndexRef.current, index);
              }
              draggedIndexRef.current = -1;
            }}
            onDragEnd={() => {
              draggedIndexRef.current = -1;
            }}
            className={`flex w-full flex-col gap-3 rounded-[18px] border p-3 text-left transition sm:flex-row sm:items-center sm:rounded-[20px] ${
              selectedId === item.id
                ? "border-brand/45 bg-brand/10 shadow-[0_16px_40px_-34px_rgba(37,99,235,0.75)]"
                : "border-app-border bg-app-card hover:border-brand/25"
            }`}
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-slate-950 text-white">
              <GripVertical className="h-4 w-4" />
            </div>

            <div className="min-w-0 flex-1">
              <p className="break-all text-sm font-semibold text-app-text">{item.file.name}</p>
              <p className="mt-1 text-xs text-app-muted">
                {formatDuration(item.durationSeconds)} • {formatBytes(item.file.size)}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-1 sm:flex-nowrap">
              <button
                type="button"
                className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-app-border bg-app-secondary text-app-text transition hover:border-brand/25 hover:text-brand"
                onClick={(event) => {
                  event.stopPropagation();
                  onMove(index, Math.max(0, index - 1));
                }}
                aria-label={`Move ${item.file.name} up`}
              >
                <ArrowUp className="h-4 w-4" />
              </button>
              <button
                type="button"
                className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-app-border bg-app-secondary text-app-text transition hover:border-brand/25 hover:text-brand"
                onClick={(event) => {
                  event.stopPropagation();
                  onMove(index, Math.min(items.length - 1, index + 1));
                }}
                aria-label={`Move ${item.file.name} down`}
              >
                <ArrowDown className="h-4 w-4" />
              </button>
              <button
                type="button"
                className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-rose-200 bg-rose-50 text-rose-600 transition hover:border-rose-300"
                onClick={(event) => {
                  event.stopPropagation();
                  onRemove(item.id);
                }}
                aria-label={`Remove ${item.file.name}`}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
