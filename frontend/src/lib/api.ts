import {
  clearDeviceCache,
  clearBackendCache,
  getCachedCommunityMembersForAdmin,
  getCachedCommunityMembershipDetails,
  getCachedCommunityMemberships,
  getCachedCommunities,
  getCachedCommunityFeed,
  getCachedDiscussionFeed,
  getCachedFollowingIds,
  getCachedHiddenCommunityIds,
  getCachedRecentProfiles,
  getCachedSearchResults,
  saveCachedCommunities,
  saveCachedCommunityFeed,
  saveCachedCommunityMembersForAdmin,
  saveCachedCommunityMembershipDetails,
  saveCachedCommunityMemberships,
  saveCachedDiscussionFeed,
  saveCachedFollowingIds,
  saveCachedHiddenCommunityIds,
  saveCachedRecentProfiles,
  saveCachedSearchResults,
  type CachedCommunityMembershipDetail,
} from "./cache";
import { requestBackend, uploadToPresignedUrl } from "./backendApi";
import {
  clearLocalNotifications,
  deleteLocalNotification,
  listLocalNotifications,
  markLocalNotificationsAsRead,
} from "./notifications/localStore";
import {
  POST_TITLE_MAX_LENGTH,
  normalizePostTags,
  normalizeStoredPostContent,
  normalizeStoredPostTitle,
} from "./postLimits";
import { prepareManagedMediaUploadFile } from "./mediaCompression";
import { extractMentionUsernames } from "./mentions";
import { createDefaultNotificationPushPreferences } from "./notificationPushPreferences";
import type { DiscussionCommunityFeedMode } from "./discussionFeedPreferences";
import { supabase } from "./supabase";
import { useCoinWalletStore } from "../store/coinWalletStore";
import type {
  CommunityFeedVisibility,
  CommunityJoinPolicy,
  CommunityMemberRole,
  CommunityMemberStatus,
  CommunityMemberWithProfile,
  CommunityRow,
  CommentWithAuthor,
  DiscussionKind,
  MediaAssetWithRelations,
  MediaUsage,
  NotificationPushPreferencesRow,
  NotificationType,
  PlatformSettingsRow,
  PollVoteRow,
  PostScope,
  PostType,
  PostWithRelations,
  ProfileRow,
  SearchResults,
  AdminBucketObjectRow,
} from "../types/database";

export const defaultPlatformSettings: PlatformSettingsRow = {
  id: 1,
  max_images_per_post: 5,
  max_pdf_size_mb: 10,
  max_resumes_per_user: 5,
  max_portfolios_per_user: 5,
  signup_bonus_coins: 100,
  referral_reward_coins: 25,
  enable_profile_view_notifications: true,
  ai_mention_reply_profile_id: null,
  ai_mention_reply_max_tokens: 220,
  created_at: new Date(0).toISOString(),
  updated_at: new Date(0).toISOString(),
};

export const postSelect = `
  *,
  author:profiles!posts_author_id_fkey(*),
  community:communities(*),
  likes(*),
  shares(*),
  poll_votes(*),
  comments(
    *,
    author:profiles!comments_author_id_fkey(*)
  )
`;

function sortCommentsForDisplay(
  left: Pick<CommentWithAuthor, "created_at" | "is_ai_generated">,
  right: Pick<CommentWithAuthor, "created_at" | "is_ai_generated">
) {
  if (left.is_ai_generated !== right.is_ai_generated) {
    return left.is_ai_generated ? -1 : 1;
  }

  return left.created_at.localeCompare(right.created_at);
}

function normalizeCommentTree(records: CommentWithAuthor[]) {
  const clones = records
    .map((comment) => ({
      ...comment,
      author: comment.author || null,
      parent_comment_id: comment.parent_comment_id || null,
      is_ai_generated: Boolean(comment.is_ai_generated),
      ai_generation_job_id: comment.ai_generation_job_id || null,
      replies: [],
    }))
    .sort(sortCommentsForDisplay);

  const byId = new Map<string, CommentWithAuthor>();
  const roots: CommentWithAuthor[] = [];

  clones.forEach((comment) => {
    byId.set(comment.id, comment);
  });

  clones.forEach((comment) => {
    if (comment.parent_comment_id && byId.has(comment.parent_comment_id)) {
      byId.get(comment.parent_comment_id)?.replies?.push(comment);
      return;
    }

    roots.push(comment);
  });

  return roots;
}

function normalizePost(record: Record<string, unknown>) {
  const post = record as PostWithRelations;
  const imageUrls = [...(post.image_urls || [])];

  if (post.image_url && !imageUrls.includes(post.image_url)) {
    imageUrls.unshift(post.image_url);
  }

  return {
    ...post,
    tags: post.tags || [],
    image_urls: imageUrls,
    poll_options: post.poll_options || [],
    likes: post.likes || [],
    shares: post.shares || [],
    poll_votes: (post.poll_votes || []) as PollVoteRow[],
    author: post.author || null,
    community: post.community || null,
    comments: normalizeCommentTree((post.comments || []) as CommentWithAuthor[]),
  } as PostWithRelations;
}

function normalizeIdArray(value?: Set<string> | string[]) {
  return Array.isArray(value) ? value : Array.from(value || []);
}

function postMatchesDiscussionCommunityMode(
  post: PostWithRelations,
  hiddenCommunityIds: Set<string>,
  communityFeedMode: DiscussionCommunityFeedMode,
  joinedCommunityIds: Set<string>
) {
  if (post.visibility_scope !== "community") {
    return communityFeedMode !== "joined-only";
  }

  if ((post.community?.feed_visibility || "community_only") !== "discussion_and_community") {
    return false;
  }

  if (post.community_id && hiddenCommunityIds.has(post.community_id)) {
    return false;
  }

  if (communityFeedMode === "joined-only") {
    return Boolean(post.community_id && joinedCommunityIds.has(post.community_id));
  }

  return true;
}

export interface PageChunk<T> {
  items: T[];
  nextOffset: number;
  hasMore: boolean;
  totalCount: number | null;
}

export interface ProfileActivitySummary {
  postsCount: number;
  jobPostsCount: number;
  commentsCount: number;
  likesReceivedCount: number;
  followersCount: number;
  followingCount: number;
  viewerIsFollower: boolean;
  viewerIsFollowing: boolean;
}

export interface CommunityMembershipDetails {
  community_id: string;
  role: CommunityMemberRole;
  status: CommunityMemberStatus;
  requested_at: string;
  accepted_at: string | null;
  accepted_by: string | null;
  banned_reason: string | null;
  joined_via_password_version: number;
}

export interface CommunityJoinResult {
  join_result: "joined" | "pending" | "already_member";
  member_status: CommunityMemberStatus;
  community_id: string;
}

function isPubliclyAttributablePost(post: Pick<PostWithRelations, "visibility_scope" | "is_anonymous">) {
  return !post.is_anonymous;
}

function normalizeAllowedProfileKinds(allowedKinds?: DiscussionKind[]) {
  return Array.from(new Set((allowedKinds || ["study", "job"]).filter((kind) => kind !== "anonymous")));
}

function buildPageChunk<T>(
  items: T[],
  input: {
    offset: number;
    limit: number;
    consumedCount?: number;
    totalCount?: number | null;
  }
): PageChunk<T> {
  const consumedCount = input.consumedCount ?? items.length;
  const nextOffset = input.offset + consumedCount;
  const totalCount = typeof input.totalCount === "number" ? input.totalCount : null;

  return {
    items,
    nextOffset,
    hasMore: totalCount !== null ? nextOffset < totalCount : consumedCount === input.limit,
    totalCount,
  };
}

function normalizeLinkUrl(value?: string | null) {
  const trimmed = value?.trim();

  if (!trimmed) {
    return null;
  }

  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }

  return `https://${trimmed}`;
}

function buildFallbackTitle(input: {
  title?: string | null;
  content?: string | null;
  pollQuestion?: string | null;
  imageCount?: number;
  hasPdf?: boolean;
}) {
  const trimmedTitle = normalizeStoredPostTitle(input.title);

  if (trimmedTitle) {
    return trimmedTitle;
  }

  const trimmedPoll = (input.pollQuestion?.trim() || "").slice(0, POST_TITLE_MAX_LENGTH);
  if (trimmedPoll) {
    return trimmedPoll;
  }

  const trimmedContent = normalizeStoredPostContent(input.content);
  if (trimmedContent) {
    return trimmedContent.slice(0, POST_TITLE_MAX_LENGTH);
  }

  if (input.hasPdf) {
    return "Shared PDF resource";
  }

  if ((input.imageCount || 0) > 0) {
    return "Photo update";
  }

  return "Student update";
}

async function getAccessToken() {
  const session = await supabase.auth.getSession();
  return session.data.session?.access_token;
}

async function resolveCachedQuery<T>(input: {
  readCached?: () => Promise<T | null>;
  readStale?: () => Promise<T | null>;
  loadFresh: () => Promise<T>;
  persistFresh?: (value: T) => Promise<void>;
}) {
  const cached = input.readCached ? await input.readCached().catch(() => null) : null;

  if (cached !== null) {
    return cached;
  }

  try {
    const fresh = await input.loadFresh();

    if (input.persistFresh) {
      await input.persistFresh(fresh).catch((error) => {
        console.warn("Failed to persist device cache snapshot.", error);
      });
    }

    return fresh;
  } catch (error) {
    const stale = input.readStale ? await input.readStale().catch(() => null) : null;

    if (stale !== null) {
      return stale;
    }

    throw error;
  }
}

async function clearCommunitySurfaceCaches() {
  await clearDeviceCache([
    "communities",
    "community-feed",
    "discussions",
    "search",
    "community-members-admin",
  ]).catch(() => 0);

  const accessToken = await getAccessToken();

  if (!accessToken) {
    return;
  }

  await Promise.allSettled([
    clearBackendCache(accessToken, "communities"),
    clearBackendCache(accessToken, "community-feed"),
    clearBackendCache(accessToken, "discussions"),
    clearBackendCache(accessToken, "search"),
  ]);
}

export function isManagedMediaUrl(value?: string | null) {
  return Boolean(value?.trim());
}

export interface ManagedMediaDeleteResult {
  id: string;
  usage: MediaUsage;
  storagePath?: string | null;
  attachedPostId: string | null;
  attachedProfileId: string | null;
  publicUrl: string | null;
}

export async function uploadManagedMedia(input: {
  file: File;
  usage: MediaUsage;
  pdfPageCount?: number | null;
  attachedProfileId?: string | null;
  profileUsername?: string | null;
}): Promise<MediaAssetWithRelations> {
  const uploadFile = await prepareManagedMediaUploadFile({
    file: input.file,
    usage: input.usage,
  });
  const originalSizeBytes = Math.max(input.file.size || 0, uploadFile.size || 0);
  const storedSizeBytes = uploadFile.size || input.file.size || 0;
  const wasCompressed = uploadFile !== input.file;
  const compressionQuality = wasCompressed ? 10 : 100;
  const compressionRatio =
    originalSizeBytes > 0
      ? Number((storedSizeBytes / originalSizeBytes).toFixed(4))
      : 1;
  const upload = await requestBackend<{
    usage: MediaUsage;
    object_key: string;
    upload_url: string;
    file_url: string;
    public_url?: string;
    content_type?: string;
    headers?: Record<string, string>;
  }>("/media/upload-url?" + new URLSearchParams({
    usage: input.usage,
    content_type: uploadFile.type || (input.usage === "post_pdf" ? "application/pdf" : "image/jpeg"),
    file_name: input.file.name,
  }).toString(), {
    auth: "required",
    featureName: "Media",
  });

  await uploadToPresignedUrl({
    uploadUrl: upload.upload_url,
    file: uploadFile,
    method: "PUT",
    headers: upload.headers,
    contentType: upload.content_type,
  });

  const publicUrl = upload.public_url || upload.file_url;
  const legacyRegisterBody = {
    usage: input.usage,
    object_key: upload.object_key,
    public_url: publicUrl,
    original_name: input.file.name,
    pdf_page_count: input.usage === "post_pdf" ? input.pdfPageCount || null : null,
    attached_profile_id:
      input.usage === "avatar" || input.usage === "banner" || input.usage === "verification_proof"
        ? input.attachedProfileId || null
        : null,
  };
  const registerBody = {
    ...legacyRegisterBody,
    original_size_bytes: originalSizeBytes || undefined,
    stored_size_bytes: storedSizeBytes || undefined,
    compression_quality: compressionQuality,
    compression_ratio: compressionRatio,
  };

  try {
    return await requestBackend<MediaAssetWithRelations>("/media/assets/register", {
      method: "POST",
      body: registerBody,
      auth: "required",
      featureName: "Media",
    });
  } catch (error) {
    if (!shouldRetryLegacyMediaRegister(error)) {
      throw error;
    }

    console.warn("Retrying media registration with legacy payload after validation mismatch.", error);

    return requestBackend<MediaAssetWithRelations>("/media/assets/register", {
      method: "POST",
      body: legacyRegisterBody,
      auth: "required",
      featureName: "Media",
    });
  }
}

function shouldRetryLegacyMediaRegister(error: unknown) {
  if (!(error instanceof Error)) {
    return false;
  }

  const normalizedMessage = error.message.toLowerCase();
  const mentionsCompressionFields =
    normalizedMessage.includes("original_size_bytes") ||
    normalizedMessage.includes("stored_size_bytes") ||
    normalizedMessage.includes("compression_quality") ||
    normalizedMessage.includes("compression_ratio");

  return mentionsCompressionFields || normalizedMessage.includes("extra inputs are not permitted");
}

export async function deleteManagedMediaAsset(input: {
  storagePath?: string | null;
  publicUrl?: string | null;
}): Promise<ManagedMediaDeleteResult> {
  const storagePath = input.storagePath?.trim() || "";
  const publicUrl = input.publicUrl?.trim() || "";

  if (!storagePath && !publicUrl) {
    throw new Error("A media file path or URL is required.");
  }

  const asset = await requestBackend<MediaAssetWithRelations>("/media/assets/delete", {
    method: "POST",
    body: {
      storage_path: storagePath || undefined,
      public_url: publicUrl || undefined,
    },
    auth: "required",
    featureName: "Media",
  });

  return {
    id: asset.id,
    usage: asset.usage,
    storagePath: asset.storage_path,
    attachedPostId: asset.attached_post_id,
    attachedProfileId: asset.attached_profile_id,
    publicUrl: asset.public_url,
  };
}

async function deleteManagedMediaForPost(postId: string) {
  const { data, error } = await supabase
    .from("posts")
    .select("id,image_urls,pdf_url")
    .eq("id", postId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  const post = data as Pick<PostWithRelations, "id" | "image_urls" | "pdf_url"> | null;

  if (!post) {
    return;
  }

  const managedUrls = [...(post.image_urls || []), post.pdf_url || null].filter(
    (entry): entry is string => Boolean(entry)
  );

  for (const publicUrl of managedUrls) {
    await deleteManagedMediaAsset({ publicUrl }).catch(() => undefined);
  }
}

function buildAgeCutoffIso(days: number) {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  return cutoff.toISOString();
}

async function createPostMentionNotifications(input: {
  actorId: string;
  postId: string;
  texts: Array<string | null | undefined>;
  previousTexts?: Array<string | null | undefined>;
}) {
  const currentMentionedUsernames = extractMentionUsernames(...input.texts);

  if (currentMentionedUsernames.length === 0) {
    return;
  }

  const previousMentionedUsernames = new Set(
    extractMentionUsernames(...(input.previousTexts || []))
  );
  const nextMentionedUsernames = currentMentionedUsernames.filter(
    (username) => !previousMentionedUsernames.has(username)
  );

  if (nextMentionedUsernames.length === 0) {
    return;
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("id,username")
    .in("username", nextMentionedUsernames);

  if (error) {
    throw error;
  }

  const mentionedProfiles = (data || []) as Array<Pick<ProfileRow, "id" | "username">>;

  const results = await Promise.allSettled(
    mentionedProfiles.map((mentionedProfile) =>
      createNotification({
        recipientId: mentionedProfile.id,
        actorId: input.actorId,
        type: "post_mention",
        message: "tagged you in a post.",
        postId: input.postId,
      })
    )
  );

  results.forEach((result) => {
    if (result.status === "rejected") {
      console.warn("Failed to deliver a post mention notification.", result.reason);
    }
  });
}

async function createCommentMentionNotifications(input: {
  actorId: string;
  postId: string;
  commentId: string;
  texts: Array<string | null | undefined>;
  previousTexts?: Array<string | null | undefined>;
}) {
  const currentMentionedUsernames = extractMentionUsernames(...input.texts);

  if (currentMentionedUsernames.length === 0) {
    return;
  }

  const previousMentionedUsernames = new Set(
    extractMentionUsernames(...(input.previousTexts || []))
  );
  const nextMentionedUsernames = currentMentionedUsernames.filter(
    (username) => !previousMentionedUsernames.has(username)
  );

  if (nextMentionedUsernames.length === 0) {
    return;
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("id,username")
    .in("username", nextMentionedUsernames);

  if (error) {
    throw error;
  }

  const mentionedProfiles = (data || []) as Array<Pick<ProfileRow, "id" | "username">>;

  const results = await Promise.allSettled(
    mentionedProfiles.map((mentionedProfile) =>
      createNotification({
        recipientId: mentionedProfile.id,
        actorId: input.actorId,
        type: "post_mention",
        message: "mentioned you in a comment.",
        postId: input.postId,
        commentId: input.commentId,
      })
    )
  );

  results.forEach((result) => {
    if (result.status === "rejected") {
      console.warn("Failed to deliver a comment mention notification.", result.reason);
    }
  });
}

async function triggerSocialAiReply(input: {
  postId: string;
  texts: Array<string | null | undefined>;
  commentId?: string | null;
  previousTexts?: Array<string | null | undefined>;
}) {
  const currentMentionedUsernames = extractMentionUsernames(...input.texts);
  if (currentMentionedUsernames.length === 0) {
    return { queued: false, processed: false, reason: "no_mentions", job_id: null };
  }

  const previousMentionedUsernames = new Set(
    extractMentionUsernames(...(input.previousTexts || []))
  );
  const hasNewMention = currentMentionedUsernames.some((username) => !previousMentionedUsernames.has(username));
  if (!hasNewMention) {
    return { queued: false, processed: false, reason: "no_new_mentions", job_id: null };
  }

  return requestBackend<{
    queued: boolean;
    processed: boolean;
    reason?: string | null;
    job_id?: string | null;
  }>("/social-ai-mentions/trigger", {
    method: "POST",
    body: {
      post_id: input.postId,
      comment_id: input.commentId || null,
    },
    auth: "required",
    featureName: "Social AI reply",
  });
}

async function createNotification(input: {
  recipientId: string;
  actorId: string;
  type: NotificationType;
  message: string;
  postId?: string | null;
  commentId?: string | null;
  hideActorIdentity?: boolean;
}) {
  if (input.recipientId === input.actorId) {
    return;
  }

  await requestBackend("/notifications/dispatch", {
    method: "POST",
    body: {
      recipient_id: input.recipientId,
      actor_id: input.actorId,
      post_id: input.postId || null,
      comment_id: input.commentId || null,
      type: input.type,
      message: input.message,
      hide_actor_identity: Boolean(input.hideActorIdentity),
    },
    auth: "required",
    featureName: "Notifications",
  });
}

export async function loadNotificationPushPreferences(userId: string) {
  const { data, error } = await supabase
    .from("notification_push_preferences")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (data) {
    return data as NotificationPushPreferencesRow;
  }

  const { data: inserted, error: insertError } = await supabase
    .from("notification_push_preferences")
    .upsert(
      {
        user_id: userId,
      },
      {
        onConflict: "user_id",
        ignoreDuplicates: false,
      }
    )
    .select("*")
    .single();

  if (insertError) {
    console.warn("Could not upsert notification push preferences. Falling back to defaults.", insertError);
    return createDefaultNotificationPushPreferences(userId);
  }

  return inserted as NotificationPushPreferencesRow;
}

export async function updateNotificationPushPreferences(
  userId: string,
  updates: Partial<NotificationPushPreferencesRow>
) {
  const { data, error } = await supabase
    .from("notification_push_preferences")
    .upsert(
      {
        user_id: userId,
        ...updates,
      },
      {
        onConflict: "user_id",
        ignoreDuplicates: false,
      }
    )
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return data as NotificationPushPreferencesRow;
}

export async function loadPlatformSettings() {
  const { data, error } = await supabase
    .from("platform_settings")
    .select("*")
    .eq("id", 1)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return (data as PlatformSettingsRow | null) || defaultPlatformSettings;
}

export async function updatePlatformSettings(updates: Partial<PlatformSettingsRow>) {
  const { data, error } = await supabase
    .from("platform_settings")
    .update(updates)
    .eq("id", 1)
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return data as PlatformSettingsRow;
}

export async function loadAdminMediaAssetsPage(options: {
  limit?: number;
  offset?: number;
  search?: string;
} = {}) {
  const limit = Math.max(1, options.limit || 120);
  const offset = Math.max(0, options.offset || 0);
  const search = options.search?.trim() || "";
  const params = new URLSearchParams({
    limit: String(limit),
    offset: String(offset),
  });

  if (search) {
    params.set("search", search);
  }

  const payload = await requestBackend<{
    items: MediaAssetWithRelations[];
    total_count?: number | null;
  }>(`/media/assets/admin?${params.toString()}`, {
    auth: "required",
    featureName: "Media library",
  });

  return {
    items: (payload.items || []) as MediaAssetWithRelations[],
    totalCount: typeof payload.total_count === "number" ? payload.total_count : null,
  };
}

export async function loadAdminMediaAssets(limit = 120) {
  const result = await loadAdminMediaAssetsPage({ limit });
  return result.items;
}

export async function loadAdminR2BucketObjects(options: {
  search?: string;
} = {}) {
  const search = options.search?.trim() || "";
  const params = new URLSearchParams();

  if (search) {
    params.set("search", search);
  }

  const payload = await requestBackend<{
    bucket: string;
    items: AdminBucketObjectRow[];
  }>(`/media/objects/admin${params.toString() ? `?${params.toString()}` : ""}`, {
    auth: "required",
    featureName: "R2 bucket browser",
  });

  return {
    bucket: payload.bucket || "",
    items: (payload.items || []) as AdminBucketObjectRow[],
  };
}

export async function loadDiscussionPosts(
  kind: DiscussionKind,
  options: {
    fresh?: boolean;
    includeCommunityPosts?: boolean;
    hiddenCommunityIds?: Set<string> | string[];
    communityFeedMode?: DiscussionCommunityFeedMode;
    joinedCommunityIds?: Set<string> | string[];
  } = {}
) {
  const includeCommunityPosts =
    options.includeCommunityPosts === undefined ? kind !== "anonymous" : options.includeCommunityPosts;
  const hiddenCommunitySet = new Set(normalizeIdArray(options.hiddenCommunityIds));
  const joinedCommunitySet = new Set(normalizeIdArray(options.joinedCommunityIds));
  const communityFeedMode = options.communityFeedMode || "all";
  const accessToken = await getAccessToken();
  const visibleJoinedCommunityIds = Array.from(joinedCommunitySet).filter(
    (communityId) => !hiddenCommunitySet.has(communityId)
  );

  if (communityFeedMode === "joined-only" && visibleJoinedCommunityIds.length === 0) {
    return [];
  }

  const records = await resolveCachedQuery<PostWithRelations[]>({
    readCached:
      options.fresh || communityFeedMode === "joined-only"
        ? undefined
        : () => getCachedDiscussionFeed(kind, 30, 0, accessToken, includeCommunityPosts),
    readStale:
      communityFeedMode === "joined-only"
        ? undefined
        : () => getCachedDiscussionFeed(kind, 30, 0, accessToken, includeCommunityPosts, { allowStale: true }),
    loadFresh: async () => {
      let query = supabase
        .from("posts")
        .select(postSelect)
        .eq("discussion_kind", kind)
        .eq("moderation_state", "published");

      if (communityFeedMode === "joined-only") {
        query = query.eq("visibility_scope", "community").in("community_id", visibleJoinedCommunityIds);
      } else if (includeCommunityPosts) {
        query = query.or("visibility_scope.eq.discussion,visibility_scope.eq.community");
      } else {
        query = query.eq("visibility_scope", "discussion");
      }

      const { data, error } = await query.order("created_at", { ascending: false });

      if (error) {
        throw error;
      }

      return (data || []) as PostWithRelations[];
    },
    persistFresh:
      communityFeedMode === "joined-only"
        ? undefined
        : (payload) =>
            saveCachedDiscussionFeed(kind, payload, {
              limit: 30,
              offset: 0,
              includeCommunityPosts,
            }),
  });

  return records
    .map(normalizePost)
    .filter((post) =>
      postMatchesDiscussionCommunityMode(post, hiddenCommunitySet, communityFeedMode, joinedCommunitySet)
    );
}

export async function loadDiscussionPostsPage(
  kind: DiscussionKind,
  options: {
    fresh?: boolean;
    includeCommunityPosts?: boolean;
    hiddenCommunityIds?: Set<string> | string[];
    communityFeedMode?: DiscussionCommunityFeedMode;
    joinedCommunityIds?: Set<string> | string[];
    limit?: number;
    offset?: number;
  } = {}
): Promise<PageChunk<PostWithRelations>> {
  const includeCommunityPosts =
    options.includeCommunityPosts === undefined ? kind !== "anonymous" : options.includeCommunityPosts;
  const hiddenCommunitySet = new Set(normalizeIdArray(options.hiddenCommunityIds));
  const joinedCommunitySet = new Set(normalizeIdArray(options.joinedCommunityIds));
  const communityFeedMode = options.communityFeedMode || "all";
  const limit = Math.max(1, options.limit || 10);
  const offset = Math.max(0, options.offset || 0);
  const accessToken = await getAccessToken();
  const visibleJoinedCommunityIds = Array.from(joinedCommunitySet).filter(
    (communityId) => !hiddenCommunitySet.has(communityId)
  );

  if (communityFeedMode === "joined-only" && visibleJoinedCommunityIds.length === 0) {
    return buildPageChunk([], {
      offset,
      limit,
      consumedCount: 0,
    });
  }

  const records = await resolveCachedQuery<PostWithRelations[]>({
    readCached:
      options.fresh || communityFeedMode === "joined-only"
        ? undefined
        : () => getCachedDiscussionFeed(kind, limit, offset, accessToken, includeCommunityPosts),
    readStale:
      communityFeedMode === "joined-only"
        ? undefined
        : () => getCachedDiscussionFeed(kind, limit, offset, accessToken, includeCommunityPosts, { allowStale: true }),
    loadFresh: async () => {
      let query = supabase
        .from("posts")
        .select(postSelect)
        .eq("discussion_kind", kind)
        .eq("moderation_state", "published");

      if (communityFeedMode === "joined-only") {
        query = query.eq("visibility_scope", "community").in("community_id", visibleJoinedCommunityIds);
      } else if (includeCommunityPosts) {
        query = query.or("visibility_scope.eq.discussion,visibility_scope.eq.community");
      } else {
        query = query.eq("visibility_scope", "discussion");
      }

      const { data, error } = await query
        .order("created_at", { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) {
        throw error;
      }

      return (data || []) as PostWithRelations[];
    },
    persistFresh:
      communityFeedMode === "joined-only"
        ? undefined
        : (payload) =>
            saveCachedDiscussionFeed(kind, payload, {
              limit,
              offset,
              includeCommunityPosts,
            }),
  });

  const normalized = records.map(normalizePost);
  const visibleItems = normalized.filter((post) =>
    postMatchesDiscussionCommunityMode(post, hiddenCommunitySet, communityFeedMode, joinedCommunitySet)
  );

  return buildPageChunk(visibleItems, {
    offset,
    limit,
    consumedCount: normalized.length,
  });
}

export async function loadVisibleCommunities(options: { fresh?: boolean } = {}) {
  const accessToken = await getAccessToken();
  const attachMemberCounts = async (communities: CommunityRow[]) => {
    if (!communities.length) {
      return communities;
    }

    try {
      const { data, error } = await supabase.rpc("list_visible_community_member_counts");

      if (error) {
        throw error;
      }

      const countsByCommunityId = new Map<string, number>(
        ((data || []) as Array<{ community_id: string; member_count: number | null }>).map((entry) => [
          entry.community_id,
          Number(entry.member_count || 0),
        ])
      );

      return communities.map((community) => ({
        ...community,
        member_count: countsByCommunityId.get(community.id) || 0,
      }));
    } catch (error) {
      console.warn("Community member count RPC failed, falling back to zero counts.", error);
      return communities.map((community) => ({
        ...community,
        member_count: community.member_count || 0,
      }));
    }
  };

  return resolveCachedQuery<CommunityRow[]>({
    readCached: options.fresh ? undefined : () => getCachedCommunities(accessToken),
    readStale: () => getCachedCommunities(accessToken, { allowStale: true }),
    loadFresh: async () => {
      const { data, error } = await supabase
        .from("communities")
        .select("*")
        .order("name");

      if (error) {
        throw error;
      }

      return attachMemberCounts((data || []) as CommunityRow[]);
    },
    persistFresh: saveCachedCommunities,
  });
}

export async function loadCommunityPosts(
  communityId: string,
  options: { fresh?: boolean } = {}
) {
  const accessToken = await getAccessToken();
  const records = await resolveCachedQuery<PostWithRelations[]>({
    readCached: options.fresh ? undefined : () => getCachedCommunityFeed(communityId, 30, 0, accessToken),
    readStale: () => getCachedCommunityFeed(communityId, 30, 0, accessToken, { allowStale: true }),
    loadFresh: async () => {
      const { data, error } = await supabase
        .from("posts")
        .select(postSelect)
        .eq("visibility_scope", "community")
        .eq("community_id", communityId)
        .eq("moderation_state", "published")
        .order("created_at", { ascending: false });

      if (error) {
        throw error;
      }

      return (data || []) as PostWithRelations[];
    },
    persistFresh: (payload) => saveCachedCommunityFeed(communityId, payload, { limit: 30, offset: 0 }),
  });

  return records.map(normalizePost);
}

export async function loadCommunityPostsPage(
  communityId: string,
  options: { fresh?: boolean; limit?: number; offset?: number } = {}
): Promise<PageChunk<PostWithRelations>> {
  const limit = Math.max(1, options.limit || 10);
  const offset = Math.max(0, options.offset || 0);
  const accessToken = await getAccessToken();
  const records = await resolveCachedQuery<PostWithRelations[]>({
    readCached: options.fresh ? undefined : () => getCachedCommunityFeed(communityId, limit, offset, accessToken),
    readStale: () => getCachedCommunityFeed(communityId, limit, offset, accessToken, { allowStale: true }),
    loadFresh: async () => {
      const { data, error } = await supabase
        .from("posts")
        .select(postSelect)
        .eq("visibility_scope", "community")
        .eq("community_id", communityId)
        .eq("moderation_state", "published")
        .order("created_at", { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) {
        throw error;
      }

      return (data || []) as PostWithRelations[];
    },
    persistFresh: (payload) => saveCachedCommunityFeed(communityId, payload, { limit, offset }),
  });

  const normalized = records.map(normalizePost);

  return buildPageChunk(normalized, {
    offset,
    limit,
    consumedCount: normalized.length,
  });
}

export async function loadPublishedPost(postId: string) {
  const { data, error } = await supabase
    .from("posts")
    .select(postSelect)
    .eq("id", postId)
    .eq("moderation_state", "published")
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    return null;
  }

  return normalizePost(data as Record<string, unknown>);
}

export async function searchUsersAndPosts(
  query: string,
  options: { fresh?: boolean; limit?: number } = {}
) {
  const normalizedQuery = query.trim();
  const limit = options.limit || 6;

  if (normalizedQuery.length < 2) {
    return {
      users: [],
      posts: [],
    } satisfies SearchResults;
  }

  const accessToken = await getAccessToken();
  const payload = await resolveCachedQuery<SearchResults>({
    readCached: options.fresh ? undefined : () => getCachedSearchResults(normalizedQuery, limit, accessToken),
    readStale: () => getCachedSearchResults(normalizedQuery, limit, accessToken, { allowStale: true }),
    loadFresh: async () => {
      const ilike = `%${normalizedQuery}%`;
      const [usersResult, postsResult] = await Promise.all([
        supabase
          .from("profiles")
          .select("*")
          .or(`username.ilike.${ilike},full_name.ilike.${ilike}`)
          .order("is_verified", { ascending: false })
          .limit(limit),
        supabase
          .from("posts")
          .select(postSelect)
          .eq("moderation_state", "published")
          .or(`title.ilike.${ilike},content.ilike.${ilike}`)
          .order("created_at", { ascending: false })
          .limit(limit),
      ]);

      if (usersResult.error) {
        throw usersResult.error;
      }

      if (postsResult.error) {
        throw postsResult.error;
      }

      return {
        users: (usersResult.data || []) as ProfileRow[],
        posts: (postsResult.data || []) as PostWithRelations[],
      } satisfies SearchResults;
    },
    persistFresh: (results) => saveCachedSearchResults(normalizedQuery, limit, results),
  });

  return {
    users: payload.users || [],
    posts: (payload.posts || [])
      .map(normalizePost)
      .filter((post) => postMatchesDiscussionCommunityMode(post, new Set<string>(), "all", new Set<string>())),
  } satisfies SearchResults;
}

export async function createPost(input: {
  authorId: string;
  visibilityScope: PostScope;
  discussionKind: DiscussionKind;
  title?: string;
  content?: string;
  tags: string[];
  communityId?: string;
  imageFiles?: File[];
  pdfFile?: File | null;
  pdfPageCount?: number | null;
  isAnonymous?: boolean;
  linkUrl?: string | null;
  postType?: PostType;
  pollQuestion?: string | null;
  pollOptions?: string[];
  settings?: Pick<PlatformSettingsRow, "max_images_per_post" | "max_pdf_size_mb"> | null;
}) {
  const settings = {
    max_images_per_post: input.settings?.max_images_per_post ?? defaultPlatformSettings.max_images_per_post,
    max_pdf_size_mb: input.settings?.max_pdf_size_mb ?? defaultPlatformSettings.max_pdf_size_mb,
  };
  const imageFiles = input.imageFiles || [];
  const pdfFile = input.pdfFile || null;
  const normalizedTitle = normalizeStoredPostTitle(input.title);
  const normalizedContent = normalizeStoredPostContent(input.content);
  const normalizedTags = normalizePostTags(input.tags);
  const normalizedPollQuestion = input.pollQuestion?.trim() || "";
  const normalizedPollOptions = (input.pollOptions || [])
    .map((option) => option.trim())
    .filter(Boolean)
    .slice(0, 6);

  if (imageFiles.length > settings.max_images_per_post) {
    throw new Error(`You can attach up to ${settings.max_images_per_post} images to one post.`);
  }

  if (pdfFile && pdfFile.size > settings.max_pdf_size_mb * 1024 * 1024) {
    throw new Error(`PDF uploads must stay within ${settings.max_pdf_size_mb} MB.`);
  }

  if ((input.postType || "standard") === "poll" && normalizedPollOptions.length < 2) {
    throw new Error("Add at least two poll options.");
  }

  const hasMeaningfulContent = Boolean(
    normalizedTitle ||
      normalizedContent ||
      imageFiles.length ||
      pdfFile ||
      input.linkUrl?.trim() ||
      normalizedPollQuestion
  );

  if (!hasMeaningfulContent) {
    throw new Error("Add some text, media, a link, or a poll before publishing.");
  }

  const [imageAssets, pdfAsset] = await Promise.all([
    Promise.all(imageFiles.map((file) => uploadManagedMedia({ file, usage: "post_image" }))),
    pdfFile
      ? uploadManagedMedia({
          file: pdfFile,
          usage: "post_pdf",
          pdfPageCount: input.pdfPageCount,
        })
      : Promise.resolve(null),
  ]);
  const imageUrls = imageAssets.map((asset) => asset.public_url);
  const pdfUrl = pdfAsset?.public_url || null;

  const { data, error } = await supabase
    .from("posts")
    .insert({
      author_id: input.authorId,
      community_id: input.communityId || null,
      visibility_scope: input.visibilityScope,
      discussion_kind: input.discussionKind,
      post_type: input.postType || "standard",
      title: buildFallbackTitle({
        title: normalizedTitle,
        content: normalizedContent,
        pollQuestion: normalizedPollQuestion,
        imageCount: imageUrls.length,
        hasPdf: Boolean(pdfUrl),
      }),
      content: normalizedContent,
      tags: normalizedTags,
      image_url: imageUrls[0] || null,
      image_urls: imageUrls,
      pdf_url: pdfUrl,
      pdf_name: pdfAsset?.original_name || pdfFile?.name || null,
      pdf_size_bytes: pdfAsset?.stored_size_bytes || null,
      pdf_page_count: input.pdfPageCount || null,
      link_url: normalizeLinkUrl(input.linkUrl),
      poll_question: input.postType === "poll" ? normalizedPollQuestion || null : null,
      poll_options: input.postType === "poll" ? normalizedPollOptions : [],
      is_anonymous: Boolean(input.isAnonymous),
    })
    .select(postSelect)
    .single();

  if (error) {
    throw error;
  }

  const createdPost = normalizePost(data as Record<string, unknown>);
  void useCoinWalletStore.getState().refreshWallet().catch(() => undefined);

  await createPostMentionNotifications({
    actorId: input.authorId,
    postId: createdPost.id,
    texts: [normalizedTitle, normalizedContent, normalizedPollQuestion],
  }).catch((mentionError) => {
    console.warn("Post published, but mention notifications could not be sent.", mentionError);
  });

  await triggerSocialAiReply({
    postId: createdPost.id,
    texts: [normalizedTitle, normalizedContent, normalizedPollQuestion],
  }).catch((replyError) => {
    console.warn("Post published, but the social AI reply could not be queued.", replyError);
  });

  await clearCommunitySurfaceCaches();

  return createdPost;
}

export async function updatePost(input: {
  post: PostWithRelations;
  editorId: string;
  visibilityScope?: PostScope;
  discussionKind?: DiscussionKind;
  title?: string;
  content?: string;
  tags: string[];
  communityId?: string | null;
  imageFiles?: File[];
  retainedImageUrls?: string[];
  pdfFile?: File | null;
  pdfPageCount?: number | null;
  retainExistingPdf?: boolean;
  isAnonymous?: boolean;
  linkUrl?: string | null;
  postType?: PostType;
  pollQuestion?: string | null;
  pollOptions?: string[];
  settings?: PlatformSettingsRow | null;
}) {
  const settings = input.settings || defaultPlatformSettings;
  const imageFiles = input.imageFiles || [];
  const retainedImageUrls = input.retainedImageUrls || [];
  const pdfFile = input.pdfFile || null;
  const nextVisibilityScope = input.visibilityScope || input.post.visibility_scope;
  const nextCommunityId =
    nextVisibilityScope === "community"
      ? input.communityId === undefined
        ? input.post.community_id
        : input.communityId
      : null;
  const nextDiscussionKind = input.discussionKind || input.post.discussion_kind;
  const normalizedTitle = normalizeStoredPostTitle(input.title);
  const normalizedContent = normalizeStoredPostContent(input.content);
  const normalizedLinkUrl = normalizeLinkUrl(input.linkUrl);
  const nextPostType = input.postType || input.post.post_type;
  const normalizedPollQuestion = nextPostType === "poll" ? input.pollQuestion?.trim() || "" : "";
  const normalizedTags = normalizePostTags(input.tags);
  const normalizedPollOptions =
    nextPostType === "poll"
      ? (input.pollOptions || input.post.poll_options)
          .map((option) => option.trim())
          .filter(Boolean)
          .slice(0, 6)
      : [];

  if (!input.post.author || input.post.author.id !== input.editorId) {
    throw new Error("Only the author can edit this post.");
  }

  if (imageFiles.length + retainedImageUrls.length > settings.max_images_per_post) {
    throw new Error(`You can attach up to ${settings.max_images_per_post} images to one post.`);
  }

  if (pdfFile && pdfFile.size > settings.max_pdf_size_mb * 1024 * 1024) {
    throw new Error(`PDF uploads must stay within ${settings.max_pdf_size_mb} MB.`);
  }

  if (nextVisibilityScope === "community" && !nextCommunityId) {
    throw new Error("Choose a community before saving this post.");
  }

  if (nextPostType === "poll" && normalizedPollOptions.length < 2) {
    throw new Error("Add at least two poll options.");
  }

  if (input.post.poll_votes.length > 0 && nextPostType !== input.post.post_type) {
    throw new Error("This poll already has votes, so its type cannot change.");
  }

  if (
    input.post.poll_votes.length > 0 &&
    nextPostType === "poll" &&
    normalizedPollOptions.join("|") !== input.post.poll_options.join("|")
  ) {
    throw new Error("This poll already has votes, so its options cannot change.");
  }

  const uploadedImageUrls =
    nextPostType === "poll"
      ? []
      : (
          await Promise.all(imageFiles.map((file) => uploadManagedMedia({ file, usage: "post_image" })))
        ).map((asset) => asset.public_url);
  const nextImageUrls = nextPostType === "poll" ? [] : [...retainedImageUrls, ...uploadedImageUrls];

  let nextPdfUrl: string | null = null;
  let nextPdfName: string | null = null;
  let nextPdfSizeBytes: number | null = null;
  let nextPdfPageCount: number | null = null;

  if (nextPostType !== "poll") {
    if (pdfFile) {
      const uploadedPdf = await uploadManagedMedia({
        file: pdfFile,
        usage: "post_pdf",
        pdfPageCount: input.pdfPageCount,
      });
      nextPdfUrl = uploadedPdf.public_url;
      nextPdfName = uploadedPdf.original_name;
      nextPdfSizeBytes = uploadedPdf.stored_size_bytes;
      nextPdfPageCount = input.pdfPageCount || null;
    } else if (input.retainExistingPdf) {
      nextPdfUrl = input.post.pdf_url;
      nextPdfName = input.post.pdf_name;
      nextPdfSizeBytes = input.post.pdf_size_bytes;
      nextPdfPageCount = input.post.pdf_page_count;
    }
  }

  const hasMeaningfulContent = Boolean(
    normalizedTitle ||
      normalizedContent ||
      nextImageUrls.length ||
      nextPdfUrl ||
      normalizedLinkUrl ||
      normalizedPollQuestion
  );

  if (!hasMeaningfulContent) {
    throw new Error("A post needs text, media, a link, or a poll question.");
  }

  const nextTitle = buildFallbackTitle({
    title: normalizedTitle,
    content: normalizedContent,
    pollQuestion: normalizedPollQuestion,
    imageCount: nextImageUrls.length,
    hasPdf: Boolean(nextPdfUrl),
  });

  const nextPollQuestion =
    nextPostType === "poll"
      ? normalizedPollQuestion || nextTitle
      : null;
  const nextIsAnonymous =
    nextDiscussionKind === "anonymous" ? true : Boolean(input.isAnonymous);

  const currentTags = input.post.tags.join("|");
  const nextTags = normalizedTags.join("|");
  const unchanged =
    input.post.visibility_scope === nextVisibilityScope &&
    (input.post.community_id || null) === (nextCommunityId || null) &&
    input.post.discussion_kind === nextDiscussionKind &&
    input.post.post_type === nextPostType &&
    input.post.title === nextTitle &&
    input.post.content === normalizedContent &&
    (input.post.link_url || null) === normalizedLinkUrl &&
    currentTags === nextTags &&
    (input.post.image_urls || []).join("|") === nextImageUrls.join("|") &&
    (input.post.pdf_url || null) === (nextPdfUrl || null) &&
    (input.post.pdf_name || null) === (nextPdfName || null) &&
    (input.post.pdf_size_bytes || null) === (nextPdfSizeBytes || null) &&
    (input.post.pdf_page_count || null) === (nextPdfPageCount || null) &&
    input.post.is_anonymous === nextIsAnonymous &&
    (nextPostType === "poll"
      ? (input.post.poll_question || "") === (nextPollQuestion || "") &&
        input.post.poll_options.join("|") === normalizedPollOptions.join("|")
      : input.post.poll_options.length === 0);

  if (unchanged) {
    return input.post;
  }

  const editedAt = new Date().toISOString();
  const { data, error } = await supabase
    .from("posts")
    .update({
      community_id: nextCommunityId,
      visibility_scope: nextVisibilityScope,
      discussion_kind: nextDiscussionKind,
      post_type: nextPostType,
      title: nextTitle,
      content: normalizedContent,
      tags: normalizedTags,
      image_url: nextImageUrls[0] || null,
      image_urls: nextImageUrls,
      pdf_url: nextPdfUrl,
      pdf_name: nextPdfName,
      pdf_size_bytes: nextPdfSizeBytes,
      pdf_page_count: nextPdfPageCount,
      link_url: normalizedLinkUrl,
      poll_question: nextPollQuestion,
      poll_options: normalizedPollOptions,
      is_anonymous: nextIsAnonymous,
      edited_at: editedAt,
    })
    .match({
      id: input.post.id,
      author_id: input.editorId,
    })
    .select(postSelect)
    .single();

  if (error) {
    throw error;
  }

  await clearCommunitySurfaceCaches();

  await createPostMentionNotifications({
    actorId: input.editorId,
    postId: input.post.id,
    texts: [nextTitle, normalizedContent, nextPollQuestion],
    previousTexts: [input.post.title, input.post.content, input.post.poll_question],
  }).catch((mentionError) => {
    console.warn("Post updated, but new mention notifications could not be sent.", mentionError);
  });

  await triggerSocialAiReply({
    postId: input.post.id,
    texts: [nextTitle, normalizedContent, nextPollQuestion],
    previousTexts: [input.post.title, input.post.content, input.post.poll_question],
  }).catch((replyError) => {
    console.warn("Post updated, but the social AI reply could not be queued.", replyError);
  });

  void useCoinWalletStore.getState().refreshWallet().catch(() => undefined);
  return normalizePost(data as Record<string, unknown>);
}

export async function loadOwnedPostForEdit(postId: string, editorId: string) {
  const { data, error } = await supabase
    .from("posts")
    .select(postSelect)
    .match({
      id: postId,
      author_id: editorId,
    })
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data ? normalizePost(data as Record<string, unknown>) : null;
}

export async function togglePostLike(postId: string, userId: string, alreadyLiked: boolean) {
  if (alreadyLiked) {
    const { error } = await supabase.from("likes").delete().match({
      post_id: postId,
      user_id: userId,
    });

    if (error) {
      throw error;
    }
    return;
  }

  const { error } = await supabase.from("likes").insert({
    post_id: postId,
    user_id: userId,
  });

  if (error) {
    throw error;
  }

  const { data: post, error: postError } = await supabase
    .from("posts")
    .select("author_id, title")
    .eq("id", postId)
    .single();

  if (postError) {
    throw postError;
  }

  await createNotification({
    recipientId: post.author_id,
    actorId: userId,
    type: "post_like",
    message: "liked your post.",
    postId,
  });
}

export async function createComment(input: {
  postId: string;
  authorId: string;
  content: string;
  parentCommentId?: string | null;
}) {
  const { data: insertedComment, error } = await supabase
    .from("comments")
    .insert({
      post_id: input.postId,
      author_id: input.authorId,
      parent_comment_id: input.parentCommentId || null,
      content: input.content,
    })
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  void (async () => {
    try {
      const [postResult, parentCommentResult] = await Promise.all([
        supabase
          .from("posts")
          .select("author_id, title, discussion_kind, is_anonymous")
          .eq("id", input.postId)
          .single(),
        input.parentCommentId
          ? supabase
              .from("comments")
              .select("author_id")
              .eq("id", input.parentCommentId)
              .maybeSingle()
          : Promise.resolve({ data: null, error: null }),
      ]);

      if (postResult.error) {
        throw postResult.error;
      }

      if (parentCommentResult.error) {
        throw parentCommentResult.error;
      }

      const parentCommentAuthorId = parentCommentResult.data?.author_id || null;
      const hideActorIdentity = Boolean(
        postResult.data.is_anonymous || postResult.data.discussion_kind === "anonymous"
      );

      const sideEffects: Promise<unknown>[] = [];

      if (input.parentCommentId && parentCommentAuthorId) {
        sideEffects.push(
          createNotification({
            recipientId: parentCommentAuthorId,
            actorId: input.authorId,
            type: "comment_reply",
            message: "replied to your comment.",
            postId: input.postId,
            commentId: insertedComment.id,
            hideActorIdentity,
          })
        );
      }

      if (postResult.data.author_id !== parentCommentAuthorId) {
        sideEffects.push(
          createNotification({
            recipientId: postResult.data.author_id,
            actorId: input.authorId,
            type: "post_comment",
            message: input.parentCommentId ? "joined the discussion on your post." : "commented on your post.",
            postId: input.postId,
            commentId: insertedComment.id,
            hideActorIdentity,
          })
        );
      }

      sideEffects.push(
        createCommentMentionNotifications({
          actorId: input.authorId,
          postId: input.postId,
          commentId: insertedComment.id,
          texts: [input.content],
        })
      );

      sideEffects.push(
        triggerSocialAiReply({
          postId: input.postId,
          commentId: insertedComment.id,
          texts: [input.content],
        })
      );

      const results = await Promise.allSettled(sideEffects);
      results.forEach((result) => {
        if (result.status === "rejected") {
          console.warn("Comment side effect failed after posting.", result.reason);
        }
      });
    } catch (sideEffectError) {
      console.warn("Comment posted, but follow-up actions failed.", sideEffectError);
    }
  })();

  return insertedComment;
}

export async function voteOnPoll(postId: string, userId: string, optionIndex: number) {
  const { error } = await supabase.from("poll_votes").upsert(
    {
      post_id: postId,
      user_id: userId,
      option_index: optionIndex,
    },
    {
      onConflict: "post_id,user_id",
      ignoreDuplicates: false,
    }
  );

  if (error) {
    throw error;
  }
}

export async function deletePost(postId: string) {
  await deleteManagedMediaForPost(postId);
  const { error } = await supabase.from("posts").delete().eq("id", postId);
  if (error) {
    throw error;
  }

  await clearCommunitySurfaceCaches();
}

export async function countPostsOlderThan(days: number) {
  const { count, error } = await supabase
    .from("posts")
    .select("id", { count: "exact", head: true })
    .lte("created_at", buildAgeCutoffIso(days));

  if (error) {
    throw error;
  }

  return count || 0;
}

export async function deletePostsOlderThan(days: number, options: { batchSize?: number } = {}) {
  const batchSize = Math.max(1, Math.min(options.batchSize || 20, 100));
  let deletedCount = 0;

  while (true) {
    const { data, error } = await supabase
      .from("posts")
      .select("id")
      .lte("created_at", buildAgeCutoffIso(days))
      .order("created_at", { ascending: true })
      .limit(batchSize);

    if (error) {
      throw error;
    }

    const posts = (data || []) as Array<Pick<PostWithRelations, "id">>;

    if (posts.length === 0) {
      break;
    }

    for (const post of posts) {
      await deletePost(post.id);
      deletedCount += 1;
    }

    if (posts.length < batchSize) {
      break;
    }
  }

  return deletedCount;
}

export async function deleteComment(commentId: string) {
  const { error } = await supabase.from("comments").delete().eq("id", commentId);
  if (error) {
    throw error;
  }
}

export async function loadFollowLists(profileId: string) {
  const [{ data: followersData, error: followersError }, { data: followingData, error: followingError }] =
    await Promise.all([
      supabase
        .from("follows")
        .select("follower:profiles!follows_follower_id_fkey(*)")
        .eq("following_id", profileId),
      supabase
        .from("follows")
        .select("following:profiles!follows_following_id_fkey(*)")
        .eq("follower_id", profileId),
    ]);

  if (followersError) {
    throw followersError;
  }

  if (followingError) {
    throw followingError;
  }

  return {
    followers: (followersData || [])
      .map((row) => (row as { follower: ProfileRow | null }).follower)
      .filter(Boolean) as ProfileRow[],
    following: (followingData || [])
      .map((row) => (row as { following: ProfileRow | null }).following)
      .filter(Boolean) as ProfileRow[],
  };
}

export async function loadFollowingIds(profileId: string) {
  const followingIds = await resolveCachedQuery<string[]>({
    readCached: () => getCachedFollowingIds(profileId),
    readStale: () => getCachedFollowingIds(profileId, { allowStale: true }),
    loadFresh: async () => {
      const { data, error } = await supabase
        .from("follows")
        .select("following_id")
        .eq("follower_id", profileId);

      if (error) {
        throw error;
      }

      return (data || []).map((entry) => entry.following_id as string);
    },
    persistFresh: (ids) => saveCachedFollowingIds(profileId, ids),
  });

  return new Set(followingIds);
}

export async function loadFollowersPage(
  profileId: string,
  options: { limit?: number; offset?: number } = {}
): Promise<PageChunk<ProfileRow>> {
  const limit = Math.max(1, options.limit || 10);
  const offset = Math.max(0, options.offset || 0);
  const { data, error, count } = await supabase
    .from("follows")
    .select("follower:profiles!follows_follower_id_fkey(*)", { count: "exact" })
    .eq("following_id", profileId)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    throw error;
  }

  const items = (data || [])
    .map((row) => (row as { follower: ProfileRow | null }).follower)
    .filter(Boolean) as ProfileRow[];

  return buildPageChunk(items, {
    offset,
    limit,
    totalCount: count,
  });
}

export async function loadFollowingPage(
  profileId: string,
  options: { limit?: number; offset?: number } = {}
): Promise<PageChunk<ProfileRow>> {
  const limit = Math.max(1, options.limit || 10);
  const offset = Math.max(0, options.offset || 0);
  const { data, error, count } = await supabase
    .from("follows")
    .select("following:profiles!follows_following_id_fkey(*)", { count: "exact" })
    .eq("follower_id", profileId)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    throw error;
  }

  const items = (data || [])
    .map((row) => (row as { following: ProfileRow | null }).following)
    .filter(Boolean) as ProfileRow[];

  return buildPageChunk(items, {
    offset,
    limit,
    totalCount: count,
  });
}

export async function toggleFollow(
  currentUserId: string,
  targetUserId: string,
  alreadyFollowing: boolean
) {
  const cachedFollowingIds = await getCachedFollowingIds(currentUserId, { allowStale: true }).catch(() => null);

  if (alreadyFollowing) {
    const { error } = await supabase.from("follows").delete().match({
      follower_id: currentUserId,
      following_id: targetUserId,
    });

    if (error) {
      throw error;
    }

    if (cachedFollowingIds) {
      const nextFollowingIds = cachedFollowingIds.filter((id) => id !== targetUserId);
      await saveCachedFollowingIds(currentUserId, nextFollowingIds).catch(() => undefined);
    }

    return;
  }

  const { error } = await supabase.from("follows").insert({
    follower_id: currentUserId,
    following_id: targetUserId,
  });

  if (error) {
    throw error;
  }

  if (cachedFollowingIds) {
    const nextFollowingIds = Array.from(new Set([...cachedFollowingIds, targetUserId]));
    await saveCachedFollowingIds(currentUserId, nextFollowingIds).catch(() => undefined);
  }

  await createNotification({
    recipientId: targetUserId,
    actorId: currentUserId,
    type: "follow",
    message: "started following you.",
  });
}

export async function loadProfileByUsername(username: string) {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("username", username.toLowerCase())
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data as ProfileRow | null;
}

export async function loadRecentProfiles(
  currentUserId?: string | null,
  options: { limit?: number } = {}
) {
  const limit = options.limit || 10;
  return resolveCachedQuery<ProfileRow[]>({
    readCached: () => getCachedRecentProfiles(currentUserId, limit),
    readStale: () => getCachedRecentProfiles(currentUserId, limit, { allowStale: true }),
    loadFresh: async () => {
      let query = supabase.from("profiles").select("*").order("created_at", { ascending: false }).limit(limit);

      if (currentUserId) {
        query = query.neq("id", currentUserId);
      }

      const { data, error } = await query;

      if (error) {
        throw error;
      }

      return ((data || []) as ProfileRow[]).filter((profile) => !profile.is_banned);
    },
    persistFresh: (profiles) => saveCachedRecentProfiles(profiles, currentUserId, limit),
  });
}

export async function recordProfileView(viewerId: string, viewedProfileId: string) {
  if (!viewerId || !viewedProfileId || viewerId === viewedProfileId) {
    return;
  }

  try {
    const settings = await loadPlatformSettings();
    const nowIso = new Date().toISOString();

    let shouldNotify = false;

    try {
      const { data: existingView, error: viewError } = await supabase
        .from("profile_views")
        .select("*")
        .eq("viewer_id", viewerId)
        .eq("viewed_profile_id", viewedProfileId)
        .maybeSingle();

      if (viewError) {
        console.warn("[recordProfileView] profile_views query error:", viewError.message);
        // Still try to send notification even if tracking table fails
        shouldNotify = settings.enable_profile_view_notifications;
      } else if (!existingView) {
        shouldNotify = settings.enable_profile_view_notifications;

        await supabase.from("profile_views").insert({
          viewer_id: viewerId,
          viewed_profile_id: viewedProfileId,
          last_viewed_at: nowIso,
          last_notified_at: shouldNotify ? nowIso : null,
        });
      } else {
        shouldNotify =
          settings.enable_profile_view_notifications &&
          (!existingView.last_notified_at ||
            Date.now() - new Date(existingView.last_notified_at).getTime() > 1000 * 60 * 60 * 12);

        await supabase
          .from("profile_views")
          .update({
            last_viewed_at: nowIso,
            last_notified_at: shouldNotify ? nowIso : existingView.last_notified_at,
          })
          .eq("id", existingView.id);
      }
    } catch (trackingError) {
      console.warn("[recordProfileView] Could not track profile view:", trackingError);
      shouldNotify = settings.enable_profile_view_notifications;
    }

    if (shouldNotify) {
      await createNotification({
        recipientId: viewedProfileId,
        actorId: viewerId,
        type: "profile_view",
        message: "viewed your profile.",
      });
    }
  } catch (error) {
    console.error("[recordProfileView] Failed:", error);
  }
}

export async function loadUserPosts(profileId: string) {
  const { data, error } = await supabase
    .from("posts")
    .select(postSelect)
    .eq("author_id", profileId)
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return (data || []).map(normalizePost);
}

export async function loadUserPostsPage(
  profileId: string,
  options: {
    includeAnonymous?: boolean;
    allowedKinds?: DiscussionKind[];
    limit?: number;
    offset?: number;
  } = {}
): Promise<PageChunk<PostWithRelations>> {
  const includeAnonymous = options.includeAnonymous ?? true;
  const allowedKinds = normalizeAllowedProfileKinds(options.allowedKinds);
  const limit = Math.max(1, options.limit || 10);
  const offset = Math.max(0, options.offset || 0);

  if (!includeAnonymous && allowedKinds.length === 0) {
    return buildPageChunk([], {
      offset,
      limit,
      totalCount: 0,
    });
  }

  let query = supabase
    .from("posts")
    .select(postSelect, { count: "exact" })
    .eq("author_id", profileId)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (!includeAnonymous) {
    query = query.eq("is_anonymous", false);
  }

  if (!includeAnonymous) {
    if (allowedKinds.length === 1) {
      query = query.eq("discussion_kind", allowedKinds[0]);
    } else if (allowedKinds.length > 1) {
      query = query.in("discussion_kind", allowedKinds);
    }
  }

  const { data, error, count } = await query;

  if (error) {
    throw error;
  }

  return buildPageChunk((data || []).map(normalizePost), {
    offset,
    limit,
    totalCount: count,
  });
}

export async function loadUserPostsFiltered(
  profileId: string,
  options: { includeAnonymous?: boolean } = {}
) {
  const posts = await loadUserPosts(profileId);

  if (options.includeAnonymous ?? true) {
    return posts;
  }

  return posts.filter(isPubliclyAttributablePost);
}

export async function loadUserComments(
  profileId: string,
  options: { includeAnonymous?: boolean } = {}
) {
  const { data, error } = await supabase
    .from("comments")
    .select(
      `
      *,
      author:profiles!comments_author_id_fkey(*),
      post:posts(id, title, discussion_kind, visibility_scope, is_anonymous, post_type)
    `
    )
    .eq("author_id", profileId)
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  const comments = (data || []) as CommentWithAuthor[];

  if (options.includeAnonymous ?? true) {
    return comments;
  }

  return comments.filter(
    (comment) => Boolean(comment.post) && isPubliclyAttributablePost(comment.post as PostWithRelations)
  );
}

export async function loadUserCommentsPage(
  profileId: string,
  options: {
    includeAnonymous?: boolean;
    allowedKinds?: DiscussionKind[];
    limit?: number;
    offset?: number;
  } = {}
): Promise<PageChunk<CommentWithAuthor>> {
  const includeAnonymous = options.includeAnonymous ?? true;
  const allowedKinds = normalizeAllowedProfileKinds(options.allowedKinds);
  const limit = Math.max(1, options.limit || 10);
  const offset = Math.max(0, options.offset || 0);

  if (!includeAnonymous && allowedKinds.length === 0) {
    return buildPageChunk([], {
      offset,
      limit,
      totalCount: 0,
    });
  }

  let query = supabase
    .from("comments")
    .select(
      `
      *,
      author:profiles!comments_author_id_fkey(*),
      post:posts!inner(id, title, discussion_kind, visibility_scope, is_anonymous, post_type)
    `,
      { count: "exact" }
    )
    .eq("author_id", profileId)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (!includeAnonymous) {
    query = query.eq("post.is_anonymous", false);
  }

  if (!includeAnonymous) {
    if (allowedKinds.length === 1) {
      query = query.eq("post.discussion_kind", allowedKinds[0]);
    } else if (allowedKinds.length > 1) {
      query = query.in("post.discussion_kind", allowedKinds);
    }
  }

  const { data, error, count } = await query;

  if (error) {
    throw error;
  }

  return buildPageChunk((data || []) as CommentWithAuthor[], {
    offset,
    limit,
    totalCount: count,
  });
}

export async function loadProfileActivitySummary(
  profileId: string,
  viewerId?: string | null,
  options: { allowedKinds?: DiscussionKind[] } = {}
): Promise<ProfileActivitySummary> {
  const allowedKinds = normalizeAllowedProfileKinds(options.allowedKinds);
  const countsDisabled = allowedKinds.length === 0;
  const postsCountPromise = countsDisabled
    ? Promise.resolve({ count: 0, error: null })
    : (() => {
        let query = supabase
          .from("posts")
          .select("id", { count: "exact", head: true })
          .eq("author_id", profileId)
          .eq("is_anonymous", false);

        if (allowedKinds.length === 1) {
          query = query.eq("discussion_kind", allowedKinds[0]);
        } else {
          query = query.in("discussion_kind", allowedKinds);
        }

        return query;
      })();
  const jobPostsCountPromise = allowedKinds.includes("job")
    ? supabase
        .from("posts")
        .select("id", { count: "exact", head: true })
        .eq("author_id", profileId)
        .eq("is_anonymous", false)
        .eq("discussion_kind", "job")
    : Promise.resolve({ count: 0, error: null });
  const commentsCountPromise = countsDisabled
    ? Promise.resolve({ count: 0, error: null })
    : (() => {
        let query = supabase
          .from("comments")
          .select(
            `
            id,
            post:posts!inner(id, discussion_kind, is_anonymous)
          `,
            { count: "exact", head: true }
          )
          .eq("author_id", profileId)
          .eq("post.is_anonymous", false);

        if (allowedKinds.length === 1) {
          query = query.eq("post.discussion_kind", allowedKinds[0]);
        } else {
          query = query.in("post.discussion_kind", allowedKinds);
        }

        return query;
      })();
  const likesReceivedCountPromise = countsDisabled
    ? Promise.resolve({ count: 0, error: null })
    : (() => {
        let query = supabase
          .from("likes")
          .select(
            `
            id,
            post:posts!inner(id, author_id, discussion_kind, is_anonymous)
          `,
            { count: "exact", head: true }
          )
          .eq("post.author_id", profileId)
          .eq("post.is_anonymous", false);

        if (allowedKinds.length === 1) {
          query = query.eq("post.discussion_kind", allowedKinds[0]);
        } else {
          query = query.in("post.discussion_kind", allowedKinds);
        }

        return query;
      })();

  const [
    postsCountResult,
    jobPostsCountResult,
    commentsCountResult,
    likesReceivedCountResult,
    followersCountResult,
    followingCountResult,
    viewerIsFollowerResult,
    viewerIsFollowingResult,
  ] = await Promise.all([
    postsCountPromise,
    jobPostsCountPromise,
    commentsCountPromise,
    likesReceivedCountPromise,
    supabase.from("follows").select("id", { count: "exact", head: true }).eq("following_id", profileId),
    supabase.from("follows").select("id", { count: "exact", head: true }).eq("follower_id", profileId),
    viewerId
      ? supabase
          .from("follows")
          .select("id", { count: "exact", head: true })
          .match({ follower_id: viewerId, following_id: profileId })
      : Promise.resolve({ count: 0, error: null }),
    viewerId
      ? supabase
          .from("follows")
          .select("id", { count: "exact", head: true })
          .match({ follower_id: profileId, following_id: viewerId })
      : Promise.resolve({ count: 0, error: null }),
  ]);

  const possibleErrors = [
    postsCountResult.error,
    jobPostsCountResult.error,
    commentsCountResult.error,
    likesReceivedCountResult.error,
    followersCountResult.error,
    followingCountResult.error,
    viewerIsFollowerResult.error,
    viewerIsFollowingResult.error,
  ];
  const firstError = possibleErrors.find(Boolean);

  if (firstError) {
    throw firstError;
  }

  return {
    postsCount: postsCountResult.count || 0,
    jobPostsCount: jobPostsCountResult.count || 0,
    commentsCount: commentsCountResult.count || 0,
    likesReceivedCount: likesReceivedCountResult.count || 0,
    followersCount: followersCountResult.count || 0,
    followingCount: followingCountResult.count || 0,
    viewerIsFollower: (viewerIsFollowerResult.count || 0) > 0,
    viewerIsFollowing: (viewerIsFollowingResult.count || 0) > 0,
  };
}

export async function loadCommunityMemberships(userId: string) {
  const communityIds = await resolveCachedQuery<string[]>({
    readCached: () => getCachedCommunityMemberships(userId),
    readStale: () => getCachedCommunityMemberships(userId, { allowStale: true }),
    loadFresh: async () => {
      const { data, error } = await supabase
        .from("community_members")
        .select("community_id")
        .eq("user_id", userId)
        .eq("status", "active");

      if (error) {
        throw error;
      }

      return (data || []).map((entry) => entry.community_id);
    },
    persistFresh: (ids) => saveCachedCommunityMemberships(userId, ids),
  });

  return new Set(communityIds);
}

export async function loadCommunityMembershipDetails(userId: string) {
  return resolveCachedQuery<CachedCommunityMembershipDetail[]>({
    readCached: () => getCachedCommunityMembershipDetails(userId),
    readStale: () => getCachedCommunityMembershipDetails(userId, { allowStale: true }),
    loadFresh: async () => {
      const { data, error } = await supabase
        .from("community_members")
        .select("community_id,role,status,requested_at,accepted_at,accepted_by,banned_reason,joined_via_password_version")
        .eq("user_id", userId);

      if (error) {
        throw error;
      }

      return (data || []) as CachedCommunityMembershipDetail[];
    },
    persistFresh: (details) => saveCachedCommunityMembershipDetails(userId, details),
  }) as Promise<CommunityMembershipDetails[]>;
}

export async function loadHiddenCommunityIds(profileId: string) {
  const hiddenIds = await resolveCachedQuery<string[]>({
    readCached: () => getCachedHiddenCommunityIds(profileId),
    readStale: () => getCachedHiddenCommunityIds(profileId, { allowStale: true }),
    loadFresh: async () => {
      const { data, error } = await supabase
        .from("profile_hidden_communities")
        .select("community_id")
        .eq("profile_id", profileId);

      if (error) {
        throw error;
      }

      return (data || []).map((entry) => entry.community_id as string);
    },
    persistFresh: (ids) => saveCachedHiddenCommunityIds(profileId, ids),
  });

  return new Set(hiddenIds);
}

export async function saveHiddenCommunityIds(profileId: string, hiddenCommunityIds: string[]) {
  const normalizedIds = Array.from(new Set(hiddenCommunityIds.filter(Boolean)));

  const { error: clearError } = await supabase
    .from("profile_hidden_communities")
    .delete()
    .eq("profile_id", profileId);

  if (clearError) {
    throw clearError;
  }

  if (!normalizedIds.length) {
    await saveCachedHiddenCommunityIds(profileId, []).catch(() => undefined);
    return;
  }

  const { error: insertError } = await supabase
    .from("profile_hidden_communities")
    .insert(
      normalizedIds.map((communityId) => ({
        profile_id: profileId,
        community_id: communityId,
      }))
    );

  if (insertError) {
    throw insertError;
  }

  await saveCachedHiddenCommunityIds(profileId, normalizedIds).catch(() => undefined);
}

export async function joinCommunity(communityId: string, password?: string) {
  const { data, error } = await supabase.rpc("request_or_join_community", {
    p_community_id: communityId,
    p_password: password ?? null,
  });

  if (error) {
    throw error;
  }

  await clearCommunitySurfaceCaches();
  await clearDeviceCache(["community-memberships", "community-membership-details"]).catch(() => 0);

  // RETURNS JSONB gives a single object; RETURNS TABLE gives an array — handle both
  const row = Array.isArray(data) ? data[0] : data;
  return (row || null) as CommunityJoinResult | null;
}

export async function leaveCommunity(communityId: string) {
  const userId = (await supabase.auth.getUser()).data.user?.id;
  if (!userId) throw new Error("Sign in to manage your membership.");

  // Check current membership first
  const { data: membership, error: fetchError } = await supabase
    .from("community_members")
    .select("role, status")
    .eq("community_id", communityId)
    .eq("user_id", userId)
    .maybeSingle();

  if (fetchError) throw fetchError;
  if (!membership) throw new Error("You are not a member of this community.");

  if (membership.role === "owner" && membership.status === "active") {
    throw new Error("Community owners cannot leave until another admin is assigned.");
  }

  const wasPending = membership.status === "pending";

  // Direct DELETE — RLS policy "community_members_leave_self_or_admin" allows this
  const { error: deleteError } = await supabase
    .from("community_members")
    .delete()
    .eq("community_id", communityId)
    .eq("user_id", userId);

  if (deleteError) throw deleteError;

  await clearCommunitySurfaceCaches();
  await clearDeviceCache(["community-memberships", "community-membership-details"]).catch(() => 0);
  return wasPending ? "request_cancelled" : "left";
}

export async function loadCommunityMembersForAdmin(communityId: string) {
  return resolveCachedQuery<CommunityMemberWithProfile[]>({
    readCached: () => getCachedCommunityMembersForAdmin(communityId),
    readStale: () => getCachedCommunityMembersForAdmin(communityId, { allowStale: true }),
    loadFresh: async () => {
      const { data, error } = await supabase
        .from("community_members")
        .select("*, user:profiles!community_members_user_id_fkey(id,username,full_name,avatar_url,is_verified)")
        .eq("community_id", communityId)
        .order("status", { ascending: true })
        .order("role", { ascending: true })
        .order("requested_at", { ascending: false });

      if (error) {
        throw error;
      }

      return (data || []) as CommunityMemberWithProfile[];
    },
    persistFresh: (members) => saveCachedCommunityMembersForAdmin(communityId, members),
  });
}

export async function acceptCommunityMemberRequest(communityId: string, userId: string) {
  const { data, error } = await supabase.rpc("accept_community_member_request", {
    target_community_id: communityId,
    target_user_id: userId,
  });

  if (error) {
    throw error;
  }

  await clearCommunitySurfaceCaches();
  await clearDeviceCache([
    "community-members-admin",
    "community-memberships",
    "community-membership-details",
  ]).catch(() => 0);
  return data as CommunityMemberWithProfile | null;
}

export async function rejectCommunityMemberRequest(communityId: string, userId: string) {
  const { data, error } = await supabase.rpc("reject_community_member_request", {
    target_community_id: communityId,
    target_user_id: userId,
  });

  if (error) {
    throw error;
  }

  await clearCommunitySurfaceCaches();
  await clearDeviceCache([
    "community-members-admin",
    "community-memberships",
    "community-membership-details",
  ]).catch(() => 0);
  return Boolean(data);
}

export async function removeCommunityMember(
  communityId: string,
  userId: string,
  options: { ban?: boolean; reason?: string } = {}
) {
  const { data, error } = await supabase.rpc("remove_community_member", {
    target_community_id: communityId,
    target_user_id: userId,
    should_ban: Boolean(options.ban),
    removal_reason: options.reason || null,
  });

  if (error) {
    throw error;
  }

  await clearCommunitySurfaceCaches();
  await clearDeviceCache([
    "community-members-admin",
    "community-memberships",
    "community-membership-details",
  ]).catch(() => 0);
  return data as CommunityMemberWithProfile | null;
}

export async function setCommunityMemberAdminState(communityId: string, userId: string, makeAdmin: boolean) {
  const { data, error } = await supabase.rpc("set_community_member_admin_state", {
    target_community_id: communityId,
    target_user_id: userId,
    make_admin: makeAdmin,
  });

  if (error) {
    throw error;
  }

  await clearCommunitySurfaceCaches();
  await clearDeviceCache([
    "community-members-admin",
    "community-memberships",
    "community-membership-details",
  ]).catch(() => 0);
  return data as CommunityMemberWithProfile | null;
}

export async function loadNotifications(
  userId: string,
  options: { fresh?: boolean; limit?: number } = {}
) {
  const limit = options.limit || 24;
  return listLocalNotifications(userId, limit);
}

export async function markNotificationsAsRead(userId: string) {
  await markLocalNotificationsAsRead(userId);
}

export async function deleteNotificationFromDevice(userId: string, notificationId: string) {
  await deleteLocalNotification(userId, notificationId);
}

export async function clearCurrentUserDeviceDataCache(userId?: string | null) {
  await clearDeviceCache().catch(() => 0);

  if (userId) {
    await clearLocalNotifications(userId).catch(() => undefined);
  }
}

export async function warmCoreOfflineData(userId?: string | null) {
  const communities = await loadVisibleCommunities({ fresh: true });
  const topCommunities = communities.slice(0, 8);
  const discussionKinds: DiscussionKind[] = ["study", "job", "anonymous"];

  const [communityFeedResults, discussionFeedResults] = await Promise.all([
    Promise.allSettled(
      topCommunities.map((community) =>
        loadCommunityPostsPage(community.id, {
          fresh: true,
          limit: 12,
          offset: 0,
        })
      )
    ),
    Promise.allSettled(
      discussionKinds.map((kind) =>
        loadDiscussionPostsPage(kind, {
          fresh: true,
          includeCommunityPosts: kind !== "anonymous",
          limit: 20,
          offset: 0,
        })
      )
    ),
  ]);

  let notifications = 0;

  if (userId) {
    const userScopedResults = await Promise.allSettled([
      loadCommunityMemberships(userId),
      loadCommunityMembershipDetails(userId),
      loadHiddenCommunityIds(userId),
      loadFollowingIds(userId),
      loadRecentProfiles(userId, { limit: 12 }),
      loadNotifications(userId, { fresh: true, limit: 24 }),
    ]);
    const notificationResult = userScopedResults[5];

    if (notificationResult?.status === "fulfilled") {
      notifications = notificationResult.value.length;
    }
  } else {
    await loadRecentProfiles(null, { limit: 12 }).catch(() => undefined);
  }

  return {
    communities: communities.length,
    communityFeeds: communityFeedResults.filter((result) => result.status === "fulfilled").length,
    discussionFeeds: discussionFeedResults.filter((result) => result.status === "fulfilled").length,
    notifications,
  };
}

export function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

export async function createCommunity(input: {
  name: string;
  slug: string;
  description: string;
  heroColor: string;
  postingModes: DiscussionKind[];
  joinPolicy: CommunityJoinPolicy;
  requiresPassword: boolean;
  password?: string;
  passwordHint?: string | null;
  feedVisibility: CommunityFeedVisibility;
}) {
  const { data, error } = await supabase.rpc("create_community_with_access", {
    target_name: input.name,
    target_slug: input.slug || slugify(input.name),
    target_description: input.description,
    target_hero_color: input.heroColor,
    target_posting_modes: input.postingModes,
    target_join_policy: input.joinPolicy,
    target_requires_password: input.requiresPassword,
    target_password: input.requiresPassword ? input.password || null : null,
    target_password_hint: input.requiresPassword ? input.passwordHint || null : null,
    target_feed_visibility: input.feedVisibility,
  });

  if (error) {
    throw error;
  }

  if (Array.isArray(data)) {
    const result = (data[0] || null) as CommunityRow | null;
    await clearCommunitySurfaceCaches();
    return result;
  }

  await clearCommunitySurfaceCaches();
  return (data || null) as CommunityRow | null;
}

export async function toggleCommunityVisibility(communityId: string, nextValue: boolean) {
  const { error } = await supabase
    .from("communities")
    .update({ is_visible: nextValue })
    .eq("id", communityId);

  if (error) {
    throw error;
  }

  await clearCommunitySurfaceCaches();
}

export async function updateCommunitySettings(input: {
  communityId: string;
  name?: string;
  description?: string;
  heroColor?: string;
  postingModes?: DiscussionKind[];
  joinPolicy?: CommunityJoinPolicy;
  requiresPassword?: boolean;
  password?: string;
  passwordHint?: string | null;
  feedVisibility?: CommunityFeedVisibility;
  isVisible?: boolean;
}) {
  const { data, error } = await supabase.rpc("update_community_settings", {
    target_community_id: input.communityId,
    target_name: input.name ?? null,
    target_description: input.description ?? null,
    target_hero_color: input.heroColor ?? null,
    target_posting_modes: input.postingModes ?? null,
    target_join_policy: input.joinPolicy ?? null,
    target_requires_password: input.requiresPassword ?? null,
    target_password: input.password ?? null,
    target_password_hint: input.passwordHint ?? null,
    target_feed_visibility: input.feedVisibility ?? null,
    target_is_visible: input.isVisible ?? null,
  });

  if (error) {
    throw error;
  }

  if (Array.isArray(data)) {
    const result = (data[0] || null) as CommunityRow | null;
    await clearCommunitySurfaceCaches();
    return result;
  }

  await clearCommunitySurfaceCaches();
  return (data || null) as CommunityRow | null;
}

export async function recordPostShare(postId: string, userId: string) {
  const { error } = await supabase.from("shares").upsert(
    {
      post_id: postId,
      user_id: userId,
    },
    {
      onConflict: "post_id,user_id",
      ignoreDuplicates: true,
    }
  );

  if (error) {
    throw error;
  }
}

export async function logModerationAction(input: {
  adminId: string;
  actionType: string;
  actionNote?: string | null;
  targetUserId?: string | null;
  targetPostId?: string | null;
  targetCommentId?: string | null;
  targetCommunityId?: string | null;
}) {
  const { error } = await supabase.from("moderation_actions").insert({
    admin_id: input.adminId,
    action_type: input.actionType,
    action_note: input.actionNote || null,
    target_user_id: input.targetUserId || null,
    target_post_id: input.targetPostId || null,
    target_comment_id: input.targetCommentId || null,
    target_community_id: input.targetCommunityId || null,
  });

  if (error) {
    throw error;
  }
}
