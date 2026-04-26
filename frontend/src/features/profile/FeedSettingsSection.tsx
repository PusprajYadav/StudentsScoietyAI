import {
  Check,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  Search,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import {
  loadCommunityMemberships,
  loadHiddenCommunityIds,
  loadVisibleCommunities,
  saveHiddenCommunityIds,
} from "../../lib/api";
import {
  loadDiscussionCommunityFeedMode,
  saveDiscussionCommunityFeedMode,
  type DiscussionCommunityFeedMode,
} from "../../lib/discussionFeedPreferences";
import type { CommunityRow } from "../../types/database";
import {
  canCommunityAppearInDiscuss,
  getCommunityFeedVisibilityShortLabel,
} from "../communities/communityFeedVisibility";

export function FeedSettingsSection({ profileId }: { profileId: string }) {
  const [currentMode, setCurrentMode] = useState<DiscussionCommunityFeedMode>(
    () => loadDiscussionCommunityFeedMode()
  );
  const [communities, setCommunities] = useState<CommunityRow[]>([]);
  const [joinedCommunityIds, setJoinedCommunityIds] = useState<Set<string>>(
    new Set()
  );
  const [hiddenCommunityIds, setHiddenCommunityIds] = useState<Set<string>>(
    new Set()
  );
  const [searchValue, setSearchValue] = useState("");
  const [loading, setLoading] = useState(true);
  const [updatingCommunityId, setUpdatingCommunityId] = useState<string | null>(
    null
  );

  const loadFeedSettings = useCallback(async () => {
    setLoading(true);

    try {
      const [directory, memberships, hiddenIds] = await Promise.all([
        loadVisibleCommunities(),
        loadCommunityMemberships(profileId),
        loadHiddenCommunityIds(profileId),
      ]);

      setCommunities(directory);
      setJoinedCommunityIds(memberships);
      setHiddenCommunityIds(hiddenIds);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Could not load feed settings."
      );
    } finally {
      setLoading(false);
    }
  }, [profileId]);

  useEffect(() => {
    void loadFeedSettings();
  }, [loadFeedSettings]);

  const updateMode = (mode: DiscussionCommunityFeedMode) => {
    saveDiscussionCommunityFeedMode(mode);
    setCurrentMode(mode);
  };

  const filteredCommunities = useMemo(() => {
    const query = searchValue.trim().toLowerCase();

    if (!query) {
      return communities;
    }

    return communities.filter((community) =>
      [community.name, community.description, community.slug]
        .join(" ")
        .toLowerCase()
        .includes(query)
    );
  }, [communities, searchValue]);

  const shownCount = useMemo(
    () =>
      communities.filter((community) => {
        if (!canCommunityAppearInDiscuss(community)) {
          return false;
        }

        if (hiddenCommunityIds.has(community.id)) {
          return false;
        }

        if (
          currentMode === "joined-only" &&
          !joinedCommunityIds.has(community.id)
        ) {
          return false;
        }

        return true;
      }).length,
    [communities, currentMode, hiddenCommunityIds, joinedCommunityIds]
  );

  const handleCommunityVisibilityToggle = useCallback(
    async (communityId: string, visible: boolean) => {
      const previous = new Set(hiddenCommunityIds);
      const next = new Set(previous);

      if (visible) {
        next.delete(communityId);
      } else {
        next.add(communityId);
      }

      setHiddenCommunityIds(next);
      setUpdatingCommunityId(communityId);

      try {
        await saveHiddenCommunityIds(profileId, Array.from(next));
      } catch (error) {
        setHiddenCommunityIds(previous);
        toast.error(
          error instanceof Error
            ? error.message
            : "Could not update community visibility."
        );
      } finally {
        setUpdatingCommunityId((current) =>
          current === communityId ? null : current
        );
      }
    },
    [hiddenCommunityIds, profileId]
  );

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-app-text">Feed</p>
          <p className="text-xs text-app-muted">Discuss controls</p>
        </div>

        <div className="flex items-center gap-1.5 text-[11px] text-app-muted">
          <span>{shownCount} shown</span>
          <span>•</span>
          <span>{joinedCommunityIds.size} joined</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {[
          { id: "all" as const, label: "All" },
          { id: "joined-only" as const, label: "Joined" },
        ].map((option) => {
          const active = currentMode === option.id;

          return (
            <button
              key={option.id}
              type="button"
              onClick={() => updateMode(option.id)}
              className={`inline-flex items-center justify-center gap-2 rounded-[16px] border px-3 py-2.5 text-sm font-semibold transition ${
                active
                  ? "border-brand bg-brand text-white"
                  : "border-app-border bg-app-card text-app-text hover:border-brand/25 hover:bg-app-secondary"
              }`}
            >
              {active ? <Check className="h-4 w-4" /> : null}
              {option.label}
            </button>
          );
        })}
      </div>

      <label className="relative block">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-app-muted" />
        <input
          value={searchValue}
          onChange={(event) => setSearchValue(event.target.value)}
          placeholder="Search communities"
          className="input-shell h-11 pl-10"
        />
      </label>

      <div className="space-y-2">
        {loading ? (
          <div className="rounded-[18px] border border-app-border bg-app-card px-3 py-4 text-center text-xs text-app-muted">
            Loading...
          </div>
        ) : filteredCommunities.length ? (
          filteredCommunities.map((community) => {
            const isJoined = joinedCommunityIds.has(community.id);
            const canAppearInDiscuss = canCommunityAppearInDiscuss(community);
            const lockedByFeedMode =
              currentMode === "joined-only" && !isJoined;
            const lockedByCommunitySetting = !canAppearInDiscuss;
            const visible = !hiddenCommunityIds.has(community.id);
            const effectiveVisible =
              lockedByFeedMode || lockedByCommunitySetting ? false : visible;
            const isUpdating = updatingCommunityId === community.id;
            const statusLabel = lockedByCommunitySetting
              ? getCommunityFeedVisibilityShortLabel(community.feed_visibility)
              : lockedByFeedMode
                ? "Join first"
                : effectiveVisible
                  ? "Visible"
                  : "Hidden";

            return (
              <div
                key={community.id}
                className="flex items-center gap-2 rounded-[18px] border border-app-border bg-app-card px-3 py-2.5"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-semibold text-app-text">
                      {community.name}
                    </p>
                    {isJoined ? (
                      <span className="rounded-full bg-app-secondary px-2 py-0.5 text-[9px] font-semibold text-app-text">
                        Joined
                      </span>
                    ) : null}
                  </div>
                  <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-app-muted">
                    {effectiveVisible ? (
                      <Eye className="h-3.5 w-3.5 text-brand" />
                    ) : (
                      <EyeOff className="h-3.5 w-3.5" />
                    )}
                    <span>{statusLabel}</span>
                    {lockedByCommunitySetting ? (
                      <Lock className="h-3 w-3" />
                    ) : null}
                  </div>
                </div>

                <label className="relative inline-flex h-[1.375rem] w-10 shrink-0 items-center">
                  <input
                    type="checkbox"
                    checked={effectiveVisible}
                    disabled={
                      isUpdating || lockedByFeedMode || lockedByCommunitySetting
                    }
                    onChange={(event) =>
                      void handleCommunityVisibilityToggle(
                        community.id,
                        event.target.checked
                      )
                    }
                    className="peer sr-only"
                  />
                  <span className="absolute inset-0 rounded-full bg-app-border transition peer-checked:bg-brand peer-disabled:opacity-60" />
                  <span className="absolute left-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-app-card text-brand shadow-sm transition peer-checked:translate-x-[1.125rem]">
                    {isUpdating ? (
                      <Loader2 className="h-2.5 w-2.5 animate-spin" />
                    ) : effectiveVisible ? (
                      <Check className="h-2.5 w-2.5" />
                    ) : null}
                  </span>
                </label>
              </div>
            );
          })
        ) : (
          <div className="rounded-[18px] border border-app-border bg-app-card px-3 py-4 text-center text-xs text-app-muted">
            No communities
          </div>
        )}
      </div>
    </div>
  );
}
