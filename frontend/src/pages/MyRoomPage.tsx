import { ArrowRight, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { useLocation } from "react-router-dom";
import { ToolImportSheet } from "../components/ToolImportSheet";
import { RoomIllustration, ToolIllustration } from "../components/WorkspaceAppArt";
import { WorkspaceAppManagerSheet } from "../components/WorkspaceAppManagerSheet";
import { type MyRoomApp } from "../data/workspaceApps";
import { useWorkspaceAppPreferences } from "../hooks/useWorkspaceAppPreferences";
import { buildAuthRedirectPath } from "../lib/authRedirect";
import { useAuthStore } from "../store/authStore";

function MyRoomCard({ app }: { app: MyRoomApp }) {
  const href = app.kind === "tool" ? app.myRoomHref : app.href;
  const content = (
    <>
      <div className={`rounded-[16px] bg-gradient-to-br ${app.artClassName} p-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.14)] sm:rounded-[22px] sm:p-2.5`}>
        {app.kind === "tool" ? <ToolIllustration variant={app.workspace} /> : <RoomIllustration variant={app.variant} />}
      </div>

      <div className="mt-1.5 flex items-start justify-between gap-1">
        <div className="inline-flex min-w-0 max-w-[calc(100%-2rem)] items-center gap-1 rounded-full bg-app-secondary px-1.25 py-0.5 text-[5.5px] font-semibold uppercase leading-none tracking-[0.04em] text-app-muted sm:max-w-[calc(100%-2.9rem)] sm:gap-1.5 sm:px-2 sm:text-[7px] xl:text-[7.5px]">
          <span className="truncate">{app.kicker}</span>
        </div>
        <span
          className={`rounded-full px-1.25 py-0.5 text-[5.5px] font-semibold uppercase tracking-[0.04em] sm:px-2 sm:text-[7px] xl:text-[7.5px] ${
            app.available ? "bg-emerald-500/12 text-emerald-700" : "bg-app-secondary text-app-muted"
          }`}
        >
          {app.status}
        </span>
      </div>

      <h2 className="mt-1.5 min-h-[1.5rem] line-clamp-2 font-display text-[0.7rem] font-semibold leading-[1.05] tracking-tight text-app-text sm:min-h-[2.2rem] sm:text-[0.98rem] xl:text-[1.02rem]">
        {app.title}
      </h2>
      <p className="mt-1 min-h-[1.64rem] line-clamp-2 text-[7.5px] leading-[0.82rem] text-app-muted sm:min-h-[2.1rem] sm:text-[10.5px] sm:leading-[1.05rem] xl:text-[11px]">{app.description}</p>

      <div className="mt-2">
        {app.available ? (
          <span className="inline-flex w-full items-center justify-center gap-1 rounded-full bg-brand px-1.75 py-1 text-[8px] font-semibold text-white transition group-hover:bg-brand-dark sm:w-auto sm:gap-1.5 sm:px-3 sm:py-2 sm:text-[10.5px]">
            Open
            <ArrowRight className="h-2.5 w-2.5 sm:h-3.5 sm:w-3.5" />
          </span>
        ) : (
          <span className="inline-flex w-full items-center justify-center gap-1 rounded-full border border-app-border bg-app-secondary px-1.75 py-1 text-[8px] font-semibold text-app-muted sm:w-auto sm:gap-1.5 sm:px-3 sm:py-2 sm:text-[10.5px]">
            Soon
            <Sparkles className="h-2.5 w-2.5 sm:h-3.5 sm:w-3.5" />
          </span>
        )}
      </div>
    </>
  );

  const shellClassName =
    "group flex h-full min-h-[160px] flex-col rounded-[18px] border border-app-border/90 bg-app-card p-2 shadow-[0_14px_28px_-26px_rgba(15,23,42,0.18)] transition duration-200 sm:min-h-[224px] sm:rounded-[24px] sm:p-3";

  if (!app.available) {
    return <article className={shellClassName}>{content}</article>;
  }

  return (
    <Link
      to={href}
      className={`${shellClassName} hover:-translate-y-1 hover:border-brand/35`}
    >
      {content}
    </Link>
  );
}

export function MyRoomPage() {
  const location = useLocation();
  const { user } = useAuthStore();
  const {
    orderedCatalogApps,
    managedMyRoomApps,
    visibleMyRoomApps,
    moveMyRoomItem,
    resetMyRoomOrder,
    hasCustomMyRoomOrder,
    isMyRoomAppHidden,
    setMyRoomAppHidden,
    showAllMyRoomApps,
    importApp,
    removeImportedApp,
    isAppImported,
  } = useWorkspaceAppPreferences();

  const hasImportedApps = managedMyRoomApps.length > 0;
  const hasVisibleApps = visibleMyRoomApps.length > 0;
  const authHref = buildAuthRedirectPath(location);

  return (
    <div className="native-page">
      <section className="mb-2 space-y-3">
        <div className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-2">
          <div className="min-w-0">
            <p className="truncate text-[11px] font-semibold uppercase tracking-[0.16em] text-app-muted">Your Workspace</p>
          </div>

          <div className="flex shrink-0 items-center">
            <ToolImportSheet
              items={orderedCatalogApps.map((app) => ({
                id: app.id,
                title: app.title,
                description: app.description,
                status: app.status,
                available: app.available,
                icon: app.icon,
                artClassName: app.artClassName,
              }))}
              isImported={isAppImported}
              onImport={importApp}
              onRemove={removeImportedApp}
            />
          </div>

          <div className="flex shrink-0 items-center">
            <WorkspaceAppManagerSheet
              title="Manage My Room Apps"
              description="Reorder your room, hide anything you do not want right now, and unhide it anytime later."
              items={managedMyRoomApps.map((app) => ({
                id: app.id,
                title: app.title,
                subtitle: app.description,
                status: app.status,
                kindLabel: app.kind === "tool" ? "Imported Tool" : "Imported Room",
                hidden: isMyRoomAppHidden(app.id),
                removable: true,
                icon: app.icon,
                artClassName: app.artClassName,
              }))}
              onMove={moveMyRoomItem}
              onToggleHidden={setMyRoomAppHidden}
              onRemove={removeImportedApp}
              onResetOrder={resetMyRoomOrder}
              onShowAll={showAllMyRoomApps}
              hasCustomOrder={hasCustomMyRoomOrder}
            />
          </div>
        </div>

      </section>

      {!user ? (
        <section className="native-soft-card flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-brand">Guest My Room</p>
            <p className="mt-1 font-display text-[1.05rem] font-semibold tracking-tight text-app-text sm:text-[1.2rem]">
              Your default room stays visible even before login.
            </p>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-app-muted">
              Sign in only when you want synced drafts, live sharing, cloud saves, and cross-device access.
            </p>
          </div>

          <Link to={authHref} className="btn-primary min-h-[44px] shrink-0 px-4">
            Log in for sync
          </Link>
        </section>
      ) : null}

      {hasVisibleApps ? (
        <section className="grid auto-rows-fr grid-cols-3 gap-1.5 sm:gap-3 md:grid-cols-3 xl:grid-cols-5">
          {visibleMyRoomApps.map((app) => (
            <MyRoomCard key={app.id} app={app} />
          ))}
        </section>
      ) : (
        <section className="glass-card flex min-h-[260px] flex-col items-center justify-center px-6 py-10 text-center">
          <p className="font-display text-xl font-semibold text-app-text">
            {hasImportedApps ? "Your room is currently hidden." : "Your room is empty."}
          </p>
          <p className="mt-2 max-w-md text-sm text-app-muted">
            {hasImportedApps
              ? "Unhide apps from Manage, or use Import to add or remove apps."
              : "Use Import to add the apps you want to use in My Room."}
          </p>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
            {hasImportedApps ? (
              <button type="button" className="btn-secondary" onClick={showAllMyRoomApps}>
                Show hidden apps
              </button>
            ) : null}
          </div>
        </section>
      )}
    </div>
  );
}
