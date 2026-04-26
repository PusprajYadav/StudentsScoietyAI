import {
  Copy,
  ImagePlus,
  LayoutTemplate,
  Link2,
  Lock,
  Mail,
  Palette,
  Phone,
  Sparkles,
  SwatchBook,
  Tag,
  Type,
} from "lucide-react";
import { useMemo, useState } from "react";
import type { DropzoneState } from "react-dropzone";
import { toast } from "react-hot-toast";
import { Link } from "react-router-dom";
import type { QrCodeRow } from "../../../types/database";
import { copyText } from "./helpers";
import {
  COMPACT_COLOR_CLASS,
  COMPACT_INPUT_CLASS,
  COMPACT_SELECT_CLASS,
  sectionCardClass,
  studioSectionTabClass,
} from "./qrStudioTokens";
import {
  ContentTypeButton,
  ManageHeader,
  StyleChoice,
} from "./qrStudioShared";
import type { QrContentType, QrFrameStyle, QrStyleSettings, QrStudioSection } from "./types";

interface QrStudioSidebarProps {
  authHref: string;
  canUseDynamic: boolean;
  contentType: QrContentType;
  dynamicBusy: boolean;
  dynamicCode: QrCodeRow | null;
  isDynamic: boolean;
  isSupabaseConfigured: boolean;
  logoDropzone: DropzoneState;
  normalizedError: string | null;
  normalizedHasValue: boolean;
  onApplyFramePreset: (nextFrameStyle: QrFrameStyle) => void;
  onCreateOrUpdateDynamic: () => void;
  onResetStyle: () => void;
  onSaveCurrentDraft: () => void;
  onSetBackgroundColor: (nextColor: string) => void;
  onSetForegroundColor: (nextColor: string) => void;
  onToggleDynamic: () => void;
  onUpdateBackgroundGradient: <K extends keyof QrStyleSettings["backgroundGradient"]>(
    key: K,
    nextValue: QrStyleSettings["backgroundGradient"][K]
  ) => void;
  onUpdateGradient: <K extends keyof QrStyleSettings["gradient"]>(
    key: K,
    nextValue: QrStyleSettings["gradient"][K]
  ) => void;
  onUpdateQrSize: (nextSize: number) => void;
  onUpdateStyle: <K extends keyof QrStyleSettings>(key: K, nextValue: QrStyleSettings[K]) => void;
  shortUrl: string | null;
  style: QrStyleSettings;
  title: string;
  value: string;
  setContentType: (nextType: QrContentType) => void;
  setTitle: (nextTitle: string) => void;
  setValue: (nextValue: string) => void;
}

const SECTION_META: Record<
  QrStudioSection,
  {
    title: string;
    copy: string;
    icon: typeof Link2;
    label: string;
  }
> = {
  data: {
    title: "Data",
    copy: "Switch between links, text, email, and phone targets.",
    icon: Link2,
    label: "Data",
  },
  style: {
    title: "Style",
    copy: "Tune dot shape, corners, colors, and gradients.",
    icon: Palette,
    label: "Style",
  },
  frame: {
    title: "Frame",
    copy: "Choose a polished shell, including black scan card presets.",
    icon: LayoutTemplate,
    label: "Frame",
  },
  label: {
    title: "Label",
    copy: "Control the top badge and scan caption text.",
    icon: Tag,
    label: "Label",
  },
  layout: {
    title: "Layout",
    copy: "Adjust size, margins, logo placement, and save drafts.",
    icon: ImagePlus,
    label: "Layout",
  },
};

function sectionPreviewDots(kind: QrStyleSettings["dotStyle"]) {
  if (kind === "rounded") {
    return (
      <div className="grid grid-cols-3 gap-1">
        {Array.from({ length: 9 }).map((_, index) => (
          <div key={index} className="h-2.5 w-2.5 rounded-full bg-brand" />
        ))}
      </div>
    );
  }

  if (kind === "square") {
    return (
      <div className="grid grid-cols-3 gap-1">
        {Array.from({ length: 9 }).map((_, index) => (
          <div key={index} className="h-2.5 w-2.5 rounded-[2px] bg-brand" />
        ))}
      </div>
    );
  }

  if (kind === "extra-rounded") {
    return (
      <div className="grid grid-cols-3 gap-1">
        {Array.from({ length: 9 }).map((_, index) => (
          <div key={index} className="h-2.5 w-2.5 rounded-[4px] bg-brand" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-3 gap-1">
      {Array.from({ length: 9 }).map((_, index) => (
        <div key={index} className={`h-2.5 w-2.5 bg-brand ${index % 2 === 0 ? "rounded-full" : "rounded-[4px]"}`} />
      ))}
    </div>
  );
}

export function QrStudioSidebar({
  authHref,
  canUseDynamic,
  contentType,
  dynamicBusy,
  dynamicCode,
  isDynamic,
  isSupabaseConfigured,
  logoDropzone,
  normalizedError,
  normalizedHasValue,
  onApplyFramePreset,
  onCreateOrUpdateDynamic,
  onResetStyle,
  onSaveCurrentDraft,
  onSetBackgroundColor,
  onSetForegroundColor,
  onToggleDynamic,
  onUpdateBackgroundGradient,
  onUpdateGradient,
  onUpdateQrSize,
  onUpdateStyle,
  shortUrl,
  style,
  title,
  value,
  setContentType,
  setTitle,
  setValue,
}: QrStudioSidebarProps) {
  const [activeSection, setActiveSection] = useState<QrStudioSection>("data");

  const sectionMeta = useMemo(() => SECTION_META[activeSection], [activeSection]);

  return (
    <section className={sectionCardClass()}>
      <ManageHeader icon={sectionMeta.icon} title={sectionMeta.title} copy={sectionMeta.copy} />

      <div className="mt-3 flex flex-wrap gap-2">
        {Object.entries(SECTION_META).map(([key, item]) => (
          <button
            key={key}
            type="button"
            className={studioSectionTabClass(activeSection === key)}
            onClick={() => setActiveSection(key as QrStudioSection)}
          >
            <item.icon className="h-3.5 w-3.5" />
            {item.label}
          </button>
        ))}
      </div>

      {activeSection === "data" ? (
        <div className="mt-3 space-y-3">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <ContentTypeButton active={contentType === "url"} icon={Link2} label="URL" onClick={() => setContentType("url")} />
            <ContentTypeButton active={contentType === "text"} icon={Type} label="Text" onClick={() => setContentType("text")} />
            <ContentTypeButton active={contentType === "email"} icon={Mail} label="Email" onClick={() => setContentType("email")} />
            <ContentTypeButton active={contentType === "phone"} icon={Phone} label="Phone" onClick={() => setContentType("phone")} />
          </div>

          <div className="grid gap-2">
            <label className="block">
              <span className="text-[11px] font-medium text-app-muted">Card title</span>
              <input value={title} onChange={(event) => setTitle(event.target.value)} className={COMPACT_INPUT_CLASS} />
            </label>

            <label className="block">
              <span className="text-[11px] font-medium text-app-muted">
                {contentType === "url" ? "Destination" : contentType === "text" ? "Text content" : contentType === "email" ? "Email address" : "Phone number"}
              </span>
              {contentType === "text" ? (
                <textarea value={value} onChange={(event) => setValue(event.target.value)} className={`${COMPACT_INPUT_CLASS} min-h-[96px] resize-y`} />
              ) : (
                <input
                  value={value}
                  onChange={(event) => setValue(event.target.value)}
                  className={COMPACT_INPUT_CLASS}
                  placeholder={
                    contentType === "url"
                      ? "StudentSociety.in or https://StudentSociety.in"
                      : contentType === "email"
                        ? "hello@studentsociety.in"
                        : "+91 9876543210"
                  }
                />
              )}
            </label>
          </div>

          <div className="rounded-[18px] border border-app-border bg-app-secondary/70 p-2.5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-app-muted">Dynamic QR</p>
                <p className="mt-1 text-xs text-app-muted">Login required. Edit the destination later without reprinting.</p>
              </div>
              <button
                type="button"
                className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                  isDynamic ? "bg-brand text-white" : "bg-app-card text-app-text"
                }`}
                onClick={onToggleDynamic}
              >
                <Lock className="h-4 w-4" />
                {isDynamic ? "Enabled" : "Enable"}
              </button>
            </div>

            {isDynamic ? (
              <div className="mt-2 flex flex-wrap gap-2">
                {canUseDynamic ? (
                  <button
                    type="button"
                    className="btn-primary gap-2 !rounded-full !px-4"
                    disabled={dynamicBusy || Boolean(normalizedError) || !normalizedHasValue}
                    onClick={onCreateOrUpdateDynamic}
                  >
                    <Lock className="h-4 w-4" />
                    {dynamicCode ? "Update live QR" : "Create dynamic QR"}
                  </button>
                ) : (
                  <Link to={authHref} className="btn-primary gap-2 !rounded-full !px-4">
                    <Lock className="h-4 w-4" />
                    Sign in to unlock
                  </Link>
                )}

                {shortUrl ? (
                  <button
                    type="button"
                    className="btn-secondary gap-2 !rounded-full !px-4"
                    onClick={() => void copyText(shortUrl).then(() => toast.success("Short URL copied"))}
                  >
                    <Copy className="h-4 w-4" />
                    Copy short URL
                  </button>
                ) : null}
              </div>
            ) : null}

            {!isSupabaseConfigured ? (
              <p className="mt-3 text-xs text-amber-700 dark:text-amber-300">
                Dynamic links stay hidden until Supabase env keys are configured.
              </p>
            ) : null}
          </div>
        </div>
      ) : null}

      {activeSection === "style" ? (
        <div className="mt-3 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-[18px] border border-app-border bg-app-secondary/50 p-2.5">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-app-muted">Professional preset</p>
              <p className="mt-1 text-xs text-app-muted">Reset to the polished Student Society default.</p>
            </div>
            <button type="button" className="btn-secondary gap-2 !rounded-full !px-4" onClick={onResetStyle}>
              <Sparkles className="h-4 w-4" />
              Reset
            </button>
          </div>

          <div className="grid gap-2 md:grid-cols-2">
            <StyleChoice active={style.dotStyle === "classy-rounded"} label="Classy Rounded" onClick={() => onUpdateStyle("dotStyle", "classy-rounded")} preview={sectionPreviewDots("classy-rounded")} />
            <StyleChoice active={style.dotStyle === "rounded"} label="Rounded" onClick={() => onUpdateStyle("dotStyle", "rounded")} preview={sectionPreviewDots("rounded")} />
            <StyleChoice active={style.dotStyle === "square"} label="Square" onClick={() => onUpdateStyle("dotStyle", "square")} preview={sectionPreviewDots("square")} />
            <StyleChoice active={style.dotStyle === "extra-rounded"} label="Extra Rounded" onClick={() => onUpdateStyle("dotStyle", "extra-rounded")} preview={sectionPreviewDots("extra-rounded")} />
          </div>

          <div className="grid gap-2 md:grid-cols-2">
            <label className="block">
              <span className="text-[11px] font-medium text-app-muted">Corner frame</span>
              <select
                value={style.cornerSquareStyle}
                onChange={(event) => onUpdateStyle("cornerSquareStyle", event.target.value as QrStyleSettings["cornerSquareStyle"])}
                className={`${COMPACT_INPUT_CLASS} appearance-none`}
              >
                <option value="square">Square</option>
                <option value="dot">Dot</option>
                <option value="extra-rounded">Extra rounded</option>
              </select>
            </label>
            <label className="block">
              <span className="text-[11px] font-medium text-app-muted">Corner center</span>
              <select
                value={style.cornerDotStyle}
                onChange={(event) => onUpdateStyle("cornerDotStyle", event.target.value as QrStyleSettings["cornerDotStyle"])}
                className={`${COMPACT_INPUT_CLASS} appearance-none`}
              >
                <option value="dot">Dot</option>
                <option value="square">Square</option>
              </select>
            </label>
          </div>

          <div className="grid gap-2 md:grid-cols-2">
            <label className="block">
              <span className="text-[11px] font-medium text-app-muted">Solid foreground</span>
              <input type="color" value={style.foregroundColor} onChange={(event) => onSetForegroundColor(event.target.value)} className={COMPACT_COLOR_CLASS} />
            </label>
            <label className="block">
              <span className="text-[11px] font-medium text-app-muted">Solid background</span>
              <input type="color" value={style.backgroundColor} onChange={(event) => onSetBackgroundColor(event.target.value)} className={COMPACT_COLOR_CLASS} />
            </label>
          </div>

          <div className="rounded-[18px] border border-app-border bg-app-secondary/50 p-2.5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-app-muted">Foreground gradient</p>
                <p className="mt-1 text-xs text-app-muted">Blend two colors across dots and corners.</p>
              </div>
              <button
                type="button"
                className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                  style.gradient.enabled ? "bg-brand text-white" : "bg-app-card text-app-text"
                }`}
                onClick={() => onUpdateGradient("enabled", !style.gradient.enabled)}
              >
                <SwatchBook className="h-4 w-4" />
                {style.gradient.enabled ? "On" : "Off"}
              </button>
            </div>

            <div className="mt-2 grid gap-2 md:grid-cols-4">
              <input type="color" value={style.gradient.start} onChange={(event) => onUpdateGradient("start", event.target.value)} className={COMPACT_COLOR_CLASS} />
              <input type="color" value={style.gradient.end} onChange={(event) => onUpdateGradient("end", event.target.value)} className={COMPACT_COLOR_CLASS} />
              <select value={style.gradient.type} onChange={(event) => onUpdateGradient("type", event.target.value as QrStyleSettings["gradient"]["type"])} className={COMPACT_SELECT_CLASS}>
                <option value="linear">Linear</option>
                <option value="radial">Radial</option>
              </select>
              <div className="rounded-[16px] border border-app-border bg-app-card px-3 py-2">
                <input type="range" min={0} max={360} value={style.gradient.rotation} onChange={(event) => onUpdateGradient("rotation", Number(event.target.value))} className="w-full" />
                <p className="mt-1 text-[11px] font-medium text-app-muted">{style.gradient.rotation}°</p>
              </div>
            </div>
          </div>

          <div className="rounded-[18px] border border-app-border bg-app-secondary/50 p-2.5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-app-muted">Background gradient</p>
                <p className="mt-1 text-xs text-app-muted">Use this for the QR surface instead of flat white.</p>
              </div>
              <button
                type="button"
                className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                  style.backgroundGradient.enabled ? "bg-brand text-white" : "bg-app-card text-app-text"
                }`}
                onClick={() => onUpdateBackgroundGradient("enabled", !style.backgroundGradient.enabled)}
              >
                <Palette className="h-4 w-4" />
                {style.backgroundGradient.enabled ? "On" : "Off"}
              </button>
            </div>

            <div className="mt-2 grid gap-2 md:grid-cols-4">
              <input type="color" value={style.backgroundGradient.start} onChange={(event) => onUpdateBackgroundGradient("start", event.target.value)} className={COMPACT_COLOR_CLASS} />
              <input type="color" value={style.backgroundGradient.end} onChange={(event) => onUpdateBackgroundGradient("end", event.target.value)} className={COMPACT_COLOR_CLASS} />
              <select value={style.backgroundGradient.type} onChange={(event) => onUpdateBackgroundGradient("type", event.target.value as QrStyleSettings["backgroundGradient"]["type"])} className={COMPACT_SELECT_CLASS}>
                <option value="linear">Linear</option>
                <option value="radial">Radial</option>
              </select>
              <div className="rounded-[16px] border border-app-border bg-app-card px-3 py-2">
                <input type="range" min={0} max={360} value={style.backgroundGradient.rotation} onChange={(event) => onUpdateBackgroundGradient("rotation", Number(event.target.value))} className="w-full" />
                <p className="mt-1 text-[11px] font-medium text-app-muted">{style.backgroundGradient.rotation}°</p>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {activeSection === "frame" ? (
        <div className="mt-3 space-y-3">
          <div className="grid gap-2 md:grid-cols-2">
            <StyleChoice active={style.frameStyle === "gradient"} label="Gradient" onClick={() => onApplyFramePreset("gradient")} preview={<div className="h-7 w-7 rounded-[10px] bg-[linear-gradient(135deg,#0f172a,#2563eb)]" />} />
            <StyleChoice active={style.frameStyle === "outline"} label="Outline" onClick={() => onApplyFramePreset("outline")} preview={<div className="h-7 w-7 rounded-[10px] border-2 border-slate-900 bg-white" />} />
            <StyleChoice active={style.frameStyle === "glass"} label="Glass" onClick={() => onApplyFramePreset("glass")} preview={<div className="h-7 w-7 rounded-[10px] border border-sky-200 bg-sky-100/70" />} />
            <StyleChoice active={style.frameStyle === "mono-card"} label="Black & White" onClick={() => onApplyFramePreset("mono-card")} preview={<div className="rounded-[10px] bg-black p-1"><div className="h-5 rounded-[6px] bg-white" /></div>} />
            <StyleChoice active={style.frameStyle === "scan-band"} label="Scan Band" onClick={() => onApplyFramePreset("scan-band")} preview={<div className="flex h-7 w-7 items-end overflow-hidden rounded-[10px] bg-black p-1"><div className="h-2 w-full rounded-[4px] bg-white" /></div>} />
            <StyleChoice active={style.frameStyle === "scan-card"} label="Scan Card" onClick={() => onApplyFramePreset("scan-card")} preview={<div className="rounded-[10px] bg-black p-1"><div className="rounded-[6px] bg-white px-1 py-0.5 text-center text-[7px] font-black text-black">SCAN</div></div>} />
            <StyleChoice active={style.frameStyle === "none"} label="None" onClick={() => onApplyFramePreset("none")} preview={<div className="flex h-7 w-7 items-center justify-center rounded-[10px] border border-dashed border-slate-300 text-[9px] text-slate-400">QR</div>} />
          </div>

          <div className="rounded-[18px] border border-app-border bg-slate-950 px-3 py-2.5 text-white">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-300">Black frame presets</p>
            <p className="mt-1 text-xs text-slate-400">`Black & White` keeps the QR fully monochrome. `Scan Band` and `Scan Card` add bolder black frame treatments.</p>
          </div>

          <div className="grid gap-2 md:grid-cols-2">
            <label className="block">
              <span className="text-[11px] font-medium text-app-muted">Frame color</span>
              <input type="color" value={style.frameColor} onChange={(event) => onUpdateStyle("frameColor", event.target.value)} className={COMPACT_COLOR_CLASS} />
            </label>
            <label className="block">
              <span className="text-[11px] font-medium text-app-muted">Accent color</span>
              <input type="color" value={style.frameAccentColor} onChange={(event) => onUpdateStyle("frameAccentColor", event.target.value)} className={COMPACT_COLOR_CLASS} />
            </label>
          </div>

          <div className="grid gap-2 md:grid-cols-2">
            <label className="block">
              <span className="text-[11px] font-medium text-app-muted">Inner spacing</span>
              <input type="range" min={0} max={28} value={style.framePadding} onChange={(event) => onUpdateStyle("framePadding", Number(event.target.value))} className="mt-1 w-full" />
              <p className="mt-1 text-[11px] text-app-muted">{style.framePadding}px</p>
            </label>
            <label className="block">
              <span className="text-[11px] font-medium text-app-muted">Frame radius</span>
              <input type="range" min={8} max={44} value={style.frameRadius} onChange={(event) => onUpdateStyle("frameRadius", Number(event.target.value))} className="mt-1 w-full" />
              <p className="mt-1 text-[11px] text-app-muted">{style.frameRadius}px</p>
            </label>
          </div>
        </div>
      ) : null}

      {activeSection === "label" ? (
        <div className="mt-3 space-y-3">
          <div className="rounded-[18px] border border-app-border bg-app-secondary/50 p-2.5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-app-muted">Top label</p>
                <p className="mt-1 text-xs text-app-muted">Small branded pill above the QR.</p>
              </div>
              <button
                type="button"
                className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                  style.labelEnabled ? "bg-brand text-white" : "bg-app-card text-app-text"
                }`}
                onClick={() => onUpdateStyle("labelEnabled", !style.labelEnabled)}
              >
                {style.labelEnabled ? "On" : "Off"}
              </button>
            </div>
            <input value={style.labelText} onChange={(event) => onUpdateStyle("labelText", event.target.value)} className={`${COMPACT_INPUT_CLASS} w-full`} placeholder="StudentSociety.in" />
            <div className="mt-2 grid grid-cols-2 gap-2">
              <input type="color" value={style.labelBackgroundColor} onChange={(event) => onUpdateStyle("labelBackgroundColor", event.target.value)} className={COMPACT_COLOR_CLASS} />
              <input type="color" value={style.labelColor} onChange={(event) => onUpdateStyle("labelColor", event.target.value)} className={COMPACT_COLOR_CLASS} />
            </div>
          </div>

          <div className="rounded-[18px] border border-app-border bg-app-secondary/50 p-2.5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-app-muted">Caption</p>
                <p className="mt-1 text-xs text-app-muted">Short helper line below the QR.</p>
              </div>
              <button
                type="button"
                className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                  style.captionEnabled ? "bg-brand text-white" : "bg-app-card text-app-text"
                }`}
                onClick={() => onUpdateStyle("captionEnabled", !style.captionEnabled)}
              >
                {style.captionEnabled ? "On" : "Off"}
              </button>
            </div>
            <input value={style.captionText} onChange={(event) => onUpdateStyle("captionText", event.target.value)} className={`${COMPACT_INPUT_CLASS} w-full`} placeholder="Scan to open" />
            <input type="color" value={style.captionColor} onChange={(event) => onUpdateStyle("captionColor", event.target.value)} className={`${COMPACT_COLOR_CLASS} mt-2`} />
          </div>
        </div>
      ) : null}

      {activeSection === "layout" ? (
        <div className="mt-3 space-y-3">
          <div {...logoDropzone.getRootProps()} className="rounded-[20px] border border-dashed border-app-border bg-app-secondary/50 p-3 transition hover:border-brand/35 hover:bg-brand/5">
            <input {...logoDropzone.getInputProps()} />
            <div className="flex items-start gap-3">
              <div className="rounded-[16px] bg-brand/10 p-2.5 text-brand">
                <ImagePlus className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-app-text">Drag in a logo</p>
                <p className="mt-1 text-xs text-app-muted">PNG, JPG, WEBP, AVIF, or SVG. Exports keep the embedded logo.</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <button type="button" className="btn-secondary gap-2 !rounded-full !px-4" onClick={() => logoDropzone.open()}>
                    <ImagePlus className="h-4 w-4" />
                    Choose logo
                  </button>
                  {style.logoDataUrl ? (
                    <button type="button" className="btn-secondary gap-2 !rounded-full !px-4" onClick={() => onUpdateStyle("logoDataUrl", null)}>
                      <ImagePlus className="h-4 w-4" />
                      Remove logo
                    </button>
                  ) : null}
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-2 md:grid-cols-2">
            <label className="block">
              <span className="text-[11px] font-medium text-app-muted">QR size</span>
              <input type="range" min={192} max={420} value={style.width} onChange={(event) => onUpdateQrSize(Number(event.target.value))} className="mt-1 w-full" />
              <p className="mt-1 text-[11px] text-app-muted">{style.width}px</p>
            </label>
            <label className="block">
              <span className="text-[11px] font-medium text-app-muted">Outer margin</span>
              <input type="range" min={0} max={40} value={style.margin} onChange={(event) => onUpdateStyle("margin", Number(event.target.value))} className="mt-1 w-full" />
              <p className="mt-1 text-[11px] text-app-muted">{style.margin}px</p>
            </label>
            <label className="block">
              <span className="text-[11px] font-medium text-app-muted">Logo size</span>
              <input type="range" min={12} max={34} value={style.logoSize} onChange={(event) => onUpdateStyle("logoSize", Number(event.target.value))} className="mt-1 w-full" />
              <p className="mt-1 text-[11px] text-app-muted">{style.logoSize}%</p>
            </label>
            <label className="block">
              <span className="text-[11px] font-medium text-app-muted">Logo padding</span>
              <input type="range" min={0} max={18} value={style.logoMargin} onChange={(event) => onUpdateStyle("logoMargin", Number(event.target.value))} className="mt-1 w-full" />
              <p className="mt-1 text-[11px] text-app-muted">{style.logoMargin}px</p>
            </label>
          </div>

          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn-primary gap-2 !rounded-full !px-4" onClick={onSaveCurrentDraft}>
              <Sparkles className="h-4 w-4" />
              Save draft
            </button>
            <button type="button" className="btn-secondary gap-2 !rounded-full !px-4" onClick={onResetStyle}>
              <Sparkles className="h-4 w-4" />
              Restore default look
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );
}
