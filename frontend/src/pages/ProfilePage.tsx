import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import { Navigate, useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { VerifiedBadge } from "../components/VerifiedBadge";
import { ProfileActivityTabs, type ProfileView } from "../features/profile/ProfileActivityTabs";
import { ProfileEditForm, type ProfileFormState } from "../features/profile/ProfileEditForm";
import { ProfileHero } from "../features/profile/ProfileHero";
import { AuthPanel } from "../features/auth/AuthPanel";
import { useAuthFlow } from "../features/auth/useAuthFlow";
import { useInfiniteScrollTrigger } from "../hooks/useInfiniteScrollTrigger";
import {
  createComment,
  deleteComment,
  deletePost,
  loadFollowersPage,
  loadFollowingIds,
  loadFollowingPage,
  loadProfileActivitySummary,
  loadProfileByUsername,
  loadUserCommentsPage,
  loadUserPostsPage,
  recordProfileView,
  recordPostShare,
  toggleFollow,
  togglePostLike,
  uploadManagedMedia,
  voteOnPoll,
} from "../lib/api";
import { buildAuthRedirectPath } from "../lib/authRedirect";
import { buildAvatarSeed, resolveAvatarUrl } from "../lib/avatar";
import { resolveBannerUrl } from "../lib/banner";
import {
  buildProfileSessionKey,
  clearProfileSessionSnapshot,
  createEmptyActivityState,
  getProfileSessionSnapshot,
  isSessionSnapshotStale,
  setProfileSessionSnapshot,
  type ActivityState,
  type VisibleProfileStats,
  type ViewerRelationshipState,
} from "../lib/sessionViewCache";
import { coerceSocialLinks, normalizeSocialLinksInput } from "../lib/socialLinks";
import { isSupabaseConfigured } from "../lib/supabase";
import { validateUsername } from "../lib/usernames";
import { useAuthStore } from "../store/authStore";
import type {
  CommentWithAuthor,
  DiscussionKind,
  PostWithRelations,
  ProfileRow,
} from "../types/database";

const INITIAL_PROFILE_ITEMS = 10;
const PROFILE_SCROLL_ITEMS = 10;

function mergeUniqueById<T extends { id: string }>(current: T[], incoming: T[]) {
  const seen = new Set<string>();
  const merged: T[] = [];

  [...current, ...incoming].forEach((entry) => {
    if (seen.has(entry.id)) {
      const existingIndex = merged.findIndex((currentEntry) => currentEntry.id === entry.id);
      if (existingIndex >= 0) {
        merged[existingIndex] = entry;
      }
      return;
    }

    seen.add(entry.id);
    merged.push(entry);
  });

  return merged;
}

function toFormState(profile: ProfileRow): ProfileFormState {
  const socialLinks = coerceSocialLinks(profile.social_links);

  return {
    username: profile.username,
    full_name: profile.full_name || "",
    headline: profile.headline || "",
    bio: profile.bio || "",
    campus: profile.campus || "",
    course: profile.course || "",
    year_of_study: profile.year_of_study || "",
    skills: profile.skills.join(", "),
    instagram: socialLinks.instagram || "",
    linkedin: socialLinks.linkedin || "",
    email: socialLinks.email || "",
    mobile_number: socialLinks.mobile_number || "",
    whatsapp: socialLinks.whatsapp || "",
    youtube: socialLinks.youtube || "",
    telegram: socialLinks.telegram || "",
    website: socialLinks.website || "",
    other_links: (socialLinks.other_links || []).join("\n"),
    avatar_url: profile.avatar_url || "",
    banner_url: profile.banner_url || "",
    profile_visibility: profile.profile_visibility || "everyone",
    chat_request_policy: profile.chat_request_policy || "everyone",
    show_profile_stats: profile.show_profile_stats ?? true,
    show_study_activity: profile.show_study_activity ?? true,
    show_job_activity: profile.show_job_activity ?? true,
    enable_chat_request_notifications: profile.enable_chat_request_notifications ?? true,
    enable_message_notifications: profile.enable_message_notifications ?? true,
  };
}

function canViewProfileContent(input: {
  isOwnProfile: boolean;
  visibility: ProfileRow["profile_visibility"] | null | undefined;
  viewerIsFollower: boolean;
  viewerIsFollowing: boolean;
}) {
  if (input.isOwnProfile) {
    return true;
  }

  const visibility = input.visibility || "everyone";

  if (visibility === "everyone") return true;
  if (visibility === "followers") return input.viewerIsFollower;
  if (visibility === "followers_and_following") {
    return input.viewerIsFollower || input.viewerIsFollowing;
  }
  if (visibility === "following") return input.viewerIsFollowing;
  return false;
}

function canSendChatRequestByPolicy(input: {
  isOwnProfile: boolean;
  policy: ProfileRow["chat_request_policy"] | null | undefined;
  viewerIsFollower: boolean;
  viewerIsFollowing: boolean;
}) {
  if (input.isOwnProfile) {
    return false;
  }

  const policy = input.policy || "everyone";

  if (policy === "everyone") return true;
  if (policy === "followers") return input.viewerIsFollower;
  if (policy === "followers_and_following") {
    return input.viewerIsFollower || input.viewerIsFollowing;
  }
  if (policy === "following") return input.viewerIsFollowing;
  return false;
}

function resolveAllowedKinds(input: {
  isOwnProfile: boolean;
  viewedProfile: ProfileRow;
}): DiscussionKind[] {
  if (input.isOwnProfile) {
    return ["study", "job"];
  }

  const kinds: DiscussionKind[] = [];

  if (input.viewedProfile.show_study_activity !== false) {
    kinds.push("study");
  }

  if (input.viewedProfile.show_job_activity !== false) {
    kinds.push("job");
  }

  return kinds;
}

function isProfileView(value: string | null): value is ProfileView {
  return value === "posts" || value === "comments" || value === "followers" || value === "following";
}

export function ProfilePage() {
  const { username } = useParams();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, profile, updateProfile, refreshProfile } = useAuthStore();
  const authRedirectPath = buildAuthRedirectPath(location);
  const pathSegments = location.pathname.split("/").filter(Boolean);
  const isEditRoute = pathSegments.length === 3 && pathSegments[0] === "profile" && pathSegments[2] === "edit";
  const isGuestProfileHome = !username && !profile;
  const guestAuthFlow = useAuthFlow({
    initialReferralCode: searchParams.get("ref") || searchParams.get("referral") || "",
  });
  const requireAuth = useCallback(
    (message: string) => {
      toast(message);
      navigate(authRedirectPath);
    },
    [authRedirectPath, navigate]
  );
  const isOwnProfile = !username || username.toLowerCase() === profile?.username?.toLowerCase();
  const profileSessionKey = useMemo(() => {
    if (isGuestProfileHome) {
      return null;
    }

    return buildProfileSessionKey({
      username: isOwnProfile ? "__self__" : username || null,
      viewerId: user?.id || null,
      ownProfileId: isOwnProfile ? profile?.id || user?.id || null : null,
    });
  }, [isGuestProfileHome, isOwnProfile, profile?.id, user?.id, username]);
  const cachedProfileSnapshot = useMemo(
    () => (profileSessionKey ? getProfileSessionSnapshot(profileSessionKey) : null),
    [profileSessionKey]
  );

  const [viewedProfile, setViewedProfile] = useState<ProfileRow | null>(() =>
    cachedProfileSnapshot?.viewedProfile ?? (isOwnProfile ? profile || null : null)
  );
  const [profileStats, setProfileStats] = useState<VisibleProfileStats | null>(
    () => cachedProfileSnapshot?.profileStats ?? null
  );
  const [statsLoading, setStatsLoading] = useState(
    () => !cachedProfileSnapshot && Boolean(isOwnProfile && profile)
  );
  const [viewerRelationship, setViewerRelationship] = useState<ViewerRelationshipState>(
    () =>
      cachedProfileSnapshot?.viewerRelationship ?? {
        viewerIsFollower: false,
        viewerIsFollowing: false,
      }
  );
  const [currentFollowingIds, setCurrentFollowingIds] = useState<Set<string>>(
    () => new Set(cachedProfileSnapshot?.currentFollowingIds ?? [])
  );
  const [profileContentVisible, setProfileContentVisible] = useState(
    () => cachedProfileSnapshot?.profileContentVisible ?? (isOwnProfile || isGuestProfileHome)
  );
  const [loading, setLoading] = useState(
    () => !cachedProfileSnapshot && !isGuestProfileHome && !(isOwnProfile && profile)
  );
  const [activeView, setActiveView] = useState<ProfileView>(
    isProfileView(searchParams.get("view")) ? searchParams.get("view")! : "posts"
  );
  const [formState, setFormState] = useState<ProfileFormState | null>(() =>
    cachedProfileSnapshot?.formState ?? (isOwnProfile && profile ? toFormState(profile) : null)
  );
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [postState, setPostState] = useState<ActivityState<PostWithRelations>>(
    () => cachedProfileSnapshot?.postState ?? createEmptyActivityState<PostWithRelations>()
  );
  const [commentState, setCommentState] = useState<ActivityState<CommentWithAuthor>>(
    () => cachedProfileSnapshot?.commentState ?? createEmptyActivityState<CommentWithAuthor>()
  );
  const [followersState, setFollowersState] = useState<ActivityState<ProfileRow>>(
    () => cachedProfileSnapshot?.followersState ?? createEmptyActivityState<ProfileRow>()
  );
  const [followingState, setFollowingState] = useState<ActivityState<ProfileRow>>(
    () => cachedProfileSnapshot?.followingState ?? createEmptyActivityState<ProfileRow>()
  );
  const viewParam = searchParams.get("view");
  const loadRequestIdRef = useRef(0);
  const stateSessionKeyRef = useRef(profileSessionKey);
  const profileRef = useRef(profile);
  const userRef = useRef(user);
  const viewedProfileRef = useRef<ProfileRow | null>(viewedProfile);
  const lastFetchedAtRef = useRef(cachedProfileSnapshot?.lastFetchedAt ?? 0);
  const allowedKinds = useMemo(
    () => (viewedProfile ? resolveAllowedKinds({ isOwnProfile, viewedProfile }) : []),
    [isOwnProfile, viewedProfile]
  );

  const resetActivityStates = useCallback(() => {
    setPostState(createEmptyActivityState<PostWithRelations>());
    setCommentState(createEmptyActivityState<CommentWithAuthor>());
    setFollowersState(createEmptyActivityState<ProfileRow>());
    setFollowingState(createEmptyActivityState<ProfileRow>());
  }, []);

  useEffect(() => {
    profileRef.current = profile;
  }, [profile]);

  useEffect(() => {
    userRef.current = user;
  }, [user]);

  useEffect(() => {
    viewedProfileRef.current = viewedProfile;
  }, [viewedProfile]);

  useEffect(() => {
    if (!isOwnProfile || !profile) {
      return;
    }

    viewedProfileRef.current = profile;
    setViewedProfile(profile);
    setFormState(toFormState(profile));
    setProfileContentVisible(true);
    setLoading(false);
  }, [isOwnProfile, profile]);

  const loadProfileBundle = useCallback(
    async (options: { resetActivities?: boolean; showLoading?: boolean } = {}) => {
      const requestId = loadRequestIdRef.current + 1;
      loadRequestIdRef.current = requestId;
      const currentProfile = profileRef.current;
      const currentUser = userRef.current;
      const currentViewedProfile = viewedProfileRef.current;

      if (!username && !currentProfile) {
        stateSessionKeyRef.current = profileSessionKey;
        lastFetchedAtRef.current = 0;
        viewedProfileRef.current = null;
        setViewedProfile(null);
        setProfileStats(null);
        setStatsLoading(false);
        setViewerRelationship({
          viewerIsFollower: false,
          viewerIsFollowing: false,
        });
        setCurrentFollowingIds(new Set());
        setProfileContentVisible(true);
        setFormState(null);
        resetActivityStates();
        if (profileSessionKey) {
          clearProfileSessionSnapshot(profileSessionKey);
        }
        setLoading(false);
        return;
      }

      const shouldShowLoading = options.showLoading ?? false;
      const shouldShowBlockingLoader = shouldShowLoading && !currentViewedProfile;
      if (shouldShowBlockingLoader) {
        setLoading(true);
      }

      try {
        const targetProfile = isOwnProfile
          ? currentProfile || null
          : username
            ? await loadProfileByUsername(username)
            : currentProfile || null;

        if (!targetProfile) {
          stateSessionKeyRef.current = profileSessionKey;
          lastFetchedAtRef.current = 0;
          viewedProfileRef.current = null;
          setViewedProfile(null);
          setProfileStats(null);
          setStatsLoading(false);
          setViewerRelationship({
            viewerIsFollower: false,
            viewerIsFollowing: false,
          });
          setProfileContentVisible(false);
          setFormState(null);
          resetActivityStates();
          if (profileSessionKey) {
            clearProfileSessionSnapshot(profileSessionKey);
          }
          return;
        }

        if (loadRequestIdRef.current !== requestId) {
          return;
        }

        const isSameProfile = currentViewedProfile?.id === targetProfile.id;

        viewedProfileRef.current = targetProfile;
        setViewedProfile(targetProfile);
        setFormState(toFormState(targetProfile));
        setStatsLoading(true);
        if (!isSameProfile) {
          setProfileStats(null);
          setViewerRelationship({
            viewerIsFollower: false,
            viewerIsFollowing: false,
          });
          setCurrentFollowingIds(new Set());
          setProfileContentVisible(isOwnProfile);
        }

        if ((options.resetActivities ?? true) && !isSameProfile) {
          resetActivityStates();
        }

        if (shouldShowBlockingLoader) {
          setLoading(false);
        }

        const nextAllowedKinds = resolveAllowedKinds({ isOwnProfile, viewedProfile: targetProfile });
        const [summary, nextFollowingIds] = await Promise.all([
          loadProfileActivitySummary(targetProfile.id, currentUser?.id, { allowedKinds: nextAllowedKinds }),
          currentUser ? loadFollowingIds(currentUser.id) : Promise.resolve(new Set<string>()),
        ]);

        if (loadRequestIdRef.current !== requestId) {
          return;
        }

        const canSeeProfile = canViewProfileContent({
          isOwnProfile,
          visibility: targetProfile.profile_visibility,
          viewerIsFollower: summary.viewerIsFollower,
          viewerIsFollowing: summary.viewerIsFollowing,
        });

        setViewedProfile(targetProfile);
        setProfileContentVisible(canSeeProfile);
        setCurrentFollowingIds(nextFollowingIds);
        setViewerRelationship({
          viewerIsFollower: summary.viewerIsFollower,
          viewerIsFollowing: summary.viewerIsFollowing,
        });
        setProfileStats({
          postsCount: canSeeProfile ? summary.postsCount : 0,
          jobPostsCount: canSeeProfile ? summary.jobPostsCount : 0,
          commentsCount: canSeeProfile ? summary.commentsCount : 0,
          likesReceivedCount: canSeeProfile ? summary.likesReceivedCount : 0,
          followersCount: summary.followersCount,
          followingCount: summary.followingCount,
        });
        lastFetchedAtRef.current = Date.now();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to load the profile.");
      } finally {
        if (loadRequestIdRef.current === requestId) {
          setStatsLoading(false);
        }
        if (shouldShowBlockingLoader) {
          setLoading(false);
        }
      }
    },
    [isOwnProfile, profileSessionKey, resetActivityStates, username]
  );

  useEffect(() => {
    if (profileSessionKey) {
      const sessionSnapshot = getProfileSessionSnapshot(profileSessionKey);

      if (sessionSnapshot) {
        stateSessionKeyRef.current = profileSessionKey;
        lastFetchedAtRef.current = sessionSnapshot.lastFetchedAt;
        viewedProfileRef.current = sessionSnapshot.viewedProfile;
        setViewedProfile(sessionSnapshot.viewedProfile);
        setProfileStats(sessionSnapshot.profileStats);
        setStatsLoading(false);
        setViewerRelationship(sessionSnapshot.viewerRelationship);
        setCurrentFollowingIds(new Set(sessionSnapshot.currentFollowingIds));
        setProfileContentVisible(sessionSnapshot.profileContentVisible);
        setFormState(sessionSnapshot.formState);
        setPostState(sessionSnapshot.postState);
        setCommentState(sessionSnapshot.commentState);
        setFollowersState(sessionSnapshot.followersState);
        setFollowingState(sessionSnapshot.followingState);
        setLoading(false);

        if (isSessionSnapshotStale(sessionSnapshot)) {
          void loadProfileBundle({ resetActivities: false, showLoading: false });
        }

        return;
      }
    }

    if (profileSessionKey) {
      stateSessionKeyRef.current = profileSessionKey;
      lastFetchedAtRef.current = 0;
      void loadProfileBundle({ resetActivities: true, showLoading: true });
      return;
    }

    stateSessionKeyRef.current = profileSessionKey;
    lastFetchedAtRef.current = 0;
    void loadProfileBundle({ resetActivities: true, showLoading: true });
  }, [loadProfileBundle, profileSessionKey]);

  useEffect(() => {
    if (
      !profileSessionKey ||
      stateSessionKeyRef.current !== profileSessionKey ||
      lastFetchedAtRef.current === 0
    ) {
      return;
    }

    setProfileSessionSnapshot(profileSessionKey, {
      viewedProfile,
      profileStats,
      viewerRelationship,
      currentFollowingIds: Array.from(currentFollowingIds),
      profileContentVisible,
      formState,
      postState,
      commentState,
      followersState,
      followingState,
      lastFetchedAt: lastFetchedAtRef.current,
    });
  }, [
    commentState,
    currentFollowingIds,
    followersState,
    followingState,
    formState,
    postState,
    profileContentVisible,
    profileSessionKey,
    profileStats,
    viewedProfile,
    viewerRelationship,
  ]);

  useEffect(() => {
    if (isProfileView(viewParam)) {
      setActiveView(viewParam);
      return;
    }
    setActiveView("posts");
  }, [viewParam, username]);

  useEffect(() => {
    if (!user || !viewedProfile || isOwnProfile || !profileContentVisible) {
      return;
    }

    void recordProfileView(user.id, viewedProfile.id);
  }, [isOwnProfile, profileContentVisible, user, viewedProfile]);

  const loadPostsView = useCallback(
    async (options: { fresh?: boolean; reset?: boolean; targetCount?: number } = {}) => {
      if (!viewedProfile) {
        return;
      }

      const reset = options.reset ?? !postState.initialized;
      const targetCount = options.targetCount || (reset ? INITIAL_PROFILE_ITEMS : PROFILE_SCROLL_ITEMS);

      if (reset) {
        setPostState((current) => ({ ...current, loading: true }));
      } else {
        setPostState((current) => ({ ...current, loadingMore: true }));
      }

      try {
        const page = await loadUserPostsPage(viewedProfile.id, {
          fresh: options.fresh,
          includeAnonymous: false,
          allowedKinds,
          limit: targetCount,
          offset: reset ? 0 : postState.offset,
        });

        setPostState((current) => ({
          items: reset ? page.items : mergeUniqueById(current.items, page.items),
          offset: page.nextOffset,
          hasMore: page.hasMore,
          loading: false,
          loadingMore: false,
          initialized: true,
        }));
      } catch (error) {
        setPostState((current) => ({ ...current, loading: false, loadingMore: false }));
        toast.error(error instanceof Error ? error.message : "Could not load posts.");
      }
    },
    [allowedKinds, postState.initialized, postState.offset, viewedProfile]
  );

  const loadCommentsView = useCallback(
    async (options: { fresh?: boolean; reset?: boolean; targetCount?: number } = {}) => {
      if (!viewedProfile) {
        return;
      }

      const reset = options.reset ?? !commentState.initialized;
      const targetCount = options.targetCount || (reset ? INITIAL_PROFILE_ITEMS : PROFILE_SCROLL_ITEMS);

      if (reset) {
        setCommentState((current) => ({ ...current, loading: true }));
      } else {
        setCommentState((current) => ({ ...current, loadingMore: true }));
      }

      try {
        const page = await loadUserCommentsPage(viewedProfile.id, {
          fresh: options.fresh,
          includeAnonymous: false,
          allowedKinds,
          limit: targetCount,
          offset: reset ? 0 : commentState.offset,
        });

        setCommentState((current) => ({
          items: reset ? page.items : mergeUniqueById(current.items, page.items),
          offset: page.nextOffset,
          hasMore: page.hasMore,
          loading: false,
          loadingMore: false,
          initialized: true,
        }));
      } catch (error) {
        setCommentState((current) => ({ ...current, loading: false, loadingMore: false }));
        toast.error(error instanceof Error ? error.message : "Could not load comments.");
      }
    },
    [allowedKinds, commentState.initialized, commentState.offset, viewedProfile]
  );

  const loadFollowersView = useCallback(
    async (options: { reset?: boolean; targetCount?: number } = {}) => {
      if (!viewedProfile) {
        return;
      }

      const reset = options.reset ?? !followersState.initialized;
      const targetCount = options.targetCount || (reset ? INITIAL_PROFILE_ITEMS : PROFILE_SCROLL_ITEMS);

      if (reset) {
        setFollowersState((current) => ({ ...current, loading: true }));
      } else {
        setFollowersState((current) => ({ ...current, loadingMore: true }));
      }

      try {
        const page = await loadFollowersPage(viewedProfile.id, {
          limit: targetCount,
          offset: reset ? 0 : followersState.offset,
        });

        setFollowersState((current) => ({
          items: reset ? page.items : mergeUniqueById(current.items, page.items),
          offset: page.nextOffset,
          hasMore: page.hasMore,
          loading: false,
          loadingMore: false,
          initialized: true,
        }));
      } catch (error) {
        setFollowersState((current) => ({ ...current, loading: false, loadingMore: false }));
        toast.error(error instanceof Error ? error.message : "Could not load followers.");
      }
    },
    [followersState.initialized, followersState.offset, viewedProfile]
  );

  const loadFollowingView = useCallback(
    async (options: { reset?: boolean; targetCount?: number } = {}) => {
      if (!viewedProfile) {
        return;
      }

      const reset = options.reset ?? !followingState.initialized;
      const targetCount = options.targetCount || (reset ? INITIAL_PROFILE_ITEMS : PROFILE_SCROLL_ITEMS);

      if (reset) {
        setFollowingState((current) => ({ ...current, loading: true }));
      } else {
        setFollowingState((current) => ({ ...current, loadingMore: true }));
      }

      try {
        const page = await loadFollowingPage(viewedProfile.id, {
          limit: targetCount,
          offset: reset ? 0 : followingState.offset,
        });

        setFollowingState((current) => ({
          items: reset ? page.items : mergeUniqueById(current.items, page.items),
          offset: page.nextOffset,
          hasMore: page.hasMore,
          loading: false,
          loadingMore: false,
          initialized: true,
        }));
      } catch (error) {
        setFollowingState((current) => ({ ...current, loading: false, loadingMore: false }));
        toast.error(error instanceof Error ? error.message : "Could not load following profiles.");
      }
    },
    [followingState.initialized, followingState.offset, viewedProfile]
  );

  const loadActiveView = useCallback(
    async (options: { fresh?: boolean; reset?: boolean; targetCount?: number } = {}) => {
      if (activeView === "posts") {
        await loadPostsView(options);
        return;
      }

      if (activeView === "comments") {
        await loadCommentsView(options);
        return;
      }

      if (activeView === "followers") {
        await loadFollowersView(options);
        return;
      }

      await loadFollowingView(options);
    },
    [activeView, loadCommentsView, loadFollowersView, loadFollowingView, loadPostsView]
  );

  useEffect(() => {
    if (!viewedProfile || (!profileContentVisible && !isOwnProfile)) {
      return;
    }

    const isInitialized =
      activeView === "posts"
        ? postState.initialized
        : activeView === "comments"
          ? commentState.initialized
          : activeView === "followers"
            ? followersState.initialized
            : followingState.initialized;

    if (!isInitialized) {
      void loadActiveView({ reset: true, targetCount: INITIAL_PROFILE_ITEMS });
    }
  }, [
    activeView,
    commentState.initialized,
    followersState.initialized,
    followingState.initialized,
    isOwnProfile,
    loadActiveView,
    postState.initialized,
    profileContentVisible,
    viewedProfile,
  ]);

  const activeActivityState =
    activeView === "posts"
      ? postState
      : activeView === "comments"
        ? commentState
        : activeView === "followers"
          ? followersState
          : followingState;

  const loadMoreRef = useInfiniteScrollTrigger({
    enabled: Boolean(viewedProfile && (profileContentVisible || isOwnProfile)),
    hasMore: activeActivityState.hasMore,
    loading: loading || activeActivityState.loading || activeActivityState.loadingMore,
    onLoadMore: () => loadActiveView({ reset: false, targetCount: PROFILE_SCROLL_ITEMS }),
  });

  const isFollowingViewedProfile = viewedProfile ? currentFollowingIds.has(viewedProfile.id) : false;
  const canShowStats = isOwnProfile || (viewedProfile?.show_profile_stats ?? true);
  const canOpenChat = Boolean(
    viewedProfile &&
      canSendChatRequestByPolicy({
        isOwnProfile,
        policy: viewedProfile.chat_request_policy,
        viewerIsFollower: viewerRelationship.viewerIsFollower,
        viewerIsFollowing: viewerRelationship.viewerIsFollowing,
      })
  );
  const resolvedStats =
    profileStats ||
    ({
      postsCount: 0,
      jobPostsCount: 0,
      commentsCount: 0,
      likesReceivedCount: 0,
      followersCount: 0,
      followingCount: 0,
    } satisfies VisibleProfileStats);

  const handleViewChange = (view: ProfileView) => {
    setActiveView(view);
    const next = new URLSearchParams(searchParams);
    if (view === "posts") {
      next.delete("view");
    } else {
      next.set("view", view);
    }
    setSearchParams(next, { replace: true });
  };

  const openNetworkView = (view: "followers" | "following") => {
    handleViewChange(view);
    window.requestAnimationFrame(() => {
      const section = document.getElementById("profile-activity-tabs");
      section?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };

  const refreshCurrentViewAndSummary = async (targetCount?: number) => {
    await loadProfileBundle({ resetActivities: false, showLoading: false });
    await loadActiveView({
      fresh: true,
      reset: true,
      targetCount: targetCount || Math.max(activeActivityState.items.length, INITIAL_PROFILE_ITEMS),
    });
  };

  const handleSaveProfile = async () => {
    if (!isOwnProfile || !formState || !viewedProfile) {
      return;
    }

    setSaving(true);

    try {
      const usernameValidation = validateUsername(formState.username);

      if (!usernameValidation.valid) {
        throw new Error(usernameValidation.message || "Please choose a valid username.");
      }

      const normalizedUsername = usernameValidation.normalized;

      let avatarUrl = formState.avatar_url || null;
      let bannerUrl = formState.banner_url || null;

      if (avatarFile) {
        const uploadedAvatar = await uploadManagedMedia({
          file: avatarFile,
          usage: "avatar",
          attachedProfileId: viewedProfile.id,
          profileUsername: normalizedUsername,
        });
        avatarUrl = uploadedAvatar.public_url;
      }

      if (bannerFile) {
        const uploadedBanner = await uploadManagedMedia({
          file: bannerFile,
          usage: "banner",
          attachedProfileId: viewedProfile.id,
          profileUsername: normalizedUsername,
        });
        bannerUrl = uploadedBanner.public_url;
      }

      const updatedProfile = await updateProfile({
        username: normalizedUsername,
        full_name: formState.full_name,
        headline: formState.headline || null,
        bio: formState.bio || null,
        campus: formState.campus || null,
        course: formState.course || null,
        year_of_study: formState.year_of_study || null,
        skills: formState.skills
          .split(",")
          .map((skill) => skill.trim())
          .filter(Boolean),
        social_links: normalizeSocialLinksInput({
          instagram: formState.instagram,
          linkedin: formState.linkedin,
          email: formState.email,
          mobile_number: formState.mobile_number,
          whatsapp: formState.whatsapp,
          youtube: formState.youtube,
          telegram: formState.telegram,
          website: formState.website,
          other_links: formState.other_links
            .split("\n")
            .map((entry) => entry.trim())
            .filter(Boolean),
        }),
        avatar_url: avatarUrl,
        banner_url: bannerUrl,
        profile_visibility: formState.profile_visibility,
        chat_request_policy: formState.chat_request_policy,
        show_profile_stats: formState.show_profile_stats,
        show_study_activity: formState.show_study_activity,
        show_job_activity: formState.show_job_activity,
        enable_chat_request_notifications: formState.enable_chat_request_notifications,
        enable_message_notifications: formState.enable_message_notifications,
      });

      setViewedProfile(updatedProfile);
      setFormState(toFormState(updatedProfile));
      await refreshProfile();
      setAvatarFile(null);
      setBannerFile(null);
      toast.success("Profile updated.");
      navigate(`/profile/${updatedProfile.username}`, { replace: true });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save your profile.");
    } finally {
      setSaving(false);
    }
  };

  const bannerBackground = `center / cover no-repeat url(${resolveBannerUrl(
    viewedProfile?.banner_url,
    viewedProfile?.updated_at
  )})`;
  const editAvatarSeed = viewedProfile ? buildAvatarSeed(viewedProfile) : undefined;

  if (isEditRoute && !isOwnProfile) {
    return <Navigate to={username ? `/profile/${username}` : "/profile"} replace />;
  }

  return (
    <div className="space-y-6">
      {loading ? (
        <div className="surface-card h-72 animate-pulse rounded-[30px]" />
      ) : isGuestProfileHome ? (
        <section className="mx-auto w-full max-w-[560px]">
          <AuthPanel
            mode={guestAuthFlow.mode}
            busy={guestAuthFlow.busy}
            configured={isSupabaseConfigured}
            email={guestAuthFlow.email}
            password={guestAuthFlow.password}
            confirmPassword={guestAuthFlow.confirmPassword}
            username={guestAuthFlow.username}
            fullName={guestAuthFlow.fullName}
            referralCode={guestAuthFlow.referralCode}
            otp={guestAuthFlow.otp}
            redirectTarget="/app/discussions/study"
            onModeChange={guestAuthFlow.setMode}
            onPrimaryModeChange={guestAuthFlow.handlePrimaryModeChange}
            onEmailChange={guestAuthFlow.setEmail}
            onPasswordChange={guestAuthFlow.setPassword}
            onConfirmPasswordChange={guestAuthFlow.setConfirmPassword}
            onUsernameChange={guestAuthFlow.setUsername}
            onFullNameChange={guestAuthFlow.setFullName}
            onReferralCodeChange={guestAuthFlow.setReferralCode}
            onOtpChange={guestAuthFlow.setOtp}
            onResendCode={guestAuthFlow.handleResendCode}
            agreedToTerms={guestAuthFlow.agreedToTerms}
            onAgreedToTermsChange={guestAuthFlow.setAgreedToTerms}
            onSubmit={guestAuthFlow.handleSubmit}
          />
        </section>
      ) : viewedProfile ? (
        isEditRoute ? (
          <div className="space-y-6">
            <section className="surface-card overflow-hidden rounded-[30px] border border-app-border">
              <div className="aspect-[4/1] w-full" style={{ background: bannerBackground }} />
              <div className="flex flex-col gap-3 px-3 py-3 sm:flex-row sm:items-end sm:justify-between sm:px-6 sm:py-5">
                <div className="flex items-center gap-3 sm:gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-[16px] border-4 border-app-card bg-brand/10 sm:h-14 sm:w-14 sm:rounded-[18px]">
                    <img
                      src={resolveAvatarUrl(viewedProfile.avatar_url, editAvatarSeed, viewedProfile.updated_at)}
                      alt={viewedProfile.full_name || viewedProfile.username}
                      className="h-full w-full object-cover"
                    />
                  </div>

                  <div>
                    <p className="text-xs uppercase tracking-[0.22em] text-brand">Edit profile</p>
                    <div className="mt-1 flex flex-wrap items-center gap-2">
                      <h1 className="font-display text-lg font-bold tracking-tight sm:text-3xl">
                        {viewedProfile.full_name || viewedProfile.username}
                      </h1>
                      {viewedProfile.is_verified ? <VerifiedBadge className="h-5 w-5" /> : null}
                    </div>
                    <p className="mt-0.5 text-xs text-app-muted sm:text-sm">@{viewedProfile.username}</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => navigate(`/profile/${viewedProfile.username}`)}
                  className="inline-flex items-center justify-center rounded-full border border-app-border bg-app-card px-3 py-2 text-xs font-semibold text-app-text transition hover:border-brand/30 hover:text-brand sm:px-4 sm:text-sm"
                >
                  Back to profile
                </button>
              </div>
            </section>

            {formState ? (
              <ProfileEditForm
                formState={formState}
                avatarFile={avatarFile}
                bannerFile={bannerFile}
                saving={saving}
                onChange={(updates) =>
                  setFormState((current) => (current ? { ...current, ...updates } : current))
                }
                onAvatarFileChange={(file) => {
                  if (!file) {
                    setAvatarFile(null);
                    return;
                  }

                  if (!file.type.startsWith("image/")) {
                    toast.error("Profile photo must be an image file.");
                    return;
                  }

                  setAvatarFile(file);
                }}
                onBannerFileChange={(file) => {
                  if (!file) {
                    setBannerFile(null);
                    return;
                  }

                  if (!file.type.startsWith("image/")) {
                    toast.error("Banner must be an image file.");
                    return;
                  }

                  setBannerFile(file);
                }}
                onSave={handleSaveProfile}
              />
            ) : null}
          </div>
        ) : (
          <>
            <ProfileHero
              viewedProfile={{
                ...viewedProfile,
                social_links: coerceSocialLinks(viewedProfile.social_links),
              }}
              isOwnProfile={isOwnProfile}
              postsCount={resolvedStats.postsCount}
              jobPostsCount={resolvedStats.jobPostsCount}
              likesReceivedCount={resolvedStats.likesReceivedCount}
              commentsCount={resolvedStats.commentsCount}
              followersCount={resolvedStats.followersCount}
              followingCount={resolvedStats.followingCount}
              statsLoading={statsLoading}
              showStats={canShowStats}
              isFollowingViewedProfile={isFollowingViewedProfile}
              onOpenEdit={() => navigate(`/profile/${viewedProfile.username}/edit`)}
              onToggleFollow={async () => {
                if (!user) {
                  requireAuth("Sign in to follow students.");
                  return;
                }

                try {
                  await toggleFollow(user.id, viewedProfile.id, isFollowingViewedProfile);
                  toast.success(
                    isFollowingViewedProfile
                      ? "You unfollowed this profile."
                      : "You are now following this profile."
                  );
                  await loadProfileBundle({ resetActivities: false, showLoading: false });
                } catch (error) {
                  toast.error(error instanceof Error ? error.message : "Follow update failed.");
                }
              }}
              onOpenChat={() => {
                if (!viewedProfile) {
                  return;
                }

                if (!user) {
                  requireAuth("Sign in to send a chat request.");
                  return;
                }

                navigate(`/app/messages?compose=${viewedProfile.username}`);
              }}
              canOpenChat={canOpenChat}
              onOpenFollowers={() => openNetworkView("followers")}
              onOpenFollowing={() => openNetworkView("following")}
              onOpenSettings={() => navigate(`/profile/${viewedProfile.username}/settings`)}
            />

            {profileContentVisible || isOwnProfile ? (
              <ProfileActivityTabs
                id="profile-activity-tabs"
                activeView={activeView}
                onViewChange={handleViewChange}
                postsLoading={postState.loading}
                commentsLoading={commentState.loading}
                followersLoading={followersState.loading}
                followingLoading={followingState.loading}
                hasMore={activeActivityState.hasMore}
                loadingMore={activeActivityState.loadingMore}
                loadMoreRef={loadMoreRef}
                posts={postState.items}
              comments={commentState.items}
              followers={followersState.items}
              following={followingState.items}
              currentUserId={user?.id || ""}
              currentFollowingIds={currentFollowingIds}
              onToggleLike={async (targetPost, alreadyLiked) => {
                if (!user) {
                  requireAuth("Sign in to like posts.");
                  return;
                }

                await togglePostLike(targetPost.id, user.id, alreadyLiked);
                await refreshCurrentViewAndSummary();
              }}
              onVotePoll={async (targetPost, optionIndex) => {
                if (!user) {
                  requireAuth("Sign in to vote in polls.");
                  return;
                }

                await voteOnPoll(targetPost.id, user.id, optionIndex);
                await refreshCurrentViewAndSummary();
              }}
              onShare={async (targetPost, alreadyShared) => {
                if (user && !alreadyShared) {
                  await recordPostShare(targetPost.id, user.id);
                }

                if (user) {
                  await refreshCurrentViewAndSummary();
                }
              }}
              onAddComment={async (postId, content, parentCommentId) => {
                if (!user) {
                  requireAuth("Sign in to comment on posts.");
                  return;
                }

                await createComment({ postId, authorId: user.id, content, parentCommentId });
                await refreshCurrentViewAndSummary();
              }}
              onDeletePost={async (postId) => {
                if (!user) {
                  requireAuth("Sign in to manage your posts.");
                  return;
                }

                await deletePost(postId);
                toast.success("Post deleted.");
                await refreshCurrentViewAndSummary();
              }}
              onDeleteComment={async (commentId) => {
                if (!user) {
                  requireAuth("Sign in to manage your comments.");
                  return;
                }

                await deleteComment(commentId);
                toast.success("Comment deleted.");
                await refreshCurrentViewAndSummary();
              }}
              onToggleFollow={async (targetUserId, alreadyFollowing) => {
                if (!user) {
                  requireAuth("Sign in to follow students.");
                  return;
                }

                await toggleFollow(user.id, targetUserId, alreadyFollowing);
                await refreshCurrentViewAndSummary();
              }}
              onDeleteOwnComment={async (commentId) => {
                if (!user) {
                  requireAuth("Sign in to manage your comments.");
                  return;
                }

                await deleteComment(commentId);
                toast.success("Comment deleted.");
                await refreshCurrentViewAndSummary();
                }}
              />
            ) : (
              <div className="rounded-[26px] border border-app-border bg-app-secondary/55 px-5 py-4 text-sm text-app-muted">
                This profile is locked. Follow this user if you want access based on their privacy settings.
              </div>
            )}

            {!isOwnProfile ? (
              <div className="rounded-[26px] border border-brand/15 bg-brand/5 px-5 py-4 text-sm text-app-muted">
                Anonymous activity is always hidden on profile views. Study and job activity visibility
                depends on this user's profile privacy settings.
              </div>
            ) : null}
          </>
        )
      ) : (
        <div className="surface-card rounded-[30px] p-10 text-center">
          <p className="font-display text-2xl font-semibold">Profile not found.</p>
          <p className="mt-2 text-sm text-app-muted">The requested student profile does not exist.</p>
        </div>
      )}
    </div>
  );
}
