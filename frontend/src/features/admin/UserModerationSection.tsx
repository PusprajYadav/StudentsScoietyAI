import { ArrowDownLeft, ArrowUpRight, Ban, Coins, ExternalLink, FileText, ShieldCheck, XCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { VerifiedBadge } from "../../components/VerifiedBadge";
import { getVerificationRequestBadge } from "../../lib/verification";
import type { ProfileRow, VerificationRequestRow } from "../../types/database";

interface UserModerationSectionProps {
  loading: boolean;
  users: ProfileRow[];
  walletBalances: Record<string, number>;
  summaryLabel?: string | null;
  verificationRequestsByUserId: Partial<Record<string, VerificationRequestRow | null>>;
  onToggleVerification: (user: ProfileRow) => Promise<void>;
  onTogglePosting: (user: ProfileRow) => Promise<void>;
  onToggleBan: (user: ProfileRow) => Promise<void>;
  onReviewVerificationRequest: (
    user: ProfileRow,
    request: VerificationRequestRow,
    input: { nextStatus: "approved" | "rejected"; reviewNote: string | null }
  ) => Promise<void>;
  onSaveControls: (
    user: ProfileRow,
    updates: { moderation_note: string | null; posting_restricted_until: string | null }
  ) => Promise<void>;
  onAdjustCoins: (
    user: ProfileRow,
    input: { amountDelta: number; note: string | null }
  ) => Promise<void>;
}

export function UserModerationSection({
  loading,
  users,
  walletBalances,
  summaryLabel = null,
  verificationRequestsByUserId,
  onToggleVerification,
  onTogglePosting,
  onToggleBan,
  onReviewVerificationRequest,
  onSaveControls,
  onAdjustCoins,
}: UserModerationSectionProps) {
  const sanitizeCoinInput = (value: string) => value.replace(/[^\d]/g, "");
  const [noteDrafts, setNoteDrafts] = useState<Record<string, string>>({});
  const [restrictionDrafts, setRestrictionDrafts] = useState<Record<string, string>>({});
  const [walletAmountDrafts, setWalletAmountDrafts] = useState<Record<string, string>>({});
  const [walletNoteDrafts, setWalletNoteDrafts] = useState<Record<string, string>>({});
  const [busyWalletUserId, setBusyWalletUserId] = useState<string | null>(null);
  const [reviewNoteDrafts, setReviewNoteDrafts] = useState<Record<string, string>>({});
  const [busyReviewRequestId, setBusyReviewRequestId] = useState<string | null>(null);

  useEffect(() => {
    setNoteDrafts(Object.fromEntries(users.map((entry) => [entry.id, entry.moderation_note || ""])));
    setRestrictionDrafts(
      Object.fromEntries(
        users.map((entry) => [
          entry.id,
          entry.posting_restricted_until
            ? new Date(entry.posting_restricted_until).toISOString().slice(0, 16)
            : "",
        ])
      )
    );
    setWalletAmountDrafts(Object.fromEntries(users.map((entry) => [entry.id, ""])));
    setWalletNoteDrafts(Object.fromEntries(users.map((entry) => [entry.id, ""])));
    setReviewNoteDrafts(
      Object.fromEntries(
        users.map((entry) => [entry.id, verificationRequestsByUserId[entry.id]?.review_note || ""])
      )
    );
  }, [users, verificationRequestsByUserId]);

  const submitWalletAdjustment = (entry: ProfileRow, direction: 1 | -1) => {
    const parsedAmount = Number.parseInt(walletAmountDrafts[entry.id] || "", 10);

    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0 || busyWalletUserId) {
      return;
    }

    setBusyWalletUserId(entry.id);
    void onAdjustCoins(entry, {
      amountDelta: parsedAmount * direction,
      note: walletNoteDrafts[entry.id]?.trim() || null,
    }).finally(() => {
      setBusyWalletUserId(null);
      setWalletAmountDrafts((current) => ({ ...current, [entry.id]: "" }));
      setWalletNoteDrafts((current) => ({ ...current, [entry.id]: "" }));
    });
  };

  return (
    <section className="rounded-[20px] border border-slate-200 bg-white p-3 shadow-[0_18px_40px_-34px_rgba(15,23,42,0.22)]">
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-[14px] bg-brand/10 text-brand">
            <ShieldCheck className="h-4 w-4" />
          </div>
          <div>
            <p className="font-display text-base font-semibold text-slate-900 sm:text-lg">Users</p>
            <p className="text-[11px] text-slate-500">Wallet, access, and blue tick review.</p>
          </div>
        </div>
        {summaryLabel ? (
          <p className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-semibold text-slate-600">
            {summaryLabel}
          </p>
        ) : null}
      </div>

      <div className="mt-3 space-y-2.5">
        {loading ? (
          <div className="h-32 animate-pulse rounded-[16px] bg-slate-100" />
        ) : users.length === 0 ? (
          <div className="rounded-[16px] border border-slate-200 bg-slate-50 px-4 py-5 text-sm text-slate-500">
            No users match the current admin filters.
          </div>
        ) : (
          users.map((entry) => {
            const verificationRequest = verificationRequestsByUserId[entry.id] || null;
            const isVerificationBusy = verificationRequest
              ? busyReviewRequestId === verificationRequest.id
              : false;
            const walletBalance = walletBalances[entry.id] ?? 0;
            const parsedWalletAmount = Number.parseInt(walletAmountDrafts[entry.id] || "", 10);
            const walletBusy = busyWalletUserId === entry.id;
            const canAdjustWallet =
              Number.isFinite(parsedWalletAmount) && parsedWalletAmount > 0 && busyWalletUserId === null;

            return (
              <article
                key={entry.id}
                className="rounded-[18px] border border-slate-200 bg-[linear-gradient(135deg,#ffffff,#f8fbff)] p-2.5 shadow-[0_14px_28px_-26px_rgba(15,23,42,0.18)]"
              >
                <div className="grid gap-3 2xl:grid-cols-[minmax(0,1fr)_auto] 2xl:items-start">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate font-display text-base font-semibold text-slate-900 sm:text-lg">
                        {entry.full_name || entry.username}
                      </p>
                      {entry.is_verified ? <VerifiedBadge /> : null}
                      {entry.is_banned ? (
                        <span className="rounded-full bg-rose-50 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-rose-600">
                          Banned
                        </span>
                      ) : null}
                      {!entry.can_post ? (
                        <span className="rounded-full bg-amber-50 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-amber-700">
                          Restricted
                        </span>
                      ) : null}
                    </div>

                    <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                      <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-medium text-slate-600">
                        @{entry.username}
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-1 text-[10px] font-semibold text-amber-700">
                        <Coins className="h-3 w-3" />
                        {walletBalance}
                      </span>
                      {verificationRequest ? (
                        <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-semibold text-slate-600">
                          {getVerificationRequestBadge(verificationRequest.status)}
                        </span>
                      ) : null}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-1.5 2xl:justify-end">
                    <button
                      type="button"
                      onClick={() => void onToggleVerification(entry)}
                      className="inline-flex h-8 items-center gap-1.5 rounded-full bg-brand/10 px-3 text-[10px] font-semibold text-brand"
                    >
                      <ShieldCheck className="h-3.5 w-3.5" />
                      {entry.is_verified ? "Unverify" : "Verify"}
                    </button>

                    <button
                      type="button"
                      onClick={() => void onTogglePosting(entry)}
                      className="inline-flex h-8 items-center gap-1.5 rounded-full bg-slate-100 px-3 text-[10px] font-semibold text-slate-700"
                    >
                      {entry.can_post ? <XCircle className="h-3.5 w-3.5" /> : <ShieldCheck className="h-3.5 w-3.5" />}
                      {entry.can_post ? "Restrict" : "Allow"}
                    </button>

                    <button
                      type="button"
                      onClick={() => void onToggleBan(entry)}
                      className="inline-flex h-8 items-center gap-1.5 rounded-full bg-rose-50 px-3 text-[10px] font-semibold text-rose-600"
                    >
                      <Ban className="h-3.5 w-3.5" />
                      {entry.is_banned ? "Unban" : "Ban"}
                    </button>
                  </div>
                </div>

                <div className="mt-2.5 grid gap-2.5 2xl:grid-cols-[minmax(0,1.08fr)_minmax(0,0.95fr)_minmax(240px,0.82fr)]">
                  <div className="rounded-[16px] border border-slate-200 bg-white p-2.5">
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                        Account controls
                      </p>
                      <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-semibold text-slate-500">
                        Notes + access
                      </span>
                    </div>

                    <div className="grid gap-2 lg:grid-cols-[minmax(0,1fr)_170px_auto]">
                      <label className="grid gap-1">
                        <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                          Note
                        </span>
                        <input
                          value={noteDrafts[entry.id] || ""}
                          onChange={(event) =>
                            setNoteDrafts((current) => ({ ...current, [entry.id]: event.target.value }))
                          }
                          className="input-shell h-9 rounded-xl text-[13px]"
                          placeholder="Internal note"
                        />
                      </label>

                      <label className="grid gap-1">
                        <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                          Restrict till
                        </span>
                        <input
                          type="datetime-local"
                          value={restrictionDrafts[entry.id] || ""}
                          onChange={(event) =>
                            setRestrictionDrafts((current) => ({ ...current, [entry.id]: event.target.value }))
                          }
                          className="input-shell h-9 rounded-xl text-[13px]"
                        />
                      </label>

                      <div className="flex items-end">
                        <button
                          type="button"
                          onClick={() =>
                            void onSaveControls(entry, {
                              moderation_note: noteDrafts[entry.id]?.trim() || null,
                              posting_restricted_until: restrictionDrafts[entry.id]
                                ? new Date(restrictionDrafts[entry.id]).toISOString()
                                : null,
                            })
                          }
                          className="h-9 w-full rounded-full bg-slate-900 px-3 text-[10px] font-semibold text-white"
                        >
                          Save
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-[16px] border border-slate-200 bg-white p-2.5">
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-[12px] bg-amber-50 text-amber-600">
                          <Coins className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-slate-900">Wallet</p>
                          <p className="text-[11px] text-slate-500">Quick coin adjust</p>
                        </div>
                      </div>
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-1 text-[10px] font-semibold text-amber-700">
                        <Coins className="h-3 w-3" />
                        {walletBalance}
                      </span>
                    </div>

                    <div className="rounded-[14px] border border-amber-100 bg-[linear-gradient(135deg,rgba(255,248,235,0.9),rgba(255,255,255,1))] p-2">
                      <div className="grid gap-2 sm:grid-cols-[92px_minmax(0,1fr)]">
                        <label className="grid gap-1">
                          <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                            Amount
                          </span>
                          <input
                            type="text"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            autoComplete="off"
                            value={walletAmountDrafts[entry.id] || ""}
                            onChange={(event) =>
                              setWalletAmountDrafts((current) => ({
                                ...current,
                                [entry.id]: sanitizeCoinInput(event.target.value),
                              }))
                            }
                            disabled={walletBusy}
                            className="input-shell h-10 w-full min-w-0 rounded-[14px] bg-white px-3 text-center text-[14px] font-semibold disabled:opacity-70"
                            placeholder="50"
                          />
                        </label>

                        <label className="grid gap-1">
                          <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                            Wallet note
                          </span>
                          <input
                            type="text"
                            autoComplete="off"
                            value={walletNoteDrafts[entry.id] || ""}
                            onChange={(event) =>
                              setWalletNoteDrafts((current) => ({ ...current, [entry.id]: event.target.value }))
                            }
                            disabled={walletBusy}
                            className="input-shell h-10 w-full min-w-0 rounded-[14px] bg-white px-3 text-[13px] disabled:opacity-70"
                            placeholder="Reason for change"
                          />
                        </label>
                      </div>

                      <div className="mt-2 grid gap-2 sm:grid-cols-2">
                        <button
                          type="button"
                          title="Credit wallet"
                          aria-label="Credit wallet"
                          disabled={!canAdjustWallet}
                          onClick={() => submitWalletAdjustment(entry, 1)}
                          className="inline-flex h-10 items-center justify-center gap-2 rounded-[14px] border border-emerald-100 bg-emerald-50 px-3 text-[11px] font-semibold text-emerald-700 transition hover:border-emerald-200 hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          <ArrowUpRight className="h-4 w-4" />
                          <span>Credit</span>
                        </button>
                        <button
                          type="button"
                          title="Debit wallet"
                          aria-label="Debit wallet"
                          disabled={!canAdjustWallet}
                          onClick={() => submitWalletAdjustment(entry, -1)}
                          className="inline-flex h-10 items-center justify-center gap-2 rounded-[14px] border border-rose-100 bg-rose-50 px-3 text-[11px] font-semibold text-rose-600 transition hover:border-rose-200 hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          <ArrowDownLeft className="h-4 w-4" />
                          <span>Debit</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-[16px] border border-slate-200 bg-white p-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold text-slate-900">Blue tick</p>
                        <p className="mt-0.5 text-[11px] text-slate-500">
                          {verificationRequest ? "Review submitted proof." : "No proof request yet."}
                        </p>
                      </div>
                      <div className="flex h-8 w-8 items-center justify-center rounded-[12px] bg-brand/10 text-brand">
                        <FileText className="h-4 w-4" />
                      </div>
                    </div>

                    {verificationRequest ? (
                      <>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-600">
                            {getVerificationRequestBadge(verificationRequest.status)}
                          </span>
                          <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-600">
                            {verificationRequest.proof_file_kind.toUpperCase()}
                          </span>
                          <a
                            href={verificationRequest.proof_public_url}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 rounded-full bg-brand/10 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-brand"
                          >
                            <ExternalLink className="h-3 w-3" />
                            Open
                          </a>
                        </div>

                        {verificationRequest.request_note ? (
                          <div className="mt-2 rounded-xl bg-slate-50 px-3 py-2 text-xs leading-5 text-slate-600">
                            {verificationRequest.request_note}
                          </div>
                        ) : null}

                        {verificationRequest.status === "pending" ? (
                          <>
                            <label className="mt-2 grid gap-1">
                              <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                                Review note
                              </span>
                              <input
                                value={reviewNoteDrafts[entry.id] || ""}
                                onChange={(event) =>
                                  setReviewNoteDrafts((current) => ({
                                    ...current,
                                    [entry.id]: event.target.value,
                                  }))
                                }
                                className="input-shell h-9 rounded-xl text-sm"
                                placeholder="Approval or rejection note"
                              />
                            </label>

                            <div className="mt-2 flex flex-wrap gap-1.5">
                              <button
                                type="button"
                                disabled={isVerificationBusy}
                                onClick={() => {
                                  setBusyReviewRequestId(verificationRequest.id);
                                  void onReviewVerificationRequest(entry, verificationRequest, {
                                    nextStatus: "approved",
                                    reviewNote: reviewNoteDrafts[entry.id]?.trim() || null,
                                  }).finally(() => setBusyReviewRequestId(null));
                                }}
                                className="rounded-full bg-emerald-50 px-3 py-1.5 text-[11px] font-semibold text-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                Approve
                              </button>

                              <button
                                type="button"
                                disabled={isVerificationBusy}
                                onClick={() => {
                                  setBusyReviewRequestId(verificationRequest.id);
                                  void onReviewVerificationRequest(entry, verificationRequest, {
                                    nextStatus: "rejected",
                                    reviewNote: reviewNoteDrafts[entry.id]?.trim() || null,
                                  }).finally(() => setBusyReviewRequestId(null));
                                }}
                                className="rounded-full bg-rose-50 px-3 py-1.5 text-[11px] font-semibold text-rose-600 disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                Reject
                              </button>
                            </div>
                          </>
                        ) : verificationRequest.review_note ? (
                          <div className="mt-2 rounded-xl bg-slate-50 px-3 py-2 text-xs leading-5 text-slate-600">
                            {verificationRequest.review_note}
                          </div>
                        ) : null}
                      </>
                    ) : (
                      <div className="mt-2 rounded-xl bg-slate-50 px-3 py-3 text-xs leading-5 text-slate-500">
                        Waiting for PNG or PDF identity proof submission.
                      </div>
                    )}
                  </div>
                </div>
              </article>
            );
          })
        )}
      </div>
    </section>
  );
}
