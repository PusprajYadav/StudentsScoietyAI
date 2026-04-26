import { ChevronLeft, ChevronRight, Expand, ExternalLink, FileText } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { getPdfPageCountFromUrl, renderPdfPageToCanvas } from "../lib/pdf";

interface PdfInlineViewerProps {
  url: string;
  name?: string | null;
  pageCount?: number | null;
  onOpen?: () => void;
}

export function PdfInlineViewer({ url, name, pageCount, onOpen }: PdfInlineViewerProps) {
  const rootRef = useRef<HTMLElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const previewFrameRef = useRef<HTMLDivElement | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(pageCount || 1);
  const [renderWidth, setRenderWidth] = useState(680);
  const [isVisible, setIsVisible] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setCurrentPage(1);
  }, [url]);

  useEffect(() => {
    const node = rootRef.current;

    if (!node) {
      return;
    }

    if (typeof IntersectionObserver === "undefined") {
      setIsVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "500px 0px" }
    );

    observer.observe(node);

    return () => {
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    let active = true;

    if (!isVisible) {
      return;
    }

    void (async () => {
      try {
        if (!pageCount) {
          const detectedPages = await getPdfPageCountFromUrl(url);
          if (active) {
            setTotalPages(detectedPages);
          }
        } else {
          setTotalPages(pageCount);
        }
      } catch (loadError) {
        if (active) {
          setError(loadError instanceof Error ? loadError.message : "Unable to read this PDF.");
        }
      }
    })();

    return () => {
      active = false;
    };
  }, [isVisible, pageCount, url]);

  useEffect(() => {
    const frame = previewFrameRef.current;

    if (!frame) {
      return;
    }

    const updateWidth = () => {
      const nextWidth = Math.max(220, Math.min(620, Math.floor(frame.clientWidth - 16)));
      setRenderWidth((current) => (current === nextWidth ? current : nextWidth));
    };

    updateWidth();

    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", updateWidth);
      return () => {
        window.removeEventListener("resize", updateWidth);
      };
    }

    const observer = new ResizeObserver(() => {
      updateWidth();
    });

    observer.observe(frame);

    return () => {
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;

    if (!canvas || !isVisible) {
      return;
    }

    let active = true;
    setLoading(true);
    setError(null);

    void renderPdfPageToCanvas(url, currentPage, canvas, renderWidth).then(
      () => {
        if (active) {
          setLoading(false);
        }
      },
      (renderError) => {
        if (active) {
          setError(renderError instanceof Error ? renderError.message : "Unable to render this PDF.");
          setLoading(false);
        }
      }
    );

    return () => {
      active = false;
    };
  }, [currentPage, isVisible, renderWidth, url]);

  return (
    <section
      ref={rootRef}
      className="w-full min-w-0 overflow-hidden rounded-[24px] border border-app-border bg-app-card"
      style={{ contentVisibility: "auto", containIntrinsicSize: "420px" }}
    >
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-app-border px-3 py-3 sm:px-4">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <div className="rounded-2xl bg-brand/10 p-2.5 text-brand sm:p-3">
            <FileText className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-app-text">
              {name || "PDF attachment"}
            </p>
            <p className="text-xs text-app-muted">Read it without leaving the post.</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {onOpen ? (
            <button
              type="button"
              onClick={onOpen}
              className="inline-flex shrink-0 items-center gap-2 rounded-full bg-brand/10 px-2.5 py-1.5 text-xs font-semibold text-brand sm:px-3 sm:py-2 sm:text-sm"
            >
              <Expand className="h-4 w-4" />
              View full
            </button>
          ) : null}

          <a
            href={url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex shrink-0 items-center gap-2 rounded-full bg-app-secondary px-2.5 py-1.5 text-xs font-semibold text-app-text sm:px-3 sm:py-2 sm:text-sm"
          >
            <ExternalLink className="h-4 w-4" />
            Open
          </a>
        </div>
      </div>

      <div ref={previewFrameRef} className="bg-app-secondary/40 p-3 sm:p-4">
        {!isVisible ? (
          <div className="rounded-2xl border border-app-border bg-app p-4 text-sm text-app-muted">
            PDF preview will load when this post is on screen.
          </div>
        ) : error ? (
          <p className="rounded-2xl border border-rose-500/15 bg-rose-500/10 px-4 py-3 text-sm text-rose-500">
            {error}
          </p>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-app-border bg-app p-2 shadow-inner sm:p-3">
            <div
              className={`mx-auto max-h-[240px] w-full max-w-[620px] overflow-auto rounded-xl bg-white p-1.5 shadow-sm sm:max-h-[320px] sm:p-2 xl:max-h-[340px] ${
                onOpen ? "cursor-zoom-in" : ""
              }`}
              onClick={onOpen}
              role={onOpen ? "button" : undefined}
              tabIndex={onOpen ? 0 : undefined}
              onKeyDown={
                onOpen
                  ? (event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        onOpen();
                      }
                    }
                  : undefined
              }
            >
              <canvas ref={canvasRef} className="block h-auto w-full max-w-full" />
            </div>
          </div>
        )}

        {loading ? <p className="mt-3 text-sm text-app-muted">Loading PDF page...</p> : null}
      </div>

      <div className="flex items-center justify-between border-t border-app-border px-4 py-3">
        <button
          type="button"
          onClick={() => setCurrentPage((current) => Math.max(1, current - 1))}
          disabled={currentPage <= 1}
          className="inline-flex items-center gap-2 rounded-full bg-app-secondary px-4 py-2 text-sm font-semibold text-app-text disabled:opacity-50"
        >
          <ChevronLeft className="h-4 w-4" />
          Prev
        </button>

        <p className="text-sm font-semibold text-app-muted">
          Page {currentPage} of {totalPages}
        </p>

        <button
          type="button"
          onClick={() => setCurrentPage((current) => Math.min(totalPages, current + 1))}
          disabled={currentPage >= totalPages}
          className="inline-flex items-center gap-2 rounded-full bg-app-secondary px-4 py-2 text-sm font-semibold text-app-text disabled:opacity-50"
        >
          Next
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </section>
  );
}
