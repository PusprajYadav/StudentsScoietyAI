import {
  ArrowRight,
  Check,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  Plus,
  Users2,
} from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import type { DiscussionCommunityFeedMode } from "../../lib/discussionFeedPreferences";
import type { CommunityRow } from "../../types/database";
import {
  canCommunityAppearInDiscuss,
  getCommunityFeedVisibilityShortLabel,
} from "./communityFeedVisibility";

interface CommunityDirectoryProps {
  communities: CommunityRow[];
  hiddenCommunityIds?: Set<string>;
  joinedCommunityIds?: Set<string>;
  joinedCommunityCount?: number;
  discussionFeedMode?: DiscussionCommunityFeedMode;
  settingsOpen?: boolean;
  updatingCommunityId?: string | null;
  loading?: boolean;
  onToggleSettings?: () => void;
  onCommunityVisibilityToggle?: (communityId: string, visible: boolean) => void | Promise<void>;
  onDiscussionFeedModeChange?: (mode: DiscussionCommunityFeedMode) => void;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  onCreateCommunity?: () => void;
  showInlineControls?: boolean;
}

type CommunityDirectoryModeFilter = "study" | "discussion" | "anonymous";

function getCompactFeedLabel(community: CommunityRow) {
  if (community.feed_visibility === "members_only") {
    return "Members";
  }

  if (community.feed_visibility === "discussion_and_community") {
    return "Discuss";
  }

  return "Page only";
}

function getCompactJoinLabel(community: CommunityRow) {
  return community.join_policy === "approval_required" ? "Approval" : "Open";
}

function getSettingsChipClass(active: boolean, disabled = false) {
  return `inline-flex items-center justify-center gap-1.5 rounded-[12px] px-2.5 py-2 text-[11px] font-semibold transition ${
    disabled
      ? "cursor-not-allowed text-app-muted opacity-60"
      : active
        ? "bg-brand text-white shadow-[0_10px_20px_rgba(37,99,235,0.18)]"
        : "text-app-text hover:bg-app-card"
  }`;
}

export function CommunityDirectory({
  communities,
  hiddenCommunityIds = new Set<string>(),
  joinedCommunityIds = new Set<string>(),
  joinedCommunityCount = 0,
  discussionFeedMode = "all",
  settingsOpen = false,
  updatingCommunityId = null,
  loading = false,
  onToggleSettings,
  onCommunityVisibilityToggle,
  onDiscussionFeedModeChange,
  searchValue = "",
  onSearchChange,
  onCreateCommunity,
  showInlineControls = true,
}: CommunityDirectoryProps) {
  const [modeFilters, setModeFilters] = useState<Record<CommunityDirectoryModeFilter, boolean>>({
    study: false,
    discussion: false,
    anonymous: false,
  });
  const canOpenSettings = Boolean(onToggleSettings);
  const canConfigureVisibility = Boolean(onCommunityVisibilityToggle);
  const canChangeFeedMode = Boolean(onDiscussionFeedModeChange);
  const joinedOnlyMode = discussionFeedMode === "joined-only";
  const activeQuickFilterCount = Object.values(modeFilters).filter(Boolean).length;
  const hasActiveFilters = joinedOnlyMode || activeQuickFilterCount > 0;
  const filteredCommunities = useMemo(() => {
    return communities.filter((community) => {
      if (joinedOnlyMode && !joinedCommunityIds.has(community.id)) {
        return false;
      }

      if (modeFilters.study && !community.posting_modes.includes("study")) {
        return false;
      }

      if (modeFilters.discussion && !canCommunityAppearInDiscuss(community)) {
        return false;
      }

      if (modeFilters.anonymous && !community.posting_modes.includes("anonymous")) {
        return false;
      }

      return true;
    });
  }, [communities, joinedCommunityIds, joinedOnlyMode, modeFilters]);
  const visibleCommunityCount = communities.filter((community) => {
    if (!canCommunityAppearInDiscuss(community)) {
      return false;
    }

    if (hiddenCommunityIds.has(community.id)) {
      return false;
    }

    if (joinedOnlyMode && !joinedCommunityIds.has(community.id)) {
      return false;
    }

    return true;
  }).length;
  const stats = [
    {
      label: "All",
      value: communities.length,
      icon: Users2,
      background: "linear-gradient(135deg,#5db5ff 0%,#7489ff 100%)",
    },
    {
      label: "Joined",
      value: joinedCommunityCount,
      icon: Check,
      background: "linear-gradient(135deg,#6ea7ff 0%,#8b5cf6 100%)",
    },
    {
      label: "Shown",
      value: visibleCommunityCount,
      icon: Eye,
      background: "linear-gradient(135deg,#7b6dff 0%,#b14cff 100%)",
    },
  ];

  return (
    <section className="mx-auto max-w-[28rem] space-y-3 sm:max-w-none sm:space-y-4">
      <section className="relative overflow-hidden rounded-[24px] border border-app-border/80 bg-app-card/95 p-3.5 shadow-[0_20px_46px_-38px_rgba(15,23,42,0.3)] sm:p-4">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(191,219,254,0.16),transparent_28%),radial-gradient(circle_at_top_right,rgba(216,180,254,0.12),transparent_26%),linear-gradient(135deg,rgba(255,255,255,0.18),transparent_45%)] dark:bg-[radial-gradient(circle_at_top_left,rgba(96,165,250,0.16),transparent_28%),radial-gradient(circle_at_top_right,rgba(168,85,247,0.16),transparent_26%),linear-gradient(135deg,rgba(148,163,184,0.08),transparent_45%)]" />
        <div className="relative">
          {showInlineControls ? (
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <div className="pointer-events-none absolute inset-0 rounded-[18px] bg-[linear-gradient(135deg,rgba(191,219,254,0.48),rgba(216,180,254,0.44))] blur-xl" />
                <label className="relative block">
                  <input
                    value={searchValue}
                    onChange={(event) => onSearchChange?.(event.target.value)}
                    placeholder="Search communities"
                    className="input-shell h-10 w-full rounded-[18px] border-app-border/80 bg-app/90 pl-4 text-[13px] shadow-[0_16px_32px_-26px_rgba(15,23,42,0.24)] backdrop-blur-xl dark:bg-app-secondary/78"
                  />
                </label>
              </div>
            </div>
          ) : null}

          {canOpenSettings && settingsOpen ? (
            <section className={`${showInlineControls ? "mt-2.5" : "mt-0"} rounded-[18px] border border-app-border/80 bg-app-card/78 p-3 shadow-[0_18px_34px_-28px_rgba(15,23,42,0.22)] backdrop-blur-xl`}>
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-[0.95rem] font-semibold tracking-tight text-app-text">Feed settings</p>
                  <p className="mt-0.5 text-[11px] leading-4 text-app-muted">Filter communities and control what shows up in Discuss.</p>
                </div>
                <span className="inline-flex rounded-full bg-app-secondary px-2.5 py-1 text-[10px] font-semibold text-app-muted">
                  {hasActiveFilters
                    ? joinedOnlyMode
                      ? activeQuickFilterCount
                        ? `Joined + ${activeQuickFilterCount} active`
                        : "Joined only"
                      : `${activeQuickFilterCount} active`
                    : `${joinedCommunityCount} joined`}
                </span>
              </div>

              <div className="mt-3 rounded-[16px] border border-app-border/70 bg-app-secondary/72 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-app-muted">Discuss feed</p>
                    <p className="mt-1 text-[10px] leading-4 text-app-muted">Choose whether Discuss includes all communities or only the ones you joined.</p>
                  </div>
                  <span className="rounded-full bg-app-card px-2 py-0.5 text-[9px] font-semibold text-app-muted">
                    {joinedOnlyMode ? "Joined only" : "All posts"}
                  </span>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-1 rounded-[14px] bg-app-card/70 p-1">
                  <button
                    type="button"
                    onClick={() => onDiscussionFeedModeChange?.("all")}
                    className={getSettingsChipClass(!joinedOnlyMode)}
                  >
                    {!joinedOnlyMode ? <Check className="h-3 w-3" /> : null}
                    All
                  </button>
                  <button
                    type="button"
                    disabled={!canChangeFeedMode}
                    onClick={() => onDiscussionFeedModeChange?.("joined-only")}
                    className={getSettingsChipClass(joinedOnlyMode, !canChangeFeedMode)}
                  >
                    {joinedOnlyMode ? <Check className="h-3 w-3" /> : !canChangeFeedMode ? <Lock className="h-3 w-3" /> : null}
                    Joined
                  </button>
                </div>

                {!canChangeFeedMode ? (
                  <p className="mt-2 flex items-center gap-1.5 text-[10px] leading-4 text-app-muted">
                    <Lock className="h-3 w-3 shrink-0" />
                    Sign in to use joined-only feed preferences and community visibility controls.
                  </p>
                ) : null}
              </div>

              <div className="mt-3 rounded-[16px] border border-app-border/70 bg-app-secondary/72 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-app-muted">Post types</p>
                    <p className="mt-1 text-[10px] leading-4 text-app-muted">Narrow this directory to the posting modes you want to browse.</p>
                  </div>
                  <span className="rounded-full bg-app-card px-2 py-0.5 text-[9px] font-semibold text-app-muted">
                    {activeQuickFilterCount ? `${activeQuickFilterCount} active` : "All shown"}
                  </span>
                </div>

                <div className="mt-3 rounded-[14px] bg-app-card/70 p-1">
                  <div className="grid grid-cols-3 gap-1">
                    <button
                      type="button"
                      onClick={() =>
                        setModeFilters((current) => ({
                          ...current,
                          study: !current.study,
                        }))
                      }
                      className={getSettingsChipClass(modeFilters.study)}
                    >
                      {modeFilters.study ? <Check className="h-3 w-3" /> : null}
                      Study
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setModeFilters((current) => ({
                          ...current,
                          discussion: !current.discussion,
                        }))
                      }
                      className={getSettingsChipClass(modeFilters.discussion)}
                    >
                      {modeFilters.discussion ? <Check className="h-3 w-3" /> : null}
                      Discuss
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setModeFilters((current) => ({
                          ...current,
                          anonymous: !current.anonymous,
                        }))
                      }
                      className={getSettingsChipClass(modeFilters.anonymous)}
                    >
                      {modeFilters.anonymous ? <Check className="h-3 w-3" /> : null}
                      Anonymous
                    </button>
                  </div>
                </div>
              </div>

              {canConfigureVisibility ? (
                <>
                  <div className="mt-3 flex items-center justify-between gap-2">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-app-muted">Community visibility</p>
                      <p className="mt-1 text-[10px] leading-4 text-app-muted">Hide or show specific communities in your Discuss feed.</p>
                    </div>
                    <span className="inline-flex rounded-full bg-app-secondary px-2.5 py-1 text-[10px] font-semibold text-app-muted">
                      {joinedCommunityCount} joined
                    </span>
                  </div>

                  <div className="mt-3 grid gap-2">
                    {filteredCommunities.map((community) => {
                      const isJoined = joinedCommunityIds.has(community.id);
                      const canAppearInDiscuss = canCommunityAppearInDiscuss(community);
                      const lockedByFeedMode = joinedOnlyMode && !isJoined;
                      const lockedByCommunitySetting = !canAppearInDiscuss;
                      const visible = !hiddenCommunityIds.has(community.id);
                      const effectiveVisible = lockedByFeedMode || lockedByCommunitySetting ? false : visible;
                      const isUpdating = updatingCommunityId === community.id;
                      const statusLabel = lockedByCommunitySetting
                        ? getCommunityFeedVisibilityShortLabel(community.feed_visibility)
                        : lockedByFeedMode
                          ? "Join first"
                          : effectiveVisible
                            ? "Visible"
                            : "Hidden";

                      return (
                        <label
                          key={community.id}
                          className={`flex items-center justify-between gap-3 rounded-[16px] border px-3 py-2.5 ${
                            effectiveVisible ? "border-brand/20 bg-brand/5" : "border-app-border bg-app-card"
                          }`}
                        >
                          <span className="min-w-0">
                            <span className="block truncate text-[12px] font-semibold text-app-text">{community.name}</span>
                            <span className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[10px] text-app-muted">
                              <span className="inline-flex items-center gap-1">
                                {effectiveVisible ? <Eye className="h-3 w-3 text-brand" /> : <EyeOff className="h-3 w-3" />}
                                {statusLabel}
                              </span>
                              {isJoined ? (
                                <span className="rounded-full bg-app-secondary px-2 py-0.5 text-[9px] font-semibold text-app-text">
                                  Joined
                                </span>
                              ) : null}
                            </span>
                          </span>

                          <span className="relative inline-flex h-[1.375rem] w-10 shrink-0 items-center">
                            <input
                              type="checkbox"
                              checked={effectiveVisible}
                              disabled={isUpdating || lockedByFeedMode || lockedByCommunitySetting}
                              onChange={(event) => void onCommunityVisibilityToggle?.(community.id, event.target.checked)}
                              className="peer sr-only"
                            />
                            <span className="absolute inset-0 rounded-full bg-app-border transition peer-checked:bg-brand peer-disabled:opacity-60" />
                            <span className="absolute left-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-app-card text-brand shadow-sm transition peer-checked:translate-x-[1.125rem]">
                              {isUpdating ? <Loader2 className="h-2.5 w-2.5 animate-spin" /> : effectiveVisible ? <Check className="h-2.5 w-2.5" /> : null}
                            </span>
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </>
              ) : null}
            </section>
          ) : null}

          <div className="mt-3 grid grid-cols-3 gap-1.5">
            {stats.map((card) => (
              <article
                key={card.label}
                className="min-w-0 rounded-[16px] px-2.5 py-2.5 text-white shadow-[0_16px_28px_-24px_rgba(59,130,246,0.54)]"
                style={{ backgroundImage: card.background }}
              >
                <card.icon className="h-3 w-3 text-white/90" />
                <p className="mt-2.5 text-[8px] font-semibold uppercase tracking-[0.12em] text-white/76">{card.label}</p>
                <p className="mt-1 font-display text-[1.75rem] font-bold leading-none">{card.value}</p>
              </article>
            ))}
          </div>

          {onCreateCommunity ? (
            <button
              type="button"
              onClick={onCreateCommunity}
              className="relative mt-3 block w-full overflow-hidden rounded-[18px] border border-app-border/80 bg-app-card/95 p-3 text-left shadow-[0_16px_32px_-28px_rgba(15,23,42,0.24)] transition hover:translate-y-[-1px]"
            >
              <div className="absolute inset-y-0 right-0 w-[58%] bg-[radial-gradient(circle_at_top_right,rgba(96,165,250,0.38),transparent_30%),radial-gradient(circle_at_bottom_right,rgba(168,85,247,0.32),transparent_28%)] dark:bg-[radial-gradient(circle_at_top_right,rgba(96,165,250,0.28),transparent_30%),radial-gradient(circle_at_bottom_right,rgba(168,85,247,0.28),transparent_28%)]" />
              <div className="absolute right-[-1.2rem] top-[-1.2rem] h-16 w-16 rounded-full bg-[#5ea9ff]/35 blur-2xl" />
              <div className="absolute bottom-[-1rem] right-5 h-16 w-14 rotate-[22deg] rounded-[38%] bg-[#7c6eff]/25" />
              <div className="absolute bottom-0 right-[-0.75rem] h-20 w-16 rotate-[-16deg] rounded-[42%] bg-[#8b5cf6]/24" />
              <div className="relative max-w-[9rem]">
                <div className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-app/75 text-app-text shadow-[0_16px_28px_-22px_rgba(15,23,42,0.28)] dark:bg-app-secondary/80">
                  <Plus className="h-4 w-4" />
                </div>
                <p className="mt-2.5 font-display text-[1.2rem] font-bold leading-[1] tracking-tight text-app-text">
                  Create community
                </p>
                <p className="mt-1 text-[11px] leading-4 text-app-muted">
                  Start a space.
                </p>
              </div>
            </button>
          ) : null}
        </div>
      </section>

      {loading ? (
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="h-[6.5rem] animate-pulse rounded-[18px] border border-app-border/80 bg-app-card/70 shadow-[0_22px_46px_-36px_rgba(15,23,42,0.28)]" />
          ))}
        </div>
      ) : filteredCommunities.length === 0 ? (
        <section className="rounded-[24px] border border-app-border/80 bg-app-card/82 p-6 text-center shadow-[0_22px_46px_-36px_rgba(15,23,42,0.28)] sm:p-8">
          <p className="font-display text-[1.55rem] font-bold tracking-tight text-app-text">No matches</p>
          <p className="mt-2 text-[13px] leading-5 text-app-muted">
            Try another search or create one.
          </p>
          {onCreateCommunity ? (
            <button
              type="button"
              onClick={onCreateCommunity}
              className="btn-primary mt-4 inline-flex items-center gap-2 !rounded-full !px-4 !py-2.5 text-sm font-semibold"
            >
              <Plus className="h-4 w-4" />
              Create community
            </button>
          ) : null}
        </section>
      ) : (
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
          {filteredCommunities.map((community) => {
            const isJoined = joinedCommunityIds.has(community.id);
            const memberCount = community.member_count || 0;

            return (
              <article
                key={community.id}
                className="group rounded-[18px] border border-app-border/80 bg-app-card/92 shadow-[0_16px_32px_-28px_rgba(15,23,42,0.24)] transition hover:translate-y-[-2px]"
              >
                <Link to={`/app/communities/${community.slug}`} className="flex items-start gap-2.5 p-2.5">
                  <div
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-app-border/80 text-[1rem] font-semibold text-white shadow-[0_18px_28px_-24px_rgba(15,23,42,0.36)]"
                    style={{ backgroundColor: community.hero_color || "#7c6eff" }}
                  >
                    {community.name.trim().charAt(0).toUpperCase()}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate font-display text-[0.86rem] font-bold leading-none tracking-tight text-app-text">
                          {community.name}
                        </p>
                        <p className="mt-0.5 truncate text-[10px] leading-none text-app-muted">@{community.slug}</p>
                      </div>

                      <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand/12 text-brand shadow-[0_16px_28px_-24px_rgba(95,83,214,0.45)] transition group-hover:translate-x-[1px] dark:bg-brand/20">
                        <ArrowRight className="h-3 w-3" />
                      </span>
                    </div>

                    <p className="mt-1 line-clamp-1 text-[10px] leading-4 text-app-muted">
                      {community.description || "Student space."}
                    </p>

                    <div className="mt-1.5 flex flex-wrap gap-1">
                      <span className="inline-flex items-center gap-1 rounded-full bg-app-secondary px-2 py-1 text-[9px] font-semibold text-app-text">
                        <Users2 className="h-2.5 w-2.5 text-app-muted" />
                        {memberCount}
                      </span>
                      <span className="rounded-full bg-app-secondary px-2 py-1 text-[9px] font-semibold text-app-text">
                        {getCompactJoinLabel(community)}
                      </span>
                      <span className="rounded-full bg-app-secondary px-2 py-1 text-[9px] font-semibold text-app-text">
                        {getCompactFeedLabel(community)}
                      </span>
                      {isJoined ? (
                        <span className="rounded-full bg-emerald-50 px-2 py-1 text-[9px] font-semibold text-emerald-700 dark:bg-emerald-500/12 dark:text-emerald-300">
                          Joined
                        </span>
                      ) : null}
                      {community.requires_password ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-app-secondary px-2 py-1 text-[9px] font-semibold text-app-text">
                          <Lock className="h-2.5 w-2.5 text-brand" />
                          Locked
                        </span>
                      ) : null}
                    </div>
                  </div>
                </Link>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
