import { Clock3, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { buildAvatarSeed, resolveAvatarUrl } from "../../lib/avatar";
import type { ProfileRow } from "../../types/database";
import { VerifiedBadge } from "../../components/VerifiedBadge";

export interface DiscoveryProfileEntry {
  profile: ProfileRow;
}

interface DiscussionDiscoveryPanelProps {
  title: string;
  entries: DiscoveryProfileEntry[];
  currentUserId: string;
  currentFollowingIds: Set<string>;
  onToggleFollow: (targetUserId: string, alreadyFollowing: boolean) => Promise<void>;
  kind: "recent" | "suggested";
  compact?: boolean;
}

export function DiscussionDiscoveryPanel({
  title,
  entries,
  currentUserId,
  currentFollowingIds,
  onToggleFollow,
  kind,
  compact = false,
}: DiscussionDiscoveryPanelProps) {
  const visibleEntries = entries.filter(({ profile }) => {
    if (profile.id === currentUserId) {
      return false;
    }

    if (kind === "suggested" && currentFollowingIds.has(profile.id)) {
      return false;
    }

    return true;
  });

  if (visibleEntries.length === 0) {
    return null;
  }

  const Icon = kind === "recent" ? Clock3 : Sparkles;

  return (
    <section
      className={`surface-card min-w-0 ${compact ? "rounded-[20px] p-3" : "rounded-[24px] p-4 sm:rounded-[28px] sm:p-4 lg:p-5"}`}
    >
      <div className={`flex ${compact ? "items-start gap-2.5" : "items-center gap-2"}`}>
        <div className={`flex items-center justify-center rounded-2xl bg-brand/10 text-brand ${compact ? "h-9 w-9" : "h-8 w-8"}`}>
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <p className={`${compact ? "text-[1.05rem]" : "text-lg lg:text-[1.45rem]"} font-display font-semibold leading-tight`}>
            {title}
          </p>
          <p className={`${compact ? "max-w-none text-[11px] leading-[1.15rem]" : "max-w-[24ch] text-xs leading-5 sm:text-sm"} text-app-muted`}>
            {kind === "recent"
              ? "New students joining the network."
              : "Profiles shaped by the discussions you engage with."}
          </p>
        </div>
      </div>

      <div className={`grid ${compact ? "mt-3 gap-2.5" : "mt-4 gap-3"}`}>
        {visibleEntries.map(({ profile }) => {
          const avatarSeed = buildAvatarSeed(profile);
          const alreadyFollowing = currentFollowingIds.has(profile.id);

          return (
            <div
              key={profile.id}
              className={`border border-app-border bg-app-secondary/55 ${compact ? "rounded-[18px] p-2.5" : "rounded-[22px] p-3 sm:p-3.5"}`}
            >
              <div
                className={`grid min-w-0 ${compact ? "grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-2.5" : "grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3"}`}
              >
                <Link
                  to={`/profile/${profile.username}`}
                  className={`flex shrink-0 items-center justify-center overflow-hidden bg-brand/10 ${compact ? "h-10 w-10 rounded-[16px]" : "h-11 w-11 rounded-2xl"}`}
                >
                  <img
                    src={resolveAvatarUrl(profile.avatar_url, avatarSeed, profile.updated_at)}
                    alt={profile.full_name || profile.username}
                    className="block h-full w-full object-cover"
                  />
                </Link>

                <div className="min-w-0">
                  <Link
                    to={`/profile/${profile.username}`}
                    className={`inline-flex max-w-full items-center gap-1.5 font-display font-semibold text-app-text hover:text-brand ${compact ? "text-[13px]" : "text-sm sm:text-[15px]"}`}
                  >
                    <span className="truncate">{profile.full_name || profile.username}</span>
                    {profile.is_verified ? <VerifiedBadge className="h-3.5 w-3.5" /> : null}
                  </Link>
                  <p className={`mt-0.5 truncate text-app-muted ${compact ? "text-[11px]" : "text-xs sm:text-sm"}`}>@{profile.username}</p>
                </div>

                {profile.id !== currentUserId ? (
                  <button
                    type="button"
                    onClick={() => void onToggleFollow(profile.id, alreadyFollowing)}
                    className={`${compact ? "shrink-0 self-start rounded-full px-2.5 py-1.5 text-[10px]" : "shrink-0 rounded-full px-2.5 py-1.5 text-[10px] sm:px-3 sm:text-[11px]"} font-semibold ${
                      alreadyFollowing ? "bg-app-card text-app-text" : "bg-brand text-white"
                    }`}
                  >
                    {alreadyFollowing ? "Following" : "Follow"}
                  </button>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
