import { useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { PortfolioPreview } from "../features/my-room/portfolio-maker/PortfolioPreview";
import type { PortfolioColorMode, PortfolioRecord } from "../features/my-room/portfolio-maker/types";
import { normalizeTheme } from "../features/my-room/portfolio-maker/utils";

interface PreviewPayload {
  portfolio: PortfolioRecord;
  mode: PortfolioColorMode;
}

function normalizePreviewPayload(input: unknown): PreviewPayload | null {
  if (!input || typeof input !== "object") {
    return null;
  }

  const record = input as Record<string, unknown>;
  const portfolio = record.portfolio as PortfolioRecord | undefined;
  const mode = record.mode === "light" ? "light" : record.mode === "dark" ? "dark" : null;

  if (!portfolio || !portfolio.content || !portfolio.theme || !portfolio.template_key || !mode) {
    return null;
  }

  return {
    portfolio: {
      ...portfolio,
      theme: normalizeTheme(portfolio.theme, portfolio.template_key),
    },
    mode,
  };
}

export function PortfolioPreviewFramePage() {
  const [searchParams] = useSearchParams();
  const previewKey = searchParams.get("previewKey") || "";
  const payload = useMemo(() => {
    if (!previewKey || typeof window === "undefined") {
      return null;
    }

    const raw = window.sessionStorage.getItem(previewKey);
    if (!raw) {
      return null;
    }

    try {
      return normalizePreviewPayload(JSON.parse(raw));
    } catch {
      return null;
    }
  }, [previewKey]);

  if (!payload) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#eef4ff] px-6 text-center">
        <div className="rounded-[28px] border border-slate-200 bg-white px-6 py-8 shadow-[0_28px_90px_-56px_rgba(15,23,42,0.35)]">
          <p className="text-sm font-semibold text-slate-900">Loading preview...</p>
          <p className="mt-2 text-sm text-slate-500">The editor preview will appear here.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#eef4ff]">
      <PortfolioPreview portfolio={payload.portfolio} modeOverride={payload.mode} />
    </div>
  );
}
