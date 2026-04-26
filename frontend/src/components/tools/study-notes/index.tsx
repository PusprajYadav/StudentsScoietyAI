import { useEffect, useMemo, useRef, useState } from "react";
import ReactPlayer from "react-player";
import toast from "react-hot-toast";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import type { CommunityRow } from "../../../types/database";
import { useAuthStore } from "../../../store/authStore";
import { buildAuthRedirectPath } from "../../../lib/authRedirect";
import { createPost, loadCommunityMemberships, loadVisibleCommunities } from "../../../lib/api";
import { prepareStudyNotesAttachmentFile } from "../../../lib/mediaCompression";
import { mapPlannerShareCategoryToDiscussionKind } from "../../../lib/plannerPost";
import { downloadBlobNatively } from "../../../lib/nativeDownload";
import { createStudentStudyNotesShare } from "./api";
import {
  buildExternalVideoUrl,
  buildEntryDisplayTitle,
  buildPublicStudyNotesUrl,
  buildStudyNotesShareSnapshot,
  createDefaultStorage,
  createFolder,
  DEFAULT_FOLDER_NAME,
  formatTime,
  isYouTubeVideoSource,
  loadStudyNotesStorage,
  normalizeStudyNotesStorage,
  normalizeStudyVideoUrl,
  parseTags,
  parseTranscriptSegments,
  sanitizeFileName,
  saveStudyNotesStorage,
} from "./helpers";
import {
  EntryComposerPanel,
  FolderEntriesPanel,
  SearchPanel,
  StudyNotesFolderSheet,
  StudyNotesWorkspaceHeader,
  StudyNotesShareSheet,
  StudyVideoPanel,
  TranscriptHelperPanel,
  type StudyNotesShareState,
} from "./panels";
import type { StudyNoteAttachment, StudyNoteEntry, StudyNoteFolder } from "./types";

const defaultShareState: StudyNotesShareState = {
  open: false,
  destination: "discussion",
  category: "study",
  communityId: "",
  title: "",
  note: "",
  loading: false,
  submitting: false,
};

export function StudyNotesApp({ showTitleBlock = true }: { showTitleBlock?: boolean }) {
  const playerRef = useRef<ReactPlayer | null>(null);
  const importInputRef = useRef<HTMLInputElement | null>(null);
  const attachmentInputRef = useRef<HTMLInputElement | null>(null);
  const transcriptImportInputRef = useRef<HTMLInputElement | null>(null);

  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, profile } = useAuthStore();

  const [videoUrlInput, setVideoUrlInput] = useState("");
  const [videoErrorMessage, setVideoErrorMessage] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [folders, setFolders] = useState<StudyNoteFolder[]>([]);
  const [entries, setEntries] = useState<StudyNoteEntry[]>([]);
  const [folderDraft, setFolderDraft] = useState("");
  const [renameFolderDraft, setRenameFolderDraft] = useState("");
  const [activeFolderId, setActiveFolderId] = useState("");
  const [titleDraft, setTitleDraft] = useState("");
  const [bodyDraft, setBodyDraft] = useState("");
  const [tagsDraft, setTagsDraft] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [attachments, setAttachments] = useState<StudyNoteAttachment[]>([]);
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [createFolderSheetOpen, setCreateFolderSheetOpen] = useState(false);
  const [renameFolderSheetOpen, setRenameFolderSheetOpen] = useState(false);
  const [shareState, setShareState] = useState<StudyNotesShareState>(defaultShareState);
  const [joinedCommunities, setJoinedCommunities] = useState<CommunityRow[]>([]);
  const [shareOptionsReady, setShareOptionsReady] = useState(false);

  const authRedirectPath = useMemo(() => buildAuthRedirectPath(location), [location]);

  useEffect(() => {
    const stored = loadStudyNotesStorage();
    const requestedFolderId = searchParams.get("folder");
    const resolvedFolderId =
      requestedFolderId && stored.folders.some((folder) => folder.id === requestedFolderId)
        ? requestedFolderId
        : stored.folders[0]?.id || "";

    setFolders(stored.folders);
    setEntries(stored.entries);
    setActiveFolderId(resolvedFolderId);
  }, [searchParams]);

  useEffect(() => {
    if (!folders.length) {
      return;
    }

    if (!activeFolderId || !folders.some((folder) => folder.id === activeFolderId)) {
      setActiveFolderId(folders[0].id);
    }
  }, [activeFolderId, folders]);

  useEffect(() => {
    if (!folders.length) {
      return;
    }

    saveStudyNotesStorage({
      folders,
      entries,
    });
  }, [entries, folders]);

  useEffect(() => {
    if (!activeFolderId) {
      return;
    }

    const next = new URLSearchParams(searchParams);
    if (next.get("folder") === activeFolderId) {
      return;
    }

    next.set("folder", activeFolderId);
    setSearchParams(next, { replace: true });
  }, [activeFolderId, searchParams, setSearchParams]);

  const folderMap = useMemo(() => new Map(folders.map((folder) => [folder.id, folder])), [folders]);
  const activeFolder = folderMap.get(activeFolderId) || null;
  const activeVideoUrl = activeFolder?.videoUrl || "";
  const activeTranscriptText = activeFolder?.transcriptText || "";

  useEffect(() => {
    setRenameFolderDraft(activeFolder?.name || "");
  }, [activeFolder?.id, activeFolder?.name]);

  useEffect(() => {
    setVideoUrlInput(activeVideoUrl);
    setVideoErrorMessage(null);
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
  }, [activeFolderId, activeVideoUrl]);

  useEffect(() => {
    if (!shareState.open || shareOptionsReady || !user) {
      return;
    }

    let cancelled = false;
    setShareState((current) => ({ ...current, loading: true }));

    void Promise.all([loadVisibleCommunities(), loadCommunityMemberships(user.id)])
      .then(([communities, memberships]) => {
        if (cancelled) {
          return;
        }

        const joined = (communities as CommunityRow[]).filter((community) => memberships.has(community.id));
        setJoinedCommunities(joined);
        setShareOptionsReady(true);
        setShareState((current) => ({
          ...current,
          loading: false,
          communityId: current.communityId || joined[0]?.id || "",
        }));
      })
      .catch(() => {
        if (cancelled) {
          return;
        }

        toast.error("Could not load share options.");
        setShareState((current) => ({ ...current, loading: false }));
      });

    return () => {
      cancelled = true;
    };
  }, [shareOptionsReady, shareState.open, user]);

  const searchValue = searchQuery.trim().toLowerCase();

  const entryCountByFolderId = useMemo(() => {
    const counts = new Map<string, number>();

    entries.forEach((entry) => {
      counts.set(entry.folderId, (counts.get(entry.folderId) || 0) + 1);
    });

    return counts;
  }, [entries]);

  const activeFolderEntries = useMemo(
    () =>
      entries
        .filter((entry) => entry.folderId === activeFolderId)
        .sort((left, right) => left.timestampSeconds - right.timestampSeconds),
    [activeFolderId, entries]
  );

  const filteredEntries = useMemo(() => {
    if (!searchValue) {
      return activeFolderEntries;
    }

    return activeFolderEntries.filter((entry) =>
      `${entry.title} ${entry.body} ${entry.tags.join(" ")} ${entry.attachments.map((attachment) => attachment.name).join(" ")}`
        .toLowerCase()
        .includes(searchValue)
    );
  }, [activeFolderEntries, searchValue]);

  const nearbyEntries = useMemo(
    () =>
      activeFolderEntries
        .filter((entry) => Math.abs(entry.timestampSeconds - currentTime) <= 10)
        .sort((left, right) => left.timestampSeconds - right.timestampSeconds),
    [activeFolderEntries, currentTime]
  );

  const transcriptSegments = useMemo(() => parseTranscriptSegments(activeTranscriptText), [activeTranscriptText]);
  const transcriptWindow = useMemo(
    () => transcriptSegments.filter((segment) => Math.abs(segment.startSeconds - currentTime) <= 10),
    [currentTime, transcriptSegments]
  );
  const externalVideoUrl = useMemo(
    () => buildExternalVideoUrl(videoUrlInput || activeVideoUrl),
    [activeVideoUrl, videoUrlInput]
  );
  const isYouTubeSource = useMemo(
    () => isYouTubeVideoSource(videoUrlInput || activeVideoUrl),
    [activeVideoUrl, videoUrlInput]
  );

  function updateFolder(folderId: string, updater: (folder: StudyNoteFolder) => StudyNoteFolder) {
    setFolders((current) =>
      current.map((folder) => {
        if (folder.id !== folderId) {
          return folder;
        }

        const nextFolder = updater(folder);
        return {
          ...nextFolder,
          updatedAt: new Date().toISOString(),
        };
      })
    );
  }

  function updateActiveFolder(updater: (folder: StudyNoteFolder) => StudyNoteFolder) {
    if (!activeFolderId) {
      return;
    }

    updateFolder(activeFolderId, updater);
  }

  function resetComposer() {
    setEditingEntryId(null);
    setTitleDraft("");
    setBodyDraft("");
    setTagsDraft("");
    setAttachments([]);
  }

  function selectFolder(folderId: string) {
    setActiveFolderId(folderId);
    resetComposer();
  }

  function loadVideo() {
    if (!activeFolder) {
      toast.error("Create or select a folder first.");
      return;
    }

    const nextInput = videoUrlInput.trim();

    if (!nextInput) {
      toast.error("Paste a video URL first.");
      return;
    }

    const nextUrl = normalizeStudyVideoUrl(nextInput);

    if (!ReactPlayer.canPlay(nextUrl)) {
      setVideoErrorMessage("This video link is not supported by the embedded player.");
      toast.error("That video link is not supported.");
      return;
    }

    updateActiveFolder((folder) => ({
      ...folder,
      videoUrl: nextUrl,
    }));
    setCurrentTime(0);
    setDuration(0);
    setIsPlaying(false);
    setVideoErrorMessage(null);
  }

  function seekTo(seconds: number, shouldPlayAfterSeek = false) {
    playerRef.current?.seekTo(seconds, "seconds");
    setCurrentTime(seconds);
    setIsPlaying(shouldPlayAfterSeek);
  }

  function createNewFolder() {
    const name = folderDraft.trim();

    if (!name) {
      toast.error("Enter a folder name first.");
      return;
    }

    if (folders.some((folder) => folder.name.toLowerCase() === name.toLowerCase())) {
      toast.error("A folder with that name already exists.");
      return;
    }

    const nextFolder = createFolder(name);
    setFolders((current) => [...current, nextFolder]);
    setFolderDraft("");
    setRenameFolderDraft(nextFolder.name);
    setActiveFolderId(nextFolder.id);
    setCreateFolderSheetOpen(false);
    resetComposer();
    toast.success("Folder created.");
  }

  function renameActiveFolder() {
    if (!activeFolder) {
      toast.error("Choose a folder first.");
      return;
    }

    const nextName = renameFolderDraft.trim();

    if (!nextName) {
      toast.error("Enter a folder name first.");
      return;
    }

    if (nextName.toLowerCase() === activeFolder.name.trim().toLowerCase()) {
      setRenameFolderDraft(activeFolder.name);
      return;
    }

    if (folders.some((folder) => folder.id !== activeFolder.id && folder.name.trim().toLowerCase() === nextName.toLowerCase())) {
      toast.error("A folder with that name already exists.");
      return;
    }

    updateActiveFolder((folder) => ({
      ...folder,
      name: nextName,
    }));
    setRenameFolderDraft(nextName);
    setRenameFolderSheetOpen(false);
    toast.success("Folder renamed.");
  }

  function addOrUpdateEntry() {
    const title = titleDraft.trim();
    const body = bodyDraft.trim();
    const targetFolderId = activeFolderId || folders[0]?.id || "";

    if (!targetFolderId) {
      toast.error("Create a folder first.");
      return;
    }

    if (!title && !body && !attachments.length) {
      toast.error("Add a title, note text, or at least one image before saving.");
      return;
    }

    const now = new Date().toISOString();
    const existingEntry = editingEntryId ? entries.find((entry) => entry.id === editingEntryId) || null : null;
    const payload: StudyNoteEntry = {
      id: editingEntryId || crypto.randomUUID(),
      folderId: targetFolderId,
      title,
      body,
      tags: parseTags(tagsDraft),
      timestampSeconds: currentTime,
      attachments,
      createdAt: existingEntry?.createdAt || now,
      updatedAt: now,
    };

    setEntries((current) => {
      if (editingEntryId) {
        return current.map((entry) => (entry.id === editingEntryId ? payload : entry));
      }

      return [...current, payload];
    });

    setActiveFolderId(targetFolderId);
    toast.success(editingEntryId ? "Note updated." : "Note saved.");
    resetComposer();
  }

  function editEntry(entry: StudyNoteEntry) {
    setActiveFolderId(entry.folderId);
    setEditingEntryId(entry.id);
    setTitleDraft(entry.title);
    setBodyDraft(entry.body);
    setTagsDraft(entry.tags.join(", "));
    setAttachments(entry.attachments);
    seekTo(entry.timestampSeconds, false);
  }

  function deleteEntry(entryId: string) {
    const confirmed = window.confirm("Delete this note?");

    if (!confirmed) {
      return;
    }

    setEntries((current) => current.filter((entry) => entry.id !== entryId));

    if (editingEntryId === entryId) {
      resetComposer();
    }
  }

  async function handleAttachmentChange(event: React.ChangeEvent<HTMLInputElement>) {
    const incomingFiles = Array.from(event.target.files || []);

    if (!incomingFiles.length) {
      return;
    }

    const nextAttachments = await Promise.all(
      incomingFiles.map(async (file) => {
        const optimizedFile = await prepareStudyNotesAttachmentFile(file);
        return new Promise<StudyNoteAttachment>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () =>
              resolve({
                id: crypto.randomUUID(),
                name: optimizedFile.name,
                dataUrl: String(reader.result || ""),
              });
            reader.onerror = () => reject(reader.error || new Error("Failed to read the attachment."));
            reader.readAsDataURL(optimizedFile);
          });
      })
    );

    setAttachments((current) => [...current, ...nextAttachments]);
    event.target.value = "";
  }

  function importTranscript(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file || !activeFolder) {
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      updateActiveFolder((folder) => ({
        ...folder,
        transcriptText: String(reader.result || ""),
      }));
      toast.success("Transcript loaded.");
    };
    reader.readAsText(file);
    event.target.value = "";
  }

  function updateTranscriptText(value: string) {
    if (!activeFolder) {
      return;
    }

    updateActiveFolder((folder) => ({
      ...folder,
      transcriptText: value,
    }));
  }

  function insertTranscriptWindowIntoNote() {
    if (!transcriptWindow.length) {
      toast.error("No transcript lines are available within 10 seconds of the current time.");
      return;
    }

    const snippet = transcriptWindow.map((segment) => `[${formatTime(segment.startSeconds)}] ${segment.text}`).join("\n");

    setBodyDraft((current) =>
      current.trim() ? `${current.trim()}\n\nTranscript context\n${snippet}` : `Transcript context\n${snippet}`
    );
    toast.success("Transcript window added to the note.");
  }

  async function exportJson() {
    const blob = new Blob(
      [
        JSON.stringify(
          {
            folders,
            entries,
          },
          null,
          2
        ),
      ],
      { type: "application/json" }
    );

    await downloadBlobNatively(blob, `${sanitizeFileName(activeFolder?.name || "study-notes")}-${Date.now()}.json`);
    toast.success("JSON exported.");
  }

  async function exportPdf() {
    if (!entries.length) {
      toast.error("Add at least one note before exporting PDF.");
      return;
    }

    setExportingPdf(true);

    try {
      const { default: html2pdf } = await import("html2pdf.js");
      const wrapper = document.createElement("div");
      wrapper.className = "p-10 text-slate-900";
      wrapper.style.fontFamily = "Manrope, sans-serif";

      const heading = document.createElement("h1");
      heading.textContent = "Student Society Video Notes Maker";
      heading.style.fontSize = "28px";
      heading.style.fontWeight = "700";
      wrapper.appendChild(heading);

      folders.forEach((folder) => {
        const folderEntries = entries
          .filter((entry) => entry.folderId === folder.id)
          .sort((left, right) => left.timestampSeconds - right.timestampSeconds);

        if (!folderEntries.length) {
          return;
        }

        const folderHeading = document.createElement("h2");
        folderHeading.textContent = folder.name;
        folderHeading.style.marginTop = "28px";
        folderHeading.style.fontSize = "22px";
        folderHeading.style.fontWeight = "700";
        wrapper.appendChild(folderHeading);

        if (folder.videoUrl) {
          const url = document.createElement("p");
          url.textContent = `Video: ${folder.videoUrl}`;
          url.style.marginTop = "8px";
          url.style.fontSize = "13px";
          wrapper.appendChild(url);
        }

        folderEntries.forEach((entry) => {
          const block = document.createElement("section");
          block.style.marginTop = "16px";
          block.style.padding = "16px";
          block.style.border = "1px solid #cbd5e1";
          block.style.borderRadius = "16px";

          const title = document.createElement("h3");
          title.textContent = `${buildEntryDisplayTitle(entry)} • ${formatTime(entry.timestampSeconds)}`;
          title.style.fontSize = "18px";
          title.style.fontWeight = "700";
          block.appendChild(title);

          if (entry.tags.length) {
            const tags = document.createElement("p");
            tags.textContent = `Tags: ${entry.tags.join(", ")}`;
            tags.style.marginTop = "8px";
            tags.style.fontSize = "12px";
            block.appendChild(tags);
          }

          if (entry.body.trim()) {
            const body = document.createElement("pre");
            body.textContent = entry.body;
            body.style.whiteSpace = "pre-wrap";
            body.style.fontFamily = "Manrope, sans-serif";
            body.style.marginTop = "8px";
            body.style.lineHeight = "1.7";
            block.appendChild(body);
          }

          entry.attachments.forEach((attachment) => {
            if (!attachment.dataUrl.trim()) {
              return;
            }

            const image = document.createElement("img");
            image.src = attachment.dataUrl;
            image.crossOrigin = "anonymous";
            image.alt = attachment.name;
            image.style.marginTop = "10px";
            image.style.maxWidth = "100%";
            image.style.borderRadius = "12px";
            block.appendChild(image);
          });

          wrapper.appendChild(block);
        });
      });

      await html2pdf()
        .set({
          margin: 10,
          filename: `${sanitizeFileName(activeFolder?.name || "study-notes")}-${Date.now()}.pdf`,
          image: { type: "jpeg", quality: 0.98 },
          html2canvas: { scale: 2, useCORS: true },
          jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
        })
        .from(wrapper)
        .save();

      toast.success("PDF exported.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not export PDF.");
    } finally {
      setExportingPdf(false);
    }
  }

  function importJson(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = normalizeStudyNotesStorage(String(reader.result || ""));

        if (!parsed) {
          throw new Error("Invalid study notes file.");
        }

        setFolders(parsed.folders);
        setEntries(parsed.entries);
        setActiveFolderId(parsed.folders[0]?.id || "");
        setVideoErrorMessage(null);
        resetComposer();
        toast.success("Notes imported.");
      } catch {
        toast.error("That JSON file could not be imported.");
      }
    };
    reader.readAsText(file);
    event.target.value = "";
  }

  function openShareSheet() {
    if (!user || !profile) {
      navigate(authRedirectPath);
      return;
    }

    if (!activeFolder) {
      toast.error("Choose a folder first.");
      return;
    }

    setShareState((current) => ({
      ...current,
      open: true,
      title: current.title || `Video Notes Maker: ${activeFolder.name}`,
      note:
        current.note ||
        `Sharing my ${activeFolder.name} lecture folder so others can import the full notes with timestamps and images.`,
    }));
  }

  async function submitShare() {
    if (!user || !profile) {
      navigate(authRedirectPath);
      return;
    }

    if (!activeFolder) {
      toast.error("Choose a folder first.");
      return;
    }

    if (!activeFolder.videoUrl) {
      toast.error("Load the lecture video for this folder before sharing.");
      return;
    }

    if (!activeFolderEntries.length) {
      toast.error("Add at least one note to this folder before sharing.");
      return;
    }

    const shareCommunity = joinedCommunities.find((community) => community.id === shareState.communityId) || null;
    if (shareState.destination === "community" && !shareCommunity) {
      toast.error("Choose a community first.");
      return;
    }

    setShareState((current) => ({ ...current, submitting: true }));

    try {
      const sharedFolder = await createStudentStudyNotesShare({
        ownerId: user.id,
        title: shareState.title.trim() || `Video Notes Maker: ${activeFolder.name}`,
        snapshot: buildStudyNotesShareSnapshot({
          folder: activeFolder,
          entries: activeFolderEntries,
        }),
      });

      await createPost({
        authorId: user.id,
        visibilityScope: shareState.destination,
        communityId: shareState.destination === "community" ? shareCommunity?.id : undefined,
        discussionKind: mapPlannerShareCategoryToDiscussionKind(shareState.category),
        title: shareState.title.trim() || `Video Notes Maker: ${activeFolder.name}`,
        content: shareState.note.trim(),
        tags: ["sys-study-notes-share", shareState.category],
        linkUrl: buildPublicStudyNotesUrl(sharedFolder),
        isAnonymous: shareState.category === "anonymous",
      });

      updateActiveFolder((folder) => ({
        ...folder,
        lastSharedShareSlug: sharedFolder.share_slug,
      }));

      setShareState(defaultShareState);
      toast.success("Video Notes Maker folder shared to feed.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not share this Video Notes Maker folder.");
      setShareState((current) => ({ ...current, submitting: false }));
    }
  }

  return (
    <div className="space-y-4">
      <StudyNotesWorkspaceHeader
        showTitleBlock={showTitleBlock}
        folderCount={folders.length}
        entryCount={entries.length}
        activeFolderId={activeFolderId}
        activeFolderName={activeFolder?.name || DEFAULT_FOLDER_NAME}
        activeFolderHasVideo={Boolean(activeFolder?.videoUrl)}
        entryCountByFolderId={entryCountByFolderId}
        exportingPdf={exportingPdf}
        folders={folders}
        onClearAll={() => {
          if (!entries.length) {
            return;
          }

          const confirmed = window.confirm("Clear every folder and note in this study session?");

          if (confirmed) {
            const fallback = createDefaultStorage();
            setFolders(fallback.folders);
            setEntries([]);
            setActiveFolderId(fallback.folders[0].id);
            resetComposer();
          }
        }}
        onExportJson={() => void exportJson()}
        onExportPdf={() => void exportPdf()}
        onImportJson={() => importInputRef.current?.click()}
        onOpenCreateFolder={() => {
          setFolderDraft("");
          setCreateFolderSheetOpen(true);
        }}
        onOpenRenameFolder={() => {
          setRenameFolderDraft(activeFolder?.name || "");
          setRenameFolderSheetOpen(true);
        }}
        onSelectFolder={selectFolder}
        onShareToFeed={openShareSheet}
      />
      <input
        ref={importInputRef}
        type="file"
        accept="application/json,.json"
        className="hidden"
        onChange={importJson}
      />

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.08fr)_minmax(340px,0.92fr)] xl:items-start">
        <div className="space-y-4">
          <StudyVideoPanel
            activeFolderName={activeFolder?.name || DEFAULT_FOLDER_NAME}
            currentTime={currentTime}
            duration={duration}
            externalVideoUrl={externalVideoUrl}
            isPlaying={isPlaying}
            isYouTubeSource={isYouTubeSource}
            videoUrl={activeVideoUrl}
            videoErrorMessage={videoErrorMessage}
            videoUrlInput={videoUrlInput}
            onChangeVideoUrlInput={setVideoUrlInput}
            onLoadVideo={loadVideo}
            onPlayerError={() => {
              setIsPlaying(false);
              setDuration(0);
              setVideoErrorMessage(
                isYouTubeSource
                  ? "Embedded YouTube playback failed. The app now uses the cookie-free player, but some videos still block embedding or temporarily fail inside iframes."
                  : "This source could not be played in the embedded viewer. Try reloading it or opening the original source."
              );
            }}
            onTogglePlayback={() => setIsPlaying((current) => !current)}
            playerRef={playerRef}
            onDuration={setDuration}
            onPause={() => setIsPlaying(false)}
            onPlay={() => {
              setVideoErrorMessage(null);
              setIsPlaying(true);
            }}
            onProgress={({ playedSeconds }) => setCurrentTime(playedSeconds)}
          />

          <EntryComposerPanel
            activeFolderName={activeFolder?.name || DEFAULT_FOLDER_NAME}
            attachments={attachments}
            currentTime={currentTime}
            editingEntryId={editingEntryId}
            entryBodyDraft={bodyDraft}
            tagsDraft={tagsDraft}
            titleDraft={titleDraft}
            onAddImage={() => attachmentInputRef.current?.click()}
            onChangeBody={setBodyDraft}
            onChangeTags={setTagsDraft}
            onChangeTitle={setTitleDraft}
            onClearEntry={resetComposer}
            onRemoveAttachment={(attachmentId) =>
              setAttachments((current) => current.filter((item) => item.id !== attachmentId))
            }
            onSaveEntry={addOrUpdateEntry}
          />
        </div>

        <div className="flex min-h-0 flex-col gap-4">
          <SearchPanel searchQuery={searchQuery} onChangeSearchQuery={setSearchQuery} />

          <FolderEntriesPanel
            activeFolderName={activeFolder?.name || DEFAULT_FOLDER_NAME}
            entries={filteredEntries}
            onDeleteEntry={deleteEntry}
            onEditEntry={editEntry}
            onSeekToEntry={(seconds) => seekTo(seconds, true)}
          />

          <TranscriptHelperPanel
            currentTime={currentTime}
            nearbyEntries={nearbyEntries}
            transcriptSegmentsCount={transcriptSegments.length}
            transcriptText={activeTranscriptText}
            transcriptWindow={transcriptWindow}
            onChangeTranscript={updateTranscriptText}
            onEditEntry={editEntry}
            onImportTranscript={() => transcriptImportInputRef.current?.click()}
            onUseTranscriptWindow={insertTranscriptWindowIntoNote}
          />
        </div>
      </section>

      <input
        ref={attachmentInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(event) => void handleAttachmentChange(event)}
      />
      <input
        ref={transcriptImportInputRef}
        type="file"
        accept=".txt,.srt,.vtt,text/plain"
        className="hidden"
        onChange={importTranscript}
      />

      <StudyNotesFolderSheet
        open={createFolderSheetOpen}
        mode="create"
        activeFolderName={activeFolder?.name || DEFAULT_FOLDER_NAME}
        draft={folderDraft}
        onChangeDraft={setFolderDraft}
        onClose={() => setCreateFolderSheetOpen(false)}
        onSubmit={createNewFolder}
      />

      <StudyNotesFolderSheet
        open={renameFolderSheetOpen}
        mode="rename"
        activeFolderName={activeFolder?.name || DEFAULT_FOLDER_NAME}
        draft={renameFolderDraft}
        onChangeDraft={setRenameFolderDraft}
        onClose={() => setRenameFolderSheetOpen(false)}
        onSubmit={renameActiveFolder}
      />

      <StudyNotesShareSheet
        shareState={shareState}
        setShareState={setShareState}
        joinedCommunities={joinedCommunities}
        activeFolderName={activeFolder?.name || DEFAULT_FOLDER_NAME}
        onClose={() => setShareState((current) => ({ ...current, open: false }))}
        onSubmit={() => void submitShare()}
      />
    </div>
  );
}
