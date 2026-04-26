import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { buildAvatarSeed, resolveAvatarUrl } from "../lib/avatar";
import type { ProfileRow } from "../types/database";
import { VerifiedBadge } from "./VerifiedBadge";

interface UserListCardProps {
  profile: ProfileRow;
  action?: ReactNode;
}

export function UserListCard({ profile, action }: UserListCardProps) {
  const displayName = profile.full_name || profile.username;
  const avatarSeed = buildAvatarSeed(profile);

  return (
    <article className="rounded-[20px] border border-app-border bg-app-secondary/60 p-3.5 sm:rounded-[24px] sm:p-5">
      <div className="flex items-start justify-between gap-3 sm:gap-4">
        <div className="min-w-0">
          <Link to={`/profile/${profile.username}`} className="flex min-w-0 items-start gap-2.5 sm:gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-brand/10 text-brand sm:h-12 sm:w-12 sm:rounded-2xl">
              <img
                src={resolveAvatarUrl(profile.avatar_url, avatarSeed, profile.updated_at)}
                alt={displayName}
                className="block h-full w-full object-cover"
              />
            </div>

            <div className="min-w-0">
              <p className="font-display text-sm font-semibold text-app-text transition hover:text-brand sm:text-xl">
                <span className="inline-flex items-center gap-1.5">
                  <span>{displayName}</span>
                  {profile.is_verified ? <VerifiedBadge className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> : null}
                </span>
              </p>
              <p className="mt-0.5 text-xs text-app-muted sm:mt-1 sm:text-sm">@{profile.username}</p>
            </div>
          </Link>
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
    </article>
  );
}
