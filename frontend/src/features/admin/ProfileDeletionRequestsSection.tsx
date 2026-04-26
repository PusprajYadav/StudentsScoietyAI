import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { AdminPagination } from "./AdminPagination";
import { formatDateTime } from "../../lib/formatting";
import type {
  AccountDeletionRequestStatus,
  AccountDeletionRequestWithRelations,
} from "../../types/database";
import { VerifiedBadge } from "../../components/VerifiedBadge";

interface ProfileDeletionRequestsSectionProps {
  loading: boolean;
  searchTerm: string;
  requests: AccountDeletionRequestWithRelations[];
  onReviewRequest: (
    request: AccountDeletionRequestWithRelations,
    input: {
      nextStatus: AccountDeletionRequestStatus;
      reviewNote?: string | null;
    }
  ) => Promise<void>;
}

const PROFILE_DELETION_PAGE_SIZE = 5;

function getStatusBadge(status: AccountDeletionRequestStatus) {
  switch (status) {
    case "approved":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    case "rejected":
      return "border-rose-200 bg-rose-50 text-rose-700";
    case "completed":
      return "border-blue-200 bg-blue-50 text-blue-700";
    case "cancelled":
      return "border-slate-200 bg-slate-100 text-slate-600";
    default:
      return "border-amber-200 bg-amber-50 text-amber-700";
  }
}

function getStatusLabel(status: AccountDeletionRequestStatus) {
  switch (status) {
    case "approved":
      return "Approved";
    case "rejected":
      return "Rejected";
    case "completed":
      return "Completed";
    case "cancelled":
      return "Cancelled";
    default:
      return "Pending";
  }
}

export function ProfileDeletionRequestsSection({
  loading,
  searchTerm,
  requests,
  onReviewRequest,
}: ProfileDeletionRequestsSectionProps) {
  const [busyRequestId, setBusyRequestId] = useState<string | null>(null);
  const [noteDrafts, setNoteDrafts] = useState<Record<string, string>>({});
  const [page, setPage] = useState(1);

  useEffect(() => {
    setNoteDrafts(
      Object.fromEntries(
        requests.map((request) => [request.id, request.review_note || ""])
      )
    );
  }, [requests]);

  const normalizedSearch = searchTerm.trim().toLowerCase();
  const filteredRequests = useMemo(() => {
    const sorted = [...requests].sort((left, right) => {
      if (left.status === "pending" && right.status !== "pending") {
        return -1;
      }

      if (left.status !== "pending" && right.status === "pending") {
        return 1;
      }

      return right.created_at.localeCompare(left.created_at);
    });

    if (!normalizedSearch) {
      return sorted;
    }

    return sorted.filter((request) =>
      [
        request.user?.username || "",
        request.user?.full_name || "",
        request.email || "",
        request.reason || "",
        request.review_note || "",
        request.status,
      ]
        .join(" ")
        .toLowerCase()
        .includes(normalizedSearch)
    );
  }, [normalizedSearch, requests]);
  const pagedRequests = useMemo(() => {
    const start = (page - 1) * PROFILE_DELETION_PAGE_SIZE;
    return filteredRequests.slice(start, start + PROFILE_DELETION_PAGE_SIZE);
  }, [filteredRequests, page]);

  useEffect(() => {
    setPage(1);
  }, [normalizedSearch, requests]);

  return (
    <section className="rounded-[18px] border border-slate-200 bg-white p-3 shadow-[0_16px_34px_-32px_rgba(15,23,42,0.2)]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-display text-[15px] font-semibold text-slate-900 sm:text-base">Profile deletion requests</p>
          <p className="mt-1 text-[11px] text-slate-500">Search filters the queue and reviews load 5 at a time.</p>
        </div>
        <p className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-semibold text-slate-600">
          {filteredRequests.length} request{filteredRequests.length === 1 ? "" : "s"}
        </p>
      </div>

      <div className="mt-3 space-y-2.5">
        {loading ? (
          <div className="rounded-[14px] border border-slate-200 bg-slate-50 px-4 py-5 text-sm text-slate-500">
            Loading profile deletion requests...
          </div>
        ) : filteredRequests.length === 0 ? (
          <div className="rounded-[14px] border border-slate-200 bg-slate-50 px-4 py-5 text-sm text-slate-500">
            No profile deletion requests match the current search.
          </div>
        ) : (
          pagedRequests.map((request) => {
            const busy = busyRequestId === request.id;
            const canReview = request.status !== "completed";

            return (
              <article
                key={request.id}
                className="rounded-[16px] border border-slate-200 bg-[linear-gradient(135deg,#ffffff,#f8fbff)] p-2.5 shadow-[0_12px_24px_-24px_rgba(15,23,42,0.16)]"
              >
                <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
                  <div className="min-w-0 xl:max-w-4xl">
                    <div className="flex flex-wrap items-center gap-2">
                      {request.user?.username ? (
                        <Link
                          to={`/profile/${request.user.username}`}
                          className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-[12px] font-semibold text-slate-700 hover:text-brand"
                        >
                          <span>@{request.user.username}</span>
                          {request.user.is_verified ? <VerifiedBadge /> : null}
                        </Link>
                      ) : (
                        <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-[12px] font-semibold text-slate-700">
                          Unknown profile
                        </span>
                      )}

                      <span className={`rounded-full border px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.14em] ${getStatusBadge(request.status)}`}>
                        {getStatusLabel(request.status)}
                      </span>
                      <span className="rounded-full bg-slate-100 px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.14em] text-slate-600">
                        {formatDateTime(request.created_at)}
                      </span>
                    </div>

                    <div className="mt-2 grid gap-2.5 sm:grid-cols-2">
                      <div className="rounded-[14px] border border-slate-200 bg-slate-50 px-3 py-2.5">
                        <p className="text-[9px] font-semibold uppercase tracking-[0.16em] text-slate-400">User</p>
                        <p className="mt-1 text-[13px] font-semibold text-slate-900">
                          {request.user?.full_name || request.full_name_snapshot || request.username_snapshot}
                        </p>
                        <p className="mt-1 text-[11px] text-slate-500">
                          @{request.username_snapshot}
                        </p>
                      </div>

                      <div className="rounded-[14px] border border-slate-200 bg-slate-50 px-3 py-2.5">
                        <p className="text-[9px] font-semibold uppercase tracking-[0.16em] text-slate-400">Email</p>
                        <p className="mt-1 break-words text-[12px] text-slate-700">{request.email || "No email saved"}</p>
                      </div>
                    </div>

                    {request.reason ? (
                      <div className="mt-2 rounded-[14px] border border-slate-200 bg-slate-50 px-3 py-2.5">
                        <p className="text-[9px] font-semibold uppercase tracking-[0.16em] text-slate-400">Reason</p>
                        <p className="mt-1 whitespace-pre-wrap text-[12px] leading-6 text-slate-700">{request.reason}</p>
                      </div>
                    ) : null}

                    {request.reviewed_by ? (
                      <p className="mt-2 text-[11px] text-slate-500">
                        Last reviewed by @{request.reviewed_by.username} on {formatDateTime(request.reviewed_at || request.updated_at)}
                      </p>
                    ) : null}
                  </div>

                  <div className="w-full xl:max-w-sm">
                    <label className="grid gap-1.5">
                      <span className="text-[9px] font-semibold uppercase tracking-[0.16em] text-slate-400">Admin note</span>
                      <textarea
                        value={noteDrafts[request.id] || ""}
                        onChange={(event) =>
                          setNoteDrafts((current) => ({
                            ...current,
                            [request.id]: event.target.value,
                          }))
                        }
                        className="input-shell min-h-[110px] text-[12px]"
                        placeholder="Add the outcome or follow-up note."
                        disabled={busy}
                      />
                    </label>

                    {canReview ? (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {[
                          { status: "approved" as const, label: "Approve", className: "bg-emerald-500 text-white hover:bg-emerald-600" },
                          { status: "rejected" as const, label: "Reject", className: "bg-rose-500 text-white hover:bg-rose-600" },
                          { status: "completed" as const, label: "Complete", className: "bg-brand text-white hover:bg-brand-dark" },
                          { status: "cancelled" as const, label: "Cancel", className: "bg-slate-900 text-white hover:bg-slate-700" },
                        ].map((action) => (
                          <button
                            key={action.status}
                            type="button"
                            disabled={busy}
                            onClick={() => {
                              setBusyRequestId(request.id);
                              void onReviewRequest(request, {
                                nextStatus: action.status,
                                reviewNote: noteDrafts[request.id] || null,
                              }).finally(() => {
                                setBusyRequestId((current) => (current === request.id ? null : current));
                              });
                            }}
                            className={`rounded-full px-3 py-1.5 text-[10px] font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${action.className}`}
                          >
                            {busy ? "Saving..." : action.label}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div className="mt-3 rounded-[14px] border border-slate-200 bg-slate-50 px-3 py-2 text-[11px] text-slate-500">
                        This request is already completed. Update history is preserved above.
                      </div>
                    )}
                  </div>
                </div>
              </article>
            );
          })
        )}
      </div>

      {!loading && filteredRequests.length > PROFILE_DELETION_PAGE_SIZE ? (
        <div className="mt-3">
          <AdminPagination
            page={page}
            pageSize={PROFILE_DELETION_PAGE_SIZE}
            totalCount={filteredRequests.length}
            canGoNext={page * PROFILE_DELETION_PAGE_SIZE < filteredRequests.length}
            onPageChange={setPage}
          />
        </div>
      ) : null}
    </section>
  );
}
