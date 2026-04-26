import { getCachedPublicStudyNotes } from "../../../lib/cache";
import { uploadManagedMedia } from "../../../lib/api";
import {
  deleteExternalR2BlobReference,
  hydrateExternalJsonBlob,
  uploadExternalJsonBlob,
} from "../../../lib/r2Content";
import { supabase } from "../../../lib/supabase";
import type { StudyNotesSharePreview, StudyNotesShareRecord, StudyNotesShareSnapshot } from "./types";
import {
  buildStudyNotesSharePreviewFields,
  createStudyNotesShareSlug,
  normalizeStudyNotesSharePreview,
  normalizeStudyNotesShareRecord,
  normalizeStudyNotesShareSnapshot,
} from "./helpers";

const studyNotesSelect = `
  *,
  owner:profiles!student_study_note_shares_owner_id_fkey(
    id,
    username,
    full_name,
    avatar_url
  )
`;

const studyNotesPreviewSelect = `
  id,
  title,
  folder_name,
  preview_text,
  preview_image_data_url,
  share_slug,
  entry_count,
  attachment_count,
  latest_timestamp_seconds,
  video_url,
  owner:profiles!student_study_note_shares_owner_id_fkey(
    id,
    username,
    full_name,
    avatar_url
  )
`;

const studyNotesPreviewCache = new Map<string, Promise<StudyNotesSharePreview>>();
const studyNotesRecordCache = new Map<string, Promise<StudyNotesShareRecord>>();

function dataUrlToFile(dataUrl: string, filename: string) {
  const match = dataUrl.match(/^data:([^;,]+)?(?:;charset=[^;,]+)?;base64,(.+)$/i);

  if (!match) {
    throw new Error("Study note attachment data could not be prepared for upload.");
  }

  const mimeType = match[1] || "image/png";
  const binary = atob(match[2]);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return new File([bytes], filename, {
    type: mimeType,
    lastModified: Date.now(),
  });
}

async function prepareStudyNotesSnapshotForStorage(snapshotInput: StudyNotesShareSnapshot) {
  const snapshot = normalizeStudyNotesShareSnapshot(snapshotInput);
  const uploadCache = new Map<string, Promise<string>>();
  const entries = await Promise.all(
    snapshot.entries.map(async (entry) => ({
      ...entry,
      attachments: await Promise.all(
        entry.attachments.map(async (attachment, index) => {
          if (!attachment.dataUrl.startsWith("data:")) {
            return attachment;
          }

          let uploadRequest = uploadCache.get(attachment.dataUrl);
          if (!uploadRequest) {
            const file = dataUrlToFile(attachment.dataUrl, attachment.name || `study-note-${index + 1}.png`);
            uploadRequest = uploadManagedMedia({
              file,
              usage: "post_image",
            }).then((asset) => asset.public_url);
            uploadCache.set(attachment.dataUrl, uploadRequest);
          }

          return {
            ...attachment,
            dataUrl: await uploadRequest,
          };
        })
      ),
    }))
  );

  return {
    ...snapshot,
    entries,
  } satisfies StudyNotesShareSnapshot;
}

async function normalizeHydratedStudyNotesShareRecord(row: Record<string, unknown>) {
  const hydratedSnapshot =
    (await hydrateExternalJsonBlob<StudyNotesShareSnapshot>(row.snapshot, "Study notes content")) ?? row.snapshot;
  return normalizeStudyNotesShareRecord({
    ...row,
    snapshot: hydratedSnapshot,
  });
}

export async function createStudentStudyNotesShare(input: {
  ownerId: string;
  title: string;
  snapshot: StudyNotesShareSnapshot;
}) {
  const normalizedSnapshot = normalizeStudyNotesShareSnapshot(input.snapshot);
  const preparedSnapshot = await prepareStudyNotesSnapshotForStorage(normalizedSnapshot);
  const preview = buildStudyNotesSharePreviewFields(preparedSnapshot);
  const snapshotRef = await uploadExternalJsonBlob({
    namespace: "study_notes",
    fileName: `${input.title.trim() || preview.folderName}.json`,
    data: preparedSnapshot,
  });
  const payload = {
    owner_id: input.ownerId,
    title: input.title.trim() || `Video Notes Maker: ${preview.folderName}`,
    folder_name: preview.folderName,
    snapshot: snapshotRef,
    preview_text: preview.previewText,
    preview_image_data_url: preview.previewImageDataUrl,
    entry_count: preview.entryCount,
    attachment_count: preview.attachmentCount,
    latest_timestamp_seconds: preview.latestTimestampSeconds,
    video_url: preview.videoUrl,
  };

  try {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const shareSlug = createStudyNotesShareSlug(`${payload.title}-${payload.folder_name}`);
      const { data, error } = await supabase
        .from("student_study_note_shares")
        .insert({
          ...payload,
          share_slug: shareSlug,
        })
        .select(studyNotesSelect)
        .single();

      if (!error) {
        const normalized = await normalizeHydratedStudyNotesShareRecord(data as Record<string, unknown>);
        studyNotesPreviewCache.set(
          normalized.share_slug,
          Promise.resolve(normalizeStudyNotesSharePreview(data as Record<string, unknown>))
        );
        studyNotesRecordCache.set(normalized.share_slug, Promise.resolve(normalized));
        return normalized;
      }

      if (error.code !== "23505") {
        throw error;
      }
    }
  } catch (error) {
    await deleteExternalR2BlobReference(snapshotRef).catch(() => undefined);
    throw error;
  }

  await deleteExternalR2BlobReference(snapshotRef).catch(() => undefined);
  throw new Error("Could not create a unique Video Notes Maker share link. Please try again.");
}

export async function loadStudyNotesSharePreview(shareSlug: string, options?: { preferFresh?: boolean }) {
  if (!shareSlug) {
    throw new Error("Missing Video Notes Maker share link.");
  }

  if (!options?.preferFresh) {
    const cachedPreview = studyNotesPreviewCache.get(shareSlug);
    if (cachedPreview) {
      return cachedPreview;
    }

    const cached = await getCachedPublicStudyNotes(shareSlug, { preview: true });
    if (cached) {
      const normalized = normalizeStudyNotesSharePreview(cached as Record<string, unknown>);
      studyNotesPreviewCache.set(shareSlug, Promise.resolve(normalized));
      return normalized;
    }
  }

  const request = supabase
    .from("student_study_note_shares")
    .select(studyNotesPreviewSelect)
    .eq("share_slug", shareSlug)
    .single()
    .then(({ data, error }) => {
      if (error) {
        throw error;
      }

      return normalizeStudyNotesSharePreview(data as Record<string, unknown>);
    });

  studyNotesPreviewCache.set(shareSlug, request);

  try {
    return await request;
  } catch (error) {
    studyNotesPreviewCache.delete(shareSlug);
    if (options?.preferFresh) {
      const cached = await getCachedPublicStudyNotes(shareSlug, { preview: true });
      if (cached) {
        return normalizeStudyNotesSharePreview(cached as Record<string, unknown>);
      }
    }
    throw error;
  }
}

export async function loadPublicStudentStudyNotesShare(shareSlug: string, options?: { preferFresh?: boolean }) {
  if (!shareSlug) {
    throw new Error("Missing Video Notes Maker share link.");
  }

  if (!options?.preferFresh) {
    const cachedRecord = studyNotesRecordCache.get(shareSlug);
    if (cachedRecord) {
      return cachedRecord;
    }

    const cached = await getCachedPublicStudyNotes(shareSlug);
    if (cached) {
      const normalized = await normalizeHydratedStudyNotesShareRecord(cached as Record<string, unknown>);
      studyNotesRecordCache.set(shareSlug, Promise.resolve(normalized));
      return normalized;
    }
  }

  const request = supabase
    .from("student_study_note_shares")
    .select(studyNotesSelect)
    .eq("share_slug", shareSlug)
    .single()
    .then(async ({ data, error }) => {
      if (error) {
        throw error;
      }

      return normalizeHydratedStudyNotesShareRecord(data as Record<string, unknown>);
    });

  studyNotesRecordCache.set(shareSlug, request);

  try {
    return await request;
  } catch (error) {
    studyNotesRecordCache.delete(shareSlug);
    if (options?.preferFresh) {
      const cached = await getCachedPublicStudyNotes(shareSlug);
      if (cached) {
        return normalizeHydratedStudyNotesShareRecord(cached as Record<string, unknown>);
      }
    }
    throw error;
  }
}
