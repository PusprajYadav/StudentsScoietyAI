import { defaultPlatformSettings, loadPlatformSettings } from "../../../lib/api";
import { bustPublicResumeCache, getCachedPublicResume } from "../../../lib/cache";
import {
  deleteExternalR2BlobReference,
  hydrateExternalJsonBlob,
  uploadExternalJsonBlob,
} from "../../../lib/r2Content";
import { supabase } from "../../../lib/supabase";
import { useCoinWalletStore } from "../../../store/coinWalletStore";
import type { ProfileRow, ResumeTemplateKey, StudentResumeWithOwner } from "../../../types/database";
import type { ResumeDocument, ResumeRecord } from "./types";
import {
  clampResumePageCount,
  createDemoResumeDocument,
  createShareSlug,
  normalizeResumeDocument,
} from "./utils";

const resumeSelect = `
  *,
  owner:profiles!student_resumes_owner_id_fkey(
    id,
    username,
    full_name,
    avatar_url
  )
`;

async function normalizeResumeRecord(
  row: StudentResumeWithOwner,
  profile?: ProfileRow | null
): Promise<ResumeRecord> {
  const hydratedContent =
    (await hydrateExternalJsonBlob<ResumeDocument>(row.content, "Resume content")) ?? row.content;
  return {
    ...row,
    content: normalizeResumeDocument(hydratedContent, profile),
    owner: row.owner || null,
  };
}

async function getResumeAccessToken() {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  return session?.access_token || null;
}

async function clearPublicResumeCache(shareSlug: string) {
  const accessToken = await getResumeAccessToken();

  if (!accessToken) {
    return false;
  }

  try {
    return await bustPublicResumeCache(shareSlug, accessToken);
  } catch {
    return false;
  }
}

export async function listStudentResumes(ownerId: string) {
  const { data, error } = await supabase
    .from("student_resumes")
    .select(resumeSelect)
    .eq("owner_id", ownerId)
    .order("updated_at", { ascending: false });

  if (error) {
    throw error;
  }

  return Promise.all(((data || []) as StudentResumeWithOwner[]).map((row) => normalizeResumeRecord(row)));
}

async function getResumeLimit() {
  try {
    const settings = await loadPlatformSettings();
    return settings.max_resumes_per_user;
  } catch {
    return defaultPlatformSettings.max_resumes_per_user;
  }
}

async function ensureResumeCapacity(ownerId: string) {
  const [{ count, error }, resumeLimit] = await Promise.all([
    supabase.from("student_resumes").select("id", { count: "exact", head: true }).eq("owner_id", ownerId),
    getResumeLimit(),
  ]);

  if (error) {
    throw error;
  }

  if ((count || 0) >= resumeLimit) {
    throw new Error(`You can create up to ${resumeLimit} resumes in ATS Resume Maker.`);
  }
}

export async function createStudentResume(input: {
  ownerId: string;
  profile: ProfileRow;
  templateKey?: ResumeTemplateKey;
  title?: string;
  importedContent?: ResumeDocument;
}) {
  await ensureResumeCapacity(input.ownerId);

  const defaultTitle = `${input.profile.full_name || input.profile.username} Resume`;
  const contentPayload = input.importedContent || createDemoResumeDocument(input.profile);
  const contentRef = await uploadExternalJsonBlob({
    namespace: "resume",
    fileName: `${input.title?.trim() || defaultTitle}.json`,
    data: contentPayload,
  });
  const payload = {
    owner_id: input.ownerId,
    title: input.title?.trim() || defaultTitle,
    template_key: input.templateKey || "ats_classic",
    content: contentRef,
    page_count: 1,
  };

  try {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const shareSlug = createShareSlug(payload.title || input.profile.username);
      const { data, error } = await supabase
        .from("student_resumes")
        .insert({
          ...payload,
          share_slug: shareSlug,
        })
        .select(resumeSelect)
        .single();

      if (!error) {
        void useCoinWalletStore.getState().refreshWallet().catch(() => undefined);
        return normalizeResumeRecord(data as StudentResumeWithOwner, input.profile);
      }

      if (error.code !== "23505") {
        throw error;
      }
    }
  } catch (error) {
    await deleteExternalR2BlobReference(contentRef).catch(() => undefined);
    throw error;
  }

  await deleteExternalR2BlobReference(contentRef).catch(() => undefined);
  throw new Error("Could not create a unique public share link. Please try again.");
}

export async function loadStudentResumeForOwner(input: {
  resumeId: string;
  ownerId: string;
  profile?: ProfileRow | null;
}) {
  const { data, error } = await supabase
    .from("student_resumes")
    .select(resumeSelect)
    .eq("id", input.resumeId)
    .eq("owner_id", input.ownerId)
    .single();

  if (error) {
    throw error;
  }

  return normalizeResumeRecord(data as StudentResumeWithOwner, input.profile);
}

export async function saveStudentResume(input: {
  resumeId: string;
  ownerId: string;
  title: string;
  templateKey: ResumeTemplateKey;
  content: ResumeDocument;
  isLive: boolean;
  pageCount: number;
}) {
  const { data: currentRecord, error: currentError } = await supabase
    .from("student_resumes")
    .select("content")
    .eq("id", input.resumeId)
    .eq("owner_id", input.ownerId)
    .single();

  if (currentError) {
    throw currentError;
  }

  const nextContentRef = await uploadExternalJsonBlob({
    namespace: "resume",
    fileName: `${input.title.trim() || "resume"}.json`,
    data: input.content,
  });

  const { data, error } = await supabase
    .from("student_resumes")
    .update({
      title: input.title.trim() || "Untitled resume",
      template_key: input.templateKey,
      content: nextContentRef,
      is_live: input.isLive,
      page_count: clampResumePageCount(input.pageCount),
    })
    .eq("id", input.resumeId)
    .eq("owner_id", input.ownerId)
    .select(resumeSelect)
    .single();

  if (error) {
    await deleteExternalR2BlobReference(nextContentRef).catch(() => undefined);
    throw error;
  }

  await deleteExternalR2BlobReference(currentRecord?.content).catch(() => undefined);
  const normalized = await normalizeResumeRecord(data as StudentResumeWithOwner);
  await clearPublicResumeCache(normalized.share_slug);
  return normalized;
}

export async function deleteStudentResume(input: {
  resumeId: string;
  ownerId: string;
  shareSlug: string;
}) {
  const { data: currentRecord, error: currentError } = await supabase
    .from("student_resumes")
    .select("content")
    .eq("id", input.resumeId)
    .eq("owner_id", input.ownerId)
    .single();

  if (currentError) {
    throw currentError;
  }

  const { error } = await supabase
    .from("student_resumes")
    .delete()
    .eq("id", input.resumeId)
    .eq("owner_id", input.ownerId);

  if (error) {
    throw error;
  }

  await deleteExternalR2BlobReference(currentRecord?.content).catch(() => undefined);
  await clearPublicResumeCache(input.shareSlug);
}

export async function loadPublicStudentResume(
  shareSlug: string,
  options?: { preferFresh?: boolean }
) {
  if (!options?.preferFresh) {
    const cached = await getCachedPublicResume(shareSlug);

    if (cached) {
      return normalizeResumeRecord(cached as StudentResumeWithOwner);
    }
  }

  const { data, error } = await supabase
    .from("student_resumes")
    .select(resumeSelect)
    .eq("share_slug", shareSlug)
    .eq("is_live", true)
    .single();

  if (!error) {
    return normalizeResumeRecord(data as StudentResumeWithOwner);
  }

  if (options?.preferFresh) {
    const cached = await getCachedPublicResume(shareSlug);

    if (cached) {
      return normalizeResumeRecord(cached as StudentResumeWithOwner);
    }
  }

  throw error;
}
