import ReactPlayer from "react-player";
import {
  AlertCircle,
  Clock3,
  Download,
  ExternalLink,
  FileJson,
  FileText,
  FolderClosed,
  FolderPlus,
  ImagePlus,
  Pause,
  PencilLine,
  Play,
  Plus,
  Search,
  Share2,
  Trash2,
  Upload,
  Video,
} from "lucide-react";
import type { Dispatch, SetStateAction } from "react";
import { buildEntryDisplayTitle, buildEntrySummary, DEFAULT_FOLDER_NAME, formatTime } from "./helpers";
import type { StudyNoteAttachment, StudyNoteEntry, StudyNoteFolder, TranscriptSegment } from "./types";
import type { CommunityRow } from "../../../types/database";
import type { PlannerShareCategory } from "../../../lib/plannerPost";
import { getPlannerShareCategoryLabel } from "../../../lib/plannerPost";

export interface StudyNotesShareState {
  open: boolean;
  destination: "discussion" | "community";
  category: PlannerShareCategory;
  communityId: string;
  title: string;
  note: string;
  loading: boolean;
  submitting: boolean;
}

export function StudyNotesHeader({
  showTitleBlock = true,
  folderCount,
  entryCount,
}: {
  showTitleBlock?: boolean;
  folderCount: number;
  entryCount: number;
}) {
  if (!showTitleBlock) {
    return null;
  }

  return (
    <section className="surface-card rounded-[30px] p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-2xl">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-brand">My Room workspace</p>
          <h1 className="mt-2 font-display text-[1.55rem] font-semibold tracking-tight text-app-text sm:text-[1.8rem]">
            Video Notes Maker
          </h1>
          <p className="mt-2 text-sm leading-6 text-app-muted">
            Turn lectures into timestamped notes with folders, images, and transcript support around the current playback
            time.
          </p>
        </div>

        <div className="rounded-[26px] border border-app-border bg-app-secondary/60 px-4 py-3 text-sm text-app-muted">
          <p className="font-semibold text-app-text">{entryCount} saved notes</p>
          <p className="mt-1">{folderCount} folders saved locally on this device.</p>
        </div>
      </div>
    </section>
  );
}

export function StudyNotesWorkspaceHeader({
  showTitleBlock = true,
  folderCount,
  entryCount,
  activeFolderId,
  activeFolderName,
  activeFolderHasVideo,
  entryCountByFolderId,
  exportingPdf,
  folders,
  onClearAll,
  onExportJson,
  onExportPdf,
  onImportJson,
  onOpenCreateFolder,
  onOpenRenameFolder,
  onSelectFolder,
  onShareToFeed,
}: {
  showTitleBlock?: boolean;
  folderCount: number;
  entryCount: number;
  activeFolderId: string;
  activeFolderName: string;
  activeFolderHasVideo: boolean;
  entryCountByFolderId: Map<string, number>;
  exportingPdf: boolean;
  folders: StudyNoteFolder[];
  onClearAll: () => void;
  onExportJson: () => void;
  onExportPdf: () => void;
  onImportJson: () => void;
  onOpenCreateFolder: () => void;
  onOpenRenameFolder: () => void;
  onSelectFolder: (folderId: string) => void;
  onShareToFeed: () => void;
}) {
  return (
    <section className="surface-card rounded-[30px] p-3.5 sm:p-5">
      {showTitleBlock ? (
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between">
          <div className="max-w-2xl">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand">My Room workspace</p>
            <h1 className="mt-1 font-display text-[1.25rem] font-semibold tracking-tight text-app-text sm:text-[1.7rem]">
              Video Notes Maker
            </h1>
            <p className="mt-1 text-xs text-app-muted sm:text-sm">Video first, notes next, capture below.</p>
          </div>

          <div className="flex flex-wrap gap-1.5 text-[10px] sm:gap-2 sm:text-[11px]">
            <span className="rounded-full bg-app-secondary px-3 py-1.5 font-semibold text-app-text">
              {entryCount} note{entryCount === 1 ? "" : "s"}
            </span>
            <span className="rounded-full bg-app-secondary px-3 py-1.5 font-semibold text-app-text">
              {folderCount} folder{folderCount === 1 ? "" : "s"}
            </span>
            <span className="rounded-full bg-app-secondary px-3 py-1.5 font-semibold text-app-text">
              {activeFolderName || DEFAULT_FOLDER_NAME}
            </span>
            <span
              className={`rounded-full px-3 py-1.5 font-semibold ${
                activeFolderHasVideo ? "bg-brand/10 text-brand" : "bg-amber-100 text-amber-900"
              }`}
            >
              {activeFolderHasVideo ? "Video linked" : "Add video"}
            </span>
          </div>
        </div>
      ) : null}

      <div className={`${showTitleBlock ? "mt-4" : ""} overflow-x-auto pb-1`}>
        <div className="flex w-max gap-2 pr-1">
          <button type="button" onClick={onShareToFeed} className="btn-primary gap-2 !px-3 !py-2.5 text-xs sm:!px-4 sm:text-sm">
            <Share2 className="h-4 w-4" />
            Share to Feed
          </button>
          <button type="button" onClick={onOpenCreateFolder} className="btn-secondary gap-2 !px-3 !py-2.5 text-xs sm:!px-3.5">
            <FolderPlus className="h-4 w-4" />
            Create Folder
          </button>
          <button
            type="button"
            onClick={onOpenRenameFolder}
            disabled={!activeFolderId}
            className="btn-secondary gap-2 !px-3 !py-2.5 text-xs disabled:cursor-not-allowed disabled:opacity-60 sm:!px-3.5"
          >
            <PencilLine className="h-4 w-4" />
            Edit Folder
          </button>
          <button type="button" onClick={onExportJson} className="btn-secondary gap-2 !px-3 !py-2.5 text-xs sm:!px-3.5">
            <FileJson className="h-4 w-4" />
            JSON
          </button>
          <button type="button" onClick={onExportPdf} disabled={exportingPdf} className="btn-secondary gap-2 !px-3 !py-2.5 text-xs sm:!px-3.5">
            <Download className="h-4 w-4" />
            {exportingPdf ? "PDF..." : "PDF"}
          </button>
          <button type="button" onClick={onImportJson} className="btn-secondary gap-2 !px-3 !py-2.5 text-xs sm:!px-3.5">
            <Upload className="h-4 w-4" />
            Import
          </button>
          <button type="button" onClick={onClearAll} className="btn-secondary gap-2 !px-3 !py-2.5 text-xs text-rose-600 sm:!px-3.5">
            <Trash2 className="h-4 w-4" />
            Clear
          </button>
          {folders.map((folder) => (
            <button
              key={folder.id}
              type="button"
              onClick={() => onSelectFolder(folder.id)}
              className={`inline-flex items-center gap-2 rounded-full px-3.5 py-2 text-xs font-semibold transition ${
                activeFolderId === folder.id
                  ? "bg-brand text-white"
                  : "border border-app-border bg-app-secondary/30 text-app-muted hover:text-brand"
              }`}
            >
              <FolderClosed className="h-3.5 w-3.5" />
              {folder.name}
              <span className={`rounded-full px-2 py-0.5 text-[10px] ${activeFolderId === folder.id ? "bg-white/20 text-white" : "bg-white text-app-muted"}`}>
                {entryCountByFolderId.get(folder.id) || 0}
              </span>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}

export function StudyNotesFolderSheet({
  open,
  mode,
  activeFolderName,
  draft,
  onChangeDraft,
  onClose,
  onSubmit,
}: {
  open: boolean;
  mode: "create" | "rename";
  activeFolderName?: string | null;
  draft: string;
  onChangeDraft: (value: string) => void;
  onClose: () => void;
  onSubmit: () => void;
}) {
  if (!open) {
    return null;
  }

  const isCreate = mode === "create";

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/55 p-3 sm:items-center sm:p-6">
      <div className="surface-card w-full max-w-md rounded-[28px] p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-app-muted">Folder</p>
            <h2 className="mt-1 font-display text-[1.2rem] font-semibold tracking-tight text-app-text sm:text-[1.35rem]">
              {isCreate ? "Create Folder" : "Rename Folder"}
            </h2>
            <p className="mt-1 text-xs text-app-muted">
              {isCreate ? "Add a new study folder." : `Rename ${activeFolderName || DEFAULT_FOLDER_NAME}.`}
            </p>
          </div>
          <button type="button" onClick={onClose} className="btn-secondary text-xs">
            Close
          </button>
        </div>

        <label className="mt-4 block">
          <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-app-muted">
            {isCreate ? "Folder Name" : "New Name"}
          </span>
          <input
            value={draft}
            onChange={(event) => onChangeDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                onSubmit();
              }
            }}
            placeholder={isCreate ? "New folder" : "Rename selected folder"}
            className="input-field mt-2"
            autoFocus
          />
        </label>

        <div className="mt-4 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="btn-secondary !px-4 !py-2.5 text-xs">
            Cancel
          </button>
          <button type="button" onClick={onSubmit} className="btn-primary !px-4 !py-2.5 text-xs">
            {isCreate ? "Create Folder" : "Save Name"}
          </button>
        </div>
      </div>
    </div>
  );
}

export function StudyVideoPanel({
  activeFolderName,
  currentTime,
  duration,
  externalVideoUrl,
  isPlaying,
  isYouTubeSource,
  videoUrl,
  videoErrorMessage,
  videoUrlInput,
  onChangeVideoUrlInput,
  onLoadVideo,
  onPlayerError,
  onTogglePlayback,
  playerRef,
  onDuration,
  onPause,
  onPlay,
  onProgress,
}: {
  activeFolderName?: string | null;
  currentTime: number;
  duration: number;
  externalVideoUrl?: string;
  isPlaying: boolean;
  isYouTubeSource: boolean;
  videoUrl: string;
  videoErrorMessage: string | null;
  videoUrlInput: string;
  onChangeVideoUrlInput: (value: string) => void;
  onLoadVideo: () => void;
  onPlayerError: () => void;
  onTogglePlayback: () => void;
  playerRef: React.RefObject<ReactPlayer | null>;
  onDuration: (value: number) => void;
  onPause: () => void;
  onPlay: () => void;
  onProgress: (value: { playedSeconds: number }) => void;
}) {
  return (
    <article className="surface-card rounded-[30px] p-4 sm:p-5">
      <div className="flex flex-wrap items-center gap-3">
        <div className="rounded-2xl bg-brand/10 p-3 text-brand">
          <Video className="h-5 w-5" />
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-app-text">Lecture source</p>
          <p className="text-xs text-app-muted">Paste a lecture link and start from the right timestamp.</p>
        </div>

        <button type="button" onClick={onLoadVideo} className="btn-primary gap-2 !px-4 !py-2.5">
          Load video
        </button>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
        <input
          value={videoUrlInput}
          onChange={(event) => onChangeVideoUrlInput(event.target.value)}
          placeholder="Paste a lecture or YouTube URL"
          className="input-shell"
        />
        <button
          type="button"
          onClick={onTogglePlayback}
          className="btn-secondary gap-2 !px-4 !py-3"
          disabled={!videoUrl}
        >
          {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          {isPlaying ? "Pause" : "Play"}
        </button>
      </div>

      {isYouTubeSource ? (
        <p className="mt-3 text-xs text-app-muted">YouTube uses the cookie-free player.</p>
      ) : null}

      <div className="mt-4 overflow-hidden rounded-[28px] border border-app-border bg-slate-950 shadow-[0_24px_64px_-44px_rgba(2,6,23,0.85)]">
        {videoUrl ? (
          <ReactPlayer
            ref={playerRef}
            url={videoUrl}
            width="100%"
            height="min(56vw, 420px)"
            playing={isPlaying}
            controls
            playsinline
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
            onError={onPlayerError}
            onPlay={onPlay}
            onPause={onPause}
            onDuration={onDuration}
            onProgress={onProgress}
          />
        ) : (
          <div className="flex min-h-[280px] items-center justify-center px-6 text-center text-sm text-slate-300">
            Load a lecture URL to start taking notes.
          </div>
        )}
      </div>

      {videoErrorMessage ? (
        <div className="mt-4 rounded-[24px] border border-amber-300/50 bg-amber-50 px-4 py-4 text-amber-950">
          <div className="flex flex-wrap items-start gap-3">
            <AlertCircle className="mt-0.5 h-5 w-5 text-amber-600" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold">Playback needs attention</p>
              <p className="mt-1 text-sm leading-6 text-amber-900/80">{videoErrorMessage}</p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <button type="button" onClick={onLoadVideo} className="btn-secondary !px-3.5 !py-2 text-xs">
                  Reload video
                </button>
                {externalVideoUrl ? (
                  <a
                    href={externalVideoUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 rounded-2xl border border-amber-300/60 bg-white px-3.5 py-2 text-xs font-semibold text-amber-900 transition hover:border-amber-400"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    Open source
                  </a>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-app-muted">
        <span className="inline-flex items-center gap-2 rounded-full bg-app-secondary px-3 py-2">
          <Clock3 className="h-4 w-4 text-brand" />
          {formatTime(currentTime)} / {formatTime(duration)}
        </span>
        <span className="inline-flex items-center gap-2 rounded-full bg-app-card px-3 py-2 text-app-text">
          <FolderClosed className="h-4 w-4 text-brand" />
          {activeFolderName || DEFAULT_FOLDER_NAME}
        </span>
      </div>
    </article>
  );
}

export function EntryComposerPanel({
  activeFolderName,
  attachments,
  currentTime,
  editingEntryId,
  entryBodyDraft,
  tagsDraft,
  titleDraft,
  onAddImage,
  onChangeBody,
  onChangeTags,
  onChangeTitle,
  onClearEntry,
  onRemoveAttachment,
  onSaveEntry,
}: {
  activeFolderName?: string | null;
  attachments: StudyNoteAttachment[];
  currentTime: number;
  editingEntryId: string | null;
  entryBodyDraft: string;
  tagsDraft: string;
  titleDraft: string;
  onAddImage: () => void;
  onChangeBody: (value: string) => void;
  onChangeTags: (value: string) => void;
  onChangeTitle: (value: string) => void;
  onClearEntry: () => void;
  onRemoveAttachment: (attachmentId: string) => void;
  onSaveEntry: () => void;
}) {
  return (
    <article className="surface-card rounded-[30px] p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-app-text">
            {editingEntryId ? "Edit note" : "Capture note"}
          </p>
          <p className="text-xs text-app-muted">Quick note at {formatTime(currentTime)} in {activeFolderName || DEFAULT_FOLDER_NAME}.</p>
        </div>

        <button type="button" onClick={onAddImage} className="btn-secondary gap-2 !px-3.5 !py-2.5">
          <ImagePlus className="h-4 w-4" />
          Add image
        </button>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-app-muted">
        <span className="rounded-full bg-app-secondary px-3 py-1.5">{activeFolderName || DEFAULT_FOLDER_NAME}</span>
        <span className="rounded-full bg-app-secondary px-3 py-1.5">{formatTime(currentTime)}</span>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <input
          value={titleDraft}
          onChange={(event) => onChangeTitle(event.target.value)}
          placeholder="Title"
          className="input-field"
        />
        <input
          value={tagsDraft}
          onChange={(event) => onChangeTags(event.target.value)}
          placeholder="Tags"
          className="input-field"
        />
      </div>

      <textarea
        value={entryBodyDraft}
        onChange={(event) => onChangeBody(event.target.value)}
        placeholder="Write the key point for this moment..."
        className="input-field mt-3 min-h-[90px] resize-y sm:min-h-[120px]"
      />

      {attachments.length ? (
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {attachments.map((attachment) => (
            <div key={attachment.id} className="overflow-hidden rounded-[24px] border border-app-border bg-app-secondary/40">
              <img src={attachment.dataUrl} alt={attachment.name} className="h-40 w-full object-cover" />
              <div className="flex items-center justify-between gap-3 px-3 py-3">
                <p className="min-w-0 truncate text-xs font-medium text-app-text">{attachment.name}</p>
                <button
                  type="button"
                  onClick={() => onRemoveAttachment(attachment.id)}
                  className="rounded-full bg-rose-500/10 px-2.5 py-1 text-xs font-semibold text-rose-600"
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : null}

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button type="button" onClick={onSaveEntry} className="btn-primary !px-4 !py-2.5">
          {editingEntryId ? "Update note" : `Save note at ${formatTime(currentTime)}`}
        </button>

        <button type="button" onClick={onClearEntry} className="btn-secondary !px-4 !py-2.5">
          Clear
        </button>
      </div>
    </article>
  );
}

export function TranscriptHelperPanel({
  currentTime,
  nearbyEntries,
  transcriptSegmentsCount,
  transcriptText,
  transcriptWindow,
  onChangeTranscript,
  onEditEntry,
  onImportTranscript,
  onUseTranscriptWindow,
}: {
  currentTime: number;
  nearbyEntries: StudyNoteEntry[];
  transcriptSegmentsCount: number;
  transcriptText: string;
  transcriptWindow: TranscriptSegment[];
  onChangeTranscript: (value: string) => void;
  onEditEntry: (entry: StudyNoteEntry) => void;
  onImportTranscript: () => void;
  onUseTranscriptWindow: () => void;
}) {
  return (
    <article className="surface-card rounded-[30px] p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-app-text">Transcript helper</p>
          <p className="text-xs text-app-muted">Transcript near the current time.</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={onImportTranscript} className="btn-secondary gap-2 !px-3.5 !py-2.5 text-xs">
            <Upload className="h-4 w-4" />
            Import transcript
          </button>
          <button
            type="button"
            onClick={onUseTranscriptWindow}
            className="btn-secondary gap-2 !px-3.5 !py-2.5 text-xs"
          >
            <Plus className="h-4 w-4" />
            Add +/-10s to note
          </button>
        </div>
      </div>

      <textarea
        value={transcriptText}
        onChange={(event) => onChangeTranscript(event.target.value)}
        placeholder={"Paste transcript lines like:\n00:10 Opening idea\n00:18 Important concept"}
        className="input-field mt-4 min-h-[140px] resize-y"
      />

      <div className="mt-4 rounded-[24px] border border-app-border bg-app-secondary/30 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm font-semibold text-app-text">Around {formatTime(currentTime)}</p>
          <span className="text-xs text-app-muted">{transcriptSegmentsCount} parsed transcript lines</span>
        </div>

        <div className="mt-3 space-y-2">
          {transcriptWindow.length ? (
            transcriptWindow.map((segment) => (
              <div key={segment.id} className="rounded-[18px] border border-app-border bg-app-card px-3 py-3">
                <p className="text-xs font-semibold text-brand">{formatTime(segment.startSeconds)}</p>
                <p className="mt-1 text-sm leading-6 text-app-muted">{segment.text}</p>
              </div>
            ))
          ) : (
            <p className="text-sm text-app-muted">
              No transcript lines were found within 10 seconds of the current playback time.
            </p>
          )}
        </div>

        {nearbyEntries.length ? (
          <div className="mt-4">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-app-muted">Nearby Notes</p>
            <div className="mt-2 space-y-2">
              {nearbyEntries.map((entry) => (
                <button
                  key={entry.id}
                  type="button"
                  onClick={() => onEditEntry(entry)}
                  className="w-full rounded-[18px] border border-app-border bg-app-card px-3 py-3 text-left transition hover:border-brand/20"
                >
                  <p className="text-xs font-semibold text-brand">{formatTime(entry.timestampSeconds)}</p>
                  <p className="mt-1 text-sm text-app-muted">{buildEntrySummary(entry)}</p>
                </button>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </article>
  );
}

export function LibraryActionsPanel({
  activeFolderEntryCount,
  activeFolderHasVideo,
  activeFolderName,
  exportingPdf,
  onClearAll,
  onExportJson,
  onExportPdf,
  onImportJson,
  onShareToFeed,
}: {
  activeFolderEntryCount: number;
  activeFolderHasVideo: boolean;
  activeFolderName: string;
  exportingPdf: boolean;
  onClearAll: () => void;
  onExportJson: () => void;
  onExportPdf: () => void;
  onImportJson: () => void;
  onShareToFeed: () => void;
}) {
  return (
    <article className="surface-card rounded-[30px] p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-app-text">Library actions</p>
          <p className="text-xs text-app-muted">Export, import, and manage your local study session.</p>
        </div>
      </div>

      <div className="mt-4 rounded-[22px] border border-app-border bg-app-secondary/30 p-3">
        <p className="text-sm font-semibold text-app-text">Share active folder</p>
        <p className="mt-1 text-xs leading-5 text-app-muted">
          Publish <strong>{activeFolderName || DEFAULT_FOLDER_NAME}</strong> to the feed with its linked video,
          timestamps, notes, transcript, and images so others can import the full folder locally.
        </p>
        <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-app-muted">
          <span className="rounded-full bg-app-card px-2.5 py-1.5">{activeFolderEntryCount} note{activeFolderEntryCount === 1 ? "" : "s"}</span>
          <span className="rounded-full bg-app-card px-2.5 py-1.5">{activeFolderHasVideo ? "Video linked" : "Video required before sharing"}</span>
        </div>
        <button type="button" onClick={onShareToFeed} className="btn-primary mt-3 gap-2 !px-4 !py-2.5">
          <Share2 className="h-4 w-4" />
          Share to Feed
        </button>
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        <button type="button" onClick={onExportJson} className="btn-secondary gap-2 !px-3.5 !py-2.5">
          <FileJson className="h-4 w-4" />
          Export JSON
        </button>
        <button type="button" onClick={onExportPdf} disabled={exportingPdf} className="btn-secondary gap-2 !px-3.5 !py-2.5">
          <Download className="h-4 w-4" />
          {exportingPdf ? "Exporting..." : "Export PDF"}
        </button>
        <button type="button" onClick={onImportJson} className="btn-secondary gap-2 !px-3.5 !py-2.5">
          <Upload className="h-4 w-4" />
          Import JSON
        </button>
        <button type="button" onClick={onClearAll} className="btn-secondary gap-2 !px-3.5 !py-2.5 text-rose-600">
          <Trash2 className="h-4 w-4" />
          Clear all
        </button>
      </div>
    </article>
  );
}

export function StudyNotesShareSheet({
  shareState,
  setShareState,
  joinedCommunities,
  activeFolderName,
  onClose,
  onSubmit,
}: {
  shareState: StudyNotesShareState;
  setShareState: Dispatch<SetStateAction<StudyNotesShareState>>;
  joinedCommunities: CommunityRow[];
  activeFolderName: string;
  onClose: () => void;
  onSubmit: () => void;
}) {
  if (!shareState.open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/55 p-3 sm:items-center sm:p-6">
      <div className="surface-card max-h-[88vh] w-full max-w-2xl overflow-y-auto rounded-[28px] p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-app-muted">Share Video Notes Maker</p>
            <h2 className="mt-1 font-display text-[1.2rem] font-semibold tracking-tight text-app-text sm:text-[1.4rem]">
              Share to Feed
            </h2>
            <p className="mt-1 text-[11px] leading-5 text-app-muted sm:text-xs">
              Publish the active folder with its linked lecture video, transcript, timestamps, note text, and images so
              others can import a complete local copy.
            </p>
          </div>
          <button type="button" onClick={onClose} className="btn-secondary text-xs">
            Close
          </button>
        </div>

        <div className="mt-3 rounded-[20px] border border-app-border bg-app-card p-3 text-[11px] leading-5 text-app-muted">
          Sharing folder <strong>{activeFolderName || DEFAULT_FOLDER_NAME}</strong>. The post keeps an importable snapshot in
          Supabase, and public reads can come through the FastAPI cache layer.
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="grid gap-1 text-[11px] font-medium text-app-muted">
            Destination
            <select
              value={shareState.destination}
              onChange={(event) =>
                setShareState((current) => ({
                  ...current,
                  destination: event.target.value as "discussion" | "community",
                }))
              }
              className="input-field"
              disabled={shareState.loading || shareState.submitting}
            >
              <option value="discussion">Main feed</option>
              <option value="community">Community</option>
            </select>
          </label>

          {shareState.destination === "community" ? (
            <label className="grid gap-1 text-[11px] font-medium text-app-muted">
              Community
              <select
                value={shareState.communityId}
                onChange={(event) =>
                  setShareState((current) => ({
                    ...current,
                    communityId: event.target.value,
                  }))
                }
                className="input-field"
                disabled={shareState.loading || shareState.submitting || joinedCommunities.length === 0}
              >
                {joinedCommunities.length === 0 ? (
                  <option value="">Join a community first</option>
                ) : (
                  joinedCommunities.map((community) => (
                    <option key={community.id} value={community.id}>
                      {community.name}
                    </option>
                  ))
                )}
              </select>
            </label>
          ) : (
            <label className="grid gap-1 text-[11px] font-medium text-app-muted">
              Category
              <select
                value={shareState.category}
                onChange={(event) =>
                  setShareState((current) => ({
                    ...current,
                    category: event.target.value as PlannerShareCategory,
                  }))
                }
                className="input-field"
                disabled={shareState.loading || shareState.submitting}
              >
                {(["study", "job", "anonymous"] as const).map((category) => (
                  <option key={category} value={category}>
                    {getPlannerShareCategoryLabel(category)}
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>

        {shareState.destination === "community" ? (
          <label className="mt-3 grid gap-1 text-[11px] font-medium text-app-muted">
            Category
            <select
              value={shareState.category}
              onChange={(event) =>
                setShareState((current) => ({
                  ...current,
                  category: event.target.value as PlannerShareCategory,
                }))
              }
              className="input-field"
              disabled={shareState.loading || shareState.submitting}
            >
              {(["study", "job", "anonymous"] as const).map((category) => (
                <option key={category} value={category}>
                  {getPlannerShareCategoryLabel(category)}
                </option>
              ))}
            </select>
          </label>
        ) : null}

        <label className="mt-3 grid gap-1 text-[11px] font-medium text-app-muted">
          Post title
          <input
            value={shareState.title}
            onChange={(event) =>
              setShareState((current) => ({
                ...current,
                title: event.target.value,
              }))
            }
            className="input-field"
            placeholder="Lecture revision folder for this topic"
            disabled={shareState.submitting}
          />
        </label>

        <label className="mt-3 grid gap-1 text-[11px] font-medium text-app-muted">
          Intro note
          <textarea
            value={shareState.note}
            onChange={(event) =>
              setShareState((current) => ({
                ...current,
                note: event.target.value,
              }))
            }
            className="input-field min-h-[100px] resize-y"
            placeholder="Sharing this folder so others can import the lecture notes and continue from the same timestamps..."
            disabled={shareState.submitting}
          />
        </label>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
          <p className="text-[11px] text-app-muted">
            {shareState.loading ? "Loading sharing options..." : "Only the selected folder is shared."}
          </p>
          <button
            type="button"
            onClick={onSubmit}
            className="btn-primary inline-flex items-center gap-2"
            disabled={shareState.loading || shareState.submitting}
          >
            <Share2 className="h-4 w-4" />
            {shareState.submitting ? "Sharing..." : "Share to Feed"}
          </button>
        </div>
      </div>
    </div>
  );
}

export function FolderManagerPanel({
  activeFolderId,
  activeFolderName,
  entryCountByFolderId,
  folderDraft,
  folders,
  onChangeFolderDraft,
  onChangeRenameFolderDraft,
  onCreateFolder,
  onRenameFolder,
  onSelectFolder,
  renameFolderDraft,
}: {
  activeFolderId: string;
  activeFolderName?: string | null;
  entryCountByFolderId: Map<string, number>;
  folderDraft: string;
  folders: StudyNoteFolder[];
  onChangeFolderDraft: (value: string) => void;
  onChangeRenameFolderDraft: (value: string) => void;
  onCreateFolder: () => void;
  onRenameFolder: () => void;
  onSelectFolder: (folderId: string) => void;
  renameFolderDraft: string;
}) {
  return (
    <article className="surface-card rounded-[30px] p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-app-text">Folders</p>
          <p className="text-xs text-app-muted">Create folders, rename the selected one, and save notes directly inside it.</p>
        </div>
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
        <input
          value={folderDraft}
          onChange={(event) => onChangeFolderDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              onCreateFolder();
            }
          }}
          placeholder="Create a folder"
          className="input-field"
        />
        <button type="button" onClick={onCreateFolder} className="btn-secondary gap-2 !px-4 !py-3">
          <FolderPlus className="h-4 w-4" />
          Create
        </button>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {folders.map((folder) => (
          <button
            key={folder.id}
            type="button"
            onClick={() => onSelectFolder(folder.id)}
            className={`inline-flex items-center gap-2 rounded-full px-3.5 py-2 text-xs font-semibold transition ${
              activeFolderId === folder.id
                ? "bg-brand text-white"
                : "border border-app-border bg-app-secondary/40 text-app-muted hover:text-brand"
            }`}
          >
            <FolderClosed className="h-3.5 w-3.5" />
            {folder.name} ({entryCountByFolderId.get(folder.id) || 0})
          </button>
        ))}
      </div>

      {folders.length ? (
        <div className="mt-4 rounded-[24px] border border-app-border bg-app-secondary/30 p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-sm font-semibold text-app-text">Rename selected folder</p>
              <p className="text-xs text-app-muted">
                Update <strong>{activeFolderName || DEFAULT_FOLDER_NAME}</strong> without losing the linked video or notes.
              </p>
            </div>
            <span className="rounded-full bg-app-card px-2.5 py-1.5 text-[11px] font-semibold text-app-muted">
              {entryCountByFolderId.get(activeFolderId) || 0} note{(entryCountByFolderId.get(activeFolderId) || 0) === 1 ? "" : "s"}
            </span>
          </div>

          <div className="mt-3 grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
            <input
              value={renameFolderDraft}
              onChange={(event) => onChangeRenameFolderDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  onRenameFolder();
                }
              }}
              placeholder="Rename selected folder"
              className="input-field"
            />
            <button type="button" onClick={onRenameFolder} className="btn-secondary gap-2 !px-4 !py-3">
              Rename
            </button>
          </div>
        </div>
      ) : null}
    </article>
  );
}

export function SearchPanel({
  searchQuery,
  onChangeSearchQuery,
}: {
  searchQuery: string;
  onChangeSearchQuery: (value: string) => void;
}) {
  return (
    <article className="surface-card rounded-[30px] p-4 sm:p-5">
      <label className="flex items-center gap-3 rounded-[22px] border border-app-border bg-app-card px-4 py-3">
        <Search className="h-4 w-4 text-app-muted" />
        <input
          value={searchQuery}
          onChange={(event) => onChangeSearchQuery(event.target.value)}
          placeholder="Search notes..."
          className="w-full bg-transparent text-sm text-app-text outline-none placeholder:text-app-muted"
        />
      </label>
    </article>
  );
}

export function FolderEntriesPanel({
  activeFolderName,
  entries,
  onDeleteEntry,
  onEditEntry,
  onSeekToEntry,
}: {
  activeFolderName?: string | null;
  entries: StudyNoteEntry[];
  onDeleteEntry: (entryId: string) => void;
  onEditEntry: (entry: StudyNoteEntry) => void;
  onSeekToEntry: (seconds: number) => void;
}) {
  return (
    <article className="surface-card h-full min-h-0 rounded-[30px] p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-app-text">Notes in {activeFolderName || DEFAULT_FOLDER_NAME}</p>
          <p className="text-xs text-app-muted">{entries.length} result{entries.length === 1 ? "" : "s"}</p>
        </div>
      </div>

      <div className="mt-4 max-h-[68vh] space-y-3 overflow-y-auto pr-1 xl:max-h-[calc(100vh-20rem)]">
        {entries.length ? (
          entries.map((entry) => (
            <article key={entry.id} className="rounded-[24px] border border-app-border bg-app-secondary/35 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => onSeekToEntry(entry.timestampSeconds)}
                      className="inline-flex items-center gap-2 rounded-full bg-brand/10 px-3 py-1.5 text-xs font-semibold text-brand"
                    >
                      <Clock3 className="h-3.5 w-3.5" />
                      {formatTime(entry.timestampSeconds)}
                    </button>

                    {entry.tags.length ? (
                      <div className="flex flex-wrap gap-2">
                        {entry.tags.slice(0, 3).map((tag) => (
                          <span key={tag} className="rounded-full bg-app-card px-2.5 py-1 text-[11px] font-semibold text-app-muted">
                            #{tag}
                          </span>
                        ))}
                      </div>
                    ) : null}
                  </div>

                  <h2 className="mt-3 text-sm font-semibold text-app-text">{buildEntryDisplayTitle(entry)}</h2>

                  {entry.body.trim() ? (
                    <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-app-muted">{entry.body}</p>
                  ) : (
                    <p className="mt-2 text-sm text-app-muted">Image-only note</p>
                  )}

                  {entry.attachments.length ? (
                    <div className="mt-3 grid gap-2 sm:grid-cols-2">
                      {entry.attachments.map((attachment) => (
                        <div key={attachment.id} className="overflow-hidden rounded-2xl border border-app-border bg-app-card">
                          <img src={attachment.dataUrl} alt={attachment.name} className="h-28 w-full object-cover" />
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>

                <div className="flex items-center gap-2">
                  <button type="button" onClick={() => onEditEntry(entry)} className="btn-secondary !px-3 !py-2 text-xs">
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => onDeleteEntry(entry.id)}
                    className="rounded-2xl border border-rose-500/20 bg-rose-500/10 px-3 py-2 text-xs font-semibold text-rose-600"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </article>
          ))
        ) : (
          <div className="rounded-[24px] border border-dashed border-app-border bg-app-secondary/30 px-4 py-8 text-center">
            <FileText className="mx-auto h-6 w-6 text-app-muted" />
            <p className="mt-3 text-sm font-semibold text-app-text">No notes in this folder yet</p>
            <p className="mt-1 text-sm text-app-muted">Capture a timestamped note on the left and it will appear here.</p>
          </div>
        )}
      </div>
    </article>
  );
}
