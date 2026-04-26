import { Link } from "react-router-dom";
import { VerifiedBadge } from "../../components/VerifiedBadge";
import { getDiscussionKindLabel } from "../../data/discussions";
import { formatDateTime } from "../../lib/formatting";
import { getPostPath } from "../../lib/postLinks";
import type { PostWithRelations } from "../../types/database";

type PostAuthor = NonNullable<PostWithRelations["author"]>;
export type AdminPostAgeFilter = "all" | "30" | "60" | "90";
export type AdminPostCleanupPreset = "30" | "60" | "90" | "custom";

interface ContentModerationSectionProps {
  posts: PostWithRelations[];
  onToggleVisibility: (post: PostWithRelations) => Promise<void>;
  onDeletePost: (post: PostWithRelations) => Promise<void>;
  onToggleAuthorVerification: (author: PostAuthor) => Promise<void>;
  onToggleAuthorPosting: (author: PostAuthor) => Promise<void>;
  onToggleAuthorBan: (author: PostAuthor) => Promise<void>;
  ageFilter: AdminPostAgeFilter;
  onAgeFilterChange: (value: AdminPostAgeFilter) => void;
  cleanupPreset: AdminPostCleanupPreset;
  onCleanupPresetChange: (value: AdminPostCleanupPreset) => void;
  cleanupCustomDays: string;
  onCleanupCustomDaysChange: (value: string) => void;
  cleanupMatchingCount: number | null;
  cleanupCounting: boolean;
  cleanupDeleting: boolean;
  onDeleteOlderPosts: () => Promise<void>;
}

const ageFilterOptions: Array<{ value: AdminPostAgeFilter; label: string; description: string }> = [
  { value: "all", label: "All posts", description: "Show the full moderation queue." },
  { value: "30", label: "30 days", description: "Only posts created in the last 30 days." },
  { value: "60", label: "60 days", description: "Only posts created in the last 60 days." },
  { value: "90", label: "90 days", description: "Only posts created in the last 90 days." },
];

const cleanupOptions: Array<{ value: Exclude<AdminPostCleanupPreset, "custom">; label: string }> = [
  { value: "30", label: "30 days" },
  { value: "60", label: "60 days" },
  { value: "90", label: "90 days" },
];

export function ContentModerationSection({
  posts,
  onToggleVisibility,
  onDeletePost,
  onToggleAuthorVerification,
  onToggleAuthorPosting,
  onToggleAuthorBan,
  ageFilter,
  onAgeFilterChange,
  cleanupPreset,
  onCleanupPresetChange,
  cleanupCustomDays,
  onCleanupCustomDaysChange,
  cleanupMatchingCount,
  cleanupCounting,
  cleanupDeleting,
  onDeleteOlderPosts,
}: ContentModerationSectionProps) {
  return (
    <section className="rounded-[20px] border border-slate-200 bg-white p-3.5 shadow-[0_18px_40px_-34px_rgba(15,23,42,0.22)]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-display text-base font-semibold text-slate-900 sm:text-lg">Content moderation</p>
          <p className="mt-1 text-xs text-slate-500">Review posts, cleanup older content, and moderate authors.</p>
        </div>
        <p className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold text-slate-600">
          {posts.length} shown
        </p>
      </div>

      <div className="mt-3 grid gap-2.5 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="rounded-[16px] border border-slate-200 bg-slate-50 p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Post age</p>
            <span className="rounded-full bg-white px-2 py-1 text-[10px] font-semibold text-slate-500">
              Filter queue
            </span>
          </div>

          <div className="mt-2 flex flex-wrap gap-1.5">
            {ageFilterOptions.map((option) => {
              const active = option.value === ageFilter;

              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => onAgeFilterChange(option.value)}
                  className={`rounded-full px-3 py-1.5 text-[11px] font-semibold transition ${
                    active ? "bg-brand text-white" : "bg-white text-slate-600 hover:border-brand/30"
                  }`}
                >
                  {option.label}
                </button>
              );
            })}
          </div>

          <p className="mt-2 text-xs leading-5 text-slate-500">
            {ageFilterOptions.find((option) => option.value === ageFilter)?.description}
          </p>
        </div>

        <div className="rounded-[16px] border border-slate-200 bg-slate-50 p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Bulk cleanup</p>
            <span className="rounded-full bg-white px-2 py-1 text-[10px] font-semibold text-slate-500">
              Old content
            </span>
          </div>

          <div className="mt-2 flex flex-wrap gap-1.5">
            {cleanupOptions.map((option) => {
              const active = cleanupPreset === option.value;

              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => onCleanupPresetChange(option.value)}
                  className={`rounded-full px-3 py-1.5 text-[11px] font-semibold transition ${
                    active ? "bg-brand text-white" : "bg-white text-slate-600"
                  }`}
                >
                  {option.label}
                </button>
              );
            })}

            <button
              type="button"
              onClick={() => onCleanupPresetChange("custom")}
              className={`rounded-full px-3 py-1.5 text-[11px] font-semibold transition ${
                cleanupPreset === "custom" ? "bg-brand text-white" : "bg-white text-slate-600"
              }`}
            >
              Custom
            </button>
          </div>

          {cleanupPreset === "custom" ? (
            <label className="mt-2 grid gap-1">
              <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">Days</span>
              <input
                type="number"
                min={1}
                step={1}
                value={cleanupCustomDays}
                onChange={(event) => onCleanupCustomDaysChange(event.target.value)}
                className="input-shell h-9 w-28 rounded-xl text-sm"
                placeholder="120"
              />
            </label>
          ) : null}

          <div className="mt-2 rounded-[14px] bg-white px-3 py-2 text-xs leading-5 text-slate-500">
            {cleanupCounting ? (
              <p>Counting matching posts...</p>
            ) : (
              <p>
                {cleanupMatchingCount ?? 0} post{cleanupMatchingCount === 1 ? "" : "s"} match this cleanup
                window.
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={() => void onDeleteOlderPosts()}
            disabled={cleanupDeleting || cleanupCounting || (cleanupMatchingCount || 0) === 0}
            className="mt-2 rounded-full bg-rose-500 px-4 py-2 text-[11px] font-semibold text-white transition hover:bg-rose-600 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {cleanupDeleting ? "Deleting..." : "Delete older posts"}
          </button>
        </div>
      </div>

      <div className="mt-3 space-y-2.5">
        {posts.length === 0 ? (
          <div className="rounded-[16px] border border-slate-200 bg-slate-50 px-4 py-5 text-sm text-slate-500">
            No posts match the current moderation filters.
          </div>
        ) : (
          posts.map((entry) => (
            <article
              key={entry.id}
              className="rounded-[18px] border border-slate-200 bg-[linear-gradient(135deg,#ffffff,#f8fbff)] p-3 shadow-[0_14px_28px_-26px_rgba(15,23,42,0.18)]"
            >
              <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
                <div className="min-w-0 xl:max-w-4xl">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <p className="truncate font-display text-base font-semibold text-slate-900">{entry.title}</p>
                    <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-600">
                      {getDiscussionKindLabel(entry.discussion_kind)}
                    </span>
                    <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-600">
                      {entry.moderation_state}
                    </span>
                    <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-600">
                      {entry.visibility_scope}
                    </span>
                  </div>

                  <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
                    <span>{formatDateTime(entry.created_at)}</span>
                    <span className="h-1 w-1 rounded-full bg-slate-300" />
                    <span className="capitalize">{entry.post_type}</span>
                    {entry.image_urls.length > 0 ? (
                      <>
                        <span className="h-1 w-1 rounded-full bg-slate-300" />
                        <span>{entry.image_urls.length} images</span>
                      </>
                    ) : null}
                    {entry.pdf_url ? (
                      <>
                        <span className="h-1 w-1 rounded-full bg-slate-300" />
                        <span>PDF attached</span>
                      </>
                    ) : null}
                    {entry.community ? (
                      <span
                        className="rounded-full px-2 py-1 text-[10px] font-semibold text-white"
                        style={{ backgroundColor: entry.community.hero_color }}
                      >
                        {entry.community.name}
                      </span>
                    ) : null}
                  </div>

                  <p className="mt-2 text-sm leading-6 text-slate-600">{entry.content.slice(0, 160)}</p>

                  <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[11px] text-slate-500">
                    <span>Author</span>
                    {entry.author?.username ? (
                      <Link
                        to={`/profile/${entry.author.username}`}
                        className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1 font-semibold text-slate-700 hover:text-brand"
                      >
                        <span>@{entry.author.username}</span>
                        {entry.author.is_verified ? <VerifiedBadge /> : null}
                      </Link>
                    ) : (
                      <span className="rounded-full bg-slate-100 px-2 py-1 font-semibold text-slate-700">
                        Unknown
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap gap-1.5 xl:max-w-sm xl:justify-end">
                  <button
                    type="button"
                    onClick={() => void onToggleVisibility(entry)}
                    className="rounded-full bg-slate-100 px-3 py-1.5 text-[11px] font-semibold text-slate-700"
                  >
                    {entry.moderation_state === "hidden" ? "Republish" : "Hide"}
                  </button>

                  <button
                    type="button"
                    onClick={() => void onDeletePost(entry)}
                    className="rounded-full bg-rose-50 px-3 py-1.5 text-[11px] font-semibold text-rose-600"
                  >
                    Delete
                  </button>

                  <Link
                    to={getPostPath(entry)}
                    className="rounded-full bg-brand/10 px-3 py-1.5 text-[11px] font-semibold text-brand"
                  >
                    Open
                  </Link>

                  {entry.author ? (
                    <>
                      <button
                        type="button"
                        onClick={() => void onToggleAuthorVerification(entry.author)}
                        className="rounded-full bg-sky-50 px-3 py-1.5 text-[11px] font-semibold text-sky-700"
                      >
                        {entry.author.is_verified ? "Unverify" : "Verify"}
                      </button>

                      <button
                        type="button"
                        onClick={() => void onToggleAuthorPosting(entry.author)}
                        className="rounded-full bg-amber-50 px-3 py-1.5 text-[11px] font-semibold text-amber-700"
                      >
                        {entry.author.can_post ? "Restrict" : "Allow"}
                      </button>

                      <button
                        type="button"
                        onClick={() => void onToggleAuthorBan(entry.author)}
                        className="rounded-full bg-rose-50 px-3 py-1.5 text-[11px] font-semibold text-rose-600"
                      >
                        {entry.author.is_banned ? "Unban" : "Ban"}
                      </button>
                    </>
                  ) : null}
                </div>
              </div>
            </article>
          ))
        )}
      </div>
    </section>
  );
}
