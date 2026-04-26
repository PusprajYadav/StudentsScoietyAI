import {
  ArrowDown,
  ArrowUp,
  Plus,
  RotateCcw,
  Search,
  Trash2,
} from "lucide-react";
import { useMemo, useState } from "react";
import { usePrimaryNavigationPreferences } from "../../hooks/usePrimaryNavigationPreferences";
import type { PrimaryNavigationItem } from "../../lib/primaryNavigation";

function SelectedItemRow({
  item,
  index,
  total,
  onMove,
  onRemove,
}: {
  item: PrimaryNavigationItem;
  index: number;
  total: number;
  onMove: (id: string, direction: -1 | 1) => void;
  onRemove: (id: string) => void;
}) {
  return (
    <div className="flex items-center gap-2 rounded-[18px] border border-app-border bg-app-card px-3 py-2.5">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[14px] bg-brand/10 text-brand">
        <item.icon className="h-4 w-4" />
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-app-text">
          {item.label}
        </p>
        <p className="text-[11px] text-app-muted">{item.groupLabel}</p>
      </div>

      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => onMove(item.id, -1)}
          disabled={index === 0}
          className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-app-border bg-app-secondary text-app-text disabled:cursor-not-allowed disabled:opacity-45"
          aria-label={`Move ${item.label} up`}
        >
          <ArrowUp className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={() => onMove(item.id, 1)}
          disabled={index === total - 1}
          className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-app-border bg-app-secondary text-app-text disabled:cursor-not-allowed disabled:opacity-45"
          aria-label={`Move ${item.label} down`}
        >
          <ArrowDown className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={() => onRemove(item.id)}
          disabled={total <= 1}
          className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-rose-500/20 bg-rose-500/10 text-rose-500 disabled:cursor-not-allowed disabled:opacity-45"
          aria-label={`Remove ${item.label}`}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

export function PrimaryNavigationEditor({
  profilePath,
}: {
  profilePath: string;
}) {
  const {
    selectedItems,
    availableItems,
    hasCustomNavigation,
    addItem,
    removeItem,
    moveItem,
    resetNavigation,
  } = usePrimaryNavigationPreferences(profilePath);
  const [searchValue, setSearchValue] = useState("");
  const normalizedSearch = searchValue.trim().toLowerCase();
  const filteredAvailableItems = useMemo(
    () =>
      availableItems.filter((item) =>
        !normalizedSearch
          ? true
          : [item.label, item.mobileLabel, item.groupLabel, item.description]
              .join(" ")
              .toLowerCase()
              .includes(normalizedSearch)
      ),
    [availableItems, normalizedSearch]
  );
  const availableGroups = useMemo(
    () =>
      [
        "Core tab",
        "Room shortcut",
        "Tool shortcut",
      ].map((groupLabel) => ({
        groupLabel,
        items: filteredAvailableItems.filter((item) => item.groupLabel === groupLabel),
      })),
    [filteredAvailableItems]
  );

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-app-text">Edit tabs</p>
          <p className="text-xs text-app-muted">Saved locally</p>
        </div>

        <button
          type="button"
          onClick={resetNavigation}
          disabled={!hasCustomNavigation}
          className="inline-flex items-center gap-2 rounded-full border border-app-border bg-app-secondary px-3 py-2 text-xs font-semibold text-app-text disabled:cursor-not-allowed disabled:opacity-50"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          Reset
        </button>
      </div>

      <div className="flex items-center justify-between gap-3 text-xs text-app-muted">
        <span>{selectedItems.length} tabs</span>
        {selectedItems.length > 5 ? <span>Scrolls after 5</span> : null}
      </div>

      <div className="space-y-2">
        {selectedItems.map((item, index) => (
          <SelectedItemRow
            key={item.id}
            item={item}
            index={index}
            total={selectedItems.length}
            onMove={moveItem}
            onRemove={removeItem}
          />
        ))}
      </div>

      <label className="relative block">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-app-muted" />
        <input
          value={searchValue}
          onChange={(event) => setSearchValue(event.target.value)}
          placeholder="Add apps or tabs"
          className="input-shell h-11 pl-10"
        />
      </label>

      <div className="space-y-3">
        {filteredAvailableItems.length ? (
          availableGroups.map((group) =>
            group.items.length ? (
              <div key={group.groupLabel} className="space-y-2">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-app-muted">
                  {group.groupLabel}
                </p>
                <div className="flex flex-wrap gap-2">
                  {group.items.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => addItem(item.id)}
                      className="inline-flex items-center gap-2 rounded-full border border-app-border bg-app-card px-3 py-2 text-sm font-semibold text-app-text transition hover:border-brand/25 hover:bg-app-secondary"
                    >
                      <item.icon className="h-4 w-4 text-brand" />
                      <span>{item.label}</span>
                      <Plus className="h-3.5 w-3.5 text-brand" />
                    </button>
                  ))}
                </div>
              </div>
            ) : null
          )
        ) : (
          <p className="text-xs text-app-muted">No more apps or tabs</p>
        )}
      </div>
    </div>
  );
}
