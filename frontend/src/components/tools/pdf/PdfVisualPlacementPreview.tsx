import { ChevronLeft, ChevronRight, ExternalLink } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type MouseEvent, type PointerEvent, type RefObject } from "react";
import { getPdfPageCountFromUrl, renderPdfPageToCanvas } from "../../../lib/pdf";

type VisualTarget = "text" | "image";

interface RectPx {
  left: number;
  top: number;
  width: number;
  height: number;
}

interface PdfVisualPlacementPreviewProps {
  widthPx: number;
  heightPx: number;
  visualTarget: VisualTarget;
  onVisualTargetChange: (target: VisualTarget) => void;
  textLines: string[];
  textColor: string;
  textRect: RectPx;
  imageRect: RectPx;
  imagePreviewUrl: string | null;
  sourcePdfPreviewUrl: string | null;
  boardRef: RefObject<HTMLDivElement>;
  onBoardPointerMove: (event: PointerEvent<HTMLDivElement>) => void;
  onBoardPointerUp: (event: PointerEvent<HTMLDivElement>) => void;
  onBoardPointerLeave: (event: PointerEvent<HTMLDivElement>) => void;
  onBoardClick: (event: MouseEvent<HTMLDivElement>) => void;
  onTextDragStart: (event: PointerEvent<HTMLDivElement>) => void;
  onImageDragStart: (event: PointerEvent<HTMLDivElement>) => void;
}

function FullTextBlock({ textLines, textColor }: { textLines: string[]; textColor: string }) {
  return (
    <div className="h-full w-full overflow-auto whitespace-pre-wrap break-words text-[11px] leading-snug" style={{ color: textColor }}>
      {textLines.map((line, index) => (
        <p key={`${line}-${index}`} className="min-h-[1em]">{line || " "}</p>
      ))}
    </div>
  );
}

function PdfSourcePreview({
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
      const nextWidth = Math.max(compact ? 220 : 320, Math.min(compact ? 760 : 1200, Math.floor(frame.clientWidth - 16)));
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
              compact ? "max-h-[52vh] sm:max-h-64" : "h-full min-h-[220px] sm:min-h-[260px]"
            }`}
          >
            <canvas ref={canvasRef} className="mx-auto block h-auto w-full max-w-full" />
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-[auto_1fr_auto] sm:items-center">
        <button
          type="button"
          onClick={() => setCurrentPage((current) => Math.max(1, current - 1))}
          disabled={currentPage <= 1 || !!error}
          className="btn-secondary w-full !px-2 !py-1 text-xs disabled:opacity-50 sm:w-auto"
        >
          <ChevronLeft className="mr-1 h-3.5 w-3.5" />
          Prev
        </button>
        <p className="px-1 text-center text-[11px] font-semibold text-app-muted sm:text-xs">{loading ? "Loading PDF..." : `Page ${currentPage} of ${totalPages}`}</p>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
          <a
            href={url}
            target="_blank"
            rel="noreferrer"
            className="btn-secondary w-full !px-2 !py-1 text-xs sm:w-auto"
          >
            <ExternalLink className="mr-1 h-3.5 w-3.5" />
            Open
          </a>
          <button
            type="button"
            onClick={() => setCurrentPage((current) => Math.min(totalPages, current + 1))}
            disabled={currentPage >= totalPages || !!error}
            className="btn-secondary w-full !px-2 !py-1 text-xs disabled:opacity-50 sm:w-auto"
          >
            Next
            <ChevronRight className="ml-1 h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

export function PdfVisualPlacementPreview({
  widthPx,
  heightPx,
  visualTarget,
  onVisualTargetChange,
  textLines,
  textColor,
  textRect,
  imageRect,
  imagePreviewUrl,
  sourcePdfPreviewUrl,
  boardRef,
  onBoardPointerMove,
  onBoardPointerUp,
  onBoardPointerLeave,
  onBoardClick,
  onTextDragStart,
  onImageDragStart,
}: PdfVisualPlacementPreviewProps) {
  const [isFullscreenOpen, setIsFullscreenOpen] = useState(false);

  const textStylePercent = useMemo(
    () => ({
      left: `${(textRect.left / widthPx) * 100}%`,
      top: `${(textRect.top / heightPx) * 100}%`,
      width: `${(textRect.width / widthPx) * 100}%`,
      minHeight: `${(textRect.height / heightPx) * 100}%`,
    }),
    [textRect.height, textRect.left, textRect.top, textRect.width, heightPx, widthPx]
  );

  const imageStylePercent = useMemo(
    () => ({
      left: `${(imageRect.left / widthPx) * 100}%`,
      top: `${(imageRect.top / heightPx) * 100}%`,
      width: `${(imageRect.width / widthPx) * 100}%`,
      height: `${(imageRect.height / heightPx) * 100}%`,
    }),
    [heightPx, imageRect.height, imageRect.left, imageRect.top, imageRect.width, widthPx]
  );

  return (
    <>
      <div className="space-y-2 rounded-2xl border border-app-border bg-app-card p-2.5 sm:p-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs font-medium text-app-muted">Visual placement preview (drag elements to set coordinates)</p>
          <button type="button" className="btn-secondary w-full !px-2 !py-1 sm:w-auto" onClick={() => setIsFullscreenOpen(true)}>
            Fullscreen Preview
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button type="button" className={visualTarget === "text" ? "tab-active rounded-full px-3 py-2 text-[11px] font-semibold sm:text-xs" : "tab-inactive rounded-full px-3 py-2 text-[11px] sm:text-xs"} onClick={() => onVisualTargetChange("text")}>
            Place Text
          </button>
          <button type="button" className={visualTarget === "image" ? "tab-active rounded-full px-3 py-2 text-[11px] font-semibold sm:text-xs" : "tab-inactive rounded-full px-3 py-2 text-[11px] sm:text-xs"} onClick={() => onVisualTargetChange("image")}>
            Place Image
          </button>
        </div>

        <div className="overflow-x-auto pb-1 scrollbar-none">
          <div
            ref={boardRef}
            className="relative mx-auto overflow-hidden rounded-2xl border border-app-border bg-white"
            style={{ width: `${widthPx}px`, height: `${heightPx}px` }}
            onPointerMove={onBoardPointerMove}
            onPointerUp={onBoardPointerUp}
            onPointerLeave={onBoardPointerLeave}
            onClick={onBoardClick}
          >
            <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_bottom,rgba(15,23,42,0.03)_1px,transparent_1px)] bg-[length:100%_24px]" />
            <div
              className="absolute cursor-move rounded border border-sky-400/80 bg-sky-50/90 p-1 text-sky-900 shadow"
              style={{ left: `${textRect.left}px`, top: `${textRect.top}px`, width: `${textRect.width}px`, minHeight: `${textRect.height}px` }}
              onPointerDown={onTextDragStart}
            >
              <FullTextBlock textLines={textLines} textColor={textColor} />
            </div>
            {imagePreviewUrl ? (
              <div
                className="absolute cursor-move overflow-hidden rounded border border-emerald-500/80 shadow"
                style={{ left: `${imageRect.left}px`, top: `${imageRect.top}px`, width: `${imageRect.width}px`, height: `${imageRect.height}px` }}
                onPointerDown={onImageDragStart}
              >
                <img src={imagePreviewUrl} alt="Overlay preview" className="h-full w-full object-cover" />
              </div>
            ) : null}
          </div>
        </div>

        <p className="text-[11px] text-app-muted">Click empty area to place selected target. Drag text/image blocks to reposition before applying.</p>
        {sourcePdfPreviewUrl ? (
          <details className="rounded-2xl border border-app-border bg-app-secondary/20 p-2">
            <summary className="cursor-pointer text-xs font-medium text-app-muted">Source PDF preview</summary>
            <div className="mt-2">
              <PdfSourcePreview url={sourcePdfPreviewUrl} compact />
            </div>
          </details>
        ) : null}
      </div>

      {isFullscreenOpen ? (
        <div className="fixed inset-0 z-50 bg-slate-950/75 p-2 sm:p-4" role="dialog" aria-modal="true">
          <div className="mx-auto flex h-full max-w-7xl flex-col rounded-[24px] border border-white/20 bg-app-card p-2.5 sm:rounded-[28px] sm:p-3">
            <div className="mb-2 flex items-center justify-between gap-2">
              <p className="text-sm font-semibold text-app-text">Full Preview</p>
              <button type="button" className="btn-secondary !px-2 !py-1" onClick={() => setIsFullscreenOpen(false)}>
                Close
              </button>
            </div>
            <div className="grid min-h-0 flex-1 gap-3 xl:grid-cols-[minmax(0,1fr)_minmax(0,380px)]">
              <div className="min-h-0 rounded-2xl border border-app-border bg-app-card p-2">
                <div className="relative mx-auto h-full w-full max-w-4xl overflow-hidden rounded-2xl border border-app-border bg-white">
                  <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_bottom,rgba(15,23,42,0.03)_1px,transparent_1px)] bg-[length:100%_24px]" />
                  <div className="absolute rounded border border-sky-400/80 bg-sky-50/90 p-2 text-sky-900 shadow" style={textStylePercent}>
                    <FullTextBlock textLines={textLines} textColor={textColor} />
                  </div>
                  {imagePreviewUrl ? (
                    <div className="absolute overflow-hidden rounded border border-emerald-500/80 shadow" style={imageStylePercent}>
                      <img src={imagePreviewUrl} alt="Overlay preview fullscreen" className="h-full w-full object-cover" />
                    </div>
                  ) : null}
                </div>
              </div>
              {sourcePdfPreviewUrl ? (
                <div className="min-h-0 rounded-2xl border border-app-border bg-app-card p-2">
                  <PdfSourcePreview url={sourcePdfPreviewUrl} />
                </div>
              ) : (
                <div className="flex items-center justify-center rounded-2xl border border-dashed border-app-border bg-app-card p-4 text-sm text-app-muted">
                  Load a PDF to see source preview here.
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
