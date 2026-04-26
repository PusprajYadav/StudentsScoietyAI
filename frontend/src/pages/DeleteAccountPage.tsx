import { AlertTriangle, ArrowRight, Clock3, ShieldAlert, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { Link, useNavigate } from "react-router-dom";
import {
  createAccountDeletionRequest,
  deleteAccountDeletionRequest,
  loadLatestAccountDeletionRequest,
} from "../lib/accountDeletion";
import { buildAuthRedirectPath } from "../lib/authRedirect";
import { useAuthStore } from "../store/authStore";
import type { AccountDeletionRequestRow, AccountDeletionRequestStatus } from "../types/database";

const requestStatusCopy: Record<
  AccountDeletionRequestStatus,
  { label: string; badgeClassName: string; summary: string }
> = {
  pending: {
    label: "Pending review",
    badgeClassName: "border-amber-400/35 bg-amber-500/12 text-amber-700 dark:text-amber-300",
    summary: "Your delete request is queued for review. You can still remove it before the team processes it.",
  },
  approved: {
    label: "Approved",
    badgeClassName: "border-emerald-400/35 bg-emerald-500/12 text-emerald-700 dark:text-emerald-300",
    summary: "Your request has been approved and is moving through the final account-removal steps.",
  },
  rejected: {
    label: "Needs changes",
    badgeClassName: "border-rose-400/35 bg-rose-500/12 text-rose-700 dark:text-rose-300",
    summary: "Your last request was rejected. Review the note below and submit a fresh request if needed.",
  },
  completed: {
    label: "Completed",
    badgeClassName: "border-brand/25 bg-brand/10 text-brand dark:text-blue-300",
    summary: "This request has already been completed by the support team.",
  },
  cancelled: {
    label: "Cancelled",
    badgeClassName: "border-app-border bg-app-secondary text-app-muted",
    summary: "This request was cancelled earlier. You can submit a new one whenever you need it.",
  },
};

function formatDateTime(value: string | null) {
  if (!value) {
    return null;
  }

  try {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

export function DeleteAccountPage() {
  const navigate = useNavigate();
  const { user, profile } = useAuthStore();
  const [latestRequest, setLatestRequest] = useState<AccountDeletionRequestRow | null>(null);
  const [reason, setReason] = useState("");
  const [loadingRequest, setLoadingRequest] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [removing, setRemoving] = useState(false);
  const authRedirectPath = buildAuthRedirectPath({ pathname: "/delete" });

  useEffect(() => {
    let cancelled = false;

    if (!user) {
      setLatestRequest(null);
      setLoadingRequest(false);
      return () => {
        cancelled = true;
      };
    }

    setLoadingRequest(true);

    void loadLatestAccountDeletionRequest(user.id)
      .then((request) => {
        if (!cancelled) {
          setLatestRequest(request);
        }
      })
      .catch((error) => {
        if (!cancelled) {
          toast.error(error instanceof Error ? error.message : "Could not load your delete request.");
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoadingRequest(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const activeStatusCopy = latestRequest ? requestStatusCopy[latestRequest.status] : null;
  const canSubmitRequest = Boolean(user && profile && latestRequest?.status !== "pending");
  const latestTimestamp = useMemo(
    () => formatDateTime(latestRequest?.updated_at || latestRequest?.created_at || null),
    [latestRequest]
  );

  const refreshLatestRequest = async () => {
    if (!user) {
      setLatestRequest(null);
      return;
    }

    const nextRequest = await loadLatestAccountDeletionRequest(user.id);
    setLatestRequest(nextRequest);
  };

  const handleSubmit = async () => {
    if (!user || !profile) {
      toast.error("Please sign in first.");
      return;
    }

    setSubmitting(true);

    try {
      const createdRequest = await createAccountDeletionRequest({
        userId: user.id,
        email: user.email,
        usernameSnapshot: profile.username,
        fullNameSnapshot: profile.full_name,
        reason,
      });

      setLatestRequest(createdRequest);
      setReason("");
      toast.success("Delete request submitted.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not submit your delete request.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteRequest = async () => {
    if (!user || !latestRequest) {
      return;
    }

    setRemoving(true);

    try {
      await deleteAccountDeletionRequest(latestRequest.id, user.id);
      await refreshLatestRequest();
      toast.success("Delete request removed.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not remove that delete request.");
    } finally {
      setRemoving(false);
    }
  };

  return (
    <div className="native-page">
      <section className="relative overflow-hidden rounded-[28px] border border-rose-200/70 bg-[radial-gradient(circle_at_top_left,rgba(251,113,133,0.16),transparent_33%),radial-gradient(circle_at_bottom_right,rgba(59,130,246,0.12),transparent_28%),linear-gradient(135deg,rgba(255,255,255,0.98),rgba(255,247,250,0.94))] p-4 shadow-[0_22px_50px_-38px_rgba(15,23,42,0.28)] sm:rounded-[32px] sm:p-6 dark:border-rose-500/20 dark:bg-[radial-gradient(circle_at_top_left,rgba(244,63,94,0.18),transparent_33%),radial-gradient(circle_at_bottom_right,rgba(59,130,246,0.16),transparent_28%),linear-gradient(135deg,rgba(7,12,24,0.98),rgba(18,10,20,0.96))]">
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(120deg,transparent,rgba(255,255,255,0.38),transparent)] opacity-60 dark:opacity-20" />

        <div className="relative space-y-4">
          <div className="inline-flex items-center gap-2 rounded-full border border-rose-300/40 bg-white/80 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.22em] text-rose-600 sm:text-xs dark:border-rose-400/20 dark:bg-white/5 dark:text-rose-300">
            <ShieldAlert className="h-3.5 w-3.5" />
            Delete Account
          </div>

          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px] lg:items-end">
            <div>
              <h1 className="max-w-[12ch] font-display text-[1.85rem] font-bold leading-[1.02] tracking-tight text-app-text sm:max-w-none sm:text-[2.4rem]">
                Request account deletion from one clear page
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-app-muted">
                Submit a deletion request, review the latest status, or remove a pending request before it is processed.
              </p>
            </div>

            <div className="rounded-[24px] border border-app-border bg-white/80 p-4 backdrop-blur dark:bg-white/5">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-app-muted">What happens next</p>
              <div className="mt-3 space-y-2 text-sm text-app-muted">
                <p>1. Submit the request from this page while signed in.</p>
                <p>2. The team reviews the request and updates the status.</p>
                <p>3. Until review starts, you can delete the pending request here.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {!user || !profile ? (
        <section className="surface-card rounded-[28px] p-5 sm:rounded-[32px] sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="max-w-2xl">
              <p className="font-display text-xl font-semibold text-app-text sm:text-2xl">Sign in to manage deletion requests</p>
              <p className="mt-2 text-sm leading-6 text-app-muted">
                The delete-request page is public, but you need an active Student Society session before we can link the request to your account safely.
              </p>
            </div>

            <Link to={authRedirectPath} className="btn-primary gap-2 self-start !rounded-full !px-5 !py-3">
              Sign in first
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </section>
      ) : (
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.12fr)_minmax(320px,0.88fr)]">
          <section className="surface-card rounded-[28px] p-5 sm:rounded-[32px] sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-display text-xl font-semibold text-app-text sm:text-2xl">Latest request</p>
                <p className="mt-1 text-sm text-app-muted">
                  We keep the newest request here so you can track or remove it quickly.
                </p>
              </div>

              {activeStatusCopy ? (
                <span className={`inline-flex rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] ${activeStatusCopy.badgeClassName}`}>
                  {activeStatusCopy.label}
                </span>
              ) : (
                <span className="inline-flex rounded-full border border-app-border bg-app-secondary px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-app-muted">
                  No request yet
                </span>
              )}
            </div>

            {loadingRequest ? (
              <div className="mt-5 rounded-[24px] border border-app-border bg-app-secondary/50 px-4 py-6 text-sm text-app-muted">
                Loading your current deletion request...
              </div>
            ) : latestRequest && activeStatusCopy ? (
              <div className="mt-5 space-y-4">
                <div className="rounded-[24px] border border-app-border bg-app-secondary/60 p-4 sm:p-5">
                  <div className="flex items-start gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-rose-500/10 text-rose-600 dark:text-rose-300">
                      {latestRequest.status === "pending" ? <Clock3 className="h-5 w-5" /> : <ShieldAlert className="h-5 w-5" />}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-app-text">{activeStatusCopy.summary}</p>
                      {latestTimestamp ? <p className="mt-1 text-xs text-app-muted">Last updated {latestTimestamp}</p> : null}
                    </div>
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-[18px] bg-app-card px-4 py-3">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-app-muted">Account</p>
                      <p className="mt-1 text-sm font-semibold text-app-text">{latestRequest.full_name_snapshot || latestRequest.username_snapshot}</p>
                      <p className="mt-1 text-xs text-app-muted">@{latestRequest.username_snapshot}</p>
                    </div>
                    <div className="rounded-[18px] bg-app-card px-4 py-3">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-app-muted">Contact</p>
                      <p className="mt-1 break-words text-sm text-app-text">{latestRequest.email || user.email || "No email saved"}</p>
                    </div>
                  </div>

                  {latestRequest.reason ? (
                    <div className="mt-4 rounded-[18px] bg-app-card px-4 py-3">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-app-muted">Reason shared</p>
                      <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-app-text">{latestRequest.reason}</p>
                    </div>
                  ) : null}

                  {latestRequest.review_note ? (
                    <div className="mt-4 rounded-[18px] border border-brand/15 bg-brand/5 px-4 py-3">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-brand">Support note</p>
                      <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-app-text">{latestRequest.review_note}</p>
                    </div>
                  ) : null}
                </div>

                {latestRequest.status === "pending" ? (
                  <button
                    type="button"
                    onClick={handleDeleteRequest}
                    disabled={removing}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm font-semibold text-rose-600 transition hover:bg-rose-500/15 dark:text-rose-300"
                  >
                    <Trash2 className="h-4 w-4" />
                    {removing ? "Removing request..." : "Delete this pending request"}
                  </button>
                ) : null}
              </div>
            ) : (
              <div className="mt-5 rounded-[24px] border border-dashed border-app-border bg-app-secondary/35 px-4 py-8 text-center">
                <p className="font-semibold text-app-text">No deletion request submitted yet.</p>
                <p className="mt-1 text-sm text-app-muted">Use the form on the right to send one when you are ready.</p>
              </div>
            )}
          </section>

          <section className="surface-card rounded-[28px] p-5 sm:rounded-[32px] sm:p-6">
            <div>
              <p className="font-display text-xl font-semibold text-app-text sm:text-2xl">Create a delete request</p>
              <p className="mt-1 text-sm text-app-muted">
                This request stays attached to your signed-in profile so the team can verify it safely.
              </p>
            </div>

            <div className="mt-5 rounded-[24px] border border-app-border bg-app-secondary/55 p-4 sm:p-5">
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-brand/10 text-brand">
                  <AlertTriangle className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-app-text">Before you continue</p>
                  <p className="mt-1 text-sm leading-6 text-app-muted">
                    Make sure you have copied anything you still need from your profile, tools, or messages before asking for account deletion.
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-5 grid gap-4">
              <div className="rounded-[20px] border border-app-border bg-app-card px-4 py-3">
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-app-muted">Signed-in account</p>
                <p className="mt-1 text-sm font-semibold text-app-text">{profile.full_name || profile.username}</p>
                <p className="mt-1 text-xs text-app-muted">
                  @{profile.username} {user.email ? `• ${user.email}` : ""}
                </p>
              </div>

              <label className="grid gap-2">
                <span className="text-sm font-medium text-app-text">Why do you want to delete this account? <span className="text-app-muted">(optional)</span></span>
                <textarea
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                  placeholder="Share any reason or context for the support team."
                  className="input-shell min-h-[144px] resize-y"
                  maxLength={600}
                  disabled={!canSubmitRequest || submitting}
                />
                <span className="text-xs text-app-muted">{reason.trim().length}/600 characters</span>
              </label>

              <button
                type="button"
                onClick={handleSubmit}
                disabled={!canSubmitRequest || submitting}
                className="btn-primary w-full gap-2 !rounded-full !py-3"
              >
                {submitting ? "Submitting request..." : latestRequest?.status === "pending" ? "Pending request already active" : "Submit delete request"}
              </button>

              {!canSubmitRequest && latestRequest?.status === "pending" ? (
                <p className="text-sm text-app-muted">
                  You already have a pending request. Delete that request first if you want to start over.
                </p>
              ) : null}
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => navigate(`/profile/${profile.username}/settings/account`)}
                className="btn-secondary gap-2 !rounded-full !px-4 !py-2.5"
              >
                Back to account settings
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
