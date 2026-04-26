import type { CSSProperties, RefObject } from "react";
import type { QrStyleSettings } from "./types";

interface QrPreviewCardProps {
  previewCardRef: RefObject<HTMLDivElement>;
  qrMountRef: RefObject<HTMLDivElement>;
  error: string | null;
  style: QrStyleSettings;
}

function hexToRgba(hex: string, alpha: number) {
  const normalized = hex.replace("#", "");
  const safe = normalized.length === 3
    ? normalized
        .split("")
        .map((char) => char + char)
        .join("")
    : normalized;

  const r = Number.parseInt(safe.slice(0, 2), 16);
  const g = Number.parseInt(safe.slice(2, 4), 16);
  const b = Number.parseInt(safe.slice(4, 6), 16);

  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function buildOuterChrome(style: QrStyleSettings): CSSProperties {
  const radius = Math.max(style.frameRadius + 12, 28);

  if (style.frameStyle === "scan-band") {
    return {
      borderRadius: radius + 4,
      padding: 10,
      background: "linear-gradient(180deg, rgba(2,6,23,1), rgba(15,23,42,0.96))",
      boxShadow: "0 40px 80px -48px rgba(2, 6, 23, 0.9)",
    };
  }

  if (style.frameStyle === "scan-card") {
    return {
      borderRadius: radius + 8,
      padding: 12,
      background: "linear-gradient(180deg, rgba(2,6,23,1), rgba(15,23,42,1))",
      boxShadow: "0 42px 90px -50px rgba(2, 6, 23, 0.95)",
    };
  }

  if (style.frameStyle === "mono-card") {
    return {
      borderRadius: radius + 6,
      padding: 12,
      background: "#020617",
      boxShadow: "0 42px 90px -52px rgba(2, 6, 23, 0.92)",
    };
  }

  if (style.frameStyle === "none") {
    return {
      borderRadius: radius,
      background: "transparent",
      boxShadow: "0 24px 60px -38px rgba(15, 23, 42, 0.35)",
    };
  }

  if (style.frameStyle === "outline") {
    return {
      borderRadius: radius,
      padding: 2,
      background: style.frameColor,
      boxShadow: `0 30px 60px -42px ${hexToRgba(style.frameColor, 0.44)}`,
    };
  }

  if (style.frameStyle === "glass") {
    return {
      borderRadius: radius,
      padding: 2,
      background: `linear-gradient(145deg, ${hexToRgba(style.frameColor, 0.22)}, ${hexToRgba(style.frameAccentColor, 0.12)})`,
      border: `1px solid ${hexToRgba(style.frameColor, 0.18)}`,
      boxShadow: `0 34px 80px -48px ${hexToRgba(style.frameColor, 0.4)}`,
    };
  }

  return {
    borderRadius: radius,
    padding: 2,
    background: `linear-gradient(135deg, ${style.frameColor}, ${style.frameAccentColor})`,
    boxShadow: `0 36px 80px -46px ${hexToRgba(style.frameAccentColor, 0.5)}`,
  };
}

function buildInnerShell(style: QrStyleSettings): CSSProperties {
  if (style.frameStyle === "scan-band") {
    return {
      borderRadius: Math.max(style.frameRadius + 10, 26),
      background: "linear-gradient(180deg, rgba(255,255,255,0.995), rgba(248,250,252,0.98))",
      border: "1px solid rgba(255,255,255,0.08)",
      padding: 14,
    };
  }

  if (style.frameStyle === "scan-card") {
    return {
      borderRadius: Math.max(style.frameRadius + 10, 26),
      background: "linear-gradient(180deg, rgba(255,255,255,0.98), rgba(248,250,252,0.94))",
      border: "1px solid rgba(255,255,255,0.12)",
      padding: 14,
    };
  }

  if (style.frameStyle === "mono-card") {
    return {
      borderRadius: Math.max(style.frameRadius + 10, 26),
      background: "#ffffff",
      border: "1px solid rgba(15,23,42,0.08)",
      padding: 12,
    };
  }

  return {
    borderRadius: Math.max(style.frameRadius + 10, 26),
    background: "linear-gradient(180deg, rgba(255,255,255,0.98), rgba(248,250,252,0.94))",
    border: `1px solid ${hexToRgba(style.frameColor, 0.08)}`,
    padding: 14,
  };
}

function buildStageStyle(style: QrStyleSettings): CSSProperties {
  if (style.frameStyle === "scan-band" || style.frameStyle === "scan-card" || style.frameStyle === "mono-card") {
    return {
      borderRadius: Math.max(style.frameRadius, 22),
      padding: style.framePadding,
      background: "#ffffff",
      border: "1px solid rgba(15,23,42,0.12)",
      boxShadow: "inset 0 1px 0 rgba(255,255,255,0.9)",
    };
  }

  return {
    borderRadius: Math.max(style.frameRadius, 22),
    padding: style.framePadding,
    background: "linear-gradient(180deg, rgba(255,255,255,0.98), rgba(248,250,252,0.9))",
    border: `1px solid ${hexToRgba(style.frameColor, 0.08)}`,
    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.8)",
  };
}

export function QrPreviewCard({
  previewCardRef,
  qrMountRef,
  error,
  style,
}: QrPreviewCardProps) {
  const usesBlackScanFrame = style.frameStyle === "scan-band" || style.frameStyle === "scan-card";
  const scanHeaderText = style.labelText.trim() || "Scan Me";
  const scanFooterText = style.captionText.trim() || "Scan to open";

  return (
    <div ref={previewCardRef} className="mx-auto w-full max-w-full overflow-hidden" style={buildOuterChrome(style)}>
      <div className="mx-auto w-full max-w-full overflow-hidden" style={buildInnerShell(style)}>
        {style.frameStyle === "scan-card" && style.labelEnabled ? (
          <div className="mb-3 flex items-center justify-between rounded-[20px] bg-slate-950 px-3.5 py-2 text-white">
            <span className="text-[10px] font-black uppercase tracking-[0.24em]">{scanHeaderText}</span>
            <span className="rounded-full bg-white px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.14em] text-slate-950">
              Scan
            </span>
          </div>
        ) : null}

        {style.labelEnabled && style.labelText.trim() && !usesBlackScanFrame ? (
          <div
            className="inline-flex max-w-full items-center truncate rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em]"
            style={{
              color: style.labelColor,
              background: style.labelBackgroundColor,
            }}
          >
            {style.labelText}
          </div>
        ) : null}

        {style.frameStyle === "scan-band" && style.labelEnabled ? (
          <div className="rounded-[18px] bg-slate-950 px-3 py-2 text-center text-[10px] font-black uppercase tracking-[0.24em] text-white">
            {scanHeaderText}
          </div>
        ) : null}

        <div className={`${style.labelEnabled || usesBlackScanFrame ? "mt-3" : ""} flex justify-center overflow-hidden`} style={buildStageStyle(style)}>
          <div
            className="w-full max-w-full shrink"
            style={{
              width: style.width,
              maxWidth: "100%",
              height: "auto",
              aspectRatio: "1 / 1",
            }}
          >
            <div ref={qrMountRef} className="h-full w-full [&>svg]:!h-auto [&>svg]:!w-full [&>canvas]:!h-auto [&>canvas]:!w-full" />
          </div>
        </div>

        {style.frameStyle === "scan-card" && style.captionEnabled ? (
          <div className="mt-3 flex justify-center">
            <div className="rounded-full bg-slate-950 px-4 py-1.5 text-[10px] font-black uppercase tracking-[0.24em] text-white">
              {scanFooterText}
            </div>
          </div>
        ) : null}

        {style.frameStyle === "scan-band" && style.captionEnabled ? (
          <div className="mt-3 rounded-[20px] bg-slate-950 px-4 py-2 text-center text-[11px] font-black uppercase tracking-[0.24em] text-white">
            {scanFooterText}
          </div>
        ) : null}

        {style.captionEnabled && style.captionText.trim() && !usesBlackScanFrame ? (
          <p className="mt-3 text-center text-[11px] font-medium" style={{ color: style.captionColor }}>
            {style.captionText}
          </p>
        ) : null}

        {error ? (
          <div className="mt-3 rounded-[14px] bg-rose-50 px-2.5 py-2 text-[11px] text-rose-700">
            {error}
          </div>
        ) : null}
      </div>
    </div>
  );
}
