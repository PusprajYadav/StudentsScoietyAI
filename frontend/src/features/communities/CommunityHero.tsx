import { KeyRound, ShieldCheck, UserRoundCheck, Users2 } from "lucide-react";
import type { CommunityMemberRole, CommunityMemberStatus, CommunityRow } from "../../types/database";
import {
  doesCommunityFeedRequireMembership,
  getCommunityFeedVisibilityShortLabel,
} from "./communityFeedVisibility";
import { normalizeCommunityColor, withAppThemeAlpha, withCommunityAlpha } from "./communityTheme";

interface CommunityHeroProps {
  community: CommunityRow;
  membershipStatus: CommunityMemberStatus | "none";
  membershipRole?: CommunityMemberRole | null;
  membershipBusy?: boolean;
  onPrimaryAction: () => Promise<void> | void;
  primaryLabel: string;
  primaryDisabled?: boolean;
  onSecondaryAction?: () => void;
  secondaryLabel?: string;
}

function getJoinLabel(community: CommunityRow) {
  return community.join_policy === "approval_required" ? "Approval required" : "Open join";
}

function getMembershipTone(status: CommunityMemberStatus | "none") {
  if (status === "active") {
    return "text-app-muted";
  }

  if (status === "pending") {
    return "text-amber-700 dark:text-amber-300";
  }

  if (status === "banned") {
    return "text-rose-700 dark:text-rose-300";
  }

  return "text-app-muted";
}

export function CommunityHero({
  community,
  membershipStatus,
  membershipRole,
  membershipBusy = false,
  onPrimaryAction,
  primaryLabel,
  primaryDisabled = false,
  onSecondaryAction,
  secondaryLabel,
}: CommunityHeroProps) {
  const accent = normalizeCommunityColor(community.hero_color);
  const feedRequiresMembership = doesCommunityFeedRequireMembership(community);
  const membershipBadgeLabel =
    membershipStatus === "active"
      ? membershipRole === "owner"
        ? "Owner"
        : membershipRole === "admin"
          ? "Community admin"
          : "Member"
      : membershipStatus === "pending"
        ? "Request pending"
        : membershipStatus === "banned"
          ? "Banned"
          : "Not joined";

  return (
    <section
      className="relative overflow-hidden rounded-[28px] border border-app-border/80 px-4 py-6 shadow-[0_24px_50px_-38px_rgba(15,23,42,0.42)] sm:rounded-[32px] sm:px-6 sm:py-7"
      style={{
        backgroundImage: `linear-gradient(135deg, ${withCommunityAlpha(accent, 0.2)} 0%, ${withCommunityAlpha(accent, 0.1)} 24%, ${withAppThemeAlpha("app-card", 0.96)} 100%)`,
      }}
    >
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: `radial-gradient(circle at top left, ${withAppThemeAlpha("app-text", 0.07)}, transparent 36%), radial-gradient(circle at bottom right, ${withCommunityAlpha(accent, 0.16)}, transparent 34%)`,
        }}
      />
      <div className="relative flex flex-col items-center text-center">
        <div
          className="flex h-14 w-14 items-center justify-center rounded-full text-[1.9rem] font-semibold text-white shadow-[0_18px_36px_-20px_rgba(124,110,255,0.78)] sm:h-16 sm:w-16"
          style={{ backgroundColor: accent }}
        >
          {community.name.trim().charAt(0).toUpperCase()}
        </div>

        <p className="mt-4 font-display text-[2rem] font-bold tracking-tight text-app-text sm:text-[2.2rem]">
          {community.name}
        </p>
        <p className={`mt-1 text-[15px] font-medium ${getMembershipTone(membershipStatus)}`}>{membershipBadgeLabel}</p>

        <div className="mt-4 flex flex-wrap justify-center gap-2.5">
          <span className="inline-flex items-center gap-1 rounded-full border border-app-border/70 bg-app-card/74 px-3 py-1 text-[12px] font-semibold text-app-text/80 backdrop-blur-sm">
            <Users2 className="h-3.5 w-3.5 text-app-muted" />
            {(community.member_count || 0).toString()} member{community.member_count === 1 ? "" : "s"}
          </span>
          <span className="inline-flex items-center gap-1 rounded-full border border-app-border/70 bg-app-card/74 px-3 py-1 text-[12px] font-semibold text-app-text/80 backdrop-blur-sm">
            <Users2 className="h-3.5 w-3.5 text-app-muted" />
            {getJoinLabel(community)}
          </span>
          <span className="inline-flex items-center gap-1 rounded-full border border-app-border/70 bg-app-card/74 px-3 py-1 text-[12px] font-semibold text-app-text/80 backdrop-blur-sm">
            <UserRoundCheck className="h-3.5 w-3.5 text-app-muted" />
            {getCommunityFeedVisibilityShortLabel(community.feed_visibility)}
          </span>
          {community.requires_password ? (
            <span className="inline-flex items-center gap-1 rounded-full border border-app-border/70 bg-app-card/74 px-3 py-1 text-[12px] font-semibold text-app-text/80 backdrop-blur-sm">
              <KeyRound className="h-3.5 w-3.5 text-app-muted" />
              Password
            </span>
          ) : null}
        </div>

        <div className={`mt-5 grid w-full max-w-[32rem] gap-3 ${secondaryLabel && onSecondaryAction ? "sm:grid-cols-2" : ""}`}>
          {secondaryLabel && onSecondaryAction ? (
            <button
              type="button"
              onClick={onSecondaryAction}
              className="inline-flex h-12 items-center justify-center rounded-full bg-brand px-5 text-sm font-semibold text-white shadow-[0_16px_32px_-20px_rgba(37,99,235,0.58)] transition hover:translate-y-[-1px]"
            >
              {secondaryLabel}
            </button>
          ) : null}

          <button
            type="button"
            disabled={primaryDisabled || membershipBusy}
            onClick={() => void onPrimaryAction()}
            className={`inline-flex h-12 items-center justify-center rounded-full border px-5 text-sm font-semibold transition ${
              membershipStatus === "active" || membershipStatus === "pending" || membershipStatus === "banned"
                ? "border-brand/50 bg-transparent text-brand"
                : "border-brand/15 bg-brand text-white shadow-[0_16px_32px_-20px_rgba(37,99,235,0.58)]"
            } disabled:cursor-not-allowed disabled:opacity-60`}
          >
            {membershipBusy ? "Working..." : primaryLabel}
          </button>
        </div>

        <p className="mt-5 max-w-2xl text-[1.02rem] leading-7 text-app-text/88">{community.description}</p>

        {(community.password_hint ||
          community.requires_password ||
          community.join_policy === "approval_required" ||
          community.feed_visibility === "members_only" ||
          membershipRole === "owner" ||
          membershipRole === "admin") && (
          <div className="mt-4 w-full rounded-[20px] border border-app-border/75 bg-app-card/58 px-4 py-3 text-left backdrop-blur-sm">
            <div className="flex items-start gap-2.5">
              <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-2xl bg-brand/12 text-brand">
                <ShieldCheck className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-app-text">Access rules</p>
                <p className="mt-1 text-xs leading-5 text-app-muted">
                  {community.requires_password
                    ? community.password_hint
                      ? `Password protected. Hint: ${community.password_hint}`
                      : "Password protected. Members need the current password to join."
                    : community.join_policy === "approval_required"
                      ? "This community is invite-by-approval. New members wait for admin approval."
                      : "Anyone can join this community instantly."}{" "}
                  {feedRequiresMembership
                    ? "Posts unlock only for active members."
                    : community.feed_visibility === "discussion_and_community"
                      ? "Posts can also appear in Discuss."
                      : "Posts stay on the community page."}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
