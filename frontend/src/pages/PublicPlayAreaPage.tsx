import { Download, Import, PencilLine } from "lucide-react";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Link, Navigate, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { PlayAreaDocumentViewer } from "../features/ai-teacher-play-area/components/PlayAreaDocumentViewer";
import { exportPlayAreaDocumentPdf } from "../features/ai-teacher-play-area/pdf";
import { buildPlayAreaEditPath, loadSharedPlayAreaDocument } from "../features/ai-teacher-play-area/share";
import {
  importPlayAreaDocumentSnapshot,
  loadPlayAreaStorage,
  savePlayAreaDocument,
} from "../features/ai-teacher-play-area/storage";
import type { PlayAreaDocument } from "../features/ai-teacher-play-area/types";

export function PublicPlayAreaPage() {
  const navigate = useNavigate();
  const { documentId } = useParams<{ documentId: string }>();
  const [searchParams] = useSearchParams();
  const snapshotParam = searchParams.get("snapshot");
  const [documentData, setDocumentData] = useState<PlayAreaDocument | null>(null);
  const [loading, setLoading] = useState(true);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [importing, setImporting] = useState(false);
  const isSharedSnapshot = Boolean(snapshotParam);

  useEffect(() => {
    let disposed = false;

    async function loadDocument() {
      setLoading(true);
      try {
        if (snapshotParam) {
          const sharedDocument = await loadSharedPlayAreaDocument(snapshotParam);
          if (!disposed) {
            setDocumentData(sharedDocument);
          }
          return;
        }

        const localDocument = loadPlayAreaStorage().documents.find((candidate) => candidate.id === documentId) || null;
        if (!disposed) {
          setDocumentData(localDocument);
        }
      } catch (error) {
        if (!disposed) {
          toast.error(error instanceof Error ? error.message : "Could not load this PlayArea.");
          setDocumentData(null);
        }
      } finally {
        if (!disposed) {
          setLoading(false);
        }
      }
    }

    void loadDocument();

    return () => {
      disposed = true;
    };
  }, [documentId, snapshotParam]);

  if (!documentId && !snapshotParam) {
    return <Navigate to="/app/myroom/tools/ai-teacher-play-area" replace />;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.14),transparent_30%),linear-gradient(180deg,#f0f9ff_0%,#f8fafc_100%)] px-3 py-8 sm:px-4 sm:py-10">
        <div className="mx-auto max-w-5xl rounded-[26px] border border-slate-200/80 bg-white/86 px-4 py-12 text-center shadow-[0_34px_90px_-50px_rgba(15,23,42,0.34)] sm:rounded-[32px] sm:px-6 sm:py-16">
          <div className="mx-auto mb-5 h-12 w-12 animate-spin rounded-full border-[3px] border-sky-300/35 border-t-sky-600" />
          <p className="font-display text-2xl font-semibold text-slate-950">Loading PlayArea...</p>
          <p className="mt-2 text-sm text-slate-500">Preparing the full study view.</p>
        </div>
      </div>
    );
  }

  if (!documentData) {
    return (
      <div className="min-h-screen bg-[linear-gradient(180deg,#f0f9ff_0%,#f8fafc_100%)] px-3 py-8 sm:px-4 sm:py-10">
        <div className="mx-auto max-w-5xl rounded-[26px] border border-slate-200/80 bg-white/86 px-4 py-12 text-center shadow-[0_34px_90px_-50px_rgba(15,23,42,0.34)] sm:rounded-[32px] sm:px-6 sm:py-16">
          <p className="font-display text-2xl font-semibold text-slate-950">PlayArea not available.</p>
          <p className="mt-2 text-sm text-slate-500">This document may have been removed or the share snapshot could not be loaded.</p>
          <Link to="/app/myroom/tools/ai-teacher-play-area" className="mt-5 inline-flex rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white">
            Open PlayArea
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.16),transparent_28%),radial-gradient(circle_at_bottom_right,_rgba(56,189,248,0.13),transparent_32%),linear-gradient(180deg,#f0f9ff_0%,#f8fafc_100%)] px-0 py-0 sm:px-5 sm:py-6">
      <div className="mx-auto max-w-[1400px]">
        <div className="mb-0 rounded-none border-x-0 border-b border-t-0 border-slate-200/80 bg-white/88 p-2.5 shadow-sm sm:backdrop-blur sm:mb-4 sm:rounded-[30px] sm:border sm:p-5 sm:shadow-[0_26px_70px_-48px_rgba(15,23,42,0.32)]">
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="hidden text-[10px] font-semibold uppercase tracking-[0.2em] text-sky-700 sm:block">
                {isSharedSnapshot ? "Shared PlayArea" : "Full PlayArea View"}
              </p>
              <h1 className="font-display text-lg font-semibold leading-tight tracking-tight text-slate-950 sm:mt-1 sm:text-2xl">{documentData.title}</h1>
              <p className="hidden text-xs leading-5 text-slate-500 sm:block sm:mt-1 sm:text-sm sm:leading-6">
                {isSharedSnapshot ? "Import this snapshot to edit your own copy, or export it as a PDF." : "Read, export, or jump back into editing."}
              </p>
            </div>

            <div className="flex flex-row items-center gap-2">
              {isSharedSnapshot ? (
                <button
                  type="button"
                  disabled={importing}
                  onClick={() => {
                    setImporting(true);
                    try {
                      const imported = importPlayAreaDocumentSnapshot(documentData);
                      savePlayAreaDocument(imported);
                      toast.success("PlayArea imported.");
                      navigate(buildPlayAreaEditPath(imported.id));
                    } catch (error) {
                      toast.error(error instanceof Error ? error.message : "Could not import this PlayArea.");
                    } finally {
                      setImporting(false);
                    }
                  }}
                  className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-full bg-slate-950 px-3 py-2 text-xs font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto sm:px-4 sm:py-2.5 sm:text-sm"
                >
                  <Import className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  <span className="truncate">{importing ? "Importing" : "Import"}</span>
                </button>
              ) : (
                <Link
                  to={buildPlayAreaEditPath(documentData.id)}
                  className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-full bg-slate-950 px-3 py-2 text-xs font-semibold text-white transition hover:bg-slate-800 sm:w-auto sm:px-4 sm:py-2.5 sm:text-sm"
                >
                  <PencilLine className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  Edit
                </Link>
              )}

              <button
                type="button"
                disabled={exportingPdf}
                onClick={() => {
                  setExportingPdf(true);
                  void exportPlayAreaDocumentPdf(documentData).then(
                    () => {
                      toast.success("PDF exported.");
                      setExportingPdf(false);
                    },
                    (error: unknown) => {
                      toast.error(error instanceof Error ? error.message : "PDF export failed.");
                      setExportingPdf(false);
                    }
                  );
                }}
                className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-sky-300 hover:bg-sky-50 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto sm:px-4 sm:py-2.5 sm:text-sm"
              >
                <Download className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                <span className="truncate">{exportingPdf ? "Exporting" : "PDF"}</span>
              </button>
            </div>
          </div>
        </div>

        <PlayAreaDocumentViewer documentData={documentData} />
      </div>
    </div>
  );
}
