import { BarChart3, Loader2, Mail, ScrollText, Send, Settings2, UsersRound } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { AdminPagination } from "../admin/AdminPagination";
import type {
  BulkMailerPlatformSettingsRow,
  BulkMailerTemplateRow,
  BulkMailerUserLimitOverrideRow,
  ProfileRow,
} from "../../types/database";
import { supabase } from "../../lib/supabase";
import {
  deleteBulkMailerSmtpProfile,
  deleteBulkMailerTemplate,
  deleteBulkMailerUserOverride,
  listBulkMailerCampaigns,
  listBulkMailerLogs,
  listBulkMailerSmtpProfiles,
  listBulkMailerTemplates,
  listBulkMailerUserOverrides,
  loadBulkMailerPlatformSettings,
  saveBulkMailerPlatformSettings,
  saveBulkMailerSmtpProfile,
  saveBulkMailerTemplate,
  saveBulkMailerUserOverride,
  testBulkMailerSmtpProfile,
} from "./api";
import { buildBulkMailerDashboardStats } from "./helpers";
import type { BulkMailerSmtpProfileInput, BulkMailerSmtpProfileSummary, BulkMailerTemplateWithOwner } from "./types";
import { defaultBulkMailerPlatformSettings } from "./types";
import { BulkMailerAnalyticsPanel } from "./components/BulkMailerAnalyticsPanel";
import { BulkMailerCampaignTable } from "./components/BulkMailerCampaignTable";
import { BulkMailerLimitsPanel } from "./components/BulkMailerLimitsPanel";
import { BulkMailerSmtpPanel } from "./components/BulkMailerSmtpPanel";
import { BulkMailerStatCard } from "./components/BulkMailerStatCard";
import { BulkMailerTemplateEditor } from "./components/BulkMailerTemplateEditor";

type BulkMailerAdminTab = "overview" | "smtp" | "limits" | "templates" | "campaigns";
const BULK_MAILER_PAGE_SIZE = 5;

const adminTabs = [
  {
    id: "overview" as const,
    label: "Overview",
    icon: BarChart3,
    activeClass:
      "bg-gradient-to-r from-[#2563eb] to-[#14b8a6] text-white shadow-[0_18px_28px_-20px_rgba(37,99,235,0.72)]",
  },
  {
    id: "smtp" as const,
    label: "SMTP",
    icon: Settings2,
    activeClass:
      "bg-gradient-to-r from-[#0f766e] to-[#14b8a6] text-white shadow-[0_18px_28px_-20px_rgba(13,148,136,0.62)]",
  },
  {
    id: "limits" as const,
    label: "Limits",
    icon: UsersRound,
    activeClass:
      "bg-gradient-to-r from-[#f59e0b] to-[#f97316] text-white shadow-[0_18px_28px_-20px_rgba(245,158,11,0.62)]",
  },
  {
    id: "templates" as const,
    label: "Templates",
    icon: ScrollText,
    activeClass:
      "bg-gradient-to-r from-[#7c3aed] to-[#ec4899] text-white shadow-[0_18px_28px_-20px_rgba(124,58,237,0.6)]",
  },
  {
    id: "campaigns" as const,
    label: "Campaigns",
    icon: Send,
    activeClass:
      "bg-gradient-to-r from-[#ef4444] to-[#f97316] text-white shadow-[0_18px_28px_-20px_rgba(239,68,68,0.58)]",
  },
] satisfies Array<{
  id: BulkMailerAdminTab;
  label: string;
  icon: typeof Send;
  activeClass: string;
}>;

function emptyTemplateDraft(): Partial<BulkMailerTemplateRow> {
  return {
    name: "",
    slug: "",
    description: "",
    category: "general",
    subject: "",
    body_html: "",
    body_text: "",
    available_variables: [],
    sample_variables: {},
    is_active: true,
    is_shared: true,
  };
}

function emptySmtpDraft(): BulkMailerSmtpProfileInput {
  return {
    scope: "admin_default",
    name: "",
    host: "",
    port: 587,
    username: "",
    password: "",
    encryption: "tls",
    auth_method: "login",
    from_name: "",
    from_email: "",
    reply_to_email: "",
    is_active: true,
    is_default_fallback: false,
    rate_limit_per_minute: 20,
    rate_limit_per_hour: 200,
    daily_limit: 1000,
    monthly_limit: 25000,
  };
}

function emptyOverrideDraft(): Partial<BulkMailerUserLimitOverrideRow> {
  return {
    user_id: "",
    hourly_send_limit: null,
    daily_send_limit: null,
    campaign_recipient_limit: null,
    max_smtp_profiles: null,
    max_templates: null,
    max_campaigns_per_day: null,
    sending_enabled: true,
    override_note: "",
  };
}


interface BulkMailerAdminSectionProps {
  searchTerm?: string;
}

function matchesAdminSearch(searchTerm: string, values: Array<string | null | undefined>) {
  if (!searchTerm) {
    return true;
  }

  return values.some((value) => (value || "").toLowerCase().includes(searchTerm));
}

export function BulkMailerAdminSection({
  searchTerm = "",
}: BulkMailerAdminSectionProps) {
  const [activeTab, setActiveTab] = useState<BulkMailerAdminTab>("overview");
  const [loading, setLoading] = useState(true);
  const [templates, setTemplates] = useState<BulkMailerTemplateWithOwner[]>([]);
  const [campaigns, setCampaigns] = useState<Awaited<ReturnType<typeof listBulkMailerCampaigns>>>([]);
  const [logs, setLogs] = useState<Awaited<ReturnType<typeof listBulkMailerLogs>>>([]);
  const [smtpProfiles, setSmtpProfiles] = useState<BulkMailerSmtpProfileSummary[]>([]);
  const [platformSettings, setPlatformSettings] = useState<BulkMailerPlatformSettingsRow>(
    defaultBulkMailerPlatformSettings
  );
  const [overrides, setOverrides] = useState<
    Array<BulkMailerUserLimitOverrideRow & { profile?: Partial<ProfileRow> | null }>
  >([]);
  const [users, setUsers] = useState<ProfileRow[]>([]);

  const [templateDraft, setTemplateDraft] = useState<Partial<BulkMailerTemplateRow>>(emptyTemplateDraft());
  const [smtpDraft, setSmtpDraft] = useState<BulkMailerSmtpProfileInput>(emptySmtpDraft());
  const [overrideDraft, setOverrideDraft] = useState<Partial<BulkMailerUserLimitOverrideRow>>(emptyOverrideDraft());

  const [savingTemplate, setSavingTemplate] = useState(false);
  const [deletingTemplateId, setDeletingTemplateId] = useState<string | null>(null);
  const [savingSmtp, setSavingSmtp] = useState(false);
  const [testingSmtp, setTestingSmtp] = useState(false);
  const [deletingSmtpId, setDeletingSmtpId] = useState<string | null>(null);
  const [savingSettings, setSavingSettings] = useState(false);
  const [savingOverride, setSavingOverride] = useState(false);
  const [deletingOverrideId, setDeletingOverrideId] = useState<string | null>(null);
  const [pageByTab, setPageByTab] = useState<Record<Exclude<BulkMailerAdminTab, "overview">, number>>({
    smtp: 1,
    limits: 1,
    templates: 1,
    campaigns: 1,
  });
  const normalizedSearch = searchTerm.trim().toLowerCase();

  // Silently refresh list data without showing a spinner or touching drafts.
  const refreshLists = useCallback(async () => {
    const [templatesResult, campaignsResult, logsResult, smtpProfilesResult, settingsResult, overridesResult, usersResult] =
      await Promise.allSettled([
        listBulkMailerTemplates(),
        listBulkMailerCampaigns(),
        listBulkMailerLogs({ limit: 100 }),
        listBulkMailerSmtpProfiles(),
        loadBulkMailerPlatformSettings(),
        listBulkMailerUserOverrides(),
        supabase.from("profiles").select("*").order("created_at", { ascending: false }).limit(100),
      ]);

    if (templatesResult.status === "fulfilled") setTemplates(templatesResult.value);
    if (campaignsResult.status === "fulfilled") setCampaigns(campaignsResult.value);
    if (logsResult.status === "fulfilled") setLogs(logsResult.value);
    if (smtpProfilesResult.status === "fulfilled") setSmtpProfiles(smtpProfilesResult.value);
    if (settingsResult.status === "fulfilled") setPlatformSettings(settingsResult.value);
    if (overridesResult.status === "fulfilled") {
      setOverrides(
        overridesResult.value as Array<BulkMailerUserLimitOverrideRow & { profile?: Partial<ProfileRow> | null }>
      );
    }
    if (usersResult.status === "fulfilled") {
      if (!usersResult.value.error) {
        setUsers((usersResult.value.data || []) as ProfileRow[]);
      }
    }
  }, []);

  // Initial load — shows spinner only on first mount.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      await refreshLists();
      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [refreshLists]);

  const stats = useMemo(() => {
    const base = buildBulkMailerDashboardStats(campaigns);
    return {
      ...base,
      totalTemplates: templates.length,
      smtpProfiles: smtpProfiles.length,
      defaultFallbacks: smtpProfiles.filter((profile) => profile.is_default_fallback).length,
    };
  }, [campaigns, smtpProfiles, templates.length]);
  const filteredSmtpProfiles = useMemo(
    () =>
      smtpProfiles.filter((profile) =>
        matchesAdminSearch(normalizedSearch, [
          profile.name,
          profile.host,
          profile.username,
          profile.from_email,
          profile.scope,
        ])
      ),
    [normalizedSearch, smtpProfiles]
  );
  const filteredOverrides = useMemo(
    () =>
      overrides.filter((override) =>
        matchesAdminSearch(normalizedSearch, [
          override.profile?.username,
          override.profile?.full_name,
          override.override_note,
          override.user_id,
        ])
      ),
    [normalizedSearch, overrides]
  );
  const filteredUsers = useMemo(
    () =>
      users.filter((profile) =>
        matchesAdminSearch(normalizedSearch, [
          profile.username,
          profile.full_name,
          profile.email,
        ])
      ),
    [normalizedSearch, users]
  );
  const filteredTemplates = useMemo(
    () =>
      templates.filter((template) =>
        matchesAdminSearch(normalizedSearch, [
          template.name,
          template.category,
          template.subject,
          template.description,
          template.owner?.username,
          template.owner?.full_name,
        ])
      ),
    [normalizedSearch, templates]
  );
  const filteredCampaigns = useMemo(
    () =>
      campaigns.filter((campaign) =>
        matchesAdminSearch(normalizedSearch, [
          campaign.name,
          campaign.status,
          campaign.template?.name,
          campaign.owner?.username,
          campaign.owner?.full_name,
        ])
      ),
    [campaigns, normalizedSearch]
  );
  const pagedSmtpProfiles = useMemo(() => {
    const start = (pageByTab.smtp - 1) * BULK_MAILER_PAGE_SIZE;
    return filteredSmtpProfiles.slice(start, start + BULK_MAILER_PAGE_SIZE);
  }, [filteredSmtpProfiles, pageByTab.smtp]);
  const pagedOverrides = useMemo(() => {
    const start = (pageByTab.limits - 1) * BULK_MAILER_PAGE_SIZE;
    return filteredOverrides.slice(start, start + BULK_MAILER_PAGE_SIZE);
  }, [filteredOverrides, pageByTab.limits]);
  const pagedTemplates = useMemo(() => {
    const start = (pageByTab.templates - 1) * BULK_MAILER_PAGE_SIZE;
    return filteredTemplates.slice(start, start + BULK_MAILER_PAGE_SIZE);
  }, [filteredTemplates, pageByTab.templates]);
  const pagedCampaigns = useMemo(() => {
    const start = (pageByTab.campaigns - 1) * BULK_MAILER_PAGE_SIZE;
    return filteredCampaigns.slice(start, start + BULK_MAILER_PAGE_SIZE);
  }, [filteredCampaigns, pageByTab.campaigns]);

  useEffect(() => {
    setPageByTab({
      smtp: 1,
      limits: 1,
      templates: 1,
      campaigns: 1,
    });
  }, [normalizedSearch]);

  if (loading) {
    return (
      <div className="overflow-hidden rounded-[18px] border border-white/70 bg-gradient-to-br from-[#eef6ff] via-white to-[#fefce8] p-4 text-center shadow-[0_16px_34px_-32px_rgba(15,23,42,0.2)]">
        <Loader2 className="mx-auto h-7 w-7 animate-spin text-brand" />
        <p className="mt-3 font-display text-xl font-semibold text-app-text">Bulk Mailer</p>
        <p className="mt-2 text-sm text-app-muted">Loading...</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <section className="relative overflow-hidden rounded-[16px] border border-white/70 bg-[radial-gradient(circle_at_top_left,_rgba(37,99,235,0.18),_transparent_34%),radial-gradient(circle_at_center_right,_rgba(236,72,153,0.14),_transparent_32%),radial-gradient(circle_at_bottom_left,_rgba(245,158,11,0.16),_transparent_28%),linear-gradient(135deg,#f8fbff_0%,#ffffff_42%,#fff7ed_100%)] p-3 shadow-[0_16px_34px_-32px_rgba(15,23,42,0.2)]">
        <div className="absolute -right-16 top-0 h-40 w-40 rounded-full bg-sky-300/20 blur-3xl" />
        <div className="absolute -left-10 bottom-0 h-32 w-32 rounded-full bg-amber-300/20 blur-3xl" />

        <div className="relative grid gap-3 xl:grid-cols-[minmax(0,1fr)_320px] xl:items-start">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-brand">Admin</p>
            <p className="mt-1 font-display text-lg font-semibold tracking-tight text-app-text sm:text-xl">
              Bulk Mailer
            </p>
            <p className="mt-1 max-w-2xl text-[11px] leading-5 text-app-muted">
              Search-ready SMTP, limits, templates, and campaigns.
            </p>

            <div className="mt-3 flex flex-wrap gap-1.5">
              <span className="rounded-full border border-sky-200/80 bg-white/85 px-2.5 py-1 text-[10px] font-semibold text-app-text">
                {smtpProfiles.length.toLocaleString()} SMTP
              </span>
              <span className="rounded-full border border-sky-200/80 bg-white/85 px-2.5 py-1 text-[10px] font-semibold text-app-text">
                {overrides.length.toLocaleString()} overrides
              </span>
              <span className="rounded-full border border-sky-200/80 bg-white/85 px-2.5 py-1 text-[10px] font-semibold text-app-text">
                {stats.totalSent.toLocaleString()} sent
              </span>
            </div>
          </div>

          <div className="grid gap-2.5 sm:grid-cols-3 xl:grid-cols-1">
            <div className="rounded-[12px] border border-white/80 bg-white/90 p-2 shadow-[0_12px_24px_-24px_rgba(15,23,42,0.16)]">
              <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-app-muted">Fallbacks</p>
              <p className="mt-1 text-[15px] font-semibold text-app-text">{stats.defaultFallbacks.toLocaleString()}</p>
            </div>
            <div className="rounded-[12px] border border-white/80 bg-white/90 p-2 shadow-[0_12px_24px_-24px_rgba(15,23,42,0.16)]">
              <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-app-muted">Templates</p>
              <p className="mt-1 text-[15px] font-semibold text-app-text">{stats.totalTemplates.toLocaleString()}</p>
            </div>
            <div className="rounded-[12px] border border-white/80 bg-white/90 p-2 shadow-[0_12px_24px_-24px_rgba(15,23,42,0.16)]">
              <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-app-muted">Open</p>
              <p className="mt-1 text-[15px] font-semibold text-app-text">
                {stats.averageOpenRate.toFixed(stats.averageOpenRate >= 10 ? 0 : 1)}%
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="overflow-x-auto pb-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
        <div className="inline-flex min-w-full rounded-[14px] border border-app-border bg-white/85 p-1 shadow-[0_12px_24px_-24px_rgba(15,23,42,0.16)] sm:min-w-0">
          {adminTabs.map((entry) => {
            const active = entry.id === activeTab;

            return (
              <button
                key={entry.id}
                type="button"
                onClick={() => setActiveTab(entry.id)}
                className={`inline-flex flex-1 shrink-0 items-center justify-center gap-1.5 rounded-[10px] px-2.5 py-1.5 text-[10px] font-semibold transition sm:flex-none sm:px-2.5 sm:text-[11px] ${
                  active ? entry.activeClass : "text-app-muted hover:text-app-text"
                }`}
              >
                <entry.icon className="h-3.5 w-3.5" />
                <span>{entry.label}</span>
              </button>
            );
          })}
        </div>
      </section>

      {activeTab === "overview" ? (
        <div className="space-y-5">
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <BulkMailerStatCard
              title="SMTP"
              value={stats.smtpProfiles.toLocaleString()}
              hint={`${stats.defaultFallbacks.toLocaleString()} fallback`}
              icon={Settings2}
              tone="brand"
            />
            <BulkMailerStatCard
              title="Templates"
              value={stats.totalTemplates.toLocaleString()}
              hint="Shared + user"
              icon={ScrollText}
              tone="slate"
            />
            <BulkMailerStatCard
              title="Campaigns"
              value={stats.totalCampaigns.toLocaleString()}
              hint={`${stats.totalSent.toLocaleString()} sent`}
              icon={Mail}
              tone="emerald"
            />
            <BulkMailerStatCard
              title="Open"
              value={`${stats.averageOpenRate.toFixed(stats.averageOpenRate >= 10 ? 0 : 1)}%`}
              hint={`${stats.totalOpenedRecipients.toLocaleString()} unique`}
              icon={BarChart3}
              tone="amber"
            />
          </section>

          <BulkMailerAnalyticsPanel stats={stats} logs={logs} />
        </div>
      ) : null}

      {activeTab === "smtp" ? (
        <div className="space-y-3">
          <BulkMailerSmtpPanel
            profiles={pagedSmtpProfiles}
            draft={smtpDraft}
            adminMode
            saving={savingSmtp}
            testing={testingSmtp}
            deletingId={deletingSmtpId}
            onDraftChange={(updates) => setSmtpDraft((current) => ({ ...current, ...updates }))}
            onNew={() => setSmtpDraft(emptySmtpDraft())}
            onSelect={(profile) =>
              setSmtpDraft({
                id: profile.id,
                scope: profile.scope,
                name: profile.name,
                host: profile.host,
                port: profile.port,
                username: profile.username,
                password: "",
                encryption: profile.encryption,
                auth_method: profile.auth_method,
                from_name: profile.from_name,
                from_email: profile.from_email,
                reply_to_email: profile.reply_to_email || "",
                is_active: profile.is_active,
                is_default_fallback: profile.is_default_fallback,
                rate_limit_per_minute: profile.rate_limit_per_minute,
                rate_limit_per_hour: profile.rate_limit_per_hour,
                daily_limit: profile.daily_limit,
                monthly_limit: profile.monthly_limit,
              })
            }
            onSave={async () => {
              setSavingSmtp(true);
              try {
                await saveBulkMailerSmtpProfile(smtpDraft);
                toast.success("SMTP profile saved.");
                await refreshLists();
              } catch (error) {
                toast.error(error instanceof Error ? error.message : "Could not save SMTP profile.");
              } finally {
                setSavingSmtp(false);
              }
            }}
            onTest={async () => {
              setTestingSmtp(true);
              try {
                const result = await testBulkMailerSmtpProfile({
                  id: smtpDraft.id,
                  profile: smtpDraft.id ? undefined : smtpDraft,
                });
                toast.success(result.message);
                await refreshLists();
              } catch (error) {
                toast.error(error instanceof Error ? error.message : "SMTP test failed.");
              } finally {
                setTestingSmtp(false);
              }
            }}
            onDelete={async (profile) => {
              const confirmed = window.confirm(`Delete SMTP profile "${profile.name}"?`);
              if (!confirmed) {
                return;
              }

              setDeletingSmtpId(profile.id);
              try {
                await deleteBulkMailerSmtpProfile(profile.id);
                if (smtpDraft.id === profile.id) {
                  setSmtpDraft(emptySmtpDraft());
                }
                toast.success("SMTP profile deleted.");
                await refreshLists();
              } catch (error) {
                toast.error(error instanceof Error ? error.message : "Could not delete SMTP profile.");
              } finally {
                setDeletingSmtpId(null);
              }
            }}
          />
          {filteredSmtpProfiles.length > BULK_MAILER_PAGE_SIZE ? (
            <AdminPagination
              page={pageByTab.smtp}
              pageSize={BULK_MAILER_PAGE_SIZE}
              totalCount={filteredSmtpProfiles.length}
              canGoNext={pageByTab.smtp * BULK_MAILER_PAGE_SIZE < filteredSmtpProfiles.length}
              onPageChange={(page) =>
                setPageByTab((current) => ({
                  ...current,
                  smtp: page,
                }))
              }
            />
          ) : null}
        </div>
      ) : null}

      {activeTab === "limits" ? (
        <div className="space-y-3">
          <BulkMailerLimitsPanel
            settings={platformSettings}
            overrides={pagedOverrides}
            overrideDraft={overrideDraft}
            users={filteredUsers}
            settingsSaving={savingSettings}
            overrideSaving={savingOverride}
            deletingOverrideId={deletingOverrideId}
            onSettingsChange={(updates) => setPlatformSettings((current) => ({ ...current, ...updates }))}
            onSaveSettings={async () => {
              setSavingSettings(true);
              try {
                await saveBulkMailerPlatformSettings(platformSettings);
                toast.success("Bulk Mailer platform limits saved.");
                await refreshLists();
              } catch (error) {
                toast.error(error instanceof Error ? error.message : "Could not save platform limits.");
              } finally {
                setSavingSettings(false);
              }
            }}
            onOverrideDraftChange={(updates) => setOverrideDraft((current) => ({ ...current, ...updates }))}
            onSelectOverride={(override) => setOverrideDraft(override)}
            onNewOverride={() => setOverrideDraft(emptyOverrideDraft())}
            onSaveOverride={async () => {
              setSavingOverride(true);
              try {
                const saved = await saveBulkMailerUserOverride(overrideDraft);
                setOverrideDraft(saved);
                toast.success("User mailer override saved.");
                await refreshLists();
              } catch (error) {
                toast.error(error instanceof Error ? error.message : "Could not save user override.");
              } finally {
                setSavingOverride(false);
              }
            }}
            onDeleteOverride={async (override) => {
              const confirmed = window.confirm(
                "Delete this user override and fall back to platform defaults?"
              );
              if (!confirmed) {
                return;
              }

              setDeletingOverrideId(override.id);
              try {
                await deleteBulkMailerUserOverride(override.id);
                if (overrideDraft.id === override.id) {
                  setOverrideDraft(emptyOverrideDraft());
                }
                toast.success("User override deleted.");
                await refreshLists();
              } catch (error) {
                toast.error(error instanceof Error ? error.message : "Could not delete override.");
              } finally {
                setDeletingOverrideId(null);
              }
            }}
          />
          {filteredOverrides.length > BULK_MAILER_PAGE_SIZE ? (
            <AdminPagination
              page={pageByTab.limits}
              pageSize={BULK_MAILER_PAGE_SIZE}
              totalCount={filteredOverrides.length}
              canGoNext={pageByTab.limits * BULK_MAILER_PAGE_SIZE < filteredOverrides.length}
              onPageChange={(page) =>
                setPageByTab((current) => ({
                  ...current,
                  limits: page,
                }))
              }
            />
          ) : null}
        </div>
      ) : null}

      {activeTab === "templates" ? (
        <div className="space-y-3">
          <BulkMailerTemplateEditor
            templates={pagedTemplates}
            draft={templateDraft}
            allowShared
            saving={savingTemplate}
            deletingId={deletingTemplateId}
            onDraftChange={(updates) => setTemplateDraft((current) => ({ ...current, ...updates }))}
            onNew={() => setTemplateDraft(emptyTemplateDraft())}
            onSelect={(template) => setTemplateDraft(template)}
            onSave={async () => {
              setSavingTemplate(true);
              try {
                const saved = await saveBulkMailerTemplate(templateDraft);
                setTemplateDraft(saved);
                toast.success(templateDraft.id ? "Template updated." : "Template created.");
                await refreshLists();
              } catch (error) {
                toast.error(error instanceof Error ? error.message : "Could not save template.");
              } finally {
                setSavingTemplate(false);
              }
            }}
            onDelete={async (template) => {
              const confirmed = window.confirm(`Delete "${template.name}"?`);
              if (!confirmed) {
                return;
              }

              setDeletingTemplateId(template.id);
              try {
                await deleteBulkMailerTemplate(template.id);
                if (templateDraft.id === template.id) {
                  setTemplateDraft(emptyTemplateDraft());
                }
                toast.success("Template deleted.");
                await refreshLists();
              } catch (error) {
                toast.error(error instanceof Error ? error.message : "Could not delete template.");
              } finally {
                setDeletingTemplateId(null);
              }
            }}
          />
          {filteredTemplates.length > BULK_MAILER_PAGE_SIZE ? (
            <AdminPagination
              page={pageByTab.templates}
              pageSize={BULK_MAILER_PAGE_SIZE}
              totalCount={filteredTemplates.length}
              canGoNext={pageByTab.templates * BULK_MAILER_PAGE_SIZE < filteredTemplates.length}
              onPageChange={(page) =>
                setPageByTab((current) => ({
                  ...current,
                  templates: page,
                }))
              }
            />
          ) : null}
        </div>
      ) : null}

      {activeTab === "campaigns" ? (
        <div className="space-y-3">
          <BulkMailerCampaignTable campaigns={pagedCampaigns} smtpProfiles={smtpProfiles} showOwner />
          {filteredCampaigns.length > BULK_MAILER_PAGE_SIZE ? (
            <AdminPagination
              page={pageByTab.campaigns}
              pageSize={BULK_MAILER_PAGE_SIZE}
              totalCount={filteredCampaigns.length}
              canGoNext={pageByTab.campaigns * BULK_MAILER_PAGE_SIZE < filteredCampaigns.length}
              onPageChange={(page) =>
                setPageByTab((current) => ({
                  ...current,
                  campaigns: page,
                }))
              }
            />
          ) : null}
          <BulkMailerAnalyticsPanel stats={stats} logs={logs} />
        </div>
      ) : null}
    </div>
  );
}
