import { Loader2, Search } from "lucide-react";
import { useDeferredValue, useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { VerifiedBadge } from "../components/VerifiedBadge";
import { getDiscussionKindLabel } from "../data/discussions";
import { searchUsersAndPosts, loadRecentProfiles } from "../lib/api";
import { buildAvatarSeed, resolveAvatarUrl } from "../lib/avatar";
import { formatRelativeTime } from "../lib/formatting";
import { getPostPath } from "../lib/postLinks";
import { useAuthStore } from "../store/authStore";
import type { ProfileRow, SearchResults } from "../types/database";

type SearchTab = "all" | "users" | "posts";

export function SearchPage() {
  const { user } = useAuthStore();
  const [searchParams, setSearchParams] = useSearchParams();
  const [query, setQuery] = useState(searchParams.get("q") || "");
  const [activeTab, setActiveTab] = useState<SearchTab>("all");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<SearchResults>({ users: [], posts: [] });
  const [recentProfiles, setRecentProfiles] = useState<ProfileRow[]>([]);
  const deferredQuery = useDeferredValue(query);

  useEffect(() => {
    setQuery(searchParams.get("q") || "");
  }, [searchParams]);

  useEffect(() => {
    let cancelled = false;

    void loadRecentProfiles(user?.id, { limit: 10 }).then((profiles) => {
      if (!cancelled) {
        setRecentProfiles(profiles);
      }
    }).catch(() => {
      if (!cancelled) {
        setRecentProfiles([]);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  useEffect(() => {
    const normalized = deferredQuery.trim();

    if (normalized.length < 2) {
      setResults({ users: [], posts: [] });
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    void searchUsersAndPosts(normalized, { limit: 12 }).then((payload) => {
      if (!cancelled) {
        setResults(payload);
      }
    }).catch(() => {
      if (!cancelled) {
        setResults({ users: [], posts: [] });
      }
    }).finally(() => {
      if (!cancelled) {
        setLoading(false);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [deferredQuery]);

  const showUsers = activeTab === "all" || activeTab === "users";
  const showPosts = activeTab === "all" || activeTab === "posts";
  const hasQuery = query.trim().length >= 2;

  return (
    <div className="native-page">
      <section className="native-card p-4">
        <label className="relative block">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-app-muted" />
          <input
            value={query}
            onChange={(event) => {
              const nextValue = event.target.value;
              setQuery(nextValue);
              const nextParams = new URLSearchParams(searchParams);
              if (nextValue.trim()) {
                nextParams.set("q", nextValue);
              } else {
                nextParams.delete("q");
              }
              setSearchParams(nextParams, { replace: true });
            }}
            placeholder="Search users or posts"
            className="w-full rounded-[22px] border border-app-border bg-app-card px-12 py-3.5 text-base text-app-text outline-none transition placeholder:text-app-muted focus:border-brand/25 focus:ring-4 focus:ring-brand/10"
          />
          {loading ? <Loader2 className="absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-brand" /> : null}
        </label>

        <div className="native-segmented mt-4">
          <div className="grid grid-cols-3 gap-1">
            {(["all", "users", "posts"] as SearchTab[]).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`rounded-[14px] px-3 py-2.5 text-sm font-semibold transition ${
                  activeTab === tab
                    ? "bg-white text-app-text shadow-sm dark:bg-slate-950/80 dark:text-slate-100 dark:shadow-[0_10px_24px_-18px_rgba(2,6,23,0.85)]"
                    : "text-app-muted"
                }`}
              >
                {tab === "all" ? "All" : tab === "users" ? "Users" : "Posts"}
              </button>
            ))}
          </div>
        </div>
      </section>

      {!hasQuery ? (
        <section className="space-y-3">
          <div>
            <h2 className="font-display text-lg font-bold tracking-tight text-app-text sm:text-[1.05rem]">Recent joined users</h2>
          </div>

          <div className="grid gap-3">
            {recentProfiles.map((profile) => (
              <Link key={profile.id} to={`/profile/${profile.username}`} className="native-card flex items-center gap-3 p-3.5">
                <div className="h-12 w-12 overflow-hidden rounded-full bg-brand/10">
                  <img
                    src={resolveAvatarUrl(profile.avatar_url, buildAvatarSeed(profile), profile.updated_at)}
                    alt={profile.username}
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="min-w-0">
                  <p className="truncate font-semibold text-app-text">
                    <span className="inline-flex items-center gap-1.5">
                      <span>{profile.full_name || profile.username}</span>
                      {profile.is_verified ? <VerifiedBadge /> : null}
                    </span>
                  </p>
                  <p className="truncate text-sm text-app-muted">@{profile.username}</p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      {hasQuery && showUsers ? (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-[1.2rem] font-bold tracking-tight text-app-text">Users</h2>
            <p className="text-xs text-app-muted">{results.users.length} found</p>
          </div>
          <div className="grid gap-3">
            {results.users.length > 0 ? results.users.map((profile) => (
              <Link key={profile.id} to={`/profile/${profile.username}`} className="native-card flex items-center gap-3 p-3.5">
                <div className="h-12 w-12 overflow-hidden rounded-full bg-brand/10">
                  <img
                    src={resolveAvatarUrl(profile.avatar_url, buildAvatarSeed(profile), profile.updated_at)}
                    alt={profile.username}
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="min-w-0">
                  <p className="truncate font-semibold text-app-text">
                    <span className="inline-flex items-center gap-1.5">
                      <span>{profile.full_name || profile.username}</span>
                      {profile.is_verified ? <VerifiedBadge /> : null}
                    </span>
                  </p>
                  <p className="truncate text-sm text-app-muted">@{profile.username}</p>
                </div>
              </Link>
            )) : (
              <div className="native-card px-4 py-5 text-sm text-app-muted">No users matched that search.</div>
            )}
          </div>
        </section>
      ) : null}

      {hasQuery && showPosts ? (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-[1.2rem] font-bold tracking-tight text-app-text">Posts</h2>
            <p className="text-xs text-app-muted">{results.posts.length} found</p>
          </div>
          <div className="grid gap-3">
            {results.posts.length > 0 ? results.posts.map((post) => (
              <Link key={post.id} to={getPostPath(post)} className="native-card block p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-semibold text-app-text">{post.title}</p>
                  <span className="rounded-full bg-app-secondary px-2 py-1 text-[10px] font-medium text-app-muted">
                    {getDiscussionKindLabel(post.discussion_kind)}
                  </span>
                </div>
                <p className="mt-2 line-clamp-2 text-sm text-app-muted">{post.content || "Media post"}</p>
                <p className="mt-2 text-xs text-app-muted">
                  {post.author?.username ? `@${post.author.username} · ` : ""}
                  {formatRelativeTime(post.created_at)}
                </p>
              </Link>
            )) : (
              <div className="native-card px-4 py-5 text-sm text-app-muted">No posts matched that search.</div>
            )}
          </div>
        </section>
      ) : null}
    </div>
  );
}
