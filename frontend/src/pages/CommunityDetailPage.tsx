import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import { useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { FloatingPostButton } from "../components/FloatingPostButton";
import { discussionModes } from "../data/discussions";
import { useInfiniteScrollTrigger } from "../hooks/useInfiniteScrollTrigger";
import { useNetworkStatus } from "../hooks/useNetworkStatus";
import {
  createComment,
  deleteComment,
  deletePost,
  joinCommunity,
  leaveCommunity,
  loadCommunityMembershipDetails,
  loadCommunityPostsPage,
  loadFollowingIds,
  loadVisibleCommunities,
  recordPostShare,
  toggleFollow,
  togglePostLike,
  voteOnPoll,
  type CommunityMembershipDetails,
} from "../lib/api";
import { buildAuthRedirectPath } from "../lib/authRedirect";
import { getAbsoluteCommunityUrl } from "../lib/communityLinks";
import { copyTextToClipboard } from "../lib/postLinks";
import { useAuthStore } from "../store/authStore";
import { useThemeStore } from "../store/themeStore";
import { CommunityDetailHeader } from "../features/communities/CommunityDetailHeader";
import { CommunityFeed } from "../features/communities/CommunityFeed";
import { CommunityJoinSheet } from "../features/communities/CommunityJoinSheet";
import { doesCommunityFeedRequireMembership } from "../features/communities/communityFeedVisibility";
import {
  getCommunityContrastColor,
  normalizeCommunityColor,
  withAppThemeAlpha,
  withCommunityAlpha,
} from "../features/communities/communityTheme";
import {
  buildCommunityDirectorySessionKey,
  buildCommunityFeedSessionKey,
  clearCommunityFeedSessionSnapshot,
  getCommunityDirectorySessionSnapshot,
  getCommunityFeedSessionSnapshot,
  isSessionSnapshotStale,
  setCommunityDirectorySessionSnapshot,
  setCommunityFeedSessionSnapshot,
} from "../lib/sessionViewCache";
import type {
  CommunityRow,
  DiscussionKind,
  PostWithRelations,
} from "../types/database";

const INITIAL_COMMUNITY_POSTS = 5;
const COMMUNITY_SCROLL_POSTS = 10;
const COMMUNITY_MODE_ORDER: DiscussionKind[] = ["anonymous", "study", "job"];

type CommunityFeedKindFilter = "all" | DiscussionKind;

function getPreferredCommunityKind(kinds: DiscussionKind[]) {
  return sortCommunityModes(kinds)[0] || "study";
}

function sortCommunityModes(kinds: DiscussionKind[]) {
  return [...kinds].sort((left, right) => {
    const leftIndex = COMMUNITY_MODE_ORDER.indexOf(left);
    const rightIndex = COMMUNITY_MODE_ORDER.indexOf(right);

    return (leftIndex === -1 ? Number.MAX_SAFE_INTEGER : leftIndex) - (rightIndex === -1 ? Number.MAX_SAFE_INTEGER : rightIndex);
  });
}

function getCommunityModeLabel(kind: DiscussionKind) {
  if (kind === "anonymous") {
    return "Anonymous";
  }

  if (kind === "study") {
    return "Study";
  }

  return "Job";
}

function getCommunityComposerButtonLabel(kind: DiscussionKind) {
  if (kind === "anonymous") {
    return "Post Anonymous";
  }

  if (kind === "study") {
    return "Post Study Zone";
  }

  return "Post Job Zone";
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

export function CommunityDetailPage() {
  const { user, isAdmin } = useAuthStore();
  const { resolvedTheme } = useThemeStore();
  const isOnline = useNetworkStatus();
  const navigate = useNavigate();
  const location = useLocation();
  const { communitySlug = "" } = useParams();
  const [searchParams] = useSearchParams();
  const highlightedPostId = searchParams.get("post");
  const directorySessionKey = buildCommunityDirectorySessionKey(user?.id || null);
  const cachedDirectorySnapshot = getCommunityDirectorySessionSnapshot(directorySessionKey);
  const initialCommunityId =
    cachedDirectorySnapshot?.communities.find((community) => community.slug.toLowerCase() === communitySlug.toLowerCase())?.id || null;
  const initialFeedSnapshot = initialCommunityId
    ? getCommunityFeedSessionSnapshot(
        buildCommunityFeedSessionKey({
          communityId: initialCommunityId,
          viewerId: user?.id || null,
        })
      )
    : null;
  const [communities, setCommunities] = useState<CommunityRow[]>(() => cachedDirectorySnapshot?.communities ?? []);
  const [membershipDetailsByCommunityId, setMembershipDetailsByCommunityId] = useState<
    Record<string, CommunityMembershipDetails>
  >(() => cachedDirectorySnapshot?.membershipDetailsByCommunityId ?? {});
  const [memberCommunityIds, setMemberCommunityIds] = useState<Set<string>>(
    () => new Set(cachedDirectorySnapshot?.memberships ?? [])
  );
  const [posts, setPosts] = useState<PostWithRelations[]>(() => initialFeedSnapshot?.posts ?? []);
  const [directoryLoading, setDirectoryLoading] = useState(() => !cachedDirectorySnapshot);
  const [feedLoading, setFeedLoading] = useState(() => !initialFeedSnapshot);
  const [loadingMore, setLoadingMore] = useState(false);
  const [feedOffset, setFeedOffset] = useState(() => initialFeedSnapshot?.feedOffset ?? 0);
  const [hasMorePosts, setHasMorePosts] = useState(() => initialFeedSnapshot?.hasMorePosts ?? true);
  const [joinSheetOpen, setJoinSheetOpen] = useState(false);
  const [membershipBusy, setMembershipBusy] = useState(false);
  const [followingIds, setFollowingIds] = useState<Set<string>>(
    () => new Set(cachedDirectorySnapshot?.followingIds ?? [])
  );
  const [activePostKindFilter, setActivePostKindFilter] = useState<CommunityFeedKindFilter>(
    () => initialFeedSnapshot?.activePostKindFilter ?? "all"
  );
  const wasOfflineRef = useRef(false);
  const directoryStateSessionKeyRef = useRef(directorySessionKey);
  const feedStateSessionKeyRef = useRef<string | null>(
    initialCommunityId
      ? buildCommunityFeedSessionKey({
          communityId: initialCommunityId,
          viewerId: user?.id || null,
        })
      : null
  );
  const directoryFetchedAtRef = useRef(cachedDirectorySnapshot?.lastFetchedAt ?? 0);
  const feedFetchedAtRef = useRef(initialFeedSnapshot?.lastFetchedAt ?? 0);
  const postsRef = useRef(posts);
  const feedOffsetRef = useRef(feedOffset);
  const hasMorePostsRef = useRef(hasMorePosts);
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

  const loadDirectory = useCallback(async (options: { fresh?: boolean; showLoading?: boolean } = {}) => {
    if (options.showLoading ?? true) {
      setDirectoryLoading(true);
    }

    try {
      const [directory, membershipDetails, nextFollowingIds] = await Promise.all([
        loadVisibleCommunities(options),
        user ? loadCommunityMembershipDetails(user.id) : Promise.resolve([] as CommunityMembershipDetails[]),
        user ? loadFollowingIds(user.id) : Promise.resolve(new Set<string>()),
      ]);

      setCommunities(directory);
      setMembershipDetailsByCommunityId(
        Object.fromEntries(membershipDetails.map((entry) => [entry.community_id, entry]))
      );
      setMemberCommunityIds(
        new Set(membershipDetails.filter((entry) => entry.status === "active").map((entry) => entry.community_id))
      );
      setFollowingIds(nextFollowingIds);
      directoryFetchedAtRef.current = Date.now();
    } catch (error) {
      if (isOnline) {
        toast.error(error instanceof Error ? error.message : "Failed to load communities.");
      }
    } finally {
      setDirectoryLoading(false);
    }
  }, [isOnline, user]);

  useEffect(() => {
    const sessionSnapshot = getCommunityDirectorySessionSnapshot(directorySessionKey);

    if (sessionSnapshot) {
      directoryStateSessionKeyRef.current = directorySessionKey;
      setCommunities(sessionSnapshot.communities);
      setMembershipDetailsByCommunityId(sessionSnapshot.membershipDetailsByCommunityId);
      setMemberCommunityIds(new Set(sessionSnapshot.memberships));
      setFollowingIds(new Set(sessionSnapshot.followingIds));
      directoryFetchedAtRef.current = sessionSnapshot.lastFetchedAt;
      setDirectoryLoading(false);

      if (
        isSessionSnapshotStale(sessionSnapshot) ||
        (user && Object.keys(sessionSnapshot.membershipDetailsByCommunityId).length === 0)
      ) {
        void loadDirectory({ fresh: true, showLoading: false });
      }

      return;
    }

    directoryStateSessionKeyRef.current = directorySessionKey;
    directoryFetchedAtRef.current = 0;
    setCommunities([]);
    setMembershipDetailsByCommunityId({});
    setMemberCommunityIds(new Set());
    setFollowingIds(new Set());
    setDirectoryLoading(true);
    void loadDirectory({ showLoading: true });
  }, [directorySessionKey, loadDirectory, user]);

  useEffect(() => {
    if (directoryStateSessionKeyRef.current !== directorySessionKey || directoryFetchedAtRef.current === 0) {
      return;
    }

    const existingDirectorySnapshot = getCommunityDirectorySessionSnapshot(directorySessionKey);

    setCommunityDirectorySessionSnapshot(directorySessionKey, {
      communities,
      membershipDetailsByCommunityId,
      memberships: Array.from(memberCommunityIds),
      hiddenCommunityIds: existingDirectorySnapshot?.hiddenCommunityIds ?? [],
      followingIds: Array.from(followingIds),
      lastFetchedAt: directoryFetchedAtRef.current,
    });
  }, [communities, directorySessionKey, followingIds, memberCommunityIds, membershipDetailsByCommunityId]);

  const activeCommunity =
    communities.find((community) => community.slug.toLowerCase() === communitySlug.toLowerCase()) || null;
  const activeMembership = activeCommunity
    ? membershipDetailsByCommunityId[activeCommunity.id] || (memberCommunityIds.has(activeCommunity.id)
        ? {
            community_id: activeCommunity.id,
            role: "member",
            status: "active",
            requested_at: activeCommunity.created_at,
            accepted_at: activeCommunity.created_at,
            accepted_by: null,
            banned_reason: null,
            joined_via_password_version: 0,
          }
        : null)
    : null;
  const canManageActiveCommunity = Boolean(
    activeCommunity &&
      (isAdmin || (activeMembership?.status === "active" && (activeMembership.role === "owner" || activeMembership.role === "admin")))
  );
  const requiresMembershipForFeed = Boolean(activeCommunity && doesCommunityFeedRequireMembership(activeCommunity));
  const canViewActiveCommunityFeed = Boolean(
    activeCommunity &&
      activeMembership?.status !== "banned" &&
      (isAdmin || activeMembership?.status === "active" || !requiresMembershipForFeed)
  );
  const communityFeedSessionKey = activeCommunity
    ? buildCommunityFeedSessionKey({
        communityId: activeCommunity.id,
        viewerId: user?.id || null,
      })
    : null;

  const loadActiveCommunityFeed = useCallback(
    async (options: { fresh?: boolean; targetCount?: number; showLoading?: boolean; mergeIntoExisting?: boolean } = {}) => {
      if (!activeCommunity || !canViewActiveCommunityFeed) {
        postsRef.current = [];
        feedOffsetRef.current = 0;
        hasMorePostsRef.current = false;
        setPosts([]);
        setFeedOffset(0);
        setHasMorePosts(false);
        setFeedLoading(false);
        return;
      }

      const shouldShowFeedLoading = options.showLoading ?? false;
      const shouldShowBlockingLoader = shouldShowFeedLoading && postsRef.current.length === 0;

      if (shouldShowBlockingLoader) {
        setFeedLoading(true);
      }

      try {
        const feed = await loadCommunityPostsPage(activeCommunity.id, {
          fresh: options.fresh,
          limit: options.targetCount || INITIAL_COMMUNITY_POSTS,
          offset: 0,
        });
        const shouldMerge = (options.mergeIntoExisting ?? false) && postsRef.current.length > 0;
        const nextPosts = shouldMerge ? mergeUniquePosts(postsRef.current, feed.items) : feed.items;
        const nextFeedOffset = shouldMerge ? Math.max(feedOffsetRef.current, feed.nextOffset) : feed.nextOffset;
        const nextHasMore = shouldMerge ? hasMorePostsRef.current || feed.hasMore : feed.hasMore;

        postsRef.current = nextPosts;
        feedOffsetRef.current = nextFeedOffset;
        hasMorePostsRef.current = nextHasMore;
        feedFetchedAtRef.current = Date.now();

        setPosts(nextPosts);
        setFeedOffset(nextFeedOffset);
        setHasMorePosts(nextHasMore);
      } catch (error) {
        if (isOnline) {
          toast.error(error instanceof Error ? error.message : "Failed to load the community feed.");
        }
      } finally {
        if (shouldShowBlockingLoader) {
          setFeedLoading(false);
        }
      }
    },
    [activeCommunity, canViewActiveCommunityFeed, isOnline]
  );

  const loadMorePosts = useCallback(async () => {
    if (!isOnline || !activeCommunity || !canViewActiveCommunityFeed || feedLoading || loadingMore || !hasMorePosts) {
      return;
    }

    setLoadingMore(true);

    try {
      const feed = await loadCommunityPostsPage(activeCommunity.id, {
        limit: COMMUNITY_SCROLL_POSTS,
        offset: feedOffset,
      });
      const nextPosts = mergeUniquePosts(postsRef.current, feed.items);
      postsRef.current = nextPosts;
      feedOffsetRef.current = feed.nextOffset;
      hasMorePostsRef.current = feed.hasMore;
      feedFetchedAtRef.current = Date.now();
      setPosts(nextPosts);
      setFeedOffset(feed.nextOffset);
      setHasMorePosts(feed.hasMore);
    } catch (error) {
      if (isOnline) {
        toast.error(error instanceof Error ? error.message : "Could not load more posts.");
      }
    } finally {
      setLoadingMore(false);
    }
  }, [activeCommunity, canViewActiveCommunityFeed, feedLoading, feedOffset, hasMorePosts, isOnline, loadingMore]);

  const loadMoreRef = useInfiniteScrollTrigger({
    enabled: Boolean(activeCommunity) && canViewActiveCommunityFeed && isOnline,
    hasMore: hasMorePosts,
    loading: feedLoading || loadingMore,
    onLoadMore: loadMorePosts,
  });

  useEffect(() => {
    if (!communityFeedSessionKey) {
      feedStateSessionKeyRef.current = null;
      postsRef.current = [];
      feedOffsetRef.current = 0;
      hasMorePostsRef.current = true;
      feedFetchedAtRef.current = 0;
      setPosts([]);
      setFeedOffset(0);
      setHasMorePosts(true);
      setActivePostKindFilter("all");
      setFeedLoading(true);
      return;
    }

    if (!canViewActiveCommunityFeed) {
      feedStateSessionKeyRef.current = communityFeedSessionKey;
      clearCommunityFeedSessionSnapshot(communityFeedSessionKey);
      postsRef.current = [];
      feedOffsetRef.current = 0;
      hasMorePostsRef.current = false;
      feedFetchedAtRef.current = 0;
      setPosts([]);
      setFeedOffset(0);
      setHasMorePosts(false);
      setFeedLoading(false);
      setActivePostKindFilter("all");
      return;
    }

    const sessionSnapshot = getCommunityFeedSessionSnapshot(communityFeedSessionKey);

    if (sessionSnapshot) {
      feedStateSessionKeyRef.current = communityFeedSessionKey;
      postsRef.current = sessionSnapshot.posts;
      feedOffsetRef.current = sessionSnapshot.feedOffset;
      hasMorePostsRef.current = sessionSnapshot.hasMorePosts;
      feedFetchedAtRef.current = sessionSnapshot.lastFetchedAt;
      setPosts(sessionSnapshot.posts);
      setFeedOffset(sessionSnapshot.feedOffset);
      setHasMorePosts(sessionSnapshot.hasMorePosts);
      setActivePostKindFilter(sessionSnapshot.activePostKindFilter);
      setFeedLoading(false);
      setLoadingMore(false);

      if (isOnline && isSessionSnapshotStale(sessionSnapshot)) {
        void loadActiveCommunityFeed({
          fresh: true,
          targetCount: Math.min(Math.max(sessionSnapshot.posts.length, INITIAL_COMMUNITY_POSTS), 20),
          showLoading: false,
          mergeIntoExisting: true,
        });
      }

      return;
    }

    feedStateSessionKeyRef.current = communityFeedSessionKey;
    postsRef.current = [];
    feedOffsetRef.current = 0;
    hasMorePostsRef.current = true;
    feedFetchedAtRef.current = 0;
    setPosts([]);
    setFeedOffset(0);
    setHasMorePosts(true);
    setActivePostKindFilter("all");
    setFeedLoading(true);
    setLoadingMore(false);
    void loadActiveCommunityFeed({ showLoading: true, targetCount: INITIAL_COMMUNITY_POSTS });
  }, [canViewActiveCommunityFeed, communityFeedSessionKey, isOnline, loadActiveCommunityFeed, communitySlug]);

  useEffect(() => {
    if (
      !communityFeedSessionKey ||
      !canViewActiveCommunityFeed ||
      feedStateSessionKeyRef.current !== communityFeedSessionKey ||
      feedFetchedAtRef.current === 0
    ) {
      return;
    }

    setCommunityFeedSessionSnapshot(communityFeedSessionKey, {
      posts,
      feedOffset,
      hasMorePosts,
      activePostKindFilter,
      lastFetchedAt: feedFetchedAtRef.current,
    });
  }, [activePostKindFilter, canViewActiveCommunityFeed, communityFeedSessionKey, feedOffset, hasMorePosts, posts]);

  useEffect(() => {
    if (
      activeCommunity &&
      (activePostKindFilter === "all" || !activeCommunity.posting_modes.includes(activePostKindFilter))
    ) {
      setActivePostKindFilter(getPreferredCommunityKind(activeCommunity.posting_modes));
    }
  }, [activeCommunity, activePostKindFilter]);

  useEffect(() => {
    if (!directoryLoading && communities.length > 0 && !activeCommunity) {
      toast.error("That community could not be found.");
      navigate("/app/communities", { replace: true });
    }
  }, [activeCommunity, communities.length, directoryLoading, navigate]);

  useEffect(() => {
    if (!highlightedPostId || feedLoading) {
      return;
    }

    const frame = window.requestAnimationFrame(() => {
      const element = document.getElementById(`post-${highlightedPostId}`);
      element?.scrollIntoView({ behavior: "smooth", block: "center" });
    });

    return () => window.cancelAnimationFrame(frame);
  }, [feedLoading, highlightedPostId, posts]);

  useEffect(() => {
    if (
      !isOnline ||
      !highlightedPostId ||
      feedLoading ||
      loadingMore ||
      !hasMorePosts ||
      posts.some((post) => post.id === highlightedPostId)
    ) {
      return;
    }

    void loadMorePosts();
  }, [feedLoading, hasMorePosts, highlightedPostId, isOnline, loadMorePosts, loadingMore, posts]);

  useEffect(() => {
    if (!isOnline) {
      wasOfflineRef.current = true;
      return;
    }

    if (!wasOfflineRef.current) {
      return;
    }

    wasOfflineRef.current = false;
    void loadDirectory({ fresh: true, showLoading: communities.length === 0 });
    void loadActiveCommunityFeed({
      fresh: true,
      targetCount: Math.min(Math.max(posts.length, INITIAL_COMMUNITY_POSTS), 20),
      showLoading: posts.length === 0,
      mergeIntoExisting: posts.length > 0,
    });
  }, [communities.length, isOnline, loadActiveCommunityFeed, loadDirectory, posts.length]);

  const refreshActiveCommunityFeed = useCallback(async () => {
    await loadActiveCommunityFeed({
      fresh: true,
      targetCount: Math.min(Math.max(posts.length, INITIAL_COMMUNITY_POSTS), 20),
      showLoading: false,
      mergeIntoExisting: posts.length > 0,
    });
  }, [loadActiveCommunityFeed, posts.length]);

  const handleJoinAttempt = useCallback(
    async (password?: string) => {
      if (!activeCommunity) {
        return;
      }

      setMembershipBusy(true);

      try {
        const result = await joinCommunity(activeCommunity.id, password);
        if (result?.member_status === "pending") {
          toast.success("Join request sent. A community admin needs to approve it.");
        } else {
          toast.success("You joined the community.");
        }
        setJoinSheetOpen(false);
        await loadDirectory({ fresh: true });
        await refreshActiveCommunityFeed();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Could not join this community.");
      } finally {
        setMembershipBusy(false);
      }
    },
    [activeCommunity, loadDirectory, refreshActiveCommunityFeed]
  );

  const handlePrimaryMembershipAction = useCallback(async () => {
    if (!activeCommunity) {
      return;
    }

    if (!user) {
      requireAuth("Sign in to join communities.");
      return;
    }

    if (activeMembership?.status === "banned") {
      toast.error("You are banned from this community.");
      return;
    }

    if (activeMembership?.status === "active" || activeMembership?.status === "pending") {
      setMembershipBusy(true);
      try {
        const result = await leaveCommunity(activeCommunity.id);
        toast.success(result === "request_cancelled" ? "Join request cancelled." : "You left the community.");
        await loadDirectory({ fresh: true });
        await refreshActiveCommunityFeed();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Could not update your membership.");
      } finally {
        setMembershipBusy(false);
      }
      return;
    }

    if (activeCommunity.requires_password) {
      setJoinSheetOpen(true);
      return;
    }

    await handleJoinAttempt();
  }, [activeCommunity, activeMembership?.status, handleJoinAttempt, loadDirectory, refreshActiveCommunityFeed, requireAuth, user]);

  const handleLeaveCommunity = useCallback(async () => {
    if (!activeCommunity || !user) {
      return;
    }

    setMembershipBusy(true);
    try {
      const result = await leaveCommunity(activeCommunity.id);
      toast.success(result === "request_cancelled" ? "Join request cancelled." : "You left the community.");
      await loadDirectory({ fresh: true });
      await refreshActiveCommunityFeed();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update your membership.");
    } finally {
      setMembershipBusy(false);
    }
  }, [activeCommunity, loadDirectory, refreshActiveCommunityFeed, user]);

  const handleCopyCommunityLink = useCallback(async () => {
    if (!activeCommunity) {
      return;
    }

    await copyTextToClipboard(getAbsoluteCommunityUrl(activeCommunity));
    toast.success("Community link copied.");
  }, [activeCommunity]);

  const handleShareCommunity = useCallback(async () => {
    if (!activeCommunity) {
      return;
    }

    const url = getAbsoluteCommunityUrl(activeCommunity);

    if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
      try {
        await navigator.share({
          title: activeCommunity.name,
          text: `Join ${activeCommunity.name} on Student Society.`,
          url,
        });
        return;
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }
      }
    }

    await copyTextToClipboard(url);
    toast.success("Community link copied.");
  }, [activeCommunity]);

  const handleToggleFollow = useCallback(
    async (targetUserId: string, alreadyFollowing: boolean) => {
      if (!user) {
        requireAuth("Sign in to follow students.");
        return;
      }

      await toggleFollow(user.id, targetUserId, alreadyFollowing);
      setFollowingIds((current) => {
        const next = new Set(current);

        if (alreadyFollowing) {
          next.delete(targetUserId);
        } else {
          next.add(targetUserId);
        }

        return next;
      });
    },
    [requireAuth, user]
  );

  const primaryMembershipLabel =
    activeMembership?.status === "active"
      ? "Leave community"
      : activeMembership?.status === "pending"
        ? "Cancel request"
        : activeMembership?.status === "banned"
          ? "Access blocked"
          : activeCommunity?.join_policy === "approval_required"
            ? "Request access"
            : "Join community";

  const availablePostModes = useMemo(
    () =>
      sortCommunityModes(
        activeCommunity?.posting_modes && activeCommunity.posting_modes.length > 0
          ? activeCommunity.posting_modes
          : discussionModes
      ),
    [activeCommunity?.posting_modes]
  );
  const filteredPosts = useMemo(() => {
    return posts.filter((post) => activePostKindFilter === "all" || post.discussion_kind === activePostKindFilter);
  }, [activePostKindFilter, posts]);
  const composerKind =
    activePostKindFilter === "all" ? getPreferredCommunityKind(availablePostModes) : activePostKindFilter;
  const selectedCommunityMode = activePostKindFilter === "all" ? composerKind : activePostKindFilter;
  const canShowMembershipCta = activeMembership?.status !== "active" && activeMembership?.status !== "banned";
  const communityAccent = useMemo(
    () => normalizeCommunityColor(activeCommunity?.hero_color),
    [activeCommunity?.hero_color]
  );
  const communityAccentText = useMemo(() => getCommunityContrastColor(communityAccent), [communityAccent]);
  const communityComposerLink = useMemo(() => {
    if (!activeCommunity) {
      return undefined;
    }

    const params = new URLSearchParams({
      destination: "community",
      community: activeCommunity.slug,
      kind: composerKind,
    });

    return `/app/create?${params.toString()}`;
  }, [activeCommunity, composerKind]);
  const composerButtonSurface =
    resolvedTheme === "dark" ? "rgba(7,12,24,0.96)" : "rgba(255,255,255,0.96)";
  const composerButtonBorder =
    resolvedTheme === "dark" ? withCommunityAlpha(communityAccent, 0.3) : withCommunityAlpha(communityAccent, 0.22);

  if (!activeCommunity) {
    return (
      <div className="space-y-4 sm:space-y-5">
        <section className="native-card rounded-[28px] p-8 text-center sm:p-10">
          <p className="font-display text-2xl font-bold tracking-tight text-app-text">
            {directoryLoading ? "Loading community..." : "Community not found"}
          </p>
          <p className="mt-2 text-sm leading-6 text-app-muted">
            {directoryLoading
              ? "Pulling the latest community details for this page."
              : "Go back to the community directory and open another group."}
          </p>
          {!directoryLoading ? (
            <button
              type="button"
              onClick={() => navigate("/app/communities")}
              className="btn-primary mt-5 !rounded-full !px-5 !py-3 text-sm font-semibold"
            >
              Back to communities
            </button>
          ) : null}
        </section>
      </div>
    );
  }

  return (
    <div className="relative mx-auto w-full max-w-3xl">
      <div
        className="pointer-events-none absolute inset-x-7 top-14 h-36 rounded-[34px] blur-3xl"
        style={{
          backgroundImage: `radial-gradient(circle at center, ${withCommunityAlpha(communityAccent, 0.18)}, ${withCommunityAlpha(
            communityAccent,
            0.08
          )} 55%, transparent 74%)`,
        }}
      />
      <div className="relative space-y-3.5 pb-[5.5rem]">
        <CommunityDetailHeader
          community={activeCommunity}
          memberCount={activeCommunity.member_count || 0}
          membershipStatus={activeMembership?.status || "none"}
          onShare={handleShareCommunity}
          onCopyLink={handleCopyCommunityLink}
          onManage={
            canManageActiveCommunity ? () => navigate(`/app/communities/${activeCommunity.slug}/manage`) : undefined
          }
          onMembershipAction={handlePrimaryMembershipAction}
          onLeave={handleLeaveCommunity}
          membershipActionLabel={primaryMembershipLabel}
          membershipBusy={membershipBusy}
        />

        <section className="rounded-[24px] border border-app-border bg-app-card p-1.5 shadow-[0_20px_42px_-34px_rgba(15,23,42,0.18)] dark:bg-app-secondary/55">
          <div className="flex gap-1.5 rounded-[20px] border border-app-border bg-app px-1.5 py-1.5 dark:bg-app-card">
            {availablePostModes.map((mode) => {
              const selected = selectedCommunityMode === mode;

              return (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setActivePostKindFilter(mode)}
                  className={`flex min-h-[2.65rem] min-w-0 flex-1 items-center justify-center rounded-[16px] border px-2 py-2 text-center text-[0.88rem] font-semibold transition ${
                    selected
                      ? "text-white shadow-[0_18px_36px_-18px_rgba(15,23,42,0.38)]"
                      : "border-transparent bg-transparent text-app-text"
                  }`}
                  style={
                    selected
                      ? {
                          backgroundColor: communityAccent,
                          borderColor: withCommunityAlpha(communityAccent, 0.26),
                          color: communityAccentText,
                          boxShadow: `0 18px 36px -18px ${withCommunityAlpha(communityAccent, 0.62)}`,
                        }
                      : undefined
                  }
                >
                  {getCommunityModeLabel(mode)}
                </button>
              );
            })}
          </div>
        </section>

        {canViewActiveCommunityFeed ? (
          <CommunityFeed
            title=""
            loading={directoryLoading || feedLoading}
            loadingMore={loadingMore}
            hasMore={hasMorePosts}
            loadMoreRef={loadMoreRef}
            posts={filteredPosts}
            emptyCommunityName={activeCommunity.name}
            compactEmptyState
            accentColor={communityAccent}
            emptyTitle={
              activePostKindFilter !== "all"
                ? `No ${getCommunityModeLabel(activePostKindFilter)} posts yet.`
                : !isOnline
                  ? "You're offline."
                  : undefined
            }
            emptyDescription={
              activePostKindFilter !== "all"
                ? `Start the first ${getCommunityModeLabel(activePostKindFilter).toLowerCase()} post in ${activeCommunity.name}.`
                : !isOnline
                  ? "Community posts need internet before they can load here."
                  : undefined
            }
            currentUserId={user?.id || ""}
            followingIds={followingIds}
            highlightedPostId={highlightedPostId}
            onToggleLike={async (targetPost, alreadyLiked) => {
              if (!user) {
                requireAuth("Sign in to like posts.");
                return;
              }

              await togglePostLike(targetPost.id, user.id, alreadyLiked);
              await refreshActiveCommunityFeed();
            }}
            onVotePoll={async (targetPost, optionIndex) => {
              if (!user) {
                requireAuth("Sign in to vote in polls.");
                return;
              }

              await voteOnPoll(targetPost.id, user.id, optionIndex);
              await refreshActiveCommunityFeed();
            }}
            onShare={async (targetPost, alreadyShared) => {
              if (user && !alreadyShared) {
                await recordPostShare(targetPost.id, user.id);
              }

              if (user) {
                await refreshActiveCommunityFeed();
              }
            }}
            onAddComment={async (postId, content, parentCommentId) => {
              if (!user) {
                requireAuth("Sign in to comment on posts.");
                return;
              }

              await createComment({ postId, authorId: user.id, content, parentCommentId });
              await refreshActiveCommunityFeed();
            }}
            onDeletePost={async (postId) => {
              if (!user) {
                requireAuth("Sign in to manage your posts.");
                return;
              }

              await deletePost(postId);
              toast.success("Post deleted.");
              await refreshActiveCommunityFeed();
            }}
            onDeleteComment={async (commentId) => {
              if (!user) {
                requireAuth("Sign in to manage your comments.");
                return;
              }

              await deleteComment(commentId);
              toast.success("Comment deleted.");
              await refreshActiveCommunityFeed();
            }}
            onToggleFollow={handleToggleFollow}
          />
        ) : (
          <section
            className="rounded-[30px] border px-6 py-10 text-center shadow-[0_22px_44px_-34px_rgba(15,23,42,0.3)] backdrop-blur-xl"
            style={{
              borderColor: withCommunityAlpha(communityAccent, 0.16),
              backgroundImage: `linear-gradient(180deg, ${withAppThemeAlpha("app-card", 0.96)}, ${withCommunityAlpha(
                communityAccent,
                0.08
              )})`,
            }}
          >
            <p className="font-display text-[1.75rem] font-semibold tracking-tight text-app-text">
              {activeMembership?.status === "banned"
                ? "You cannot access this community."
                : activeMembership?.status === "pending"
                  ? "Your join request is pending."
                  : "Join this community to unlock the feed."}
            </p>
            <p className="mx-auto mt-3 max-w-[22rem] text-[1rem] leading-7 text-app-muted">
              {activeMembership?.status === "banned"
                ? "A community admin blocked your access, so the feed stays locked here."
                : activeMembership?.status === "pending"
                  ? "A community admin needs to approve your request before posts become visible."
                  : activeCommunity.feed_visibility === "members_only"
                    ? activeCommunity.join_policy === "approval_required"
                      ? "This community is members only. Request access first, then the feed will open after approval."
                      : activeCommunity.requires_password
                        ? "This community is members only. Join with the password first to open the feed."
                        : "This community is members only. Join first to start reading posts."
                    : activeCommunity.requires_password
                      ? "This community is password protected, so only active members can view its posts."
                      : "This community uses manual approval, so only active members can view its posts."}
            </p>

            {canShowMembershipCta ? (
              <button
                type="button"
                onClick={() => void handlePrimaryMembershipAction()}
                disabled={membershipBusy || activeMembership?.status === "banned"}
                className="mt-6 inline-flex h-12 items-center justify-center rounded-full px-6 text-sm font-semibold text-white shadow-[0_18px_36px_-18px_rgba(15,23,42,0.38)] transition hover:translate-y-[-1px] disabled:cursor-not-allowed disabled:opacity-60"
                style={{
                  backgroundColor: communityAccent,
                  color: communityAccentText,
                  boxShadow: `0 18px 36px -18px ${withCommunityAlpha(communityAccent, 0.62)}`,
                }}
              >
                {membershipBusy ? "Working..." : primaryMembershipLabel}
              </button>
            ) : null}
          </section>
        )}
      </div>

      {activeCommunity && activeMembership?.status === "active" ? (
        <FloatingPostButton
          to={communityComposerLink}
          ariaLabel={
            activePostKindFilter === "all"
              ? "Create a post in this community"
              : `Create a ${getCommunityModeLabel(activePostKindFilter)} post in this community`
          }
          label={
            activePostKindFilter === "all"
              ? getCommunityComposerButtonLabel(composerKind)
              : getCommunityComposerButtonLabel(activePostKindFilter)
          }
          desktopLabel={
            activePostKindFilter === "all"
              ? getCommunityComposerButtonLabel(composerKind)
              : getCommunityComposerButtonLabel(activePostKindFilter)
          }
          className="!bottom-[calc(env(safe-area-inset-bottom,0px)+5.35rem)] !text-[0.86rem] md:!bottom-8 md:!right-8"
          style={{
            backgroundColor: composerButtonSurface,
            borderColor: composerButtonBorder,
            color: communityAccent,
            boxShadow: `0 24px 42px -22px ${withCommunityAlpha(communityAccent, 0.28)}`,
          }}
        />
      ) : null}

      <CommunityJoinSheet
        open={joinSheetOpen}
        community={activeCommunity}
        onClose={() => setJoinSheetOpen(false)}
        onSubmit={handleJoinAttempt}
      />
    </div>
  );
}
