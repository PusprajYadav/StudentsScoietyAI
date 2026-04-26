import { ArrowLeft, Maximize2, Minimize2 } from "lucide-react";
import { Suspense, useEffect, useState } from "react";
import { Link, Navigate, useLocation, useParams } from "react-router-dom";
import { LazyModuleBoundary } from "../components/LazyModuleBoundary";
import { getToolAppBySlug } from "../data/workspaceApps";
import { getLazyToolComponent } from "../lib/toolRuntimeRegistry";

function ToolWorkspaceFallback() {
  return (
    <div className="glass-card p-4 sm:p-6">
      <p className="font-display text-xl font-semibold text-app-text">Loading tool...</p>
      <p className="mt-2 text-sm text-app-muted">Opening this workspace only when you ask for it.</p>
    </div>
  );
}

export function ToolWorkspacePage() {
  const { toolSlug } = useParams<{ toolSlug?: string }>();
  const location = useLocation();
  const [fullscreenSupported, setFullscreenSupported] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const isInsideMyRoom = location.pathname.startsWith("/app/myroom/");
  const activeTool = getToolAppBySlug(toolSlug);

  if (!activeTool) {
    return <Navigate to={isInsideMyRoom ? "/app/myroom" : "/app/tools"} replace />;
  }

  const ActiveToolComponent = getLazyToolComponent(activeTool.toolSlug);
  const backHref = isInsideMyRoom ? "/app/tools?view=my-room" : "/app/tools?view=tools";
  const backLabel = isInsideMyRoom ? "Back to My Room" : "Back to Tools";
  const useShellHeaderOnly = activeTool.toolSlug === "ai-teacher";
  const hideInlineHeaderOnMobile = activeTool.toolSlug === "ai-teacher-play-area";

  useEffect(() => {
    const root = document.documentElement;
    setFullscreenSupported(typeof root.requestFullscreen === "function");
    setIsFullscreen(Boolean(document.fullscreenElement));

    const handleFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  async function toggleFullscreen() {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
        return;
      }

      await document.documentElement.requestFullscreen();
    } catch (error) {
      console.error("Workspace fullscreen toggle failed", error);
    }
  }

  return (
    <div className="space-y-3 sm:space-y-4">
      {!isFullscreen && !useShellHeaderOnly ? (
        <section className={`${hideInlineHeaderOnMobile ? "hidden sm:block" : ""} rounded-[20px] border border-app-border/80 bg-app-card/85 px-3 py-2.5 shadow-[0_18px_36px_-30px_rgba(15,23,42,0.18)] backdrop-blur-sm sm:rounded-[24px] sm:px-5 sm:py-3`}>
          <div className="flex flex-col gap-3 min-[520px]:flex-row min-[520px]:items-center min-[520px]:justify-between">
            <div className="flex min-w-0 flex-col gap-1.5 min-[520px]:flex-row min-[520px]:items-center min-[520px]:gap-2">
              <Link
                to={backHref}
                className="inline-flex w-fit items-center gap-1.5 rounded-full bg-app-secondary px-2.5 py-1.5 text-[10px] font-semibold text-app-text transition hover:bg-brand/10 hover:text-brand sm:gap-2 sm:px-3.5 sm:py-2 sm:text-xs"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                {backLabel}
              </Link>

              <div className="min-w-0">
                <h1 className="hidden font-display text-[1.02rem] font-semibold tracking-tight text-app-text min-[520px]:truncate sm:block sm:text-[1.55rem]">
                  {activeTool.title}
                </h1>
              </div>
            </div>

            {fullscreenSupported ? (
              <button
                type="button"
                onClick={() => {
                  void toggleFullscreen();
                }}
                className="hidden w-fit items-center gap-2 self-start rounded-full border border-app-border bg-white px-3 py-2 text-[11px] font-semibold text-app-text transition hover:border-brand/30 hover:bg-brand/5 hover:text-brand sm:inline-flex sm:px-3.5 sm:text-xs min-[520px]:self-auto"
                aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
                title={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
              >
                {isFullscreen ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
                <span>{isFullscreen ? "Exit Fullscreen" : "Fullscreen"}</span>
              </button>
            ) : null}
          </div>
        </section>
      ) : null}

      <LazyModuleBoundary
        resetKey={activeTool.toolSlug}
        title={`${activeTool.title} could not finish loading.`}
      >
        <Suspense fallback={<ToolWorkspaceFallback />}>
          <ActiveToolComponent key={activeTool.toolSlug} showTitleBlock={false} />
        </Suspense>
      </LazyModuleBoundary>
    </div>
  );
}
