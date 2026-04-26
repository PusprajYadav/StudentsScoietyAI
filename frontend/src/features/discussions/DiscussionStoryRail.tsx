import { Link } from "react-router-dom";
import { buildAvatarSeed, resolveAvatarUrl } from "../../lib/avatar";
import type { ProfileRow } from "../../types/database";
import { VerifiedBadge } from "../../components/VerifiedBadge";

export type DiscussionStoryProfile = Pick<
  ProfileRow,
  "id" | "username" | "full_name" | "avatar_url" | "is_verified"
> & {
  updated_at?: string | null;
};

export interface DiscussionStoryEntry {
  profile: DiscussionStoryProfile;
  tone: "recent" | "suggested";
}

interface DiscussionStoryRailProps {
  entries: DiscussionStoryEntry[];
}

export function DiscussionStoryRail({ entries }: DiscussionStoryRailProps) {
  if (entries.length === 0) {
    return null;
  }

  return (
    <section className="overflow-hidden rounded-[28px] border border-white/75 bg-white/74 p-3 shadow-[0_20px_46px_-34px_rgba(15,23,42,0.24)] backdrop-blur-xl sm:p-3.5">
      <div>
        <div>
          <p className="font-display text-[0.96rem] font-semibold tracking-tight text-app-text">Highlights</p>
          <p className="mt-0.5 text-[10px] leading-4 text-app-muted">Fresh faces and suggested people to follow.</p>
        </div>
      </div>

      <div className="scrollbar-none -mx-1 mt-3 flex snap-x gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden sm:gap-3">
        {entries.map((entry) => {
          const accent = entry.tone === "recent" ? "#60a5fa" : "#8b5cf6";

          return (
            <Link
              key={`${entry.profile.id}-${entry.tone}`}
              to={`/profile/${entry.profile.username}`}
              className="group flex w-[3.8rem] shrink-0 snap-start flex-col items-center text-center sm:w-[5.2rem]"
            >
              <span
                className="flex h-[3.05rem] w-[3.05rem] items-center justify-center rounded-full p-[2px] shadow-[0_16px_28px_-22px_rgba(15,23,42,0.38)] transition group-hover:translate-y-[-1px] sm:h-[4.25rem] sm:w-[4.25rem] sm:p-[3px]"
                style={{
                  backgroundImage: `linear-gradient(135deg, ${accent}, rgba(191,219,254,0.88) 55%, rgba(255,255,255,0.96))`,
                }}
              >
                <span className="relative block h-full w-full overflow-hidden rounded-full border border-white/80 bg-white">
                  <img
                    src={resolveAvatarUrl(entry.profile.avatar_url, buildAvatarSeed(entry.profile), entry.profile.updated_at)}
                    alt={entry.profile.full_name || entry.profile.username}
                    className="h-full w-full object-cover"
                  />
                </span>
              </span>

              <span className="mt-1.5 inline-flex max-w-full items-center gap-1 text-[10px] font-semibold leading-3 text-app-text sm:mt-2 sm:text-[12px]">
                <span className="truncate">{entry.profile.full_name || entry.profile.username}</span>
                {entry.profile.is_verified ? <VerifiedBadge className="h-3 w-3 sm:h-3.5 sm:w-3.5" /> : null}
              </span>
              <span className="mt-1 rounded-full bg-app-secondary px-1.5 py-0.5 text-[8px] font-semibold uppercase tracking-[0.14em] text-app-muted sm:px-2 sm:text-[10px] sm:tracking-[0.16em]">
                {entry.tone === "recent" ? "New" : "For you"}
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
