import type { ProfileRow } from "../types/database";
import { createStudentPortfolio, loadPublicStudentPortfolio } from "../features/my-room/portfolio-maker/api";
import { createStudentResume, loadPublicStudentResume } from "../features/my-room/resume-maker/api";
import { loadPublicStudentWhitebookShare, loadWhitebookSharePreview } from "../features/my-room/whitebook/api";
import { saveLocalWhitebookNotebook } from "../features/my-room/whitebook/localStore";
import type { WhitebookSharePreview, WhitebookSharedPostPreview } from "../features/my-room/whitebook/types";
import {
  buildWhitebookPreviewSvg,
  countWhitebookPageItems,
  createImportedWhitebookNotebook,
  getWhitebookActivePage,
  parseEmbeddedWhitebookPayloadFromLinkUrl,
  parseWhitebookShareSlug,
} from "../features/my-room/whitebook/utils";
import { loadPublicStudentStudyNotesShare } from "../components/tools/study-notes/api";
import type { StudyNotesSharedPostPreview } from "../components/tools/study-notes/types";
import {
  buildEntryDisplayTitle,
  buildEntrySummary,
  importStudyNotesSnapshotToLocal,
  parseStudyNotesShareSlug,
} from "../components/tools/study-notes/helpers";
import { loadPublicBugFixResultShare } from "./bugfixMultiplayerApi";
import { parseBugFixResultShareSlug } from "../components/tools/bugfix-lab/helpers";
import type { BugFixResultShareRecord } from "../components/tools/bugfix-lab/types";
import { loadSharedPlayAreaDocumentFromUrl } from "../features/ai-teacher-play-area/share";
import { importPlayAreaDocumentSnapshot, savePlayAreaDocument } from "../features/ai-teacher-play-area/storage";
import type { PlayAreaDocument } from "../features/ai-teacher-play-area/types";

function parseResumeShareSlug(linkUrl: string | null | undefined) {
  if (!linkUrl) {
    return null;
  }

  try {
    const parsed = new URL(linkUrl, typeof window === "undefined" ? "https://studentsociety.in" : window.location.origin);
    const match = parsed.pathname.match(/\/app\/myroom\/ats-resume-maker\/live\/([^/]+)/);
    return match?.[1] || null;
  } catch {
    return null;
  }
}

function parsePortfolioShareSlug(linkUrl: string | null | undefined) {
  if (!linkUrl) {
    return null;
  }

  try {
    const parsed = new URL(linkUrl, typeof window === "undefined" ? "https://studentsociety.in" : window.location.origin);
    const match = parsed.pathname.match(/\/p\/[^/]+\/([^/]+)/);
    return match?.[1] || null;
  } catch {
    return null;
  }
}

export async function importResumeFromSharedPost(linkUrl: string | null | undefined, profile: ProfileRow) {
  const shareSlug = parseResumeShareSlug(linkUrl);
  if (!shareSlug) {
    throw new Error("This resume share link is not valid anymore.");
  }

  const resume = await loadPublicStudentResume(shareSlug, { preferFresh: true });
  return createStudentResume({
    ownerId: profile.id,
    profile,
    title: resume.title,
    templateKey: resume.template_key,
    importedContent: resume.content,
  });
}

export async function importPortfolioFromSharedPost(linkUrl: string | null | undefined, profile: ProfileRow) {
  const shareSlug = parsePortfolioShareSlug(linkUrl);
  if (!shareSlug) {
    throw new Error("This portfolio share link is not valid anymore.");
  }

  const portfolio = await loadPublicStudentPortfolio(shareSlug, { preferFresh: true });
  return createStudentPortfolio({
    ownerId: profile.id,
    profile,
    title: portfolio.title,
    templateKey: portfolio.template_key,
    importedContent: portfolio.content,
    importedTheme: portfolio.theme,
  });
}

export async function loadWhitebookPreviewFromSharedPost(linkUrl: string | null | undefined): Promise<WhitebookSharePreview> {
  const embeddedPayload = await parseEmbeddedWhitebookPayloadFromLinkUrl(linkUrl);
  if (embeddedPayload) {
    const notebook = createImportedWhitebookNotebook(embeddedPayload, {
      title: embeddedPayload.title,
      sourceShareSlug: null,
    });
    const activePage = getWhitebookActivePage(notebook);

    return {
      id: `embedded-${notebook.id}`,
      title: notebook.title,
      previewSvg: buildWhitebookPreviewSvg(activePage),
      shareSlug: "",
      pageCount: notebook.pages.length,
      owner: null,
    };
  }

  const shareSlug = parseWhitebookShareSlug(linkUrl);
  if (!shareSlug) {
    throw new Error("This WhiteBook share link is not valid anymore.");
  }

  return loadWhitebookSharePreview(shareSlug);
}

export async function loadWhitebookSharedPostPreviewFromSharedPost(
  linkUrl: string | null | undefined
): Promise<WhitebookSharedPostPreview> {
  const embeddedPayload = await parseEmbeddedWhitebookPayloadFromLinkUrl(linkUrl);
  if (embeddedPayload) {
    const pages = embeddedPayload.pages.map((page) => ({
      id: page.id,
      name: page.name,
      itemCount: countWhitebookPageItems(page),
      previewSvg: buildWhitebookPreviewSvg(page),
    }));

    return {
      id: `embedded-${embeddedPayload.activePageId || pages[0]?.id || "whitebook"}`,
      title: embeddedPayload.title,
      shareSlug: "",
      pageCount: pages.length,
      activePageId: embeddedPayload.activePageId || pages[0]?.id || "",
      owner: null,
      pages,
    };
  }

  const shareSlug = parseWhitebookShareSlug(linkUrl);
  if (!shareSlug) {
    throw new Error("This WhiteBook share link is not valid anymore.");
  }

  const sharedWhitebook = await loadPublicStudentWhitebookShare(shareSlug);
  const pages = sharedWhitebook.snapshot.pages.map((page) => ({
    id: page.id,
    name: page.name,
    itemCount: countWhitebookPageItems(page),
    previewSvg: buildWhitebookPreviewSvg(page),
  }));

  return {
    id: sharedWhitebook.id,
    title: sharedWhitebook.title,
    shareSlug: sharedWhitebook.share_slug,
    pageCount: sharedWhitebook.page_count,
    activePageId: sharedWhitebook.snapshot.activePageId || pages[0]?.id || "",
    owner: sharedWhitebook.owner,
    pages,
  };
}

export async function importWhitebookFromSharedPost(linkUrl: string | null | undefined) {
  const embeddedPayload = await parseEmbeddedWhitebookPayloadFromLinkUrl(linkUrl);
  if (embeddedPayload) {
    const notebook = createImportedWhitebookNotebook(embeddedPayload, {
      title: `${embeddedPayload.title} Copy`,
      sourceShareSlug: null,
    });
    await saveLocalWhitebookNotebook(notebook);
    return notebook;
  }

  const shareSlug = parseWhitebookShareSlug(linkUrl);
  if (!shareSlug) {
    throw new Error("This WhiteBook share link is not valid anymore.");
  }

  const sharedWhitebook = await loadPublicStudentWhitebookShare(shareSlug);
  const notebook = createImportedWhitebookNotebook(sharedWhitebook.snapshot, {
    title: `${sharedWhitebook.title} Copy`,
    sourceShareSlug: sharedWhitebook.share_slug,
  });
  await saveLocalWhitebookNotebook(notebook);
  return notebook;
}

export async function loadStudyNotesPreviewFromSharedPost(
  linkUrl: string | null | undefined
): Promise<StudyNotesSharedPostPreview> {
  const shareSlug = parseStudyNotesShareSlug(linkUrl);
  if (!shareSlug) {
    throw new Error("This Video Notes Maker share link is not valid anymore.");
  }

  const sharedFolder = await loadPublicStudentStudyNotesShare(shareSlug);

  return {
    id: sharedFolder.id,
    title: sharedFolder.title,
    folderName: sharedFolder.folder_name,
    shareSlug: sharedFolder.share_slug,
    previewText: sharedFolder.preview_text,
    previewImageDataUrl: sharedFolder.preview_image_data_url,
    entryCount: sharedFolder.entry_count,
    attachmentCount: sharedFolder.attachment_count,
    latestTimestampSeconds: sharedFolder.latest_timestamp_seconds,
    videoUrl: sharedFolder.video_url || sharedFolder.snapshot.folder.videoUrl,
    owner: sharedFolder.owner,
    transcriptText: sharedFolder.snapshot.folder.transcriptText,
    entries: sharedFolder.snapshot.entries
      .slice()
      .sort((left, right) => left.timestampSeconds - right.timestampSeconds)
      .map((entry) => ({
        id: entry.id,
        title: buildEntryDisplayTitle(entry),
        summary: buildEntrySummary(entry),
        timestampSeconds: entry.timestampSeconds,
        attachmentCount: entry.attachments.length,
      })),
  };
}

export async function importStudyNotesFromSharedPost(linkUrl: string | null | undefined) {
  const shareSlug = parseStudyNotesShareSlug(linkUrl);
  if (!shareSlug) {
    throw new Error("This Video Notes Maker share link is not valid anymore.");
  }

  const sharedFolder = await loadPublicStudentStudyNotesShare(shareSlug, { preferFresh: true });
  const imported = importStudyNotesSnapshotToLocal({
    snapshot: sharedFolder.snapshot,
    sourceShareSlug: sharedFolder.share_slug,
  });

  return {
    ...imported,
    share: sharedFolder,
  };
}

export async function loadBugFixResultPreviewFromSharedPost(
  linkUrl: string | null | undefined
): Promise<BugFixResultShareRecord> {
  const shareSlug = parseBugFixResultShareSlug(linkUrl);
  if (!shareSlug) {
    throw new Error("This BugFix result share link is not valid anymore.");
  }

  return loadPublicBugFixResultShare(shareSlug);
}

export async function loadPlayAreaPreviewFromSharedPost(linkUrl: string | null | undefined): Promise<PlayAreaDocument> {
  return loadSharedPlayAreaDocumentFromUrl(linkUrl);
}

export function isPlayAreaSharedPostLink(linkUrl: string | null | undefined) {
  if (!linkUrl) {
    return false;
  }

  try {
    const parsed = new URL(linkUrl, typeof window === "undefined" ? "https://studentsociety.in" : window.location.origin);
    return parsed.pathname.includes("/app/myroom/ai-teacher-playarea/shared") && parsed.searchParams.has("snapshot");
  } catch {
    return false;
  }
}

export async function importPlayAreaFromSharedPost(linkUrl: string | null | undefined) {
  const sharedDocument = await loadSharedPlayAreaDocumentFromUrl(linkUrl);
  const imported = importPlayAreaDocumentSnapshot(sharedDocument);
  savePlayAreaDocument(imported);
  return imported;
}
