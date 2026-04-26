import {
  Inbox,
  Loader2,
  RefreshCcw,
  Send,
  ServerCog,
  ShieldCheck,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { AdminPagination } from "../admin/AdminPagination";
import { loadCoinFeatureSettings, saveCoinFeatureSettings } from "../../lib/coins";
import { supabase } from "../../lib/supabase";
import { useCoinWalletStore } from "../../store/coinWalletStore";
import type { CoinFeatureSettingRow, ProfileRow } from "../../types/database";
import { assignEmailRequest, loadEmailAdminDashboard, reviewEmailRequest } from "./api";
import {
  EMAIL_PLAN_DEFINITIONS,
  findEmailPlanSetting,
  formatMailboxStatus,
  formatStorageSize,
  type EmailAdminDashboard,
  type EmailConnectionRow,
  type EmailMailboxRequestRow,
  type EmailMailboxRow,
  type EmailPlanDefinition,
} from "./types";

interface EmailPlanPricingDraft {
  coinsRequired: string;
  isEnabled: boolean;
}

interface AssignmentDraft {
  emailAddress: string;
  displayName: string;
  status: EmailMailboxRow["status"];
  quotaMb: string;
  adminNote: string;
  profileName: string;
  username: string;
  password: string;
  smtpHost: string;
  smtpPort: string;
  smtpEncryption: "ssl" | "tls" | "none";
  imapHost: string;
  imapPort: string;
  imapEncryption: "ssl" | "tls" | "none";
  outboundEnabled: boolean;
  inboundEnabled: boolean;
  isActive: boolean;
}

const DEFAULT_QUOTA_MB = 500;
const EMAIL_ADMIN_PAGE_SIZE = 5;

function formatDateTime(value?: string | null) {
  if (!value) {
    return "Not yet";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleString();
}

function getPlanName(plan: EmailPlanDefinition) {
  return `Student Email ${plan.label}`;
}

function getPlanDescription(plan: EmailPlanDefinition) {
  return `${plan.label} mailbox access with admin-assigned email domains.`;
}

function createEmailPlanSetting(
  plan: EmailPlanDefinition,
  index: number,
  existing?: CoinFeatureSettingRow | null
): CoinFeatureSettingRow {
  if (existing) {
    return existing;
  }

  const nowIso = new Date().toISOString();
  return {
    feature_key: plan.featureKey,
    feature_name: getPlanName(plan),
    description: getPlanDescription(plan),
    category: "email_services",
    billing_model: "time_pass",
    coins_required: 0,
    access_key: "student_email_access",
    duration_days: plan.durationDays,
    is_enabled: true,
    sort_order: 700 + index,
    created_at: nowIso,
    updated_at: nowIso,
  };
}

function createAssignmentDraft(
  request: EmailMailboxRequestRow,
  mailbox?: EmailMailboxRow | null,
  connection?: EmailConnectionRow | null
): AssignmentDraft {
  const emailAddress = mailbox?.email_address || request.preferred_email_address;

  return {
    emailAddress,
    displayName: mailbox?.display_name || "",
    status: mailbox?.status || "active",
    quotaMb: String(
      Math.max(
        1,
        Math.round((mailbox?.quota_bytes || DEFAULT_QUOTA_MB * 1024 * 1024) / (1024 * 1024))
      )
    ),
    adminNote: request.admin_note || "",
    profileName: connection?.name || "Student Society Mail",
    username: connection?.username || emailAddress,
    password: "",
    smtpHost: connection?.smtp_host || "",
    smtpPort: String(connection?.smtp_port || 587),
    smtpEncryption: connection?.smtp_encryption || "tls",
    imapHost: connection?.imap_host || "",
    imapPort: String(connection?.imap_port || 993),
    imapEncryption: connection?.imap_encryption || "ssl",
    outboundEnabled: connection?.outbound_enabled ?? true,
    inboundEnabled: connection?.inbound_enabled ?? true,
    isActive: connection?.is_active ?? true,
  };
}

function getRequestTone(status: EmailMailboxRequestRow["status"]) {
  switch (status) {
    case "assigned":
      return "bg-emerald-500/12 text-emerald-700";
    case "approved":
      return "bg-sky-500/12 text-sky-700";
    case "rejected":
      return "bg-rose-500/12 text-rose-700";
    case "cancelled":
      return "bg-slate-200 text-slate-700";
    default:
      return "bg-amber-500/12 text-amber-700";
  }
}

interface EmailServicesAdminSectionProps {
  searchTerm?: string;
}

function matchesSearch(searchTerm: string, values: Array<string | null | undefined>) {
  if (!searchTerm) {
    return true;
  }

  return values.some((value) => (value || "").toLowerCase().includes(searchTerm));
}

export function EmailServicesAdminSection({
  searchTerm = "",
}: EmailServicesAdminSectionProps) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [dashboard, setDashboard] = useState<EmailAdminDashboard>({
    requests: [],
    mailboxes: [],
    connections: [],
  });
  const [profilesById, setProfilesById] = useState<Record<string, Partial<ProfileRow>>>({});
  const [coinSettings, setCoinSettings] = useState<CoinFeatureSettingRow[]>([]);
  const [planDrafts, setPlanDrafts] = useState<Record<string, EmailPlanPricingDraft>>({});
  const [assignmentDrafts, setAssignmentDrafts] = useState<Record<string, AssignmentDraft>>({});
  const [expandedRequestId, setExpandedRequestId] = useState<string | null>(null);
  const [savingPricing, setSavingPricing] = useState(false);
  const [reviewingRequestId, setReviewingRequestId] = useState<string | null>(null);
  const [assigningRequestId, setAssigningRequestId] = useState<string | null>(null);
  const [requestPage, setRequestPage] = useState(1);
  const [mailboxPage, setMailboxPage] = useState(1);

  const mailboxesByUserId = useMemo(
    () =>
      Object.fromEntries(
        dashboard.mailboxes.map((mailbox) => [mailbox.user_id, mailbox])
      ) as Record<string, EmailMailboxRow>,
    [dashboard.mailboxes]
  );
  const assignedConnectionsByMailboxId = useMemo(() => {
    const map: Record<string, EmailConnectionRow> = {};

    dashboard.connections.forEach((connection) => {
      if (map[connection.mailbox_id]) {
        return;
      }

      if (connection.scope === "assigned" || connection.is_default) {
        map[connection.mailbox_id] = connection;
      }
    });

    return map;
  }, [dashboard.connections]);
  const emailPlanSettings = useMemo(
    () =>
      EMAIL_PLAN_DEFINITIONS.map((plan, index) =>
        createEmailPlanSetting(plan, index, findEmailPlanSetting(coinSettings, plan.featureKey))
      ),
    [coinSettings]
  );
  const sortedRequests = useMemo(() => {
    const priority: Record<EmailMailboxRequestRow["status"], number> = {
      pending: 0,
      approved: 1,
      assigned: 2,
      rejected: 3,
      cancelled: 4,
    };

    return [...dashboard.requests].sort((left, right) => {
      const leftPriority = priority[left.status];
      const rightPriority = priority[right.status];

      if (leftPriority !== rightPriority) {
        return leftPriority - rightPriority;
      }

      return right.created_at.localeCompare(left.created_at);
    });
  }, [dashboard.requests]);
  const pendingRequests = sortedRequests.filter((request) => request.status === "pending").length;
  const activeMailboxes = dashboard.mailboxes.filter((mailbox) => mailbox.status === "active").length;
  const assignedConnections = dashboard.connections.filter((connection) => connection.scope === "assigned").length;
  const normalizedSearch = searchTerm.trim().toLowerCase();
  const filteredRequests = useMemo(
    () =>
      sortedRequests.filter((request) => {
        const profile = profilesById[request.user_id];

        return matchesSearch(normalizedSearch, [
          request.preferred_email_address,
          request.plan_feature_key,
          request.request_note,
          request.admin_note,
          profile?.username,
          profile?.full_name,
        ]);
      }),
    [normalizedSearch, profilesById, sortedRequests]
  );
  const filteredMailboxes = useMemo(
    () =>
      dashboard.mailboxes.filter((mailbox) => {
        const profile = profilesById[mailbox.user_id];
        const mailboxConnections = dashboard.connections
          .filter((connection) => connection.mailbox_id === mailbox.id)
          .map((connection) => connection.name);

        return matchesSearch(normalizedSearch, [
          mailbox.email_address,
          mailbox.status,
          mailbox.last_sync_error,
          profile?.username,
          profile?.full_name,
          ...mailboxConnections,
        ]);
      }),
    [dashboard.connections, dashboard.mailboxes, normalizedSearch, profilesById]
  );
  const pagedRequests = useMemo(() => {
    const start = (requestPage - 1) * EMAIL_ADMIN_PAGE_SIZE;
    return filteredRequests.slice(start, start + EMAIL_ADMIN_PAGE_SIZE);
  }, [filteredRequests, requestPage]);
  const pagedMailboxes = useMemo(() => {
    const start = (mailboxPage - 1) * EMAIL_ADMIN_PAGE_SIZE;
    return filteredMailboxes.slice(start, start + EMAIL_ADMIN_PAGE_SIZE);
  }, [filteredMailboxes, mailboxPage]);

  useEffect(() => {
    setRequestPage(1);
    setMailboxPage(1);
  }, [normalizedSearch]);

  const loadData = useCallback(async (quiet = false) => {
    if (quiet) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const [nextDashboard, nextCoinSettings] = await Promise.all([
        loadEmailAdminDashboard(),
        loadCoinFeatureSettings(),
      ]);
      setDashboard(nextDashboard);
      setCoinSettings(nextCoinSettings);

      const userIds = Array.from(
        new Set(
          [...nextDashboard.requests.map((entry) => entry.user_id), ...nextDashboard.mailboxes.map((entry) => entry.user_id)].filter(Boolean)
        )
      );

      if (userIds.length > 0) {
        const { data, error } = await supabase
          .from("profiles")
          .select("id,username,full_name")
          .in("id", userIds);

        if (error) {
          throw error;
        }

        setProfilesById(
          Object.fromEntries(
            ((data || []) as Partial<ProfileRow>[]).map((profile) => [String(profile.id), profile])
          )
        );
      } else {
        setProfilesById({});
      }

      setPlanDrafts(
        Object.fromEntries(
          EMAIL_PLAN_DEFINITIONS.map((plan, index) => {
            const setting = createEmailPlanSetting(
              plan,
              index,
              findEmailPlanSetting(nextCoinSettings, plan.featureKey)
            );
            return [
              plan.featureKey,
              {
                coinsRequired: String(setting.coins_required),
                isEnabled: setting.is_enabled,
              },
            ];
          })
        )
      );

      setAssignmentDrafts((current) => {
        const nextDrafts = { ...current };

        nextDashboard.requests.forEach((request) => {
          if (current[request.id]) {
            return;
          }

          const mailbox =
            (request.approved_mailbox_id
              ? nextDashboard.mailboxes.find((entry) => entry.id === request.approved_mailbox_id)
              : null) ||
            nextDashboard.mailboxes.find((entry) => entry.user_id === request.user_id) ||
            null;
          const connection = mailbox
            ? nextDashboard.connections.find(
                (entry) =>
                  entry.mailbox_id === mailbox.id &&
                  (entry.scope === "assigned" || entry.is_default)
              ) || null
            : null;

          nextDrafts[request.id] = createAssignmentDraft(request, mailbox, connection);
        });

        return nextDrafts;
      });

      setExpandedRequestId((current) => {
        if (current && nextDashboard.requests.some((request) => request.id === current)) {
          return current;
        }

        return (
          nextDashboard.requests.find((request) => request.status === "pending")?.id ||
          nextDashboard.requests[0]?.id ||
          null
        );
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not load email admin tools.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  async function handleSavePricing() {
    setSavingPricing(true);
    try {
      const nowIso = new Date().toISOString();
      const nextItems = EMAIL_PLAN_DEFINITIONS.map((plan, index) => {
        const draft = planDrafts[plan.featureKey];
        const baseSetting = createEmailPlanSetting(
          plan,
          index,
          findEmailPlanSetting(coinSettings, plan.featureKey)
        );
        const parsedCoins = Number.parseInt(draft?.coinsRequired || String(baseSetting.coins_required), 10);

        return {
          ...baseSetting,
          coins_required: Number.isFinite(parsedCoins) ? Math.max(0, parsedCoins) : baseSetting.coins_required,
          is_enabled: draft?.isEnabled ?? baseSetting.is_enabled,
          updated_at: nowIso,
          created_at: baseSetting.created_at || nowIso,
        };
      });

      const saved = await saveCoinFeatureSettings(nextItems);
      setCoinSettings(saved);
      await useCoinWalletStore.getState().refreshFeatureSettings().catch(() => undefined);
      toast.success("Email pricing saved.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save email pricing.");
    } finally {
      setSavingPricing(false);
    }
  }

  async function handleReviewRequest(
    requestId: string,
    status: "approved" | "rejected" | "cancelled"
  ) {
    setReviewingRequestId(requestId);
    try {
      const adminNote = assignmentDrafts[requestId]?.adminNote.trim() || undefined;
      await reviewEmailRequest(requestId, {
        status,
        admin_note: adminNote,
      });
      toast.success(
        status === "approved"
          ? "Request approved."
          : status === "rejected"
            ? "Request rejected."
            : "Request cancelled."
      );
      await loadData(true);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update this request.");
    } finally {
      setReviewingRequestId((current) => (current === requestId ? null : current));
    }
  }

  async function handleAssignRequest(request: EmailMailboxRequestRow) {
    const draft = assignmentDrafts[request.id];

    if (!draft) {
      toast.error("Assignment form is not ready yet.");
      return;
    }

    if (!draft.password.trim()) {
      toast.error("Enter the mailbox password before assigning.");
      return;
    }

    if (!draft.smtpHost.trim()) {
      toast.error("Enter the SMTP host before assigning.");
      return;
    }

    setAssigningRequestId(request.id);
    try {
      const quotaMb = Number.parseInt(draft.quotaMb, 10);

      await assignEmailRequest(request.id, {
        email_address: draft.emailAddress.trim().toLowerCase(),
        display_name: draft.displayName.trim() || undefined,
        status: draft.status,
        quota_bytes: (Number.isFinite(quotaMb) ? Math.max(1, quotaMb) : DEFAULT_QUOTA_MB) * 1024 * 1024,
        admin_note: draft.adminNote.trim() || undefined,
        profile: {
          scope: "assigned",
          name: draft.profileName.trim() || "Student Society Mail",
          email_address: draft.emailAddress.trim().toLowerCase(),
          username: draft.username.trim() || draft.emailAddress.trim().toLowerCase(),
          password: draft.password.trim(),
          smtp_host: draft.smtpHost.trim(),
          smtp_port: Number(draft.smtpPort || 587),
          smtp_encryption: draft.smtpEncryption,
          imap_host: draft.imapHost.trim() || undefined,
          imap_port: draft.imapHost.trim() ? Number(draft.imapPort || 993) : undefined,
          imap_encryption: draft.imapHost.trim() ? draft.imapEncryption : undefined,
          outbound_enabled: draft.outboundEnabled,
          inbound_enabled: draft.inboundEnabled,
          is_active: draft.isActive,
          is_default: true,
        },
      });

      setAssignmentDrafts((current) => ({
        ...current,
        [request.id]: {
          ...current[request.id],
          password: "",
        },
      }));
      toast.success("Mailbox assigned and connection saved.");
      await loadData(true);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not assign the mailbox.");
    } finally {
      setAssigningRequestId((current) => (current === request.id ? null : current));
    }
  }

  if (loading) {
    return (
      <div className="rounded-[18px] border border-slate-200 bg-white p-5 text-center shadow-[0_16px_34px_-32px_rgba(15,23,42,0.2)]">
        <Loader2 className="mx-auto h-7 w-7 animate-spin text-brand" />
        <p className="mt-3 font-display text-xl font-semibold text-slate-900">Email Services</p>
        <p className="mt-1 text-sm text-slate-500">Loading email plans, requests, and mailboxes.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <section className="relative overflow-hidden rounded-[16px] border border-white/70 bg-[radial-gradient(circle_at_top_left,_rgba(37,99,235,0.18),_transparent_34%),radial-gradient(circle_at_bottom_right,_rgba(20,184,166,0.14),_transparent_28%),linear-gradient(135deg,#f8fbff_0%,#ffffff_48%,#f0fdfa_100%)] p-3 shadow-[0_16px_34px_-32px_rgba(15,23,42,0.2)]">
        <div className="grid gap-2.5 xl:grid-cols-[minmax(0,1fr)_300px]">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-brand">Admin</p>
            <p className="mt-1 font-display text-lg font-semibold tracking-tight text-slate-900 sm:text-xl">
              Email Services
            </p>
            <p className="mt-1 max-w-2xl text-[11px] leading-5 text-slate-600">
              Control coin pricing, review mailbox requests, and assign SMTP or IMAP credentials for Student Society Mail.
            </p>

            <div className="mt-3 flex flex-wrap gap-1.5">
              <span className="rounded-full border border-sky-200/80 bg-white/85 px-2.5 py-1 text-[10px] font-semibold text-slate-900">
                {pendingRequests.toLocaleString()} pending
              </span>
              <span className="rounded-full border border-sky-200/80 bg-white/85 px-2.5 py-1 text-[10px] font-semibold text-slate-900">
                {activeMailboxes.toLocaleString()} active mailboxes
              </span>
              <span className="rounded-full border border-sky-200/80 bg-white/85 px-2.5 py-1 text-[10px] font-semibold text-slate-900">
                {assignedConnections.toLocaleString()} assigned connections
              </span>
            </div>
          </div>

          <div className="grid gap-2.5 sm:grid-cols-3 xl:grid-cols-1">
            {[
              {
                label: "Pending Requests",
                value: pendingRequests,
                icon: Inbox,
              },
              {
                label: "Live Mailboxes",
                value: activeMailboxes,
                icon: ShieldCheck,
              },
              {
                label: "SMTP / IMAP Profiles",
                value: dashboard.connections.length,
                icon: ServerCog,
              },
            ].map((item) => (
              <div
                key={item.label}
                className="rounded-[12px] border border-white/80 bg-white/90 p-2 shadow-[0_12px_24px_-24px_rgba(15,23,42,0.16)]"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-brand/10 text-brand">
                    <item.icon className="h-3.5 w-3.5" />
                  </div>
                  <div>
                    <p className="text-[9px] font-semibold uppercase tracking-[0.16em] text-slate-400">{item.label}</p>
                    <p className="mt-1 text-[15px] font-semibold text-slate-900">{item.value.toLocaleString()}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <button
          type="button"
          onClick={() => void loadData(true)}
          disabled={refreshing}
          className="btn-secondary mt-3 inline-flex !rounded-full !px-3 !py-1.5 text-[11px]"
        >
          <RefreshCcw className={`mr-1 h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
          {refreshing ? "Refreshing..." : "Refresh"}
        </button>
      </section>

      <section className="rounded-[16px] border border-slate-200 bg-white p-2.5 shadow-[0_16px_34px_-32px_rgba(15,23,42,0.2)]">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="font-display text-[15px] font-semibold text-slate-900">Email plan pricing</p>
            <p className="mt-1 text-[11px] text-slate-500">
              Monthly, 6 month, and yearly mailbox pricing is controlled here.
            </p>
          </div>
          <button
            type="button"
            onClick={handleSavePricing}
            disabled={savingPricing}
            className="rounded-full bg-brand px-3.5 py-1.5 text-[11px] font-semibold text-white disabled:opacity-60"
          >
            {savingPricing ? "Saving..." : "Save pricing"}
          </button>
        </div>

        <div className="mt-3 grid gap-3 lg:grid-cols-3">
          {emailPlanSettings.map((setting, index) => {
            const plan = EMAIL_PLAN_DEFINITIONS[index];
            const draft = planDrafts[plan.featureKey] || {
              coinsRequired: String(setting.coins_required),
              isEnabled: setting.is_enabled,
            };

            return (
              <article
                key={plan.featureKey}
                className="rounded-[16px] border border-slate-200 bg-[linear-gradient(135deg,#ffffff,#f8fbff)] p-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-brand">
                      {plan.durationLabel}
                    </p>
                    <p className="mt-1.5 text-[15px] font-semibold text-slate-900">{plan.label}</p>
                    <p className="mt-1 text-[11px] text-slate-500">{setting.description}</p>
                  </div>
                  <label className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-2.5 py-1">
                    <span className="text-[9px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                      Live
                    </span>
                    <input
                      type="checkbox"
                      checked={draft.isEnabled}
                      onChange={(event) =>
                        setPlanDrafts((current) => ({
                          ...current,
                          [plan.featureKey]: {
                            ...draft,
                            isEnabled: event.target.checked,
                          },
                        }))
                      }
                      className="h-4 w-4 rounded border-slate-300 text-brand focus:ring-brand"
                    />
                  </label>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-[120px_minmax(0,1fr)]">
                  <div className="rounded-[12px] bg-brand/8 px-3 py-2 text-brand">
                    <p className="text-[9px] font-semibold uppercase tracking-[0.14em] opacity-80">Preview</p>
                    <p className="mt-1 text-[12px] font-semibold">
                      {Number.parseInt(draft.coinsRequired, 10) > 0
                        ? `${Math.max(0, Number.parseInt(draft.coinsRequired, 10))} coins`
                        : "Free"}
                    </p>
                  </div>
                  <label className="grid gap-1">
                    <span className="text-[9px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                      Coins required
                    </span>
                    <input
                      type="number"
                      min={0}
                      max={100000}
                      value={draft.coinsRequired}
                      onChange={(event) =>
                        setPlanDrafts((current) => ({
                          ...current,
                          [plan.featureKey]: {
                            ...draft,
                            coinsRequired: event.target.value,
                          },
                        }))
                      }
                      className="input-shell h-8.5 rounded-xl text-[12px]"
                    />
                  </label>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section className="rounded-[18px] border border-slate-200 bg-white p-3 shadow-[0_18px_40px_-34px_rgba(15,23,42,0.22)]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="font-display text-lg font-semibold text-slate-900">Mailbox requests</p>
            <p className="mt-1 text-xs text-slate-500">
              Approve, reject, or assign the final mailbox and connection details.
            </p>
          </div>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold text-slate-600">
            {filteredRequests.length} requests
          </span>
        </div>

        <div className="mt-3 space-y-3">
          {pagedRequests.length > 0 ? (
            pagedRequests.map((request) => {
              const profile = profilesById[request.user_id];
              const mailbox =
                (request.approved_mailbox_id
                  ? dashboard.mailboxes.find((entry) => entry.id === request.approved_mailbox_id)
                  : null) ||
                mailboxesByUserId[request.user_id] ||
                null;
              const connection = mailbox ? assignedConnectionsByMailboxId[mailbox.id] || null : null;
              const expanded = expandedRequestId === request.id;
              const draft =
                assignmentDrafts[request.id] || createAssignmentDraft(request, mailbox, connection);

              return (
                <article
                  key={request.id}
                  className="rounded-[16px] border border-slate-200 bg-[linear-gradient(135deg,#ffffff,#f8fbff)] p-3"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-semibold text-slate-900">
                          {profile?.full_name || profile?.username || request.user_id}
                        </p>
                        <span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] ${getRequestTone(request.status)}`}>
                          {formatMailboxStatus(request.status)}
                        </span>
                      </div>
                    <p className="mt-1 text-xs text-slate-600">{request.preferred_email_address}</p>
                      <p className="mt-1 text-xs text-slate-500">
                        {request.plan_feature_key} • requested {formatDateTime(request.created_at)}
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {request.status !== "assigned" ? (
                        <button
                          type="button"
                          onClick={() => void handleReviewRequest(request.id, "approved")}
                          disabled={reviewingRequestId === request.id}
                          className="rounded-full bg-sky-500/10 px-3 py-2 text-xs font-semibold text-sky-700"
                        >
                          {reviewingRequestId === request.id ? "Saving..." : "Approve"}
                        </button>
                      ) : null}
                      {request.status !== "rejected" ? (
                        <button
                          type="button"
                          onClick={() => void handleReviewRequest(request.id, "rejected")}
                          disabled={reviewingRequestId === request.id}
                          className="rounded-full bg-rose-500/10 px-3 py-2 text-xs font-semibold text-rose-700"
                        >
                          Reject
                        </button>
                      ) : null}
                      <button
                        type="button"
                        onClick={() => setExpandedRequestId(expanded ? null : request.id)}
                        className="btn-secondary !rounded-full !px-3 !py-2 text-xs"
                      >
                        {expanded ? "Hide setup" : "Open setup"}
                      </button>
                    </div>
                  </div>

                  {request.request_note ? (
                    <p className="mt-3 rounded-[14px] bg-slate-50 px-3 py-2 text-xs text-slate-600">
                      {request.request_note}
                    </p>
                  ) : null}

                  {expanded ? (
                    <div className="mt-3 grid gap-3 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                      <div className="space-y-3">
                        <div className="grid gap-3 sm:grid-cols-2">
                          {[
                            ["Mailbox email", "emailAddress", request.preferred_email_address],
                            ["Display name", "displayName", "Student Society Mail"],
                            ["Quota (MB)", "quotaMb", String(DEFAULT_QUOTA_MB)],
                            ["Connection name", "profileName", "Student Society Mail"],
                            ["Username", "username", request.preferred_email_address],
                            ["Password", "password", "Mailbox password"],
                            ["SMTP host", "smtpHost", "smtp.example.com"],
                            ["SMTP port", "smtpPort", "587"],
                            ["IMAP host", "imapHost", "imap.example.com"],
                            ["IMAP port", "imapPort", "993"],
                          ].map(([label, key, placeholder]) => (
                            <label key={key} className="grid gap-1.5">
                              <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                                {label}
                              </span>
                              <input
                                value={draft[key as keyof AssignmentDraft] as string}
                                onChange={(event) =>
                                  setAssignmentDrafts((current) => ({
                                    ...current,
                                    [request.id]: {
                                      ...draft,
                                      [key]: event.target.value,
                                    },
                                  }))
                                }
                                className="input-field h-10 rounded-xl text-sm"
                                placeholder={placeholder}
                              />
                            </label>
                          ))}
                        </div>

                        <label className="grid gap-1.5">
                          <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                            Admin note
                          </span>
                          <textarea
                            value={draft.adminNote}
                            onChange={(event) =>
                              setAssignmentDrafts((current) => ({
                                ...current,
                                [request.id]: {
                                  ...draft,
                                  adminNote: event.target.value,
                                },
                              }))
                            }
                            className="input-field min-h-[96px] rounded-[16px] px-4 py-3 text-sm"
                            placeholder="Internal setup notes or message to the user."
                          />
                        </label>
                      </div>

                      <div className="space-y-3">
                        <div className="grid gap-3 sm:grid-cols-2">
                          <label className="grid gap-1.5">
                            <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                              Mailbox status
                            </span>
                            <select
                              value={draft.status}
                              onChange={(event) =>
                                setAssignmentDrafts((current) => ({
                                  ...current,
                                  [request.id]: {
                                    ...draft,
                                    status: event.target.value as EmailMailboxRow["status"],
                                  },
                                }))
                              }
                              className="input-field h-10 rounded-xl text-sm"
                            >
                              {["active", "pending_setup", "suspended", "renewal_required", "disabled"].map((status) => (
                                <option key={status} value={status}>
                                  {formatMailboxStatus(status as EmailMailboxRow["status"])}
                                </option>
                              ))}
                            </select>
                          </label>

                          <label className="grid gap-1.5">
                            <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                              SMTP encryption
                            </span>
                            <select
                              value={draft.smtpEncryption}
                              onChange={(event) =>
                                setAssignmentDrafts((current) => ({
                                  ...current,
                                  [request.id]: {
                                    ...draft,
                                    smtpEncryption: event.target.value as AssignmentDraft["smtpEncryption"],
                                  },
                                }))
                              }
                              className="input-field h-10 rounded-xl text-sm"
                            >
                              <option value="tls">TLS</option>
                              <option value="ssl">SSL</option>
                              <option value="none">None</option>
                            </select>
                          </label>

                          <label className="grid gap-1.5">
                            <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                              IMAP encryption
                            </span>
                            <select
                              value={draft.imapEncryption}
                              onChange={(event) =>
                                setAssignmentDrafts((current) => ({
                                  ...current,
                                  [request.id]: {
                                    ...draft,
                                    imapEncryption: event.target.value as AssignmentDraft["imapEncryption"],
                                  },
                                }))
                              }
                              className="input-field h-10 rounded-xl text-sm"
                            >
                              <option value="ssl">SSL</option>
                              <option value="tls">TLS</option>
                              <option value="none">None</option>
                            </select>
                          </label>
                        </div>

                        <div className="grid gap-2">
                          {[
                            ["Allow outbound send", "outboundEnabled"],
                            ["Allow inbound sync", "inboundEnabled"],
                            ["Profile active", "isActive"],
                          ].map(([label, key]) => (
                            <label
                              key={key}
                              className="flex items-center justify-between gap-3 rounded-[14px] border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm"
                            >
                              <span className="font-medium text-slate-700">{label}</span>
                              <input
                                type="checkbox"
                                checked={draft[key as keyof AssignmentDraft] as boolean}
                                onChange={(event) =>
                                  setAssignmentDrafts((current) => ({
                                    ...current,
                                    [request.id]: {
                                      ...draft,
                                      [key]: event.target.checked,
                                    },
                                  }))
                                }
                              />
                            </label>
                          ))}
                        </div>

                        <div className="rounded-[16px] border border-slate-200 bg-slate-50 p-3">
                          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                            Existing assignment
                          </p>
                          {mailbox ? (
                            <div className="mt-2 space-y-1.5 text-sm text-slate-600">
                              <p>{mailbox.email_address}</p>
                              <p>Status: {formatMailboxStatus(mailbox.status)}</p>
                              <p>Usage: {formatStorageSize(mailbox.used_bytes)} / {formatStorageSize(mailbox.quota_bytes)}</p>
                              <p>Last sync: {formatDateTime(mailbox.last_synced_at)}</p>
                            </div>
                          ) : (
                            <p className="mt-2 text-sm text-slate-500">No mailbox assigned yet.</p>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={() => void handleAssignRequest(request)}
                          disabled={assigningRequestId === request.id}
                          className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-full bg-brand px-4 text-sm font-semibold text-white disabled:opacity-60"
                        >
                          <Send className="h-4 w-4" />
                          {assigningRequestId === request.id ? "Assigning..." : mailbox ? "Update mailbox setup" : "Assign mailbox"}
                        </button>
                      </div>
                    </div>
                  ) : null}
                </article>
              );
            })
          ) : (
            <div className="rounded-[16px] border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-500">
              No email requests yet.
            </div>
          )}
        </div>

        {filteredRequests.length > EMAIL_ADMIN_PAGE_SIZE ? (
          <div className="mt-3">
            <AdminPagination
              page={requestPage}
              pageSize={EMAIL_ADMIN_PAGE_SIZE}
              totalCount={filteredRequests.length}
              canGoNext={requestPage * EMAIL_ADMIN_PAGE_SIZE < filteredRequests.length}
              onPageChange={setRequestPage}
            />
          </div>
        ) : null}
      </section>

      <section className="rounded-[18px] border border-slate-200 bg-white p-3 shadow-[0_18px_40px_-34px_rgba(15,23,42,0.22)]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="font-display text-lg font-semibold text-slate-900">Assigned mailboxes</p>
            <p className="mt-1 text-xs text-slate-500">Compact view of quota, sync state, and attached connections.</p>
          </div>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold text-slate-600">
            {filteredMailboxes.length} mailboxes
          </span>
        </div>

        <div className="mt-3 grid gap-3 lg:grid-cols-2">
          {pagedMailboxes.length > 0 ? (
            pagedMailboxes.map((mailbox) => {
              const profile = profilesById[mailbox.user_id];
              const mailboxConnections = dashboard.connections.filter((connection) => connection.mailbox_id === mailbox.id);

              return (
                <article
                  key={mailbox.id}
                  className="rounded-[16px] border border-slate-200 bg-[linear-gradient(135deg,#ffffff,#f8fbff)] p-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-900">{mailbox.email_address}</p>
                      <p className="mt-1 text-xs text-slate-500">
                        {profile?.full_name || profile?.username || mailbox.user_id}
                      </p>
                    </div>
                    <span className="rounded-full bg-brand/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-brand">
                      {formatMailboxStatus(mailbox.status)}
                    </span>
                  </div>

                  <div className="mt-3 grid gap-2 text-sm text-slate-600 sm:grid-cols-2">
                    <div className="rounded-[14px] bg-slate-50 px-3 py-2.5">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">Storage</p>
                      <p className="mt-1 font-semibold">
                        {formatStorageSize(mailbox.used_bytes)} / {formatStorageSize(mailbox.quota_bytes)}
                      </p>
                    </div>
                    <div className="rounded-[14px] bg-slate-50 px-3 py-2.5">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">Connections</p>
                      <p className="mt-1 font-semibold">{mailboxConnections.length}</p>
                    </div>
                  </div>

                  <div className="mt-3 rounded-[14px] bg-slate-50 px-3 py-2.5 text-xs text-slate-500">
                    <p>Last sync: {formatDateTime(mailbox.last_synced_at)}</p>
                    <p className="mt-1">Assigned at: {formatDateTime(mailbox.assigned_at)}</p>
                    {mailbox.last_sync_error ? <p className="mt-1 text-rose-600">{mailbox.last_sync_error}</p> : null}
                  </div>

                  {mailboxConnections.length > 0 ? (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {mailboxConnections.slice(0, 3).map((connection) => (
                        <span
                          key={connection.id}
                          className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-600"
                        >
                          {connection.name}
                        </span>
                      ))}
                    </div>
                  ) : null}
                </article>
              );
            })
          ) : (
            <div className="rounded-[16px] border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-500 lg:col-span-2">
              No mailboxes assigned yet.
            </div>
          )}
        </div>

        {filteredMailboxes.length > EMAIL_ADMIN_PAGE_SIZE ? (
          <div className="mt-3">
            <AdminPagination
              page={mailboxPage}
              pageSize={EMAIL_ADMIN_PAGE_SIZE}
              totalCount={filteredMailboxes.length}
              canGoNext={mailboxPage * EMAIL_ADMIN_PAGE_SIZE < filteredMailboxes.length}
              onPageChange={setMailboxPage}
            />
          </div>
        ) : null}
      </section>
    </div>
  );
}
