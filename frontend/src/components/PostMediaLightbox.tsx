import {
  ChevronLeft,
  ChevronRight,
  Expand,
  ExternalLink,
  FileText,
  Image as ImageIcon,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { getPdfPageCountFromUrl, renderPdfPageToCanvas } from "../lib/pdf";

export interface PostMediaLightboxItem {
  id: string;
  type: "image" | "pdf";
  url: string;
  alt: string;
  name?: string | null;
  pageCount?: number | null;
}

interface PostMediaLightboxProps {
  open: boolean;
  items: PostMediaLightboxItem[];
  initialIndex: number;
  onClose: () => void;
}

function clampIndex(index: number, length: number) {
  if (length <= 0) {
    return 0;
  }

  if (index < 0) {
    return 0;
  }

  if (index >= length) {
    return length - 1;
  }

  return index;
}

function getItemLabel(item: PostMediaLightboxItem, index: number) {
  return item.type === "pdf" ? "PDF" : `Image ${index + 1}`;
}

export function PostMediaLightbox({
  open,
  items,
  initialIndex,
  onClose,
}: PostMediaLightboxProps) {
  const [activeIndex, setActiveIndex] = useState(() => clampIndex(initialIndex, items.length));
  const [currentPdfPage, setCurrentPdfPage] = useState(1);
  const [totalPdfPages, setTotalPdfPages] = useState(items[initialIndex]?.pageCount || 1);
  const [renderWidth, setRenderWidth] = useState(960);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const pdfFrameRef = useRef<HTMLDivElement | null>(null);
  const activeItem = items[activeIndex] || null;
  const hasMultipleItems = items.length > 1;

  useEffect(() => {
    if (!open) {
      return;
    }

    setActiveIndex(clampIndex(initialIndex, items.length));
  }, [initialIndex, items.length, open]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
        return;
      }

      if (!hasMultipleItems) {
        return;
      }

      if (event.key === "ArrowLeft") {
        setActiveIndex((current) => (current === 0 ? items.length - 1 : current - 1));
      }

      if (event.key === "ArrowRight") {
        setActiveIndex((current) => (current === items.length - 1 ? 0 : current + 1));
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [hasMultipleItems, items.length, onClose, open]);

  useEffect(() => {
    if (!open || !activeItem) {
      return;
    }

    setError(null);
    setCurrentPdfPage(1);
    setTotalPdfPages(activeItem.pageCount || 1);
    setLoading(activeItem.type === "pdf");
  }, [activeItem, open]);

  useEffect(() => {
    let active = true;

    if (!open || !activeItem || activeItem.type !== "pdf") {
      return;
    }

    void (async () => {
      try {
        if (activeItem.pageCount) {
          setTotalPdfPages(activeItem.pageCount);
          return;
        }

        const detectedPages = await getPdfPageCountFromUrl(activeItem.url);
        if (active) {
          setTotalPdfPages(detectedPages);
        }
      } catch (loadError) {
        if (active) {
          setError(loadError instanceof Error ? loadError.message : "Unable to read this PDF.");
          setLoading(false);
        }
      }
    })();

    return () => {
      active = false;
    };
  }, [activeItem, open]);

  useEffect(() => {
    const frame = pdfFrameRef.current;

    if (!open || !frame || activeItem?.type !== "pdf") {
      return;
    }

    const updateWidth = () => {
      const nextWidth = Math.max(260, Math.min(1180, Math.floor(frame.clientWidth - 24)));
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
  }, [activeItem?.type, open]);

  useEffect(() => {
    const canvas = canvasRef.current;

    if (!open || !canvas || !activeItem || activeItem.type !== "pdf") {
      return;
    }

    let active = true;
    setLoading(true);
    setError(null);

    void renderPdfPageToCanvas(activeItem.url, currentPdfPage, canvas, renderWidth).then(
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
  }, [activeItem, currentPdfPage, open, renderWidth]);

  if (!open || !activeItem) {
    return null;
  }

  const activeItemLabel = getItemLabel(activeItem, activeIndex);
  const activeTitle =
    activeItem.type === "pdf"
      ? activeItem.name?.trim() || "PDF attachment"
      : activeItem.name?.trim() || activeItem.alt || activeItemLabel;

  return (
    <div
      className="fixed inset-0 z-[80] bg-slate-950/92 backdrop-blur-md"
      onClick={onClose}
      role="presentation"
    >
      <div className="flex h-full flex-col px-2 py-2 sm:px-4 sm:py-4" onClick={(event) => event.stopPropagation()}>
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Full view for ${activeTitle}`}
          className="flex min-h-0 flex-1 flex-col"
        >
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-[24px] border border-white/10 bg-slate-900/80 px-4 py-3 text-white shadow-2xl">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/60">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-2.5 py-1">
                  {activeItem.type === "pdf" ? <FileText className="h-3.5 w-3.5" /> : <ImageIcon className="h-3.5 w-3.5" />}
                  {activeItemLabel}
                </span>
                {hasMultipleItems ? <span>{activeIndex + 1} / {items.length}</span> : null}
              </div>
              <p className="mt-1 truncate text-sm font-semibold text-white sm:text-lg">{activeTitle}</p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <a
                href={activeItem.url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-sm font-semibold text-white transition hover:bg-white/10"
              >
                <ExternalLink className="h-4 w-4" />
                Open original
              </a>
              <button
                type="button"
                onClick={onClose}
                className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-sm font-semibold text-white transition hover:bg-white/10"
              >
                <X className="h-4 w-4" />
                Close
              </button>
            </div>
          </div>

          <div className="relative mt-3 flex min-h-0 flex-1 items-center justify-center">
            {hasMultipleItems ? (
              <>
                <button
                  type="button"
                  onClick={() =>
                    setActiveIndex((current) => (current === 0 ? items.length - 1 : current - 1))
                  }
                  className="absolute left-1 top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/10 bg-slate-950/70 text-white shadow-xl transition hover:bg-slate-900 sm:left-3"
                  aria-label="Previous media"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setActiveIndex((current) => (current === items.length - 1 ? 0 : current + 1))
                  }
                  className="absolute right-1 top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/10 bg-slate-950/70 text-white shadow-xl transition hover:bg-slate-900 sm:right-3"
                  aria-label="Next media"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              </>
            ) : null}

            <div className="flex h-full w-full min-h-0 overflow-hidden rounded-[26px] border border-white/10 bg-slate-900/80 shadow-2xl">
              {activeItem.type === "image" ? (
                <div className="flex h-full w-full items-center justify-center bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.12),_transparent_42%)] p-3 sm:p-6">
                  <img
                    src={activeItem.url}
                    alt={activeItem.alt}
                    className="h-full max-h-full w-full max-w-full object-contain"
                  />
                </div>
              ) : (
                <div ref={pdfFrameRef} className="flex h-full w-full min-h-0 flex-col p-2 sm:p-4">
                  <div className="flex-1 overflow-auto rounded-[22px] bg-slate-950/40 p-2 sm:p-3">
                    {error ? (
                      <div className="rounded-[20px] border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
                        {error}
                      </div>
                    ) : (
                      <div className="mx-auto w-full max-w-[1180px] rounded-[18px] bg-white p-2 shadow-2xl sm:p-3">
                        <canvas ref={canvasRef} className="block h-auto w-full max-w-full" />
                      </div>
                    )}
                  </div>

                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-white">
                    <div className="text-sm font-semibold text-white/70">
                      Page {currentPdfPage} of {totalPdfPages}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setCurrentPdfPage((current) => Math.max(1, current - 1))}
                        disabled={currentPdfPage <= 1}
                        className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10 disabled:opacity-40"
                      >
                        Prev page
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setCurrentPdfPage((current) => Math.min(totalPdfPages, current + 1))
                        }
                        disabled={currentPdfPage >= totalPdfPages}
                        className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10 disabled:opacity-40"
                      >
                        Next page
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-[22px] border border-white/10 bg-slate-900/75 px-4 py-3 text-white">
            <div className="text-sm text-white/70">
              {activeItem.type === "pdf"
                ? loading
                  ? "Rendering PDF preview..."
                  : "Use the page controls for the PDF and the slider to move across the post media."
                : "Swipe with the slider or arrow keys to move across the post media."}
            </div>

            {hasMultipleItems ? (
              <div className="flex max-w-full gap-2 overflow-x-auto scrollbar-none">
                {items.map((item, itemIndex) => {
                  const selected = itemIndex === activeIndex;

                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setActiveIndex(itemIndex)}
                      className={`whitespace-nowrap rounded-full border px-3 py-2 text-sm font-semibold transition ${
                        selected
                          ? "border-white/30 bg-white text-slate-950"
                          : "border-white/10 bg-white/5 text-white hover:bg-white/10"
                      }`}
                    >
                      <span className="inline-flex items-center gap-2">
                        {item.type === "pdf" ? <FileText className="h-4 w-4" /> : <Expand className="h-4 w-4" />}
                        {getItemLabel(item, itemIndex)}
                      </span>
                    </button>
                  );
                })}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
