import { ChevronLeft, ChevronRight, ExternalLink } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { downloadBlobNatively } from "../../../lib/nativeDownload";
import { getPdfPageCountFromUrl, renderPdfPageToCanvas } from "../../../lib/pdf";

interface PdfResultFileView {
  url: string;
  name: string;
  size: number;
  mimeType: string;
}

interface PdfResultPanelProps {
  error: string | null;
  status: string | null;
  busy: boolean;
  result: PdfResultFileView | null;
  formatBytes: (bytes: number) => string;
}

function isPdfResult(result: PdfResultFileView | null) {
  if (!result) return false;
  if ((result.mimeType || "").toLowerCase().includes("pdf")) return true;
  return result.name.toLowerCase().endsWith(".pdf");
}

function isImageResult(result: PdfResultFileView | null) {
  if (!result) return false;
  if ((result.mimeType || "").toLowerCase().startsWith("image/")) return true;
  return [".png", ".jpg", ".jpeg", ".webp", ".gif", ".bmp"].some((ext) => result.name.toLowerCase().endsWith(ext));
}

function PdfCanvasPreview({
  url,
  compact,
}: {
  url: string;
  compact?: boolean;
}) {
  const frameRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [renderWidth, setRenderWidth] = useState(compact ? 700 : 1200);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setCurrentPage(1);
    setLoading(true);
    setError(null);

    let active = true;

    void getPdfPageCountFromUrl(url).then(
      (pages) => {
        if (active) {
          setTotalPages(Math.max(1, pages));
        }
      },
      (nextError) => {
        if (active) {
          setError(nextError instanceof Error ? nextError.message : "Unable to read this PDF.");
          setLoading(false);
        }
      }
    );

    return () => {
      active = false;
    };
  }, [url]);

  useEffect(() => {
    const frame = frameRef.current;

    if (!frame) {
      return;
    }

    const updateWidth = () => {
      const nextWidth = Math.max(compact ? 220 : 320, Math.min(compact ? 820 : 1400, Math.floor(frame.clientWidth - 16)));
      setRenderWidth((current) => (current === nextWidth ? current : nextWidth));
    };

    updateWidth();

    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", updateWidth);
      return () => {
        window.removeEventListener("resize", updateWidth);
      };
    }

    const observer = new ResizeObserver(updateWidth);
    observer.observe(frame);

    return () => {
      observer.disconnect();
    };
  }, [compact]);

  useEffect(() => {
    const canvas = canvasRef.current;

    if (!canvas || error) {
      return;
    }

    let active = true;
    setLoading(true);

    void renderPdfPageToCanvas(url, currentPage, canvas, renderWidth).then(
      () => {
        if (active) {
          setLoading(false);
        }
      },
      (nextError) => {
        if (active) {
          setError(nextError instanceof Error ? nextError.message : "Unable to render this PDF.");
          setLoading(false);
        }
      }
    );

    return () => {
      active = false;
    };
  }, [currentPage, error, renderWidth, url]);

  return (
    <div className="space-y-2">
      <div ref={frameRef} className="rounded-2xl border border-app-border bg-app-secondary/20 p-2">
        {error ? (
          <p className="rounded-2xl border border-rose-500/15 bg-rose-500/10 px-4 py-3 text-sm text-rose-500">
            {error}
          </p>
        ) : (
          <div
            className={`mx-auto overflow-auto rounded-2xl bg-white p-2 shadow-inner ${
              compact ? "max-h-[52vh] sm:max-h-72" : "h-full min-h-[220px] sm:min-h-[260px]"
            }`}
          >
            <canvas ref={canvasRef} className="mx-auto block h-auto w-full max-w-full" />
          </div>
        )}
      </div>

      <div className="grid grid-cols-3 items-center gap-2">
        <button
          type="button"
          onClick={() => setCurrentPage((current) => Math.max(1, current - 1))}
          disabled={currentPage <= 1 || !!error}
          className="btn-secondary justify-self-start !px-2 !py-1 text-xs disabled:opacity-50"
        >
          <ChevronLeft className="mr-1 h-3.5 w-3.5" />
          Prev
        </button>
        <p className="px-1 text-center text-[11px] font-semibold text-app-muted sm:text-xs">{loading ? "Loading PDF..." : `Page ${currentPage} of ${totalPages}`}</p>
        <button
          type="button"
          onClick={() => setCurrentPage((current) => Math.min(totalPages, current + 1))}
          disabled={currentPage >= totalPages || !!error}
          className="btn-secondary justify-self-end !px-2 !py-1 text-xs disabled:opacity-50"
        >
          Next
          <ChevronRight className="ml-1 h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

export function PdfResultPanel({ error, status, busy, result, formatBytes }: PdfResultPanelProps) {
  const [fullscreenOpen, setFullscreenOpen] = useState(false);
  const canPreviewPdf = useMemo(() => isPdfResult(result), [result]);
  const canPreviewImage = useMemo(() => isImageResult(result), [result]);

  return (
    <div className="rounded-[22px] border border-app-border bg-app-card/90 p-2.5 shadow-[0_20px_60px_-34px_rgba(15,23,42,0.35)] sm:rounded-[24px] sm:p-3">
      <p className="text-sm font-semibold text-app-text">Output</p>
      <p className="mt-1 text-xs text-app-muted">Generated file appears here with preview.</p>

      {error ? <p className="mt-3 rounded-2xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 sm:text-sm">{error}</p> : null}
      {status ? <p className="mt-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700 sm:text-sm">{status}</p> : null}

      {result ? (
        <div className="mt-3 space-y-2 rounded-2xl border border-app-border bg-app-card p-2.5 sm:p-3">
          <p className="break-all text-sm font-medium text-app-text">{result.name}</p>
          <p className="text-xs text-app-muted">Size: {formatBytes(result.size)}</p>
          <p className="text-xs text-app-muted">Type: {result.mimeType || "application/octet-stream"}</p>
          <button
            type="button"
            className="btn-primary inline-flex w-full sm:w-auto"
            onClick={async () => {
              try {
                const res = await fetch(result.url);
                const blob = await res.blob();
                await downloadBlobNatively(blob, result.name);
              } catch (e) {
                console.error("Native download failed", e);
              }
            }}
          >
            Download Result
          </button>

          {canPreviewPdf ? (
            <div className="space-y-2">
              <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                <a
                  href={result.url}
                  target="_blank"
                  rel="noreferrer"
                  className="btn-secondary w-full !px-2 !py-1 sm:w-auto"
                >
                  <ExternalLink className="mr-1 h-3.5 w-3.5" />
                  Open
                </a>
                <button type="button" className="btn-secondary w-full !px-2 !py-1 sm:w-auto" onClick={() => setFullscreenOpen(true)}>
                  Fullscreen Preview
                </button>
              </div>
              <PdfCanvasPreview url={result.url} compact />
            </div>
          ) : null}

          {canPreviewImage ? (
            <img src={result.url} alt="Output preview" className="max-h-56 w-full rounded-2xl border border-app-border object-contain bg-app-secondary/35 sm:max-h-72" />
          ) : null}

          {!canPreviewPdf && !canPreviewImage ? (
            <p className="text-xs text-app-muted">Preview is not available for this file type. Download to view.</p>
          ) : null}
        </div>
      ) : (
        <p className="mt-3 text-sm text-app-muted">No result yet. Run a tool to generate output.</p>
      )}

      {busy ? <p className="mt-3 text-sm text-app-muted">Processing PDF locally in your browser...</p> : null}

      {fullscreenOpen && result && canPreviewPdf ? (
        <div className="fixed inset-0 z-50 bg-slate-950/75 p-2 sm:p-4" role="dialog" aria-modal="true">
          <div className="mx-auto flex h-full max-w-7xl flex-col rounded-[24px] border border-white/20 bg-app-card p-2.5 sm:rounded-[28px] sm:p-3">
            <div className="mb-2 flex items-start justify-between gap-2 sm:items-center">
              <p className="text-sm font-semibold text-app-text">PDF Fullscreen Preview</p>
              <button type="button" className="btn-secondary !px-2 !py-1" onClick={() => setFullscreenOpen(false)}>
                Close
              </button>
            </div>
            <PdfCanvasPreview url={result.url} />
          </div>
        </div>
      ) : null}
    </div>
  );
}
