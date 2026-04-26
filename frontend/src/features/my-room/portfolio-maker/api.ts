import { defaultPlatformSettings, loadPlatformSettings } from "../../../lib/api";
import { bustPublicPortfolioCache, getCachedPublicPortfolio } from "../../../lib/cache";
import {
  deleteExternalR2BlobReference,
  hydrateExternalJsonBlob,
  uploadExternalJsonBlob,
} from "../../../lib/r2Content";
import { supabase } from "../../../lib/supabase";
import { useCoinWalletStore } from "../../../store/coinWalletStore";
import type { ProfileRow } from "../../../types/database";
import type { PortfolioDocument, PortfolioRecord, PortfolioTemplateKey, StudentPortfolioWithOwner } from "./types";
import { createDemoPortfolioDocument, createShareSlug, normalizePortfolioDocument, normalizeTheme } from "./utils";

const portfolioSelect = `
  *,
  owner:profiles!student_portfolios_owner_id_fkey(
    id,
    username,
    full_name,
    avatar_url
  )
`;

async function normalizePortfolioRecord(
  row: StudentPortfolioWithOwner,
  profile?: ProfileRow | null
): Promise<PortfolioRecord> {
  const hydratedContent =
    (await hydrateExternalJsonBlob<PortfolioDocument>(row.content, "Portfolio content")) ?? row.content;
  const hydratedTheme = (await hydrateExternalJsonBlob(row.theme, "Portfolio theme")) ?? row.theme;
  return {
    ...row,
    content: normalizePortfolioDocument(hydratedContent, profile),
    theme: normalizeTheme(hydratedTheme, row.template_key),
    owner: row.owner || null,
  };
}

async function getPortfolioAccessToken() {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  return session?.access_token || null;
}

async function clearPublicPortfolioCache(shareSlug: string) {
  const accessToken = await getPortfolioAccessToken();

  if (!accessToken) {
    return false;
  }

  try {
    return await bustPublicPortfolioCache(shareSlug, accessToken);
  } catch {
    return false;
  }
}

export async function listStudentPortfolios(ownerId: string) {
  const { data, error } = await supabase
    .from("student_portfolios")
    .select(portfolioSelect)
    .eq("owner_id", ownerId)
    .order("updated_at", { ascending: false });

  if (error) {
    throw error;
  }

  return Promise.all(((data || []) as StudentPortfolioWithOwner[]).map((row) => normalizePortfolioRecord(row)));
}

async function getPortfolioLimit() {
  try {
    const settings = await loadPlatformSettings();
    return settings.max_portfolios_per_user;
  } catch {
    return defaultPlatformSettings.max_portfolios_per_user;
  }
}

async function ensurePortfolioCapacity(ownerId: string) {
  const [{ count, error }, portfolioLimit] = await Promise.all([
    supabase.from("student_portfolios").select("id", { count: "exact", head: true }).eq("owner_id", ownerId),
    getPortfolioLimit(),
  ]);

  if (error) {
    throw error;
  }

  if ((count || 0) >= portfolioLimit) {
    throw new Error(`You can create up to ${portfolioLimit} portfolios.`);
  }
}

export async function createStudentPortfolio(input: {
  ownerId: string;
  profile: ProfileRow;
  templateKey?: PortfolioTemplateKey;
  title?: string;
  importedContent?: PortfolioDocument;
  importedTheme?: unknown;
}) {
  await ensurePortfolioCapacity(input.ownerId);

  const defaultTitle = `${input.profile.full_name || input.profile.username} Portfolio`;
  const contentPayload =
    input.importedContent || createDemoPortfolioDocument(input.profile, input.templateKey || "minimal_hero");
  const themePayload = normalizeTheme(input.importedTheme, input.templateKey || "minimal_hero");
  const [contentRef, themeRef] = await Promise.all([
    uploadExternalJsonBlob({
      namespace: "portfolio",
      fileName: `${input.title?.trim() || defaultTitle}-content.json`,
      data: contentPayload,
    }),
    uploadExternalJsonBlob({
      namespace: "portfolio",
      fileName: `${input.title?.trim() || defaultTitle}-theme.json`,
      data: themePayload,
    }),
  ]);
  const payload = {
    owner_id: input.ownerId,
    title: input.title?.trim() || defaultTitle,
    template_key: input.templateKey || "minimal_hero",
    content: contentRef,
    theme: themeRef,
  };

  try {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const shareSlug = createShareSlug(payload.title || input.profile.username);
      const { data, error } = await supabase
        .from("student_portfolios")
        .insert({
          ...payload,
          share_slug: shareSlug,
        })
        .select(portfolioSelect)
        .single();

      if (!error) {
        void useCoinWalletStore.getState().refreshWallet().catch(() => undefined);
        return normalizePortfolioRecord(data as StudentPortfolioWithOwner, input.profile);
      }

      if (error.code !== "23505") {
        throw error;
      }
    }
  } catch (error) {
    await Promise.allSettled([
      deleteExternalR2BlobReference(contentRef),
      deleteExternalR2BlobReference(themeRef),
    ]);
    throw error;
  }

  await Promise.allSettled([
    deleteExternalR2BlobReference(contentRef),
    deleteExternalR2BlobReference(themeRef),
  ]);
  throw new Error("Could not create a unique public share link. Please try again.");
}

export async function loadStudentPortfolioForOwner(input: {
  portfolioId: string;
  ownerId: string;
  profile?: ProfileRow | null;
}) {
  const { data, error } = await supabase
    .from("student_portfolios")
    .select(portfolioSelect)
    .eq("id", input.portfolioId)
    .eq("owner_id", input.ownerId)
    .single();

  if (error) {
    throw error;
  }

  return normalizePortfolioRecord(data as StudentPortfolioWithOwner, input.profile);
}

export async function saveStudentPortfolio(input: {
  portfolioId: string;
  ownerId: string;
  title: string;
  templateKey: PortfolioTemplateKey;
  content: PortfolioDocument;
  theme: unknown;
  isLive: boolean;
}) {
  const { data: currentRecord, error: currentError } = await supabase
    .from("student_portfolios")
    .select("content,theme")
    .eq("id", input.portfolioId)
    .eq("owner_id", input.ownerId)
    .single();

  if (currentError) {
    throw currentError;
  }

  const [nextContentRef, nextThemeRef] = await Promise.all([
    uploadExternalJsonBlob({
      namespace: "portfolio",
      fileName: `${input.title.trim() || "portfolio"}-content.json`,
      data: input.content,
    }),
    uploadExternalJsonBlob({
      namespace: "portfolio",
      fileName: `${input.title.trim() || "portfolio"}-theme.json`,
      data: input.theme,
    }),
  ]);

  const { data, error } = await supabase
    .from("student_portfolios")
    .update({
      title: input.title.trim() || "Untitled portfolio",
      template_key: input.templateKey,
      content: nextContentRef,
      theme: nextThemeRef,
      is_live: input.isLive,
    })
    .eq("id", input.portfolioId)
    .eq("owner_id", input.ownerId)
    .select(portfolioSelect)
    .single();

  if (error) {
    await Promise.allSettled([
      deleteExternalR2BlobReference(nextContentRef),
      deleteExternalR2BlobReference(nextThemeRef),
    ]);
    throw error;
  }

  await Promise.allSettled([
    deleteExternalR2BlobReference(currentRecord?.content),
    deleteExternalR2BlobReference(currentRecord?.theme),
  ]);
  const normalized = await normalizePortfolioRecord(data as StudentPortfolioWithOwner);
  await clearPublicPortfolioCache(normalized.share_slug);
  return normalized;
}

export async function deleteStudentPortfolio(input: {
  portfolioId: string;
  ownerId: string;
  shareSlug: string;
}) {
  const { data: currentRecord, error: currentError } = await supabase
    .from("student_portfolios")
    .select("content,theme")
    .eq("id", input.portfolioId)
    .eq("owner_id", input.ownerId)
    .single();

  if (currentError) {
    throw currentError;
  }

  const { error } = await supabase
    .from("student_portfolios")
    .delete()
    .eq("id", input.portfolioId)
    .eq("owner_id", input.ownerId);

  if (error) {
    throw error;
  }

  await Promise.allSettled([
    deleteExternalR2BlobReference(currentRecord?.content),
    deleteExternalR2BlobReference(currentRecord?.theme),
  ]);
  await clearPublicPortfolioCache(input.shareSlug);
}

export async function loadPublicStudentPortfolio(shareSlug: string, options?: { preferFresh?: boolean }) {
  if (!options?.preferFresh) {
    const cached = await getCachedPublicPortfolio(shareSlug);

    if (cached) {
      return normalizePortfolioRecord(cached as StudentPortfolioWithOwner);
    }
  }

  const { data, error } = await supabase
    .from("student_portfolios")
    .select(portfolioSelect)
    .eq("share_slug", shareSlug)
    .eq("is_live", true)
    .single();

  if (!error) {
    return normalizePortfolioRecord(data as StudentPortfolioWithOwner);
  }

  if (options?.preferFresh) {
    const cached = await getCachedPublicPortfolio(shareSlug);

    if (cached) {
      return normalizePortfolioRecord(cached as StudentPortfolioWithOwner);
    }
  }

  throw error;
}
