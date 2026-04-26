import type { ProfileFormState } from "../features/profile/ProfileEditForm";
import type { CommunityMembershipDetails } from "./api";
import type {
  CommentWithAuthor,
  DiscussionKind,
  PostWithRelations,
  ProfileRow,
  CommunityRow,
} from "../types/database";

export const SESSION_VIEW_STALE_AFTER_MS = 1000 * 45;

const DISCUSSION_FEED_CACHE_LIMIT = 12;
const COMMUNITY_FEED_CACHE_LIMIT = 16;
const COMMUNITY_DIRECTORY_CACHE_LIMIT = 4;
const PROFILE_CACHE_LIMIT = 24;

export interface ActivityState<T> {
  items: T[];
  offset: number;
  hasMore: boolean;
  loading: boolean;
  loadingMore: boolean;
  initialized: boolean;
}

export interface VisibleProfileStats {
  postsCount: number;
  jobPostsCount: number;
  commentsCount: number;
  likesReceivedCount: number;
  followersCount: number;
  followingCount: number;
}

export interface ViewerRelationshipState {
  viewerIsFollower: boolean;
  viewerIsFollowing: boolean;
}

export interface DiscussionFeedSessionSnapshot {
  posts: PostWithRelations[];
  followingIds: string[];
  joinedCommunityIds: string[];
  hiddenCommunityIds: string[];
  recentProfiles: ProfileRow[];
  feedOffset: number;
  hasMorePosts: boolean;
  lastFetchedAt: number;
  updatedAt: number;
}

export interface CommunityDirectorySessionSnapshot {
  communities: CommunityRow[];
  membershipDetailsByCommunityId: Record<string, CommunityMembershipDetails>;
  memberships: string[];
  hiddenCommunityIds: string[];
  followingIds: string[];
  lastFetchedAt: number;
  updatedAt: number;
}

export interface CommunityFeedSessionSnapshot {
  posts: PostWithRelations[];
  feedOffset: number;
  hasMorePosts: boolean;
  activePostKindFilter: "all" | DiscussionKind;
  lastFetchedAt: number;
  updatedAt: number;
}

export interface ProfileSessionSnapshot {
  viewedProfile: ProfileRow | null;
  profileStats: VisibleProfileStats | null;
  viewerRelationship: ViewerRelationshipState;
  currentFollowingIds: string[];
  profileContentVisible: boolean;
  formState: ProfileFormState | null;
  postState: ActivityState<PostWithRelations>;
  commentState: ActivityState<CommentWithAuthor>;
  followersState: ActivityState<ProfileRow>;
  followingState: ActivityState<ProfileRow>;
  lastFetchedAt: number;
  updatedAt: number;
}

const discussionFeedSnapshots = new Map<string, DiscussionFeedSessionSnapshot>();
const communityDirectorySnapshots = new Map<string, CommunityDirectorySessionSnapshot>();
const communityFeedSnapshots = new Map<string, CommunityFeedSessionSnapshot>();
const profileSnapshots = new Map<string, ProfileSessionSnapshot>();

export function createEmptyActivityState<T>(): ActivityState<T> {
  return {
    items: [],
    offset: 0,
    hasMore: true,
    loading: false,
    loadingMore: false,
    initialized: false,
  };
}

export function buildDiscussionFeedSessionKey(input: {
  kind: DiscussionKind;
  viewerId?: string | null;
  communityFeedMode: string;
}) {
  return `discussion:${input.viewerId || "guest"}:${input.kind}:${input.communityFeedMode}`;
}

export function buildCommunityDirectorySessionKey(viewerId?: string | null) {
  return `community-directory:${viewerId || "guest"}`;
}

export function buildCommunityFeedSessionKey(input: {
  communityId: string;
  viewerId?: string | null;
}) {
  return `community-feed:${input.viewerId || "guest"}:${input.communityId}`;
}

export function buildProfileSessionKey(input: {
  username?: string | null;
  viewerId?: string | null;
  ownProfileId?: string | null;
}) {
  if (input.ownProfileId && (!input.username || input.username.toLowerCase() === "__self__")) {
    return `profile:self:${input.viewerId || input.ownProfileId}:${input.ownProfileId}`;
  }

  return `profile:${input.viewerId || "guest"}:${(input.username || "").trim().toLowerCase() || "__home__"}`;
}

export function isSessionSnapshotStale(snapshot: { lastFetchedAt: number } | null | undefined, maxAgeMs = SESSION_VIEW_STALE_AFTER_MS) {
  if (!snapshot?.lastFetchedAt) {
    return true;
  }

  return Date.now() - snapshot.lastFetchedAt > maxAgeMs;
}

export function getDiscussionFeedSessionSnapshot(key: string) {
  const snapshot = discussionFeedSnapshots.get(key);
  if (!snapshot) {
    return null;
  }

  return cloneDiscussionFeedSnapshot(snapshot);
}

export function setDiscussionFeedSessionSnapshot(
  key: string,
  snapshot: Omit<DiscussionFeedSessionSnapshot, "updatedAt">
) {
  writeSnapshot(discussionFeedSnapshots, key, {
    ...cloneDiscussionFeedSnapshot({ ...snapshot, updatedAt: Date.now() }),
    updatedAt: Date.now(),
  }, DISCUSSION_FEED_CACHE_LIMIT);
}

export function clearDiscussionFeedSessionSnapshot(key: string) {
  discussionFeedSnapshots.delete(key);
}

export function getCommunityDirectorySessionSnapshot(key: string) {
  const snapshot = communityDirectorySnapshots.get(key);
  if (!snapshot) {
    return null;
  }

  return cloneCommunityDirectorySnapshot(snapshot);
}

export function setCommunityDirectorySessionSnapshot(
  key: string,
  snapshot: Omit<CommunityDirectorySessionSnapshot, "updatedAt">
) {
  writeSnapshot(communityDirectorySnapshots, key, {
    ...cloneCommunityDirectorySnapshot({ ...snapshot, updatedAt: Date.now() }),
    updatedAt: Date.now(),
  }, COMMUNITY_DIRECTORY_CACHE_LIMIT);
}

export function clearCommunityDirectorySessionSnapshot(key: string) {
  communityDirectorySnapshots.delete(key);
}

export function getCommunityFeedSessionSnapshot(key: string) {
  const snapshot = communityFeedSnapshots.get(key);
  if (!snapshot) {
    return null;
  }

  return cloneCommunityFeedSnapshot(snapshot);
}

export function setCommunityFeedSessionSnapshot(
  key: string,
  snapshot: Omit<CommunityFeedSessionSnapshot, "updatedAt">
) {
  writeSnapshot(communityFeedSnapshots, key, {
    ...cloneCommunityFeedSnapshot({ ...snapshot, updatedAt: Date.now() }),
    updatedAt: Date.now(),
  }, COMMUNITY_FEED_CACHE_LIMIT);
}

export function clearCommunityFeedSessionSnapshot(key: string) {
  communityFeedSnapshots.delete(key);
}

export function getProfileSessionSnapshot(key: string) {
  const snapshot = profileSnapshots.get(key);
  if (!snapshot) {
    return null;
  }

  return cloneProfileSnapshot(snapshot);
}

export function setProfileSessionSnapshot(
  key: string,
  snapshot: Omit<ProfileSessionSnapshot, "updatedAt">
) {
  writeSnapshot(profileSnapshots, key, {
    ...cloneProfileSnapshot({ ...snapshot, updatedAt: Date.now() }),
    updatedAt: Date.now(),
  }, PROFILE_CACHE_LIMIT);
}

export function clearProfileSessionSnapshot(key: string) {
  profileSnapshots.delete(key);
}

function cloneActivityState<T>(state: ActivityState<T>): ActivityState<T> {
  return {
    ...state,
    items: [...state.items],
  };
}

function cloneDiscussionFeedSnapshot(snapshot: DiscussionFeedSessionSnapshot): DiscussionFeedSessionSnapshot {
  return {
    ...snapshot,
    posts: [...snapshot.posts],
    followingIds: [...snapshot.followingIds],
    joinedCommunityIds: [...snapshot.joinedCommunityIds],
    hiddenCommunityIds: [...snapshot.hiddenCommunityIds],
    recentProfiles: [...snapshot.recentProfiles],
  };
}

function cloneCommunityDirectorySnapshot(snapshot: CommunityDirectorySessionSnapshot): CommunityDirectorySessionSnapshot {
  return {
    ...snapshot,
    communities: [...snapshot.communities],
    memberships: [...snapshot.memberships],
    hiddenCommunityIds: [...snapshot.hiddenCommunityIds],
    followingIds: [...snapshot.followingIds],
    membershipDetailsByCommunityId: { ...snapshot.membershipDetailsByCommunityId },
  };
}

function cloneCommunityFeedSnapshot(snapshot: CommunityFeedSessionSnapshot): CommunityFeedSessionSnapshot {
  return {
    ...snapshot,
    posts: [...snapshot.posts],
  };
}

function cloneProfileSnapshot(snapshot: ProfileSessionSnapshot): ProfileSessionSnapshot {
  return {
    ...snapshot,
    viewedProfile: snapshot.viewedProfile ? { ...snapshot.viewedProfile } : null,
    profileStats: snapshot.profileStats ? { ...snapshot.profileStats } : null,
    viewerRelationship: { ...snapshot.viewerRelationship },
    currentFollowingIds: [...snapshot.currentFollowingIds],
    formState: snapshot.formState ? { ...snapshot.formState } : null,
    postState: cloneActivityState(snapshot.postState),
    commentState: cloneActivityState(snapshot.commentState),
    followersState: cloneActivityState(snapshot.followersState),
    followingState: cloneActivityState(snapshot.followingState),
  };
}

function writeSnapshot<T extends { updatedAt: number }>(
  target: Map<string, T>,
  key: string,
  snapshot: T,
  maxEntries: number
) {
  target.set(key, snapshot);
  trimSnapshotMap(target, maxEntries);
}

function trimSnapshotMap<T extends { updatedAt: number }>(target: Map<string, T>, maxEntries: number) {
  if (target.size <= maxEntries) {
    return;
  }

  const entries = Array.from(target.entries()).sort((left, right) => left[1].updatedAt - right[1].updatedAt);
  const overflow = Math.max(0, target.size - maxEntries);

  for (let index = 0; index < overflow; index += 1) {
    target.delete(entries[index][0]);
  }
}
