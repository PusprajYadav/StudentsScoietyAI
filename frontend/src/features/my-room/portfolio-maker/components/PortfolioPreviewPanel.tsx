import {
  Copy,
  ExternalLink,
  Globe2,
  Monitor,
  MoonStar,
  Smartphone,
  SunMedium,
  Tablet,
} from "lucide-react";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import { PortfolioPreview } from "../PortfolioPreview";
import type { PortfolioColorMode, PortfolioRecord, PortfolioViewportKey } from "../types";
import { buildPublicPortfolioUrl, resolveTemplateLabel } from "../utils";
import { SectionCard } from "./editorPrimitives";

const viewportPresets: Record<
  PortfolioViewportKey,
  {
    label: string;
    width: number;
    height: number;
    icon: typeof Monitor;
    description: string;
  }
> = {
  desktop: {
    label: "Desktop",
    width: 1440,
    height: 920,
    icon: Monitor,
    description: "Real desktop browser width",
  },
  tablet: {
    label: "Tablet",
    width: 834,
    height: 1112,
    icon: Tablet,
    description: "Real tablet viewport width",
  },
  mobile: {
    label: "Mobile",
    width: 390,
    height: 844,
    icon: Smartphone,
    description: "Real phone viewport width",
  },
};

interface PreviewPayload {
  portfolio: PortfolioRecord;
  mode: PortfolioColorMode;
}

interface PreviewSnapshot {
  portfolio: PortfolioRecord;
  mode: PortfolioColorMode;
  signature: string;
}

function createPreviewSignature(portfolio: PortfolioRecord, mode: PortfolioColorMode) {
  return JSON.stringify({
    portfolio,
    mode,
  } satisfies PreviewPayload);
}

function createPreviewSnapshot(portfolio: PortfolioRecord, mode: PortfolioColorMode): PreviewSnapshot {
  const signature = createPreviewSignature(portfolio, mode);

  return {
    portfolio:
      typeof structuredClone === "function"
        ? structuredClone(portfolio)
        : (JSON.parse(JSON.stringify(portfolio)) as PortfolioRecord),
    mode,
    signature,
  };
}

function formatScale(scale: number) {
  return `${Math.round(scale * 100)}%`;
}

const RealPreviewCanvas = memo(function RealPreviewCanvas({
  portfolio,
  mode,
  viewport,
}: {
  portfolio: PortfolioRecord;
  mode: PortfolioColorMode;
  viewport: PortfolioViewportKey;
}) {
  const frameRef = useRef<HTMLDivElement | null>(null);
  const [frameWidth, setFrameWidth] = useState(0);
  const preset = viewportPresets[viewport];

  useEffect(() => {
    const node = frameRef.current;
    if (!node) {
      return;
    }

    const updateWidth = () => setFrameWidth(node.getBoundingClientRect().width);
    updateWidth();

    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", updateWidth);
      return () => window.removeEventListener("resize", updateWidth);
    }

    const observer = new ResizeObserver(() => updateWidth());
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const scale = useMemo(() => {
    if (!frameWidth) {
      return 1;
    }

    const availableWidth = Math.max(frameWidth - 16, 280);
    return Math.min(1, availableWidth / preset.width);
  }, [frameWidth, preset.width]);

  return (
    <div className="rounded-[30px] border border-app-border bg-[linear-gradient(180deg,rgba(15,23,42,0.04),rgba(15,23,42,0.02))] p-3 sm:p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-app-muted">Actual canvas</p>
          <p className="mt-1 text-sm font-semibold text-app-text">
            {preset.label} • {preset.width}px x {preset.height}px
          </p>
          <p className="mt-1 text-xs text-app-muted">{preset.description}</p>
        </div>

        <div className="flex flex-wrap gap-2">
          <span className="rounded-full border border-app-border bg-app-card px-3 py-1.5 text-[11px] font-semibold text-app-muted">
            Fit to panel: {formatScale(scale)}
          </span>
          <span className="rounded-full border border-app-border bg-app-card px-3 py-1.5 text-[11px] font-semibold text-app-muted">
            Real {viewport} layout
          </span>
        </div>
      </div>

      <div
        ref={frameRef}
        className="mt-4 rounded-[28px] border border-app-border bg-[radial-gradient(circle_at_top_left,rgba(37,99,235,0.08),transparent_24%),linear-gradient(180deg,rgba(15,23,42,0.03),rgba(15,23,42,0.01))] p-3 sm:p-4"
      >
        <div className="flex justify-center overflow-hidden rounded-[24px] border border-app-border/80 bg-[#dfe7f4] p-3 shadow-[0_28px_80px_-56px_rgba(15,23,42,0.55)] sm:p-4">
          <div
            className="relative"
            style={{
              width: preset.width * scale,
              height: preset.height * scale,
            }}
          >
            <div
              className="absolute left-0 top-0 overflow-hidden rounded-[28px] border border-slate-200/80 bg-white shadow-[0_32px_90px_-54px_rgba(15,23,42,0.45)]"
              style={{
                width: preset.width,
                height: preset.height,
                transform: `scale(${scale})`,
                transformOrigin: "top left",
              }}
            >
              <div
                style={{
                  width: preset.width,
                  minHeight: preset.height,
                }}
              >
                <PortfolioPreview portfolio={portfolio} viewportOverride={viewport} modeOverride={mode} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

RealPreviewCanvas.displayName = "RealPreviewCanvas";

export function PortfolioPreviewPanel({ portfolio }: { portfolio: PortfolioRecord }) {
  const [viewport, setViewport] = useState<PortfolioViewportKey>("desktop");
  const [colorMode, setColorMode] = useState<PortfolioColorMode>(portfolio.theme.editorMode || "dark");
  const [committedPreviewSnapshot, setCommittedPreviewSnapshot] = useState<PreviewSnapshot>(() =>
    createPreviewSnapshot(portfolio, portfolio.theme.editorMode || "dark")
  );
  const latestPortfolioRef = useRef(portfolio);
  const lastPortfolioIdRef = useRef(portfolio.id);

  latestPortfolioRef.current = portfolio;

  useEffect(() => {
    setColorMode(portfolio.theme.editorMode || "dark");
  }, [portfolio.theme.editorMode]);

  const publicUrl = useMemo(() => buildPublicPortfolioUrl(portfolio), [portfolio]);
  const enabledSections = useMemo(
    () => portfolio.content.sections.filter((section) => section.enabled).length,
    [portfolio.content.sections]
  );
  const activePreset = viewportPresets[viewport];
  const livePreviewPayloadJson = useMemo(
    () => createPreviewSignature(portfolio, colorMode),
    [portfolio, colorMode]
  );
  const previewNeedsRefresh = livePreviewPayloadJson !== committedPreviewSnapshot.signature;

  const refreshPreview = useCallback((modeOverride?: PortfolioColorMode) => {
    setCommittedPreviewSnapshot(createPreviewSnapshot(portfolio, modeOverride ?? colorMode));
  }, [portfolio, colorMode]);

  useEffect(() => {
    if (lastPortfolioIdRef.current === portfolio.id) {
      return;
    }

    lastPortfolioIdRef.current = portfolio.id;
    const nextPortfolio = latestPortfolioRef.current;
    setCommittedPreviewSnapshot(createPreviewSnapshot(nextPortfolio, nextPortfolio.theme.editorMode || "dark"));
  }, [portfolio.id]);

  return (
    <SectionCard
      title="Real preview"
      actions={
        <span className="inline-flex items-center gap-2 rounded-full bg-app-secondary px-3 py-1.5 text-[11px] font-semibold text-app-muted">
          <Globe2 className="h-4 w-4 text-brand" />
          Live-like preview
        </span>
      }
    >
      <div className="overflow-hidden rounded-[26px] border border-app-border bg-[linear-gradient(180deg,rgba(37,99,235,0.04),rgba(15,23,42,0.02))] p-4 sm:p-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div className="max-w-2xl">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand">Preview workspace</p>
            <h3 className="mt-2 font-display text-[1.25rem] font-semibold tracking-tight text-app-text sm:text-[1.5rem]">
              Real device viewport preview
            </h3>
            <p className="mt-2 text-sm leading-7 text-app-muted">
              This preview matches the live layout much more closely, but it only refreshes when you ask it to so the editor stops flashing while you type.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {portfolio.is_live ? (
              <>
                <a
                  href={publicUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 rounded-full bg-brand px-4 py-2 text-xs font-semibold text-white transition hover:bg-brand-dark"
                >
                  <ExternalLink className="h-4 w-4" />
                  Open live page
                </a>
                <button
                  type="button"
                  onClick={async () => {
                    await navigator.clipboard.writeText(publicUrl);
                    toast.success("Live link copied.");
                  }}
                  className="inline-flex items-center gap-2 rounded-full border border-app-border bg-app-card px-4 py-2 text-xs font-semibold text-app-text transition hover:border-brand/30 hover:bg-brand/5"
                >
                  <Copy className="h-4 w-4 text-brand" />
                  Copy link
                </button>
              </>
            ) : (
              <span className="inline-flex items-center rounded-full border border-app-border bg-app-card px-4 py-2 text-xs font-semibold text-app-muted">
                Publish to compare with the public URL
              </span>
            )}
          </div>
        </div>

        <div className="mt-4 grid gap-3 lg:grid-cols-4">
          {[
            { label: "Template", value: resolveTemplateLabel(portfolio.template_key) },
            { label: "Sections", value: `${enabledSections} enabled` },
            { label: "Viewport", value: `${activePreset.label} ${activePreset.width}px` },
            { label: "Theme", value: colorMode === "light" ? "Light mode" : "Dark mode" },
          ].map((item) => (
            <div
              key={item.label}
              className="rounded-[20px] border border-app-border bg-app-card/90 px-4 py-3 shadow-[0_12px_28px_-24px_rgba(15,23,42,0.35)]"
            >
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-app-muted">{item.label}</p>
              <p className="mt-1.5 text-sm font-semibold text-app-text">{item.value}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-[26px] border border-app-border bg-app-secondary/30 p-4">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-wrap gap-2">
            {(Object.entries(viewportPresets) as Array<[PortfolioViewportKey, (typeof viewportPresets)[PortfolioViewportKey]]>).map(
              ([key, preset]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setViewport(key)}
                  className={`inline-flex items-center gap-2 rounded-full px-3.5 py-2 text-xs font-semibold transition ${
                    viewport === key
                      ? "bg-brand text-white"
                      : "border border-app-border bg-app-card text-app-text hover:border-brand/30 hover:bg-brand/5"
                  }`}
                >
                  <preset.icon className="h-4 w-4" />
                  {preset.label}
                </button>
              )
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            {([
              { id: "light", label: "Light", icon: SunMedium },
              { id: "dark", label: "Dark", icon: MoonStar },
            ] as const).map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setColorMode(item.id);
                }}
                className={`inline-flex items-center gap-2 rounded-full px-3.5 py-2 text-xs font-semibold transition ${
                  colorMode === item.id
                    ? "bg-brand text-white"
                    : "border border-app-border bg-app-card text-app-text hover:border-brand/30 hover:bg-brand/5"
                }`}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-[20px] border border-app-border bg-app-card/80 px-4 py-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-app-muted">Preview status</p>
            <p className="mt-1 text-sm font-semibold text-app-text">
              {previewNeedsRefresh ? "Preview has editor changes waiting" : "Preview is up to date"}
            </p>
          </div>

          <button
            type="button"
            onClick={() => refreshPreview()}
            className="inline-flex items-center gap-2 rounded-full bg-brand px-4 py-2 text-xs font-semibold text-white transition hover:bg-brand-dark"
          >
            <Globe2 className="h-4 w-4" />
            Refresh preview
          </button>
        </div>
      </div>

      <RealPreviewCanvas
        portfolio={committedPreviewSnapshot.portfolio}
        mode={committedPreviewSnapshot.mode}
        viewport={viewport}
      />
    </SectionCard>
  );
}
