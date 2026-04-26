import {
  Barcode,
  Camera,
  Copy,
  Download,
  ExternalLink,
  LayoutDashboard,
  Palette,
  ScanLine,
  Share2,
  Sparkles,
  Trash2,
  Type,
  Wand2,
} from "lucide-react";
import { startTransition, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import { downloadBlobNatively } from "../../lib/nativeDownload";
import { CodeScannerPanel } from "./codes/CodeScannerPanel";
import {
  copyBlob,
  copyText,
  createDraftName,
  DEFAULT_BARCODE_STYLE,
  formatCodeTimestamp,
  normalizeBarcodeValue,
  parseDetectedContent,
  shareBlob,
  svgElementToBlob,
} from "./codes/helpers";
import { deleteStoredDraft, loadStoredBarcodeDrafts, saveStoredDraft } from "./codes/localStore";
import type { BarcodeStyleSettings, StoredBarcodeDraft, ToolStudioTab } from "./codes/types";

const BARCODE_SCAN_FORMATS = [5, 9, 10, 14, 15];

function tabClass(active: boolean) {
  return active
    ? "tab-active inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold"
    : "tab-inactive inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold";
}

function sectionCardClass() {
  return "rounded-[26px] border border-app-border bg-app-card/80 p-4 shadow-[0_20px_50px_-36px_rgba(15,23,42,0.45)]";
}

function mergeBarcodeStyle(candidate: unknown): BarcodeStyleSettings {
  if (!candidate || typeof candidate !== "object") {
    return DEFAULT_BARCODE_STYLE;
  }

  return {
    ...DEFAULT_BARCODE_STYLE,
    ...(candidate as Partial<BarcodeStyleSettings>),
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
    if ((host === "localhost" || host === "127.0.0.1") && parsed.pathname.startsWith("/app")) {
      return parsed.pathname + parsed.search + parsed.hash;
    }
  } catch {
    // Not a valid URL
  }
  return null;
}

function ManageHeader({ icon: Icon, title, copy }: { icon: typeof Barcode; title: string; copy: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="rounded-2xl bg-brand/10 p-3 text-brand">
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <h3 className="font-display text-[1.08rem] font-semibold tracking-tight text-app-text">{title}</h3>
        <p className="text-sm text-app-muted">{copy}</p>
      </div>
    </div>
  );
}

function DraftCard({
  draft,
  onLoad,
  onDelete,
}: {
  draft: StoredBarcodeDraft;
  onLoad: (draft: StoredBarcodeDraft) => void;
  onDelete: (draftId: string) => void;
}) {
  return (
    <article className="rounded-[24px] border border-app-border bg-app-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="inline-flex items-center gap-2 rounded-full bg-app-secondary px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-app-muted">
            <Barcode className="h-3.5 w-3.5" />
            {draft.payload.style.format}
          </div>
          <p className="mt-3 font-display text-lg font-semibold tracking-tight text-app-text">{draft.name}</p>
          <p className="mt-1 text-sm text-app-muted">{formatCodeTimestamp(draft.updatedAt)}</p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <button type="button" className="btn-secondary gap-2 !rounded-full !px-4" onClick={() => onLoad(draft)}>
          <Wand2 className="h-4 w-4" />
          Open
        </button>
        <button type="button" className="btn-secondary gap-2 !rounded-full !px-4" onClick={() => onDelete(draft.id)}>
          <Trash2 className="h-4 w-4" />
          Delete
        </button>
      </div>
    </article>
  );
}

export function BarcodeToolApp({ showTitleBlock = true }: { showTitleBlock?: boolean }) {
  const navigate = useNavigate();
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [activeTab, setActiveTab] = useState<ToolStudioTab>("generate");
  const [title, setTitle] = useState("Inventory Label");
  const [value, setValue] = useState("STUDENT-2026-001");
  const [style, setStyle] = useState<BarcodeStyleSettings>(DEFAULT_BARCODE_STYLE);
  const [renderError, setRenderError] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<StoredBarcodeDraft[]>(() => loadStoredBarcodeDrafts());
  const [scanResult, setScanResult] = useState(() => parseDetectedContent("https://studentsociety.in/tools"));

  const normalized = useMemo(() => normalizeBarcodeValue(style.format, value), [style.format, value]);

  useEffect(() => {
    let disposed = false;

    async function renderBarcode() {
      if (!svgRef.current) {
        return;
      }

      if (!normalized.value || normalized.error) {
        svgRef.current.innerHTML = "";
        setRenderError(normalized.error);
        return;
      }

      try {
        const module = await import("jsbarcode");
        const JsBarcode = (module.default ?? module) as unknown as (
          element: SVGSVGElement,
          text: string,
          options?: Record<string, unknown>
        ) => void;

        if (disposed || !svgRef.current) {
          return;
        }

        svgRef.current.innerHTML = "";
        JsBarcode(svgRef.current, normalized.value, {
          format: style.format === "UPC" ? "UPC" : style.format,
          width: style.width,
          height: style.height,
          displayValue: style.displayValue,
          lineColor: style.lineColor,
          background: style.background,
          margin: style.margin,
          fontSize: style.fontSize,
          textMargin: style.textMargin,
        });
        setRenderError(null);
      } catch (error) {
        console.error("Could not render barcode", error);
        if (!disposed) {
          setRenderError(error instanceof Error ? error.message : "Barcode render failed.");
        }
      }
    }

    void renderBarcode();

    return () => {
      disposed = true;
    };
  }, [normalized.error, normalized.value, style]);

  function refreshDrafts() {
    setDrafts(loadStoredBarcodeDrafts());
  }

  function updateStyle<K extends keyof BarcodeStyleSettings>(key: K, nextValue: BarcodeStyleSettings[K]) {
    setStyle((current) => ({
      ...current,
      [key]: nextValue,
    }));
  }

  function saveCurrentDraft() {
    const now = new Date().toISOString();
    const nextDraft: StoredBarcodeDraft = {
      id: crypto.randomUUID(),
      kind: "barcode",
      name: createDraftName(title, "Untitled barcode draft"),
      createdAt: now,
      updatedAt: now,
      payload: {
        title,
        value,
        style,
      },
    };

    saveStoredDraft(nextDraft);
    refreshDrafts();
    toast.success("Draft saved in Manage");
  }

  function loadDraft(draft: StoredBarcodeDraft) {
    startTransition(() => {
      setTitle(draft.payload.title);
      setValue(draft.payload.value);
      setStyle(mergeBarcodeStyle(draft.payload.style));
      setActiveTab("generate");
    });
  }

  async function exportBarcode(format: "png" | "svg") {
    if (!svgRef.current || normalized.error || !normalized.value) {
      toast.error(normalized.error || "Add valid barcode content first.");
      return null;
    }

    try {
      const blob = await svgElementToBlob(svgRef.current, format, 3);
      const fileName = `${(title.trim() || "barcode").toLowerCase().replace(/\s+/g, "-")}.${format}`;
      await downloadBlobNatively(blob, fileName);
      toast.success("Barcode exported");
      return blob;
    } catch (error) {
      console.error("Could not export barcode", error);
      toast.error("Barcode export failed.");
      return null;
    }
  }

  return (
    <div className="space-y-4">
      <section className="hidden overflow-hidden sm:block glass-card">
        <div className="relative">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(37,99,235,0.22),_transparent_34%),radial-gradient(circle_at_bottom_right,_rgba(249,115,22,0.18),_transparent_36%)]" />
          <div className="relative grid gap-4 px-4 py-5 sm:px-6 lg:grid-cols-[minmax(0,1.15fr)_auto] lg:items-center">
            <div>
              {showTitleBlock ? (
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-app-muted">Barcode Tool</p>
              ) : null}
              <h2 className="mt-1 font-display text-[1.4rem] font-semibold tracking-tight text-app-text sm:text-[1.8rem]">
                Fast barcode generation, customization, scanning, and saved drafts
              </h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-app-muted">
                Build CODE128, EAN-13, and UPC-A labels with responsive previews, export-ready assets, and a camera scanner tuned for retail-style formats.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-2 sm:w-[19rem]">
              <div className="rounded-[22px] border border-app-border bg-app-card/80 p-3 text-center">
                <Barcode className="mx-auto h-5 w-5 text-brand" />
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
            <div className="border-b border-app-border/70 px-4 py-4 sm:px-5">
              <ManageHeader icon={Barcode} title="Live Preview" copy="Adjust format, density, size, and label visibility with instant updates." />
            </div>

            <div className="p-4 sm:p-5">
              <div className="rounded-[32px] border border-app-border bg-[linear-gradient(160deg,_rgba(255,255,255,0.8),_rgba(241,245,249,0.92))] p-4 shadow-[0_24px_80px_-40px_rgba(15,23,42,0.45)] dark:bg-[linear-gradient(160deg,_rgba(15,23,42,0.9),_rgba(2,6,23,0.96))]">
                <div className="inline-flex items-center gap-2 rounded-full bg-app-card/90 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-app-muted">
                  <Barcode className="h-3.5 w-3.5 text-brand" />
                  {style.format}
                </div>
                <h3 className="mt-3 font-display text-2xl font-semibold tracking-tight text-app-text">{title || "Untitled barcode"}</h3>
                <p className="mt-2 text-sm text-app-muted">{normalized.value || "Enter content to generate a barcode."}</p>

                <div className="mt-5 overflow-hidden rounded-[28px] border border-app-border bg-white px-3 py-6 dark:bg-slate-950/70">
                  {renderError ? (
                    <div className="rounded-2xl bg-rose-50 px-3 py-3 text-sm text-rose-700 dark:bg-rose-500/10 dark:text-rose-100">
                      {renderError}
                    </div>
                  ) : null}
                  <svg ref={svgRef} className="mx-auto max-w-full" />
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  <button type="button" className="btn-primary gap-2 !rounded-full !px-4" onClick={() => void exportBarcode("png")}>
                    <Download className="h-4 w-4" />
                    PNG
                  </button>
                  <button type="button" className="btn-secondary gap-2 !rounded-full !px-4" onClick={() => void exportBarcode("svg")}>
                    <Download className="h-4 w-4" />
                    SVG
                  </button>
                  <button
                    type="button"
                    className="btn-secondary gap-2 !rounded-full !px-4"
                    onClick={() => {
                      if (!svgRef.current) {
                        toast.error("Nothing to copy yet.");
                        return;
                      }

                      void svgElementToBlob(svgRef.current, "png", 3)
                        .then((blob) => copyBlob(blob))
                        .then(() => toast.success("Barcode copied"))
                        .catch((error) => {
                          console.error("Could not copy barcode image", error);
                          toast.error("Image copy is not supported here.");
                        });
                    }}
                  >
                    <Copy className="h-4 w-4" />
                    Copy image
                  </button>
                  <button
                    type="button"
                    className="btn-secondary gap-2 !rounded-full !px-4"
                    onClick={() => {
                      if (!svgRef.current) {
                        toast.error("Nothing to share yet.");
                        return;
                      }

                      void svgElementToBlob(svgRef.current, "png", 3)
                        .then((blob) =>
                          shareBlob({
                            blob,
                            fileName: "barcode.png",
                            title: title || "Barcode",
                            text: normalized.value,
                          })
                        )
                        .then(() => toast.success("Share sheet opened"))
                        .catch((error) => {
                          console.error("Could not share barcode", error);
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

          <section className="space-y-4">
            <div className={sectionCardClass()}>
              <ManageHeader icon={Type} title="Content" copy="Switch formats and enter the text or number sequence you want to encode." />

              <div className="mt-4 grid gap-3 md:grid-cols-3">
                {(["CODE128", "EAN13", "UPC"] as const).map((format) => (
                  <button
                    key={format}
                    type="button"
                    className={`flex min-h-[84px] items-center justify-center rounded-[22px] border px-3 py-3 text-center transition ${
                      style.format === format
                        ? "border-brand bg-brand/10 text-brand shadow-[0_16px_40px_-26px_rgba(37,99,235,0.8)]"
                        : "border-app-border bg-app-card text-app-muted hover:border-brand/25 hover:text-app-text"
                    }`}
                    onClick={() => updateStyle("format", format)}
                  >
                    <span className="text-xs font-semibold uppercase tracking-[0.14em]">{format === "EAN13" ? "EAN-13" : format === "UPC" ? "UPC-A" : "CODE128"}</span>
                  </button>
                ))}
              </div>

              <div className="mt-4 grid gap-3">
                <label className="block">
                  <span className="text-xs font-medium text-app-muted">Label</span>
                  <input value={title} onChange={(event) => setTitle(event.target.value)} className="input-field mt-2" />
                </label>

                <label className="block">
                  <span className="text-xs font-medium text-app-muted">
                    {style.format === "CODE128" ? "Text or numbers" : style.format === "EAN13" ? "12 or 13 digits" : "11 or 12 digits"}
                  </span>
                  <input value={value} onChange={(event) => setValue(event.target.value)} className="input-field mt-2" />
                </label>
              </div>

              {normalized.error ? (
                <p className="mt-3 text-sm text-rose-600 dark:text-rose-300">{normalized.error}</p>
              ) : null}
            </div>

            <div className={sectionCardClass()}>
              <ManageHeader icon={Palette} title="Appearance" copy="Tune width, height, label visibility, and colors for print or screen use." />

              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <label className="block">
                  <span className="text-xs font-medium text-app-muted">Bar width</span>
                  <input type="range" min={1} max={4} step={0.1} value={style.width} onChange={(event) => updateStyle("width", Number(event.target.value))} className="mt-2 w-full" />
                  <p className="mt-1 text-xs text-app-muted">{style.width.toFixed(1)}</p>
                </label>
                <label className="block">
                  <span className="text-xs font-medium text-app-muted">Height</span>
                  <input type="range" min={60} max={180} step={2} value={style.height} onChange={(event) => updateStyle("height", Number(event.target.value))} className="mt-2 w-full" />
                  <p className="mt-1 text-xs text-app-muted">{style.height}px</p>
                </label>
                <label className="block">
                  <span className="text-xs font-medium text-app-muted">Line color</span>
                  <input type="color" value={style.lineColor} onChange={(event) => updateStyle("lineColor", event.target.value)} className="mt-2 h-12 w-full rounded-2xl border border-app-border bg-transparent" />
                </label>
                <label className="block">
                  <span className="text-xs font-medium text-app-muted">Background</span>
                  <input type="color" value={style.background} onChange={(event) => updateStyle("background", event.target.value)} className="mt-2 h-12 w-full rounded-2xl border border-app-border bg-transparent" />
                </label>
                <label className="block">
                  <span className="text-xs font-medium text-app-muted">Font size</span>
                  <input type="range" min={12} max={28} step={1} value={style.fontSize} onChange={(event) => updateStyle("fontSize", Number(event.target.value))} className="mt-2 w-full" />
                  <p className="mt-1 text-xs text-app-muted">{style.fontSize}px</p>
                </label>
                <label className="block">
                  <span className="text-xs font-medium text-app-muted">Text gap</span>
                  <input type="range" min={0} max={24} step={1} value={style.textMargin} onChange={(event) => updateStyle("textMargin", Number(event.target.value))} className="mt-2 w-full" />
                  <p className="mt-1 text-xs text-app-muted">{style.textMargin}px</p>
                </label>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition ${
                    style.displayValue ? "bg-brand text-white" : "bg-app-secondary text-app-text"
                  }`}
                  onClick={() => updateStyle("displayValue", !style.displayValue)}
                >
                  <Type className="h-4 w-4" />
                  {style.displayValue ? "Hide text" : "Show text"}
                </button>
                <button type="button" className="btn-secondary gap-2 !rounded-full !px-4" onClick={saveCurrentDraft}>
                  <LayoutDashboard className="h-4 w-4" />
                  Save draft
                </button>
              </div>
            </div>
          </section>
        </div>
      ) : null}

      {activeTab === "scan" ? (
        <div className="space-y-4">
          <CodeScannerPanel
            title="Barcode Scanner"
            hint="Point your camera at a barcode — it will scan and stop automatically."
            formats={BARCODE_SCAN_FORMATS}
            onDetected={(decodedText) => {
              setScanResult(parseDetectedContent(decodedText));
              toast.success("Barcode detected");
            }}
          />

          <section className="glass-card p-4 sm:p-5">
            <ManageHeader icon={ScanLine} title="Decoded Result" copy="URL-like codes get a one-tap open action. Everything else stays copy-ready." />

            <div className="mt-4 rounded-[28px] border border-app-border bg-app-card p-4">
              <div className="inline-flex items-center gap-2 rounded-full bg-app-secondary px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-app-muted">
                <ScanLine className="h-3.5 w-3.5" />
                {scanResult.kind}
              </div>
              <p className="mt-3 break-words font-display text-[1.2rem] font-semibold tracking-tight text-app-text sm:text-[1.4rem]">
                {scanResult.displayValue}
              </p>

              <div className="mt-4 flex flex-wrap gap-2">
                {scanResult.actionHref ? (() => {
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
                      {scanResult.actionLabel || "Open"}
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
        <section className="glass-card p-4 sm:p-5">
          <ManageHeader icon={LayoutDashboard} title="Saved Barcode Drafts" copy="Keep reusable label presets on this device and reopen them anytime." />

          {drafts.length === 0 ? (
            <div className="mt-4 rounded-[24px] border border-app-border bg-app-card p-5">
              <p className="font-display text-xl font-semibold tracking-tight text-app-text">No drafts yet</p>
              <p className="mt-2 text-sm text-app-muted">Save a barcode from the Generate tab to build your own reusable label library.</p>
            </div>
          ) : (
            <div className="mt-4 grid gap-3 lg:grid-cols-2">
              {drafts.map((draft) => (
                <DraftCard
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
      ) : null}
    </div>
  );
}
