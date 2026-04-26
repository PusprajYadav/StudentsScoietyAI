import { Lock } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { RichPostContent } from "../RichPostContent";

interface ResumePortfolioShareCardProps {
  importBusy?: boolean;
  isResumeShare: boolean;
  linkUrl: string;
  postContent: string;
  onImport: () => void;
}

export function ResumePortfolioShareCard({
  importBusy,
  isResumeShare,
  linkUrl,
  postContent,
  onImport,
}: ResumePortfolioShareCardProps) {
  const [frameReady, setFrameReady] = useState(false);
  const [frameFailed, setFrameFailed] = useState(false);
  const embedUrl = useMemo(() => {
    try {
      const resolved = new URL(
        linkUrl,
        typeof window === "undefined" ? "https://studentsociety.in" : window.location.origin
      );
      resolved.searchParams.set("embed", "true");
      return resolved.toString();
    } catch {
      const separator = linkUrl.includes("?") ? "&" : "?";
      return `${linkUrl}${separator}embed=true`;
    }
  }, [linkUrl]);

  useEffect(() => {
    setFrameReady(false);
    setFrameFailed(false);
  }, [embedUrl]);

  return (
    <div className="min-w-0 space-y-3">
      <RichPostContent content={postContent} />

      <div className="native-card min-w-0 overflow-hidden rounded-[22px] bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)] dark:bg-[linear-gradient(180deg,rgba(10,16,30,0.98),rgba(7,12,24,0.98))]">
        <div className="flex items-center gap-2 px-3 py-3 sm:px-4 sm:py-3.5">
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand/10 text-brand">
              <Lock className="h-3.5 w-3.5" />
            </span>
            <p className="truncate text-[11px] font-semibold text-app-text sm:text-[13px]">
              {isResumeShare ? "Live Resume Preview" : "Live Portfolio Preview"}
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <a
              href={linkUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-10 items-center justify-center whitespace-nowrap rounded-full bg-brand px-4 text-[10px] font-semibold text-white shadow-[0_16px_30px_-22px_rgba(37,99,235,0.8)] transition hover:bg-brand-dark sm:text-[11px]"
            >
              Full screen
            </a>
            <button
              type="button"
              onClick={onImport}
              disabled={Boolean(importBusy)}
              className="inline-flex h-10 items-center justify-center whitespace-nowrap rounded-full border border-brand/40 bg-white px-4 text-[10px] font-semibold text-brand shadow-sm transition hover:bg-brand/5 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-brand/10 dark:text-blue-200 dark:hover:bg-brand/15 sm:text-[11px]"
            >
              {importBusy ? "Importing..." : "Import"}
            </button>
          </div>
        </div>

        <div className="px-3 pb-3 sm:px-4 sm:pb-4">
          <div className="rounded-[18px] border border-app-border bg-white p-2 shadow-[0_18px_40px_-28px_rgba(15,23,42,0.16)] dark:bg-slate-950/55 dark:shadow-[0_18px_40px_-28px_rgba(2,6,23,0.85)] sm:p-2.5">
            <div className="relative aspect-[3/4] w-full overflow-hidden rounded-[16px] bg-[#eef4fb] dark:bg-slate-900 sm:aspect-auto sm:h-[420px]">
              {!frameReady && !frameFailed ? (
                <div className="absolute inset-0 flex items-center justify-center bg-[linear-gradient(180deg,#f8fbff_0%,#eef4fb_100%)] px-6 text-center dark:bg-[linear-gradient(180deg,rgba(15,23,42,0.95),rgba(2,6,23,0.98))]">
                  <div>
                    <div className="mx-auto mb-5 h-12 w-12 animate-spin rounded-full border-[3px] border-brand/15 border-t-brand" />
                    <p className="text-base font-semibold text-app-text">
                      Loading {isResumeShare ? "resume" : "portfolio"} preview...
                    </p>
                    <p className="mt-2 text-sm text-app-muted">
                      Preparing a smooth live preview inside the post.
                    </p>
                  </div>
                </div>
              ) : null}

              {frameFailed ? (
                <div className="absolute inset-0 flex items-center justify-center bg-[linear-gradient(180deg,#f8fbff_0%,#eef4fb_100%)] px-6 text-center dark:bg-[linear-gradient(180deg,rgba(15,23,42,0.95),rgba(2,6,23,0.98))]">
                  <div>
                    <p className="text-base font-semibold text-app-text">
                      Preview unavailable here
                    </p>
                    <p className="mt-2 text-sm text-app-muted">
                      Open the full page to view it without interruption.
                    </p>
                  </div>
                </div>
              ) : null}

              <iframe
                src={embedUrl}
                title={isResumeShare ? "Resume Preview" : "Portfolio Preview"}
                className={`absolute inset-0 h-full w-full border-0 transition-opacity duration-300 ${
                  frameReady ? "opacity-100" : "opacity-0"
                }`}
                loading="eager"
                onLoad={() => {
                  setFrameReady(true);
                  setFrameFailed(false);
                }}
                onError={() => {
                  setFrameReady(false);
                  setFrameFailed(true);
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
