import { Minus, Plus, Search, X, type LucideIcon } from "lucide-react";
import { useState } from "react";

export interface ToolImportItem {
  id: string;
  title: string;
  description: string;
  status: string;
  available?: boolean;
  icon: LucideIcon;
  artClassName: string;
  managementMode?: "toggle" | "readonly";
  importedLabel?: string;
}

interface ToolImportSheetProps {
  items: ToolImportItem[];
  isImported: (id: string) => boolean;
  onImport: (id: string) => void;
  onRemove: (id: string) => void;
}

export function ToolImportSheet({ items, isImported, onImport, onRemove }: ToolImportSheetProps) {
  const [open, setOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const importedCount = items.filter((item) => isImported(item.id)).length;
  const normalizedSearch = searchValue.trim().toLowerCase();
  const filteredItems = items.filter((item) => {
    if (!normalizedSearch) {
      return true;
    }

    return [item.title, item.description, item.status].join(" ").toLowerCase().includes(normalizedSearch);
  });

  return (
    <>
      <button
        type="button"
        className="native-pill inline-flex items-center gap-1.5 !px-3.5 !py-2 text-xs"
        onClick={() => {
          setSearchValue("");
          setOpen(true);
        }}
        aria-label="Manage My Room imports"
      >
        <Plus className="h-4 w-4" />
        <span className="sm:hidden">Imports</span>
        <span className="hidden sm:inline">My Room Imports</span>
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm" role="dialog" aria-modal="true">
          <div className="flex h-full items-end justify-center p-0 sm:p-4">
            <div className="native-sheet flex h-[88dvh] w-full max-w-2xl flex-col p-4 sm:h-full sm:rounded-[32px] sm:border sm:shadow-2xl">
            <div className="mx-auto mb-3 h-1.5 w-14 rounded-full bg-app-border sm:hidden" />
            <div className="flex items-start justify-between gap-3 pb-4">
              <div>
                <p className="text-center font-display text-[1.7rem] font-bold tracking-tight text-brand sm:text-left sm:text-2xl">
                  Manage My Room Apps
                </p>
                <p className="mt-1 text-sm text-app-muted">Add, remove, and review everything in your mobile workspace.</p>
                <div className="mt-3 inline-flex rounded-full bg-app-secondary px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-app-muted">
                  {importedCount} in My Room
                </div>
              </div>

              <button
                type="button"
                className="native-icon-button h-10 w-10"
                onClick={() => {
                  setSearchValue("");
                  setOpen(false);
                }}
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-auto py-1">
              <label className="relative mb-4 block">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-app-muted" />
                <input
                  value={searchValue}
                  onChange={(event) => setSearchValue(event.target.value)}
                  placeholder="Search apps to import..."
                  className="w-full rounded-[18px] border border-app-border/70 bg-app-secondary/80 px-10 py-3 text-base text-app-text outline-none transition placeholder:text-app-muted focus:border-brand/30 focus:bg-app-card focus:ring-4 focus:ring-brand/10"
                />
              </label>

              <div className="space-y-3">
                {filteredItems.length ? filteredItems.map((item) => {
                  const Icon = item.icon;
                  const imported = isImported(item.id);
                  const managementMode = item.managementMode || "toggle";
                  const canToggleImport = managementMode === "toggle" && (item.available !== false || imported);

                  return (
                    <div
                      key={item.id}
                      className="flex items-center gap-3 rounded-[22px] border border-app-border/80 bg-app-card px-3 py-3.5 shadow-[0_16px_36px_-28px_rgba(15,23,42,0.35)] dark:bg-[linear-gradient(180deg,rgba(13,19,36,0.98),rgba(8,13,28,0.98))] dark:shadow-[0_18px_38px_-26px_rgba(2,6,23,0.9)]"
                    >
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-brand text-white shadow-[0_12px_24px_-16px_rgba(37,99,235,0.6)] ring-1 ring-white/10">
                        <Icon className="h-5 w-5" />
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="truncate font-display text-[1.1rem] font-semibold leading-none text-app-text">{item.title}</p>
                        <p className="mt-1 text-[11px] font-medium uppercase tracking-[0.08em] text-app-muted/90">
                          {imported ? item.importedLabel || "Imported" : item.status}
                        </p>
                      </div>

                      {managementMode === "readonly" ? (
                        <span className="inline-flex shrink-0 items-center rounded-full border border-emerald-400/25 bg-emerald-500/12 px-4 py-2 text-[12px] font-semibold text-emerald-300 dark:text-emerald-300">
                          {item.importedLabel || "Imported"}
                        </span>
                      ) : (
                        <button
                          type="button"
                          className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-4 py-2 text-[12px] font-semibold transition ${
                            imported
                              ? "border border-rose-500/25 bg-rose-500/10 text-rose-600 hover:border-rose-500/40 hover:bg-rose-500/15 dark:text-rose-400"
                              : "border border-brand/30 bg-brand/10 text-brand hover:border-brand/45 hover:bg-brand/15 dark:text-blue-300"
                          }`}
                          onClick={() => (imported ? onRemove(item.id) : onImport(item.id))}
                          disabled={!canToggleImport}
                        >
                          {imported ? <Minus className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
                          {imported ? "Remove" : "Add"}
                        </button>
                      )}
                    </div>
                  );
                }) : (
                  <div className="rounded-[22px] border border-dashed border-app-border bg-app px-4 py-8 text-center">
                    <p className="text-sm font-semibold text-app-text">No apps match that search</p>
                    <p className="mt-1 text-xs text-app-muted">Try another keyword to find a room or tool app.</p>
                  </div>
                )}
              </div>
            </div>

            <div className="border-t border-app-border pt-4">
              <p className="text-xs text-app-muted">Imports save on this browser and device automatically.</p>
            </div>
          </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
