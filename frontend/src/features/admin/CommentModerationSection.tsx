import { Link } from "react-router-dom";
import { getDiscussionKindLabel } from "../../data/discussions";
import { formatRelativeTime } from "../../lib/formatting";
import type { CommentWithAuthor, ProfileRow } from "../../types/database";
import { VerifiedBadge } from "../../components/VerifiedBadge";

type CommentAuthor = NonNullable<CommentWithAuthor["author"]>;

interface CommentModerationEntry extends CommentWithAuthor {
  post?: {
    id: string;
    title: string;
    discussion_kind: string;
    visibility_scope: string;
    community?: {
      slug: string;
      name: string;
    } | null;
  } | null;
}

interface CommentModerationSectionProps {
  loading: boolean;
  comments: CommentModerationEntry[];
  onDeleteComment: (comment: CommentModerationEntry) => Promise<void>;
  onToggleAuthorVerification: (author: ProfileRow) => Promise<void>;
  onToggleAuthorPosting: (author: ProfileRow) => Promise<void>;
  onToggleAuthorBan: (author: ProfileRow) => Promise<void>;
}

function getCommentPostPath(entry: CommentModerationEntry) {
  if (!entry.post) {
    return "/app/discussions/study";
  }

  if (entry.post.visibility_scope === "community" && entry.post.community?.slug) {
    return `/app/communities/${entry.post.community.slug}?post=${entry.post.id}`;
  }

  return `/app/discussions/${entry.post.discussion_kind || "study"}?post=${entry.post.id}`;
}

export function CommentModerationSection({
  loading,
  comments,
  onDeleteComment,
  onToggleAuthorVerification,
  onToggleAuthorPosting,
  onToggleAuthorBan,
}: CommentModerationSectionProps) {
  return (
    <section className="rounded-[20px] border border-slate-200 bg-white p-3.5 shadow-[0_18px_40px_-34px_rgba(15,23,42,0.22)]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-display text-base font-semibold text-slate-900 sm:text-lg">Comment moderation</p>
          <p className="mt-1 text-xs text-slate-500">Review replies, open the parent post, and manage authors fast.</p>
        </div>
        <p className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold text-slate-600">
          {comments.length} comments
        </p>
      </div>

      <div className="mt-3 space-y-2.5">
        {loading ? (
          <div className="h-32 animate-pulse rounded-[16px] bg-slate-100" />
        ) : comments.length === 0 ? (
          <div className="rounded-[16px] border border-slate-200 bg-slate-50 px-4 py-5 text-sm text-slate-500">
            No comments match the current moderation view.
          </div>
        ) : (
          comments.map((entry) => {
            const author = entry.author as CommentAuthor | null;
            const isReply = Boolean(entry.parent_comment_id);

            return (
              <article
                key={entry.id}
                className="rounded-[18px] border border-slate-200 bg-[linear-gradient(135deg,#ffffff,#f8fbff)] p-3 shadow-[0_14px_28px_-26px_rgba(15,23,42,0.18)]"
              >
                <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
                  <div className="min-w-0 xl:max-w-4xl">
                    <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                      <span className="rounded-full bg-slate-100 px-2 py-1 text-slate-600">
                        {isReply ? "Reply" : "Comment"}
                      </span>
                      {entry.post ? (
                        <span className="rounded-full bg-slate-100 px-2 py-1 text-slate-600">
                          {getDiscussionKindLabel(entry.post.discussion_kind)}
                        </span>
                      ) : null}
                      <span>{formatRelativeTime(entry.created_at)}</span>
                    </div>

                    {entry.post?.title ? (
                      <p className="mt-2 text-sm font-semibold text-slate-900">{entry.post.title}</p>
                    ) : null}

                    <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-600">{entry.content}</p>

                    <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[11px] text-slate-500">
                      <span>Author</span>
                      {author?.username ? (
                        <Link
                          to={`/profile/${author.username}`}
                          className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1 font-semibold text-slate-700 hover:text-brand"
                        >
                          <span>@{author.username}</span>
                          {author.is_verified ? <VerifiedBadge /> : null}
                        </Link>
                      ) : (
                        <span className="rounded-full bg-slate-100 px-2 py-1 font-semibold text-slate-700">
                          Unknown
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-1.5 xl:max-w-sm xl:justify-end">
                    {entry.post ? (
                      <Link
                        to={getCommentPostPath(entry)}
                        className="rounded-full bg-brand/10 px-3 py-1.5 text-[11px] font-semibold text-brand"
                      >
                        Open post
                      </Link>
                    ) : null}

                    <button
                      type="button"
                      onClick={() => void onDeleteComment(entry)}
                      className="rounded-full bg-rose-50 px-3 py-1.5 text-[11px] font-semibold text-rose-600"
                    >
                      Delete
                    </button>

                    {author ? (
                      <>
                        <button
                          type="button"
                          onClick={() => void onToggleAuthorVerification(author)}
                          className="rounded-full bg-sky-50 px-3 py-1.5 text-[11px] font-semibold text-sky-700"
                        >
                          {author.is_verified ? "Unverify" : "Verify"}
                        </button>

                        <button
                          type="button"
                          onClick={() => void onToggleAuthorPosting(author)}
                          className="rounded-full bg-amber-50 px-3 py-1.5 text-[11px] font-semibold text-amber-700"
                        >
                          {author.can_post ? "Restrict" : "Allow"}
                        </button>

                        <button
                          type="button"
                          onClick={() => void onToggleAuthorBan(author)}
                          className="rounded-full bg-rose-50 px-3 py-1.5 text-[11px] font-semibold text-rose-600"
                        >
                          {author.is_banned ? "Unban" : "Ban"}
                        </button>
                      </>
                    ) : null}
                  </div>
                </div>
              </article>
            );
          })
        )}
      </div>
    </section>
  );
}
