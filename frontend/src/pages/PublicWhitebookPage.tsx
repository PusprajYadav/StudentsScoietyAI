import { Download, Import, NotebookPen } from "lucide-react";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Navigate, useLocation, useNavigate, useParams } from "react-router-dom";
import { WhitebookCanvas } from "../features/my-room/whitebook/WhitebookCanvas";
import { loadPublicStudentWhitebookShare } from "../features/my-room/whitebook/api";
import { saveLocalWhitebookNotebook } from "../features/my-room/whitebook/localStore";
import type { WhitebookExportPayload, WhitebookShareRecord, WhitebookViewport } from "../features/my-room/whitebook/types";
import {
  buildPublicWhitebookPath,
  countWhitebookPageItems,
  createImportedWhitebookNotebook,
  getWhitebookOwnerLabel,
  parseEmbeddedWhitebookPayloadFromLinkUrl,
} from "../features/my-room/whitebook/utils";

export function PublicWhitebookPage() {
  const { shareSlug, username } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const isEmbed = new URLSearchParams(location.search).get("embed") === "true";

  const [share, setShare] = useState<WhitebookShareRecord | null>(null);
  const [embeddedSnapshot, setEmbeddedSnapshot] = useState<WhitebookExportPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [activePageId, setActivePageId] = useState("");
  const [viewport, setViewport] = useState<WhitebookViewport>({ zoom: 1, offsetX: 0, offsetY: 0 });
  const [canvasResetNonce, setCanvasResetNonce] = useState(0);
  const [importing, setImporting] = useState(false);

  useEffect(() => {
    if (!shareSlug) {
      setLoading(false);
      return;
    }

    setLoading(true);
    void parseEmbeddedWhitebookPayloadFromLinkUrl(window.location.href)
      .then((payload) => {
        if (payload) {
          setEmbeddedSnapshot(payload);
          setShare(null);
          setActivePageId(payload.activePageId);
          setLoading(false);
          return;
        }

        return loadPublicStudentWhitebookShare(shareSlug)
          .then((item) => {
            if (username && item.owner?.username && username !== item.owner.username) {
              navigate(buildPublicWhitebookPath(item.share_slug, item.owner.username), { replace: true });
              return;
            }

            setEmbeddedSnapshot(null);
            setShare(item);
            setActivePageId(item.snapshot.activePageId);
            setLoading(false);
          })
          .catch(() => {
            setEmbeddedSnapshot(null);
            setShare(null);
            setLoading(false);
          });
      })
      .catch(() => {
        setEmbeddedSnapshot(null);
        setShare(null);
        setLoading(false);
      });
  }, [navigate, shareSlug, username]);

  if (!shareSlug) {
    return <Navigate to="/app/myroom" replace />;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[linear-gradient(180deg,#f8fafc_0%,#eef2ff_100%)] px-3 py-6 sm:px-5 sm:py-8">
        <div className="mx-auto w-full rounded-[32px] border border-slate-200/80 bg-white/80 px-6 py-16 text-center shadow-[0_30px_90px_-40px_rgba(15,23,42,0.35)] backdrop-blur">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-500">Shared WhiteBook</p>
          <p className="mt-4 font-display text-2xl font-semibold text-app-text">Loading board...</p>
          <p className="mt-2 text-sm text-app-muted">Preparing the shared notebook view.</p>
        </div>
      </div>
    );
  }

  if (!share && !embeddedSnapshot) {
    return (
      <div className="min-h-screen bg-[linear-gradient(180deg,#f8fafc_0%,#eef2ff_100%)] px-3 py-6 sm:px-5 sm:py-8">
        <div className="mx-auto w-full rounded-[32px] border border-slate-200/80 bg-white/80 px-6 py-16 text-center shadow-[0_30px_90px_-40px_rgba(15,23,42,0.35)] backdrop-blur">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-500">Shared WhiteBook</p>
          <p className="mt-4 font-display text-2xl font-semibold text-app-text">This WhiteBook snapshot is not available.</p>
        </div>
      </div>
    );
  }

  const snapshot = embeddedSnapshot || share?.snapshot || null;
  const shareTitle = embeddedSnapshot?.title || share?.title || "Shared WhiteBook";
  const ownerLabel = share ? getWhitebookOwnerLabel(share) : username || "Student";
  const activePage =
    snapshot?.pages.find((page) => page.id === activePageId) ||
    snapshot?.pages.find((page) => page.id === snapshot.activePageId) ||
    snapshot?.pages[0] ||
    null;

  if (!activePage) {
    return <Navigate to="/app/myroom" replace />;
  }

  return (
    <div className={isEmbed ? "min-h-screen bg-white" : "min-h-screen bg-[radial-gradient(circle_at_top,_rgba(37,99,235,0.12),transparent_28%),linear-gradient(180deg,#f8fafc_0%,#eef2ff_100%)] px-2 py-2 sm:px-4 sm:py-4 lg:px-5 lg:py-5"}>
      <div className={isEmbed ? "w-full" : "mx-auto w-full"}>
        <div className={isEmbed ? "bg-white" : "overflow-hidden rounded-[32px] border border-slate-200/80 bg-white/90 shadow-[0_34px_100px_-42px_rgba(15,23,42,0.38)] backdrop-blur"}>
          {!isEmbed ? (
            <div className="border-b border-slate-200/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(248,250,252,0.92))] px-5 py-5 sm:px-7 sm:py-6">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">Shared WhiteBook</p>
                  <h1 className="mt-2 font-display text-2xl font-semibold tracking-tight text-app-text sm:text-3xl">
                    {shareTitle}
                  </h1>
                  <p className="mt-2 text-sm text-app-muted">Shared by {ownerLabel}</p>
                </div>

                <div className="flex flex-wrap items-center gap-2.5">
                  <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-600">
                    <NotebookPen className="h-4 w-4 text-brand" />
                    {(snapshot?.pages.length || share?.page_count || 1)} page{(snapshot?.pages.length || share?.page_count || 1) === 1 ? "" : "s"}
                  </span>

                  <button
                    type="button"
                    disabled={importing}
                    onClick={() => {
                      setImporting(true);
                      const notebook = createImportedWhitebookNotebook(snapshot!, {
                        title: `${embeddedSnapshot?.title || share?.title || "WhiteBook"} Copy`,
                        sourceShareSlug: share?.share_slug || null,
                      });

                      void saveLocalWhitebookNotebook(notebook)
                        .then(() => {
                          toast.success("WhiteBook imported to My Room.");
                          navigate(`/app/myroom/whitebook-notebook?notebook=${notebook.id}`);
                        })
                        .catch((error) => {
                          toast.error(error instanceof Error ? error.message : "Could not import this WhiteBook.");
                        })
                        .finally(() => {
                          setImporting(false);
                        });
                    }}
                    className="inline-flex items-center gap-2 rounded-full bg-brand px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <Import className="h-4 w-4" />
                    {importing ? "Importing..." : "Import to My Room"}
                  </button>
                </div>
              </div>
            </div>
          ) : null}

          <div className={isEmbed ? "bg-white" : "grid gap-3 bg-[linear-gradient(180deg,rgba(248,250,252,0.96),rgba(239,246,255,0.9))] p-2.5 sm:p-4 lg:grid-cols-[minmax(0,1fr)_188px] lg:items-start lg:p-4 xl:grid-cols-[minmax(0,1fr)_204px] xl:p-5"}>
            <div className="min-w-0">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-medium text-app-muted">
                  {activePage.name}
                </p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    className="rounded-full bg-app-secondary px-3 py-2 text-xs font-semibold text-app-text"
                    onClick={() => {
                      setViewport({ zoom: 1, offsetX: 0, offsetY: 0 });
                      setCanvasResetNonce((current) => current + 1);
                    }}
                  >
                    Reset view
                  </button>
                  <span className="inline-flex items-center gap-1 rounded-full bg-app-secondary px-3 py-2 text-xs font-semibold text-app-text">
                    <Download className="h-3.5 w-3.5" />
                    {Math.round(viewport.zoom * 100)}%
                  </span>
                </div>
              </div>

              <WhitebookCanvas
                page={activePage}
                activeTool="hand"
                eraserMode="stroke"
                strokeColor="#111827"
                strokeSize={4}
                viewport={viewport}
                resetSignal={canvasResetNonce}
                readonly
                selectedImageId={null}
                onSelectedImageIdChange={() => undefined}
                onViewportChange={setViewport}
                onPageChange={() => undefined}
              />
            </div>

            {!isEmbed ? (
              <aside className="h-fit rounded-[24px] border border-app-border bg-white/92 p-3 shadow-[0_18px_50px_-38px_rgba(15,23,42,0.4)] lg:sticky lg:top-5 lg:max-h-[calc(100vh-220px)] lg:self-start lg:overflow-y-auto">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-app-muted">Pages</p>
                  <span className="rounded-full bg-app-secondary px-2 py-1 text-[10px] font-semibold text-app-text">
                    {snapshot?.pages.length || 0}
                  </span>
                </div>
                <div className="mt-2.5 space-y-2">
                  {snapshot?.pages.map((page, index) => (
                    <button
                      key={page.id}
                      type="button"
                      onClick={() => {
                        setActivePageId(page.id);
                        setViewport({ zoom: 1, offsetX: 0, offsetY: 0 });
                        setCanvasResetNonce((current) => current + 1);
                      }}
                      className={`block w-full rounded-[16px] border px-2.5 py-2.5 text-left transition ${
                        page.id === activePageId ? "border-brand/35 bg-brand/5" : "border-app-border bg-app-card"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate text-[13px] font-semibold text-app-text">{page.name}</p>
                          <p className="mt-0.5 text-[10px] text-app-muted">
                            {countWhitebookPageItems(page)} item{countWhitebookPageItems(page) === 1 ? "" : "s"}
                          </p>
                        </div>
                        <span className="rounded-full bg-app-secondary px-2 py-1 text-[10px] font-semibold text-app-muted">
                          {index + 1}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </aside>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
