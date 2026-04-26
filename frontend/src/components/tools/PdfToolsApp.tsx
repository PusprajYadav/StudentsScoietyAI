import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { useSearchParams } from "react-router-dom";
import { Filesystem } from "@capacitor/filesystem";
import { Capacitor } from "@capacitor/core";
import { toast } from "react-hot-toast";
import {
  Lock,
  FileText,
  Loader2,
  X,
  Plus,
  ChevronLeft,
  ChevronRight,
  Expand,
  ExternalLink,
} from "lucide-react";
import * as pdfTools from "../../lib/browserPdfTools";
import { ImagesToPdfOrderList, type OrderedImageItemView } from "./pdf/ImagesToPdfOrderList";
import { PdfResultPanel } from "./pdf/PdfResultPanel";
import { PdfVisualPlacementPreview } from "./pdf/PdfVisualPlacementPreview";
import { ensureAndroidFileAccessPermission } from "../../lib/androidPermissions";
import { readNativeImportedFile } from "../../lib/nativeFileAccess";
import {
  getPdfPageCountFromFile,
  getPdfPageCountFromUrl,
  isPdfPasswordError,
  renderPdfPageToCanvas,
} from "../../lib/pdf";

type PdfToolKey =
  | "view"
  | "compress"
  | "merge"
  | "split"
  | "extract"
  | "rotate"
  | "remove"
  | "reorder"
  | "lock"
  | "unlock"
  | "metadata"
  | "images_to_pdf"
  | "annotate";

interface PdfResultFile {
  url: string;
  name: string;
  size: number;
  mimeType: string;
}

interface OrderedImageInput extends OrderedImageItemView {
  file: File;
}

type VisualTarget = "text" | "image";
type ToolProcessorResult = { blob: Blob; name: string; mimeType: string };

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback;
}

const PDF_ACCEPT = "application/pdf,application/x-pdf,.pdf";
const IMAGE_ACCEPT = "image/*,.png,.jpg,.jpeg,.webp,.bmp,.gif,.tiff";
const PREVIEW_PAGE_WIDTH_PT = 595;
const PREVIEW_PAGE_HEIGHT_PT = 842;
const PREVIEW_WIDTH_PX = 340;
const PREVIEW_HEIGHT_PX = Math.round((PREVIEW_WIDTH_PX * PREVIEW_PAGE_HEIGHT_PT) / PREVIEW_PAGE_WIDTH_PT);

const PDF_TOOL_META: Record<PdfToolKey, { label: string; description: string }> = {
  view: {
    label: "View PDF",
    description: "Open and view a PDF file directly in the browser with fullscreen support.",
  },
  compress: {
    label: "Compress",
    description: "Reduce PDF size with a normal rewrite first, then stronger rebuilt-page compression when needed.",
  },
  merge: {
    label: "Merge",
    description: "Combine multiple PDF files into one document in upload order.",
  },
  split: {
    label: "Split",
    description: "Split one PDF into multiple parts by ranges or fixed pages per file (ZIP output).",
  },
  extract: {
    label: "Extract Pages",
    description: "Create a new PDF from selected page ranges.",
  },
  rotate: {
    label: "Rotate Pages",
    description: "Rotate all or selected pages by 90°, 180°, or 270°.",
  },
  remove: {
    label: "Remove Pages",
    description: "Delete selected page ranges from a PDF.",
  },
  reorder: {
    label: "Reorder Pages",
    description: "Build a new PDF using an explicit page order list.",
  },
  lock: {
    label: "Lock PDF",
    description: "Set user/owner passwords to protect a PDF.",
  },
  unlock: {
    label: "Unlock PDF",
    description: "Remove PDF password protection with the correct password.",
  },
  metadata: {
    label: "Metadata",
    description: "Update title, author, subject, keywords, creator, and producer fields.",
  },
  images_to_pdf: {
    label: "Images to PDF",
    description: "Convert one or multiple images into a PDF document.",
  },
  annotate: {
    label: "Edit (Text/Image)",
    description: "Add text and image overlays on PDF pages with precise coordinates.",
  },
};

function formatBytes(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / 1024 ** index;
  return `${value.toFixed(value >= 10 || index === 0 ? 0 : 1)} ${units[index]}`;
}

function normalizePositiveInt(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return Math.round(parsed);
}

function normalizeNumber(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed)) return null;
  return parsed;
}

function clampNumber(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function isPdfLikeFile(file: File) {
  const type = (file.type || "").toLowerCase();
  const name = file.name.toLowerCase();
  if (name.endsWith(".pdf")) return true;
  if (type.includes("pdf")) return true;
  return false;
}

function isImageLikeFile(file: File) {
  if (file.type.startsWith("image/")) return true;
  const lower = file.name.toLowerCase();
  return [".png", ".jpg", ".jpeg", ".webp", ".bmp", ".gif", ".tif", ".tiff"].some((ext) => lower.endsWith(ext));
}

function PdfCanvasPage({
  url,
  pageNumber,
  renderWidth,
  password,
}: {
  url: string;
  pageNumber: number;
  renderWidth: number;
  password?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;

    if (!canvas) {
      return;
    }

    let active = true;
    setError(null);

    void renderPdfPageToCanvas(url, pageNumber, canvas, renderWidth, password).catch((nextError) => {
      if (active) {
        setError(nextError instanceof Error ? nextError.message : "Unable to render this PDF page.");
      }
    });

    return () => {
      active = false;
    };
  }, [pageNumber, password, renderWidth, url]);

  return (
    <div className="space-y-2">
      <div className="rounded-xl border border-app-border/70 bg-white p-2 shadow-inner">
        {error ? (
          <p className="rounded-xl border border-rose-500/15 bg-rose-500/10 px-4 py-3 text-sm text-rose-500">
            Page {pageNumber}: {error}
          </p>
        ) : (
          <canvas ref={canvasRef} className="mx-auto block h-auto w-full max-w-full" />
        )}
      </div>
      <p className="text-center text-[11px] font-semibold text-app-muted sm:text-xs">Page {pageNumber}</p>
    </div>
  );
}

function PdfCanvasViewer({
  url,
  name,
  password,
  fullscreen,
  onFullscreen,
}: {
  url: string;
  name?: string | null;
  password?: string;
  fullscreen?: boolean;
  onFullscreen?: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const frameRef = useRef<HTMLDivElement | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [renderWidth, setRenderWidth] = useState(fullscreen ? 1200 : 900);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setCurrentPage(1);
    setLoading(true);
    setError(null);

    let active = true;

    void getPdfPageCountFromUrl(url, password).then(
      (pages) => {
        if (active) {
          setTotalPages(Math.max(1, pages));
          if (fullscreen) {
            setLoading(false);
          }
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
  }, [fullscreen, password, url]);

  useEffect(() => {
    const frame = frameRef.current;

    if (!frame) {
      return;
    }

    const updateWidth = () => {
      const padding = fullscreen ? 24 : 16;
      const maxWidth = fullscreen ? 1400 : 960;
      const minWidth = fullscreen ? 320 : 220;
      const nextWidth = Math.max(minWidth, Math.min(maxWidth, Math.floor(frame.clientWidth - padding)));
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
  }, [fullscreen]);

  useEffect(() => {
    if (fullscreen) {
      return;
    }

    const canvas = canvasRef.current;

    if (!canvas || error) {
      return;
    }

    let active = true;
    setLoading(true);

    void renderPdfPageToCanvas(url, currentPage, canvas, renderWidth, password).then(
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
  }, [currentPage, error, password, renderWidth, url]);

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="min-w-0 flex-1 break-all text-xs font-semibold text-app-text sm:max-w-[55%] sm:truncate">{name || "PDF document"}</p>
        <div className="flex flex-wrap items-center justify-end gap-2">
          {onFullscreen ? (
            <button
              type="button"
              className="btn-secondary !px-3 !py-1.5 text-xs"
              onClick={onFullscreen}
            >
              <Expand className="mr-1 h-3.5 w-3.5" />
              Fullscreen
            </button>
          ) : null}
          <a
            href={url}
            target="_blank"
            rel="noreferrer"
            className="btn-secondary !px-3 !py-1.5 text-xs"
          >
            <ExternalLink className="mr-1 h-3.5 w-3.5" />
            Open
          </a>
        </div>
      </div>

      <div ref={frameRef} className={`rounded-2xl border border-app-border bg-app-secondary/20 p-2 ${fullscreen ? "h-full" : ""}`}>
        {error ? (
          <p className="rounded-2xl border border-rose-500/15 bg-rose-500/10 px-4 py-3 text-sm text-rose-500">
            {error}
          </p>
        ) : (
          <div
            className={`mx-auto overflow-auto rounded-xl bg-white p-2 shadow-inner ${
              fullscreen ? "h-[calc(100vh-11.5rem)] max-h-[calc(100vh-11.5rem)] sm:h-[calc(100vh-13rem)] sm:max-h-[calc(100vh-13rem)]" : "max-h-[55vh] sm:max-h-[70vh]"
            }`}
          >
            {fullscreen ? (
              <div className="space-y-4">
                {Array.from({ length: totalPages }, (_, index) => (
                  <PdfCanvasPage
                    key={`${url}-${index + 1}`}
                    url={url}
                    pageNumber={index + 1}
                    renderWidth={renderWidth}
                    password={password}
                  />
                ))}
              </div>
            ) : (
              <canvas ref={canvasRef} className="mx-auto block h-auto w-full max-w-full" />
            )}
          </div>
        )}
      </div>

      {fullscreen ? (
        <p className="px-1 text-center text-[11px] font-semibold text-app-muted sm:text-xs">
          {loading ? "Loading PDF..." : `Showing all ${totalPages} pages`}
        </p>
      ) : (
        <div className="grid grid-cols-3 items-center gap-2">
          <button
            type="button"
            onClick={() => setCurrentPage((current) => Math.max(1, current - 1))}
            disabled={currentPage <= 1 || !!error}
            className="btn-secondary justify-self-start !px-3 !py-1.5 text-xs disabled:opacity-50"
          >
            <ChevronLeft className="mr-1 h-3.5 w-3.5" />
            Prev
          </button>
          <p className="px-1 text-center text-[11px] font-semibold text-app-muted sm:text-xs">
            {loading ? "Loading PDF..." : `Page ${currentPage} of ${totalPages}`}
          </p>
          <button
            type="button"
            onClick={() => setCurrentPage((current) => Math.min(totalPages, current + 1))}
            disabled={currentPage >= totalPages || !!error}
            className="btn-secondary justify-self-end !px-3 !py-1.5 text-xs disabled:opacity-50"
          >
            Next
            <ChevronRight className="ml-1 h-3.5 w-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}

export function PdfToolsApp({ showTitleBlock = true }: { showTitleBlock?: boolean }) {
  const [activeTool, setActiveTool] = useState<PdfToolKey>("view");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [result, setResult] = useState<PdfResultFile | null>(null);
  const inputVersion = useRef(0);

  const [compressFile, setCompressFile] = useState<File | null>(null);
  const [compressPassword, setCompressPassword] = useState("");
  const [compressStrength, setCompressStrength] = useState(65);

  const [mergeFiles, setMergeFiles] = useState<File[]>([]);

  const [splitFile, setSplitFile] = useState<File | null>(null);
  const [splitMode, setSplitMode] = useState<"ranges" | "fixed">("ranges");
  const [splitRanges, setSplitRanges] = useState("1-2,3-4");
  const [splitFixedSize, setSplitFixedSize] = useState("2");
  const [splitPassword, setSplitPassword] = useState("");

  const [extractFile, setExtractFile] = useState<File | null>(null);
  const [extractPages, setExtractPages] = useState("1-3");
  const [extractPassword, setExtractPassword] = useState("");

  const [rotateFile, setRotateFile] = useState<File | null>(null);
  const [rotateDegrees, setRotateDegrees] = useState("90");
  const [rotatePages, setRotatePages] = useState("");
  const [rotatePassword, setRotatePassword] = useState("");

  const [removeFile, setRemoveFile] = useState<File | null>(null);
  const [removePagesInput, setRemovePagesInput] = useState("2,5-6");
  const [removePassword, setRemovePassword] = useState("");

  const [reorderFile, setReorderFile] = useState<File | null>(null);
  const [reorderInput, setReorderInput] = useState("3,1,2");
  const [reorderPassword, setReorderPassword] = useState("");

  const [lockFile, setLockFile] = useState<File | null>(null);
  const [lockCurrentPassword, setLockCurrentPassword] = useState("");
  const [lockUserPassword, setLockUserPassword] = useState("");
  const [lockOwnerPassword, setLockOwnerPassword] = useState("");

  const [unlockFile, setUnlockFile] = useState<File | null>(null);
  const [unlockPassword, setUnlockPassword] = useState("");

  const [metaFile, setMetaFile] = useState<File | null>(null);
  const [metaPassword, setMetaPassword] = useState("");
  const [metaTitle, setMetaTitle] = useState("");
  const [metaAuthor, setMetaAuthor] = useState("");
  const [metaSubject, setMetaSubject] = useState("");
  const [metaKeywords, setMetaKeywords] = useState("");
  const [metaCreator, setMetaCreator] = useState("");
  const [metaProducer, setMetaProducer] = useState("");

  const [imagesToPdfItems, setImagesToPdfItems] = useState<OrderedImageInput[]>([]);

  const [annotatePdfFile, setAnnotatePdfFile] = useState<File | null>(null);
  const [annotatePassword, setAnnotatePassword] = useState("");
  const [annotatePage, setAnnotatePage] = useState("1");
  const [annotateText, setAnnotateText] = useState("Approved by Student Society");
  const [annotateX, setAnnotateX] = useState("40");
  const [annotateY, setAnnotateY] = useState("740");
  const [annotateFontSize, setAnnotateFontSize] = useState("16");
  const [annotateColor, setAnnotateColor] = useState("#111111");
  const [annotateImageFile, setAnnotateImageFile] = useState<File | null>(null);
  const [annotateImageX, setAnnotateImageX] = useState("40");
  const [annotateImageY, setAnnotateImageY] = useState("420");
  const [annotateImageW, setAnnotateImageW] = useState("180");
  const [annotateImageH, setAnnotateImageH] = useState("180");
  const [annotateImagePreviewUrl, setAnnotateImagePreviewUrl] = useState<string | null>(null);
  const [annotatePdfPreviewUrl, setAnnotatePdfPreviewUrl] = useState<string | null>(null);
  const [visualTarget, setVisualTarget] = useState<VisualTarget>("text");

  const [viewPdfFile, setViewPdfFile] = useState<File | null>(null);
  const [viewPdfUrl, setViewPdfUrl] = useState<string | null>(null);
  const [viewFullscreenOpen, setViewFullscreenOpen] = useState(false);
  const [viewPassword, setViewPassword] = useState("");
  const [viewNeedsPassword, setViewNeedsPassword] = useState(false);
  const [isOpeningIntent, setIsOpeningIntent] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const intentUrl = searchParams.get("intent_url");

  const previewRef = useRef<HTMLDivElement | null>(null);
  const dragStateRef = useRef<{ target: VisualTarget; offsetX: number; offsetY: number } | null>(null);
  const imageItemsRef = useRef<OrderedImageInput[]>([]);

  const toolMeta = PDF_TOOL_META[activeTool];
  const compressProfile = useMemo(() => pdfTools.getPdfCompressionProfile(compressStrength), [compressStrength]);

  async function checkPdfEncryption(file: File, password?: string) {
    try {
      setBusy(true);
      await getPdfPageCountFromFile(file, password);
      return { encrypted: false, valid: true };
    } catch (error) {
      if (isPdfPasswordError(error)) {
        return { encrypted: true, valid: false };
      }
      throw error;
    } finally {
      setBusy(false);
    }
  }

  const loadViewPdf = useCallback(async (file: File, password?: string) => {
    setError(null);
    try {
      const { encrypted } = await checkPdfEncryption(file, password);

      if (encrypted && !password) {
        setViewNeedsPassword(true);
        setViewPdfUrl(null);
        return;
      }

      if (viewPdfUrl) {
        URL.revokeObjectURL(viewPdfUrl);
      }

      const url = URL.createObjectURL(file);
      setViewPdfUrl(url);
      setViewNeedsPassword(false);
      setStatus(null);
    } catch (error) {
      setError(getErrorMessage(error, "Could not open PDF. It might be corrupted or use unsupported encryption."));
      setViewPdfUrl(null);
    } finally {
      setBusy(false);
    }
  }, [viewPdfUrl]);

  useEffect(
    () => () => {
      if (result?.url) {
        URL.revokeObjectURL(result.url);
      }
    },
    [result]
  );

  useEffect(() => {
    imageItemsRef.current = imagesToPdfItems;
  }, [imagesToPdfItems]);

  useEffect(() => {
    return () => {
      imageItemsRef.current.forEach((item) => URL.revokeObjectURL(item.previewUrl));
    };
  }, []);

  // Clean up view PDF URL on unmount or change
  useEffect(() => {
    return () => {
      if (viewPdfUrl) {
        URL.revokeObjectURL(viewPdfUrl);
      }
    };
  }, [viewPdfUrl]);

  useEffect(() => {
    if (!annotateImageFile) {
      if (annotateImagePreviewUrl) {
        URL.revokeObjectURL(annotateImagePreviewUrl);
      }
      setAnnotateImagePreviewUrl(null);
      return;
    }

    const nextUrl = URL.createObjectURL(annotateImageFile);
    setAnnotateImagePreviewUrl((previous) => {
      if (previous) URL.revokeObjectURL(previous);
      return nextUrl;
    });
    return () => URL.revokeObjectURL(nextUrl);
  }, [annotateImageFile, annotateImagePreviewUrl]);

  useEffect(() => {
    if (!annotatePdfFile) {
      if (annotatePdfPreviewUrl) {
        URL.revokeObjectURL(annotatePdfPreviewUrl);
      }
      setAnnotatePdfPreviewUrl(null);
      return;
    }

    const nextUrl = URL.createObjectURL(annotatePdfFile);
    setAnnotatePdfPreviewUrl((previous) => {
      if (previous) URL.revokeObjectURL(previous);
      return nextUrl;
    });
    return () => URL.revokeObjectURL(nextUrl);
  }, [annotatePdfFile, annotatePdfPreviewUrl]);
 
  // Handle Intent PDF
  useEffect(() => {
    if (!intentUrl) return;
 
    async function loadIntentPdf(urlInput: string) {
      setIsOpeningIntent(true);
      setError(null);
      try {
        const decoded = decodeURIComponent(urlInput);
        console.log("[PdfTools] Opening intent PDF:", decoded);
 
        let file: File;
        if (Capacitor.isNativePlatform() && (decoded.startsWith("content://") || decoded.startsWith("file://"))) {
          if (Capacitor.getPlatform() === "ios") {
            file = await readNativeImportedFile(decoded);
          } else {
            const hasFilePermission = await ensureAndroidFileAccessPermission();
            if (!hasFilePermission) {
              throw new Error("File access permission was denied.");
            }

            const result = await Filesystem.readFile({ path: decoded });
            const base64Data = typeof result.data === "string" ? result.data : "";
            const binary = atob(base64Data);
            const bytes = new Uint8Array(binary.length);
            for (let i = 0; i < binary.length; i++) {
              bytes[i] = binary.charCodeAt(i);
            }
            const blob = new Blob([bytes], { type: "application/pdf" });
            const rawName = decoded.split("/").pop() || "shared.pdf";
            const name = rawName.replace(/\?.*$/, "");
            file = new File([blob], name, { type: "application/pdf" });
          }
        } else {
          const res = await fetch(decoded);
          const blob = await res.blob();
          file = new File([blob], "shared.pdf", { type: "application/pdf" });
        }
 
        setViewPdfFile(file);
        setActiveTool("view");
        void loadViewPdf(file);
        toast.success("PDF opened successfully");
      } catch (err) {
        console.error("[PdfTools] Intent load error:", err);
        setError(
          err instanceof Error && err.message === "File access permission was denied."
            ? "File access permission was denied, so we couldn't open the shared PDF."
            : "We couldn't open the shared PDF. Make sure Student Society has permission to access files."
        );
      } finally {
        setIsOpeningIntent(false);
        setSearchParams((prev) => {
          const next = new URLSearchParams(prev);
          next.delete("intent_url");
          return next;
        }, { replace: true });
      }
    }
 
    void loadIntentPdf(intentUrl);
  }, [intentUrl, setSearchParams, loadViewPdf]);

  function bumpInputVersion() {
    inputVersion.current += 1;
  }

  function clearImagesToPdfItems() {
    setImagesToPdfItems((previous) => {
      previous.forEach((item) => URL.revokeObjectURL(item.previewUrl));
      return [];
    });
    bumpInputVersion();
  }

  function removeImageToPdfItem(targetId: string) {
    setImagesToPdfItems((previous) => {
      const item = previous.find((entry) => entry.id === targetId);
      if (item) {
        URL.revokeObjectURL(item.previewUrl);
      }
      return previous.filter((entry) => entry.id !== targetId);
    });
  }

  function moveImageToPdfItem(targetId: string, direction: -1 | 1) {
    setImagesToPdfItems((previous) => {
      const index = previous.findIndex((item) => item.id === targetId);
      if (index < 0) return previous;
      const nextIndex = index + direction;
      if (nextIndex < 0 || nextIndex >= previous.length) return previous;
      const clone = [...previous];
      const [item] = clone.splice(index, 1);
      clone.splice(nextIndex, 0, item);
      return clone;
    });
  }

  function onSinglePdfSelected(event: ChangeEvent<HTMLInputElement>, setter: (file: File | null) => void) {
    const file = event.target.files?.[0] || null;
    event.target.value = "";
    if (!file) return;
    if (!isPdfLikeFile(file)) {
      setError("Please select a valid PDF file.");
      return;
    }
    setter(file);
    setError(null);
    bumpInputVersion();
  }

  function onMultiPdfSelected(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files || []);
    event.target.value = "";
    if (!files.length) return;
    const valid = files.filter((item) => isPdfLikeFile(item));
    if (!valid.length) {
      setError("Please select valid PDF files.");
      return;
    }
    setMergeFiles(valid);
    setError(null);
    bumpInputVersion();
  }

  function onMultiImagesSelected(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files || []);
    event.target.value = "";
    if (!files.length) return;
    const valid = files.filter((item) => isImageLikeFile(item));
    if (!valid.length) {
      setError("Please select valid image files.");
      return;
    }
    const mapped: OrderedImageInput[] = valid.map((file, index) => ({
      id: `${Date.now()}-${index}-${Math.random().toString(36).slice(2, 8)}`,
      file,
      name: file.name,
      size: file.size,
      previewUrl: URL.createObjectURL(file),
    }));
    setImagesToPdfItems((previous) => [...previous, ...mapped]);
    setError(null);
    bumpInputVersion();
  }

  function onAnnotateImageSelected(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] || null;
    event.target.value = "";
    if (!file) return;
    if (!isImageLikeFile(file)) {
      setError("Please select a valid image file.");
      return;
    }
    setAnnotateImageFile(file);
    setError(null);
    bumpInputVersion();
  }

  async function executeTool(
    processor: () => Promise<ToolProcessorResult>,
    successMessage: string | ((response: ToolProcessorResult) => string)
  ) {
    setBusy(true);
    setError(null);
    setStatus(null);
    try {
      const response = await processor();

      if (result?.url) {
        URL.revokeObjectURL(result.url);
      }

      const objectUrl = URL.createObjectURL(response.blob);
      setResult({
        url: objectUrl,
        name: response.name,
        size: response.blob.size,
        mimeType: response.mimeType || response.blob.type || "application/octet-stream",
      });
      setStatus(typeof successMessage === "function" ? successMessage(response) : successMessage);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "PDF processing failed.");
    } finally {
      setBusy(false);
    }
  }

  function singlePdfPicker(file: File | null, onChange: (event: ChangeEvent<HTMLInputElement>) => void, onClear: () => void) {
    return (
      <div>
        <p className="text-xs font-medium text-app-muted">PDF file</p>
        <div className="mt-1 grid gap-2 sm:flex sm:flex-wrap sm:items-center">
          <label className="btn-secondary inline-flex w-full cursor-pointer items-center gap-2 sm:w-auto">
            <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
              <path d="M10 4v12" />
              <path d="M4 10h12" />
            </svg>
            Choose PDF
            <input key={`pdf-${inputVersion.current}`} type="file" className="hidden" accept={PDF_ACCEPT} onChange={onChange} />
          </label>
          {file ? (
            <button type="button" className="btn-secondary w-full !px-2 !py-1 sm:w-auto" onClick={onClear}>
              Clear
            </button>
          ) : null}
        </div>
        <p className="mt-1 break-all text-xs text-app-muted">{file ? file.name : "No PDF selected."}</p>
      </div>
    );
  }

  function singleImagePicker(file: File | null, onChange: (event: ChangeEvent<HTMLInputElement>) => void, onClear: () => void) {
    return (
      <div>
        <p className="text-xs font-medium text-app-muted">Image file</p>
        <div className="mt-1 grid gap-2 sm:flex sm:flex-wrap sm:items-center">
          <label className="btn-secondary inline-flex w-full cursor-pointer items-center gap-2 sm:w-auto">
            <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
              <path d="M10 4v12" />
              <path d="M4 10h12" />
            </svg>
            Choose Image
            <input key={`img-${inputVersion.current}`} type="file" className="hidden" accept={IMAGE_ACCEPT} onChange={onChange} />
          </label>
          {file ? (
            <button type="button" className="btn-secondary w-full !px-2 !py-1 sm:w-auto" onClick={onClear}>
              Clear
            </button>
          ) : null}
        </div>
        <p className="mt-1 break-all text-xs text-app-muted">{file ? file.name : "No image selected."}</p>
      </div>
    );
  }

  function clearAnnotateImage() {
    setAnnotateImageFile(null);
    if (annotateImagePreviewUrl) {
      URL.revokeObjectURL(annotateImagePreviewUrl);
      setAnnotateImagePreviewUrl(null);
    }
    bumpInputVersion();
  }

  async function submitCompress(event: FormEvent) {
    event.preventDefault();
    if (!compressFile) {
      setError("Select a PDF file first.");
      return;
    }

    await executeTool(
      () => pdfTools.compressPdfFile(compressFile, { password: compressPassword, strength: compressStrength }),
      (response) => {
        if (response.blob.size < compressFile.size) {
          return `Compressed from ${formatBytes(compressFile.size)} to ${formatBytes(response.blob.size)}. Download is ready.`;
        }

        return "Best available compression is ready. This PDF was already close to its smallest practical size.";
      }
    );
  }

  async function submitMerge(event: FormEvent) {
    event.preventDefault();
    if (mergeFiles.length < 2) {
      setError("Select at least two PDF files for merge.");
      return;
    }

    await executeTool(
      () => pdfTools.mergePdfFiles(mergeFiles),
      "PDFs merged locally. Download is ready."
    );
  }

  async function submitSplit(event: FormEvent) {
    event.preventDefault();
    if (!splitFile) {
      setError("Select a PDF file first.");
      return;
    }

    if (splitMode === "ranges") {
      if (!splitRanges.trim()) {
        setError("Enter page ranges to split.");
        return;
      }

      await executeTool(
        () => pdfTools.splitPdfFile(splitFile, { ranges: splitRanges.trim(), password: splitPassword }),
        "PDF split locally. ZIP download is ready."
      );
      return;
    }

    const pagesPerFile = normalizePositiveInt(splitFixedSize);
    if (!pagesPerFile) {
      setError("Enter a valid pages-per-file value.");
      return;
    }

    await executeTool(
      () => pdfTools.splitPdfFile(splitFile, { pagesPerFile, password: splitPassword }),
      "PDF split locally. ZIP download is ready."
    );
  }

  async function submitExtract(event: FormEvent) {
    event.preventDefault();
    if (!extractFile) {
      setError("Select a PDF file first.");
      return;
    }
    if (!extractPages.trim()) {
      setError("Enter pages to extract.");
      return;
    }

    await executeTool(
      () => pdfTools.extractPdfPages(extractFile, { pages: extractPages.trim(), password: extractPassword }),
      "Pages extracted locally. Download is ready."
    );
  }

  async function submitRotate(event: FormEvent) {
    event.preventDefault();
    if (!rotateFile) {
      setError("Select a PDF file first.");
      return;
    }

    await executeTool(
      () =>
        pdfTools.rotatePdfPages(rotateFile, {
          degrees: Number(rotateDegrees),
          pages: rotatePages.trim() || undefined,
          password: rotatePassword,
        }),
      "Pages rotated locally. Download is ready."
    );
  }

  async function submitRemove(event: FormEvent) {
    event.preventDefault();
    if (!removeFile) {
      setError("Select a PDF file first.");
      return;
    }
    if (!removePagesInput.trim()) {
      setError("Enter pages to remove.");
      return;
    }

    await executeTool(
      () => pdfTools.removePdfPages(removeFile, { pages: removePagesInput.trim(), password: removePassword }),
      "Pages removed locally. Download is ready."
    );
  }

  async function submitReorder(event: FormEvent) {
    event.preventDefault();
    if (!reorderFile) {
      setError("Select a PDF file first.");
      return;
    }
    if (!reorderInput.trim()) {
      setError("Enter page order list.");
      return;
    }

    await executeTool(
      () => pdfTools.reorderPdfPages(reorderFile, { order: reorderInput.trim(), password: reorderPassword }),
      "Pages reordered locally. Download is ready."
    );
  }

  async function submitLock(event: FormEvent) {
    event.preventDefault();
    if (!lockFile) {
      setError("Select a PDF file first.");
      return;
    }
    if (!lockUserPassword.trim()) {
      setError("User password is required for lock.");
      return;
    }

    await executeTool(
      () =>
        pdfTools.lockPdfFile(lockFile, {
          userPassword: lockUserPassword,
          ownerPassword: lockOwnerPassword,
          password: lockCurrentPassword,
        }),
      "PDF locked locally. Download is ready."
    );
  }

  async function submitUnlock(event: FormEvent) {
    event.preventDefault();
    if (!unlockFile) {
      setError("Select a PDF file first.");
      return;
    }
    if (!unlockPassword.trim()) {
      setError("Password is required to unlock PDF.");
      return;
    }

    await executeTool(
      () => pdfTools.unlockPdfFile(unlockFile, unlockPassword),
      "PDF unlocked locally. Download is ready."
    );
  }

  async function submitMetadata(event: FormEvent) {
    event.preventDefault();
    if (!metaFile) {
      setError("Select a PDF file first.");
      return;
    }

    await executeTool(
      () =>
        pdfTools.updatePdfMetadata(metaFile, {
          password: metaPassword,
          title: metaTitle,
          author: metaAuthor,
          subject: metaSubject,
          keywords: metaKeywords,
          creator: metaCreator,
          producer: metaProducer,
        }),
      "PDF metadata updated locally. Download is ready."
    );
  }

  async function submitImagesToPdf(event: FormEvent) {
    event.preventDefault();
    if (imagesToPdfItems.length === 0) {
      setError("Select at least one image.");
      return;
    }

    await executeTool(
      () => pdfTools.imagesToPdfFile(imagesToPdfItems.map((item) => item.file)),
      "Images converted locally. Download is ready."
    );
  }

  async function submitAnnotate(event: FormEvent) {
    event.preventDefault();
    if (!annotatePdfFile) {
      setError("Select a PDF file first.");
      return;
    }

    const page = normalizePositiveInt(annotatePage);
    const x = normalizeNumber(annotateX);
    const y = normalizeNumber(annotateY);
    const fontSize = normalizeNumber(annotateFontSize);
    const imageX = normalizeNumber(annotateImageX);
    const imageY = normalizeNumber(annotateImageY);
    const imageW = normalizeNumber(annotateImageW);
    const imageH = normalizeNumber(annotateImageH);

    if (!page || x == null || y == null || fontSize == null) {
      setError("Provide valid page, text X/Y, and font size values.");
      return;
    }

    await executeTool(
      () =>
        pdfTools.annotatePdfFile(annotatePdfFile, {
          pageNumber: page,
          text: annotateText,
          textX: x,
          textY: y,
          fontSize,
          color: annotateColor,
          imageFile: annotateImageFile,
          imageX,
          imageY,
          imageWidth: imageW,
          imageHeight: imageH,
          password: annotatePassword,
        }),
      "PDF edited locally. Download is ready."
    );
  }

  const annotateTextLines = useMemo(() => {
    const trimmed = annotateText.trim();
    return trimmed ? trimmed.split(/\r?\n/) : ["Sample text"];
  }, [annotateText]);

  const fontSizePt = Math.max(6, normalizeNumber(annotateFontSize) ?? 16);
  const textXPt = normalizeNumber(annotateX) ?? 40;
  const textYPt = normalizeNumber(annotateY) ?? 740;
  const imageXPt = normalizeNumber(annotateImageX) ?? 40;
  const imageYPt = normalizeNumber(annotateImageY) ?? 420;
  const imageWidthPt = Math.max(24, normalizeNumber(annotateImageW) ?? 180);
  const imageHeightPt = Math.max(24, normalizeNumber(annotateImageH) ?? 180);

  const textHeightPt = Math.max(fontSizePt * 1.2, annotateTextLines.length * fontSizePt * 1.2);
  const longestTextLength = annotateTextLines.reduce((max, line) => Math.max(max, line.length), 0);
  const textApproxWidthPt = Math.max(80, fontSizePt * 0.58 * Math.max(6, longestTextLength));

  const ptToPxX = (pt: number) => (pt / PREVIEW_PAGE_WIDTH_PT) * PREVIEW_WIDTH_PX;
  const ptToPxBottom = (pt: number) => PREVIEW_HEIGHT_PX - (pt / PREVIEW_PAGE_HEIGHT_PT) * PREVIEW_HEIGHT_PX;
  const pxToPtX = (px: number) => (px / PREVIEW_WIDTH_PX) * PREVIEW_PAGE_WIDTH_PT;
  const pxToPtFromTop = (top: number) => ((PREVIEW_HEIGHT_PX - top) / PREVIEW_HEIGHT_PX) * PREVIEW_PAGE_HEIGHT_PT;

  const textWidthPx = clampNumber((textApproxWidthPt / PREVIEW_PAGE_WIDTH_PT) * PREVIEW_WIDTH_PX, 60, PREVIEW_WIDTH_PX - 10);
  const textHeightPx = clampNumber((textHeightPt / PREVIEW_PAGE_HEIGHT_PT) * PREVIEW_HEIGHT_PX, 16, PREVIEW_HEIGHT_PX - 10);
  const imageWidthPx = clampNumber((imageWidthPt / PREVIEW_PAGE_WIDTH_PT) * PREVIEW_WIDTH_PX, 16, PREVIEW_WIDTH_PX - 8);
  const imageHeightPx = clampNumber((imageHeightPt / PREVIEW_PAGE_HEIGHT_PT) * PREVIEW_HEIGHT_PX, 16, PREVIEW_HEIGHT_PX - 8);

  const textLeftPx = clampNumber(ptToPxX(textXPt), 0, PREVIEW_WIDTH_PX - textWidthPx);
  const textTopPx = clampNumber(ptToPxBottom(textYPt + textHeightPt), 0, PREVIEW_HEIGHT_PX - textHeightPx);
  const imageLeftPx = clampNumber(ptToPxX(imageXPt), 0, PREVIEW_WIDTH_PX - imageWidthPx);
  const imageTopPx = clampNumber(ptToPxBottom(imageYPt + imageHeightPt), 0, PREVIEW_HEIGHT_PX - imageHeightPx);

  function updateVisualPosition(target: VisualTarget, leftPx: number, topPx: number) {
    if (target === "text") {
      const clampedLeft = clampNumber(leftPx, 0, PREVIEW_WIDTH_PX - textWidthPx);
      const clampedTop = clampNumber(topPx, 0, PREVIEW_HEIGHT_PX - textHeightPx);
      const nextX = pxToPtX(clampedLeft);
      const nextY = pxToPtFromTop(clampedTop) - textHeightPt;
      setAnnotateX(Math.max(0, nextX).toFixed(1));
      setAnnotateY(Math.max(0, nextY).toFixed(1));
      return;
    }

    const clampedLeft = clampNumber(leftPx, 0, PREVIEW_WIDTH_PX - imageWidthPx);
    const clampedTop = clampNumber(topPx, 0, PREVIEW_HEIGHT_PX - imageHeightPx);
    const nextX = pxToPtX(clampedLeft);
    const nextY = pxToPtFromTop(clampedTop) - imageHeightPt;
    setAnnotateImageX(Math.max(0, nextX).toFixed(1));
    setAnnotateImageY(Math.max(0, nextY).toFixed(1));
  }

  function getPreviewPoint(event: { clientX: number; clientY: number }) {
    const rect = previewRef.current?.getBoundingClientRect();
    if (!rect) return null;
    const x = clampNumber(event.clientX - rect.left, 0, PREVIEW_WIDTH_PX);
    const y = clampNumber(event.clientY - rect.top, 0, PREVIEW_HEIGHT_PX);
    return { x, y };
  }

  function startDrag(target: VisualTarget, event: ReactPointerEvent<HTMLDivElement>) {
    const point = getPreviewPoint(event);
    if (!point) return;
    dragStateRef.current = {
      target,
      offsetX: point.x - (target === "text" ? textLeftPx : imageLeftPx),
      offsetY: point.y - (target === "text" ? textTopPx : imageTopPx),
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function onPreviewPointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    if (!dragStateRef.current) return;
    const point = getPreviewPoint(event);
    if (!point) return;
    updateVisualPosition(
      dragStateRef.current.target,
      point.x - dragStateRef.current.offsetX,
      point.y - dragStateRef.current.offsetY
    );
  }

  function stopDrag(event: ReactPointerEvent<HTMLDivElement>) {
    if (!dragStateRef.current) return;
    dragStateRef.current = null;
    try {
      event.currentTarget.releasePointerCapture(event.pointerId);
    } catch {
      // Ignore release errors.
    }
  }

  function placeByClick(event: ReactMouseEvent<HTMLDivElement>) {
    if (dragStateRef.current) return;
    if (event.target !== event.currentTarget) return;
    const point = getPreviewPoint(event);
    if (!point) return;
    if (visualTarget === "text") {
      updateVisualPosition("text", point.x, point.y - textHeightPx);
    } else {
      updateVisualPosition("image", point.x - imageWidthPx / 2, point.y - imageHeightPx / 2);
    }
  }

  function renderToolPanel() {
    switch (activeTool) {
      case "view":
        return (
          <div className="space-y-4">
            <div>
              <p className="text-xs font-medium text-app-muted">PDF file</p>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <label className="btn-secondary inline-flex cursor-pointer items-center gap-2">
                  <Plus className="h-4 w-4" />
                  Choose PDF
                  <input
                    type="file"
                    className="hidden"
                    accept={PDF_ACCEPT}
                    onChange={(event) => {
                      const file = event.target.files?.[0] || null;
                      event.target.value = "";
                      if (!file) return;
                      if (!isPdfLikeFile(file)) {
                        setError("Please select a valid PDF file.");
                        return;
                      }
                      setViewPdfFile(file);
                      setViewPassword("");
                      void loadViewPdf(file);
                    }}
                  />
                </label>
                {viewPdfFile ? (
                  <button
                    type="button"
                    className="btn-secondary !px-2 !py-1"
                    onClick={() => {
                      setViewPdfFile(null);
                      setViewPdfUrl(null);
                      setViewNeedsPassword(false);
                      setViewPassword("");
                    }}
                  >
                    Clear
                  </button>
                ) : null}
              </div>
              <p className="mt-1 break-all text-xs text-app-muted">
                {viewPdfFile ? viewPdfFile.name : "Choose a file to view it here. We support encrypted PDFs too."}
              </p>
            </div>

            {viewNeedsPassword && viewPdfFile ? (
              <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-4 shadow-sm">
                <div className="flex items-center gap-2 text-amber-800">
                  <Lock className="h-4 w-4" />
                  <p className="text-sm font-semibold">Password Protected</p>
                </div>
                <p className="mt-1 text-xs text-amber-700/80">This document is encrypted. Please enter the password to unlock it.</p>
                <div className="mt-3 flex gap-2">
                  <input
                    type="password"
                    placeholder="Enter password..."
                    className="input-field !bg-white"
                    value={viewPassword}
                    onChange={(e) => setViewPassword(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") void loadViewPdf(viewPdfFile, viewPassword);
                    }}
                  />
                  <button
                    type="button"
                    className="btn-primary shrink-0"
                    onClick={() => void loadViewPdf(viewPdfFile, viewPassword)}
                    disabled={busy}
                  >
                    Unlock
                  </button>
                </div>
              </div>
            ) : null}

            {viewPdfUrl ? (
              <PdfCanvasViewer
                url={viewPdfUrl}
                name={viewPdfFile?.name}
                password={viewPassword || undefined}
                onFullscreen={() => setViewFullscreenOpen(true)}
              />
            ) : !viewNeedsPassword ? (
              <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-app-border bg-app-secondary/10 p-12 text-center">
                <div className="rounded-full bg-app-card p-4 shadow-sm">
                  <FileText className="h-10 w-10 text-app-muted/40" />
                </div>
                <p className="mt-4 text-sm font-medium text-app-muted">No PDF loaded</p>
                <p className="mt-1 text-xs text-app-muted/60">Select a file to start viewing</p>
              </div>
            ) : null}

            {viewFullscreenOpen && viewPdfUrl ? (
              <div className="fixed inset-0 z-50 bg-slate-950/80 p-2 backdrop-blur-sm sm:p-4" role="dialog" aria-modal="true">
                <div className="mx-auto flex h-full max-w-7xl flex-col overflow-hidden rounded-[24px] border border-white/10 bg-app-card shadow-2xl sm:rounded-[28px]">
                  <div className="flex items-start justify-between gap-3 border-b border-app-border bg-app-secondary/20 px-3 py-3 sm:items-center sm:px-6 sm:py-4">
                    <div className="flex min-w-0 items-center gap-2 sm:gap-3">
                      <FileText className="h-4 w-4 shrink-0 text-brand sm:h-5 sm:w-5" />
                      <p className="max-w-[13rem] break-all text-xs font-bold text-app-text sm:max-w-md sm:text-sm sm:truncate">{viewPdfFile?.name}</p>
                    </div>
                    <button 
                      type="button" 
                      className="rounded-full bg-app-card p-2 text-app-text transition-colors hover:bg-app-secondary"
                      onClick={() => setViewFullscreenOpen(false)}
                    >
                      <X className="h-4 w-4 sm:h-5 sm:w-5" />
                    </button>
                  </div>
                  <div className="flex-1 bg-slate-100 p-1.5 sm:p-4">
                    <PdfCanvasViewer
                      url={viewPdfUrl}
                      name={viewPdfFile?.name}
                      password={viewPassword || undefined}
                      fullscreen
                    />
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        );

      case "compress":
        return (
          <form className="space-y-3" onSubmit={(event) => void submitCompress(event)}>
            {singlePdfPicker(compressFile, (event) => onSinglePdfSelected(event, setCompressFile), () => setCompressFile(null))}
            {compressFile ? (
              <div className="rounded-2xl border border-app-border bg-app-secondary/30 p-2.5 text-xs text-app-muted">
                <p>Original size: {formatBytes(compressFile.size)}</p>
                <p className="mt-1">Uses a PDF rewrite first, then a stronger page-image fallback if the file still stays too large.</p>
              </div>
            ) : null}
            <label className="block text-xs font-medium text-app-muted">
              Current password (optional)
              <input className="input-field" type="password" value={compressPassword} onChange={(event) => setCompressPassword(event.target.value)} />
            </label>
            <div className="rounded-2xl border border-app-border bg-app-card p-2.5 sm:p-3">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-xs font-medium uppercase tracking-[0.12em] text-app-muted">Compression strength</p>
                  <p className="mt-1 text-sm font-semibold text-app-text">{compressProfile.label}</p>
                </div>
                <span className="rounded-full bg-app-secondary px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-app-muted">
                  {compressStrength}%
                </span>
              </div>
              <input
                className="mt-3 h-2 w-full cursor-pointer appearance-none rounded-full bg-brand/15"
                type="range"
                min={0}
                max={100}
                step={5}
                value={compressStrength}
                onChange={(event) => setCompressStrength(Number(event.target.value))}
              />
              <div className="mt-2 flex items-center justify-between text-[10px] font-medium uppercase tracking-[0.12em] text-app-muted">
                <span>Light</span>
                <span>Maximum</span>
              </div>
              <p className="mt-2 text-[11px] leading-5 text-app-muted">{compressProfile.description}</p>
            </div>
            <button type="submit" className="btn-primary" disabled={busy}>Compress PDF</button>
          </form>
        );

      case "merge":
        return (
          <form className="space-y-3" onSubmit={(event) => void submitMerge(event)}>
            <div>
              <p className="text-xs font-medium text-app-muted">PDF files (2+)</p>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <label className="btn-secondary inline-flex cursor-pointer items-center gap-2">
                  <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                    <path d="M10 4v12" />
                    <path d="M4 10h12" />
                  </svg>
                  Choose PDFs
                  <input key={`merge-${inputVersion.current}`} type="file" className="hidden" accept={PDF_ACCEPT} multiple onChange={onMultiPdfSelected} />
                </label>
                {mergeFiles.length > 0 ? <button type="button" className="btn-secondary !px-2 !py-1" onClick={() => setMergeFiles([])}>Clear</button> : null}
              </div>
              {mergeFiles.length > 0 ? (
                <ul className="mt-2 max-h-24 space-y-1 overflow-auto rounded-2xl border border-app-border bg-app-card p-2 text-xs text-app-muted">
                  {mergeFiles.map((file, index) => (
                    <li key={`${file.name}-${index}`} className="break-all">{index + 1}. {file.name}</li>
                  ))}
                </ul>
              ) : (
                <p className="mt-1 text-xs text-app-muted">No PDFs selected.</p>
              )}
            </div>
            <button type="submit" className="btn-primary" disabled={busy}>Merge PDFs</button>
          </form>
        );

      case "split":
        return (
          <form className="space-y-3" onSubmit={(event) => void submitSplit(event)}>
            {singlePdfPicker(splitFile, (event) => onSinglePdfSelected(event, setSplitFile), () => setSplitFile(null))}
            <div className="flex flex-wrap gap-2 text-xs">
              <button type="button" className={splitMode === "ranges" ? "tab-active rounded-lg px-3 py-1.5 font-semibold" : "tab-inactive rounded-lg px-3 py-1.5"} onClick={() => setSplitMode("ranges")}>By ranges</button>
              <button type="button" className={splitMode === "fixed" ? "tab-active rounded-lg px-3 py-1.5 font-semibold" : "tab-inactive rounded-lg px-3 py-1.5"} onClick={() => setSplitMode("fixed")}>Fixed size</button>
            </div>
            {splitMode === "ranges" ? (
              <label className="block text-xs font-medium text-app-muted">
                Ranges (example: 1-3,4-5)
                <input className="input-field" value={splitRanges} onChange={(event) => setSplitRanges(event.target.value)} />
              </label>
            ) : (
              <label className="block text-xs font-medium text-app-muted">
                Pages per file
                <input className="input-field" inputMode="numeric" value={splitFixedSize} onChange={(event) => setSplitFixedSize(event.target.value)} />
              </label>
            )}
            <label className="block text-xs font-medium text-app-muted">
              Current password (optional)
              <input className="input-field" type="password" value={splitPassword} onChange={(event) => setSplitPassword(event.target.value)} />
            </label>
            <button type="submit" className="btn-primary" disabled={busy}>Split PDF</button>
          </form>
        );

      case "extract":
        return (
          <form className="space-y-3" onSubmit={(event) => void submitExtract(event)}>
            {singlePdfPicker(extractFile, (event) => onSinglePdfSelected(event, setExtractFile), () => setExtractFile(null))}
            <label className="block text-xs font-medium text-app-muted">
              Pages to extract (example: 1-3,8)
              <input className="input-field" value={extractPages} onChange={(event) => setExtractPages(event.target.value)} />
            </label>
            <label className="block text-xs font-medium text-app-muted">
              Current password (optional)
              <input className="input-field" type="password" value={extractPassword} onChange={(event) => setExtractPassword(event.target.value)} />
            </label>
            <button type="submit" className="btn-primary" disabled={busy}>Extract Pages</button>
          </form>
        );

      case "rotate":
        return (
          <form className="space-y-3" onSubmit={(event) => void submitRotate(event)}>
            {singlePdfPicker(rotateFile, (event) => onSinglePdfSelected(event, setRotateFile), () => setRotateFile(null))}
            <label className="block text-xs font-medium text-app-muted">
              Degrees
              <select className="input-field" value={rotateDegrees} onChange={(event) => setRotateDegrees(event.target.value)}>
                <option value="90">90°</option>
                <option value="180">180°</option>
                <option value="270">270°</option>
              </select>
            </label>
            <label className="block text-xs font-medium text-app-muted">
              Target pages (optional)
              <input className="input-field" value={rotatePages} onChange={(event) => setRotatePages(event.target.value)} placeholder="1-2,5" />
            </label>
            <label className="block text-xs font-medium text-app-muted">
              Current password (optional)
              <input className="input-field" type="password" value={rotatePassword} onChange={(event) => setRotatePassword(event.target.value)} />
            </label>
            <button type="submit" className="btn-primary" disabled={busy}>Rotate Pages</button>
          </form>
        );

      case "remove":
        return (
          <form className="space-y-3" onSubmit={(event) => void submitRemove(event)}>
            {singlePdfPicker(removeFile, (event) => onSinglePdfSelected(event, setRemoveFile), () => setRemoveFile(null))}
            <label className="block text-xs font-medium text-app-muted">
              Pages to remove (example: 2,5-6)
              <input className="input-field" value={removePagesInput} onChange={(event) => setRemovePagesInput(event.target.value)} />
            </label>
            <label className="block text-xs font-medium text-app-muted">
              Current password (optional)
              <input className="input-field" type="password" value={removePassword} onChange={(event) => setRemovePassword(event.target.value)} />
            </label>
            <button type="submit" className="btn-primary" disabled={busy}>Remove Pages</button>
          </form>
        );

      case "reorder":
        return (
          <form className="space-y-3" onSubmit={(event) => void submitReorder(event)}>
            {singlePdfPicker(reorderFile, (event) => onSinglePdfSelected(event, setReorderFile), () => setReorderFile(null))}
            <label className="block text-xs font-medium text-app-muted">
              New page order (example: 3,1,2)
              <input className="input-field" value={reorderInput} onChange={(event) => setReorderInput(event.target.value)} />
            </label>
            <label className="block text-xs font-medium text-app-muted">
              Current password (optional)
              <input className="input-field" type="password" value={reorderPassword} onChange={(event) => setReorderPassword(event.target.value)} />
            </label>
            <button type="submit" className="btn-primary" disabled={busy}>Reorder Pages</button>
          </form>
        );

      case "lock":
        return (
          <form className="space-y-3" onSubmit={(event) => void submitLock(event)}>
            {singlePdfPicker(lockFile, (event) => onSinglePdfSelected(event, setLockFile), () => setLockFile(null))}
            <label className="block text-xs font-medium text-app-muted">
              Current password (if already locked)
              <input className="input-field" type="password" value={lockCurrentPassword} onChange={(event) => setLockCurrentPassword(event.target.value)} />
            </label>
            <label className="block text-xs font-medium text-app-muted">
              User password (required)
              <input className="input-field" type="password" value={lockUserPassword} onChange={(event) => setLockUserPassword(event.target.value)} />
            </label>
            <label className="block text-xs font-medium text-app-muted">
              Owner password (optional)
              <input className="input-field" type="password" value={lockOwnerPassword} onChange={(event) => setLockOwnerPassword(event.target.value)} />
            </label>
            <button type="submit" className="btn-primary" disabled={busy}>Lock PDF</button>
          </form>
        );

      case "unlock":
        return (
          <form className="space-y-3" onSubmit={(event) => void submitUnlock(event)}>
            {singlePdfPicker(unlockFile, (event) => onSinglePdfSelected(event, setUnlockFile), () => setUnlockFile(null))}
            <label className="block text-xs font-medium text-app-muted">
              Password
              <input className="input-field" type="password" value={unlockPassword} onChange={(event) => setUnlockPassword(event.target.value)} />
            </label>
            <button type="submit" className="btn-primary" disabled={busy}>Unlock PDF</button>
          </form>
        );

      case "metadata":
        return (
          <form className="space-y-3" onSubmit={(event) => void submitMetadata(event)}>
            {singlePdfPicker(metaFile, (event) => onSinglePdfSelected(event, setMetaFile), () => setMetaFile(null))}
            <label className="block text-xs font-medium text-app-muted">
              Current password (optional)
              <input className="input-field" type="password" value={metaPassword} onChange={(event) => setMetaPassword(event.target.value)} />
            </label>
            <div className="grid gap-2 md:grid-cols-2">
              <label className="block text-xs font-medium text-app-muted">Title<input className="input-field" value={metaTitle} onChange={(event) => setMetaTitle(event.target.value)} /></label>
              <label className="block text-xs font-medium text-app-muted">Author<input className="input-field" value={metaAuthor} onChange={(event) => setMetaAuthor(event.target.value)} /></label>
              <label className="block text-xs font-medium text-app-muted">Subject<input className="input-field" value={metaSubject} onChange={(event) => setMetaSubject(event.target.value)} /></label>
              <label className="block text-xs font-medium text-app-muted">Keywords<input className="input-field" value={metaKeywords} onChange={(event) => setMetaKeywords(event.target.value)} placeholder="invoice, finance, q1" /></label>
              <label className="block text-xs font-medium text-app-muted">Creator<input className="input-field" value={metaCreator} onChange={(event) => setMetaCreator(event.target.value)} /></label>
              <label className="block text-xs font-medium text-app-muted">Producer<input className="input-field" value={metaProducer} onChange={(event) => setMetaProducer(event.target.value)} /></label>
            </div>
            <button type="submit" className="btn-primary" disabled={busy}>Update Metadata</button>
          </form>
        );

      case "images_to_pdf":
        return (
          <form className="space-y-3" onSubmit={(event) => void submitImagesToPdf(event)}>
            <ImagesToPdfOrderList
              items={imagesToPdfItems.map((item) => ({ id: item.id, name: item.file.name, size: item.file.size, previewUrl: item.previewUrl }))}
              inputVersion={inputVersion.current}
              imageAccept={IMAGE_ACCEPT}
              busy={busy}
              formatBytes={formatBytes}
              onChooseFiles={onMultiImagesSelected}
              onMove={moveImageToPdfItem}
              onRemove={removeImageToPdfItem}
              onClear={clearImagesToPdfItems}
            />
            <button type="submit" className="btn-primary" disabled={busy}>Create PDF from Images</button>
          </form>
        );

      case "annotate":
        return (
          <form className="space-y-3" onSubmit={(event) => void submitAnnotate(event)}>
            {singlePdfPicker(annotatePdfFile, (event) => onSinglePdfSelected(event, setAnnotatePdfFile), () => setAnnotatePdfFile(null))}
            <label className="block text-xs font-medium text-app-muted">
              Current password (optional)
              <input className="input-field" type="password" value={annotatePassword} onChange={(event) => setAnnotatePassword(event.target.value)} />
            </label>
            <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
              <div className="space-y-3 rounded-2xl border border-app-border bg-app-card p-2.5 sm:p-3">
                <div className="grid gap-2 md:grid-cols-2">
                  <label className="block text-xs font-medium text-app-muted">Page number<input className="input-field" inputMode="numeric" value={annotatePage} onChange={(event) => setAnnotatePage(event.target.value)} /></label>
                  <label className="block text-xs font-medium text-app-muted">Font size<input className="input-field" inputMode="decimal" value={annotateFontSize} onChange={(event) => setAnnotateFontSize(event.target.value)} /></label>
                  <label className="block text-xs font-medium text-app-muted">Text X (pt)<input className="input-field" inputMode="decimal" value={annotateX} onChange={(event) => setAnnotateX(event.target.value)} /></label>
                  <label className="block text-xs font-medium text-app-muted">Text Y (pt)<input className="input-field" inputMode="decimal" value={annotateY} onChange={(event) => setAnnotateY(event.target.value)} /></label>
                </div>
                <label className="block text-xs font-medium text-app-muted">
                  Text color
                  <input className="input-field" value={annotateColor} onChange={(event) => setAnnotateColor(event.target.value)} placeholder="#111111" />
                </label>
                <label className="block text-xs font-medium text-app-muted">
                  Text content
                  <textarea className="input-field h-24" value={annotateText} onChange={(event) => setAnnotateText(event.target.value)} placeholder="Enter text to place on PDF." />
                </label>

                {singleImagePicker(annotateImageFile, onAnnotateImageSelected, clearAnnotateImage)}
                <div className="grid gap-2 md:grid-cols-2">
                  <label className="block text-xs font-medium text-app-muted">Image X (pt)<input className="input-field" inputMode="decimal" value={annotateImageX} onChange={(event) => setAnnotateImageX(event.target.value)} /></label>
                  <label className="block text-xs font-medium text-app-muted">Image Y (pt)<input className="input-field" inputMode="decimal" value={annotateImageY} onChange={(event) => setAnnotateImageY(event.target.value)} /></label>
                  <label className="block text-xs font-medium text-app-muted">Image Width (pt)<input className="input-field" inputMode="decimal" value={annotateImageW} onChange={(event) => setAnnotateImageW(event.target.value)} /></label>
                  <label className="block text-xs font-medium text-app-muted">Image Height (pt)<input className="input-field" inputMode="decimal" value={annotateImageH} onChange={(event) => setAnnotateImageH(event.target.value)} /></label>
                </div>
              </div>

              <PdfVisualPlacementPreview
                widthPx={PREVIEW_WIDTH_PX}
                heightPx={PREVIEW_HEIGHT_PX}
                visualTarget={visualTarget}
                onVisualTargetChange={setVisualTarget}
                textLines={annotateTextLines}
                textColor={annotateColor}
                textRect={{ left: textLeftPx, top: textTopPx, width: textWidthPx, height: textHeightPx }}
                imageRect={{ left: imageLeftPx, top: imageTopPx, width: imageWidthPx, height: imageHeightPx }}
                imagePreviewUrl={annotateImagePreviewUrl}
                sourcePdfPreviewUrl={annotatePdfPreviewUrl}
                boardRef={previewRef}
                onBoardPointerMove={onPreviewPointerMove}
                onBoardPointerUp={stopDrag}
                onBoardPointerLeave={stopDrag}
                onBoardClick={placeByClick}
                onTextDragStart={(event) => startDrag("text", event)}
                onImageDragStart={(event) => startDrag("image", event)}
              />
            </div>

            <p className="text-xs text-app-muted">Coordinates use PDF points from bottom-left origin (72 points = 1 inch). This is a visual guide for fast placement.</p>
            <button type="submit" className="btn-primary" disabled={busy}>Apply Text/Image Edit</button>
          </form>
        );

      default:
        return null;
    }
  }

  return (
    <section className="glass-card h-full min-h-0 p-3 sm:p-4 lg:p-5">
      {showTitleBlock ? (
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="font-display text-lg font-semibold text-app-text sm:text-xl">PDF Tools</h2>
              {isOpeningIntent && (
                <div className="flex items-center gap-1.5 rounded-full bg-brand/10 px-2 py-0.5 text-[10px] font-bold text-brand animate-pulse">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  LOADING FROM INTENT
                </div>
              )}
            </div>
            <p className="mt-1 max-w-2xl text-xs text-app-muted sm:text-sm">Professional toolkit for PDF conversion, edits, security, and structure changes.</p>
          </div>
          <div className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-emerald-700">
            Browser only
          </div>
        </div>
      ) : null}

      <div className={`${showTitleBlock ? "mt-3" : ""} overflow-x-auto pb-1 scrollbar-none`}>
        <div className="flex min-w-max gap-2">
          {(Object.keys(PDF_TOOL_META) as PdfToolKey[]).map((tool) => (
            <button
              key={tool}
              type="button"
              className={
                activeTool === tool
                  ? "tab-active shrink-0 rounded-full px-3 py-2 text-[11px] font-semibold sm:text-xs"
                  : "tab-inactive shrink-0 rounded-full px-3 py-2 text-[11px] sm:text-xs"
              }
              onClick={() => setActiveTool(tool)}
            >
              {PDF_TOOL_META[tool].label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-3 grid gap-3 xl:grid-cols-[minmax(0,1.05fr)_minmax(300px,0.95fr)]">
        <div className="rounded-[22px] border border-app-border bg-app-card/90 p-2.5 shadow-[0_20px_60px_-34px_rgba(15,23,42,0.35)] sm:rounded-[24px] sm:p-3">
          <p className="text-sm font-semibold text-app-text">{toolMeta.label}</p>
          <p className="mt-1 text-xs text-app-muted">{toolMeta.description}</p>
          <div className="mt-3">{renderToolPanel()}</div>
        </div>

        <PdfResultPanel error={error} status={status} busy={busy} result={result} formatBytes={formatBytes} />
      </div>
    </section>
  );
}
