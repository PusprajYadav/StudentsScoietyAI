import {
  ArrowLeft,
  Copy,
  Loader2,
  QrCode,
  RefreshCw,
  ShieldCheck,
  Smartphone,
  Wallet2,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import { formatCoinAmount } from "../lib/coins";
import {
  buildWalletRechargeUpiLink,
  clampWalletRechargeCoins,
  createWalletRechargeOrderId,
  createWalletRechargeRequest,
  getWalletRechargeStatusLabel,
  loadActiveWalletUpiSettings,
  loadWalletRechargeRequests,
  MAX_WALLET_RECHARGE_COINS,
  WALLET_RECHARGE_PRESET_AMOUNTS,
} from "../lib/walletRecharge";
import { useAuthStore } from "../store/authStore";
import type {
  WalletRechargeRequestRow,
  WalletUpiSettingRow,
} from "../types/database";
import { WalletRechargeQrPreview } from "../features/wallet/WalletRechargeQrPreview";
import { WalletRechargeStatusBadge } from "../features/wallet/WalletRechargeStatusBadge";

type AmountOption = (typeof WALLET_RECHARGE_PRESET_AMOUNTS)[number] | "custom";

export function WalletRechargePage() {
  const navigate = useNavigate();
  const { profile } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [upiSettings, setUpiSettings] = useState<WalletUpiSettingRow[]>([]);
  const [selectedUpiId, setSelectedUpiId] = useState<number | null>(null);
  const [requests, setRequests] = useState<WalletRechargeRequestRow[]>([]);
  const [amountOption, setAmountOption] = useState<AmountOption>(100);
  const [customCoins, setCustomCoins] = useState("");
  const [upiReference, setUpiReference] = useState("");
  const [paymentNote, setPaymentNote] = useState("");
  const [orderId, setOrderId] = useState(() => createWalletRechargeOrderId());

  useEffect(() => {
    if (!profile?.id) {
      return;
    }

    let cancelled = false;

    const load = async () => {
      setLoading(true);

      try {
        const [nextSetting, nextRequests] = await Promise.all([
          loadActiveWalletUpiSettings(),
          loadWalletRechargeRequests(profile.id, 8),
        ]);

        if (cancelled) {
          return;
        }

        setUpiSettings(nextSetting);
        setSelectedUpiId((current) =>
          current && nextSetting.some((entry) => entry.id === current)
            ? current
            : nextSetting[0]?.id || null
        );
        setRequests(nextRequests);
      } catch (error) {
        if (!cancelled) {
          toast.error(
            error instanceof Error
              ? error.message
              : "Could not load wallet recharge."
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [profile?.id]);

  const selectedCoins = useMemo(() => {
    if (amountOption === "custom") {
      const parsed = Number.parseInt(customCoins, 10);
      return Number.isFinite(parsed) ? clampWalletRechargeCoins(parsed) : 0;
    }

    return amountOption;
  }, [amountOption, customCoins]);

  const rechargeLink = useMemo(() => {
    const selectedSetting = upiSettings.find((entry) => entry.id === selectedUpiId) || upiSettings[0] || null;
    if (!selectedSetting || selectedCoins <= 0) {
      return "";
    }

    return buildWalletRechargeUpiLink(selectedSetting, selectedCoins, orderId);
  }, [orderId, selectedCoins, selectedUpiId, upiSettings]);

  const upiSetting = useMemo(
    () => upiSettings.find((entry) => entry.id === selectedUpiId) || upiSettings[0] || null,
    [selectedUpiId, upiSettings]
  );

  const pendingCount = useMemo(
    () => requests.filter((entry) => entry.status === "pending").length,
    [requests]
  );
  const latestRequest = requests[0] || null;
  const canSubmit =
    Boolean(profile?.id) &&
    Boolean(upiSetting) &&
    selectedCoins >= 1 &&
    selectedCoins <= MAX_WALLET_RECHARGE_COINS &&
    upiReference.trim().length >= 4;

  const reload = async () => {
    if (!profile?.id) {
      return;
    }

    setRefreshing(true);

    try {
      const [nextSettings, nextRequests] = await Promise.all([
        loadActiveWalletUpiSettings(),
        loadWalletRechargeRequests(profile.id, 8),
      ]);

      setUpiSettings(nextSettings);
      setSelectedUpiId((current) =>
        current && nextSettings.some((entry) => entry.id === current)
          ? current
          : nextSettings[0]?.id || null
      );
      setRequests(nextRequests);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Could not refresh recharge requests."
      );
    } finally {
      setRefreshing(false);
    }
  };

  if (!profile) {
    return null;
  }

  return (
    <div className="space-y-3 sm:space-y-4">
      <section className="surface-card rounded-[22px] p-3.5 sm:rounded-[26px] sm:p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-app-muted">
              Wallet Recharge
            </p>
            <h1 className="mt-1 font-display text-[1.35rem] font-semibold tracking-tight text-app-text sm:text-[1.8rem]">
              Add coins
            </h1>
            <p className="mt-1 text-sm text-app-muted">
              1 coin = Rs 1. Coins are added only after admin approval.
            </p>
          </div>

          <button
            type="button"
            onClick={() =>
              navigate(`/profile/${profile.username}/settings/wallet`)
            }
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-app-border bg-app-card text-app-text transition hover:border-brand/25 hover:text-brand"
            aria-label="Back to wallet"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-3 grid gap-2 sm:grid-cols-3">
          <div className="rounded-[18px] border border-app-border bg-app-card px-3 py-3">
            <div className="flex items-center gap-2 text-app-muted">
              <Wallet2 className="h-4 w-4 text-brand" />
              <span className="text-[11px] font-medium">Rate</span>
            </div>
            <p className="mt-1 text-sm font-semibold text-app-text">1 coin = Rs 1</p>
          </div>

          <div className="rounded-[18px] border border-app-border bg-app-card px-3 py-3">
            <div className="flex items-center gap-2 text-app-muted">
              <ShieldCheck className="h-4 w-4 text-emerald-600" />
              <span className="text-[11px] font-medium">Admin</span>
            </div>
            <p className="mt-1 text-sm font-semibold text-app-text">
              {pendingCount > 0 ? `${pendingCount} pending` : "Approval required"}
            </p>
          </div>

          <div className="rounded-[18px] border border-app-border bg-app-card px-3 py-3">
            <div className="flex items-center gap-2 text-app-muted">
              <QrCode className="h-4 w-4 text-brand" />
              <span className="text-[11px] font-medium">Latest</span>
            </div>
            <p className="mt-1 text-sm font-semibold text-app-text">
              {latestRequest
                ? getWalletRechargeStatusLabel(latestRequest.status)
                : "No request yet"}
            </p>
          </div>
        </div>
      </section>

      <section className="grid gap-3">
        <section className="surface-card rounded-[22px] p-3.5 sm:rounded-[26px] sm:p-4">
          <div className="flex items-center gap-2">
            <Smartphone className="h-4 w-4 text-brand" />
            <p className="text-sm font-semibold text-app-text">Pay by UPI</p>
          </div>

          {loading ? (
            <div className="mt-4 flex items-center justify-center rounded-[20px] bg-app-card px-4 py-10 text-app-muted">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : upiSetting && rechargeLink ? (
            <div className="mt-3 grid gap-3 xl:grid-cols-[280px_minmax(0,1fr)] xl:items-center">
              <div className="flex justify-center rounded-[22px] border border-app-border bg-app-card px-4 py-4">
                <WalletRechargeQrPreview value={rechargeLink} />
              </div>

              <div className="rounded-[20px] border border-app-border bg-app-card px-3 py-3">
                {upiSettings.length > 1 ? (
                  <label className="mb-3 grid gap-2">
                    <span className="text-[11px] font-medium text-app-muted">Choose UPI target</span>
                    <select
                      value={selectedUpiId ?? upiSetting.id}
                      onChange={(event) => setSelectedUpiId(Number.parseInt(event.target.value, 10) || upiSetting.id)}
                      className="input-shell"
                    >
                      {upiSettings.map((setting) => (
                        <option key={setting.id} value={setting.id}>
                          {setting.merchant_name} · {setting.upi_id}
                        </option>
                      ))}
                    </select>
                  </label>
                ) : null}

                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[11px] font-medium text-app-muted">UPI ID</p>
                    <p className="mt-1 truncate text-sm font-semibold text-app-text">
                      {upiSetting.upi_id}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      void navigator.clipboard.writeText(upiSetting.upi_id).then(
                        () => toast.success("UPI ID copied."),
                        () => toast.error("Could not copy UPI ID.")
                      );
                    }}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-app-border bg-app-secondary/55 text-app-text"
                    aria-label="Copy upi id"
                  >
                    <Copy className="h-4 w-4" />
                  </button>
                </div>

                <div className="mt-3 grid gap-2 sm:grid-cols-3">
                  <div className="rounded-[16px] bg-app-secondary/55 px-3 py-2.5">
                    <p className="text-[11px] text-app-muted">Merchant</p>
                    <p className="mt-1 text-sm font-semibold text-app-text">
                      {upiSetting.merchant_name}
                    </p>
                  </div>
                  <div className="rounded-[16px] bg-app-secondary/55 px-3 py-2.5">
                    <p className="text-[11px] text-app-muted">Amount</p>
                    <p className="mt-1 text-sm font-semibold text-app-text">
                      Rs {selectedCoins || 0}
                    </p>
                  </div>
                  <div className="rounded-[16px] bg-app-secondary/55 px-3 py-2.5">
                    <p className="text-[11px] text-app-muted">Order ID</p>
                    <p className="mt-1 truncate text-sm font-semibold text-app-text">
                      {orderId}
                    </p>
                  </div>
                </div>

                <a
                  href={rechargeLink}
                  className="btn-primary mt-3 inline-flex w-full items-center justify-center gap-2 !rounded-full !px-4 !py-3"
                >
                  <QrCode className="h-4 w-4" />
                  Open UPI App
                </a>
              </div>
            </div>
          ) : (
            <div className="mt-3 rounded-[20px] border border-dashed border-app-border bg-app-card px-4 py-5 text-center text-sm text-app-muted">
              Admin has not activated wallet UPI yet.
            </div>
          )}
        </section>

        <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="surface-card rounded-[22px] p-3.5 sm:rounded-[26px] sm:p-4">
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => void reload()}
                disabled={refreshing}
                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-app-border bg-app-card text-app-text transition hover:border-brand/25 hover:text-brand disabled:cursor-not-allowed disabled:opacity-60"
                aria-label="Refresh recharge data"
              >
                {refreshing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
              </button>
            </div>

            <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-5">
              {WALLET_RECHARGE_PRESET_AMOUNTS.map((amount) => {
                const active = amountOption === amount;

                return (
                  <button
                    key={amount}
                    type="button"
                    onClick={() => setAmountOption(amount)}
                    className={`rounded-[18px] border px-3 py-3 text-left transition ${
                      active
                        ? "border-brand bg-brand text-white shadow-[0_16px_28px_-20px_rgba(37,99,235,0.7)]"
                        : "border-app-border bg-app-card text-app-text hover:border-brand/25"
                    }`}
                  >
                    <p className="text-sm font-semibold">{amount}</p>
                    <p
                      className={`mt-1 text-[11px] ${
                        active ? "text-white/80" : "text-app-muted"
                      }`}
                    >
                      Rs {amount}
                    </p>
                  </button>
                );
              })}

              <button
                type="button"
                onClick={() => setAmountOption("custom")}
                className={`rounded-[18px] border px-3 py-3 text-left transition ${
                  amountOption === "custom"
                    ? "border-brand bg-brand text-white shadow-[0_16px_28px_-20px_rgba(37,99,235,0.7)]"
                    : "border-app-border bg-app-card text-app-text hover:border-brand/25"
                }`}
              >
                <p className="text-sm font-semibold">Custom</p>
                <p
                  className={`mt-1 text-[11px] ${
                    amountOption === "custom" ? "text-white/80" : "text-app-muted"
                  }`}
                >
                  Up to 10K
                </p>
              </button>
            </div>

            {amountOption === "custom" ? (
              <label className="mt-3 grid gap-2">
                <span className="text-[11px] font-medium text-app-muted">
                  Custom coins
                </span>
                <input
                  type="number"
                  min={1}
                  max={MAX_WALLET_RECHARGE_COINS}
                  value={customCoins}
                  onChange={(event) => setCustomCoins(event.target.value)}
                  className="input-shell"
                  placeholder="Enter coins"
                />
              </label>
            ) : null}

            <div className="mt-3 grid gap-2 sm:grid-cols-3">
              <div className="rounded-[18px] border border-app-border bg-app-card px-3 py-3">
                <p className="text-[11px] font-medium text-app-muted">Coins</p>
                <p className="mt-1 text-base font-semibold text-app-text">
                  {selectedCoins > 0 ? formatCoinAmount(selectedCoins) : "--"}
                </p>
              </div>
              <div className="rounded-[18px] border border-app-border bg-app-card px-3 py-3">
                <p className="text-[11px] font-medium text-app-muted">Amount</p>
                <p className="mt-1 text-base font-semibold text-app-text">
                  {selectedCoins > 0 ? `Rs ${selectedCoins}` : "--"}
                </p>
              </div>
              <div className="rounded-[18px] border border-app-border bg-app-card px-3 py-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[11px] font-medium text-app-muted">Order ID</p>
                  <button
                    type="button"
                    onClick={() => {
                      void navigator.clipboard.writeText(orderId).then(
                        () => toast.success("Order ID copied."),
                        () => toast.error("Could not copy order ID.")
                      );
                    }}
                    className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-app-border bg-app-secondary/55 text-app-text"
                    aria-label="Copy order id"
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </button>
                </div>
                <p className="mt-1 truncate text-sm font-semibold text-app-text">
                  {orderId}
                </p>
              </div>
            </div>

            <div className="mt-3 grid gap-2">
              <label className="grid gap-2">
                <span className="text-[11px] font-medium text-app-muted">
                  UPI reference
                </span>
                <input
                  value={upiReference}
                  onChange={(event) => setUpiReference(event.target.value)}
                  className="input-shell"
                  placeholder="Transaction ID / UTR number"
                />
              </label>

              <label className="grid gap-2">
                <span className="text-[11px] font-medium text-app-muted">Note</span>
                <input
                  value={paymentNote}
                  onChange={(event) => setPaymentNote(event.target.value)}
                  className="input-shell"
                  placeholder="Optional note"
                  maxLength={120}
                />
              </label>
            </div>

            <button
              type="button"
              disabled={!canSubmit || submitting}
              onClick={() => {
                if (!profile.id || !upiSetting || !rechargeLink) {
                  toast.error("Wallet recharge is not available right now.");
                  return;
                }

                setSubmitting(true);
                void createWalletRechargeRequest({
                  orderId,
                  userId: profile.id,
                  coinsRequested: selectedCoins,
                  upiSetting,
                  upiReference,
                  paymentNote,
                  qrPayload: rechargeLink,
                })
                  .then((request) => {
                    setRequests((current) => [request, ...current].slice(0, 8));
                    setUpiReference("");
                    setPaymentNote("");
                    setOrderId(createWalletRechargeOrderId());
                    toast.success("Recharge request submitted for admin approval.");
                  })
                  .catch((error) => {
                    toast.error(
                      error instanceof Error
                        ? error.message
                        : "Could not submit recharge request."
                    );
                  })
                  .finally(() => setSubmitting(false));
              }}
              className="btn-primary mt-3 inline-flex w-full items-center justify-center gap-2 !rounded-full !px-5 !py-3 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ShieldCheck className="h-4 w-4" />
              )}
              {submitting ? "Submitting..." : "Submit for approval"}
            </button>
          </div>

          <section className="surface-card rounded-[22px] p-3.5 sm:rounded-[26px] sm:p-4">
            <p className="text-sm font-semibold text-app-text">Recent requests</p>

            {requests.length ? (
              <div className="mt-3 space-y-2">
                {requests.map((request) => (
                  <div
                    key={request.id}
                    className="rounded-[18px] border border-app-border bg-app-card px-3 py-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-app-text">
                          {request.order_id}
                        </p>
                        <p className="mt-1 text-[11px] text-app-muted">
                          {formatCoinAmount(request.coins_requested)} • Rs{" "}
                          {request.coins_requested}
                        </p>
                      </div>
                      <WalletRechargeStatusBadge status={request.status} />
                    </div>

                    <div className="mt-2 grid gap-2 sm:grid-cols-2">
                      <div className="rounded-[16px] bg-app-secondary/55 px-3 py-2.5">
                        <p className="text-[11px] text-app-muted">Reference</p>
                        <p className="mt-1 text-sm font-semibold text-app-text">
                          {request.upi_reference}
                        </p>
                      </div>
                      <div className="rounded-[16px] bg-app-secondary/55 px-3 py-2.5">
                        <p className="text-[11px] text-app-muted">Updated</p>
                        <p className="mt-1 text-sm font-semibold text-app-text">
                          {formatDistanceToNow(new Date(request.updated_at), {
                            addSuffix: true,
                          })}
                        </p>
                      </div>
                    </div>

                    {request.payment_note ? (
                      <p className="mt-2 text-xs text-app-muted">
                        Note: {request.payment_note}
                      </p>
                    ) : null}

                    {request.admin_note ? (
                      <div className="mt-2 rounded-[16px] bg-app-secondary/55 px-3 py-2.5">
                        <p className="text-[11px] font-medium text-app-muted">Admin note</p>
                        <p className="mt-1 text-sm text-app-text">
                          {request.admin_note}
                        </p>
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            ) : (
              <div className="mt-3 rounded-[18px] bg-app-card px-3 py-3 text-sm text-app-muted">
                No recharge request yet.
              </div>
            )}
          </section>
        </div>
      </section>
    </div>
  );
}
