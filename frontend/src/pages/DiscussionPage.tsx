import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import { useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { FloatingPostButton } from "../components/FloatingPostButton";
import { getDiscussionKindLabel, isDiscussionKind } from "../data/discussions";
import {
  DiscussionDiscoveryPanel,
  type DiscoveryProfileEntry,
} from "../features/discussions/DiscussionDiscoveryPanel";
import { DiscussionFeed } from "../features/discussions/DiscussionFeed";
import { DiscussionHero } from "../features/discussions/DiscussionHero";
import { DiscussionStoryRail, type DiscussionStoryEntry } from "../features/discussions/DiscussionStoryRail";
import { useNetworkStatus } from "../hooks/useNetworkStatus";
import { useInfiniteScrollTrigger } from "../hooks/useInfiniteScrollTrigger";
import {
  createComment,
  deleteComment,
  deletePost,
  loadCommunityMemberships,
  loadDiscussionPostsPage,
  loadFollowingIds,
  loadHiddenCommunityIds,
  loadRecentProfiles,
  recordPostShare,
  toggleFollow,
  togglePostLike,
  voteOnPoll,
} from "../lib/api";
import { buildAuthRedirectPath } from "../lib/authRedirect";
import {
  loadDiscussionCommunityFeedMode,
} from "../lib/discussionFeedPreferences";
import {
  buildDiscussionFeedSessionKey,
  getDiscussionFeedSessionSnapshot,
  isSessionSnapshotStale,
  setDiscussionFeedSessionSnapshot,
} from "../lib/sessionViewCache";
import { useAuthStore } from "../store/authStore";
import type {
  CommentWithAuthor,
  DiscussionKind,
  PostWithRelations,
  ProfileRow,
} from "../types/database";

const INITIAL_DISCUSSION_POSTS = 5;
const DISCUSSION_SCROLL_POSTS = 10;

function flattenComments(comments: CommentWithAuthor[]): CommentWithAuthor[] {
  return comments.flatMap((comment) => [comment, ...flattenComments(comment.replies || [])]);
}

function buildRecentEntries(
  profiles: ProfileRow[],
  currentUserId: string
): DiscoveryProfileEntry[] {
  return profiles
    .filter((profile) => profile.id !== currentUserId)
    .slice(0, 6)
    .map((profile) => ({ profile }));
}

function buildSuggestedEntries(
  posts: PostWithRelations[],
  currentUserId: string,
  followingIds: Set<string>,
  excludedIds: Set<string>,
  recentProfiles: ProfileRow[]
): DiscoveryProfileEntry[] {
  const candidates = new Map<string, { profile: ProfileRow; score: number }>();

  const addCandidate = (profile: ProfileRow | null | undefined, score: number) => {
    if (
      !profile ||
      profile.id === currentUserId ||
      excludedIds.has(profile.id) ||
      followingIds.has(profile.id)
    ) {
      return;
    }

    const existing = candidates.get(profile.id);
    if (!existing || score > existing.score) {
      candidates.set(profile.id, { profile, score });
      return;
    }

    existing.score += Math.max(1, Math.floor(score / 5));
  };

  posts.forEach((post) => {
    const publicPost = post.visibility_scope === "discussion" && !post.is_anonymous;
    const flatComments = flattenComments(post.comments || []);
    const userLiked = post.likes.some((like) => like.user_id === currentUserId);
    const userShared = post.shares.some((share) => share.user_id === currentUserId);
    const userVoted = post.poll_votes.some((vote) => vote.user_id === currentUserId);
    const userCommented = flatComments.some((comment) => comment.author_id === currentUserId);
    const interactionBoost =
      (userLiked ? 26 : 0) +
      (userCommented ? 32 : 0) +
      (userShared ? 18 : 0) +
      (userVoted ? 14 : 0);
    const engagementScore =
      post.likes.length + post.shares.length * 2 + flatComments.length * 2 + post.poll_votes.length;

    if (publicPost) {
      addCandidate(post.author, 12 + engagementScore + interactionBoost);
    }

    flatComments.forEach((comment) => {
      if (!publicPost || !comment.author) {
        return;
      }

      const commentScore = interactionBoost > 0 ? 10 + Math.floor(interactionBoost / 2) : 6;
      addCandidate(comment.author, commentScore);
    });
  });

  return Array.from(candidates.values())
    .sort((left, right) => right.score - left.score)
    .slice(0, 6)
    .map(({ profile }) => ({ profile }))
    .concat(
      Array.from(candidates.values()).length > 0
        ? []
        : recentProfiles
            .filter((profile) => profile.id !== currentUserId)
            .filter((profile) => !followingIds.has(profile.id))
            .slice(0, 6)
            .map((profile) => ({ profile }))
    )
    .slice(0, 6);
}

function buildStoryEntries(recentEntries: DiscoveryProfileEntry[], suggestedEntries: DiscoveryProfileEntry[]) {
  const seen = new Set<string>();
  const stories: DiscussionStoryEntry[] = [];

  recentEntries.forEach((entry) => {
    if (seen.has(entry.profile.id)) {
      return;
    }

    seen.add(entry.profile.id);
    stories.push({ profile: entry.profile, tone: "recent" });
  });

  suggestedEntries.forEach((entry) => {
    if (seen.has(entry.profile.id)) {
      return;
    }

    seen.add(entry.profile.id);
    stories.push({ profile: entry.profile, tone: "suggested" });
  });

  return stories.slice(0, 8);
}

function mergeUniquePosts(current: PostWithRelations[], incoming: PostWithRelations[]) {
  const merged = new Map<string, PostWithRelations>();

  current.forEach((post) => {
    merged.set(post.id, post);
  });

  incoming.forEach((post) => {
    merged.set(post.id, post);
  });

  return Array.from(merged.values()).sort((left, right) => right.created_at.localeCompare(left.created_at));
}

async function collectDiscussionBatch(input: {
  kind: DiscussionKind;
  fresh?: boolean;
  hiddenCommunityIds: Set<string>;
  includeCommunityPosts: boolean;
  communityFeedMode: DiscussionCommunityFeedMode;
  joinedCommunityIds: Set<string>;
  startOffset: number;
  targetCount: number;
}) {
  let items: PostWithRelations[] = [];
  let nextOffset = input.startOffset;
  let hasMore = true;

  while (items.length < input.targetCount && hasMore) {
    const page = await loadDiscussionPostsPage(input.kind, {
      fresh: input.fresh,
      includeCommunityPosts: input.includeCommunityPosts,
      communityFeedMode: input.communityFeedMode,
      joinedCommunityIds: input.joinedCommunityIds,
      hiddenCommunityIds: input.hiddenCommunityIds,
      limit: Math.max(1, input.targetCount - items.length),
      offset: nextOffset,
    });

    if (page.nextOffset === nextOffset) {
      hasMore = false;
      break;
    }

    items = mergeUniquePosts(items, page.items);
    nextOffset = page.nextOffset;
    hasMore = page.hasMore;
  }

  return {
    items,
    nextOffset,
    hasMore,
  };
}

export function DiscussionPage() {
  const { user } = useAuthStore();
  const isOnline = useNetworkStatus();
  const navigate = useNavigate();
  const location = useLocation();
  const { kind } = useParams();
  const [searchParams] = useSearchParams();
  const activeKind: DiscussionKind = isDiscussionKind(kind) ? kind : "study";
  const highlightedPostId = searchParams.get("post");
  const communityFeedMode = loadDiscussionCommunityFeedMode();
  const effectiveCommunityFeedMode =
    activeKind === "anonymous" || !user ? "all" : communityFeedMode;
  const discussionSessionKey = useMemo(
    () =>
      buildDiscussionFeedSessionKey({
        kind: activeKind,
        viewerId: user?.id || null,
        communityFeedMode: effectiveCommunityFeedMode,
      }),
    [activeKind, effectiveCommunityFeedMode, user?.id]
  );
  const cachedFeedSnapshot = useMemo(
    () => getDiscussionFeedSessionSnapshot(discussionSessionKey),
    [discussionSessionKey]
  );
  const [posts, setPosts] = useState<PostWithRelations[]>(() => cachedFeedSnapshot?.posts ?? []);
  const [followingIds, setFollowingIds] = useState<Set<string>>(
    () => new Set(cachedFeedSnapshot?.followingIds ?? [])
  );
  const [joinedCommunityIds, setJoinedCommunityIds] = useState<Set<string>>(
    () => new Set(cachedFeedSnapshot?.joinedCommunityIds ?? [])
  );
  const [hiddenCommunityIds, setHiddenCommunityIds] = useState<Set<string>>(
    () => new Set(cachedFeedSnapshot?.hiddenCommunityIds ?? [])
  );
  const [recentProfiles, setRecentProfiles] = useState<ProfileRow[]>(() => cachedFeedSnapshot?.recentProfiles ?? []);
  const [loading, setLoading] = useState(() => !cachedFeedSnapshot);
  const [loadingMore, setLoadingMore] = useState(false);
  const [feedOffset, setFeedOffset] = useState(() => cachedFeedSnapshot?.feedOffset ?? 0);
  const [hasMorePosts, setHasMorePosts] = useState(() => cachedFeedSnapshot?.hasMorePosts ?? true);
  const wasOfflineRef = useRef(false);
  const stateSessionKeyRef = useRef(discussionSessionKey);
  const postsRef = useRef(posts);
  const feedOffsetRef = useRef(feedOffset);
  const hasMorePostsRef = useRef(hasMorePosts);
  const lastFetchedAtRef = useRef(cachedFeedSnapshot?.lastFetchedAt ?? 0);
  const discussionKindLabel = getDiscussionKindLabel(activeKind);
  const authRedirectPath = buildAuthRedirectPath(location);

  useEffect(() => {
    postsRef.current = posts;
  }, [posts]);

  useEffect(() => {
    feedOffsetRef.current = feedOffset;
  }, [feedOffset]);

  useEffect(() => {
    hasMorePostsRef.current = hasMorePosts;
  }, [hasMorePosts]);

  const requireAuth = useCallback(
    (message: string) => {
      toast(message);
      navigate(authRedirectPath);
    },
    [authRedirectPath, navigate]
  );

  const loadPageData = useCallback(
    async (options: { fresh?: boolean; targetCount?: number; showLoading?: boolean; mergeIntoExisting?: boolean } = {}) => {
      const shouldShowLoading = options.showLoading ?? false;
      const shouldShowBlockingLoader = shouldShowLoading && postsRef.current.length === 0;

      if (shouldShowBlockingLoader) {
        setLoading(true);
      }

      try {
        const [nextFollowingIds, memberships, hiddenIds, recentUsers] = await Promise.all([
          user ? loadFollowingIds(user.id) : Promise.resolve(new Set<string>()),
          user ? loadCommunityMemberships(user.id) : Promise.resolve(new Set<string>()),
          user ? loadHiddenCommunityIds(user.id) : Promise.resolve(new Set<string>()),
          loadRecentProfiles(user?.id, { limit: 12 }),
        ]);
        const feed = await collectDiscussionBatch({
          kind: activeKind,
          fresh: options.fresh,
          includeCommunityPosts: activeKind !== "anonymous",
          communityFeedMode: effectiveCommunityFeedMode,
          joinedCommunityIds: memberships,
          hiddenCommunityIds: hiddenIds,
          startOffset: 0,
          targetCount: options.targetCount || INITIAL_DISCUSSION_POSTS,
        });
        const shouldMerge = (options.mergeIntoExisting ?? false) && postsRef.current.length > 0;
        const nextPosts = shouldMerge ? mergeUniquePosts(postsRef.current, feed.items) : feed.items;
        const nextFeedOffset = shouldMerge ? Math.max(feedOffsetRef.current, feed.nextOffset) : feed.nextOffset;
        const nextHasMore = shouldMerge ? hasMorePostsRef.current || feed.hasMore : feed.hasMore;

        postsRef.current = nextPosts;
        feedOffsetRef.current = nextFeedOffset;
        hasMorePostsRef.current = nextHasMore;
        lastFetchedAtRef.current = Date.now();

        setPosts(nextPosts);
        setFeedOffset(nextFeedOffset);
        setHasMorePosts(nextHasMore);
        setFollowingIds(nextFollowingIds);
        setJoinedCommunityIds(memberships);
        setHiddenCommunityIds(hiddenIds);
        setRecentProfiles(recentUsers);
      } catch (error) {
        if (isOnline) {
          toast.error(error instanceof Error ? error.message : "Failed to load discussions.");
        }
      } finally {
        if (shouldShowBlockingLoader) {
          setLoading(false);
        }
      }
    },
    [activeKind, effectiveCommunityFeedMode, isOnline, user]
  );

  const loadMorePosts = useCallback(async () => {
    if (!isOnline || loading || loadingMore || !hasMorePosts) {
      return;
    }

    setLoadingMore(true);

    try {
      const nextPage = await collectDiscussionBatch({
        kind: activeKind,
        includeCommunityPosts: activeKind !== "anonymous",
        communityFeedMode: effectiveCommunityFeedMode,
        joinedCommunityIds,
        hiddenCommunityIds,
        startOffset: feedOffset,
        targetCount: DISCUSSION_SCROLL_POSTS,
      });
      const nextPosts = mergeUniquePosts(postsRef.current, nextPage.items);
      postsRef.current = nextPosts;
      feedOffsetRef.current = nextPage.nextOffset;
      hasMorePostsRef.current = nextPage.hasMore;
      lastFetchedAtRef.current = Date.now();

      setPosts(nextPosts);
      setFeedOffset(nextPage.nextOffset);
      setHasMorePosts(nextPage.hasMore);
    } catch (error) {
      if (isOnline) {
        toast.error(error instanceof Error ? error.message : "Could not load more posts.");
      }
    } finally {
      setLoadingMore(false);
    }
  }, [
    activeKind,
    effectiveCommunityFeedMode,
    feedOffset,
    hasMorePosts,
    hiddenCommunityIds,
    isOnline,
    joinedCommunityIds,
    loading,
    loadingMore,
  ]);

  useEffect(() => {
    if (stateSessionKeyRef.current !== discussionSessionKey || lastFetchedAtRef.current === 0) {
      return;
    }

    setDiscussionFeedSessionSnapshot(discussionSessionKey, {
      posts,
      followingIds: Array.from(followingIds),
      joinedCommunityIds: Array.from(joinedCommunityIds),
      hiddenCommunityIds: Array.from(hiddenCommunityIds),
      recentProfiles,
      feedOffset,
      hasMorePosts,
      lastFetchedAt: lastFetchedAtRef.current,
    });
  }, [
    discussionSessionKey,
    feedOffset,
    followingIds,
    hasMorePosts,
    hiddenCommunityIds,
    joinedCommunityIds,
    posts,
    recentProfiles,
  ]);

  const loadMoreRef = useInfiniteScrollTrigger({
    enabled: isOnline,
    hasMore: hasMorePosts,
    loading: loading || loadingMore,
    onLoadMore: loadMorePosts,
  });

  useEffect(() => {
    if (!isDiscussionKind(kind)) {
      navigate("/app/discussions/study", { replace: true });
      return;
    }

    const sessionSnapshot = getDiscussionFeedSessionSnapshot(discussionSessionKey);

    if (sessionSnapshot) {
      stateSessionKeyRef.current = discussionSessionKey;
      postsRef.current = sessionSnapshot.posts;
      feedOffsetRef.current = sessionSnapshot.feedOffset;
      hasMorePostsRef.current = sessionSnapshot.hasMorePosts;
      lastFetchedAtRef.current = sessionSnapshot.lastFetchedAt;
      setPosts(sessionSnapshot.posts);
      setFollowingIds(new Set(sessionSnapshot.followingIds));
      setJoinedCommunityIds(new Set(sessionSnapshot.joinedCommunityIds));
      setHiddenCommunityIds(new Set(sessionSnapshot.hiddenCommunityIds));
      setRecentProfiles(sessionSnapshot.recentProfiles);
      setFeedOffset(sessionSnapshot.feedOffset);
      setHasMorePosts(sessionSnapshot.hasMorePosts);
      setLoading(false);
      setLoadingMore(false);

      if (isSessionSnapshotStale(sessionSnapshot)) {
        void loadPageData({
          fresh: true,
          targetCount: Math.min(Math.max(sessionSnapshot.posts.length, INITIAL_DISCUSSION_POSTS), 20),
          showLoading: false,
          mergeIntoExisting: true,
        });
      }

      return;
    }

    stateSessionKeyRef.current = discussionSessionKey;
    postsRef.current = [];
    feedOffsetRef.current = 0;
    hasMorePostsRef.current = true;
    lastFetchedAtRef.current = 0;
    setPosts([]);
    setFollowingIds(new Set());
    setJoinedCommunityIds(new Set());
    setHiddenCommunityIds(new Set());
    setRecentProfiles([]);
    setFeedOffset(0);
    setHasMorePosts(true);
    setLoading(true);
    setLoadingMore(false);
    void loadPageData({ showLoading: true, targetCount: INITIAL_DISCUSSION_POSTS });
  }, [discussionSessionKey, kind, loadPageData, navigate]);

  useEffect(() => {
    if (!highlightedPostId || loading) {
      return;
    }

    const frame = window.requestAnimationFrame(() => {
      const element = document.getElementById(`post-${highlightedPostId}`);
      element?.scrollIntoView({ behavior: "smooth", block: "center" });
    });

    return () => window.cancelAnimationFrame(frame);
  }, [highlightedPostId, loading, posts]);

  useEffect(() => {
    if (
      !isOnline ||
      !highlightedPostId ||
      loading ||
      loadingMore ||
      !hasMorePosts ||
      posts.some((post) => post.id === highlightedPostId)
    ) {
      return;
    }

    void loadMorePosts();
  }, [hasMorePosts, highlightedPostId, isOnline, loadMorePosts, loading, loadingMore, posts]);

  useEffect(() => {
    if (!isOnline) {
      wasOfflineRef.current = true;
      return;
    }

    if (!wasOfflineRef.current) {
      return;
    }

    wasOfflineRef.current = false;
    void loadPageData({
      fresh: true,
      targetCount: Math.min(Math.max(posts.length, INITIAL_DISCUSSION_POSTS), 20),
      showLoading: posts.length === 0,
      mergeIntoExisting: posts.length > 0,
    });
  }, [isOnline, loadPageData, posts.length]);

  const recentEntries = useMemo(
    () => buildRecentEntries(recentProfiles, user?.id || ""),
    [recentProfiles, user?.id]
  );
  const recentEntryIds = useMemo(
    () => new Set(recentEntries.map((entry) => entry.profile.id)),
    [recentEntries]
  );
  const suggestedEntries = useMemo(
    () => buildSuggestedEntries(posts, user?.id || "", followingIds, recentEntryIds, recentProfiles),
    [followingIds, posts, recentEntryIds, recentProfiles, user?.id]
  );
  const mobileStoryEntries = useMemo(
    () => buildStoryEntries(recentEntries, suggestedEntries),
    [recentEntries, suggestedEntries]
  );
  const emptyFeedTitle =
    !isOnline
      ? "You're offline."
      : effectiveCommunityFeedMode === "joined-only"
      ? joinedCommunityIds.size === 0
        ? "Join a community to see its posts here."
        : `No joined community posts yet in ${discussionKindLabel}.`
      : undefined;
  const emptyFeedDescription =
    !isOnline
      ? "Discussion posts and suggestions need internet. My Room and local tools already loaded on this device still work offline."
      : effectiveCommunityFeedMode === "joined-only"
      ? joinedCommunityIds.size === 0
        ? "Your Discuss feed is set to joined communities only. Join a community or switch back to all posts."
        : "Only posts from communities you joined are being shown in this Discuss feed."
      : undefined;

  const refreshPageData = async () => {
    await loadPageData({
      fresh: true,
      targetCount: Math.min(Math.max(posts.length, INITIAL_DISCUSSION_POSTS), 20),
      showLoading: false,
      mergeIntoExisting: posts.length > 0,
    });
  };

  const handleToggleFollow = async (targetUserId: string, alreadyFollowing: boolean) => {
    if (!user) {
      requireAuth("Sign in to follow students.");
      return;
    }

    await toggleFollow(user.id, targetUserId, alreadyFollowing);
    await refreshPageData();
  };

  return (
    <div className="relative grid min-w-0 gap-4 overflow-x-hidden sm:gap-6 lg:items-start lg:grid-cols-[minmax(0,1fr)_280px] xl:grid-cols-[minmax(0,1fr)_320px] xl:gap-8">
      <div className="w-full min-w-0 space-y-4 pb-[5.5rem] sm:space-y-6 md:pb-0">
        <DiscussionHero activeKind={activeKind} />
        <DiscussionStoryRail entries={mobileStoryEntries} />

        <DiscussionFeed
          loading={loading}
          loadingMore={loadingMore}
          hasMore={hasMorePosts}
          loadMoreRef={loadMoreRef}
          posts={posts}
          emptyKindLabel={activeKind}
          emptyTitle={emptyFeedTitle}
          emptyDescription={emptyFeedDescription}
          currentUserId={user?.id || ""}
          followingIds={followingIds}
          recentProfiles={recentEntries}
          suggestedProfiles={suggestedEntries}
          highlightedPostId={highlightedPostId}
          onToggleLike={async (targetPost, alreadyLiked) => {
            if (!user) {
              requireAuth("Sign in to like posts.");
              return;
            }

            await togglePostLike(targetPost.id, user.id, alreadyLiked);
            await refreshPageData();
          }}
          onVotePoll={async (targetPost, optionIndex) => {
            if (!user) {
              requireAuth("Sign in to vote in polls.");
              return;
            }

            await voteOnPoll(targetPost.id, user.id, optionIndex);
            await refreshPageData();
          }}
          onShare={async (targetPost, alreadyShared) => {
            if (user && !alreadyShared) {
              await recordPostShare(targetPost.id, user.id);
            }

            if (user) {
              await refreshPageData();
            }
          }}
          onAddComment={async (postId, content, parentCommentId) => {
            if (!user) {
              requireAuth("Sign in to comment on posts.");
              return;
            }

            await createComment({ postId, authorId: user.id, content, parentCommentId });
            await refreshPageData();
          }}
          onDeletePost={async (postId) => {
            if (!user) {
              requireAuth("Sign in to manage your posts.");
              return;
            }

            await deletePost(postId);
            toast.success("Post deleted.");
            await refreshPageData();
          }}
          onDeleteComment={async (commentId) => {
            if (!user) {
              requireAuth("Sign in to manage your comments.");
              return;
            }

            await deleteComment(commentId);
            toast.success("Comment deleted.");
            await refreshPageData();
          }}
          onToggleFollow={handleToggleFollow}
        />
      </div>

      <aside className="hidden min-w-0 lg:block lg:self-start">
        <div className="sticky top-[7.25rem] space-y-4 lg:space-y-5 xl:top-[5.25rem]">
          <DiscussionDiscoveryPanel
            title="Recently joined"
            entries={recentEntries.slice(0, 4)}
            currentUserId={user?.id || ""}
            currentFollowingIds={followingIds}
            onToggleFollow={handleToggleFollow}
            kind="recent"
          />
          <DiscussionDiscoveryPanel
            title="Follow suggestions"
            entries={suggestedEntries.slice(0, 4)}
            currentUserId={user?.id || ""}
            currentFollowingIds={followingIds}
            onToggleFollow={handleToggleFollow}
            kind="suggested"
          />
        </div>
      </aside>

      <FloatingPostButton
        to={
          user
            ? `/app/create?destination=discussion&kind=${activeKind}`
            : authRedirectPath
        }
        label="Post"
        desktopLabel="Post something"
      />
    </div>
  );
}
