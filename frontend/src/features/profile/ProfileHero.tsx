import { FileText, Heart, MessageCircle, PencilLine, Settings, Users } from "lucide-react";
import { VerifiedBadge } from "../../components/VerifiedBadge";
import { buildAvatarSeed, resolveAvatarUrl } from "../../lib/avatar";
import { resolveBannerUrl } from "../../lib/banner";
import { resolveProfileBio } from "../../lib/profileBio";
import { coerceSocialLinks, getSocialLinkItems } from "../../lib/socialLinks";
import type { ProfileRow } from "../../types/database";

interface ProfileHeroProps {
  viewedProfile: ProfileRow;
  isOwnProfile: boolean;
  postsCount: number;
  jobPostsCount: number;
  likesReceivedCount: number;
  commentsCount: number;
  followersCount: number;
  followingCount: number;
  statsLoading?: boolean;
  showStats: boolean;
  isFollowingViewedProfile: boolean;
  onOpenEdit: () => void;
  onToggleFollow: () => Promise<void>;
  onOpenFollowers: () => void;
  onOpenFollowing: () => void;
  onOpenSettings: () => void;
  onOpenChat: () => void;
  canOpenChat: boolean;
}

export function ProfileHero({
  viewedProfile,
  isOwnProfile,
  postsCount,
  jobPostsCount,
  likesReceivedCount,
  commentsCount,
  followersCount,
  followingCount,
  statsLoading = false,
  showStats,
  isFollowingViewedProfile,
  onOpenEdit,
  onToggleFollow,
  onOpenFollowers,
  onOpenFollowing,
  onOpenSettings,
  onOpenChat,
  canOpenChat,
}: ProfileHeroProps) {
  const socialLinks = getSocialLinkItems(coerceSocialLinks(viewedProfile.social_links));
  const joinedLabel = new Date(viewedProfile.created_at).toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });
  const bannerBackground = `center / cover no-repeat url(${resolveBannerUrl(
    viewedProfile.banner_url,
    viewedProfile.updated_at
  )})`;
  const avatarSeed = buildAvatarSeed(viewedProfile);

  return (
    <section className="overflow-hidden rounded-[34px] border border-app-border bg-app-card">
      <div className="w-full aspect-[4/1]" style={{ background: bannerBackground }} />

      <div className="sm:hidden -mx-3 mb-4 px-3">
        <div className="rounded-[28px] border border-brand/10 bg-app-card px-3 py-3 shadow-[0_14px_30px_rgba(37,99,235,0.08)]">
          <div className="flex items-start gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-[16px] border-2 border-app-card bg-brand/10 text-lg font-semibold text-brand shadow-[0_10px_20px_rgba(37,99,235,0.12)]">
              <img
                src={resolveAvatarUrl(viewedProfile.avatar_url, avatarSeed, viewedProfile.updated_at)}
                alt={viewedProfile.full_name || viewedProfile.username}
                className="h-full w-full object-cover"
              />
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <h1 className="truncate font-display text-[1.08rem] font-bold tracking-tight leading-none">
                  {viewedProfile.full_name || viewedProfile.username}
                </h1>
                {viewedProfile.is_verified ? <VerifiedBadge className="h-3.5 w-3.5" /> : null}
              </div>
              <p className="mt-0.5 text-[10px] text-app-muted">@{viewedProfile.username}</p>
              <p className="mt-0.5 text-[10px] text-app-muted">Joined {joinedLabel}</p>
            </div>

            <div className="shrink-0 pt-0.5">
              {isOwnProfile ? (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={onOpenEdit}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-app-secondary text-app-text"
                    aria-label="Edit profile"
                    title="Edit profile"
                  >
                    <PencilLine className="h-3.5 w-3.5" />
                  </button>

                    <button
                      type="button"
                      onClick={onOpenSettings}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-app-border bg-app-secondary text-brand"
                      aria-label="Open profile settings"
                      title="Open profile settings"
                    >
                      <Settings className="h-3.5 w-3.5" />
                    </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  {canOpenChat ? (
                    <button
                      type="button"
                      onClick={onOpenChat}
                      className="inline-flex h-8 items-center rounded-full border border-app-border bg-app-secondary px-2.5 text-[10px] font-semibold text-app-text"
                    >
                      Message
                    </button>
                  ) : null}

                  <button
                    type="button"
                    onClick={() => void onToggleFollow()}
                    className={`inline-flex h-8 items-center rounded-full px-2.5 text-[10px] font-semibold ${
                      isFollowingViewedProfile ? "bg-app-secondary text-app-text" : "bg-brand text-white"
                    }`}
                  >
                    {isFollowingViewedProfile ? "Following" : "Follow"}
                  </button>
                </div>
              )}
            </div>
          </div>

          {viewedProfile.headline ? (
            <p className="mt-3 rounded-[22px] border border-app-border bg-app-secondary/60 px-3 py-3 text-[12px] leading-5 text-app-text/85">
              {viewedProfile.headline}
            </p>
          ) : null}
        </div>
      </div>

      <div className="px-4 pb-5 sm:px-8 sm:pb-6">
        <div className="hidden sm:block">
          <div className="mt-4 rounded-[32px] border border-brand/10 bg-app-card px-5 py-5 shadow-[0_16px_34px_rgba(37,99,235,0.08)]">
            <div className="flex items-start justify-between gap-4">
              <div className="flex min-w-0 flex-1 items-start gap-4">
                <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-[26px] border-4 border-app-card bg-brand/10 text-2xl font-semibold text-brand">
                  <img
                    src={resolveAvatarUrl(viewedProfile.avatar_url, avatarSeed, viewedProfile.updated_at)}
                    alt={viewedProfile.full_name || viewedProfile.username}
                    className="h-full w-full object-cover"
                  />
                </div>

                <div className="min-w-0 pb-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h1 className="font-display text-3xl font-bold tracking-tight">
                      {viewedProfile.full_name || viewedProfile.username}
                    </h1>
                    {viewedProfile.is_verified ? <VerifiedBadge className="h-5 w-5" /> : null}
                  </div>
                  <p className="mt-1 text-sm text-app-muted">@{viewedProfile.username}</p>
                  <p className="mt-1 text-sm text-app-muted">Joined {joinedLabel}</p>
                  {viewedProfile.headline ? (
                    <p className="mt-2 text-base text-app-text/85">{viewedProfile.headline}</p>
                  ) : null}
                </div>
              </div>

              <div className="shrink-0 self-start">
                {isOwnProfile ? (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={onOpenEdit}
                      className="inline-flex items-center gap-1.5 rounded-full bg-app-secondary px-3 py-2 text-[11px] font-semibold text-app-text sm:gap-2 sm:px-4 sm:py-3 sm:text-sm"
                    >
                      <PencilLine className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                      Edit profile
                    </button>

                    <button
                      type="button"
                      onClick={onOpenSettings}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-app-border bg-app-secondary text-brand transition hover:border-brand/30 hover:bg-brand/5 sm:h-11 sm:w-11"
                      aria-label="Open profile settings"
                      title="Open profile settings"
                    >
                      <Settings className="h-4 w-4 sm:h-4 sm:w-4" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    {canOpenChat ? (
                      <button
                        type="button"
                        onClick={onOpenChat}
                        className="inline-flex items-center gap-1.5 rounded-full border border-app-border bg-app-secondary px-3 py-2 text-[11px] font-semibold text-app-text sm:gap-2 sm:px-5 sm:py-3 sm:text-sm"
                      >
                        Message
                      </button>
                    ) : null}

                    <button
                      type="button"
                      onClick={() => void onToggleFollow()}
                      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-[11px] font-semibold sm:gap-2 sm:px-5 sm:py-3 sm:text-sm ${
                        isFollowingViewedProfile ? "bg-app-secondary text-app-text" : "bg-brand text-white"
                      }`}
                    >
                      {isFollowingViewedProfile ? "Following" : "Follow"}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {showStats ? (
          <div className="mt-5 grid grid-cols-3 gap-2 sm:grid-cols-3 sm:gap-3 xl:grid-cols-6">
            {[
              { label: "Posts", value: postsCount, icon: FileText },
              { label: "Job posts", value: jobPostsCount, icon: FileText },
              { label: "Comments", value: commentsCount, icon: MessageCircle },
              { label: "Likes", value: likesReceivedCount, icon: Heart },
              { label: "Followers", value: followersCount, icon: Users, onClick: onOpenFollowers },
              { label: "Following", value: followingCount, icon: Users, onClick: onOpenFollowing },
            ].map((item) => (
              <div key={item.label}>
                {item.onClick && !statsLoading ? (
                  <button
                    type="button"
                    onClick={item.onClick}
                    className="w-full rounded-[18px] bg-app-secondary px-3 py-3 text-left transition hover:border hover:border-brand/30 hover:bg-brand/5 sm:rounded-[24px] sm:px-4 sm:py-4"
                  >
                    <item.icon className="h-4 w-4 text-brand sm:h-5 sm:w-5" />
                    <p className="mt-2 text-[11px] uppercase tracking-[0.12em] text-app-muted sm:mt-3 sm:text-sm sm:normal-case sm:tracking-normal">
                      {item.label}
                    </p>
                    <p className="font-display text-lg font-semibold sm:text-2xl">{item.value}</p>
                  </button>
                ) : (
                  <div className="rounded-[18px] bg-app-secondary px-3 py-3 sm:rounded-[24px] sm:px-4 sm:py-4">
                    <item.icon className="h-4 w-4 text-brand sm:h-5 sm:w-5" />
                    <p className="mt-2 text-[11px] uppercase tracking-[0.12em] text-app-muted sm:mt-3 sm:text-sm sm:normal-case sm:tracking-normal">
                      {item.label}
                    </p>
                    {statsLoading ? (
                      <div className="mt-2 h-7 w-12 animate-pulse rounded-full bg-app-card/80 sm:h-8 sm:w-16" />
                    ) : (
                      <p className="font-display text-lg font-semibold sm:text-2xl">{item.value}</p>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-6 rounded-[24px] border border-app-border bg-app-secondary/60 px-4 py-4 text-sm text-app-muted">
            This user has hidden profile stats from public view.
          </div>
        )}

        <p className="mt-6 max-w-3xl whitespace-pre-wrap text-sm leading-7 text-app-muted">
          {resolveProfileBio(viewedProfile.bio)}
        </p>

        {(viewedProfile.course || viewedProfile.campus || viewedProfile.year_of_study) ? (
          <div className="mt-4 flex flex-wrap gap-2">
            {[viewedProfile.course, viewedProfile.campus, viewedProfile.year_of_study]
              .filter(Boolean)
              .map((item) => (
                <span key={item} className="rounded-full bg-app-secondary px-3 py-1 text-sm text-app-muted">
                  {item}
                </span>
              ))}
          </div>
        ) : null}

        {socialLinks.length > 0 ? (
          <div className="mt-4 grid grid-cols-3 gap-2 sm:flex sm:flex-wrap">
            {socialLinks.map((entry) => (
              <a
                key={entry.key}
                href={entry.href}
                target="_blank"
                rel="noreferrer"
                className="inline-flex min-w-0 items-center justify-center gap-1.5 rounded-[18px] border border-app-border bg-app-secondary px-2 py-2 text-[11px] text-app-text transition hover:border-brand/50 hover:text-brand sm:rounded-full sm:px-3 sm:text-sm"
                aria-label={entry.label}
                title={entry.label}
              >
                <entry.icon className="h-3.5 w-3.5 shrink-0 sm:h-4 sm:w-4" />
                <span className="truncate text-[10px] sm:text-sm">{entry.label}</span>
              </a>
            ))}
          </div>
        ) : null}

        {viewedProfile.skills.length > 0 ? (
          <div className="mt-4 flex flex-wrap gap-2">
            {viewedProfile.skills.map((skill) => (
              <span key={skill} className="rounded-full bg-brand/10 px-3 py-1 text-sm text-brand">
                {skill}
              </span>
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}
