import { ExternalLink, FolderClosed, Import, PlayCircle, StickyNote } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { loadPublicStudentStudyNotesShare } from "../components/tools/study-notes/api";
import type { StudyNotesShareRecord } from "../components/tools/study-notes/types";
import {
  buildEntryDisplayTitle,
  buildEntrySummary,
  buildExternalVideoUrl,
  buildPublicStudyNotesPath,
  formatTime,
  importStudyNotesSnapshotToLocal,
} from "../components/tools/study-notes/helpers";

export function PublicStudyNotesPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { shareSlug = "", username = "" } = useParams<{ shareSlug: string; username: string }>();
  const [share, setShare] = useState<StudyNotesShareRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);

  useEffect(() => {
    let disposed = false;
    setLoading(true);

    void loadPublicStudentStudyNotesShare(shareSlug)
      .then((item) => {
        if (disposed) {
          return;
        }

        const canonicalPath = buildPublicStudyNotesPath(item.share_slug, item.owner?.username || username || "student");
        if (location.pathname !== canonicalPath) {
          navigate(canonicalPath, { replace: true });
          return;
        }

        setShare(item);
        setLoading(false);
      })
      .catch((error) => {
        if (disposed) {
          return;
        }

        toast.error(error instanceof Error ? error.message : "Could not load this shared Video Notes Maker folder.");
        setShare(null);
        setLoading(false);
      });

    return () => {
      disposed = true;
    };
  }, [location.pathname, navigate, shareSlug, username]);

  const sortedEntries = useMemo(
    () =>
      share?.snapshot.entries
        .slice()
        .sort((left, right) => left.timestampSeconds - right.timestampSeconds) || [],
    [share]
  );
  const externalVideoUrl = useMemo(
    () => buildExternalVideoUrl(share?.video_url || share?.snapshot.folder.videoUrl || ""),
    [share]
  );

  if (loading) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
        <div className="surface-card rounded-[30px] p-6 text-center text-app-muted">Loading shared Video Notes Maker...</div>
      </div>
    );
  }

  if (!share) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
        <div className="surface-card rounded-[30px] p-6 text-center">
          <p className="font-display text-2xl font-semibold text-app-text">Video Notes Maker share not found</p>
          <p className="mt-2 text-sm text-app-muted">This shared folder may have been removed or the link is no longer valid.</p>
          <Link to="/app/myroom/video-notes-maker" className="btn-primary mt-5 inline-flex">
            Open Video Notes Maker
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
      <div className="space-y-4">
        <section className="surface-card rounded-[30px] p-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="max-w-3xl">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand">Shared Video Notes Maker</p>
              <h1 className="mt-2 font-display text-[1.6rem] font-semibold tracking-tight text-app-text sm:text-[2rem]">
                {share.title}
              </h1>
              <p className="mt-2 text-sm leading-6 text-app-muted">
                Folder <strong>{share.folder_name}</strong>
                {share.owner?.username ? ` by @${share.owner.username}` : ""}. Importing creates a complete local copy with
                the linked video, timestamps, transcript, notes, and images.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {externalVideoUrl ? (
                <a
                  href={externalVideoUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="btn-secondary inline-flex items-center gap-2 !px-4 !py-2.5"
                >
                  <PlayCircle className="h-4 w-4" />
                  Open video
                </a>
              ) : null}
              <button
                type="button"
                onClick={() => {
                  setImporting(true);

                  try {
                    const imported = importStudyNotesSnapshotToLocal({
                      snapshot: share.snapshot,
                      sourceShareSlug: share.share_slug,
                    });
                    toast.success("Video Notes Maker folder imported locally.");
                    navigate(`/app/myroom/video-notes-maker?folder=${imported.folder.id}`);
                  } catch (error) {
                    toast.error(error instanceof Error ? error.message : "Could not import this shared folder.");
                  } finally {
                    setImporting(false);
                  }
                }}
                className="btn-primary inline-flex items-center gap-2 !px-4 !py-2.5"
                disabled={importing}
              >
                <Import className="h-4 w-4" />
                {importing ? "Importing..." : "Import to Video Notes Maker"}
              </button>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2 text-xs text-app-muted">
            <span className="rounded-full bg-app-secondary px-3 py-1.5">
              <FolderClosed className="mr-1 inline h-3.5 w-3.5 text-brand" />
              {share.entry_count} note{share.entry_count === 1 ? "" : "s"}
            </span>
            <span className="rounded-full bg-app-secondary px-3 py-1.5">
              <StickyNote className="mr-1 inline h-3.5 w-3.5 text-brand" />
              {share.attachment_count} image{share.attachment_count === 1 ? "" : "s"}
            </span>
            {share.latest_timestamp_seconds > 0 ? (
              <span className="rounded-full bg-app-secondary px-3 py-1.5">Latest timestamp {formatTime(share.latest_timestamp_seconds)}</span>
            ) : null}
            {externalVideoUrl ? (
              <a
                href={externalVideoUrl}
                target="_blank"
                rel="noreferrer"
                className="rounded-full bg-app-card px-3 py-1.5 text-app-text transition hover:text-brand"
              >
                <ExternalLink className="mr-1 inline h-3.5 w-3.5" />
                Source video
              </a>
            ) : null}
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="space-y-3">
            {sortedEntries.map((entry) => (
              <article key={entry.id} className="surface-card rounded-[28px] p-4 sm:p-5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-brand/10 px-3 py-1.5 text-xs font-semibold text-brand">
                    {formatTime(entry.timestampSeconds)}
                  </span>
                  {entry.tags.map((tag) => (
                    <span key={tag} className="rounded-full bg-app-secondary px-2.5 py-1 text-[11px] font-semibold text-app-muted">
                      #{tag}
                    </span>
                  ))}
                </div>

                <h2 className="mt-3 font-display text-lg font-semibold text-app-text">{buildEntryDisplayTitle(entry)}</h2>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-app-muted">{entry.body.trim() || buildEntrySummary(entry)}</p>

                {entry.attachments.length ? (
                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    {entry.attachments.map((attachment) => (
                      <div key={attachment.id} className="overflow-hidden rounded-[20px] border border-app-border bg-app-card">
                        <img src={attachment.dataUrl} alt={attachment.name} className="h-40 w-full object-cover" />
                      </div>
                    ))}
                  </div>
                ) : null}
              </article>
            ))}
          </div>

          <aside className="space-y-4">
            <div className="surface-card rounded-[28px] p-4 sm:p-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-app-muted">Transcript</p>
              <div className="mt-3 rounded-[22px] border border-app-border bg-app-secondary/30 p-4">
                <p className="whitespace-pre-wrap text-sm leading-6 text-app-muted">
                  {share.snapshot.folder.transcriptText.trim() || "No transcript was shared with this folder."}
                </p>
              </div>
            </div>

            <div className="surface-card rounded-[28px] p-4 sm:p-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-app-muted">Import result</p>
              <p className="mt-3 text-sm leading-6 text-app-muted">
                Importing saves a new folder in your local Video Notes Maker workspace. The imported copy keeps the shared video
                link, transcript, timestamps, note text, and images so you can continue working offline on your own device.
              </p>
            </div>
          </aside>
        </section>
      </div>
    </div>
  );
}
