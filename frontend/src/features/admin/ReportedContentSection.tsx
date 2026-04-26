import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { AdminPagination } from "./AdminPagination";
import { VerifiedBadge } from "../../components/VerifiedBadge";
import { getDiscussionKindLabel } from "../../data/discussions";
import { formatDateTime } from "../../lib/formatting";
import { getPostPath } from "../../lib/postLinks";
import {
  getPostReportReasonLabel,
  getPostReportStatusLabel,
} from "../../lib/postReports";
import type { PostReportStatus, PostReportWithRelations } from "../../types/database";

interface ReportedContentSectionProps {
  loading: boolean;
  searchTerm: string;
  reports: PostReportWithRelations[];
  onResolveReports: (
    postId: string,
    input: {
      nextStatus: PostReportStatus;
      adminNote?: string | null;
    }
  ) => Promise<void>;
  onToggleVisibility: (postId: string) => Promise<void>;
  onDeletePost: (postId: string) => Promise<void>;
}

interface ReportedPostGroup {
  postId: string;
  post: PostReportWithRelations["post"];
  reports: PostReportWithRelations[];
  openCount: number;
}

const REPORTED_CONTENT_PAGE_SIZE = 5;

function getReportStatusBadge(status: PostReportStatus) {
  switch (status) {
    case "actioned":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    case "dismissed":
      return "border-slate-200 bg-slate-100 text-slate-600";
    default:
      return "border-rose-200 bg-rose-50 text-rose-700";
  }
}

export function ReportedContentSection({
  loading,
  searchTerm,
  reports,
  onResolveReports,
  onToggleVisibility,
  onDeletePost,
}: ReportedContentSectionProps) {
  const [busyPostId, setBusyPostId] = useState<string | null>(null);
  const [noteDrafts, setNoteDrafts] = useState<Record<string, string>>({});
  const [page, setPage] = useState(1);

  const groupedReports = useMemo(() => {
    const groups = new Map<string, ReportedPostGroup>();

    reports.forEach((report) => {
      const key = report.post_id;
      const existing = groups.get(key);

      if (existing) {
        existing.reports.push(report);
        if (report.status === "open") {
          existing.openCount += 1;
        }
        return;
      }

      groups.set(key, {
        postId: key,
        post: report.post || null,
        reports: [report],
        openCount: report.status === "open" ? 1 : 0,
      });
    });

    return Array.from(groups.values()).sort((left, right) => {
      if (left.openCount !== right.openCount) {
        return right.openCount - left.openCount;
      }

      const leftCreatedAt = left.reports[0]?.created_at || "";
      const rightCreatedAt = right.reports[0]?.created_at || "";
      return rightCreatedAt.localeCompare(leftCreatedAt);
    });
  }, [reports]);

  useEffect(() => {
    setNoteDrafts((current) =>
      Object.fromEntries(
        groupedReports.map((group) => {
          const existingDraft = current[group.postId];
          const lastAdminNote =
            group.reports.find((report) => report.admin_note)?.admin_note || "";
          return [group.postId, existingDraft ?? lastAdminNote];
        })
      )
    );
  }, [groupedReports]);

  const normalizedSearch = searchTerm.trim().toLowerCase();
  const filteredGroups = useMemo(() => {
    if (!normalizedSearch) {
      return groupedReports;
    }

    return groupedReports.filter((group) =>
      [
        group.post?.title || "",
        group.post?.content || "",
        group.post?.author?.username || "",
        group.post?.author?.full_name || "",
        group.post?.community?.name || "",
        ...group.reports.flatMap((report) => [
          report.reporter?.username || "",
          report.reporter?.full_name || "",
          report.details || "",
          report.reason,
          report.status,
        ]),
      ]
        .join(" ")
        .toLowerCase()
        .includes(normalizedSearch)
    );
  }, [groupedReports, normalizedSearch]);
  const pagedGroups = useMemo(() => {
    const start = (page - 1) * REPORTED_CONTENT_PAGE_SIZE;
    return filteredGroups.slice(start, start + REPORTED_CONTENT_PAGE_SIZE);
  }, [filteredGroups, page]);

  useEffect(() => {
    setPage(1);
  }, [normalizedSearch, reports]);

  return (
    <section className="rounded-[18px] border border-slate-200 bg-white p-3 shadow-[0_16px_34px_-32px_rgba(15,23,42,0.2)]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-display text-[15px] font-semibold text-slate-900 sm:text-base">Reported content</p>
          <p className="mt-1 text-[11px] text-slate-500">Search narrows the queue and posts load 5 at a time.</p>
        </div>
        <p className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-semibold text-slate-600">
          {filteredGroups.length} post{filteredGroups.length === 1 ? "" : "s"}
        </p>
      </div>

      <div className="mt-3 space-y-2.5">
        {loading ? (
          <div className="rounded-[14px] border border-slate-200 bg-slate-50 px-4 py-5 text-sm text-slate-500">
            Loading reported content...
          </div>
        ) : filteredGroups.length === 0 ? (
          <div className="rounded-[14px] border border-slate-200 bg-slate-50 px-4 py-5 text-sm text-slate-500">
            No reported posts match the current search.
          </div>
        ) : (
          pagedGroups.map((group) => {
            const busy = busyPostId === group.postId;
            const reasonCounts = group.reports.reduce<Record<string, number>>((accumulator, report) => {
              const key = report.reason;
              accumulator[key] = (accumulator[key] || 0) + 1;
              return accumulator;
            }, {});

            return (
              <article
                key={group.postId}
                className="rounded-[16px] border border-slate-200 bg-[linear-gradient(135deg,#ffffff,#f8fbff)] p-2.5 shadow-[0_12px_24px_-24px_rgba(15,23,42,0.16)]"
              >
                <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
                  <div className="min-w-0 xl:max-w-4xl">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <p className="truncate font-display text-[15px] font-semibold text-slate-900">
                        {group.post?.title || "Removed post"}
                      </p>
                      {group.post ? (
                        <>
                          <span className="rounded-full bg-slate-100 px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.14em] text-slate-600">
                            {getDiscussionKindLabel(group.post.discussion_kind)}
                          </span>
                          <span className="rounded-full bg-slate-100 px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.14em] text-slate-600">
                            {group.post.moderation_state}
                          </span>
                        </>
                      ) : (
                        <span className="rounded-full bg-slate-100 px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.14em] text-slate-600">
                          Missing post
                        </span>
                      )}
                    </div>

                    <div className="mt-2 flex flex-wrap items-center gap-2 text-[10px] text-slate-500">
                      <span className="rounded-full bg-rose-50 px-2.5 py-1 font-semibold text-rose-700">
                        {group.openCount} open
                      </span>
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 font-semibold text-slate-600">
                        {group.reports.length} total reports
                      </span>
                      {group.post?.community ? (
                        <span
                          className="rounded-full px-2.5 py-1 font-semibold text-white"
                          style={{ backgroundColor: group.post.community.hero_color }}
                        >
                          {group.post.community.name}
                        </span>
                      ) : null}
                      {group.post ? <span>{formatDateTime(group.post.created_at)}</span> : null}
                    </div>

                    {group.post ? (
                      <p className="mt-2 text-[12px] leading-6 text-slate-600">
                        {group.post.content.slice(0, 220) || "No post body text."}
                      </p>
                    ) : null}

                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {Object.entries(reasonCounts).map(([reason, count]) => (
                        <span
                          key={reason}
                          className="rounded-full bg-slate-100 px-2.5 py-1 text-[9px] font-semibold uppercase tracking-[0.14em] text-slate-600"
                        >
                          {getPostReportReasonLabel(reason as PostReportWithRelations["reason"])} x{count}
                        </span>
                      ))}
                    </div>

                    {group.post?.author ? (
                      <div className="mt-2 flex flex-wrap items-center gap-2 text-[10px] text-slate-500">
                        <span>Author</span>
                        <Link
                          to={`/profile/${group.post.author.username}`}
                          className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1 font-semibold text-slate-700 hover:text-brand"
                        >
                          <span>@{group.post.author.username}</span>
                          {group.post.author.is_verified ? <VerifiedBadge /> : null}
                        </Link>
                        {group.post.is_anonymous ? (
                          <span className="rounded-full bg-brand/10 px-2 py-1 font-semibold text-brand">
                            Anonymous post
                          </span>
                        ) : null}
                      </div>
                    ) : null}

                    <div className="mt-3 space-y-2">
                      {group.reports.map((report) => (
                        <div
                          key={report.id}
                          className="rounded-[14px] border border-slate-200 bg-slate-50 px-3 py-2.5"
                        >
                          <div className="flex flex-wrap items-center gap-2">
                            <span className={`rounded-full border px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.14em] ${getReportStatusBadge(report.status)}`}>
                              {getPostReportStatusLabel(report.status)}
                            </span>
                            <span className="rounded-full bg-white px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.14em] text-slate-600">
                              {getPostReportReasonLabel(report.reason)}
                            </span>
                            <span className="text-[10px] text-slate-500">{formatDateTime(report.created_at)}</span>
                          </div>
                          <p className="mt-2 text-[11px] font-semibold text-slate-700">
                            Reported by @{report.reporter?.username || "student"}
                          </p>
                          {report.details ? (
                            <p className="mt-1 whitespace-pre-wrap text-[12px] leading-6 text-slate-600">{report.details}</p>
                          ) : null}
                          {report.admin_note ? (
                            <p className="mt-1 text-[11px] text-slate-500">Admin note: {report.admin_note}</p>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="w-full xl:max-w-sm">
                    <label className="grid gap-1.5">
                      <span className="text-[9px] font-semibold uppercase tracking-[0.16em] text-slate-400">Admin note</span>
                      <textarea
                        value={noteDrafts[group.postId] || ""}
                        onChange={(event) =>
                          setNoteDrafts((current) => ({
                            ...current,
                            [group.postId]: event.target.value,
                          }))
                        }
                        className="input-shell min-h-[110px] text-[12px]"
                        placeholder="Explain why the reports were actioned or dismissed."
                        disabled={busy}
                      />
                    </label>

                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        type="button"
                        disabled={busy || group.openCount === 0}
                        onClick={() => {
                          setBusyPostId(group.postId);
                          void onResolveReports(group.postId, {
                            nextStatus: "actioned",
                            adminNote: noteDrafts[group.postId] || null,
                          }).finally(() => {
                            setBusyPostId((current) => (current === group.postId ? null : current));
                          });
                        }}
                        className="rounded-full bg-emerald-500 px-3 py-1.5 text-[10px] font-semibold text-white transition hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {busy ? "Saving..." : "Mark actioned"}
                      </button>

                      <button
                        type="button"
                        disabled={busy || group.openCount === 0}
                        onClick={() => {
                          setBusyPostId(group.postId);
                          void onResolveReports(group.postId, {
                            nextStatus: "dismissed",
                            adminNote: noteDrafts[group.postId] || null,
                          }).finally(() => {
                            setBusyPostId((current) => (current === group.postId ? null : current));
                          });
                        }}
                        className="rounded-full bg-slate-900 px-3 py-1.5 text-[10px] font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {busy ? "Saving..." : "Dismiss reports"}
                      </button>

                      {group.post ? (
                        <>
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => {
                              setBusyPostId(group.postId);
                              void onToggleVisibility(group.postId).finally(() => {
                                setBusyPostId((current) => (current === group.postId ? null : current));
                              });
                            }}
                            className="rounded-full bg-slate-100 px-3 py-1.5 text-[10px] font-semibold text-slate-700 transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {group.post.moderation_state === "hidden" ? "Republish post" : "Hide post"}
                          </button>

                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => {
                              setBusyPostId(group.postId);
                              void onDeletePost(group.postId).finally(() => {
                                setBusyPostId((current) => (current === group.postId ? null : current));
                              });
                            }}
                            className="rounded-full bg-rose-500 px-3 py-1.5 text-[10px] font-semibold text-white transition hover:bg-rose-600 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            Delete post
                          </button>

                          <Link
                            to={getPostPath(group.post)}
                            className="rounded-full bg-brand/10 px-3 py-1.5 text-[10px] font-semibold text-brand transition hover:bg-brand/15"
                          >
                            Open post
                          </Link>
                        </>
                      ) : null}
                    </div>
                  </div>
                </div>
              </article>
            );
          })
        )}
      </div>

      {!loading && filteredGroups.length > REPORTED_CONTENT_PAGE_SIZE ? (
        <div className="mt-3">
          <AdminPagination
            page={page}
            pageSize={REPORTED_CONTENT_PAGE_SIZE}
            totalCount={filteredGroups.length}
            canGoNext={page * REPORTED_CONTENT_PAGE_SIZE < filteredGroups.length}
            onPageChange={setPage}
          />
        </div>
      ) : null}
    </section>
  );
}
