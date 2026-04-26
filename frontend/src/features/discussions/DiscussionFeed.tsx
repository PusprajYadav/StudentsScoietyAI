import { useMemo, type RefObject } from "react";
import { PostCard } from "../../components/PostCard";
import type { PostWithRelations } from "../../types/database";
import {
  DiscussionDiscoveryPanel,
  type DiscoveryProfileEntry,
} from "./DiscussionDiscoveryPanel";

interface DiscussionFeedProps {
  loading: boolean;
  loadingMore: boolean;
  hasMore: boolean;
  loadMoreRef: RefObject<HTMLDivElement | null>;
  posts: PostWithRelations[];
  emptyKindLabel: string;
  emptyTitle?: string;
  emptyDescription?: string;
  currentUserId: string;
  followingIds: Set<string>;
  recentProfiles: DiscoveryProfileEntry[];
  suggestedProfiles: DiscoveryProfileEntry[];
  onToggleLike: (post: PostWithRelations, alreadyLiked: boolean) => Promise<void>;
  onShare: (post: PostWithRelations, alreadyShared: boolean) => Promise<void>;
  onVotePoll: (post: PostWithRelations, optionIndex: number) => Promise<void>;
  onAddComment: (postId: string, content: string, parentCommentId?: string | null) => Promise<void>;
  onDeletePost: (postId: string) => Promise<void>;
  onDeleteComment: (commentId: string) => Promise<void>;
  onToggleFollow: (targetUserId: string, alreadyFollowing: boolean) => Promise<void>;
  highlightedPostId?: string | null;
}

export function DiscussionFeed({
  loading,
  loadingMore,
  hasMore,
  loadMoreRef,
  posts,
  emptyKindLabel,
  emptyTitle,
  emptyDescription,
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
  recentProfiles,
  suggestedProfiles,
}: DiscussionFeedProps) {
  const insertionPlan = useMemo(() => {
    const totalPosts = posts.length;

    if (totalPosts < 3) {
      return { recentAfter: null as number | null, suggestedAfter: null as number | null };
    }

    const seedInput = `${currentUserId}:${emptyKindLabel}:${totalPosts}`;
    let hash = 0;
    for (let index = 0; index < seedInput.length; index += 1) {
      hash = (hash * 33 + seedInput.charCodeAt(index)) >>> 0;
    }

    const firstGap = 3 + (hash % 3);
    const secondGap = 3 + ((hash >> 3) % 3);

    const recentAfter = recentProfiles.length > 0 ? Math.min(totalPosts, firstGap) : null;
    const nextStart = recentAfter || firstGap;
    let suggestedAfter = suggestedProfiles.length > 0 ? Math.min(totalPosts, nextStart + secondGap) : null;

    if (suggestedAfter && recentAfter && suggestedAfter <= recentAfter) {
      suggestedAfter = Math.min(totalPosts, recentAfter + 3);
    }

    return { recentAfter, suggestedAfter };
  }, [currentUserId, emptyKindLabel, posts.length, recentProfiles.length, suggestedProfiles.length]);

  return (
    <section className="min-w-0 space-y-4">
      {loading ? (
        Array.from({ length: 5 }).map((_, index) => (
          <div key={index} className="surface-card h-56 animate-pulse rounded-[28px]" />
        ))
      ) : posts.length === 0 ? (
        <div className="surface-card rounded-[28px] p-10 text-center">
          <p className="font-display text-2xl font-semibold">
            {emptyTitle || `No posts yet in ${emptyKindLabel}.`}
          </p>
          <p className="mt-2 text-sm text-app-muted">
            {emptyDescription || "Be the first student to start the conversation."}
          </p>
        </div>
      ) : (
        posts.map((post, index) => (
          <div key={post.id} className="space-y-4">
            <PostCard
              post={post}
              currentUserId={currentUserId}
              followingIds={followingIds}
              onToggleLike={onToggleLike}
              onShare={onShare}
              onVotePoll={onVotePoll}
              onAddComment={onAddComment}
              onDeletePost={onDeletePost}
              onDeleteComment={onDeleteComment}
              onToggleFollow={onToggleFollow}
              highlighted={highlightedPostId === post.id}
            />

            {insertionPlan.recentAfter === index + 1 ? (
              <div className="md:hidden">
                <DiscussionDiscoveryPanel
                  title="Recently joined"
                  entries={recentProfiles.slice(0, 3)}
                  currentUserId={currentUserId}
                  currentFollowingIds={followingIds}
                  onToggleFollow={onToggleFollow}
                  kind="recent"
                  compact
                />
              </div>
            ) : null}

            {insertionPlan.suggestedAfter === index + 1 ? (
              <div className="md:hidden">
                <DiscussionDiscoveryPanel
                  title="Follow suggestions"
                  entries={suggestedProfiles.slice(0, 3)}
                  currentUserId={currentUserId}
                  currentFollowingIds={followingIds}
                  onToggleFollow={onToggleFollow}
                  kind="suggested"
                  compact
                />
              </div>
            ) : null}
          </div>
        ))
      )}

      {!loading && hasMore ? <div ref={loadMoreRef} className="h-1 w-full" aria-hidden="true" /> : null}

      {loadingMore ? (
        <div className="space-y-4">
          {Array.from({ length: 2 }).map((_, index) => (
            <div key={`discussion-more-${index}`} className="surface-card h-40 animate-pulse rounded-[28px]" />
          ))}
        </div>
      ) : null}
    </section>
  );
}
