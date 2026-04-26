import {
  Camera,
  ChevronDown,
  Copy,
  Download,
  ExternalLink,
  LayoutDashboard,
  Loader2,
  Lock,
  QrCode,
  ScanLine,
  Share2,
  Sparkles,
} from "lucide-react";
import QRCodeStyling from "qr-code-styling";
import { startTransition, useEffect, useMemo, useRef, useState } from "react";
import { useDropzone } from "react-dropzone";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import { downloadBlobNatively } from "../../lib/nativeDownload";
import { buildAuthRedirectPath } from "../../lib/authRedirect";
import { isSupabaseConfigured } from "../../lib/supabase";
import { useAuthStore } from "../../store/authStore";
import type { QrCodeRow } from "../../types/database";
import { CodeScannerPanel } from "./codes/CodeScannerPanel";
import {
  createDraftName,
  createQrCodeInstance,
  createShortUrl,
  DEFAULT_QR_STYLE,
  exportElementToBlob,
  fileToDataUrl,
  buildQrCodeOptions,
  normalizeQrValue,
  parseDetectedContent,
  shareBlob,
  toQrBlob,
  unwrapStoredQrValue,
  copyBlob,
  copyText,
} from "./codes/helpers";
import { deleteStoredDraft, loadStoredQrDrafts, saveStoredDraft } from "./codes/localStore";
import { createDynamicQrCode, deleteDynamicQrCode, listDynamicQrCodes, updateDynamicQrCode } from "./codes/api";
import { QrPreviewCard } from "./codes/QrPreviewCard";
import { QrStudioSidebar } from "./codes/QrStudioSidebar";
import { QrDraftCard } from "./codes/QrDraftCard";
import { QrDynamicCard } from "./codes/QrDynamicCard";
import { ManageHeader } from "./codes/qrStudioShared";
import { tabClass } from "./codes/qrStudioTokens";
import type { QrContentType, QrFrameStyle, QrStyleSettings, StoredQrDraft, ToolStudioTab } from "./codes/types";

const QR_SCAN_FORMATS = [0];

function mergeQrStyle(candidate: unknown): QrStyleSettings {
  if (!candidate || typeof candidate !== "object") {
    return DEFAULT_QR_STYLE;
  }

  const value = candidate as Partial<QrStyleSettings>;

  return {
    ...DEFAULT_QR_STYLE,
    ...value,
    gradient: {
      ...DEFAULT_QR_STYLE.gradient,
      ...(value.gradient || {}),
    },
    backgroundGradient: {
      ...DEFAULT_QR_STYLE.backgroundGradient,
      ...(value.backgroundGradient || {}),
    },
  };
}

/** Check if a URL belongs to Student Society and return the internal path if so. */
function getInternalPath(url: string): string | null {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.toLowerCase();
    if (host === "studentsociety.in" || host === "www.studentsociety.in" || host.endsWith(".studentsociety.in")) {
      return parsed.pathname + parsed.search + parsed.hash;
    }
    // Also handle localhost for development
    if ((host === "localhost" || host === "127.0.0.1") && parsed.pathname.startsWith("/app")) {
      return parsed.pathname + parsed.search + parsed.hash;
    }
  } catch {
    // Not a valid URL
  }
  return null;
}

export function QrCodeToolApp({ showTitleBlock = true }: { showTitleBlock?: boolean }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, loading } = useAuthStore();
  const authHref = buildAuthRedirectPath(location);
  const previewCardRef = useRef<HTMLDivElement | null>(null);
  const previewRef = useRef<HTMLDivElement | null>(null);
  const qrRef = useRef<QRCodeStyling | null>(null);

  const [activeTab, setActiveTab] = useState<ToolStudioTab>("generate");
  const [contentType, setContentType] = useState<QrContentType>("url");
  const [value, setValue] = useState("StudentSociety.in");
  const [title, setTitle] = useState("Student Society");
  const [style, setStyle] = useState<QrStyleSettings>(DEFAULT_QR_STYLE);
  const [isDynamic, setIsDynamic] = useState(false);
  const [dynamicCode, setDynamicCode] = useState<QrCodeRow | null>(null);
  const [dynamicCodes, setDynamicCodes] = useState<QrCodeRow[]>([]);
  const [dynamicLoading, setDynamicLoading] = useState(false);
  const [dynamicBusy, setDynamicBusy] = useState(false);
  const [mobileDownloadMenuOpen, setMobileDownloadMenuOpen] = useState(false);
  const [scanResult, setScanResult] = useState(() => parseDetectedContent("https://studentsociety.in"));
  const [drafts, setDrafts] = useState<StoredQrDraft[]>(() => loadStoredQrDrafts());

  const normalized = useMemo(() => normalizeQrValue(contentType, value), [contentType, value]);
  const encodedValue = dynamicCode && isDynamic ? createShortUrl(dynamicCode.short_code) : normalized.value?.encodedValue || " ";
  const canUseDynamic = isSupabaseConfigured && Boolean(user);
  const shortUrl = dynamicCode ? createShortUrl(dynamicCode.short_code) : null;

  useEffect(() => {
    if (!previewRef.current) {
      return;
    }

    if (!qrRef.current) {
      qrRef.current = createQrCodeInstance(encodedValue, style);
      previewRef.current.innerHTML = "";
      qrRef.current.append(previewRef.current);
      return;
    }

    qrRef.current.update(buildQrCodeOptions(encodedValue, style));

    if (!previewRef.current.firstChild) {
      qrRef.current.append(previewRef.current);
    }
  }, [encodedValue, style]);

  useEffect(() => {
    if (!isSupabaseConfigured || !user) {
      setDynamicCodes([]);
      return;
    }

    setDynamicLoading(true);
    void listDynamicQrCodes(user.id)
      .then((items) => setDynamicCodes(items))
      .catch((error) => {
        console.error("Could not load dynamic QR codes", error);
        toast.error("Could not load your dynamic QR dashboard.");
      })
      .finally(() => setDynamicLoading(false));
  }, [user]);

  function refreshDrafts() {
    setDrafts(loadStoredQrDrafts());
  }

  function updateStyle<K extends keyof QrStyleSettings>(key: K, nextValue: QrStyleSettings[K]) {
    setStyle((current) => ({
      ...current,
      [key]: nextValue,
    }));
  }

  function resetStyle() {
    setStyle(DEFAULT_QR_STYLE);
    toast.success("QR style reset");
  }

  function applyFramePreset(nextFrameStyle: QrFrameStyle) {
    setStyle((current) => {
      const hasCustomLabel = current.labelText.trim() && current.labelText.trim() !== DEFAULT_QR_STYLE.labelText;
      const hasCustomCaption = current.captionText.trim() && current.captionText.trim() !== DEFAULT_QR_STYLE.captionText;
      const scanLabelText = hasCustomLabel ? current.labelText : "Scan Me";
      const scanCaptionText = hasCustomCaption ? current.captionText : "Scan to open";

      if (nextFrameStyle === "scan-band") {
        return {
          ...current,
          frameStyle: nextFrameStyle,
          frameColor: "#020617",
          frameAccentColor: "#020617",
          framePadding: 16,
          frameRadius: 30,
          labelEnabled: true,
          labelText: scanLabelText,
          labelBackgroundColor: "#020617",
          labelColor: "#ffffff",
          captionEnabled: true,
          captionText: scanCaptionText,
          captionColor: "#ffffff",
        };
      }

      if (nextFrameStyle === "scan-card") {
        return {
          ...current,
          frameStyle: nextFrameStyle,
          frameColor: "#020617",
          frameAccentColor: "#111827",
          framePadding: 18,
          frameRadius: 32,
          labelEnabled: true,
          labelText: scanLabelText,
          labelBackgroundColor: "#020617",
          labelColor: "#ffffff",
          captionEnabled: true,
          captionText: scanCaptionText,
          captionColor: "#ffffff",
        };
      }

      if (nextFrameStyle === "mono-card") {
        return {
          ...current,
          frameStyle: nextFrameStyle,
          frameColor: "#020617",
          frameAccentColor: "#020617",
          framePadding: 16,
          frameRadius: 30,
          foregroundColor: "#000000",
          backgroundColor: "#ffffff",
          gradient: {
            ...current.gradient,
            enabled: false,
            start: "#000000",
            end: "#000000",
          },
          backgroundGradient: {
            ...current.backgroundGradient,
            enabled: false,
            start: "#ffffff",
            end: "#ffffff",
          },
          dotStyle: "square",
          cornerSquareStyle: "square",
          cornerDotStyle: "square",
          labelEnabled: false,
          captionEnabled: false,
          labelBackgroundColor: "#020617",
          labelColor: "#ffffff",
          captionColor: "#020617",
        };
      }

      if (nextFrameStyle === "gradient") {
        return {
          ...current,
          frameStyle: nextFrameStyle,
          frameColor: DEFAULT_QR_STYLE.frameColor,
          frameAccentColor: DEFAULT_QR_STYLE.frameAccentColor,
          framePadding: DEFAULT_QR_STYLE.framePadding,
          frameRadius: DEFAULT_QR_STYLE.frameRadius,
        };
      }

      if (nextFrameStyle === "glass") {
        return {
          ...current,
          frameStyle: nextFrameStyle,
          frameColor: "#0f172a",
          frameAccentColor: "#38bdf8",
          framePadding: 14,
          frameRadius: 30,
        };
      }

      if (nextFrameStyle === "outline") {
        return {
          ...current,
          frameStyle: nextFrameStyle,
          frameColor: "#020617",
          frameAccentColor: "#0f172a",
          framePadding: 12,
          frameRadius: 28,
        };
      }

      return {
        ...current,
        frameStyle: nextFrameStyle,
        framePadding: 0,
      };
    });
  }

  function updateQrSize(nextSize: number) {
    setStyle((current) => ({
      ...current,
      width: nextSize,
      height: nextSize,
    }));
  }

  function setForegroundColor(nextColor: string) {
    setStyle((current) => ({
      ...current,
      foregroundColor: nextColor,
      gradient: {
        ...current.gradient,
        enabled: false,
      },
    }));
  }

  function setBackgroundColor(nextColor: string) {
    setStyle((current) => ({
      ...current,
      backgroundColor: nextColor,
      backgroundGradient: {
        ...current.backgroundGradient,
        enabled: false,
      },
    }));
  }

  function updateGradient<K extends keyof QrStyleSettings["gradient"]>(
    key: K,
    nextValue: QrStyleSettings["gradient"][K]
  ) {
    setStyle((current) => {
      const nextGradient = {
        ...current.gradient,
        [key]: nextValue,
      } as QrStyleSettings["gradient"];

      if (key !== "enabled") {
        nextGradient.enabled = true;
      }

      return {
        ...current,
        gradient: nextGradient,
      };
    });
  }

  function updateBackgroundGradient<K extends keyof QrStyleSettings["backgroundGradient"]>(
    key: K,
    nextValue: QrStyleSettings["backgroundGradient"][K]
  ) {
    setStyle((current) => {
      const nextGradient = {
        ...current.backgroundGradient,
        [key]: nextValue,
      } as QrStyleSettings["backgroundGradient"];

      if (key !== "enabled") {
        nextGradient.enabled = true;
      }

      return {
        ...current,
        backgroundGradient: nextGradient,
      };
    });
  }

  async function createPreviewBlob(format: "png" | "jpeg", scale = 3) {
    if (previewCardRef.current) {
      return exportElementToBlob(previewCardRef.current, format, scale);
    }

    const fallbackInstance = createQrCodeInstance(encodedValue, style, scale);
    return toQrBlob(fallbackInstance, format);
  }

  async function exportQr(extension: "png" | "jpeg" | "svg", scale = 3) {
    if (!encodedValue.trim()) {
      toast.error("Add some content before exporting.");
      return null;
    }

    try {
      const blob =
        extension === "svg"
          ? await toQrBlob(createQrCodeInstance(encodedValue, style, scale), extension)
          : await createPreviewBlob(extension, scale);
      const fileSuffix = extension === "jpeg" ? "jpg" : extension;
      const fileName = `${(title.trim() || "qr-code").toLowerCase().replace(/\s+/g, "-")}.${fileSuffix}`;
      await downloadBlobNatively(blob, fileName);
      toast.success("QR exported");
      return blob;
    } catch (error) {
      console.error("Could not export QR code", error);
      toast.error("QR export failed.");
      return null;
    }
  }

  function handleExportClick(extension: "png" | "jpeg" | "svg", scale = 3) {
    setMobileDownloadMenuOpen(false);
    void exportQr(extension, scale);
  }

  async function createOrUpdateDynamic() {
    if (!normalized.value) {
      toast.error(normalized.error || "Add valid content first.");
      return;
    }

    if (!user || !isSupabaseConfigured) {
      toast.error("Sign in with Supabase enabled to create dynamic QR codes.");
      return;
    }

    setDynamicBusy(true);

    try {
      if (dynamicCode) {
        const updated = await updateDynamicQrCode({
          id: dynamicCode.id,
          title: title.trim() || "Untitled dynamic QR",
          type: contentType,
          targetUrl: normalized.value.storedValue,
          settings: {
            style,
          },
        });

        setDynamicCode(updated);
        setDynamicCodes((current) => current.map((entry) => (entry.id === updated.id ? updated : entry)));
        toast.success("Dynamic QR updated");
        return;
      }

      const created = await createDynamicQrCode({
        ownerId: user.id,
        title: title.trim() || "Untitled dynamic QR",
        type: contentType,
        targetUrl: normalized.value.storedValue,
        settings: {
          style,
        },
      });

      setDynamicCode(created);
      setDynamicCodes((current) => [created, ...current]);
      setIsDynamic(true);
      toast.success("Dynamic QR created");
    } catch (error) {
      console.error("Could not save dynamic QR", error);
      toast.error("Dynamic QR save failed.");
    } finally {
      setDynamicBusy(false);
    }
  }

  async function handleDeleteDynamic(id: string) {
    try {
      await deleteDynamicQrCode(id);
      setDynamicCodes((current) => current.filter((entry) => entry.id !== id));
      setDynamicCode((current) => (current?.id === id ? null : current));
      toast.success("Dynamic QR deleted");
    } catch (error) {
      console.error("Could not delete dynamic QR", error);
      toast.error("Delete failed.");
    }
  }

  function loadDynamicIntoStudio(qrCode: QrCodeRow) {
    const nextSettings =
      qrCode.settings &&
      typeof qrCode.settings === "object" &&
      "style" in qrCode.settings
        ? mergeQrStyle((qrCode.settings as Record<string, unknown>).style)
        : DEFAULT_QR_STYLE;

    startTransition(() => {
      setDynamicCode(qrCode);
      setIsDynamic(true);
      setTitle(qrCode.title);
      setContentType(qrCode.type);
      setValue(unwrapStoredQrValue(qrCode.type, qrCode.target_url));
      setStyle(nextSettings);
      setActiveTab("generate");
    });
  }

  function saveCurrentDraft() {
    const now = new Date().toISOString();
    const nextDraft: StoredQrDraft = {
      id: crypto.randomUUID(),
      kind: "qr",
      name: createDraftName(title, "Untitled QR draft"),
      createdAt: now,
      updatedAt: now,
      payload: {
        title,
        contentType,
        value,
        dynamic: isDynamic,
        shortCode: dynamicCode?.short_code || null,
        style,
      },
    };

    saveStoredDraft(nextDraft);
    refreshDrafts();
    toast.success("Draft saved in Manage");
  }

  function loadDraft(draft: StoredQrDraft) {
    startTransition(() => {
      setTitle(draft.payload.title);
      setContentType(draft.payload.contentType);
      setValue(draft.payload.value);
      setIsDynamic(draft.payload.dynamic);
      setDynamicCode((current) =>
        current && draft.payload.shortCode && current.short_code === draft.payload.shortCode ? current : null
      );
      setStyle(mergeQrStyle(draft.payload.style));
      setActiveTab("generate");
    });
  }

  const logoDropzone = useDropzone({
    accept: {
      "image/*": [".png", ".jpg", ".jpeg", ".webp", ".svg", ".avif"],
    },
    multiple: false,
    onDropAccepted: (files) => {
      const [file] = files;

      if (!file) {
        return;
      }

      void fileToDataUrl(file)
        .then((dataUrl) => {
          updateStyle("logoDataUrl", dataUrl);
          toast.success("Logo added");
        })
        .catch((error) => {
          console.error("Could not read logo", error);
          toast.error("That logo could not be read.");
        });
    },
  });

  return (
    <div className="space-y-4">
      <section className="hidden overflow-hidden sm:block glass-card">
        <div className="relative">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(37,99,235,0.25),_transparent_34%),radial-gradient(circle_at_bottom_right,_rgba(13,148,136,0.24),_transparent_36%)]" />
          <div className="relative grid gap-4 px-4 py-5 sm:px-6 lg:grid-cols-[minmax(0,1.15fr)_auto] lg:items-center">
            <div>
              {showTitleBlock ? (
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-app-muted">QR Code Tool</p>
              ) : null}
              <h2 className="mt-1 font-display text-[1.4rem] font-semibold tracking-tight text-app-text sm:text-[1.8rem]">
                Styled QR creation, live scanning, and editable short links
              </h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-app-muted">
                Build polished QR codes with gradients, logos, and export controls. Dynamic links stay editable later, and the scanner understands URLs, text, email, and phone actions.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-2 sm:w-[19rem]">
              <div className="rounded-[22px] border border-app-border bg-app-card/80 p-3 text-center">
                <QrCode className="mx-auto h-5 w-5 text-brand" />
                <p className="mt-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-app-muted">Generate</p>
              </div>
              <div className="rounded-[22px] border border-app-border bg-app-card/80 p-3 text-center">
                <Camera className="mx-auto h-5 w-5 text-brand" />
                <p className="mt-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-app-muted">Scan</p>
              </div>
              <div className="rounded-[22px] border border-app-border bg-app-card/80 p-3 text-center">
                <LayoutDashboard className="mx-auto h-5 w-5 text-brand" />
                <p className="mt-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-app-muted">Manage</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-3 gap-2">
        <button type="button" className={tabClass(activeTab === "generate")} onClick={() => setActiveTab("generate")}>
          <Sparkles className="h-4 w-4" />
          <span className="truncate">Generate</span>
        </button>
        <button type="button" className={tabClass(activeTab === "scan")} onClick={() => setActiveTab("scan")}>
          <Camera className="h-4 w-4" />
          <span className="truncate">Scan</span>
        </button>
        <button type="button" className={tabClass(activeTab === "manage")} onClick={() => setActiveTab("manage")}>
          <LayoutDashboard className="h-4 w-4" />
          <span className="truncate">Manage</span>
        </button>
      </section>

      {activeTab === "generate" ? (
        <div className="grid gap-4 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
          <section className="glass-card overflow-hidden">
            <div className="border-b border-app-border/70 px-3 py-3.5 sm:px-4">
              <ManageHeader icon={QrCode} title="Live Preview" copy="Your QR updates instantly while you design." />
            </div>

            <div className="p-3 sm:p-4">
              <div className="rounded-[28px] border border-app-border bg-[linear-gradient(160deg,_rgba(15,23,42,0.03),_rgba(37,99,235,0.08),_rgba(13,148,136,0.08))] p-3 sm:p-4">
              <div className="grid min-w-0 gap-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-start">
                  <div>
                    <div className="inline-flex items-center gap-2 rounded-full bg-app-card/90 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-app-muted">
                      {isDynamic && dynamicCode ? <Lock className="h-3.5 w-3.5 text-brand" /> : <Sparkles className="h-3.5 w-3.5 text-brand" />}
                      {isDynamic && dynamicCode ? `Dynamic /qr/${dynamicCode.short_code}` : "Static Preview"}
                    </div>
                    <h3 className="mt-2 font-display text-[1.35rem] font-semibold tracking-tight text-app-text">
                      {title || "Student Society"}
                    </h3>
                    <p className="mt-1.5 text-xs leading-5 text-app-muted">
                      {shortUrl ? shortUrl : normalized.value?.displayValue || "Add content on the right to generate your QR."}
                    </p>
                  </div>

                  <QrPreviewCard
                    previewCardRef={previewCardRef}
                    qrMountRef={previewRef}
                    error={normalized.error}
                    style={style}
                  />
                </div>

                <div className="mt-4 space-y-2 sm:hidden">
                  <button
                    type="button"
                    className="btn-primary flex w-full items-center justify-center gap-2 !rounded-full !px-4"
                    onClick={() => setMobileDownloadMenuOpen((current) => !current)}
                    aria-expanded={mobileDownloadMenuOpen}
                    aria-controls="qr-mobile-download-options"
                  >
                    <Download className="h-4 w-4" />
                    Download
                    <ChevronDown className={`h-4 w-4 transition ${mobileDownloadMenuOpen ? "rotate-180" : ""}`} />
                  </button>

                  {mobileDownloadMenuOpen ? (
                    <div
                      id="qr-mobile-download-options"
                      className="rounded-[22px] border border-app-border bg-white/80 p-2 shadow-[0_20px_50px_-40px_rgba(15,23,42,0.35)]"
                    >
                      <div className="grid gap-2 sm:grid-cols-3">
                        <button type="button" className="btn-secondary justify-center gap-2 !rounded-full !px-4" onClick={() => handleExportClick("png", 3)}>
                          <Download className="h-4 w-4" />
                          PNG
                        </button>
                        <button type="button" className="btn-secondary justify-center gap-2 !rounded-full !px-4" onClick={() => handleExportClick("svg", 1)}>
                          <Download className="h-4 w-4" />
                          SVG
                        </button>
                        <button type="button" className="btn-secondary justify-center gap-2 !rounded-full !px-4" onClick={() => handleExportClick("jpeg", 3)}>
                          <Download className="h-4 w-4" />
                          JPG
                        </button>
                      </div>
                    </div>
                  ) : null}
                </div>

                <div className="mt-4 hidden gap-2 sm:grid sm:grid-cols-2 xl:grid-cols-4">
                  <button type="button" className="btn-primary gap-2 !rounded-full !px-4" onClick={() => void exportQr("png", 3)}>
                    <Download className="h-4 w-4" />
                    PNG
                  </button>
                  <button type="button" className="btn-secondary gap-2 !rounded-full !px-4" onClick={() => void exportQr("svg", 1)}>
                    <Download className="h-4 w-4" />
                    SVG
                  </button>
                  <button type="button" className="btn-secondary gap-2 !rounded-full !px-4" onClick={() => void exportQr("jpeg", 3)}>
                    <Download className="h-4 w-4" />
                    JPG
                  </button>
                  <button
                    type="button"
                    className="btn-secondary gap-2 !rounded-full !px-4"
                    onClick={() => {
                      void createPreviewBlob("png", 3)
                        .then((blob) => copyBlob(blob))
                        .then(() => toast.success("QR image copied"))
                        .catch((error) => {
                          console.error("Could not copy QR image", error);
                          toast.error("Image copy is not supported here.");
                        });
                    }}
                  >
                    <Copy className="h-4 w-4" />
                    Copy image
                  </button>
                </div>

                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                  <button
                    type="button"
                    className="btn-secondary gap-2 !rounded-full !px-4"
                    onClick={() => {
                      const text = shortUrl || normalized.value?.displayValue;

                      if (!text) {
                        toast.error("Nothing to copy yet.");
                        return;
                      }

                      void copyText(text)
                        .then(() => toast.success("Content copied"))
                        .catch((error) => {
                          console.error("Could not copy QR text", error);
                          toast.error("Clipboard copy failed.");
                        });
                    }}
                  >
                    <Copy className="h-4 w-4" />
                    Copy content
                  </button>
                  <button
                    type="button"
                    className="btn-secondary gap-2 !rounded-full !px-4"
                    onClick={() => {
                      void createPreviewBlob("png", 3)
                        .then((blob) =>
                          shareBlob({
                            blob,
                            fileName: "qr-code.png",
                            title: title || "QR code",
                            text: shortUrl || normalized.value?.displayValue,
                          })
                        )
                        .then(() => toast.success("Share sheet opened"))
                        .catch((error) => {
                          console.error("Could not share QR code", error);
                          toast.error("Sharing is not available on this device.");
                        });
                    }}
                  >
                    <Share2 className="h-4 w-4" />
                    Share
                  </button>
                </div>
              </div>
            </div>
          </section>

          <QrStudioSidebar
            authHref={authHref}
            canUseDynamic={canUseDynamic}
            contentType={contentType}
            dynamicBusy={dynamicBusy}
            dynamicCode={dynamicCode}
            isDynamic={isDynamic}
            isSupabaseConfigured={isSupabaseConfigured}
            logoDropzone={logoDropzone}
            normalizedError={normalized.error}
            normalizedHasValue={Boolean(normalized.value)}
            onApplyFramePreset={applyFramePreset}
            onCreateOrUpdateDynamic={() => void createOrUpdateDynamic()}
            onResetStyle={resetStyle}
            onSaveCurrentDraft={saveCurrentDraft}
            onSetBackgroundColor={setBackgroundColor}
            onSetForegroundColor={setForegroundColor}
            onToggleDynamic={() => setIsDynamic((current) => !current)}
            onUpdateBackgroundGradient={updateBackgroundGradient}
            onUpdateGradient={updateGradient}
            onUpdateQrSize={updateQrSize}
            onUpdateStyle={updateStyle}
            shortUrl={shortUrl}
            style={style}
            title={title}
            value={value}
            setContentType={setContentType}
            setTitle={setTitle}
            setValue={setValue}
          />
        </div>
      ) : null}

      {activeTab === "scan" ? (
        <div className="space-y-4">
          <CodeScannerPanel
            title="QR Scanner"
            hint="Point your camera at a QR code — it will scan and stop automatically."
            formats={QR_SCAN_FORMATS}
            onDetected={(decodedText) => {
              setScanResult(parseDetectedContent(decodedText));
              toast.success("QR detected");
            }}
          />

          <section className="glass-card p-4 sm:p-5">
            <ManageHeader icon={Camera} title="Decoded Result" copy="Actions adapt automatically for links, text, email, and phone codes." />

            <div className="mt-4 rounded-[28px] border border-app-border bg-app-card p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="inline-flex items-center gap-2 rounded-full bg-app-secondary px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-app-muted">
                    <ScanLine className="h-3.5 w-3.5" />
                    {scanResult.kind}
                  </div>
                  <p className="mt-3 max-w-3xl break-words font-display text-[1.2rem] font-semibold tracking-tight text-app-text sm:text-[1.4rem]">
                    {scanResult.displayValue}
                  </p>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                {scanResult.actionHref && scanResult.actionLabel ? (() => {
                  const internalPath = scanResult.kind === "url" ? getInternalPath(scanResult.actionHref) : null;
                  if (internalPath) {
                    return (
                      <button
                        type="button"
                        className="btn-primary gap-2 !rounded-full !px-4"
                        onClick={() => navigate(internalPath)}
                      >
                        <ExternalLink className="h-4 w-4" />
                        Open in App
                      </button>
                    );
                  }
                  return (
                    <a href={scanResult.actionHref} target={scanResult.kind === "url" ? "_blank" : undefined} rel="noreferrer" className="btn-primary gap-2 !rounded-full !px-4">
                      <ExternalLink className="h-4 w-4" />
                      {scanResult.actionLabel}
                    </a>
                  );
                })() : null}
                <button
                  type="button"
                  className="btn-secondary gap-2 !rounded-full !px-4"
                  onClick={() => void copyText(scanResult.raw).then(() => toast.success("Scanned content copied"))}
                >
                  <Copy className="h-4 w-4" />
                  Copy
                </button>
              </div>
            </div>
          </section>
        </div>
      ) : null}

      {activeTab === "manage" ? (
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
          <section className="glass-card p-4 sm:p-5">
            <ManageHeader icon={LayoutDashboard} title="Dynamic QR Dashboard" copy="Edit future destinations, copy short links, check scan counts, and remove old codes." />

            {!isSupabaseConfigured ? (
              <div className="mt-4 rounded-[24px] border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-100">
                Configure Supabase env keys first to enable the dynamic QR lifecycle.
              </div>
            ) : loading ? (
              <div className="mt-4 flex items-center gap-3 rounded-[24px] border border-app-border bg-app-card p-4 text-sm text-app-muted">
                <Loader2 className="h-4 w-4 animate-spin" />
                Checking your session...
              </div>
            ) : !user ? (
              <div className="mt-4 rounded-[24px] border border-app-border bg-app-card p-5">
                <p className="font-display text-xl font-semibold tracking-tight text-app-text">Login required</p>
                <p className="mt-2 text-sm leading-6 text-app-muted">
                  Dynamic QR links are tied to your account so you can edit URLs, phone numbers, and email targets in the future.
                </p>
                <Link to={authHref} className="btn-primary mt-4 gap-2 !rounded-full !px-4">
                  <Lock className="h-4 w-4" />
                  Sign in
                </Link>
              </div>
            ) : dynamicLoading ? (
              <div className="mt-4 flex items-center gap-3 rounded-[24px] border border-app-border bg-app-card p-4 text-sm text-app-muted">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading dynamic QR links...
              </div>
            ) : dynamicCodes.length === 0 ? (
              <div className="mt-4 rounded-[24px] border border-app-border bg-app-card p-5">
                <p className="font-display text-xl font-semibold tracking-tight text-app-text">No dynamic QR codes yet</p>
                <p className="mt-2 text-sm text-app-muted">Create one from the Generate tab to get an editable short URL.</p>
              </div>
            ) : (
              <div className="mt-4 space-y-3">
                {dynamicCodes.map((qrCode) => (
                  <QrDynamicCard
                    key={qrCode.id}
                    qrCode={qrCode}
                    onSave={async ({ id, title: nextTitle, type, targetUrl }) => {
                      const current = dynamicCodes.find((entry) => entry.id === id);

                      if (!current) {
                        return;
                      }

                      const updated = await updateDynamicQrCode({
                        id,
                        title: nextTitle,
                        type,
                        targetUrl,
                        settings: current.settings,
                      });

                      setDynamicCodes((entries) => entries.map((entry) => (entry.id === updated.id ? updated : entry)));
                      setDynamicCode((active) => (active?.id === updated.id ? updated : active));
                      toast.success("Dynamic QR updated");
                    }}
                    onDelete={handleDeleteDynamic}
                    onOpenStudio={loadDynamicIntoStudio}
                  />
                ))}
              </div>
            )}
          </section>

          <section className="glass-card p-4 sm:p-5">
            <ManageHeader icon={Sparkles} title="Saved Drafts" copy="Keep polished QR looks locally and reopen them anytime." />

            {drafts.length === 0 ? (
              <div className="mt-4 rounded-[24px] border border-app-border bg-app-card p-5">
                <p className="font-display text-xl font-semibold tracking-tight text-app-text">No saved drafts yet</p>
                <p className="mt-2 text-sm text-app-muted">Use “Save draft” in the generator to keep your current design locally on this device.</p>
              </div>
            ) : (
              <div className="mt-4 space-y-3">
                {drafts.map((draft) => (
                  <QrDraftCard
                    key={draft.id}
                    draft={draft}
                    onLoad={loadDraft}
                    onDelete={(draftId) => {
                      deleteStoredDraft(draftId);
                      refreshDrafts();
                      toast.success("Draft deleted");
                    }}
                  />
                ))}
              </div>
            )}
          </section>
        </div>
      ) : null}
    </div>
  );
}
