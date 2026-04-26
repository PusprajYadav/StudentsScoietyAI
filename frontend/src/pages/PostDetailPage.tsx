import { ArrowLeft, MessageSquareText } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import { useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { PostCard } from "../components/PostCard";
import {
  createComment,
  deleteComment,
  deletePost,
  loadFollowingIds,
  loadPublishedPost,
  recordPostShare,
  toggleFollow,
  togglePostLike,
  voteOnPoll,
} from "../lib/api";
import { buildAuthRedirectPath } from "../lib/authRedirect";
import { extractMentionUsernames } from "../lib/mentions";
import { useAuthStore } from "../store/authStore";
import type { CommentWithAuthor, PostWithRelations } from "../types/database";

function buildPostFallbackPath(post: PostWithRelations | null) {
  if (!post) {
    return "/app/discussions/study";
  }

  if (post.visibility_scope === "community" && post.community?.slug) {
    return `/app/communities/${post.community.slug}`;
  }

  return `/app/discussions/${post.discussion_kind}`;
}

function flattenCommentTree(comments: CommentWithAuthor[]) {
  const values: CommentWithAuthor[] = [];
  const stack = [...comments];
  while (stack.length > 0) {
    const item = stack.shift();
    if (!item) {
      continue;
    }
    values.push(item);
    if (item.replies?.length) {
      stack.unshift(...item.replies);
    }
  }
  return values;
}

function postHasAiReply(post: PostWithRelations | null) {
  if (!post) {
    return false;
  }
  return flattenCommentTree(post.comments || []).some((comment) => Boolean(comment.is_ai_generated));
}

function postMayNeedAiReply(post: PostWithRelations | null) {
  if (!post || postHasAiReply(post)) {
    return false;
  }
  const texts = [
    post.title,
    post.content,
    post.poll_question,
    ...flattenCommentTree(post.comments || []).map((comment) => comment.content),
  ];
  return extractMentionUsernames(...texts).length > 0;
}

export function PostDetailPage() {
  const { postId } = useParams<{ postId: string }>();
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [post, setPost] = useState<PostWithRelations | null>(null);
  const [followingIds, setFollowingIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [missing, setMissing] = useState(false);
  const aiReplyWatchAttemptsRef = useRef(0);
  const highlightedCommentId = searchParams.get("comment");
  const authRedirectPath = buildAuthRedirectPath(location);

  const loadPage = useCallback(
    async (options: { showLoading?: boolean } = {}) => {
      if (!postId) {
        setMissing(true);
        setLoading(false);
        return;
      }

      if (options.showLoading ?? true) {
        setLoading(true);
      }

      try {
        const [nextPost, nextFollowingIds] = await Promise.all([
          loadPublishedPost(postId),
          user ? loadFollowingIds(user.id) : Promise.resolve(new Set<string>()),
        ]);

        setPost(nextPost);
        setFollowingIds(nextFollowingIds);
        setMissing(!nextPost);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to load this post.");
      } finally {
        setLoading(false);
      }
    },
    [postId, user]
  );

  useEffect(() => {
    void loadPage({ showLoading: true });
  }, [loadPage]);

  useEffect(() => {
    aiReplyWatchAttemptsRef.current = 0;
  }, [postId]);

  const shouldWatchForAiReply = useMemo(() => postMayNeedAiReply(post), [post]);

  useEffect(() => {
    if (!post || !shouldWatchForAiReply || aiReplyWatchAttemptsRef.current >= 12) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      aiReplyWatchAttemptsRef.current += 1;
      void loadPage({ showLoading: false });
    }, 2500);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [loadPage, post, shouldWatchForAiReply]);

  const fallbackPath = useMemo(() => buildPostFallbackPath(post), [post]);

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
      return;
    }

    navigate(fallbackPath, { replace: true });
  };

  const requireAuth = useCallback(
    (message: string) => {
      toast(message);
      navigate(authRedirectPath);
    },
    [authRedirectPath, navigate]
  );

  if (loading) {
    return <div className="surface-card h-64 animate-pulse rounded-[28px]" />;
  }

  if (missing || !post) {
    return (
      <section className="mx-auto w-full max-w-5xl space-y-4 pb-24">
        <button
          type="button"
          onClick={handleBack}
          className="inline-flex items-center gap-2 rounded-full bg-app-secondary px-3 py-2 text-sm font-semibold text-app-text transition hover:bg-brand/10 hover:text-brand"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>
        <div className="surface-card rounded-[28px] p-8 text-center">
          <p className="font-display text-2xl font-semibold text-app-text">Post not found</p>
          <p className="mt-2 text-sm text-app-muted">This post may have been removed or is no longer available.</p>
        </div>
      </section>
    );
  }

  return (
    <section className="mx-auto w-full max-w-5xl space-y-4 pb-24">
      <div className="overflow-hidden rounded-[24px] border border-app-border/70 bg-[linear-gradient(135deg,rgba(255,255,255,0.98),rgba(239,246,255,0.94))] shadow-[0_26px_60px_-46px_rgba(37,99,235,0.32)] dark:bg-[linear-gradient(135deg,rgba(11,17,31,0.98),rgba(8,13,25,0.96))] dark:shadow-[0_26px_60px_-46px_rgba(2,6,23,0.8)]">
        <div className="flex items-center justify-between gap-3 px-4 py-3 sm:px-5">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={handleBack}
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/80 bg-white/90 text-app-text transition hover:border-brand/20 hover:bg-brand/5 hover:text-brand dark:border-white/10 dark:bg-slate-950/55"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
            </button>
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-brand/80">Post thread</p>
              <p className="truncate font-display text-base font-semibold tracking-tight text-app-text sm:text-lg">
                Read and reply
              </p>
            </div>
          </div>

          <div className="hidden h-9 w-9 items-center justify-center rounded-xl bg-white/85 text-brand shadow-[0_14px_28px_-22px_rgba(37,99,235,0.55)] dark:bg-slate-950/55 sm:flex">
            <MessageSquareText className="h-4 w-4" />
          </div>
        </div>
      </div>

      <PostCard
        post={post}
        currentUserId={user?.id || ""}
        followingIds={followingIds}
        detailMode
        initialShowComments
        highlightedCommentId={highlightedCommentId}
        onToggleLike={async (targetPost, alreadyLiked) => {
          if (!user) {
            requireAuth("Sign in to like posts.");
            return;
          }

          await togglePostLike(targetPost.id, user.id, alreadyLiked);
          await loadPage({ showLoading: false });
        }}
        onShare={async (targetPost, alreadyShared) => {
          if (user && !alreadyShared) {
            await recordPostShare(targetPost.id, user.id);
          }

          if (user) {
            await loadPage({ showLoading: false });
          }
        }}
        onVotePoll={async (targetPost, optionIndex) => {
          if (!user) {
            requireAuth("Sign in to vote in polls.");
            return;
          }

          await voteOnPoll(targetPost.id, user.id, optionIndex);
          await loadPage({ showLoading: false });
        }}
        onAddComment={async (targetPostId, content, parentCommentId) => {
          if (!user) {
            requireAuth("Sign in to comment on posts.");
            return;
          }

          aiReplyWatchAttemptsRef.current = 0;
          await createComment({ postId: targetPostId, authorId: user.id, content, parentCommentId });
          await loadPage({ showLoading: false });
        }}
        onDeletePost={async (targetPostId) => {
          if (!user) {
            requireAuth("Sign in to manage your posts.");
            return;
          }

          await deletePost(targetPostId);
          toast.success("Post deleted.");
          navigate(fallbackPath, { replace: true });
        }}
        onDeleteComment={async (commentId) => {
          if (!user) {
            requireAuth("Sign in to manage your comments.");
            return;
          }

          await deleteComment(commentId);
          toast.success("Comment deleted.");
          await loadPage({ showLoading: false });
        }}
        onToggleFollow={async (targetUserId, alreadyFollowing) => {
          if (!user) {
            requireAuth("Sign in to follow students.");
            return;
          }

          await toggleFollow(user.id, targetUserId, alreadyFollowing);
          await loadPage({ showLoading: false });
        }}
      />
    </section>
  );
}
