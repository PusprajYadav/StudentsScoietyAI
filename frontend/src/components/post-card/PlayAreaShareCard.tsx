import { ExternalLink, Import, Layers3, NotebookPen, Sparkles } from "lucide-react";
import type { PlayAreaDocument, PlayAreaSection } from "../../features/ai-teacher-play-area/types";
import { RichPostContent } from "../RichPostContent";

interface PlayAreaShareCardProps {
  importBusy?: boolean;
  linkUrl: string;
  postContent: string;
  postTitle: string;
  preview: PlayAreaDocument | null;
  previewLoading: boolean;
  onImport: () => void;
}

function sectionLabel(type: PlayAreaSection["type"]) {
  return type.replace(/_/g, " ");
}

function sectionPreviewText(section: PlayAreaSection) {
  if (section.type === "paragraph") {
    return section.text;
  }
  if (section.type === "flashcards") {
    return `${section.cards.length} flashcard${section.cards.length === 1 ? "" : "s"}`;
  }
  if (section.type === "quiz") {
    return `${section.questions.length} question${section.questions.length === 1 ? "" : "s"}`;
  }
  if (section.type === "mindmap") {
    return `${section.nodes.length} node${section.nodes.length === 1 ? "" : "s"}`;
  }
  if (section.type === "bullet_list" || section.type === "steps") {
    return `${section.items.length} row${section.items.length === 1 ? "" : "s"}`;
  }
  return section.graphCaption || "Visual block";
}

export function PlayAreaShareCard({
  importBusy,
  linkUrl,
  postContent,
  postTitle,
  preview,
  previewLoading,
  onImport,
}: PlayAreaShareCardProps) {
  const visibleSections = preview?.sections.slice(0, 4) || [];
  const remainingSections = Math.max(0, (preview?.sections.length || 0) - visibleSections.length);

  return (
    <div className="min-w-0 space-y-2 sm:space-y-3">
      <RichPostContent content={postContent} />

      <div className="min-w-0 overflow-hidden rounded-[16px] border border-sky-300/60 bg-[radial-gradient(circle_at_top_left,rgba(56,189,248,0.18),transparent_28%),linear-gradient(180deg,#f0f9ff_0%,#f8fafc_100%)] shadow-[0_12px_32px_-28px_rgba(15,23,42,0.34)] dark:border-sky-400/20 dark:bg-[linear-gradient(180deg,rgba(15,23,42,0.98),rgba(7,12,24,0.98))] sm:rounded-[22px] sm:bg-[radial-gradient(circle_at_top_left,rgba(56,189,248,0.22),transparent_30%),linear-gradient(180deg,#f0f9ff_0%,#f8fafc_100%)] sm:shadow-[0_24px_58px_-42px_rgba(15,23,42,0.36)]">
        <div className="flex flex-col gap-2 border-b border-sky-200/60 px-3 py-2.5 dark:border-white/10 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between sm:gap-3 sm:px-4 sm:py-3.5">
          <div className="flex min-w-0 items-center gap-2 sm:gap-3">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] bg-sky-500/15 text-sky-700 dark:text-sky-300 sm:h-10 sm:w-10 sm:rounded-2xl">
              <Sparkles className="h-4 w-4 sm:h-5 sm:w-5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-sky-700 dark:text-sky-300 sm:text-[11px] sm:tracking-[0.18em]">
                Shared AI Teacher PlayArea
              </p>
              <p className="mt-0.5 truncate font-display text-sm font-semibold text-slate-950 dark:text-white sm:mt-1 sm:text-base">
                {preview?.title || postTitle}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 mt-1 sm:mt-0 sm:flex sm:shrink-0 sm:flex-wrap sm:items-center">
            <a
              href={linkUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-8 items-center justify-center gap-1.5 rounded-full border border-slate-200 bg-white px-2 text-[10px] font-semibold text-slate-700 shadow-sm transition hover:border-sky-300 hover:bg-sky-50 dark:border-white/10 dark:bg-white/10 dark:text-white sm:h-10 sm:gap-2 sm:px-3.5 sm:text-[11px]"
            >
              <ExternalLink className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              Full screen
            </a>
            <button
              type="button"
              onClick={onImport}
              disabled={Boolean(importBusy)}
              className="inline-flex h-8 items-center justify-center gap-1.5 rounded-full bg-blue-600 px-2 text-[10px] font-semibold text-white shadow-[0_16px_30px_-22px_rgba(37,99,235,0.8)] transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-sky-400 dark:text-slate-950 dark:hover:bg-sky-300 sm:h-10 sm:gap-2 sm:px-3.5 sm:text-[11px]"
            >
              <Import className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              {importBusy ? "Importing..." : "Import & edit"}
            </button>
          </div>
        </div>

        <div className="grid gap-2 p-2 sm:gap-3 sm:p-3.5 lg:grid-cols-[minmax(0,1fr)_240px]">
          <div className="rounded-[14px] border border-white/80 bg-white/88 p-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.78)] dark:border-white/10 dark:bg-slate-950/45 sm:rounded-[22px] sm:p-4">
            {previewLoading ? (
              <div className="space-y-2 sm:space-y-3">
                <div className="h-3.5 w-2/3 animate-pulse rounded-full bg-app-secondary sm:h-5" />
                <div className="h-12 animate-pulse rounded-[14px] bg-app-secondary sm:h-20 sm:rounded-[18px]" />
                <div className="grid grid-cols-2 gap-2">
                  <div className="h-11 animate-pulse rounded-[14px] bg-app-secondary sm:h-16 sm:rounded-[18px]" />
                  <div className="h-11 animate-pulse rounded-[14px] bg-app-secondary sm:h-16 sm:rounded-[18px]" />
                </div>
              </div>
            ) : preview ? (
              <>
                <p className="line-clamp-1 text-[11px] leading-4 text-slate-600 dark:text-slate-300 sm:line-clamp-3 sm:text-sm sm:leading-6">
                  {preview.summary || preview.subtitle || "Open or import this editable AI Teacher study workspace."}
                </p>

                <div className="mt-2 grid grid-cols-2 gap-2 sm:mt-4">
                  {visibleSections.map((section) => (
                    <div key={section.id} className="rounded-[14px] border border-slate-200 bg-[#fffdf8] p-2 dark:border-white/10 dark:bg-slate-900/70 sm:rounded-[18px] sm:p-3">
                      <div className="flex items-center gap-1.5 sm:gap-2">
                        <span className="h-2 w-2 shrink-0 rounded-full sm:h-2.5 sm:w-2.5" style={{ backgroundColor: section.highlightColor || preview.appearance.highlightColor }} />
                        <p className="truncate text-[9px] font-semibold uppercase tracking-[0.12em] text-slate-400 sm:text-[11px] sm:tracking-[0.14em]">
                          {sectionLabel(section.type)}
                        </p>
                      </div>
                      <p className="mt-1 line-clamp-1 text-xs font-semibold text-slate-900 dark:text-white sm:mt-2 sm:text-sm">
                        {section.title || "Untitled section"}
                      </p>
                      <p className="mt-0.5 line-clamp-1 text-[10px] leading-4 text-slate-500 dark:text-slate-400 sm:mt-1 sm:line-clamp-2 sm:text-xs sm:leading-5">
                        {sectionPreviewText(section) || "Ready to edit after import."}
                      </p>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="rounded-[14px] border border-dashed border-slate-200 bg-white/70 px-3 py-5 text-center dark:border-white/10 dark:bg-slate-900/60 sm:rounded-[18px] sm:px-4 sm:py-8">
                <p className="text-xs font-semibold text-slate-900 dark:text-white sm:text-sm">Preview unavailable here</p>
                <p className="mt-1 text-[11px] leading-5 text-slate-500 dark:text-slate-400 sm:text-xs">Open full screen to retry loading the shared PlayArea.</p>
              </div>
            )}
          </div>

          <aside className="rounded-[14px] border border-white/80 bg-white/80 p-2.5 dark:border-white/10 dark:bg-slate-950/45 sm:rounded-[22px] sm:p-4">
            <p className="text-[9px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400 sm:text-[11px] sm:tracking-[0.18em]">Clone flow</p>
            <div className="mt-2 text-[11px] leading-4 text-slate-600 dark:text-slate-300 sm:mt-3 sm:space-y-3 sm:text-xs sm:leading-5">
              <p className="flex gap-1.5 sm:gap-2">
                <NotebookPen className="mt-0.5 h-3.5 w-3.5 shrink-0 text-blue-600 dark:text-sky-300 sm:h-4 sm:w-4" />
                Import creates a local editable copy on this device.
              </p>
              <p className="mt-1 flex gap-1.5 sm:mt-0 sm:gap-2">
                <Layers3 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-blue-600 dark:text-sky-300 sm:h-4 sm:w-4" />
                Notes, cards, quiz, mindmap, colours, and layout stay editable.
              </p>
            </div>
            {preview ? (
              <div className="mt-2 flex flex-wrap gap-1.5 text-[9px] font-semibold text-slate-500 dark:text-slate-400 sm:mt-4 sm:gap-2 sm:text-[10px]">
                <span className="rounded-full bg-slate-100 px-2 py-0.5 dark:bg-white/10 sm:px-2.5 sm:py-1">
                  {preview.sections.length} section{preview.sections.length === 1 ? "" : "s"}
                </span>
                {remainingSections > 0 ? (
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 dark:bg-white/10 sm:px-2.5 sm:py-1">
                    +{remainingSections} more
                  </span>
                ) : null}
              </div>
            ) : null}
          </aside>
        </div>
      </div>
    </div>
  );
}
