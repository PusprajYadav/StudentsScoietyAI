import { useRef, useState } from "react";
import ReactPlayer from "react-player";
import { Clock3, FolderClosed, StickyNote, Video } from "lucide-react";
import { buildExternalVideoUrl, formatTime } from "../tools/study-notes/helpers";
import type { StudyNotesSharedPostPreview } from "../tools/study-notes/types";
import { RichPostContent } from "../RichPostContent";
interface StudyNotesShareCardProps {
  postContent: string;
  postTitle: string;
  preview: StudyNotesSharedPostPreview | null;
  previewLoading: boolean;
  importBusy?: boolean;
  onImport: () => void;
}

function buildTimestampedVideoUrl(linkUrl: string, seconds: number) {
  if (!linkUrl) {
    return "";
  }

  const targetSeconds = Math.max(0, Math.floor(seconds));

  if (targetSeconds <= 0) {
    return linkUrl;
  }

  try {
    const parsed = new URL(linkUrl);
    const hostname = parsed.hostname.toLowerCase();

    if (
      hostname.includes("youtube.com") ||
      hostname.includes("youtu.be") ||
      hostname.includes("youtube-nocookie.com")
    ) {
      parsed.searchParams.set("t", String(targetSeconds));
      return parsed.toString();
    }

    parsed.hash = `t=${targetSeconds}`;
    return parsed.toString();
  } catch {
    return linkUrl;
  }
}

export function StudyNotesShareCard({
  postContent,
  postTitle,
  preview,
  previewLoading,
  importBusy,
  onImport,
}: StudyNotesShareCardProps) {
  const playerRef = useRef<ReactPlayer | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [activeEntryId, setActiveEntryId] = useState<string | null>(null);
  const [timelineExpanded, setTimelineExpanded] = useState(false);
  const linkedVideoUrl = buildExternalVideoUrl(preview?.videoUrl || "");
  const canEmbedVideo = Boolean(preview?.videoUrl) && ReactPlayer.canPlay(preview.videoUrl);
  const timelineEntries = preview?.entries || [];
  const visibleEntries = timelineExpanded ? timelineEntries : timelineEntries.slice(0, 3);
  const hiddenTimelineCount = Math.max(0, timelineEntries.length - 3);

  const handleTimelineClick = (entryId: string, timestampSeconds: number) => {
    setActiveEntryId(entryId);

    if (canEmbedVideo) {
      playerRef.current?.seekTo(timestampSeconds, "seconds");
      setIsPlaying(true);
      return;
    }

    if (linkedVideoUrl && typeof window !== "undefined") {
      window.open(buildTimestampedVideoUrl(linkedVideoUrl, timestampSeconds), "_blank", "noopener,noreferrer");
    }
  };

  return (
    <div className="min-w-0 space-y-3">
      <RichPostContent content={postContent} />

      <div className="min-w-0 overflow-hidden rounded-[18px] border border-app-border bg-[#f8fafc] dark:bg-[linear-gradient(180deg,rgba(10,16,30,0.98),rgba(7,12,24,0.98))] sm:rounded-[22px]">
        <div className="flex items-start justify-between gap-2 border-b border-app-border px-3 py-2.5 sm:px-4 sm:py-3">
          <div className="flex min-w-0 items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand/10 text-brand">
              <FolderClosed className="h-3.5 w-3.5" />
            </span>
            <div className="min-w-0">
              <p className="truncate text-[11px] font-semibold text-app-text sm:text-[13px]">Shared Video Notes Maker</p>
              <p className="truncate text-[10px] text-app-muted sm:text-[11px]">
                {preview
                  ? `${preview.entryCount} note${preview.entryCount === 1 ? "" : "s"} ready to import`
                  : "Compact video and notes preview loading."}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onImport}
            disabled={Boolean(importBusy)}
            className="shrink-0 rounded-full border border-brand/30 bg-white px-2.5 py-1.5 text-[10px] font-semibold text-brand shadow-sm transition hover:bg-brand/5 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-brand/10 dark:text-blue-200 dark:hover:bg-brand/15"
          >
            {importBusy ? "Importing..." : "Import"}
          </button>
        </div>

        <div className="p-2.5 sm:p-4">
          <div className="grid min-w-0 gap-3 lg:grid-cols-[minmax(0,1fr)_290px]">
            <div className="min-w-0 space-y-3">
              <div className="min-w-0 rounded-[18px] border border-app-border bg-white p-2 shadow-[0_18px_40px_-28px_rgba(15,23,42,0.16)] dark:bg-slate-950/55 dark:shadow-[0_18px_40px_-28px_rgba(2,6,23,0.85)] sm:p-2.5">
                <div className="min-w-0 overflow-hidden rounded-[16px] border border-app-border bg-slate-950 shadow-[0_18px_40px_-28px_rgba(15,23,42,0.45)]">
                  {previewLoading ? (
                    <div className="aspect-video w-full animate-pulse bg-app-secondary/70" />
                  ) : canEmbedVideo ? (
                    <div className="aspect-video">
                      <ReactPlayer
                        ref={playerRef}
                        url={preview.videoUrl}
                        width="100%"
                        height="100%"
                        playing={isPlaying}
                        controls
                        playsinline
                        onPlay={() => setIsPlaying(true)}
                        onPause={() => setIsPlaying(false)}
                        config={{
                          youtube: {
                            playerVars: {
                              playsinline: 1,
                              rel: 0,
                              modestbranding: 1,
                              iv_load_policy: 3,
                            },
                            embedOptions: {
                              host: "https://www.youtube-nocookie.com",
                            },
                          },
                        }}
                      />
                    </div>
                  ) : preview?.previewImageDataUrl ? (
                    <img
                      src={preview.previewImageDataUrl}
                      alt={preview.title || postTitle}
                      className="aspect-video w-full object-cover"
                    />
                  ) : (
                    <div className="flex aspect-video w-full items-center justify-center bg-[radial-gradient(circle_at_top,rgba(37,99,235,0.16),transparent_38%),linear-gradient(180deg,#0f172a,#1e293b)] px-6 text-center text-sm text-slate-200">
                      Shared lecture video preview
                    </div>
                  )}
                </div>
              </div>

              <div className="min-w-0 rounded-[16px] border border-app-border bg-white px-2.5 py-2.5 dark:bg-slate-950/45">
                <div className="flex min-w-0 items-center gap-2">
                  <span className="min-w-0 flex-1 truncate font-display text-[14px] font-semibold text-app-text">
                    {preview?.folderName || postTitle}
                  </span>
                  {preview?.owner?.username ? (
                    <span className="shrink-0 text-[10px] text-app-muted">@{preview.owner.username}</span>
                  ) : null}
                </div>

                <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[10px] text-app-muted">
                  <span className="rounded-full bg-app-secondary px-2 py-1 whitespace-nowrap">
                    <StickyNote className="mr-1 inline h-3 w-3 text-brand" />
                    {preview?.entryCount || 0} note{preview?.entryCount === 1 ? "" : "s"}
                  </span>
                  <span className="rounded-full bg-app-secondary px-2 py-1 whitespace-nowrap">
                    {preview?.attachmentCount || 0} image{preview?.attachmentCount === 1 ? "" : "s"}
                  </span>
                  {preview && preview.latestTimestampSeconds > 0 ? (
                    <span className="rounded-full bg-app-secondary px-2 py-1 whitespace-nowrap">
                      <Clock3 className="mr-1 inline h-3 w-3 text-brand" />
                      {formatTime(preview.latestTimestampSeconds)}
                    </span>
                  ) : null}
                </div>

                {linkedVideoUrl ? (
                  <a
                    href={linkedVideoUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-2 inline-flex max-w-full items-center gap-1 rounded-full bg-app-card px-2.5 py-1 text-[10px] font-semibold text-app-text transition hover:text-brand dark:bg-slate-900/80"
                  >
                    <Video className="h-3 w-3" />
                    Open linked video
                  </a>
                ) : null}
              </div>
            </div>

            <aside className="min-w-0 overflow-hidden rounded-[18px] border border-app-border bg-white dark:bg-slate-950/45">
              <div className="border-b border-app-border px-3 py-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-app-muted">Notes timeline</p>
                    <p className="mt-1 text-[11px] text-app-muted">
                      {canEmbedVideo ? "Tap a note to jump the video there." : "Tap a note to open the source video there."}
                    </p>
                  </div>
                  {preview ? (
                    <span className="rounded-full bg-app-secondary px-2 py-1 text-[9px] font-semibold text-app-muted">
                      {preview.entries.length} items
                    </span>
                  ) : null}
                </div>
              </div>

              <div className="min-w-0 space-y-2 p-2">
                {previewLoading
                  ? Array.from({ length: 4 }).map((_, index) => (
                      <div key={index} className="h-14 animate-pulse rounded-[14px] bg-app-secondary/70" />
                    ))
                  : timelineEntries.length
                    ? (
                        <div className="max-w-full overflow-x-auto pb-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                          <div className="flex w-max min-w-full snap-x snap-mandatory gap-2">
                            {visibleEntries.map((entry) => (
                              <button
                                key={entry.id}
                                type="button"
                                onClick={() => handleTimelineClick(entry.id, entry.timestampSeconds)}
                                className={`w-[132px] shrink-0 snap-start rounded-[14px] border px-2 py-2.5 text-left transition sm:w-[156px] ${
                                  activeEntryId === entry.id
                                    ? "border-brand/35 bg-brand/5"
                                    : "border-app-border bg-app-secondary/30 hover:border-brand/25 hover:bg-brand/5 dark:bg-slate-900/80"
                                }`}
                              >
                                <div className="flex items-start gap-2">
                                  <span className="shrink-0 rounded-full bg-brand/10 px-2 py-1 text-[10px] font-semibold text-brand">
                                    {formatTime(entry.timestampSeconds)}
                                  </span>
                                  <div className="min-w-0">
                                    <p className="line-clamp-1 text-[12px] font-semibold text-app-text">{entry.title}</p>
                                    <p className="mt-1 line-clamp-2 text-[10px] leading-4 text-app-muted">{entry.summary}</p>
                                    {entry.attachmentCount > 0 ? (
                                      <p className="mt-1 text-[10px] font-medium text-app-muted">
                                        {entry.attachmentCount} image{entry.attachmentCount === 1 ? "" : "s"}
                                      </p>
                                    ) : null}
                                  </div>
                                </div>
                              </button>
                            ))}
                          </div>
                        </div>
                      )
                    : (
                      <div className="rounded-[14px] border border-dashed border-app-border bg-app-secondary/20 px-3 py-4 text-[12px] text-app-muted">
                        No note preview is available yet.
                      </div>
                    )}

                {!previewLoading && hiddenTimelineCount > 0 ? (
                  <button
                    type="button"
                    onClick={() => setTimelineExpanded((current) => !current)}
                    className="block w-full rounded-[12px] border border-app-border bg-app-card px-3 py-2 text-center text-[10px] font-semibold text-app-text transition hover:border-brand/25 hover:text-brand dark:bg-slate-900/80 sm:text-[11px]"
                  >
                    {timelineExpanded ? "Show less" : `More notes (${hiddenTimelineCount})`}
                  </button>
                ) : null}
              </div>
            </aside>
          </div>
        </div>
      </div>
    </div>
  );
}
