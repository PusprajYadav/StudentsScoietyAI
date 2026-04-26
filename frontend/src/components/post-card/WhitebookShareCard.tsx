import { NotebookPen } from "lucide-react";
import { toWhitebookPreviewDataUrl } from "../../features/my-room/whitebook/utils";
import type { WhitebookSharedPostPreview } from "../../features/my-room/whitebook/types";
import { RichPostContent } from "../RichPostContent";

interface WhitebookShareCardProps {
  activePage: WhitebookSharedPostPreview["pages"][number] | null;
  importBusy?: boolean;
  linkUrl: string;
  postContent: string;
  preview: WhitebookSharedPostPreview | null;
  previewLoading: boolean;
  onImport: () => void;
  onSelectPage: (pageId: string) => void;
}

export function WhitebookShareCard({
  activePage,
  importBusy,
  linkUrl,
  postContent,
  preview,
  previewLoading,
  onImport,
  onSelectPage,
}: WhitebookShareCardProps) {
  const previewUrl = toWhitebookPreviewDataUrl(activePage?.previewSvg || null);

  return (
    <div className="space-y-3">
      <RichPostContent content={postContent} />

      <div className="overflow-hidden rounded-[18px] border border-app-border bg-[#f8fafc] dark:bg-[linear-gradient(180deg,rgba(10,16,30,0.98),rgba(7,12,24,0.98))] sm:rounded-[22px]">
        <div className="flex flex-col gap-2 border-b border-app-border px-3 py-3 sm:px-4 sm:py-3">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand/10 text-brand">
              <NotebookPen className="h-3.5 w-3.5" />
            </span>
            <div>
              <p className="text-[11px] font-semibold text-app-text sm:text-[13px]">Shared WhiteBook</p>
              <p className="text-[10px] text-app-muted sm:text-[11px]">
                {preview
                  ? `${preview.pageCount} endless page${preview.pageCount === 1 ? "" : "s"} ready to import`
                  : "Open the board or import a local editable copy."}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <a
              href={linkUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex min-w-0 items-center justify-center rounded-full bg-app-card px-3 py-1.5 text-[10px] font-semibold text-app-text shadow-sm transition hover:bg-app-secondary dark:bg-slate-900/80 sm:text-[11px]"
            >
              Open live board
            </a>
            <button
              type="button"
              onClick={onImport}
              disabled={Boolean(importBusy)}
              className="inline-flex min-w-0 items-center justify-center rounded-full border border-brand/25 bg-white px-3 py-1.5 text-[10px] font-semibold text-brand shadow-sm transition hover:bg-brand/5 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-brand/10 dark:text-blue-200 dark:hover:bg-brand/15 sm:text-[11px]"
            >
              {importBusy ? "Importing..." : "Import to WhiteBook"}
            </button>
          </div>
        </div>

        <div className="space-y-3 p-3 sm:p-4">
          <div className="min-w-0 space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[12px] font-medium text-app-muted sm:text-[13px]">{activePage?.name || "Preview"}</p>
              {activePage ? (
                <span className="rounded-full bg-app-card px-2 py-1 text-[9px] font-semibold text-app-text dark:bg-slate-900/80 sm:text-[10px]">
                  {activePage.itemCount} item{activePage.itemCount === 1 ? "" : "s"}
                </span>
              ) : null}
            </div>

            <div className="overflow-hidden rounded-[18px] border border-app-border bg-white dark:bg-slate-950/45">
              {previewLoading ? (
                <div className="aspect-[16/10] animate-pulse bg-app-secondary/70" />
              ) : previewUrl ? (
                <img
                  src={previewUrl}
                  alt={activePage?.name || preview?.title || postTitle}
                  className="aspect-[16/10] h-full w-full object-cover"
                />
              ) : (
                <div className="aspect-[16/10] bg-[radial-gradient(circle_at_top,rgba(37,99,235,0.16),transparent_38%),linear-gradient(180deg,#ffffff,#eff6ff)]" />
              )}
            </div>
          </div>

          <div className="overflow-x-auto pb-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
            <div className="flex min-w-max gap-2">
              {previewLoading
                ? Array.from({ length: 3 }).map((_, index) => (
                    <div key={index} className="h-14 w-28 animate-pulse rounded-[14px] bg-app-secondary/70" />
                  ))
                : preview?.pages.map((page, index) => (
                    <button
                      key={page.id}
                      type="button"
                      onClick={() => onSelectPage(page.id)}
                      className={`w-[118px] rounded-[16px] border px-3 py-2 text-left transition ${
                        page.id === activePage?.id
                          ? "border-brand/35 bg-brand/5 dark:bg-brand/10"
                          : "border-app-border bg-white dark:bg-slate-950/45"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate text-[12px] font-semibold text-app-text">{page.name}</p>
                        <span className="rounded-full bg-app-secondary px-1.5 py-0.5 text-[9px] font-semibold text-app-muted dark:bg-slate-900/80">
                          {index + 1}
                        </span>
                      </div>
                      <p className="mt-1 text-[10px] text-app-muted">
                        {page.itemCount} item{page.itemCount === 1 ? "" : "s"}
                      </p>
                    </button>
                  ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
