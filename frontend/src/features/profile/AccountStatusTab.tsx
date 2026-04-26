import {
  AlertCircle,
  CheckCircle2,
  Coins,
  Copy,
  FileText,
  ImageIcon,
  ShieldCheck,
  TrendingDown,
  TrendingUp,
  Upload,
  Wallet2,
  XCircle,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import {
  COIN_ACCESS_KEYS,
  COIN_FEATURE_KEYS,
  formatCoinAmount,
  getCoinCostLabel,
  loadCoinTransactions,
  loadUserReferrals,
} from "../../lib/coins";
import { loadWalletRechargeRequests } from "../../lib/walletRecharge";
import {
  getVerificationRequestBadge,
  loadLatestVerificationRequest,
  submitVerificationRequest,
} from "../../lib/verification";
import { useCoinWalletStore } from "../../store/coinWalletStore";
import { WalletRechargeStatusBadge } from "../wallet/WalletRechargeStatusBadge";
import type {
  CoinTransactionRow,
  ProfileRow,
  UserReferralRow,
  WalletRechargeRequestRow,
  VerificationRequestRow,
} from "../../types/database";

interface AccountStatusTabProps {
  canPost: boolean;
  profile: ProfileRow;
}

const TRANSACTION_PAGE_SIZE = 5;

function getVerificationTone(status: VerificationRequestRow["status"] | "idle") {
  switch (status) {
    case "approved":
      return {
        cardClass: "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
        icon: CheckCircle2,
      };
    case "rejected":
    case "cancelled":
      return {
        cardClass: "border-rose-500/20 bg-rose-500/10 text-rose-600 dark:text-rose-300",
        icon: XCircle,
      };
    case "pending":
      return {
        cardClass: "border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-300",
        icon: AlertCircle,
      };
    default:
      return {
        cardClass: "border-app-border bg-app-secondary/55 text-app-text",
        icon: ShieldCheck,
      };
  }
}

function isAllowedVerificationProof(file: File) {
  const lowerName = file.name.toLowerCase();

  return (
    file.type === "image/png" ||
    file.type === "application/pdf" ||
    lowerName.endsWith(".png") ||
    lowerName.endsWith(".pdf")
  );
}

export function AccountStatusTab({ canPost, profile }: AccountStatusTabProps) {
  const navigate = useNavigate();
  const wallet = useCoinWalletStore((state) => state.wallet);
  const activeAccess = useCoinWalletStore((state) => state.activeAccess);
  const featureSettings = useCoinWalletStore((state) => state.featureSettings);
  const refreshWallet = useCoinWalletStore((state) => state.refreshWallet);
  const [transactions, setTransactions] = useState<CoinTransactionRow[]>([]);
  const [referrals, setReferrals] = useState<UserReferralRow[]>([]);
  const [rechargeRequests, setRechargeRequests] = useState<
    WalletRechargeRequestRow[]
  >([]);
  const [verificationRequest, setVerificationRequest] = useState<VerificationRequestRow | null>(null);
  const [verificationNote, setVerificationNote] = useState("");
  const [verificationFile, setVerificationFile] = useState<File | null>(null);
  const [submittingVerification, setSubmittingVerification] = useState(false);
  const [hasMoreTransactions, setHasMoreTransactions] = useState(false);
  const [loadingMoreTransactions, setLoadingMoreTransactions] = useState(false);

  useEffect(() => {
    let cancelled = false;

    void Promise.allSettled([
      loadCoinTransactions(profile.id, TRANSACTION_PAGE_SIZE + 1),
      loadUserReferrals(profile.id),
      loadLatestVerificationRequest(profile.id),
      loadWalletRechargeRequests(profile.id, 4),
    ]).then(([transactionsResult, referralsResult, verificationResult, rechargeResult]) => {
      if (cancelled) {
        return;
      }

      if (transactionsResult.status === "fulfilled") {
        setTransactions(transactionsResult.value.slice(0, TRANSACTION_PAGE_SIZE));
        setHasMoreTransactions(
          transactionsResult.value.length > TRANSACTION_PAGE_SIZE
        );
      }

      if (referralsResult.status === "fulfilled") {
        setReferrals(referralsResult.value);
      }

      if (verificationResult.status === "fulfilled") {
        setVerificationRequest(verificationResult.value);
      }

      if (rechargeResult.status === "fulfilled") {
        setRechargeRequests(rechargeResult.value);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [profile.id]);

  const instagramAccess =
    activeAccess.find((entry) => entry.access_key === COIN_ACCESS_KEYS.instagramAutomation) || null;
  const verificationCostLabel = getCoinCostLabel(
    featureSettings,
    COIN_FEATURE_KEYS.verificationRequestSubmit
  );
  const verificationState = profile.is_verified ? "approved" : verificationRequest?.status || "idle";
  const verificationTone = getVerificationTone(verificationState);
  const VerificationStateIcon = verificationTone.icon;
  const canSubmitVerification =
    !profile.is_verified &&
    verificationRequest?.status !== "pending" &&
    verificationRequest?.status !== "approved";
  const verificationStatusLabel = profile.is_verified
    ? "Verified active"
    : verificationRequest
      ? getVerificationRequestBadge(verificationRequest.status)
      : "Apply for review";
  const pendingRechargeCount = useMemo(
    () => rechargeRequests.filter((request) => request.status === "pending").length,
    [rechargeRequests]
  );
  const latestRechargeRequest = rechargeRequests[0] || null;
  const verificationSummary = useMemo(() => {
    if (profile.is_verified) {
      return "Blue tick active";
    }

    if (!verificationRequest) {
      return "Upload proof";
    }

    if (verificationRequest.status === "pending") {
      return "In review";
    }

    if (verificationRequest.status === "approved") {
      return "Approved";
    }

    return verificationRequest.review_note || "Submit again";
  }, [profile.is_verified, verificationRequest]);

  const loadMoreTransactions = async () => {
    if (loadingMoreTransactions || !hasMoreTransactions) {
      return;
    }

    setLoadingMoreTransactions(true);

    try {
      const nextTransactions = await loadCoinTransactions(
        profile.id,
        TRANSACTION_PAGE_SIZE + 1,
        transactions.length
      );

      setTransactions((current) => [
        ...current,
        ...nextTransactions.slice(0, TRANSACTION_PAGE_SIZE),
      ]);
      setHasMoreTransactions(
        nextTransactions.length > TRANSACTION_PAGE_SIZE
      );
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Could not load more wallet activity."
      );
    } finally {
      setLoadingMoreTransactions(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <span
          className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
            canPost
              ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
              : "bg-amber-500/10 text-amber-700 dark:text-amber-300"
          }`}
        >
          {canPost ? "Posting" : "Restricted"}
        </span>
        <span
          className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
            instagramAccess
              ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
              : "bg-app-secondary text-app-muted"
          }`}
        >
          {instagramAccess ? "Pass" : "No pass"}
        </span>
        <span
          className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
            profile.is_verified
              ? "bg-brand/10 text-brand"
              : "bg-app-secondary text-app-muted"
          }`}
        >
          {profile.is_verified ? "Verified" : "Blue tick"}
        </span>
      </div>

      <section className="grid grid-cols-2 gap-2">
        <article className="col-span-2 rounded-[18px] border border-app-border bg-app-card px-3.5 py-3.5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-medium text-app-muted">Balance</p>
              <p className="mt-1 font-display text-[1.8rem] font-semibold leading-none text-app-text">
                {formatCoinAmount(wallet?.balance || 0)}
              </p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-[14px] bg-brand text-white">
              <Wallet2 className="h-4.5 w-4.5" />
            </div>
          </div>
        </article>

        <article className="col-span-2 rounded-[18px] border border-app-border bg-app-card px-3.5 py-3.5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-app-muted">
                <Coins className="h-4 w-4 text-brand" />
                <p className="text-[11px] font-medium">Recharge</p>
              </div>
              <p className="mt-1 text-base font-semibold text-app-text">
                1 coin = Rs 1
              </p>
              <p className="mt-1 text-[11px] text-app-muted">
                {pendingRechargeCount > 0
                  ? `${pendingRechargeCount} pending approval`
                  : latestRechargeRequest
                    ? "Latest request updated"
                    : "Add coins with UPI"}
              </p>
            </div>

            <button
              type="button"
              onClick={() => navigate("/app/wallet/recharge")}
              className="inline-flex items-center gap-2 rounded-full bg-brand px-4 py-2.5 text-sm font-semibold text-white shadow-[0_16px_28px_-20px_rgba(37,99,235,0.7)]"
            >
              <Coins className="h-4 w-4" />
              Recharge
            </button>
          </div>

          {rechargeRequests.length ? (
            <div className="mt-3 space-y-2">
              {rechargeRequests.slice(0, 3).map((request) => (
                <div
                  key={request.id}
                  className="flex items-center justify-between gap-3 rounded-[18px] bg-app-secondary/55 px-3 py-2.5"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-app-text">
                      {formatCoinAmount(request.coins_requested)} coins
                    </p>
                    <p className="text-[11px] text-app-muted">
                      {formatDistanceToNow(new Date(request.created_at), {
                        addSuffix: true,
                      })}
                    </p>
                  </div>
                  <WalletRechargeStatusBadge status={request.status} />
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-3 rounded-[18px] bg-app-secondary/55 px-3 py-3 text-sm text-app-muted">
              No recharge request yet.
            </div>
          )}
        </article>

        <article className="rounded-[18px] border border-app-border bg-app-card px-3 py-3">
          <div className="flex items-center gap-1.5 text-app-muted">
            <TrendingUp className="h-3.5 w-3.5 text-emerald-600" />
            <p className="text-[11px] font-medium">In</p>
          </div>
          <p className="mt-1 text-base font-semibold text-app-text">
            {formatCoinAmount(wallet?.total_credited || 0)}
          </p>
        </article>

        <article className="rounded-[18px] border border-app-border bg-app-card px-3 py-3">
          <div className="flex items-center gap-1.5 text-app-muted">
            <TrendingDown className="h-3.5 w-3.5 text-rose-500" />
            <p className="text-[11px] font-medium">Out</p>
          </div>
          <p className="mt-1 text-base font-semibold text-app-text">
            {formatCoinAmount(wallet?.total_debited || 0)}
          </p>
        </article>

        <article className="rounded-[18px] border border-app-border bg-app-card px-3 py-3">
          <div className="flex items-center gap-1.5 text-app-muted">
            <Copy className="h-3.5 w-3.5 text-brand" />
            <p className="text-[11px] font-medium">Refs</p>
          </div>
          <p className="mt-1 text-base font-semibold text-app-text">
            {referrals.length}
          </p>
        </article>

        <article className="rounded-[18px] border border-app-border bg-app-card px-3 py-3">
          <div className="flex items-center gap-1.5 text-app-muted">
            <ShieldCheck className="h-3.5 w-3.5 text-brand" />
            <p className="text-[11px] font-medium">Blue</p>
          </div>
          <p className="mt-1 text-base font-semibold text-app-text">
            {profile.is_verified ? "On" : "Off"}
          </p>
        </article>
      </section>

      <section className="grid gap-2 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.02fr)]">
          <div className="rounded-[20px] bg-app-card px-4 py-4">
            {instagramAccess ? (
              <div className="rounded-[18px] border border-emerald-500/20 bg-emerald-500/10 px-3 py-3 text-emerald-700 dark:text-emerald-300">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4" />
                  <p className="text-sm font-semibold">Pass active</p>
                </div>
                <p className="mt-1 text-xs">Until {new Date(instagramAccess.expires_at).toLocaleDateString()}</p>
              </div>
            ) : (
              <div className="rounded-[18px] border border-app-border bg-app-secondary/55 px-3 py-3">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-app-muted" />
                  <p className="text-sm font-semibold text-app-text">No pass</p>
                </div>
              </div>
            )}

            <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
              <div className="rounded-[18px] bg-app-secondary/55 px-3 py-2.5">
                <p className="text-[11px] text-app-muted">Posting</p>
                <p className="mt-1 font-semibold text-app-text">{canPost ? "On" : "Off"}</p>
              </div>
              <div className="rounded-[18px] bg-app-secondary/55 px-3 py-2.5">
                <p className="text-[11px] text-app-muted">Blue tick</p>
                <p className="mt-1 font-semibold text-app-text">{profile.is_verified ? "On" : "Off"}</p>
              </div>
            </div>
          </div>

          <div className={`rounded-[20px] border px-3.5 py-3.5 ${verificationTone.cardClass}`}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <VerificationStateIcon className="h-4 w-4" />
                  <p className="text-sm font-semibold">{verificationStatusLabel}</p>
                </div>
                <p className="mt-1 text-xs opacity-85">{verificationSummary}</p>
              </div>

              <div className="rounded-full bg-white/70 px-2.5 py-1 text-[11px] font-semibold text-app-text">
                {verificationCostLabel}
              </div>
            </div>

            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              <div className="rounded-[18px] bg-white/70 px-3 py-2.5 text-sm text-app-text">
                <div className="flex items-center gap-2 text-app-muted">
                  <ImageIcon className="h-4 w-4" />
                  <span className="text-[11px]">Proof</span>
                </div>
                <p className="mt-1 text-sm font-semibold">PNG / PDF</p>
              </div>
              <div className="rounded-[18px] bg-white/70 px-3 py-2.5 text-sm text-app-text">
                <div className="flex items-center gap-2 text-app-muted">
                  <FileText className="h-4 w-4" />
                  <span className="text-[11px]">Update</span>
                </div>
                <p className="mt-1 text-sm font-semibold">
                  {verificationRequest?.created_at
                    ? formatDistanceToNow(new Date(verificationRequest.created_at), { addSuffix: true })
                    : "No request yet"}
                </p>
              </div>
            </div>

            {verificationRequest?.proof_public_url ? (
              <a
                href={verificationRequest.proof_public_url}
                target="_blank"
                rel="noreferrer"
                className="mt-2 inline-flex items-center gap-2 rounded-full border border-current/15 bg-white/80 px-3 py-2 text-xs font-semibold text-app-text"
              >
                <FileText className="h-4 w-4" />
                Open proof
              </a>
            ) : null}

            {canSubmitVerification ? (
              <div className="mt-2.5 space-y-2.5 rounded-[18px] bg-white/75 p-3 text-app-text shadow-[0_18px_32px_-30px_rgba(15,23,42,0.35)]">
                <label className="grid gap-2">
                  <span className="text-[11px] font-medium text-app-muted">Note</span>
                  <input
                    value={verificationNote}
                    onChange={(event) => setVerificationNote(event.target.value)}
                    className="input-shell"
                    placeholder="Student ID or note"
                    maxLength={160}
                  />
                </label>

                <div className="grid gap-2">
                  <span className="text-[11px] font-medium text-app-muted">Proof</span>
                  <input
                    type="file"
                    accept=".png,application/pdf"
                    onChange={(event) => {
                      const selectedFile = event.target.files?.[0] || null;
                      event.target.value = "";

                      if (!selectedFile) {
                        return;
                      }

                      if (!isAllowedVerificationProof(selectedFile)) {
                        toast.error("Use a PNG or PDF proof document.");
                        return;
                      }

                      setVerificationFile(selectedFile);
                    }}
                    className="sr-only"
                    id="verification-proof-upload"
                  />
                  <label
                    htmlFor="verification-proof-upload"
                    className="flex cursor-pointer items-center justify-between gap-3 rounded-[18px] border border-dashed border-app-border bg-app-secondary/50 px-3 py-2.5 text-sm"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-app-text">
                        {verificationFile ? verificationFile.name : "Choose file"}
                      </p>
                    </div>
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[14px] bg-brand/10 text-brand">
                      <Upload className="h-4 w-4" />
                    </div>
                  </label>
                </div>

                <button
                  type="button"
                  disabled={submittingVerification || !verificationFile}
                  onClick={() => {
                    if (!verificationFile) {
                      toast.error("Choose a PNG or PDF proof file first.");
                      return;
                    }

                    setSubmittingVerification(true);
                    void submitVerificationRequest({
                      userId: profile.id,
                      username: profile.username,
                      requestNote: verificationNote,
                      proofFile: verificationFile,
                    })
                      .then(async (request) => {
                        setVerificationRequest(request);
                        setVerificationFile(null);
                        setVerificationNote("");
                        await refreshWallet().catch(() => undefined);
                        toast.success("Blue tick request submitted for review.");
                      })
                      .catch((error) => {
                        toast.error(error instanceof Error ? error.message : "Could not submit verification request.");
                      })
                      .finally(() => setSubmittingVerification(false));
                  }}
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-brand px-4 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <ShieldCheck className="h-4 w-4" />
                  {submittingVerification ? "Submitting..." : `Submit ${verificationCostLabel}`}
                </button>
              </div>
            ) : null}

            {verificationRequest?.review_note ? (
              <div className="mt-2 rounded-[18px] bg-white/70 px-3 py-2.5 text-sm text-app-text">
                <p className="text-[11px] font-semibold text-app-muted">Admin note</p>
                <p className="mt-1">{verificationRequest.review_note}</p>
              </div>
            ) : null}
          </div>
      </section>

      <section className="grid gap-2 lg:grid-cols-2">
        <div className="min-w-0 rounded-[20px] border border-app-border bg-app-card px-3.5 py-3.5">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[11px] font-medium text-app-muted">Referral</p>
            <button
              type="button"
              onClick={() => {
                const link = `${window.location.origin}/auth?ref=${profile.referral_code}`;
                void navigator.clipboard.writeText(link).then(
                  () => toast.success("Referral link copied."),
                  () => toast.error("Could not copy the referral link.")
                );
              }}
              className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-app-border bg-app-secondary/55 text-app-text"
              aria-label="Copy referral link"
            >
              <Copy className="h-3.5 w-3.5 text-brand" />
            </button>
          </div>

          <p className="mt-2 break-all font-display text-base font-semibold tracking-[0.08em] text-app-text">
            {profile.referral_code}
          </p>

          <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
            <div className="min-w-0 rounded-[18px] bg-app-secondary/55 px-3 py-2.5">
              <p className="text-[11px] text-app-muted">Signups</p>
              <p className="mt-1 font-semibold text-app-text">{referrals.length}</p>
            </div>
            <div className="min-w-0 rounded-[18px] bg-app-secondary/55 px-3 py-2.5">
              <p className="text-[11px] text-app-muted">Reward</p>
              <p className="mt-1 break-words font-semibold text-app-text">
                {referrals[0]?.rewarded_at
                  ? formatDistanceToNow(new Date(referrals[0].rewarded_at), { addSuffix: true })
                  : "None"}
              </p>
            </div>
          </div>
        </div>

        <div className="min-w-0 rounded-[20px] border border-app-border bg-app-card px-3.5 py-3.5">
          <p className="text-[11px] font-medium text-app-muted">Activity</p>
          {transactions.length ? (
            <div className="mt-2 space-y-2">
              {transactions.map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-center justify-between gap-3 rounded-[18px] bg-app-secondary/55 px-3 py-2.5 text-sm"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-app-text">
                      {entry.description || entry.transaction_type.replace(/_/g, " ")}
                    </p>
                    <p className="text-[11px] text-app-muted">
                      {formatDistanceToNow(new Date(entry.created_at), { addSuffix: true })}
                    </p>
                  </div>
                  <div className="text-right">
                    <p
                      className={
                        entry.direction === "credit"
                          ? "font-semibold text-emerald-600"
                          : "font-semibold text-rose-500"
                      }
                    >
                      {entry.direction === "credit" ? "+" : "-"}
                      {formatCoinAmount(Math.abs(entry.amount))}
                    </p>
                  </div>
                </div>
              ))}

              {hasMoreTransactions ? (
                <button
                  type="button"
                  onClick={() => void loadMoreTransactions()}
                  disabled={loadingMoreTransactions}
                  className="inline-flex w-full items-center justify-center rounded-full border border-app-border bg-app-card px-3 py-2 text-xs font-semibold text-app-text transition hover:border-brand/25 hover:text-brand disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loadingMoreTransactions ? "Loading..." : "Load more"}
                </button>
              ) : null}
            </div>
          ) : (
            <div className="mt-2 rounded-[18px] bg-app-secondary/55 px-3 py-3 text-xs text-app-muted">
              No activity
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
