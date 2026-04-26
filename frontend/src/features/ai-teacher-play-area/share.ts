import {
  hydrateExternalJsonBlob,
  isExternalR2BlobReference,
  uploadExternalJsonBlob,
  type ExternalR2BlobReference,
} from "../../lib/r2Content";
import { SYSTEM_SHARE_TAG_AI_TEACHER_PLAYAREA } from "../../lib/shareSystem";
import type { PlayAreaDocument } from "./types";
import { normalizePlayAreaDocumentSnapshot } from "./storage";
import { sanitizeFileName } from "./utils";

const DEFAULT_PUBLIC_PLAY_AREA_ORIGIN = "https://studentsociety.in";
export const PLAY_AREA_SYSTEM_SHARE_TAG = SYSTEM_SHARE_TAG_AI_TEACHER_PLAYAREA;

function resolvePublicPlayAreaOrigin() {
  if (typeof window === "undefined" || !window.location?.origin) {
    return DEFAULT_PUBLIC_PLAY_AREA_ORIGIN;
  }

  const { hostname, origin } = window.location;
  const isLocalHost = hostname === "localhost" || hostname === "127.0.0.1" || hostname === "[::1]";
  return isLocalHost ? DEFAULT_PUBLIC_PLAY_AREA_ORIGIN : origin;
}

export function buildPlayAreaEditPath(documentId: string) {
  return `/app/myroom/tools/ai-teacher-play-area?doc=${encodeURIComponent(documentId)}`;
}

export function buildPlayAreaFullViewPath(documentId: string) {
  return `/app/myroom/ai-teacher-playarea/view/${encodeURIComponent(documentId)}`;
}

function encodeSnapshotReference(reference: ExternalR2BlobReference) {
  return encodeURIComponent(JSON.stringify(reference));
}

export function parseSnapshotReference(value: string | null) {
  if (!value) {
    return null;
  }

  try {
    const parsed = JSON.parse(value);
    return isExternalR2BlobReference(parsed) ? parsed : null;
  } catch {
    try {
      const parsed = JSON.parse(decodeURIComponent(value));
      return isExternalR2BlobReference(parsed) ? parsed : null;
    } catch {
      return null;
    }
  }
}

export function buildPlayAreaSharedPath(reference: ExternalR2BlobReference) {
  return `/app/myroom/ai-teacher-playarea/shared?snapshot=${encodeSnapshotReference(reference)}`;
}

export function buildPlayAreaSharedUrl(reference: ExternalR2BlobReference) {
  return `${resolvePublicPlayAreaOrigin()}${buildPlayAreaSharedPath(reference)}`;
}

export async function createHostedPlayAreaShareUrl(documentData: PlayAreaDocument) {
  const snapshotRef = await uploadExternalJsonBlob({
    namespace: "ai_teacher",
    fileName: `${sanitizeFileName(documentData.title)}.playarea.json`,
    data: documentData,
  });

  if (!isExternalR2BlobReference(snapshotRef)) {
    throw new Error("Hosted PlayArea sharing is not available right now. Export JSON still works locally.");
  }

  return buildPlayAreaSharedUrl(snapshotRef);
}

export async function loadSharedPlayAreaDocument(snapshotParam: string | null) {
  const reference = parseSnapshotReference(snapshotParam);
  if (!reference) {
    throw new Error("This PlayArea share link is missing its study snapshot.");
  }

  const hydrated = await hydrateExternalJsonBlob<PlayAreaDocument>(reference, "AI Teacher PlayArea");
  return normalizePlayAreaDocumentSnapshot(hydrated);
}

export async function loadSharedPlayAreaDocumentFromUrl(linkUrl: string | null | undefined) {
  if (!linkUrl) {
    throw new Error("This PlayArea share link is not valid anymore.");
  }

  const parsed = new URL(linkUrl, typeof window === "undefined" ? DEFAULT_PUBLIC_PLAY_AREA_ORIGIN : window.location.origin);
  if (!parsed.pathname.includes("/app/myroom/ai-teacher-playarea/shared")) {
    throw new Error("This PlayArea share link is not valid anymore.");
  }

  return loadSharedPlayAreaDocument(parsed.searchParams.get("snapshot"));
}
