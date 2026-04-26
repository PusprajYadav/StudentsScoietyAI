import {
  Crop,
  Download,
  Eraser,
  FilePlus2,
  Hand,
  Highlighter,
  ImagePlus,
  Import,
  Maximize2,
  Minimize2,
  MousePointer2,
  NotebookPen,
  Pencil,
  Plus,
  Redo2,
  RefreshCw,
  Share2,
  Trash2,
  Type,
  Undo2,
} from "lucide-react";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { createPost, loadCommunityMemberships, loadVisibleCommunities, uploadManagedMedia } from "../../../lib/api";
import { buildAuthRedirectPath } from "../../../lib/authRedirect";
import { prepareWhitebookImageFile } from "../../../lib/mediaCompression";
import { mapPlannerShareCategoryToDiscussionKind } from "../../../lib/plannerPost";
import { useAuthStore } from "../../../store/authStore";
import type { CommunityRow } from "../../../types/database";
import { WhitebookCanvas } from "./WhitebookCanvas";
import { createStudentWhitebookShare } from "./api";
import { deleteLocalWhitebookNotebook, listLocalWhitebookNotebooks, saveLocalWhitebookNotebook } from "./localStore";
import { type WhitebookShareState, WhitebookShareSheet } from "./WhitebookShareSheet";
import type {
  WhitebookEraserMode,
  WhitebookExportPayload,
  WhitebookImageCrop,
  WhitebookImageLayer,
  WhitebookNotebook,
  WhitebookPage,
  WhitebookTool,
  WhitebookViewport,
} from "./types";
import {
  buildEmbeddedWhitebookUrl,
  buildPublicWhitebookPath,
  buildWhitebookExportPayload,
  buildWhitebookPreviewSvg,
  cloneWhitebookNotebook,
  createImportedWhitebookNotebook,
  createWhitebookEntityId,
  createWhitebookNotebook,
  createWhitebookPage,
  getWhitebookActivePage,
  getWhitebookBaseUrl,
  normalizeWhitebookExportPayload,
  normalizeWhitebookNotebook,
  replaceWhitebookPage,
  countWhitebookPageItems,
  toWhitebookPreviewDataUrl,
  whitebookInkPalette,
  whitebookStrokeSizes,
} from "./utils";

const defaultShareState: WhitebookShareState = {
  open: false,
  destination: "discussion",
  category: "study",
  communityId: "",
  title: "",
  note: "",
  loading: false,
  submitting: false,
};

const MIN_ZOOM = 0.1;
const MAX_ZOOM = 2;
type WhitebookToolbarTab = "tools" | "style" | "media" | "view";
type WhitebookLibraryTab = "notebooks" | "pages";

function downloadJson(filename: string, payload: unknown) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: "application/json;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function sortNotebooks(items: WhitebookNotebook[]) {
  return [...items].sort((left, right) => Date.parse(right.updatedAt) - Date.parse(left.updatedAt));
}

function clampZoomValue(value: number) {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, value));
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, message: string) {
  let timeoutId: number | null = null;

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = window.setTimeout(() => {
      reject(new Error(message));
    }, timeoutMs);
  });

  return Promise.race([promise, timeoutPromise]).finally(() => {
    if (timeoutId) {
      window.clearTimeout(timeoutId);
    }
  }) as Promise<T>;
}

function readFileAsDataUrl(file: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
        return;
      }

      reject(new Error("Could not read this image."));
    };
    reader.onerror = () => reject(reader.error || new Error("Could not read this image."));
    reader.readAsDataURL(file);
  });
}

function loadImageElement(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.decoding = "async";
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Could not open this image."));
    image.src = src;
  });
}

async function loadImageDimensions(src: string) {
  const image = await loadImageElement(src);
  return {
    width: image.naturalWidth || image.width,
    height: image.naturalHeight || image.height,
  };
}

async function optimizeImageForWhitebook(file: File) {
  return prepareWhitebookImageFile(file);
}

function clampCrop(image: WhitebookImageLayer, patch: Partial<WhitebookImageCrop>) {
  const nextX = Math.min(
    Math.max(0, patch.x ?? image.crop.x),
    Math.max(0, image.naturalWidth - 1)
  );
  const nextY = Math.min(
    Math.max(0, patch.y ?? image.crop.y),
    Math.max(0, image.naturalHeight - 1)
  );
  const nextWidth = Math.min(
    Math.max(1, patch.width ?? image.crop.width),
    image.naturalWidth - nextX
  );
  const nextHeight = Math.min(
    Math.max(1, patch.height ?? image.crop.height),
    image.naturalHeight - nextY
  );

  return {
    x: nextX,
    y: nextY,
    width: nextWidth,
    height: nextHeight,
  };
}

function ToolbarGroup({
  label,
  children,
  className = "",
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-[14px] border border-app-border bg-white/92 p-1.5 shadow-[0_12px_30px_-32px_rgba(15,23,42,0.68)] sm:rounded-[16px] sm:p-2 ${className}`}
    >
      <p className="text-[8px] font-semibold uppercase tracking-[0.18em] text-app-muted sm:text-[9px]">{label}</p>
      <div className="mt-1">{children}</div>
    </div>
  );
}

function RibbonButton({
  active = false,
  children,
  onClick,
  disabled = false,
}: {
  active?: boolean;
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex flex-none items-center gap-1 whitespace-nowrap rounded-[11px] border px-2 py-1.5 text-[10px] font-semibold transition sm:gap-1.5 sm:rounded-[12px] sm:px-2.5 sm:text-[11px] ${
        active
          ? "border-brand/25 bg-brand text-white shadow-[0_12px_30px_-20px_rgba(37,99,235,0.95)]"
          : "border-app-border bg-app-card text-app-text hover:border-brand/25 hover:bg-brand/5"
      } disabled:cursor-not-allowed disabled:opacity-60`}
    >
      {children}
    </button>
  );
}

function ToolbarTabButton({
  active,
  icon: Icon,
  label,
  onClick,
}: {
  active: boolean;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center justify-center gap-1 rounded-[11px] border px-1.5 py-1.5 text-[10px] font-semibold transition sm:gap-1.5 sm:rounded-[12px] sm:px-3 sm:text-[11px] ${
        active
          ? "border-brand/25 bg-brand text-white shadow-[0_12px_30px_-20px_rgba(37,99,235,0.95)]"
          : "border-app-border bg-app-card text-app-text hover:border-brand/25 hover:bg-brand/5"
      }`}
    >
      <Icon className="h-3.5 w-3.5" />
      {label}
    </button>
  );
}

function useStablePreviewUrl(svg: string | null | undefined, delayMs = 220) {
  const [previewUrl, setPreviewUrl] = useState(() => toWhitebookPreviewDataUrl(svg));

  useEffect(() => {
    const nextPreviewUrl = toWhitebookPreviewDataUrl(svg);
    const timeoutId = window.setTimeout(() => {
      setPreviewUrl((current) => (current === nextPreviewUrl ? current : nextPreviewUrl));
    }, delayMs);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [delayMs, svg]);

  return previewUrl;
}

const NotebookStripCard = memo(function NotebookStripCard({
  notebookId,
  title,
  pageCount,
  previewSvg,
  selected,
  onActivate,
  onDelete,
}: {
  notebookId: string;
  title: string;
  pageCount: number;
  previewSvg: string | null;
  selected: boolean;
  onActivate: (notebookId: string) => void;
  onDelete: (notebookId: string, notebookTitle: string) => void | Promise<void>;
}) {
  const previewUrl = useStablePreviewUrl(previewSvg);

  return (
    <div
      className={`group flex w-[260px] max-w-[85vw] flex-none snap-start items-center gap-1.5 rounded-[14px] border px-1.5 py-1.5 text-left transition sm:w-[240px] sm:max-w-none sm:gap-3 sm:rounded-[18px] sm:px-2.5 sm:py-2 ${
        selected
          ? "border-brand/40 bg-brand/6 shadow-[0_18px_40px_-35px_rgba(37,99,235,0.75)] ring-1 ring-brand/20"
          : "border-app-border bg-white"
      }`}
    >
      <button type="button" onClick={() => onActivate(notebookId)} className="flex min-w-0 flex-1 items-center gap-1.5 text-left sm:gap-3">
        <div className="h-9 w-10 shrink-0 overflow-hidden rounded-[10px] border border-app-border bg-[#f8fafc] sm:h-12 sm:w-14 sm:rounded-[14px]">
          {previewUrl ? <img src={previewUrl} alt={title} className="h-full w-full object-cover" /> : null}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1">
            <p className="truncate text-[12px] font-semibold text-app-text sm:text-sm">{title}</p>
            {selected ? (
              <span className="rounded-full bg-brand/10 px-1.5 py-0.5 text-[7px] font-semibold uppercase tracking-[0.08em] text-brand sm:text-[8px]">
                Active
              </span>
            ) : null}
          </div>
          <p className="mt-0.5 text-[9px] text-app-muted sm:text-[11px]">
            {pageCount} page{pageCount === 1 ? "" : "s"}
          </p>
        </div>
      </button>
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          void onDelete(notebookId, title);
        }}
        className="rounded-full bg-rose-500/10 p-1 text-rose-500 opacity-80 transition group-hover:opacity-100 sm:p-2"
        aria-label={`Delete ${title}`}
      >
        <Trash2 className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
      </button>
    </div>
  );
});

NotebookStripCard.displayName = "NotebookStripCard";

const PageStripCard = memo(function PageStripCard({
  pageId,
  pageName,
  index,
  itemCount,
  previewSvg,
  selected,
  canDelete,
  onSelect,
  onRename,
  onDuplicate,
  onDelete,
}: {
  pageId: string;
  pageName: string;
  index: number;
  itemCount: number;
  previewSvg: string;
  selected: boolean;
  canDelete: boolean;
  onSelect: (pageId: string) => void;
  onRename: (pageId: string) => void;
  onDuplicate: (pageId: string) => void;
  onDelete: (pageId: string, index: number) => void;
}) {
  const previewUrl = useStablePreviewUrl(previewSvg);

  return (
    <div
      className={`group w-[292px] max-w-[88vw] flex-none snap-start rounded-[14px] border text-left transition sm:w-[280px] sm:max-w-none sm:rounded-[18px] ${
        selected ? "border-brand/40 bg-brand/6 ring-1 ring-brand/20" : "border-app-border bg-white"
      }`}
    >
      <button type="button" onClick={() => onSelect(pageId)} className="block w-full">
        <div className="flex items-stretch">
          <div className="h-[56px] w-[56px] shrink-0 overflow-hidden rounded-l-[14px] border-r border-app-border bg-[#f8fafc] sm:h-[78px] sm:w-[88px] sm:rounded-l-[18px]">
            <img src={previewUrl} alt={pageName} className="h-full w-full object-cover" />
          </div>

          <div className="flex min-w-0 flex-1 flex-col justify-between px-2 py-1.5 sm:px-3 sm:py-2.5">
            <div>
              <div className="flex items-start justify-between gap-1.5">
                <div className="min-w-0">
                  <p className="truncate text-[12px] font-semibold text-app-text sm:text-sm">{pageName}</p>
                  <p className="mt-0.5 text-[9px] text-app-muted sm:text-[11px]">
                    {itemCount} item{itemCount === 1 ? "" : "s"}
                  </p>
                  {selected ? (
                    <p className="mt-1 text-[8px] font-semibold uppercase tracking-[0.08em] text-brand sm:text-[9px]">Active</p>
                  ) : null}
                </div>
                <span className="rounded-full bg-app-secondary px-1.5 py-1 text-[9px] font-semibold text-app-muted sm:px-2 sm:text-[10px]">
                  {index + 1}
                </span>
              </div>
            </div>
          </div>
        </div>
      </button>

      <div className="grid grid-cols-3 gap-1 border-t border-app-border px-1.5 py-1.5 sm:flex sm:flex-wrap sm:gap-1.5 sm:px-3 sm:py-2.5">
        <button
          type="button"
          className="rounded-full bg-app-secondary px-1.5 py-1 text-[8px] font-semibold text-app-text sm:px-2.5 sm:text-[10px]"
          onClick={() => onRename(pageId)}
        >
          Rename
        </button>
        <button
          type="button"
          className="rounded-full bg-app-secondary px-1.5 py-1 text-[8px] font-semibold text-app-text sm:px-2.5 sm:text-[10px]"
          onClick={() => onDuplicate(pageId)}
        >
          Duplicate
        </button>
        <button
          type="button"
          className="rounded-full bg-rose-500/10 px-1.5 py-1 text-[8px] font-semibold text-rose-600 sm:px-2.5 sm:text-[10px]"
          disabled={!canDelete}
          onClick={() => onDelete(pageId, index)}
        >
          Delete
        </button>
      </div>
    </div>
  );
});

PageStripCard.displayName = "PageStripCard";

function dataUrlToFile(dataUrl: string, filename: string) {
  const match = dataUrl.match(/^data:(.*?);base64,(.*)$/);
  if (!match) {
    throw new Error("This WhiteBook image could not be prepared for sharing.");
  }

  const mimeType = match[1] || "image/png";
  const binary = atob(match[2]);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return new File([bytes], filename, {
    type: mimeType,
    lastModified: Date.now(),
  });
}

async function prepareWhitebookSnapshotForEmbeddedShare(snapshot: WhitebookExportPayload) {
  const uploadCache = new Map<string, Promise<string>>();

  const pages = await Promise.all(
    snapshot.pages.map(async (page) => {
      const images = await Promise.all(
        page.images.map(async (image, index) => {
          if (!image.src.startsWith("data:")) {
            return image;
          }

          let uploadRequest = uploadCache.get(image.src);
          if (!uploadRequest) {
            const file = dataUrlToFile(image.src, image.name || `whitebook-image-${index + 1}.png`);
            uploadRequest = uploadManagedMedia({
              file,
              usage: "post_image",
            }).then((asset) => asset.public_url);
            uploadCache.set(image.src, uploadRequest);
          }

          const publicUrl = await uploadRequest;
          return {
            ...image,
            src: publicUrl,
          };
        })
      );

      return {
        ...page,
        images,
      };
    })
  );

  return {
    ...snapshot,
    pages,
  };
}

export function WhitebookNotebookPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedNotebookId = searchParams.get("notebook");
  const { user, profile } = useAuthStore();
  const importInputRef = useRef<HTMLInputElement | null>(null);
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const saveTimerRef = useRef<number | null>(null);
  const lastHandledRequestedNotebookIdRef = useRef<string | null>(null);
  const paintSurfaceRef = useRef<HTMLDivElement | null>(null);
  const canvasHostRef = useRef<HTMLDivElement | null>(null);
  const historyRef = useRef<{ past: WhitebookNotebook[]; future: WhitebookNotebook[] }>({
    past: [],
    future: [],
  });

  const [loading, setLoading] = useState(true);
  const [notebooks, setNotebooks] = useState<WhitebookNotebook[]>([]);
  const [activeNotebookId, setActiveNotebookId] = useState("");
  const [activeTool, setActiveTool] = useState<WhitebookTool>("pen");
  const [eraserMode, setEraserMode] = useState<WhitebookEraserMode>("drag");
  const [strokeColor, setStrokeColor] = useState<string>(whitebookInkPalette[0]);
  const [strokeSize, setStrokeSize] = useState<number>(whitebookStrokeSizes[1]);
  const [viewport, setViewport] = useState<WhitebookViewport>({ zoom: 1, offsetX: 0, offsetY: 0 });
  const [canvasResetNonce, setCanvasResetNonce] = useState(0);
  const [saveLabel, setSaveLabel] = useState("Saved locally");
  const [joinedCommunities, setJoinedCommunities] = useState<CommunityRow[]>([]);
  const [shareOptionsReady, setShareOptionsReady] = useState(false);
  const [shareState, setShareState] = useState<WhitebookShareState>(defaultShareState);
  const [importingFile, setImportingFile] = useState(false);
  const [importingImage, setImportingImage] = useState(false);
  const [selectedImageId, setSelectedImageId] = useState<string | null>(null);
  const [fullscreen, setFullscreen] = useState(false);
  const [toolbarTab, setToolbarTab] = useState<WhitebookToolbarTab>("tools");
  const [libraryTab, setLibraryTab] = useState<WhitebookLibraryTab>("notebooks");

  useEffect(() => {
    let cancelled = false;

    void listLocalWhitebookNotebooks()
      .then(async (items) => {
        if (cancelled) {
          return;
        }

        if (items.length > 0) {
          const sorted = sortNotebooks(items);
          setNotebooks(sorted);
          setActiveNotebookId(sorted[0].id);
          setLoading(false);
          return;
        }

        const starter = createWhitebookNotebook("WhiteBook Notes");
        await saveLocalWhitebookNotebook(starter);
        if (cancelled) {
          return;
        }

        setNotebooks([starter]);
        setActiveNotebookId(starter.id);
        setLoading(false);
      })
      .catch((error) => {
        if (cancelled) {
          return;
        }

        toast.error(error instanceof Error ? error.message : "Could not open WhiteBook right now.");
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!requestedNotebookId || !notebooks.length) {
      return;
    }

    if (requestedNotebookId === lastHandledRequestedNotebookIdRef.current && activeNotebookId) {
      return;
    }

    if (notebooks.some((entry) => entry.id === requestedNotebookId)) {
      lastHandledRequestedNotebookIdRef.current = requestedNotebookId;
      setActiveNotebookId(requestedNotebookId);
    }
  }, [activeNotebookId, notebooks, requestedNotebookId]);

  useEffect(() => {
    if (!notebooks.length) {
      return;
    }

    if (activeNotebookId && notebooks.some((entry) => entry.id === activeNotebookId)) {
      return;
    }

    const fallbackId =
      requestedNotebookId && notebooks.some((entry) => entry.id === requestedNotebookId)
        ? requestedNotebookId
        : sortNotebooks(notebooks)[0].id;

    if (fallbackId) {
      setActiveNotebookId(fallbackId);
    }
  }, [activeNotebookId, notebooks, requestedNotebookId]);

  useEffect(() => {
    if (!activeNotebookId) {
      return;
    }

    const next = new URLSearchParams(searchParams);
    if (next.get("notebook") === activeNotebookId) {
      return;
    }

    next.set("notebook", activeNotebookId);
    setSearchParams(next, { replace: true });
  }, [activeNotebookId, searchParams, setSearchParams]);

  useEffect(() => {
    if (!shareState.open || shareOptionsReady || !user) {
      return;
    }

    let cancelled = false;
    setShareState((current) => ({ ...current, loading: true }));

    void Promise.all([loadVisibleCommunities(), loadCommunityMemberships(user.id)])
      .then(([communities, memberships]) => {
        if (cancelled) {
          return;
        }

        const joined = (communities as CommunityRow[]).filter((community) => memberships.has(community.id));
        setJoinedCommunities(joined);
        setShareOptionsReady(true);
        setShareState((current) => ({
          ...current,
          loading: false,
          communityId: current.communityId || joined[0]?.id || "",
        }));
      })
      .catch(() => {
        if (cancelled) {
          return;
        }

        toast.error("Could not load share options.");
        setShareState((current) => ({ ...current, loading: false }));
      });

    return () => {
      cancelled = true;
    };
  }, [shareOptionsReady, shareState.open, user]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setFullscreen(Boolean(document.fullscreenElement && document.fullscreenElement === paintSurfaceRef.current));
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  useEffect(() => {
    return () => {
      if (saveTimerRef.current) {
        window.clearTimeout(saveTimerRef.current);
      }
    };
  }, []);

  const orderedNotebooks = useMemo(() => sortNotebooks(notebooks), [notebooks]);
  const activeNotebook =
    orderedNotebooks.find((entry) => entry.id === activeNotebookId) || orderedNotebooks[0] || null;
  const activePage = activeNotebook ? getWhitebookActivePage(activeNotebook) : null;
  const selectedImage = activePage?.images.find((image) => image.id === selectedImageId) || null;
  const authRedirectPath = buildAuthRedirectPath(location);
  const shareUrlFallback =
    user && profile
      ? new URL(
          buildPublicWhitebookPath(activeNotebook?.lastSharedShareSlug || "your-share-link", profile.username),
          getWhitebookBaseUrl()
        ).toString()
      : "https://studentsociety.in/app/myroom/whitebook/live/your-share-link/student";
  const notebookStripItems = useMemo(
    () =>
      [...orderedNotebooks]
        .sort((left, right) => {
          if (left.id === activeNotebookId) {
            return -1;
          }
          if (right.id === activeNotebookId) {
            return 1;
          }
          return 0;
        })
        .map((notebook) => ({
          id: notebook.id,
          title: notebook.title,
          pageCount: notebook.pages.length,
          previewSvg: notebook.coverSvg,
        })),
    [activeNotebookId, orderedNotebooks]
  );
  const pageStripItems = useMemo(
    () =>
      activeNotebook
        ? activeNotebook.pages
            .map((page, index) => ({
              id: page.id,
              index,
              name: page.name,
              itemCount: countWhitebookPageItems(page),
              previewSvg: buildWhitebookPreviewSvg(page),
            }))
            .sort((left, right) => {
              if (left.id === activeNotebook.activePageId) {
                return -1;
              }
              if (right.id === activeNotebook.activePageId) {
                return 1;
              }
              return 0;
            })
        : [],
    [activeNotebook]
  );

  useEffect(() => {
    if (!activePage) {
      setSelectedImageId(null);
      return;
    }

    if (selectedImageId && !activePage.images.some((image) => image.id === selectedImageId)) {
      setSelectedImageId(null);
    }
  }, [activePage, selectedImageId]);

  const scheduleNotebookSave = useCallback((notebook: WhitebookNotebook) => {
    if (saveTimerRef.current) {
      window.clearTimeout(saveTimerRef.current);
    }

    setSaveLabel("Saving locally...");
    saveTimerRef.current = window.setTimeout(() => {
      void saveLocalWhitebookNotebook(notebook)
        .then(() => {
          setSaveLabel("Saved locally");
        })
        .catch(() => {
          setSaveLabel("Save failed");
        });
    }, 240);
  }, []);

  const replaceNotebook = useCallback((nextNotebook: WhitebookNotebook, options?: { recordHistory?: boolean }) => {
    if (!activeNotebook) {
      return;
    }

    const previousNotebook = cloneWhitebookNotebook(activeNotebook);
    const normalizedNotebook = normalizeWhitebookNotebook({
      ...nextNotebook,
      coverSvg: buildWhitebookPreviewSvg(getWhitebookActivePage(nextNotebook)),
      updatedAt: new Date().toISOString(),
      lastOpenedAt: new Date().toISOString(),
    });

    const previousSignature = JSON.stringify(previousNotebook);
    const nextSignature = JSON.stringify(normalizedNotebook);

    if (previousSignature === nextSignature) {
      return;
    }

    if (options?.recordHistory !== false) {
      historyRef.current = {
        past: [...historyRef.current.past.slice(-29), previousNotebook],
        future: [],
      };
    }

    setNotebooks((current) =>
      current.map((entry) => (entry.id === normalizedNotebook.id ? normalizedNotebook : entry))
    );
    scheduleNotebookSave(normalizedNotebook);
  }, [activeNotebook, scheduleNotebookSave]);

  const updateActiveNotebook = useCallback((
    updater: (current: WhitebookNotebook) => WhitebookNotebook,
    options?: { recordHistory?: boolean; recenterCanvas?: boolean }
  ) => {
    if (!activeNotebook) {
      return;
    }

    const nextNotebook = updater(cloneWhitebookNotebook(activeNotebook));
    replaceNotebook(nextNotebook, options);

    if (options?.recenterCanvas) {
      setViewport({ zoom: 1, offsetX: 0, offsetY: 0 });
      setCanvasResetNonce((current) => current + 1);
    }
  }, [activeNotebook, replaceNotebook]);

  const activateNotebook = useCallback((notebookId: string) => {
    setActiveNotebookId(notebookId);
    setSelectedImageId(null);
    setViewport({ zoom: 1, offsetX: 0, offsetY: 0 });
    setCanvasResetNonce((current) => current + 1);
    historyRef.current = { past: [], future: [] };
  }, []);

  const createNotebook = useCallback(async (title = `WhiteBook ${orderedNotebooks.length + 1}`) => {
    const notebook = createWhitebookNotebook(title);
    await saveLocalWhitebookNotebook(notebook);
    setNotebooks((current) => sortNotebooks([notebook, ...current]));
    activateNotebook(notebook.id);
    toast.success("New WhiteBook created.");
  }, [activateNotebook, orderedNotebooks.length]);

  const handleDeleteNotebook = useCallback(async (targetId: string, targetTitle: string) => {
    if (!window.confirm(`Delete "${targetTitle}" from this device?`)) {
      return;
    }

    const remaining = orderedNotebooks.filter((entry) => entry.id !== targetId);
    await deleteLocalWhitebookNotebook(targetId);

    if (remaining.length === 0) {
      const replacement = createWhitebookNotebook("WhiteBook Notes");
      await saveLocalWhitebookNotebook(replacement);
      setNotebooks([replacement]);
      activateNotebook(replacement.id);
    } else {
      setNotebooks(remaining);
      if (targetId === activeNotebookId) {
        activateNotebook(remaining[0].id);
      }
    }

    toast.success("WhiteBook deleted.");
  }, [activeNotebookId, activateNotebook, orderedNotebooks]);

  async function handleImportFile(file: File) {
    setImportingFile(true);

    try {
      const raw = await file.text();
      const payload = normalizeWhitebookExportPayload(JSON.parse(raw));
      const importedNotebook = createImportedWhitebookNotebook(payload, {
        title: payload.title,
      });
      await saveLocalWhitebookNotebook(importedNotebook);
      setNotebooks((current) => sortNotebooks([importedNotebook, ...current]));
      activateNotebook(importedNotebook.id);
      toast.success("WhiteBook imported.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "That file is not a valid WhiteBook export.");
    } finally {
      setImportingFile(false);
      if (importInputRef.current) {
        importInputRef.current.value = "";
      }
    }
  }

  const handleCanvasPageChange = useCallback((nextPage: WhitebookPage) => {
    if (!activePage) {
      return;
    }

    updateActiveNotebook((current) => replaceWhitebookPage(current, activePage.id, nextPage));
  }, [activePage, updateActiveNotebook]);

  function getCanvasWorldCenter() {
    const bounds = canvasHostRef.current?.getBoundingClientRect();
    if (!bounds?.width || !bounds?.height) {
      return { x: 0, y: 0 };
    }

    return {
      x: (bounds.width / 2 - viewport.offsetX) / viewport.zoom,
      y: (bounds.height / 2 - viewport.offsetY) / viewport.zoom,
    };
  }

  async function handleImportImage(file: File) {
    if (!activePage) {
      return;
    }

    setImportingImage(true);

    try {
      const optimizedFile = await optimizeImageForWhitebook(file);
      const src = await readFileAsDataUrl(optimizedFile);
      const { width: naturalWidth, height: naturalHeight } = await loadImageDimensions(src);
      const maxDisplayWidth = Math.min(720, naturalWidth);
      const scale = Math.min(1, maxDisplayWidth / naturalWidth);
      const width = Math.max(180, Math.round(naturalWidth * scale));
      const height = Math.max(140, Math.round(naturalHeight * scale));
      const center = getCanvasWorldCenter();
      const now = new Date().toISOString();
      const nextImage: WhitebookImageLayer = {
        id: createWhitebookEntityId("wb_image"),
        type: "image",
        src,
        name: file.name || "Imported image",
        x: center.x - width / 2,
        y: center.y - height / 2,
        width,
        height,
        naturalWidth,
        naturalHeight,
        crop: {
          x: 0,
          y: 0,
          width: naturalWidth,
          height: naturalHeight,
        },
        createdAt: now,
        updatedAt: now,
      };

      handleCanvasPageChange({
        ...activePage,
        images: [...activePage.images, nextImage],
        updatedAt: now,
      });
      setSelectedImageId(nextImage.id);
      setActiveTool("select");
      toast.success("Photo added to the board.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not import this photo.");
    } finally {
      setImportingImage(false);
      if (imageInputRef.current) {
        imageInputRef.current.value = "";
      }
    }
  }

  function updateSelectedImage(updater: (image: WhitebookImageLayer) => WhitebookImageLayer) {
    if (!activePage || !selectedImage) {
      return;
    }

    handleCanvasPageChange({
      ...activePage,
      images: activePage.images.map((image) =>
        image.id === selectedImage.id
          ? {
              ...updater(image),
              updatedAt: new Date().toISOString(),
            }
          : image
      ),
      updatedAt: new Date().toISOString(),
    });
  }

  function handleZoomChange(nextZoom: number) {
    const clampedZoom = clampZoomValue(nextZoom);
    const bounds = canvasHostRef.current?.getBoundingClientRect();

    if (!bounds?.width || !bounds?.height) {
      setViewport((current) => ({ ...current, zoom: clampedZoom }));
      return;
    }

    const centerX = bounds.width / 2;
    const centerY = bounds.height / 2;
    const worldX = (centerX - viewport.offsetX) / viewport.zoom;
    const worldY = (centerY - viewport.offsetY) / viewport.zoom;

    setViewport({
      zoom: clampedZoom,
      offsetX: centerX - worldX * clampedZoom,
      offsetY: centerY - worldY * clampedZoom,
    });
  }

  async function toggleFullscreen() {
    const surface = paintSurfaceRef.current;
    if (!surface) {
      return;
    }

    const permissionPolicy = (
      document as Document & {
        permissionsPolicy?: { allowsFeature?: (feature: string) => boolean };
      }
    ).permissionsPolicy;

    if (permissionPolicy?.allowsFeature && !permissionPolicy.allowsFeature("fullscreen")) {
      toast.error("Fullscreen is blocked in this browser.");
      return;
    }

    try {
      if (document.fullscreenElement === surface) {
        await document.exitFullscreen();
        return;
      }

      await surface.requestFullscreen();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not open fullscreen."
      );
    }
  }

  const handleCreatePage = useCallback(() => {
    updateActiveNotebook(
      (current) => {
        const nextPage = createWhitebookPage(`Page ${current.pages.length + 1}`);
        return {
          ...current,
          pages: [...current.pages, nextPage],
          activePageId: nextPage.id,
        };
      },
      { recenterCanvas: true }
    );
    setSelectedImageId(null);
  }, [updateActiveNotebook]);

  const handleSelectPage = useCallback((pageId: string) => {
    updateActiveNotebook(
      (current) => ({
        ...current,
        activePageId: pageId,
      }),
      { recordHistory: false, recenterCanvas: true }
    );
    setSelectedImageId(null);
  }, [updateActiveNotebook]);

  const handleRenamePage = useCallback((pageId: string) => {
    const page = activeNotebook?.pages.find((entry) => entry.id === pageId);
    if (!page) {
      return;
    }

    const nextName = window.prompt("Rename page", page.name)?.trim();
    if (!nextName) {
      return;
    }

    updateActiveNotebook((current) => ({
      ...current,
      pages: current.pages.map((entry) =>
        entry.id === pageId ? { ...entry, name: nextName, updatedAt: new Date().toISOString() } : entry
      ),
    }));
  }, [activeNotebook, updateActiveNotebook]);

  const handleDuplicatePage = useCallback((pageId: string) => {
    const page = activeNotebook?.pages.find((entry) => entry.id === pageId);
    if (!page) {
      return;
    }

    updateActiveNotebook(
      (current) => {
        const copySeed = Date.now().toString(36);
        const clonedPage: WhitebookPage = {
          ...page,
          id: `${page.id}_copy_${copySeed}`,
          name: `${page.name} Copy`,
          images: page.images.map((image) => ({
            ...image,
            id: `${image.id}_copy_${copySeed}`,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          })),
          strokes: page.strokes.map((stroke) => ({
            ...stroke,
            id: `${stroke.id}_copy_${copySeed}`,
          })),
          texts: page.texts.map((textLayer) => ({
            ...textLayer,
            id: `${textLayer.id}_copy_${copySeed}`,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          })),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        return {
          ...current,
          pages: [...current.pages, clonedPage],
          activePageId: clonedPage.id,
        };
      },
      { recenterCanvas: true }
    );
    setSelectedImageId(null);
  }, [activeNotebook, updateActiveNotebook]);

  const handleDeletePage = useCallback((pageId: string, index: number) => {
    if (!activeNotebook || activeNotebook.pages.length === 1) {
      return;
    }

    updateActiveNotebook(
      (current) => {
        const nextPages = current.pages.filter((entry) => entry.id !== pageId);
        const fallbackPage = nextPages[Math.max(0, index - 1)] || nextPages[0];
        return {
          ...current,
          pages: nextPages,
          activePageId: current.activePageId === pageId ? fallbackPage.id : current.activePageId,
        };
      },
      { recenterCanvas: true }
    );
    setSelectedImageId(null);
  }, [activeNotebook, updateActiveNotebook]);

  if (loading) {
    return <div className="surface-card h-72 animate-pulse rounded-[28px]" />;
  }

  if (!activeNotebook || !activePage) {
    return (
      <div className="surface-card rounded-[28px] p-8 text-center text-sm text-app-muted">
        WhiteBook could not load a notebook.
      </div>
    );
  }

  const canUndo = historyRef.current.past.length > 0;
  const canRedo = historyRef.current.future.length > 0;
  const activePageIndex = activeNotebook.pages.findIndex((page) => page.id === activePage.id);
  const handleUndo = () => {
    const previous = historyRef.current.past[historyRef.current.past.length - 1];
    if (!previous || !activeNotebook) {
      return;
    }

    historyRef.current = {
      past: historyRef.current.past.slice(0, -1),
      future: [cloneWhitebookNotebook(activeNotebook), ...historyRef.current.future].slice(0, 30),
    };
    setNotebooks((current) => current.map((entry) => (entry.id === activeNotebook.id ? previous : entry)));
    scheduleNotebookSave(previous);
  };

  const handleRedo = () => {
    const next = historyRef.current.future[0];
    if (!next || !activeNotebook) {
      return;
    }

    historyRef.current = {
      past: [...historyRef.current.past, cloneWhitebookNotebook(activeNotebook)].slice(-30),
      future: historyRef.current.future.slice(1),
    };
    setNotebooks((current) => current.map((entry) => (entry.id === activeNotebook.id ? next : entry)));
    scheduleNotebookSave(next);
  };

  const notebookPanel = (
    <div className="flex h-full flex-col rounded-[18px] border border-app-border bg-app-card p-2 sm:rounded-[24px] sm:p-3">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-app-muted">Notebooks</p>
          <p className="mt-1 text-[12px] font-semibold text-app-text sm:text-sm">Notebook list</p>
        </div>
        <button type="button" className="rounded-full bg-brand/10 p-1.5 text-brand sm:p-2" onClick={() => void createNotebook()}>
          <Plus className="h-4 w-4" />
        </button>
      </div>

      <div className="scrollbar-none mt-2 flex snap-x snap-mandatory gap-2 overflow-x-auto pb-1 sm:mt-3 sm:gap-2.5">
        {notebookStripItems.map((notebook) => {
          return (
            <NotebookStripCard
              key={notebook.id}
              notebookId={notebook.id}
              title={notebook.title}
              pageCount={notebook.pageCount}
              previewSvg={notebook.previewSvg}
              selected={notebook.id === activeNotebook.id}
              onActivate={activateNotebook}
              onDelete={handleDeleteNotebook}
            />
          );
        })}
      </div>
    </div>
  );

  const pagePanel = (
    <div className="flex h-full flex-col rounded-[18px] border border-app-border bg-app-card p-2 sm:rounded-[24px] sm:p-3">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-app-muted">Pages</p>
          <p className="mt-1 text-[12px] font-semibold text-app-text sm:text-sm">Page list</p>
        </div>
        <button type="button" className="rounded-full bg-brand/10 p-1.5 text-brand sm:p-2" onClick={handleCreatePage}>
          <FilePlus2 className="h-4 w-4" />
        </button>
      </div>

      <div className="scrollbar-none mt-2 flex snap-x snap-mandatory gap-2 overflow-x-auto pb-1 sm:mt-3 sm:gap-2.5">
        {pageStripItems.map((page) => {
          return (
            <PageStripCard
              key={page.id}
              pageId={page.id}
              pageName={page.name}
              index={page.index}
              itemCount={page.itemCount}
              previewSvg={page.previewSvg}
              selected={page.id === activePage.id}
              canDelete={activeNotebook.pages.length > 1}
              onSelect={handleSelectPage}
              onRename={handleRenamePage}
              onDuplicate={handleDuplicatePage}
              onDelete={handleDeletePage}
            />
          );
        })}
      </div>
    </div>
  );

  return (
    <div className="space-y-3 sm:space-y-4">
      <section className="surface-card overflow-hidden rounded-[24px] p-3 sm:rounded-[30px] sm:p-5">
        <div className="space-y-3 sm:space-y-4">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-app-muted sm:text-[11px]">My Room WhiteBook</p>
              <div className="mt-2 flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
                <h1 className="font-display text-[1.15rem] font-semibold tracking-tight text-app-text sm:text-[1.55rem]">
                  WhiteBook Notebook
                </h1>
                <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-app-muted sm:gap-2 sm:text-xs">
                  <span className="rounded-full bg-app-secondary px-2.5 py-1 font-semibold text-app-text sm:px-3 sm:py-1.5">
                    {orderedNotebooks.length} notebook{orderedNotebooks.length === 1 ? "" : "s"}
                  </span>
                  <span className="rounded-full bg-app-secondary px-2.5 py-1 font-semibold text-app-text sm:px-3 sm:py-1.5">
                    {activeNotebook.pages.length} page{activeNotebook.pages.length === 1 ? "" : "s"}
                  </span>
                  <span className="rounded-full bg-emerald-500/12 px-2.5 py-1 font-semibold text-emerald-700 sm:px-3 sm:py-1.5">{saveLabel}</span>
                </div>
              </div>
              <p className="mt-2 max-w-3xl text-[13px] leading-5 text-app-muted sm:text-sm sm:leading-6">
                Paint-style WhiteBook workspace with endless pages, image layers, drag erasing, stroke erase, and local-first notebooks.
              </p>
            </div>

            <div className="grid grid-cols-4 gap-1.5 sm:gap-2">
              <button
                type="button"
                className="btn-secondary inline-flex min-w-0 items-center justify-center gap-1.5 px-2 py-2 text-[10px] sm:gap-2 sm:px-3 sm:text-xs"
                onClick={() => void createNotebook()}
              >
                <NotebookPen className="h-4 w-4" />
                <span className="truncate">New</span>
              </button>
              <button
                type="button"
                className="btn-secondary inline-flex min-w-0 items-center justify-center gap-1.5 px-2 py-2 text-[10px] sm:gap-2 sm:px-3 sm:text-xs"
                onClick={() => importInputRef.current?.click()}
                disabled={importingFile}
              >
                <Import className="h-4 w-4" />
                <span className="truncate">{importingFile ? "Import..." : "Import"}</span>
              </button>
              <button
                type="button"
                className="btn-secondary inline-flex min-w-0 items-center justify-center gap-1.5 px-2 py-2 text-[10px] sm:gap-2 sm:px-3 sm:text-xs"
                onClick={() =>
                  downloadJson(
                    `${activeNotebook.title.toLowerCase().replace(/[^a-z0-9]+/g, "-") || "whitebook"}.json`,
                    buildWhitebookExportPayload(activeNotebook)
                  )
                }
              >
                <Download className="h-4 w-4" />
                <span className="truncate">Export</span>
              </button>
              <button
                type="button"
                className="btn-primary inline-flex min-w-0 items-center justify-center gap-1.5 px-2 py-2 text-[10px] sm:gap-2 sm:px-3 sm:text-xs"
                onClick={() => {
                  if (!user || !profile) {
                    navigate(authRedirectPath);
                    return;
                  }

                  setShareState((current) => ({
                    ...current,
                    open: true,
                    title: current.title || `WhiteBook: ${activeNotebook.title}`,
                  }));
                }}
              >
                <Share2 className="h-4 w-4" />
                <span className="truncate">Share</span>
              </button>
            </div>
          </div>

          <div className="space-y-2 sm:hidden">
            <div className="grid grid-cols-2 gap-1">
              <ToolbarTabButton
                active={libraryTab === "notebooks"}
                icon={NotebookPen}
                label="Notebooks"
                onClick={() => setLibraryTab("notebooks")}
              />
              <ToolbarTabButton
                active={libraryTab === "pages"}
                icon={FilePlus2}
                label="Pages"
                onClick={() => setLibraryTab("pages")}
              />
            </div>
            {libraryTab === "notebooks" ? notebookPanel : pagePanel}
          </div>

          <div className="hidden grid-cols-2 gap-3 sm:grid">
            {notebookPanel}
            {pagePanel}
          </div>

          <div className="grid gap-2.5 sm:gap-3">
            <label className="grid gap-1.5">
              <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-app-muted">Notebook Title</span>
              <input
                value={activeNotebook.title}
                onChange={(event) =>
                  updateActiveNotebook(
                    (current) => ({
                      ...current,
                      title: event.target.value || "Untitled WhiteBook",
                    }),
                    { recordHistory: false }
                  )
                }
                className="w-full rounded-[18px] border border-app-border bg-white px-4 py-2.5 text-sm font-semibold text-app-text outline-none transition focus:border-brand/40"
                placeholder="WhiteBook title"
              />
            </label>
          </div>
        </div>
      </section>

      <section className={`surface-card rounded-[24px] p-1.5 sm:rounded-[30px] sm:p-2.5 ${fullscreen ? "!rounded-none !p-0" : ""}`}>
        <div
          ref={paintSurfaceRef}
          className={`rounded-[22px] border border-app-border bg-[linear-gradient(180deg,#ffffff,#f8fbff)] sm:rounded-[28px] ${
            fullscreen ? "flex h-[100dvh] min-h-[100dvh] flex-col rounded-none border-0" : ""
          }`}
        >
          <div className="border-b border-app-border px-2.5 py-2 sm:px-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-app-muted">Canvas</p>
                <p className="mt-0.5 font-display text-[15px] font-semibold text-app-text sm:text-base">{activePage.name}</p>
              </div>

              <div className="flex flex-wrap items-center gap-1 text-[10px] text-app-muted sm:gap-1.5 sm:text-[11px]">
                <span className="rounded-full bg-app-secondary px-2 py-1 font-semibold text-app-text sm:px-2.5">
                  Page {activePageIndex + 1} of {activeNotebook.pages.length}
                </span>
                <span className="rounded-full bg-app-secondary px-2 py-1 font-semibold text-app-text sm:px-2.5">
                  {activePage.images.length} photo{activePage.images.length === 1 ? "" : "s"}
                </span>
                <span className="rounded-full bg-app-secondary px-2 py-1 font-semibold text-app-text sm:px-2.5">
                  {activePage.strokes.length} stroke{activePage.strokes.length === 1 ? "" : "s"}
                </span>
                <span className="rounded-full bg-app-secondary px-2 py-1 font-semibold text-app-text sm:px-2.5">
                  {activePage.texts.length} text{activePage.texts.length === 1 ? "" : "s"}
                </span>
                <span className="rounded-full bg-brand/10 px-2 py-1 font-semibold text-brand sm:px-2.5">
                  {Math.round(viewport.zoom * 100)}%
                </span>
              </div>
            </div>
          </div>

          <div className="border-b border-app-border bg-[linear-gradient(180deg,rgba(248,250,252,0.92),rgba(241,245,249,0.82))] p-1.5">
            <div className="grid grid-cols-4 gap-1">
              <ToolbarTabButton active={toolbarTab === "tools"} icon={MousePointer2} label="Tools" onClick={() => setToolbarTab("tools")} />
              <ToolbarTabButton active={toolbarTab === "style"} icon={Pencil} label="Style" onClick={() => setToolbarTab("style")} />
              <ToolbarTabButton active={toolbarTab === "media"} icon={ImagePlus} label="Media" onClick={() => setToolbarTab("media")} />
              <ToolbarTabButton active={toolbarTab === "view"} icon={RefreshCw} label="View" onClick={() => setToolbarTab("view")} />
            </div>

            <div className="mt-1.5">
              {toolbarTab === "tools" ? (
                <ToolbarGroup label="Tools">
                  <div className="scrollbar-none flex min-w-full flex-nowrap gap-1.5 overflow-x-auto pb-1">
                    <RibbonButton active={activeTool === "select"} onClick={() => setActiveTool("select")}>
                      <MousePointer2 className="h-4 w-4" />
                      Select
                    </RibbonButton>
                    <RibbonButton active={activeTool === "text"} onClick={() => setActiveTool("text")}>
                      <Type className="h-4 w-4" />
                      Text
                    </RibbonButton>
                    <RibbonButton active={activeTool === "pen"} onClick={() => setActiveTool("pen")}>
                      <Pencil className="h-4 w-4" />
                      Pen
                    </RibbonButton>
                    <RibbonButton active={activeTool === "highlighter"} onClick={() => setActiveTool("highlighter")}>
                      <Highlighter className="h-4 w-4" />
                      Highlight
                    </RibbonButton>
                    <RibbonButton active={activeTool === "eraser"} onClick={() => setActiveTool("eraser")}>
                      <Eraser className="h-4 w-4" />
                      Erase
                    </RibbonButton>
                    <RibbonButton active={activeTool === "hand"} onClick={() => setActiveTool("hand")}>
                      <Hand className="h-4 w-4" />
                      Move
                    </RibbonButton>
                  </div>

                  {activeTool === "eraser" ? (
                    <div className="scrollbar-none mt-2 flex flex-nowrap gap-1.5 overflow-x-auto pb-1">
                      <RibbonButton active={eraserMode === "drag"} onClick={() => setEraserMode("drag")}>
                        Drag
                      </RibbonButton>
                      <RibbonButton active={eraserMode === "stroke"} onClick={() => setEraserMode("stroke")}>
                        Stroke
                      </RibbonButton>
                    </div>
                  ) : activeTool === "text" ? (
                    <div className="scrollbar-none mt-1.5 flex flex-nowrap gap-1.5 overflow-x-auto pb-1 text-[10px] text-app-muted">
                      <span className="whitespace-nowrap rounded-full bg-app-card px-2 py-1">Click board to type</span>
                      <span className="whitespace-nowrap rounded-full bg-app-card px-2 py-1">Enter saves</span>
                      <span className="whitespace-nowrap rounded-full bg-app-card px-2 py-1">Shift+Enter new line</span>
                    </div>
                  ) : (
                    <div className="scrollbar-none mt-1.5 flex flex-nowrap gap-1.5 overflow-x-auto pb-1 text-[10px] text-app-muted">
                      <span className="whitespace-nowrap rounded-full bg-app-card px-2 py-1">Draw + edit</span>
                      <span className="whitespace-nowrap rounded-full bg-app-card px-2 py-1">Hand pan</span>
                      <span className="whitespace-nowrap rounded-full bg-app-card px-2 py-1">Erase modes</span>
                    </div>
                  )}
                </ToolbarGroup>
              ) : null}

              {toolbarTab === "style" ? (
                <ToolbarGroup label="Color + Size">
                  <div className="scrollbar-none flex gap-1.5 overflow-x-auto pb-1">
                    {whitebookInkPalette.map((color) => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => setStrokeColor(color)}
                        className={`h-6 w-6 flex-none rounded-full border-2 transition sm:h-7 sm:w-7 ${strokeColor === color ? "scale-110 border-app-text" : "border-white"}`}
                        style={{ backgroundColor: color }}
                        aria-label={`Set color ${color}`}
                      />
                    ))}
                    <label className="relative flex h-6 min-w-[76px] flex-none cursor-pointer items-center justify-center gap-2 overflow-hidden rounded-full border border-app-border bg-white px-2 text-[10px] font-semibold text-app-text sm:h-7">
                      <input
                        type="color"
                        value={strokeColor}
                        onChange={(event) => setStrokeColor(event.target.value)}
                        className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                      />
                      <span className="h-4 w-4 rounded-full border border-app-border" style={{ backgroundColor: strokeColor }} />
                      Custom
                    </label>
                  </div>

                  <div className="scrollbar-none mt-2 flex items-center gap-1.5 overflow-x-auto pb-1">
                    {whitebookStrokeSizes.map((size) => (
                      <button
                        key={size}
                        type="button"
                        onClick={() => setStrokeSize(size)}
                        className={`inline-flex flex-none items-center gap-1.5 rounded-full px-2.5 py-1.5 text-[11px] font-semibold transition ${
                          strokeSize === size ? "bg-brand text-white" : "bg-app-card text-app-text"
                        }`}
                      >
                        <span
                          className="inline-block rounded-full bg-current"
                          style={{
                            width: `${Math.max(5, Math.min(16, size + 1))}px`,
                            height: `${Math.max(5, Math.min(16, size + 1))}px`,
                          }}
                        />
                        {size}px
                      </button>
                    ))}
                    <label className="inline-flex flex-none items-center gap-1.5 rounded-full border border-app-border bg-white px-2.5 py-1.5 text-[11px] font-semibold text-app-text">
                      Size
                      <input
                        type="number"
                        min={1}
                        max={48}
                        value={strokeSize}
                        onChange={(event) =>
                          setStrokeSize(Math.max(1, Math.min(48, Number(event.target.value) || strokeSize)))
                        }
                        className="w-12 bg-transparent text-right outline-none"
                      />
                    </label>
                  </div>
                </ToolbarGroup>
              ) : null}

              {toolbarTab === "media" ? (
                <ToolbarGroup label="Images">
                  <div className="scrollbar-none flex flex-nowrap gap-1.5 overflow-x-auto pb-1">
                    <RibbonButton onClick={() => imageInputRef.current?.click()} disabled={importingImage}>
                      <ImagePlus className="h-4 w-4" />
                      {importingImage ? "Adding..." : "Import"}
                    </RibbonButton>
                    <RibbonButton
                      active={activeTool === "select"}
                      onClick={() => {
                        setActiveTool("select");
                        if (selectedImage) {
                          setSelectedImageId(selectedImage.id);
                        }
                      }}
                      disabled={!selectedImage}
                    >
                      <Crop className="h-4 w-4" />
                      {selectedImage ? "Select" : "Pick"}
                    </RibbonButton>
                    <RibbonButton
                      onClick={() => {
                        if (!selectedImage || !activePage) {
                          return;
                        }

                        handleCanvasPageChange({
                          ...activePage,
                          images: activePage.images.filter((image) => image.id !== selectedImage.id),
                          updatedAt: new Date().toISOString(),
                        });
                        setSelectedImageId(null);
                      }}
                      disabled={!selectedImage}
                    >
                      <Trash2 className="h-4 w-4" />
                      Delete
                    </RibbonButton>
                  </div>

                  {selectedImage ? (
                    <div className="mt-2 grid gap-2 lg:grid-cols-2">
                      <div className="grid gap-2">
                        <label className="grid gap-1 text-[10px] font-medium text-app-muted">
                          Width
                          <input
                            type="number"
                            min={40}
                            value={Math.round(selectedImage.width)}
                            onChange={(event) =>
                              updateSelectedImage((image) => ({
                                ...image,
                                width: Math.max(40, Number(event.target.value) || image.width),
                              }))
                            }
                            className="input-field"
                          />
                        </label>
                        <label className="grid gap-1 text-[10px] font-medium text-app-muted">
                          Height
                          <input
                            type="number"
                            min={40}
                            value={Math.round(selectedImage.height)}
                            onChange={(event) =>
                              updateSelectedImage((image) => ({
                                ...image,
                                height: Math.max(40, Number(event.target.value) || image.height),
                              }))
                            }
                            className="input-field"
                          />
                        </label>
                      </div>

                      <div className="rounded-[16px] border border-app-border bg-app-card px-2.5 py-2">
                        <p className="text-[10px] font-semibold text-app-text">{selectedImage.name}</p>
                        <p className="mt-1 text-[10px] leading-4 text-app-muted">
                          Drag the image to move it. Drag the blue corner handles to resize it.
                        </p>
                        <button
                          type="button"
                          className="mt-2 rounded-full bg-app-secondary px-2.5 py-1 text-[10px] font-semibold text-app-text"
                          onClick={() =>
                            updateSelectedImage((image) => ({
                              ...image,
                              crop: {
                                x: 0,
                                y: 0,
                                width: image.naturalWidth,
                                height: image.naturalHeight,
                              },
                            }))
                          }
                        >
                          Reset crop
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="scrollbar-none mt-1.5 flex flex-nowrap gap-1.5 overflow-x-auto pb-1 text-[10px] text-app-muted">
                      <span className="whitespace-nowrap rounded-full bg-app-card px-2 py-1">Import photo</span>
                      <span className="whitespace-nowrap rounded-full bg-app-card px-2 py-1">Select image</span>
                      <span className="whitespace-nowrap rounded-full bg-app-card px-2 py-1">Delete image</span>
                    </div>
                  )}

                  {selectedImage ? (
                    <div className="mt-2 grid gap-2 sm:grid-cols-2">
                      <label className="grid gap-1 text-[10px] font-medium text-app-muted">
                        Crop left
                        <input
                          type="range"
                          min={0}
                          max={Math.max(0, selectedImage.naturalWidth - 1)}
                          value={selectedImage.crop.x}
                          onChange={(event) =>
                            updateSelectedImage((image) => ({
                              ...image,
                              crop: clampCrop(image, { x: Number(event.target.value) }),
                            }))
                          }
                        />
                      </label>
                      <label className="grid gap-1 text-[10px] font-medium text-app-muted">
                        Crop top
                        <input
                          type="range"
                          min={0}
                          max={Math.max(0, selectedImage.naturalHeight - 1)}
                          value={selectedImage.crop.y}
                          onChange={(event) =>
                            updateSelectedImage((image) => ({
                              ...image,
                              crop: clampCrop(image, { y: Number(event.target.value) }),
                            }))
                          }
                        />
                      </label>
                      <label className="grid gap-1 text-[10px] font-medium text-app-muted">
                        Crop width
                        <input
                          type="range"
                          min={20}
                          max={Math.max(20, selectedImage.naturalWidth - selectedImage.crop.x)}
                          value={selectedImage.crop.width}
                          onChange={(event) =>
                            updateSelectedImage((image) => ({
                              ...image,
                              crop: clampCrop(image, { width: Number(event.target.value) }),
                            }))
                          }
                        />
                      </label>
                      <label className="grid gap-1 text-[10px] font-medium text-app-muted">
                        Crop height
                        <input
                          type="range"
                          min={20}
                          max={Math.max(20, selectedImage.naturalHeight - selectedImage.crop.y)}
                          value={selectedImage.crop.height}
                          onChange={(event) =>
                            updateSelectedImage((image) => ({
                              ...image,
                              crop: clampCrop(image, { height: Number(event.target.value) }),
                            }))
                          }
                        />
                      </label>
                    </div>
                  ) : null}
                </ToolbarGroup>
              ) : null}

              {toolbarTab === "view" ? (
                <ToolbarGroup label="Zoom + History">
                  <div className="scrollbar-none flex gap-1.5 overflow-x-auto pb-1">
                    <RibbonButton onClick={handleUndo} disabled={!canUndo}>
                      <Undo2 className="h-4 w-4" />
                      Undo
                    </RibbonButton>
                    <RibbonButton onClick={handleRedo} disabled={!canRedo}>
                      <Redo2 className="h-4 w-4" />
                      Redo
                    </RibbonButton>
                    <RibbonButton
                      onClick={() => {
                        setViewport({ zoom: 1, offsetX: 0, offsetY: 0 });
                        setCanvasResetNonce((current) => current + 1);
                      }}
                    >
                      <RefreshCw className="h-4 w-4" />
                      Reset
                    </RibbonButton>
                    <RibbonButton onClick={() => void toggleFullscreen()}>
                      {fullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                      {fullscreen ? "Exit" : "Full"}
                    </RibbonButton>
                  </div>

                  <div className="mt-2 rounded-[14px] border border-app-border bg-app-card px-2 py-1.5">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleZoomChange(viewport.zoom - 0.1)}
                        className="rounded-full bg-white px-2 py-1 text-[11px] font-semibold text-app-text"
                      >
                        -
                      </button>
                      <input
                        className="min-w-0 flex-1"
                        type="range"
                        min={10}
                        max={200}
                        step={5}
                        value={Math.round(viewport.zoom * 100)}
                        onChange={(event) => handleZoomChange(Number(event.target.value) / 100)}
                      />
                      <div className="min-w-[46px] text-right">
                        <p className="text-[11px] font-semibold text-app-text">{Math.round(viewport.zoom * 100)}%</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleZoomChange(viewport.zoom + 0.1)}
                        className="rounded-full bg-white px-2 py-1 text-[11px] font-semibold text-app-text"
                      >
                        +
                      </button>
                    </div>
                    <div className="mt-1 flex items-center justify-between text-[8px] font-semibold uppercase tracking-[0.08em] text-app-muted">
                      <span>10%</span>
                      <span>Zoom</span>
                      <span>200%</span>
                    </div>
                  </div>

                  <button
                    type="button"
                    className="mt-1.5 w-full rounded-[14px] bg-rose-500/10 px-3 py-1.5 text-[10px] font-semibold text-rose-600"
                    onClick={() => {
                      if (!window.confirm(`Clear everything from ${activePage.name}?`)) {
                        return;
                      }

                      handleCanvasPageChange({
                        ...activePage,
                        images: [],
                        strokes: [],
                        texts: [],
                        updatedAt: new Date().toISOString(),
                      });
                      setSelectedImageId(null);
                    }}
                  >
                    Clear page
                  </button>
                </ToolbarGroup>
              ) : null}
            </div>
          </div>

          <div className={`p-2 ${fullscreen ? "flex min-h-0 flex-1 flex-col p-1.5" : ""}`}>
            <div ref={canvasHostRef} className={fullscreen ? "flex min-h-0 flex-1 flex-col" : ""}>
              <WhitebookCanvas
                page={activePage}
                activeTool={activeTool}
                eraserMode={eraserMode}
                strokeColor={strokeColor}
                strokeSize={strokeSize}
                viewport={viewport}
                resetSignal={canvasResetNonce}
                className={fullscreen ? "h-full min-h-0 flex-1 rounded-[22px]" : ""}
                selectedImageId={selectedImageId}
                onSelectedImageIdChange={setSelectedImageId}
                onViewportChange={setViewport}
                onPageChange={handleCanvasPageChange}
              />
            </div>
          </div>
        </div>
      </section>

      <input
        ref={importInputRef}
        type="file"
        accept="application/json,.json"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (!file) {
            return;
          }

          void handleImportFile(file);
        }}
      />

      <input
        ref={imageInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (!file) {
            return;
          }

          void handleImportImage(file);
        }}
      />

      <WhitebookShareSheet
        shareState={shareState}
        setShareState={setShareState}
        joinedCommunities={joinedCommunities}
        shareUrlFallback={shareUrlFallback}
        onClose={() => setShareState((current) => ({ ...current, open: false }))}
        onSubmit={() => {
          if (!user || !profile) {
            navigate(authRedirectPath);
            return;
          }

          const shareCommunity = joinedCommunities.find((community) => community.id === shareState.communityId) || null;
          if (shareState.destination === "community" && !shareCommunity) {
            toast.error("Choose a community first.");
            return;
          }

          setShareState((current) => ({ ...current, submitting: true }));

          void (async () => {
            const snapshot = buildWhitebookExportPayload(activeNotebook);
            let shareUrl = "";
            let shareSlug: string | null = null;

            try {
              const sharedNotebook = await withTimeout(
                createStudentWhitebookShare({
                  ownerId: user.id,
                  title: activeNotebook.title,
                  snapshot,
                  previewSvg: activeNotebook.coverSvg,
                }),
                20000,
                "WhiteBook live share took too long."
              );

              shareUrl = new URL(
                buildPublicWhitebookPath(sharedNotebook.share_slug, profile.username),
                getWhitebookBaseUrl()
              ).toString();
              shareSlug = sharedNotebook.share_slug;
            } catch {
              const embeddedSnapshot = await withTimeout(
                prepareWhitebookSnapshotForEmbeddedShare(snapshot),
                20000,
                "Preparing WhiteBook images for feed sharing took too long."
              );
              shareUrl = await buildEmbeddedWhitebookUrl(embeddedSnapshot, {
                username: profile.username,
              });
            }

            await withTimeout(
              createPost({
                authorId: user.id,
                visibilityScope: shareState.destination,
                communityId: shareState.destination === "community" ? shareCommunity?.id : undefined,
                discussionKind: mapPlannerShareCategoryToDiscussionKind(shareState.category),
                title: shareState.title.trim() || `WhiteBook: ${activeNotebook.title}`,
                content: shareState.note.trim(),
                tags: ["sys-whitebook-share", shareState.category],
                linkUrl: shareUrl,
                isAnonymous: shareState.category === "anonymous",
              }),
              15000,
              "WhiteBook sharing took too long. Please try again."
            );

            setShareState({
              ...defaultShareState,
              open: false,
            });
            toast.success("WhiteBook shared to feed.");

            if (shareSlug) {
              updateActiveNotebook(
                (current) => ({
                  ...current,
                  lastSharedShareSlug: shareSlug,
                }),
                { recordHistory: false }
              );
              return;
            }

            void createStudentWhitebookShare({
              ownerId: user.id,
              title: activeNotebook.title,
              snapshot,
              previewSvg: activeNotebook.coverSvg,
            })
              .then((sharedNotebook) => {
                updateActiveNotebook(
                  (current) => ({
                    ...current,
                    lastSharedShareSlug: sharedNotebook.share_slug,
                  }),
                  { recordHistory: false }
                );
              })
              .catch(() => {
                return undefined;
              });
          })().catch((error) => {
            toast.error(error instanceof Error ? error.message : "Could not share this WhiteBook.");
            setShareState((current) => ({ ...current, submitting: false }));
          });
        }}
      />
    </div>
  );
}
