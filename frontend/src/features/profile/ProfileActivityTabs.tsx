import { Loader2, Search, Trash2 } from "lucide-react";
import { useState, type RefObject } from "react";
import { Link } from "react-router-dom";
import { UserListCard } from "../../components/UserListCard";
import { PostCard } from "../../components/PostCard";
import { getPostCommentPath } from "../../lib/postLinks";
import type { CommentWithAuthor, PostWithRelations, ProfileRow } from "../../types/database";

export type ProfileView = "posts" | "comments" | "followers" | "following";

interface ProfileActivityTabsProps {
  id?: string;
  activeView: ProfileView;
  onViewChange: (view: ProfileView) => void;
  postsLoading: boolean;
  commentsLoading: boolean;
  followersLoading: boolean;
  followingLoading: boolean;
  hasMore: boolean;
  loadingMore: boolean;
  loadMoreRef: RefObject<HTMLDivElement | null>;
  posts: PostWithRelations[];
  comments: CommentWithAuthor[];
  followers: ProfileRow[];
  following: ProfileRow[];
  currentUserId: string;
  currentFollowingIds: Set<string>;
  onToggleLike: (post: PostWithRelations, alreadyLiked: boolean) => Promise<void>;
  onShare: (post: PostWithRelations, alreadyShared: boolean) => Promise<void>;
  onVotePoll: (post: PostWithRelations, optionIndex: number) => Promise<void>;
  onAddComment: (postId: string, content: string, parentCommentId?: string | null) => Promise<void>;
  onDeletePost: (postId: string) => Promise<void>;
  onDeleteComment: (commentId: string) => Promise<void>;
  onToggleFollow: (targetUserId: string, alreadyFollowing: boolean) => Promise<void>;
  onDeleteOwnComment: (commentId: string) => Promise<void>;
}

export function ProfileActivityTabs({
  id,
  activeView,
  onViewChange,
  postsLoading,
  commentsLoading,
  followersLoading,
  followingLoading,
  hasMore,
  loadingMore,
  loadMoreRef,
  posts,
  comments,
  followers,
  following,
  currentUserId,
  currentFollowingIds,
  onToggleLike,
  onShare,
  onVotePoll,
  onAddComment,
  onDeletePost,
  onDeleteComment,
  onToggleFollow,
  onDeleteOwnComment,
}: ProfileActivityTabsProps) {
  const [networkSearch, setNetworkSearch] = useState("");
  const normalizedNetworkSearch = networkSearch.trim().toLowerCase();
  const filteredFollowers = followers.filter((entry) => {
    if (!normalizedNetworkSearch) {
      return true;
    }

    return [
      entry.username,
      entry.full_name || "",
      entry.headline || "",
      entry.course || "",
      entry.campus || "",
    ]
      .join(" ")
      .toLowerCase()
      .includes(normalizedNetworkSearch);
  });
  const filteredFollowing = following.filter((entry) => {
    if (!normalizedNetworkSearch) {
      return true;
    }

    return [
      entry.username,
      entry.full_name || "",
      entry.headline || "",
      entry.course || "",
      entry.campus || "",
    ]
      .join(" ")
      .toLowerCase()
      .includes(normalizedNetworkSearch);
  });
  const activeLoading =
    activeView === "posts"
      ? postsLoading
      : activeView === "comments"
        ? commentsLoading
        : activeView === "followers"
          ? followersLoading
          : followingLoading;
  const isNetworkView = activeView === "followers" || activeView === "following";
  const activeItemCount =
    activeView === "posts"
      ? posts.length
      : activeView === "comments"
        ? comments.length
        : activeView === "followers"
          ? followers.length
          : following.length;
  const showLoadingSpinner = loadingMore || (activeLoading && activeItemCount > 0);

  return (
    <section id={id} className="min-w-0">
      <div className="-mx-1 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [-ms-overflow-style:none]">
        <div className="flex min-w-max items-center gap-2">
          {(["posts", "comments", "followers", "following"] as ProfileView[]).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => onViewChange(tab)}
              className={`rounded-full px-4 py-2.5 text-sm font-semibold capitalize leading-none transition sm:px-5 sm:py-3 ${
                activeView === tab ? "bg-brand text-white shadow-lg shadow-brand/15" : "bg-app-secondary text-app-muted"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {isNetworkView ? (
        <div className="mt-4 max-w-xl">
          <label className="relative block">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-app-muted" />
            <input
              value={networkSearch}
              onChange={(event) => setNetworkSearch(event.target.value)}
              className="input-shell w-full pl-11"
              placeholder={
                activeView === "followers"
                  ? "Search followers by username or profile"
                  : "Search following by username or profile"
              }
            />
          </label>
        </div>
      ) : null}

      <div className="mt-4">
        {activeView === "posts" ? (
          <div className="space-y-4">
            {postsLoading ? (
              Array.from({ length: 5 }).map((_, index) => (
                <div key={`profile-post-skeleton-${index}`} className="surface-card h-44 animate-pulse rounded-[28px]" />
              ))
            ) : posts.length === 0 ? (
              <p className="text-sm text-app-muted">No posts to show yet.</p>
            ) : (
              posts.map((post) => (
                <PostCard
                  key={post.id}
                  post={post}
                  currentUserId={currentUserId}
                  followingIds={currentFollowingIds}
                  onToggleLike={onToggleLike}
                  onShare={onShare}
                  onVotePoll={onVotePoll}
                  onAddComment={onAddComment}
                  onDeletePost={onDeletePost}
                  onDeleteComment={onDeleteComment}
                  onToggleFollow={onToggleFollow}
                />
              ))
            )}
          </div>
        ) : null}

        {activeView === "comments" ? (
          <div className="space-y-3">
            {commentsLoading ? (
              Array.from({ length: 5 }).map((_, index) => (
                <div
                  key={`profile-comment-skeleton-${index}`}
                  className="rounded-[18px] border border-app-border bg-app-secondary/60 p-4 animate-pulse sm:rounded-[24px] sm:p-5"
                >
                  <div className="h-4 w-20 rounded-full bg-app-card/70" />
                  <div className="mt-3 h-5 w-40 rounded-full bg-app-card/70" />
                  <div className="mt-3 h-12 rounded-2xl bg-app-card/70" />
                </div>
              ))
            ) : comments.length === 0 ? (
              <p className="text-sm text-app-muted">No comments to show yet.</p>
            ) : (
              comments.map((comment) => (
                <article
                  key={comment.id}
                  className="rounded-[18px] border border-app-border bg-app-secondary/60 p-2.5 sm:rounded-[24px] sm:p-5"
                >
                  <div className="flex items-start justify-between gap-2">
                    {comment.post?.id ? (
                      <Link
                        to={getPostCommentPath(comment.post.id, comment.id)}
                        className="min-w-0 flex-1 rounded-[16px] transition hover:opacity-90"
                      >
                        <p className="text-[9px] uppercase tracking-[0.12em] text-brand sm:text-xs sm:tracking-[0.18em]">
                          {(comment.post.visibility_scope || "discussion").replace("_", " ")}
                        </p>
                        <p className="mt-1 font-display text-sm font-semibold sm:mt-2 sm:text-xl">
                          {comment.post.title || "Untitled post"}
                        </p>
                        <p className="mt-1 whitespace-pre-wrap text-[10px] leading-4 text-app-muted sm:mt-3 sm:text-sm sm:leading-7">
                          {comment.content}
                        </p>
                      </Link>
                    ) : (
                      <div className="min-w-0 flex-1">
                        <p className="text-[9px] uppercase tracking-[0.12em] text-brand sm:text-xs sm:tracking-[0.18em]">
                          discussion
                        </p>
                        <p className="mt-1 font-display text-sm font-semibold sm:mt-2 sm:text-xl">
                          Untitled post
                        </p>
                        <p className="mt-1 whitespace-pre-wrap text-[10px] leading-4 text-app-muted sm:mt-3 sm:text-sm sm:leading-7">
                          {comment.content}
                        </p>
                      </div>
                    )}

                    {comment.author_id === currentUserId ? (
                      <button
                        type="button"
                        onClick={() => void onDeleteOwnComment(comment.id)}
                        className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-rose-500/10 text-rose-500 sm:h-9 sm:w-9"
                        aria-label="Delete comment"
                        title="Delete comment"
                      >
                        <Trash2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                      </button>
                    ) : null}
                  </div>
                </article>
              ))
            )}
          </div>
        ) : null}

        {activeView === "followers" ? (
          <div className="grid gap-3 md:grid-cols-2">
            {followersLoading ? (
              Array.from({ length: 5 }).map((_, index) => (
                <div
                  key={`profile-follower-skeleton-${index}`}
                  className="rounded-[20px] border border-app-border bg-app-secondary/60 p-4 animate-pulse sm:rounded-[24px] sm:p-5"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-app-card/70 sm:h-12 sm:w-12 sm:rounded-2xl" />
                    <div className="min-w-0 flex-1 space-y-2">
                      <div className="h-4 w-32 rounded-full bg-app-card/70" />
                      <div className="h-3 w-24 rounded-full bg-app-card/70" />
                    </div>
                  </div>
                </div>
              ))
            ) : followers.length === 0 ? (
              <p className="text-sm text-app-muted">No followers yet.</p>
            ) : filteredFollowers.length === 0 ? (
              <p className="text-sm text-app-muted">No followers match your search.</p>
            ) : (
              filteredFollowers.map((entry) => (
                <UserListCard
                  key={entry.id}
                  profile={entry}
                  action={
                    entry.id === currentUserId ? null : (
                      <button
                        type="button"
                        onClick={() => void onToggleFollow(entry.id, currentFollowingIds.has(entry.id))}
                        className={`rounded-full px-3 py-1.5 text-[11px] font-semibold sm:px-4 sm:py-2 sm:text-sm ${
                          currentFollowingIds.has(entry.id)
                            ? "bg-app-secondary text-app-text"
                            : "bg-brand text-white"
                        }`}
                      >
                        {currentFollowingIds.has(entry.id) ? "Following" : "Follow"}
                      </button>
                    )
                  }
                />
              ))
            )}
          </div>
        ) : null}

        {activeView === "following" ? (
          <div className="grid gap-3 md:grid-cols-2">
            {followingLoading ? (
              Array.from({ length: 5 }).map((_, index) => (
                <div
                  key={`profile-following-skeleton-${index}`}
                  className="rounded-[20px] border border-app-border bg-app-secondary/60 p-4 animate-pulse sm:rounded-[24px] sm:p-5"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-app-card/70 sm:h-12 sm:w-12 sm:rounded-2xl" />
                    <div className="min-w-0 flex-1 space-y-2">
                      <div className="h-4 w-32 rounded-full bg-app-card/70" />
                      <div className="h-3 w-24 rounded-full bg-app-card/70" />
                    </div>
                  </div>
                </div>
              ))
            ) : following.length === 0 ? (
              <p className="text-sm text-app-muted">Not following anyone yet.</p>
            ) : filteredFollowing.length === 0 ? (
              <p className="text-sm text-app-muted">No following profiles match your search.</p>
            ) : (
              filteredFollowing.map((entry) => (
                <UserListCard
                  key={entry.id}
                  profile={entry}
                  action={
                    entry.id === currentUserId ? null : (
                      <button
                        type="button"
                        onClick={() => void onToggleFollow(entry.id, currentFollowingIds.has(entry.id))}
                        className={`rounded-full px-3 py-1.5 text-[11px] font-semibold sm:px-4 sm:py-2 sm:text-sm ${
                          currentFollowingIds.has(entry.id)
                            ? "bg-app-secondary text-app-text"
                            : "bg-brand text-white"
                        }`}
                      >
                        {currentFollowingIds.has(entry.id) ? "Following" : "Follow"}
                      </button>
                    )
                  }
                />
              ))
            )}
          </div>
        ) : null}

        {!activeLoading && hasMore ? <div ref={loadMoreRef} className="mt-4 h-1 w-full" aria-hidden="true" /> : null}

        {showLoadingSpinner ? (
          <div className="mt-4 flex items-center justify-center">
            <div
              className="inline-flex items-center gap-3 rounded-full border border-app-border bg-app-secondary/75 px-4 py-2.5 text-sm text-app-muted shadow-sm"
              aria-live="polite"
            >
              <Loader2 className="h-4 w-4 animate-spin text-brand" />
              <span>
                {loadingMore
                  ? `Loading more ${activeView}...`
                  : `Loading ${activeView}...`}
              </span>
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}
