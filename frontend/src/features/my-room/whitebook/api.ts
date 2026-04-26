import { uploadManagedMedia } from "../../../lib/api";
import {
  deleteExternalR2BlobReference,
  hydrateExternalJsonBlob,
  uploadExternalJsonBlob,
} from "../../../lib/r2Content";
import { supabase } from "../../../lib/supabase";
import type { WhitebookExportPayload, WhitebookSharePreview, WhitebookShareRecord } from "./types";
import { createWhitebookShareSlug, normalizeWhitebookExportPayload } from "./utils";

const whitebookSelect = `
  *,
  owner:profiles!student_whitebooks_owner_id_fkey(
    id,
    username,
    full_name,
    avatar_url
  )
`;

const whitebookPreviewSelect = `
  id,
  title,
  preview_svg,
  share_slug,
  page_count,
  owner:profiles!student_whitebooks_owner_id_fkey(
    id,
    username,
    full_name,
    avatar_url
  )
`;

const whitebookPreviewCache = new Map<string, Promise<WhitebookSharePreview>>();
const whitebookRecordCache = new Map<string, Promise<WhitebookShareRecord>>();

function dataUrlToFile(dataUrl: string, filename: string) {
  const match = dataUrl.match(/^data:([^;,]+)?(?:;charset=[^;,]+)?;base64,(.+)$/i);

  if (!match) {
    throw new Error("WhiteBook image data could not be prepared for upload.");
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

async function prepareWhitebookSnapshotForStorage(snapshotInput: WhitebookExportPayload) {
  const snapshot = normalizeWhitebookExportPayload(snapshotInput);
  const uploadCache = new Map<string, Promise<string>>();
  const pages = await Promise.all(
    snapshot.pages.map(async (page) => ({
      ...page,
      images: await Promise.all(
        page.images.map(async (image, index) => {
          if (!image.src.startsWith("data:")) {
            return image;
          }

          let uploadRequest = uploadCache.get(image.src);
          if (!uploadRequest) {
            const file = dataUrlToFile(image.src, image.name || `whitebook-image-${index + 1}.png`);
            uploadRequest = uploadManagedMedia({
              file,
              usage: "post_image",
            }).then((asset) => asset.public_url);
            uploadCache.set(image.src, uploadRequest);
          }

          return {
            ...image,
            src: await uploadRequest,
          };
        })
      ),
    }))
  );

  return {
    ...snapshot,
    pages,
  } satisfies WhitebookExportPayload;
}

async function normalizeWhitebookShareRecord(row: Record<string, unknown>): Promise<WhitebookShareRecord> {
  const hydratedSnapshot =
    (await hydrateExternalJsonBlob<WhitebookExportPayload>(row.snapshot, "WhiteBook content")) ?? row.snapshot;
  return {
    id: typeof row.id === "string" ? row.id : "",
    owner_id: typeof row.owner_id === "string" ? row.owner_id : "",
    title: typeof row.title === "string" && row.title.trim() ? row.title.trim() : "Shared WhiteBook",
    snapshot: normalizeWhitebookExportPayload(hydratedSnapshot),
    preview_svg: typeof row.preview_svg === "string" && row.preview_svg.trim() ? row.preview_svg : null,
    share_slug: typeof row.share_slug === "string" ? row.share_slug : "",
    page_count: Number(row.page_count) > 0 ? Number(row.page_count) : 1,
    created_at: typeof row.created_at === "string" ? row.created_at : new Date().toISOString(),
    updated_at: typeof row.updated_at === "string" ? row.updated_at : new Date().toISOString(),
    owner:
      row.owner && typeof row.owner === "object"
        ? (row.owner as WhitebookShareRecord["owner"])
        : null,
  };
}

function normalizeWhitebookSharePreview(row: Record<string, unknown>): WhitebookSharePreview {
  return {
    id: typeof row.id === "string" ? row.id : "",
    title: typeof row.title === "string" && row.title.trim() ? row.title.trim() : "Shared WhiteBook",
    previewSvg: typeof row.preview_svg === "string" && row.preview_svg.trim() ? row.preview_svg : null,
    shareSlug: typeof row.share_slug === "string" ? row.share_slug : "",
    pageCount: Number(row.page_count) > 0 ? Number(row.page_count) : 1,
    owner:
      row.owner && typeof row.owner === "object"
        ? (row.owner as WhitebookSharePreview["owner"])
        : null,
  };
}

export async function createStudentWhitebookShare(input: {
  ownerId: string;
  title: string;
  snapshot: WhitebookExportPayload;
  previewSvg: string | null;
}) {
  const preparedSnapshot = await prepareWhitebookSnapshotForStorage(input.snapshot);
  const snapshotRef = await uploadExternalJsonBlob({
    namespace: "whitebook",
    fileName: `${input.title.trim() || "whitebook"}.json`,
    data: preparedSnapshot,
  });
  const payload = {
    owner_id: input.ownerId,
    title: input.title.trim() || "Shared WhiteBook",
    snapshot: snapshotRef,
    preview_svg: input.previewSvg || null,
    page_count: Math.max(1, preparedSnapshot.pages.length),
  };

  try {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const shareSlug = createWhitebookShareSlug(payload.title);
      const { data, error } = await supabase
        .from("student_whitebooks")
        .insert({
          ...payload,
          share_slug: shareSlug,
        })
        .select(whitebookSelect)
        .single();

      if (!error) {
        const normalized = await normalizeWhitebookShareRecord(data as Record<string, unknown>);
        whitebookPreviewCache.delete(normalized.share_slug);
        whitebookRecordCache.set(normalized.share_slug, Promise.resolve(normalized));
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
  throw new Error("Could not create a unique WhiteBook share link. Please try again.");
}

export async function loadWhitebookSharePreview(shareSlug: string) {
  if (!shareSlug) {
    throw new Error("Missing WhiteBook share link.");
  }

  const cached = whitebookPreviewCache.get(shareSlug);
  if (cached) {
    return cached;
  }

  const request = supabase
    .from("student_whitebooks")
    .select(whitebookPreviewSelect)
    .eq("share_slug", shareSlug)
    .single()
    .then(({ data, error }) => {
      if (error) {
        throw error;
      }

      return normalizeWhitebookSharePreview(data as Record<string, unknown>);
    });

  whitebookPreviewCache.set(shareSlug, request);

  try {
    return await request;
  } catch (error) {
    whitebookPreviewCache.delete(shareSlug);
    throw error;
  }
}

export async function loadPublicStudentWhitebookShare(shareSlug: string) {
  if (!shareSlug) {
    throw new Error("Missing WhiteBook share link.");
  }

  const cached = whitebookRecordCache.get(shareSlug);
  if (cached) {
    return cached;
  }

  const request = supabase
    .from("student_whitebooks")
    .select(whitebookSelect)
    .eq("share_slug", shareSlug)
    .single()
    .then(async ({ data, error }) => {
      if (error) {
        throw error;
      }

      return normalizeWhitebookShareRecord(data as Record<string, unknown>);
    });

  whitebookRecordCache.set(shareSlug, request);

  try {
    return await request;
  } catch (error) {
    whitebookRecordCache.delete(shareSlug);
    throw error;
  }
}
