import { ArrowRight, Search, SlidersHorizontal, X, type LucideIcon } from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";

interface ToolCategoryFilterOption {
  key: string;
  title: string;
  count: number;
}

interface ToolCategoryFilterItem {
  id: string;
  title: string;
  description: string;
  kicker: string;
  status: string;
  href: string;
  available: boolean;
  icon: LucideIcon;
  categoryKey: string;
  categoryTitle: string;
}

interface ToolCategoryFilterSheetProps {
  activeKey: string;
  activeTitle: string;
  options: ToolCategoryFilterOption[];
  items: ToolCategoryFilterItem[];
  onSelect: (key: string) => void;
}

export function ToolCategoryFilterSheet({
  activeKey,
  activeTitle,
  options,
  items,
  onSelect,
}: ToolCategoryFilterSheetProps) {
  const [open, setOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const activeOption = options.find((option) => option.key === activeKey) || options[0];
  const normalizedSearch = searchValue.trim().toLowerCase();
  const filteredItems = useMemo(
    () =>
      items.filter((item) => {
        const matchesCategory = activeKey === "all" ? true : item.categoryKey === activeKey;
        const matchesSearch = normalizedSearch
          ? [item.title, item.kicker, item.description, item.status, item.categoryTitle]
              .join(" ")
              .toLowerCase()
              .includes(normalizedSearch)
          : true;

        return matchesCategory && matchesSearch;
      }),
    [activeKey, items, normalizedSearch]
  );

  return (
    <>
      <button
        type="button"
        className="native-pill inline-flex items-center gap-2 !px-3.5 !py-2 text-xs"
        onClick={() => {
          setSearchValue("");
          setOpen(true);
        }}
        aria-label="Open tool filters"
      >
        <SlidersHorizontal className="h-4 w-4" />
        Browse
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm" role="dialog" aria-modal="true">
          <div className="flex h-full items-end justify-center p-0 sm:p-4">
            <div className="native-sheet flex h-[88dvh] w-full max-w-2xl flex-col p-4 sm:h-full sm:rounded-[32px] sm:border sm:shadow-2xl">
              <div className="mx-auto mb-3 h-1.5 w-14 rounded-full bg-app-border sm:hidden" />

              <div className="flex items-start justify-between gap-3 pb-4">
                <div>
                  <p className="text-center font-display text-[1.7rem] font-bold tracking-tight text-brand sm:text-left sm:text-2xl">
                    Browse Tools
                  </p>
                  <p className="mt-1 text-sm text-app-muted">
                    Move between categories and open apps directly on mobile.
                  </p>
                  <div className="mt-3 inline-flex rounded-full bg-app-secondary px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-app-muted">
                    Active: {activeOption?.title || activeTitle}
                  </div>
                </div>

                <button
                  type="button"
                  className="native-icon-button h-10 w-10"
                  onClick={() => {
                    setSearchValue("");
                    setOpen(false);
                  }}
                  aria-label="Close filters"
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
                    placeholder="Search apps to open..."
                    className="w-full rounded-[18px] border border-app-border/70 bg-app-secondary/80 px-10 py-3 text-base text-app-text outline-none transition placeholder:text-app-muted focus:border-brand/30 focus:bg-app-card focus:ring-4 focus:ring-brand/10"
                  />
                </label>

                <div className="mb-4 overflow-x-auto pb-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                  <div className="flex w-max items-center gap-2 pr-1">
                    {options.map((option) => {
                      const active = option.key === activeKey;

                      return (
                        <button
                          key={option.key}
                          type="button"
                          onClick={() => onSelect(option.key)}
                          className={
                            active
                              ? "inline-flex shrink-0 items-center gap-2 rounded-full bg-[#1d4ed8] px-4 py-2 text-xs font-semibold text-white shadow-[0_14px_28px_-18px_rgba(29,78,216,0.85)] transition hover:bg-[#1e40af]"
                              : "btn-secondary inline-flex shrink-0 items-center gap-2 !rounded-full !px-4 !py-2 text-xs"
                          }
                        >
                          <span>{option.title}</span>
                          <span className="rounded-full bg-black/10 px-2 py-0.5 text-[10px] font-semibold text-current dark:bg-white/10">
                            {option.count}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-3">
                  {filteredItems.length ? filteredItems.map((item) => {
                    const Icon = item.icon;

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
                          <p className="mt-1 line-clamp-2 text-xs text-app-muted">{item.description}</p>
                          <div className="mt-2 flex flex-wrap items-center gap-2">
                            <span className="rounded-full bg-app-secondary px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-app-muted">
                              {item.categoryTitle}
                            </span>
                            <span
                              className={`rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] ${
                                item.available ? "bg-emerald-500/12 text-emerald-700" : "bg-app-secondary text-app-muted"
                              }`}
                            >
                              {item.status}
                            </span>
                          </div>
                        </div>

                        {item.available ? (
                          <Link
                            to={item.href}
                            onClick={() => {
                              setSearchValue("");
                              setOpen(false);
                            }}
                            className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-brand/25 bg-brand/10 px-4 py-2 text-[12px] font-semibold text-brand transition hover:border-brand/40 hover:bg-brand/15"
                          >
                            Open
                            <ArrowRight className="h-3.5 w-3.5" />
                          </Link>
                        ) : (
                          <span className="inline-flex shrink-0 items-center rounded-full border border-app-border bg-app-secondary px-4 py-2 text-[12px] font-semibold text-app-muted">
                            Soon
                          </span>
                        )}
                      </div>
                    );
                  }) : (
                    <div className="rounded-[22px] border border-dashed border-app-border bg-app px-4 py-8 text-center">
                      <p className="text-sm font-semibold text-app-text">No apps match that search</p>
                      <p className="mt-1 text-xs text-app-muted">Try another keyword or switch to a different category.</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="border-t border-app-border pt-4">
                <p className="text-xs text-app-muted">
                  {activeOption
                    ? `${filteredItems.length} app${filteredItems.length === 1 ? "" : "s"} ready in ${activeOption.title}.`
                    : "Choose a section to refresh the tools grid below."}
                </p>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
