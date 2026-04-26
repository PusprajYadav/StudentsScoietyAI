import { BookOpen } from "lucide-react";
import type { RefObject } from "react";
import { PostCard } from "../../components/PostCard";
import { useThemeStore } from "../../store/themeStore";
import type { PostWithRelations } from "../../types/database";
import { normalizeCommunityColor, withAppThemeAlpha, withCommunityAlpha } from "./communityTheme";

interface CommunityFeedProps {
  loading: boolean;
  loadingMore: boolean;
  hasMore: boolean;
  loadMoreRef: RefObject<HTMLDivElement | null>;
  posts: PostWithRelations[];
  title?: string;
  emptyCommunityName: string;
  emptyTitle?: string;
  emptyDescription?: string;
  compactEmptyState?: boolean;
  accentColor?: string;
  currentUserId: string;
  followingIds: Set<string>;
  onToggleLike: (post: PostWithRelations, alreadyLiked: boolean) => Promise<void>;
  onShare: (post: PostWithRelations, alreadyShared: boolean) => Promise<void>;
  onVotePoll: (post: PostWithRelations, optionIndex: number) => Promise<void>;
  onAddComment: (postId: string, content: string, parentCommentId?: string | null) => Promise<void>;
  onDeletePost: (postId: string) => Promise<void>;
  onDeleteComment: (commentId: string) => Promise<void>;
  onToggleFollow: (targetUserId: string, alreadyFollowing: boolean) => Promise<void>;
  highlightedPostId?: string | null;
}

export function CommunityFeed({
  loading,
  loadingMore,
  hasMore,
  loadMoreRef,
  posts,
  title = "Feed",
  emptyCommunityName,
  emptyTitle,
  emptyDescription,
  compactEmptyState = false,
  accentColor,
  currentUserId,
  followingIds,
  onToggleLike,
  onShare,
  onVotePoll,
  onAddComment,
  onDeletePost,
  onDeleteComment,
  onToggleFollow,
  highlightedPostId,
}: CommunityFeedProps) {
  const { resolvedTheme } = useThemeStore();
  const accent = normalizeCommunityColor(accentColor);
  const emptyStateOrbBackground =
    resolvedTheme === "dark"
      ? `radial-gradient(circle at 30% 25%, ${withCommunityAlpha(accent, 0.22)}, rgba(15,23,42,0.96) 42%, rgba(2,6,23,0.98) 100%)`
      : `radial-gradient(circle at 30% 25%, ${withAppThemeAlpha("app-card", 0.95)}, ${withAppThemeAlpha("app-card", 0.82)} 38%, ${withCommunityAlpha(accent, 0.16)} 100%)`;
  const emptyStateGlyphBackground =
    resolvedTheme === "dark"
      ? `linear-gradient(135deg, ${withCommunityAlpha(accent, 0.28)}, rgba(15,23,42,0.9))`
      : `linear-gradient(135deg, ${withCommunityAlpha(accent, 0.18)}, ${withAppThemeAlpha("app-card", 0.72)})`;

  return (
    <section className="min-w-0 space-y-3">
      {title ? (
        <div className="px-1">
          <h2 className="text-[1.3rem] font-semibold tracking-tight text-app-text">{title}</h2>
        </div>
      ) : null}

      {loading ? (
        Array.from({ length: 5 }).map((_, index) => (
          <div key={index} className="surface-card h-44 animate-pulse rounded-[24px]" />
        ))
      ) : posts.length === 0 ? (
        compactEmptyState ? (
          <div className="px-2 py-8 text-center sm:px-3 sm:py-9">
            <div
              className="mx-auto flex h-[5.5rem] w-[5.5rem] items-center justify-center rounded-[28px] border border-app-border/80 shadow-[0_22px_42px_-34px_rgba(15,23,42,0.3)]"
              style={{
                backgroundImage: emptyStateOrbBackground,
                boxShadow: `0 22px 42px -34px ${withCommunityAlpha(accent, 0.44)}`,
              }}
            >
              <div
                className="flex h-16 w-16 items-center justify-center rounded-[22px] border border-app-border/70"
                style={{
                  backgroundImage: emptyStateGlyphBackground,
                  color: accent,
                }}
              >
                <BookOpen className="h-8 w-8" strokeWidth={2.1} />
              </div>
            </div>
            <p className="mt-5 font-display text-[1.6rem] font-bold tracking-tight text-app-text">
              {emptyTitle || "No community posts yet."}
            </p>
            <p className="mx-auto mt-2 max-w-[18rem] text-[0.9rem] leading-6 text-app-muted">
              {emptyDescription || `Start the first post inside ${emptyCommunityName}.`}
            </p>
          </div>
        ) : (
          <div className="surface-card rounded-[28px] p-10 text-center">
            <p className="font-display text-2xl font-semibold">{emptyTitle || "No community posts yet."}</p>
            <p className="mt-2 text-sm text-app-muted">
              {emptyDescription || `Start the first post inside ${emptyCommunityName}.`}
            </p>
          </div>
        )
      ) : (
        posts.map((post) => (
          <div key={post.id}>
            <PostCard
              post={post}
              currentUserId={currentUserId}
              followingIds={followingIds}
              variant="community"
              accentColor={accent}
              hideCommunityChip
              onToggleLike={onToggleLike}
              onShare={onShare}
              onVotePoll={onVotePoll}
              onAddComment={onAddComment}
              onDeletePost={onDeletePost}
              onDeleteComment={onDeleteComment}
              onToggleFollow={onToggleFollow}
              highlighted={highlightedPostId === post.id}
            />
          </div>
        ))
      )}

      {!loading && hasMore ? <div ref={loadMoreRef} className="h-1 w-full" aria-hidden="true" /> : null}

      {loadingMore ? (
        <div className="space-y-3">
          {Array.from({ length: 2 }).map((_, index) => (
            <div key={`community-more-${index}`} className="surface-card h-32 animate-pulse rounded-[24px]" />
          ))}
        </div>
      ) : null}
    </section>
  );
}
