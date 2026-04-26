import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { CommunityDirectory } from "../features/communities/CommunityDirectory";
import {
  loadCommunityMemberships,
  loadHiddenCommunityIds,
  loadVisibleCommunities,
} from "../lib/api";
import { buildAuthRedirectPath } from "../lib/authRedirect";
import { loadDiscussionCommunityFeedMode, type DiscussionCommunityFeedMode } from "../lib/discussionFeedPreferences";
import {
  buildCommunityDirectorySessionKey,
  getCommunityDirectorySessionSnapshot,
  isSessionSnapshotStale,
  setCommunityDirectorySessionSnapshot,
} from "../lib/sessionViewCache";
import { useNetworkStatus } from "../hooks/useNetworkStatus";
import { useAuthStore } from "../store/authStore";
import type { CommunityRow } from "../types/database";

export function CommunitiesPage() {
  const { user } = useAuthStore();
  const isOnline = useNetworkStatus();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const discussionFeedMode = loadDiscussionCommunityFeedMode();
  const directorySessionKey = buildCommunityDirectorySessionKey(user?.id || null);
  const cachedDirectorySnapshot = getCommunityDirectorySessionSnapshot(directorySessionKey);
  const [communities, setCommunities] = useState<CommunityRow[]>(() => cachedDirectorySnapshot?.communities ?? []);
  const [memberships, setMemberships] = useState<Set<string>>(
    () => new Set(cachedDirectorySnapshot?.memberships ?? [])
  );
  const [hiddenCommunityIds, setHiddenCommunityIds] = useState<Set<string>>(
    () => new Set(cachedDirectorySnapshot?.hiddenCommunityIds ?? [])
  );
  const [directoryLoading, setDirectoryLoading] = useState(() => !cachedDirectorySnapshot);
  const stateSessionKeyRef = useRef(directorySessionKey);
  const lastFetchedAtRef = useRef(cachedDirectorySnapshot?.lastFetchedAt ?? 0);
  const authRedirectPath = buildAuthRedirectPath(location);
  const communitySearch = searchParams.get("communitySearch") || "";
  const effectiveDiscussionFeedMode: DiscussionCommunityFeedMode = user ? discussionFeedMode : "all";

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
      const [directory, userMemberships, hiddenIds] = await Promise.all([
        loadVisibleCommunities(options),
        user ? loadCommunityMemberships(user.id) : Promise.resolve(new Set<string>()),
        user ? loadHiddenCommunityIds(user.id) : Promise.resolve(new Set<string>()),
      ]);

      setCommunities(directory);
      setMemberships(userMemberships);
      setHiddenCommunityIds(hiddenIds);
      lastFetchedAtRef.current = Date.now();
      const existingSnapshot = getCommunityDirectorySessionSnapshot(directorySessionKey);
      setCommunityDirectorySessionSnapshot(directorySessionKey, {
        communities: directory,
        membershipDetailsByCommunityId: existingSnapshot?.membershipDetailsByCommunityId ?? {},
        memberships: Array.from(userMemberships),
        hiddenCommunityIds: Array.from(hiddenIds),
        followingIds: existingSnapshot?.followingIds ?? [],
        lastFetchedAt: lastFetchedAtRef.current,
      });
    } catch (error) {
      if (isOnline) {
        toast.error(error instanceof Error ? error.message : "Failed to load communities.");
      }
    } finally {
      setDirectoryLoading(false);
    }
  }, [directorySessionKey, isOnline, user]);

  useEffect(() => {
    const sessionSnapshot = getCommunityDirectorySessionSnapshot(directorySessionKey);

    if (sessionSnapshot) {
      stateSessionKeyRef.current = directorySessionKey;
      setCommunities(sessionSnapshot.communities);
      setMemberships(new Set(sessionSnapshot.memberships));
      setHiddenCommunityIds(new Set(sessionSnapshot.hiddenCommunityIds));
      lastFetchedAtRef.current = sessionSnapshot.lastFetchedAt;
      setDirectoryLoading(false);

      if (isSessionSnapshotStale(sessionSnapshot)) {
        void loadDirectory({ fresh: true, showLoading: false });
      }

      return;
    }

    stateSessionKeyRef.current = directorySessionKey;
    lastFetchedAtRef.current = 0;
    setCommunities([]);
    setMemberships(new Set());
    setHiddenCommunityIds(new Set());
    setDirectoryLoading(true);
    void loadDirectory({ showLoading: true });
  }, [directorySessionKey, loadDirectory]);

  useEffect(() => {
    if (stateSessionKeyRef.current !== directorySessionKey || lastFetchedAtRef.current === 0) {
      return;
    }

    const existingSnapshot = getCommunityDirectorySessionSnapshot(directorySessionKey);

    setCommunityDirectorySessionSnapshot(directorySessionKey, {
      communities,
      membershipDetailsByCommunityId: existingSnapshot?.membershipDetailsByCommunityId ?? {},
      memberships: Array.from(memberships),
      hiddenCommunityIds: Array.from(hiddenCommunityIds),
      followingIds: existingSnapshot?.followingIds ?? [],
      lastFetchedAt: lastFetchedAtRef.current,
    });
  }, [communities, directorySessionKey, hiddenCommunityIds, memberships]);

  const filteredCommunities = useMemo(() => {
    const query = communitySearch.trim().toLowerCase();

    if (!query) {
      return communities;
    }

    return communities.filter((community) =>
      [community.name, community.description, community.slug].join(" ").toLowerCase().includes(query)
    );
  }, [communities, communitySearch]);

  return (
    <div className="space-y-4 sm:space-y-5">
      <CommunityDirectory
        communities={filteredCommunities}
        hiddenCommunityIds={hiddenCommunityIds}
        joinedCommunityIds={memberships}
        joinedCommunityCount={memberships.size}
        discussionFeedMode={effectiveDiscussionFeedMode}
        loading={directoryLoading}
        searchValue={communitySearch}
        onSearchChange={(value) => {
          const nextParams = new URLSearchParams(searchParams);

          if (value.trim()) {
            nextParams.set("communitySearch", value);
          } else {
            nextParams.delete("communitySearch");
          }

          setSearchParams(nextParams, { replace: true });
        }}
        showInlineControls={false}
        onCreateCommunity={
          user
            ? () => navigate("/app/communities/create")
            : () => requireAuth("Sign in to create a community.")
        }
      />
    </div>
  );
}
