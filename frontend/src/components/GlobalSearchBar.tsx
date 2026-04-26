import { Loader2, Search } from "lucide-react";
import { useDeferredValue, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { getDiscussionKindLabel } from "../data/discussions";
import { searchUsersAndPosts } from "../lib/api";
import { buildAvatarSeed, resolveAvatarUrl } from "../lib/avatar";
import { formatRelativeTime } from "../lib/formatting";
import { getPostPath } from "../lib/postLinks";
import type { SearchResults } from "../types/database";
import { VerifiedBadge } from "./VerifiedBadge";

interface GlobalSearchBarProps {
  className?: string;
  placeholder?: string;
  value?: string;
  onValueChange?: (value: string) => void;
  hideResults?: boolean;
  compact?: boolean;
}

export function GlobalSearchBar({
  className = "",
  placeholder = "Search users or posts",
  value,
  onValueChange,
  hideResults = false,
  compact = false,
}: GlobalSearchBarProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [internalQuery, setInternalQuery] = useState("");
  const query = value ?? internalQuery;
  const deferredQuery = useDeferredValue(query);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<SearchResults>({ users: [], posts: [] });
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (hideResults) {
      setResults({ users: [], posts: [] });
      setLoading(false);
      return;
    }

    if (deferredQuery.trim().length < 2) {
      setResults({ users: [], posts: [] });
      setLoading(false);
      return;
    }

    let active = true;
    setLoading(true);

    void searchUsersAndPosts(deferredQuery, { limit: 6 }).then(
      (payload) => {
        if (!active) return;
        setResults(payload);
      },
      () => {
        if (!active) return;
        setResults({ users: [], posts: [] });
      }
    ).finally(() => {
      if (active) {
        setLoading(false);
      }
    });

    return () => {
      active = false;
    };
  }, [deferredQuery, hideResults]);

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    window.addEventListener("mousedown", handlePointerDown);
    return () => window.removeEventListener("mousedown", handlePointerDown);
  }, []);

  const hasResults = results.users.length > 0 || results.posts.length > 0;
  const iconClassName = compact ? "left-3.5" : "left-4";
  const inputClassName = compact
    ? "input-shell h-10 w-full rounded-[20px] py-0 pl-10 pr-10 sm:rounded-[22px] sm:pl-11 sm:pr-11"
    : "input-shell w-full pl-11 pr-11";
  const spinnerClassName = compact ? "right-3.5" : "right-4";

  return (
    <div ref={containerRef} className={`relative w-full max-w-xl ${className}`.trim()}>
      <div className="relative">
        <Search
          className={`pointer-events-none absolute top-1/2 h-4 w-4 -translate-y-1/2 text-app-muted ${iconClassName}`}
        />
        <input
          value={query}
          onFocus={() => setOpen(true)}
          onChange={(event) => {
            if (value === undefined) {
              setInternalQuery(event.target.value);
            }
            onValueChange?.(event.target.value);
            setOpen(true);
          }}
          placeholder={placeholder}
          className={inputClassName}
        />
        {loading ? (
          <Loader2
            className={`absolute top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-brand ${spinnerClassName}`}
          />
        ) : null}
      </div>

      {!hideResults && open && query.trim().length >= 2 ? (
        <div className="absolute inset-x-0 top-[calc(100%+0.75rem)] z-50 rounded-[28px] border border-app-border bg-app-card p-4 shadow-2xl">
          {!hasResults && !loading ? (
            <p className="text-sm text-app-muted">No users or posts match your search yet.</p>
          ) : null}

          {results.users.length > 0 ? (
            <div>
              <p className="px-2 text-xs font-semibold uppercase tracking-[0.18em] text-app-muted">People</p>
              <div className="mt-2 space-y-2">
                {results.users.map((user) => (
                  <Link
                    key={user.id}
                    to={`/profile/${user.username}`}
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-3 rounded-2xl px-3 py-3 transition hover:bg-app-secondary"
                  >
                    <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-2xl bg-brand/10 text-brand">
                      <img
                        src={resolveAvatarUrl(user.avatar_url, buildAvatarSeed(user), user.updated_at)}
                        alt={user.username}
                        className="h-full w-full object-cover"
                      />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-app-text">
                        <span className="inline-flex items-center gap-1.5">
                          <span>{user.full_name || user.username}</span>
                          {user.is_verified ? <VerifiedBadge /> : null}
                        </span>
                      </p>
                      <p className="truncate text-sm text-app-muted">@{user.username}</p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          ) : null}

          {results.posts.length > 0 ? (
            <div className={results.users.length > 0 ? "mt-4 border-t border-app-border pt-4" : ""}>
              <p className="px-2 text-xs font-semibold uppercase tracking-[0.18em] text-app-muted">Posts</p>
              <div className="mt-2 space-y-2">
                {results.posts.map((post) => {
                  const authorHidden = post.is_anonymous;

                  return (
                    <Link
                      key={post.id}
                      to={getPostPath(post)}
                      onClick={() => setOpen(false)}
                      className="block rounded-2xl px-3 py-3 transition hover:bg-app-secondary"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold text-app-text">{post.title}</p>
                        <span className="rounded-full bg-app-secondary px-2 py-1 text-[10px] tracking-[0.12em] text-app-muted">
                          {getDiscussionKindLabel(post.discussion_kind)}
                        </span>
                        {authorHidden ? (
                          <span className="rounded-full bg-brand/10 px-2 py-1 text-[10px] uppercase tracking-[0.12em] text-brand">
                            Anonymous
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-1 line-clamp-2 text-sm text-app-muted">{post.content || "Media post"}</p>
                      <p className="mt-2 text-xs text-app-muted">
                        {!authorHidden && post.author?.username ? (
                          <span className="inline-flex items-center gap-1">
                            <span>@{post.author.username}</span>
                            {post.author.is_verified ? <VerifiedBadge className="h-3.5 w-3.5" /> : null}
                            <span>·</span>
                          </span>
                        ) : null}
                        {formatRelativeTime(post.created_at)}
                      </p>
                    </Link>
                  );
                })}
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
