import type {
  CommunityMemberRole,
  CommunityMemberStatus,
  CommunityMemberWithProfile,
  CommunityRow,
  DiscussionKind,
  NotificationWithRelations,
  PostWithRelations,
  ProfileRow,
  SearchResults,
  StudentPortfolioWithOwner,
  StudentResumeWithOwner,
  StudentStudyNotesShareWithOwner,
} from "../types/database";
import type { BugFixResultShareRecord } from "../components/tools/bugfix-lab/types";
import {
  clearOfflineCache,
  getOfflineCacheSummary,
  readOfflineCacheValue,
  requestPersistentOfflineStorage,
  writeOfflineCacheValue,
  type OfflineCacheSummary,
} from "./offlineCache";
import { isBackendApiConfigured, requestBackend } from "./backendApi";

export interface CachedCommunityMembershipDetail {
  community_id: string;
  role: CommunityMemberRole;
  status: CommunityMemberStatus;
  requested_at: string;
  accepted_at: string | null;
  accepted_by: string | null;
  banned_reason: string | null;
  joined_via_password_version: number;
}

export const REMOTE_CACHE_NAMESPACES = [
  "discussions",
  "community-feed",
  "communities",
  "notifications",
  "search",
] as const;

export const DEVICE_CACHE_NAMESPACES = [
  "communities",
  "community-feed",
  "discussions",
  "search",
  "recent-profiles",
  "following-ids",
  "community-memberships",
  "community-membership-details",
  "hidden-communities",
  "community-members-admin",
] as const;

export type DeviceCacheNamespace = (typeof DEVICE_CACHE_NAMESPACES)[number];

const CACHE_TTL_MS: Record<DeviceCacheNamespace, number> = {
  communities: 1000 * 60 * 15,
  "community-feed": 1000 * 60 * 5,
  discussions: 1000 * 60 * 5,
  search: 1000 * 60 * 5,
  "recent-profiles": 1000 * 60 * 30,
  "following-ids": 1000 * 60 * 30,
  "community-memberships": 1000 * 60 * 15,
  "community-membership-details": 1000 * 60 * 15,
  "hidden-communities": 1000 * 60 * 60 * 24 * 7,
  "community-members-admin": 1000 * 60 * 10,
};

async function fetchBackendCache<T>(
  path: string,
  options: { auth?: "required" | "optional" | "none" } = {}
): Promise<T | null> {
  if (!isBackendApiConfigured()) {
    return null;
  }

  try {
    return await requestBackend<T>(path, {
      auth: options.auth || "none",
      featureName: "Cache",
    });
  } catch (error) {
    console.warn("Backend cache request failed, falling back to device cache.", error);
    return null;
  }
}

async function readDeviceCache<T>(key: string, options: { allowStale?: boolean } = {}) {
  return readOfflineCacheValue<T>(key, options);
}

async function writeDeviceCache<T>(key: string, namespace: DeviceCacheNamespace, value: T) {
  await writeOfflineCacheValue(key, namespace, value, {
    ttlMs: CACHE_TTL_MS[namespace],
  });
}

function buildDiscussionFeedCacheKey(
  kind: DiscussionKind,
  limit: number,
  offset: number,
  includeCommunityPosts: boolean
) {
  return `discussions:${kind}:${limit}:${offset}:${includeCommunityPosts ? "community" : "discussion"}`;
}

function buildCommunitiesCacheKey() {
  return "communities:index";
}

function buildCommunityFeedCacheKey(communityId: string, limit: number, offset: number) {
  return `community-feed:${communityId}:${limit}:${offset}`;
}

function buildSearchCacheKey(query: string, limit: number) {
  return `search:${query.trim().toLowerCase()}:${limit}`;
}

function buildRecentProfilesCacheKey(currentUserId: string | null | undefined, limit: number) {
  return `recent-profiles:${currentUserId || "guest"}:${limit}`;
}

function buildFollowingIdsCacheKey(profileId: string) {
  return `following-ids:${profileId}`;
}

function buildCommunityMembershipsCacheKey(userId: string) {
  return `community-memberships:${userId}`;
}

function buildCommunityMembershipDetailsCacheKey(userId: string) {
  return `community-membership-details:${userId}`;
}

function buildHiddenCommunitiesCacheKey(profileId: string) {
  return `hidden-communities:${profileId}`;
}

function buildCommunityMembersAdminCacheKey(communityId: string) {
  return `community-members-admin:${communityId}`;
}

export async function getCachedDiscussionFeed(
  kind: DiscussionKind,
  limit = 30,
  offset = 0,
  _accessToken?: string,
  includeCommunityPosts = false,
  options: { allowStale?: boolean } = {}
): Promise<PostWithRelations[] | null> {
  const cacheKey = buildDiscussionFeedCacheKey(kind, limit, offset, includeCommunityPosts);
  return readDeviceCache<PostWithRelations[]>(cacheKey, options);
}

export async function saveCachedDiscussionFeed(
  kind: DiscussionKind,
  posts: PostWithRelations[],
  options: {
    limit?: number;
    offset?: number;
    includeCommunityPosts?: boolean;
  } = {}
) {
  await writeDeviceCache(
    buildDiscussionFeedCacheKey(
      kind,
      Math.max(1, options.limit || posts.length || 30),
      Math.max(0, options.offset || 0),
      options.includeCommunityPosts ?? false
    ),
    "discussions",
    posts
  );
}

export async function getCachedCommunities(
  _accessToken?: string,
  options: { allowStale?: boolean } = {}
): Promise<CommunityRow[] | null> {
  const cacheKey = buildCommunitiesCacheKey();
  return readDeviceCache<CommunityRow[]>(cacheKey, options);
}

export async function saveCachedCommunities(communities: CommunityRow[]) {
  await writeDeviceCache(buildCommunitiesCacheKey(), "communities", communities);
}

export async function getCachedCommunityFeed(
  communityId: string,
  limit = 30,
  offset = 0,
  _accessToken?: string,
  options: { allowStale?: boolean } = {}
): Promise<PostWithRelations[] | null> {
  const cacheKey = buildCommunityFeedCacheKey(communityId, limit, offset);
  return readDeviceCache<PostWithRelations[]>(cacheKey, options);
}

export async function saveCachedCommunityFeed(
  communityId: string,
  posts: PostWithRelations[],
  options: { limit?: number; offset?: number } = {}
) {
  await writeDeviceCache(
    buildCommunityFeedCacheKey(
      communityId,
      Math.max(1, options.limit || posts.length || 30),
      Math.max(0, options.offset || 0)
    ),
    "community-feed",
    posts
  );
}

export async function getCachedSearchResults(
  query: string,
  limit = 6,
  _accessToken?: string,
  options: { allowStale?: boolean } = {}
): Promise<SearchResults | null> {
  const cacheKey = buildSearchCacheKey(query, limit);
  return readDeviceCache<SearchResults>(cacheKey, options);
}

export async function saveCachedSearchResults(query: string, limit: number, results: SearchResults) {
  await writeDeviceCache(buildSearchCacheKey(query, limit), "search", results);
}

export async function getCachedRecentProfiles(
  currentUserId?: string | null,
  limit = 10,
  options: { allowStale?: boolean } = {}
) {
  return readDeviceCache<ProfileRow[]>(
    buildRecentProfilesCacheKey(currentUserId, limit),
    options
  );
}

export async function saveCachedRecentProfiles(
  profiles: ProfileRow[],
  currentUserId?: string | null,
  limit = 10
) {
  await writeDeviceCache(
    buildRecentProfilesCacheKey(currentUserId, limit),
    "recent-profiles",
    profiles
  );
}

export async function getCachedFollowingIds(
  profileId: string,
  options: { allowStale?: boolean } = {}
) {
  return readDeviceCache<string[]>(buildFollowingIdsCacheKey(profileId), options);
}

export async function saveCachedFollowingIds(profileId: string, followingIds: string[]) {
  await writeDeviceCache(buildFollowingIdsCacheKey(profileId), "following-ids", followingIds);
}

export async function getCachedCommunityMemberships(
  userId: string,
  options: { allowStale?: boolean } = {}
) {
  return readDeviceCache<string[]>(buildCommunityMembershipsCacheKey(userId), options);
}

export async function saveCachedCommunityMemberships(userId: string, communityIds: string[]) {
  await writeDeviceCache(
    buildCommunityMembershipsCacheKey(userId),
    "community-memberships",
    communityIds
  );
}

export async function getCachedCommunityMembershipDetails(
  userId: string,
  options: { allowStale?: boolean } = {}
) {
  return readDeviceCache<CachedCommunityMembershipDetail[]>(
    buildCommunityMembershipDetailsCacheKey(userId),
    options
  );
}

export async function saveCachedCommunityMembershipDetails(
  userId: string,
  details: CachedCommunityMembershipDetail[]
) {
  await writeDeviceCache(
    buildCommunityMembershipDetailsCacheKey(userId),
    "community-membership-details",
    details
  );
}

export async function getCachedHiddenCommunityIds(
  profileId: string,
  options: { allowStale?: boolean } = {}
) {
  return readDeviceCache<string[]>(buildHiddenCommunitiesCacheKey(profileId), options);
}

export async function saveCachedHiddenCommunityIds(profileId: string, hiddenCommunityIds: string[]) {
  await writeDeviceCache(
    buildHiddenCommunitiesCacheKey(profileId),
    "hidden-communities",
    hiddenCommunityIds
  );
}

export async function getCachedCommunityMembersForAdmin(
  communityId: string,
  options: { allowStale?: boolean } = {}
) {
  return readDeviceCache<CommunityMemberWithProfile[]>(
    buildCommunityMembersAdminCacheKey(communityId),
    options
  );
}

export async function saveCachedCommunityMembersForAdmin(
  communityId: string,
  members: CommunityMemberWithProfile[]
) {
  await writeDeviceCache(
    buildCommunityMembersAdminCacheKey(communityId),
    "community-members-admin",
    members
  );
}

export async function getCachedNotifications(
  limit = 24,
  _accessToken?: string
): Promise<NotificationWithRelations[] | null> {
  return null;
}

export async function getCachedPublicResume(
  shareSlug: string
): Promise<StudentResumeWithOwner | null> {
  return fetchBackendCache<StudentResumeWithOwner>(`/public/resumes/${encodeURIComponent(shareSlug)}`);
}

export async function bustPublicResumeCache(
  shareSlug: string,
  _accessToken: string
): Promise<boolean> {
  if (!isBackendApiConfigured()) {
    return false;
  }

  try {
    await requestBackend(`/public/resumes/${encodeURIComponent(shareSlug)}/invalidate`, {
      method: "POST",
      auth: "required",
      featureName: "Public resume cache",
    });
    return true;
  } catch {
    return false;
  }
}

export async function getCachedPublicPortfolio(
  shareSlug: string
): Promise<StudentPortfolioWithOwner | null> {
  return fetchBackendCache<StudentPortfolioWithOwner>(`/public/portfolios/${encodeURIComponent(shareSlug)}`);
}

export async function bustPublicPortfolioCache(
  shareSlug: string,
  _accessToken: string
): Promise<boolean> {
  if (!isBackendApiConfigured()) {
    return false;
  }

  try {
    await requestBackend(`/public/portfolios/${encodeURIComponent(shareSlug)}/invalidate`, {
      method: "POST",
      auth: "required",
      featureName: "Public portfolio cache",
    });
    return true;
  } catch {
    return false;
  }
}

export async function getCachedPublicStudyNotes(
  shareSlug: string,
  options: { preview?: boolean } = {}
): Promise<StudentStudyNotesShareWithOwner | null> {
  const suffix = options.preview ? "?preview=1" : "";
  return fetchBackendCache<StudentStudyNotesShareWithOwner>(
    `/public/study-notes/${encodeURIComponent(shareSlug)}${suffix}`
  );
}

export async function getCachedPublicBugFixResult(
  shareSlug: string
): Promise<BugFixResultShareRecord | null> {
  return fetchBackendCache<BugFixResultShareRecord>(`/public/bugfix-results/${encodeURIComponent(shareSlug)}`);
}

export async function getCacheHealth(
  _accessToken?: string
): Promise<{ enabled: boolean; entries: number; baseUrl: string } | null> {
  try {
    return await requestBackend<{ enabled: boolean; entries: number; baseUrl: string }>("/cache/status", {
      auth: "none",
      featureName: "Cache health",
    });
  } catch (error) {
    console.warn("Failed to fetch cache health.", error);
    return null;
  }
}

export async function clearBackendCache(_accessToken: string, namespace?: string): Promise<boolean> {
  if (!isBackendApiConfigured()) {
    return false;
  }

  try {
    await requestBackend(`/cache/clear${namespace ? `?namespace=${encodeURIComponent(namespace)}` : ""}`, {
      method: "POST",
      auth: "required",
      featureName: "Cache clear",
    });
    return true;
  } catch {
    return false;
  }
}

export async function clearDeviceCache(namespace?: DeviceCacheNamespace | DeviceCacheNamespace[]) {
  return clearOfflineCache(namespace);
}

export async function getDeviceCacheSummary(): Promise<OfflineCacheSummary> {
  return getOfflineCacheSummary();
}

export async function requestPersistentDeviceStorage() {
  return requestPersistentOfflineStorage();
}

export function isBackendCacheConfigured() {
  return isBackendApiConfigured();
}
