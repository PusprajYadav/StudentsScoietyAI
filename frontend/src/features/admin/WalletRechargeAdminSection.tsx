import {
  Check,
  Coins,
  Loader2,
  RefreshCw,
  Smartphone,
  Trash2,
  Wallet2,
  X,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { AdminPagination } from "./AdminPagination";
import {
  AdminMiniStatGrid,
  AdminPanelCard,
  AdminPillTabs,
  AdminSectionHeading,
} from "./AdminUi";
import {
  approveWalletRechargeRequest,
  deleteWalletUpiSetting,
  loadAdminWalletRechargeRequests,
  loadWalletUpiSettingsForAdmin,
  rejectWalletRechargeRequest,
  saveWalletUpiSetting,
  type WalletRechargeRequestWithUser,
} from "../../lib/walletRecharge";
import type { WalletUpiSettingRow } from "../../types/database";
import { WalletRechargeStatusBadge } from "../wallet/WalletRechargeStatusBadge";

type WalletRechargeFilter = "all" | "pending" | "approved" | "rejected";
const WALLET_RECHARGE_PAGE_SIZE = 5;

interface WalletRechargeAdminSectionProps {
  searchTerm?: string;
}

function includesSearch(value: string, searchTerm: string) {
  return value.toLowerCase().includes(searchTerm);
}

export function WalletRechargeAdminSection({
  searchTerm = "",
}: WalletRechargeAdminSectionProps) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [filter, setFilter] = useState<WalletRechargeFilter>("pending");
  const [page, setPage] = useState(1);
  const [settings, setSettings] = useState<WalletUpiSettingRow[]>([]);
  const [requests, setRequests] = useState<WalletRechargeRequestWithUser[]>([]);
  const [editingSettingId, setEditingSettingId] = useState<number | null>(null);
  const [upiId, setUpiId] = useState("");
  const [merchantName, setMerchantName] = useState("Student Society");
  const [isActive, setIsActive] = useState(false);
  const [sortOrder, setSortOrder] = useState("100");
  const [notesById, setNotesById] = useState<Record<string, string>>({});

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);

      try {
        const [nextSettings, nextRequests] = await Promise.all([
          loadWalletUpiSettingsForAdmin(),
          loadAdminWalletRechargeRequests(),
        ]);

        if (cancelled) {
          return;
        }

        setSettings(nextSettings);
        setRequests(nextRequests);
        setUpiId("");
        setMerchantName("Student Society");
        setIsActive(false);
        setSortOrder("100");
        setNotesById(
          Object.fromEntries(
            nextRequests.map((request) => [request.id, request.admin_note || ""])
          )
        );
      } catch (error) {
        if (!cancelled) {
          toast.error(
            error instanceof Error
              ? error.message
              : "Could not load wallet recharge admin data."
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
  }, []);

  const refresh = async () => {
    setRefreshing(true);

    try {
      const [nextSettings, nextRequests] = await Promise.all([
        loadWalletUpiSettingsForAdmin(),
        loadAdminWalletRechargeRequests(),
      ]);

      setSettings(nextSettings);
      setRequests(nextRequests);
      setNotesById(
        Object.fromEntries(
          nextRequests.map((request) => [
            request.id,
            notesById[request.id] ?? request.admin_note ?? "",
          ])
        )
      );
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Could not refresh wallet recharge admin data."
      );
    } finally {
      setRefreshing(false);
    }
  };

  const counts = useMemo(
    () => ({
      pending: requests.filter((request) => request.status === "pending").length,
      approved: requests.filter((request) => request.status === "approved").length,
      rejected: requests.filter((request) => request.status === "rejected").length,
      activeUpi: settings.filter((setting) => setting.is_active).length,
    }),
    [requests, settings]
  );

  const filteredRequests = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();
    if (filter === "all") {
      return requests.filter((request) => {
        if (!normalizedSearch) {
          return true;
        }

        return [
          request.order_id,
          request.upi_reference,
          request.upi_id_used,
          request.payment_note || "",
          request.admin_note || "",
          request.user?.username || "",
          request.user?.full_name || "",
        ].some((value) => includesSearch(value, normalizedSearch));
      });
    }

    return requests.filter((request) => {
      if (request.status !== filter) {
        return false;
      }

      if (!normalizedSearch) {
        return true;
      }

      return [
        request.order_id,
        request.upi_reference,
        request.upi_id_used,
        request.payment_note || "",
        request.admin_note || "",
        request.user?.username || "",
        request.user?.full_name || "",
      ].some((value) => includesSearch(value, normalizedSearch));
    });
  }, [filter, requests, searchTerm]);
  const pagedRequests = useMemo(() => {
    const start = (page - 1) * WALLET_RECHARGE_PAGE_SIZE;
    return filteredRequests.slice(start, start + WALLET_RECHARGE_PAGE_SIZE);
  }, [filteredRequests, page]);

  useEffect(() => {
    setPage(1);
  }, [filter, searchTerm]);

  const filterTabs = [
    { id: "pending", label: "Pending", count: counts.pending, icon: Wallet2, activeClassName: "bg-gradient-to-r from-[#2563eb] to-[#38bdf8]" },
    { id: "approved", label: "Approved", count: counts.approved, icon: Check, activeClassName: "bg-gradient-to-r from-[#059669] to-[#10b981]" },
    { id: "rejected", label: "Rejected", count: counts.rejected, icon: X, activeClassName: "bg-gradient-to-r from-[#ef4444] to-[#f97316]" },
    { id: "all", label: "All", count: requests.length, icon: Coins, activeClassName: "bg-gradient-to-r from-[#6366f1] to-[#8b5cf6]" },
  ] as const;

  return (
    <section className="space-y-3">
      <AdminMiniStatGrid
        items={[
          {
            label: "Pending",
            value: counts.pending,
            icon: Wallet2,
            toneClassName: "bg-sky-100 text-sky-700",
          },
          {
            label: "Approved",
            value: counts.approved,
            icon: Check,
            toneClassName: "bg-emerald-100 text-emerald-700",
          },
          {
            label: "Active UPI",
            value: counts.activeUpi,
            icon: Smartphone,
            toneClassName: "bg-amber-100 text-amber-700",
          },
        ]}
      />

      <div className="grid gap-3 xl:grid-cols-[320px_minmax(0,1fr)]">
        <AdminPanelCard className="space-y-2.5">
          <AdminSectionHeading
            icon={Smartphone}
            title="Wallet UPI"
            description="Save multiple UPI targets and let users choose the one they want to pay into."
            iconClassName="from-emerald-500 to-teal-500"
            badge={
              <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-semibold text-emerald-700">
                {counts.activeUpi} active
              </span>
            }
          />

          <div className="grid gap-2">
            <label className="grid gap-1.5">
              <span className="text-[10px] font-medium text-slate-500">UPI ID</span>
              <input
                value={upiId}
                onChange={(event) => setUpiId(event.target.value)}
                className="input-shell"
                placeholder="merchant@upi"
              />
            </label>

            <label className="grid gap-1.5">
              <span className="text-[10px] font-medium text-slate-500">Merchant name</span>
              <input
                value={merchantName}
                onChange={(event) => setMerchantName(event.target.value)}
                className="input-shell"
                placeholder="Student Society"
              />
            </label>

            <label className="grid gap-1.5">
              <span className="text-[10px] font-medium text-slate-500">Sort order</span>
              <input
                value={sortOrder}
                onChange={(event) => setSortOrder(event.target.value)}
                className="input-shell"
                type="number"
                min={0}
                placeholder="100"
              />
            </label>

            <label className="flex items-center justify-between rounded-[14px] border border-slate-200 bg-slate-50 px-3 py-2">
              <div>
                <p className="text-[13px] font-semibold text-slate-900">UPI active</p>
                <p className="mt-1 text-[10px] text-slate-500">Users can only pay to UPI targets marked active.</p>
              </div>

              <input
                type="checkbox"
                checked={isActive}
                onChange={(event) => setIsActive(event.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-brand focus:ring-brand"
              />
            </label>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                if (!upiId.trim()) {
                  toast.error("Enter a UPI ID first.");
                  return;
                }

                setSavingSettings(true);
                void saveWalletUpiSetting({
                  id: editingSettingId,
                  upiId,
                  merchantName,
                  isActive,
                  sortOrder: Number.parseInt(sortOrder, 10) || 100,
                })
                  .then((saved) => {
                    setEditingSettingId(null);
                    setUpiId("");
                    setMerchantName("Student Society");
                    setIsActive(false);
                    setSortOrder("100");
                    toast.success(saved.id ? "Wallet UPI saved." : "Wallet UPI added.");
                    return refresh();
                  })
                  .catch((error) => {
                    toast.error(
                      error instanceof Error
                        ? error.message
                        : "Could not save wallet UPI settings."
                    );
                  })
                  .finally(() => setSavingSettings(false));
              }}
              disabled={savingSettings}
              className="btn-primary inline-flex flex-1 items-center justify-center gap-2 !rounded-full !px-4 !py-2 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {savingSettings ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Check className="h-4 w-4" />
              )}
              Save
            </button>

            <button
              type="button"
              onClick={() => {
                setEditingSettingId(null);
                setUpiId("");
                setMerchantName("Student Society");
                setIsActive(false);
                setSortOrder("100");
              }}
              className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-4 py-2 text-[11px] font-semibold text-slate-700 transition hover:border-brand/20"
            >
              Clear
            </button>

            <button
              type="button"
              onClick={() => void refresh()}
              disabled={refreshing}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-slate-700 transition hover:border-brand/20 hover:text-brand disabled:cursor-not-allowed disabled:opacity-60"
              aria-label="Refresh recharge admin"
            >
              {refreshing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
            </button>
          </div>

          <div className="space-y-2">
            {settings.length ? (
              settings.map((setting) => (
                <article key={setting.id} className="rounded-[14px] border border-slate-200 bg-slate-50 px-3 py-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate text-[12px] font-semibold text-slate-900">{setting.merchant_name}</p>
                        <span className={`rounded-full px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.14em] ${setting.is_active ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-600"}`}>
                          {setting.is_active ? "Active" : "Inactive"}
                        </span>
                      </div>
                      <p className="mt-1 truncate text-[11px] text-slate-500">{setting.upi_id}</p>
                      <p className="mt-1 text-[10px] text-slate-400">Order {setting.sort_order}</p>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingSettingId(setting.id);
                          setUpiId(setting.upi_id);
                          setMerchantName(setting.merchant_name);
                          setIsActive(setting.is_active);
                          setSortOrder(String(setting.sort_order));
                        }}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700"
                        aria-label="Edit UPI setting"
                      >
                        <Check className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setSavingSettings(true);
                          void deleteWalletUpiSetting(setting.id)
                            .then(async () => {
                              if (editingSettingId === setting.id) {
                                setEditingSettingId(null);
                                setUpiId("");
                                setMerchantName("Student Society");
                                setIsActive(false);
                                setSortOrder("100");
                              }
                              toast.success("Wallet UPI deleted.");
                              await refresh();
                            })
                            .catch((error) => {
                              toast.error(
                                error instanceof Error ? error.message : "Could not delete wallet UPI."
                              );
                            })
                            .finally(() => setSavingSettings(false));
                        }}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-rose-200 bg-rose-50 text-rose-600"
                        aria-label="Delete UPI setting"
                      >
                        {savingSettings && editingSettingId === setting.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="h-3.5 w-3.5" />
                        )}
                      </button>
                    </div>
                  </div>
                </article>
              ))
            ) : (
              <div className="rounded-[14px] border border-dashed border-slate-200 bg-slate-50 px-3 py-4 text-[12px] text-slate-500">
                No UPI targets saved yet.
              </div>
            )}
          </div>
        </AdminPanelCard>

        <AdminPanelCard className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <AdminSectionHeading
              icon={Wallet2}
              title="Recharge requests"
              description="Approve to add coins. Pending and rejected requests never credit balances."
              iconClassName="from-sky-500 to-indigo-500"
              className="flex-1"
            />

            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-600">
              {filteredRequests.length} result{filteredRequests.length === 1 ? "" : "s"}
            </span>
          </div>

          <AdminPillTabs
            tabs={filterTabs.map((tab) => ({ ...tab }))}
            activeId={filter}
            onChange={(value) => setFilter(value as WalletRechargeFilter)}
          />

          {loading ? (
            <div className="mt-4 flex items-center justify-center rounded-[18px] bg-slate-50 px-4 py-12 text-slate-500">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : pagedRequests.length ? (
            <div className="mt-3 space-y-2.5">
              {pagedRequests.map((request) => (
                <article
                  key={request.id}
                  className="rounded-[14px] border border-slate-200 bg-[linear-gradient(135deg,#ffffff,#f8fbff)] p-2.5"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-[13px] font-semibold text-slate-900">
                          {request.order_id}
                        </p>
                        <WalletRechargeStatusBadge status={request.status} />
                      </div>
                      <p className="mt-1 text-[11px] text-slate-500">
                        {request.user?.full_name ||
                          request.user?.username ||
                          "Unknown user"}
                      </p>
                    </div>

                    <div className="text-right">
                      <p className="text-[13px] font-semibold text-slate-900">
                        {request.coins_requested} coins
                      </p>
                      <p className="text-[10px] text-slate-500">
                        {formatDistanceToNow(new Date(request.created_at), {
                          addSuffix: true,
                        })}
                      </p>
                    </div>
                  </div>

                  <div className="mt-2.5 grid gap-2 sm:grid-cols-3">
                    <div className="rounded-[12px] bg-slate-50 px-2.5 py-2">
                      <p className="text-[10px] text-slate-500">Reference</p>
                      <p className="mt-1 text-[12px] font-semibold text-slate-900">
                        {request.upi_reference}
                      </p>
                    </div>
                    <div className="rounded-[12px] bg-slate-50 px-2.5 py-2">
                      <p className="text-[10px] text-slate-500">UPI</p>
                      <p className="mt-1 truncate text-[12px] font-semibold text-slate-900">
                        {request.upi_id_used}
                      </p>
                    </div>
                    <div className="rounded-[12px] bg-slate-50 px-2.5 py-2">
                      <p className="text-[10px] text-slate-500">Reviewed</p>
                      <p className="mt-1 text-[12px] font-semibold text-slate-900">
                        {request.reviewed_at
                          ? formatDistanceToNow(new Date(request.reviewed_at), {
                              addSuffix: true,
                            })
                          : "Not yet"}
                      </p>
                    </div>
                  </div>

                  {request.payment_note ? (
                    <p className="mt-2 text-[11px] text-slate-500">
                      User note: {request.payment_note}
                    </p>
                  ) : null}

                  <label className="mt-3 grid gap-1.5">
                    <span className="text-[10px] font-medium text-slate-500">
                      Admin note
                    </span>
                    <input
                      value={notesById[request.id] || ""}
                      onChange={(event) =>
                        setNotesById((current) => ({
                          ...current,
                          [request.id]: event.target.value,
                        }))
                      }
                      className="input-shell"
                      placeholder="Optional note"
                    />
                  </label>

                  {request.status === "pending" ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setReviewingId(request.id);
                          void approveWalletRechargeRequest(
                            request.id,
                            notesById[request.id]
                          )
                            .then(() => {
                              toast.success("Recharge approved.");
                              return refresh();
                            })
                            .catch((error) => {
                              toast.error(
                                error instanceof Error
                                  ? error.message
                                  : "Could not approve recharge request."
                              );
                            })
                            .finally(() => setReviewingId(null));
                        }}
                        disabled={reviewingId === request.id}
                        className="inline-flex items-center gap-2 rounded-full bg-emerald-600 px-3.5 py-1.5 text-[11px] font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {reviewingId === request.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Check className="h-4 w-4" />
                        )}
                        Approve
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setReviewingId(request.id);
                          void rejectWalletRechargeRequest(
                            request.id,
                            notesById[request.id]
                          )
                            .then(() => {
                              toast.success("Recharge rejected.");
                              return refresh();
                            })
                            .catch((error) => {
                              toast.error(
                                error instanceof Error
                                  ? error.message
                                  : "Could not reject recharge request."
                              );
                            })
                            .finally(() => setReviewingId(null));
                        }}
                        disabled={reviewingId === request.id}
                        className="inline-flex items-center gap-2 rounded-full bg-rose-600 px-3.5 py-1.5 text-[11px] font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {reviewingId === request.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <X className="h-4 w-4" />
                        )}
                        Reject
                      </button>
                    </div>
                  ) : null}
                </article>
              ))}
            </div>
          ) : (
            <div className="mt-3 rounded-[18px] border border-dashed border-slate-200 bg-slate-50 px-4 py-10 text-center text-sm text-slate-500">
              No recharge request in this filter.
            </div>
          )}

          {!loading && filteredRequests.length > WALLET_RECHARGE_PAGE_SIZE ? (
            <div className="mt-3">
              <AdminPagination
                page={page}
                pageSize={WALLET_RECHARGE_PAGE_SIZE}
                totalCount={filteredRequests.length}
                canGoNext={page * WALLET_RECHARGE_PAGE_SIZE < filteredRequests.length}
                onPageChange={setPage}
              />
            </div>
          ) : null}
        </AdminPanelCard>
      </div>
    </section>
  );
}
