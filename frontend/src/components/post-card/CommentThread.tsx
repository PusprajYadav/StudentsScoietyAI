import { Bot, CornerDownRight, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { buildAvatarSeed, resolveAvatarUrl } from "../../lib/avatar";
import { formatCompactCount, formatRelativeTime } from "../../lib/formatting";
import type { CommentWithAuthor } from "../../types/database";
import { VerifiedBadge } from "../VerifiedBadge";
import { renderInteractiveText } from "../InteractiveText";

interface CommentThreadProps {
  comment: CommentWithAuthor;
  currentUserId: string;
  authorHidden: boolean;
  onReply: (parentCommentId: string, content: string) => Promise<void>;
  onDeleteComment: (commentId: string) => Promise<void>;
  highlightedCommentId?: string | null;
  depth?: number;
}

function treeIncludesCommentId(comment: CommentWithAuthor, targetCommentId?: string | null): boolean {
  if (!targetCommentId) {
    return false;
  }

  if (comment.id === targetCommentId) {
    return true;
  }

  return (comment.replies || []).some((reply) => treeIncludesCommentId(reply, targetCommentId));
}

export function CommentThread({
  comment,
  currentUserId,
  authorHidden,
  onReply,
  onDeleteComment,
  highlightedCommentId,
  depth = 0,
}: CommentThreadProps) {
  const [replying, setReplying] = useState(false);
  const [replyDraft, setReplyDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [showReplies, setShowReplies] = useState(false);
  const replies = comment.replies || [];
  const commentAuthorHidden = authorHidden && !comment.is_ai_generated;
  const commentAuthorUsername = commentAuthorHidden
    ? "Anonymous reply"
    : comment.author?.username || "student";
  const commentAuthorHandle = !commentAuthorHidden ? comment.author?.username || null : null;
  const hasReplies = replies.length > 0;
  const commentAvatarSeed = buildAvatarSeed(comment.author);
  const containsHighlightedComment = treeIncludesCommentId(comment, highlightedCommentId);
  const isHighlightedComment = highlightedCommentId === comment.id;
  const isReply = depth > 0;

  useEffect(() => {
    if (containsHighlightedComment && replies.length > 0) {
      setShowReplies(true);
    }
  }, [containsHighlightedComment, replies.length]);

  return (
    <div id={`comment-${comment.id}`} className="space-y-3 scroll-mt-28">
      <div
        className={`rounded-[18px] border p-3 shadow-[0_12px_28px_-24px_rgba(15,23,42,0.22)] sm:rounded-2xl sm:p-4 ${
          comment.is_ai_generated
            ? "border-cyan-200 bg-[linear-gradient(135deg,rgba(236,254,255,0.96),rgba(224,242,254,0.92))] dark:border-cyan-500/25 dark:bg-[linear-gradient(180deg,rgba(8,47,73,0.46),rgba(15,23,42,0.7))]"
            : isReply
            ? "border-sky-100 bg-sky-50/80 dark:border-sky-500/20 dark:bg-slate-950/45"
            : "border-app-border/70 bg-white dark:bg-slate-950/55"
        } ${isHighlightedComment ? "ring-2 ring-brand/40" : ""
        }`}
      >
        <div className="mb-2 flex items-start justify-between gap-1.5 sm:gap-2">
          <div className="flex min-w-0 items-start gap-2">
            <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-brand/10 text-brand sm:h-9 sm:w-9 sm:rounded-xl">
              {!commentAuthorHidden && commentAuthorHandle ? (
                <Link
                  to={`/profile/${commentAuthorHandle}`}
                  aria-label={`Open @${commentAuthorUsername}'s profile`}
                  className="h-full w-full"
                >
                  <img
                    src={resolveAvatarUrl(
                      comment.author?.avatar_url || null,
                      commentAvatarSeed,
                      comment.author?.updated_at || null
                    )}
                    alt={commentAuthorUsername}
                    className="h-full w-full object-cover"
                  />
                </Link>
              ) : !commentAuthorHidden ? (
                <img
                  src={resolveAvatarUrl(
                    comment.author?.avatar_url || null,
                    commentAvatarSeed,
                    comment.author?.updated_at || null
                  )}
                  alt={commentAuthorUsername}
                  className="h-full w-full object-cover"
                />
              ) : (
                <span className="text-[10px] font-semibold tracking-[0.08em]">AN</span>
              )}
            </div>

            <div className="min-w-0">
              {commentAuthorHandle ? (
                <div className="inline-flex max-w-full items-center gap-1.5">
                  <Link
                    to={`/profile/${commentAuthorHandle}`}
                    className="truncate text-[11px] font-semibold text-app-text hover:text-brand sm:text-sm"
                  >
                    @{commentAuthorUsername}
                  </Link>
                  {comment.author?.is_verified ? <VerifiedBadge className="h-3.5 w-3.5" /> : null}
                </div>
              ) : (
                <p className="text-[11px] font-semibold text-app-text sm:text-sm">{commentAuthorUsername}</p>
              )}
              <p className="mt-0.5 text-[10px] text-app-muted">{formatRelativeTime(comment.created_at)}</p>
            </div>
          </div>

          <div className="flex shrink-0 items-center justify-end gap-1.5 sm:gap-2">
            {comment.is_ai_generated ? (
              <span className="hidden sm:inline-flex items-center gap-1 rounded-full bg-cyan-100 px-1.5 py-1 text-[8px] font-semibold uppercase tracking-[0.1em] text-cyan-700 dark:bg-cyan-500/15 dark:text-cyan-200 sm:px-2 sm:py-1.5 sm:text-[9px] sm:tracking-[0.14em]">
                <Bot className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                AI reply
              </span>
            ) : null}
            {hasReplies ? (
              <button
                type="button"
                onClick={() => setShowReplies((current) => !current)}
                className="rounded-full bg-app-secondary px-2.5 py-1.5 text-[10px] font-semibold text-app-text dark:bg-slate-900/80 sm:px-3 sm:py-2 sm:text-xs"
              >
                {showReplies ? "Hide replies" : `View replies (${formatCompactCount(replies.length)})`}
              </button>
            ) : null}
            {!isReply ? (
              <button
                type="button"
                onClick={() => setReplying((current) => !current)}
                className="rounded-full bg-app-secondary px-2.5 py-1.5 text-[10px] font-semibold text-app-text dark:bg-slate-900/80 sm:px-3 sm:py-2 sm:text-xs"
              >
                Reply
              </button>
            ) : null}
            {comment.author_id === currentUserId ? (
              <button
                type="button"
                onClick={() => void onDeleteComment(comment.id)}
                className="rounded-full bg-rose-500/10 p-1.5 text-rose-500 sm:p-2"
                aria-label="Delete comment"
              >
                <Trash2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              </button>
            ) : null}
          </div>
        </div>

        <p className="whitespace-pre-wrap text-[11px] leading-5 text-app-text/90 sm:text-sm">
          {renderInteractiveText(comment.content)}
          {comment.is_ai_generated ? (
            <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-cyan-100 px-1.5 py-[1px] align-baseline text-[8px] font-semibold uppercase tracking-[0.08em] text-cyan-700 dark:bg-cyan-500/15 dark:text-cyan-200 sm:hidden">
              <Bot className="h-2.5 w-2.5" />
              AI reply
            </span>
          ) : null}
        </p>

        {replying ? (
          <form
            onSubmit={async (event) => {
              event.preventDefault();
              if (!replyDraft.trim()) {
                return;
              }

              setBusy(true);

              try {
                await onReply(comment.id, replyDraft.trim());
                setReplyDraft("");
                setReplying(false);
              } finally {
                setBusy(false);
              }
            }}
            className="mt-3 grid gap-2 sm:mt-3 sm:gap-2.5"
          >
            <textarea
              value={replyDraft}
              onChange={(event) => setReplyDraft(event.target.value)}
              className="input-shell min-h-[68px] resize-y px-3 py-2 text-[12px] sm:min-h-[78px] sm:text-[13px]"
              placeholder="Write a reply"
            />
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setReplying(false)}
                className="rounded-full bg-app-secondary px-3 py-1.5 text-[10px] font-semibold text-app-text dark:bg-slate-900/80 sm:px-3.5 sm:py-1.5 sm:text-[11px]"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={busy}
                className="rounded-full bg-brand px-3 py-1.5 text-[10px] font-semibold text-white disabled:opacity-60 sm:px-3.5 sm:py-1.5 sm:text-[11px]"
              >
                {busy ? "Sending..." : "Reply"}
              </button>
            </div>
          </form>
        ) : null}
      </div>

      {showReplies && replies.length > 0 ? (
        <div className="ml-3 border-l-2 border-sky-100 pl-3 dark:border-sky-500/20 sm:ml-4 sm:pl-4">
          <div className="mb-2.5 inline-flex items-center gap-1.5 rounded-full bg-sky-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-sky-700 dark:bg-sky-500/10 dark:text-sky-300 sm:mb-3 sm:px-3 sm:text-xs">
            <CornerDownRight className="h-3.5 w-3.5" />
            Replies
          </div>
          <div className="space-y-3">
            {replies.map((reply) => (
              <CommentThread
                key={reply.id}
                comment={reply}
                currentUserId={currentUserId}
                authorHidden={authorHidden}
                onReply={onReply}
                onDeleteComment={onDeleteComment}
                highlightedCommentId={highlightedCommentId}
                depth={depth + 1}
              />
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
