import { ArrowRight, Search, X } from "lucide-react";
import { Suspense, lazy, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { LazyModuleBoundary } from "../components/LazyModuleBoundary";
import { RoomIllustration, ToolIllustration } from "../components/WorkspaceAppArt";
import { LocalCardOrderSheet } from "../components/LocalCardOrderSheet";
import { type ToolCategory, type WorkspaceCatalogApp } from "../data/workspaceApps";
import { useWorkspaceAppPreferences } from "../hooks/useWorkspaceAppPreferences";
import { preloadMyRoomModule } from "../lib/modulePreload";

type ToolCategoryTab = "all" | "academic" | "ai" | "non-ai" | "business";
type WorkspaceView = "my-room" | "tools";

const MyRoomPage = lazy(() => preloadMyRoomModule().then((module) => ({ default: module.MyRoomPage })));

function MyRoomRouteFallback() {
  return (
    <div className="glass-card p-6">
      <p className="font-display text-xl font-semibold text-app-text">Loading your room...</p>
      <p className="mt-2 text-sm text-app-muted">We open My Room only when you switch to it.</p>
    </div>
  );
}

function AppCard({ app, imported }: { app: WorkspaceCatalogApp; imported: boolean }) {
  const art =
    app.kind === "tool" ? <ToolIllustration variant={app.workspace} /> : <RoomIllustration variant={app.variant} />;

  const header = (
    <>
      <div className={`rounded-[16px] bg-gradient-to-br ${app.artClassName} p-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.14)] transition duration-200 group-hover:-translate-y-0.5 sm:rounded-[20px] sm:p-2.5`}>
        {art}
      </div>

      <div className="mt-1.5 flex items-start justify-between gap-1">
        <div className="inline-flex min-w-0 max-w-[calc(100%-2rem)] items-center gap-1 rounded-full bg-app-secondary px-1.25 py-0.5 text-[5.5px] font-semibold uppercase leading-none tracking-[0.04em] text-app-muted sm:max-w-[calc(100%-2.9rem)] sm:gap-1.5 sm:px-2 sm:text-[7px] xl:text-[7.5px]">
          <span className="truncate">{app.kicker}</span>
        </div>
        <div className="flex flex-col items-end gap-1">
          <span
            className={`rounded-full px-1.25 py-0.5 text-[5.5px] font-semibold uppercase tracking-[0.04em] sm:px-2 sm:text-[7px] xl:text-[7.5px] ${
              app.available ? "bg-emerald-500/12 text-emerald-700" : "bg-app-secondary text-app-muted"
            }`}
          >
            {app.status}
          </span>
          {app.kind === "tool" && imported ? (
            <span className="rounded-full bg-brand/10 px-1.25 py-0.5 text-[5.5px] font-semibold uppercase tracking-[0.04em] text-brand sm:px-2 sm:text-[7px] xl:text-[7.5px]">
              Added
            </span>
          ) : null}
        </div>
      </div>

      <h2 className="mt-1.5 min-h-[1.5rem] line-clamp-2 font-display text-[0.7rem] font-semibold leading-[1.05] tracking-tight text-app-text sm:min-h-[2.2rem] sm:text-[0.98rem] xl:text-[1rem]">
        {app.title}
      </h2>
      <p className="mt-1 min-h-[1.64rem] line-clamp-2 text-[7.5px] leading-[0.82rem] text-app-muted sm:min-h-[2.1rem] sm:text-[10.5px] sm:leading-[1.05rem] xl:text-[11px]">{app.description}</p>
    </>
  );

  return (
    <article className="flex h-full min-h-[160px] flex-col rounded-[18px] border border-app-border/90 bg-app-card p-2 shadow-[0_14px_30px_-26px_rgba(15,23,42,0.2)] sm:min-h-[192px] sm:rounded-[24px] sm:p-2.5">
      {app.available ? (
        <Link to={app.href} className="group block">
          {header}
        </Link>
      ) : (
        <div className="group block">{header}</div>
      )}

      <div className="mt-auto pt-2">
        {app.available ? (
          <Link to={app.href} className="btn-primary inline-flex w-full items-center justify-center gap-1 !px-2.25 !py-1 text-[8px] sm:w-auto sm:gap-2 sm:!px-3.5 sm:!py-2 sm:text-xs">
            Open
            <ArrowRight className="h-2.5 w-2.5 sm:h-3.5 sm:w-3.5" />
          </Link>
        ) : (
          <span className="inline-flex w-full items-center justify-center rounded-full border border-app-border bg-app-secondary px-2 py-1 text-[8px] font-semibold text-app-muted sm:w-auto sm:px-3 sm:py-2 sm:text-xs">
            Soon
          </span>
        )}
      </div>
    </article>
  );
}

export function LearningToolsPage() {
  const [searchParams] = useSearchParams();
  const [searchValue, setSearchValue] = useState("");
  const [activeCategory, setActiveCategory] = useState<ToolCategoryTab>("all");
  const {
    orderedCatalogApps,
    moveCatalogItem,
    reorderCatalogItems,
    resetCatalogOrder,
    hasCustomCatalogOrder,
    isAppImported,
  } = useWorkspaceAppPreferences();
  const activeView: WorkspaceView = searchParams.get("view") === "tools" ? "tools" : "my-room";
  const normalizedSearch = searchValue.trim().toLowerCase();
  const filteredCatalogApps = useMemo(
    () =>
      orderedCatalogApps.filter((app) =>
        !normalizedSearch
          ? true
          : [app.title, app.kicker, app.description, app.status].join(" ").toLowerCase().includes(normalizedSearch)
      ),
    [normalizedSearch, orderedCatalogApps]
  );
  const groupedCatalogApps = useMemo(
    () =>
      filteredCatalogApps.reduce<Record<ToolCategory, WorkspaceCatalogApp[]>>(
        (groups, app) => {
          groups[app.category].push(app);
          return groups;
        },
        { ai: [], "non-ai": [], academic: [], business: [] }
      ),
    [filteredCatalogApps]
  );
  const categorySections: { key: ToolCategoryTab; title: string; category?: ToolCategory }[] = [
    { key: "all", title: "All" },
    { key: "academic", title: "Edu", category: "academic" },
    { key: "ai", title: "AI", category: "ai" },
    { key: "non-ai", title: "Non AI", category: "non-ai" },
    { key: "business", title: "Business", category: "business" },
  ];
  const activeCategorySection = categorySections.find((section) => section.key === activeCategory);
  const activeApps = activeCategorySection?.category
    ? groupedCatalogApps[activeCategorySection.category]
    : filteredCatalogApps;

  return (
    <div>
      {activeView === "my-room" ? (
        <LazyModuleBoundary resetKey="my-room" title="My Room could not finish loading.">
          <Suspense fallback={<MyRoomRouteFallback />}>
            <MyRoomPage />
          </Suspense>
        </LazyModuleBoundary>
      ) : null}

      {activeView === "tools" ? (
        <>
      <section className="mb-4 space-y-2.5">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
          <label className="relative block">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-app-muted" />
            <input
              value={searchValue}
              onChange={(event) => setSearchValue(event.target.value)}
              placeholder="Search apps"
              className="input-field h-[2.95rem] w-full rounded-[1.35rem] pl-9 pr-10"
            />
            {searchValue ? (
              <button
                type="button"
                className="absolute right-2 top-1/2 inline-flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-app-muted transition hover:bg-app-secondary hover:text-app-text"
                onClick={() => setSearchValue("")}
                aria-label="Clear search"
              >
                <X className="h-4 w-4" />
              </button>
            ) : null}
          </label>

          <div className="flex shrink-0 items-center justify-end">
            <LocalCardOrderSheet
              title="Arrange Apps"
              description="Move cards up, down, or drag them to set the order you want to see on this device."
              items={orderedCatalogApps.map((app) => ({
                id: app.id,
                title: app.title,
                subtitle: app.description,
                status: app.status,
                kindLabel: app.kind === "tool" ? "Tool App" : "Room App",
                icon: app.icon,
                artClassName: app.artClassName,
              }))}
              onMove={moveCatalogItem}
              onReorder={reorderCatalogItems}
              onReset={resetCatalogOrder}
              hasCustomOrder={hasCustomCatalogOrder}
            />
          </div>
        </div>

        <div className="space-y-2 sm:hidden">
          <div className="overflow-x-auto pb-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
            <div className="flex w-max items-center gap-2 pr-1">
              {categorySections.map((section) => {
                const isActive = section.key === activeCategory;
                const count = section.category ? groupedCatalogApps[section.category].length : filteredCatalogApps.length;

                return (
                  <button
                    key={section.key}
                    type="button"
                    onClick={() => setActiveCategory(section.key)}
                    className={
                      isActive
                        ? "inline-flex shrink-0 items-center gap-2 rounded-full bg-[#1d4ed8] px-3.5 py-2 text-xs font-semibold text-white shadow-[0_14px_28px_-18px_rgba(29,78,216,0.85)] transition hover:bg-[#1e40af]"
                        : "btn-secondary inline-flex shrink-0 items-center gap-2 !rounded-full !px-3.5 !py-2 text-xs"
                    }
                  >
                    <span>{section.title}</span>
                    <span className="rounded-full bg-black/10 px-2 py-0.5 text-[10px] font-semibold text-current dark:bg-white/10">
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="hidden flex-nowrap gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden sm:flex">
          {categorySections.map((section) => {
            const isActive = section.key === activeCategory;
            const count = section.category ? groupedCatalogApps[section.category].length : filteredCatalogApps.length;

            return (
              <button
                key={section.key}
                type="button"
                onClick={() => setActiveCategory(section.key)}
                className={
                  isActive
                    ? "inline-flex shrink-0 items-center gap-2 rounded-full bg-[#1d4ed8] px-4 py-2 text-xs font-semibold text-white shadow-[0_14px_28px_-18px_rgba(29,78,216,0.85)] transition hover:bg-[#1e40af] sm:text-sm"
                    : "btn-secondary inline-flex shrink-0 items-center gap-2 !rounded-full !px-4 !py-2 text-xs sm:text-sm"
                }
              >
                <span>{section.title}</span>
                <span className="rounded-full bg-black/10 px-2 py-0.5 text-[10px] font-semibold text-current dark:bg-white/10">
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-display text-lg font-semibold tracking-tight text-app-text sm:text-xl">
            {categorySections.find((section) => section.key === activeCategory)?.title}
          </h2>
          <span className="rounded-full bg-app-secondary px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-app-muted sm:text-[11px]">
            {activeApps.length}
          </span>
        </div>

        {activeApps.length ? (
          <div className="grid auto-rows-fr grid-cols-3 gap-1.5 sm:gap-3 md:grid-cols-4 xl:grid-cols-5">
            {activeApps.map((app) => (
              <AppCard key={app.id} app={app} imported={isAppImported(app.id)} />
            ))}
          </div>
        ) : (
          <div className="rounded-[18px] border border-dashed border-app-border bg-app-card/60 px-4 py-5 text-sm text-app-muted">
            No tools in this category yet.
          </div>
        )}
      </section>
        </>
      ) : null}
    </div>
  );
}
