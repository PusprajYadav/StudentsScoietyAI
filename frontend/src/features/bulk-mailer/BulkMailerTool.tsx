import { Loader2, Mail } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import type { BulkMailerCampaignRow, BulkMailerTemplateRow } from "../../types/database";
import { buildAuthRedirectPath } from "../../lib/authRedirect";
import { useAuthStore } from "../../store/authStore";
import { useCoinWalletStore } from "../../store/coinWalletStore";
import { listEmailConnections } from "../emails/api";
import type { EmailConnectionRow } from "../emails/types";
import {
  deleteBulkMailerCampaign,
  deleteBulkMailerSmtpProfile,
  deleteBulkMailerTemplate,
  listBulkMailerCampaigns,
  listBulkMailerLogs,
  listBulkMailerRecipients,
  listBulkMailerSmtpProfiles,
  listBulkMailerTemplates,
  loadBulkMailerPlatformSettings,
  loadBulkMailerUserOverride,
  replaceBulkMailerAudience,
  runBulkMailerCampaignUntilSettled,
  saveBulkMailerCampaign,
  saveBulkMailerSmtpProfile,
  saveBulkMailerTemplate,
  testBulkMailerSmtpProfile,
} from "./api";
import {
  BULK_MAILER_ATTACHMENT_TOTAL_LIMIT_BYTES,
  buildBulkMailerDashboardStats,
  getBulkMailerAutoSenderChoice,
  getBulkMailerActiveEmailConnections,
  getBulkMailerAttachmentTotalSize,
  getBulkMailerCampaignAttachments,
  getBulkMailerCampaignSenderSelectionPatch,
  resolveBulkMailerEffectiveLimits,
  withBulkMailerCampaignAttachments,
} from "./helpers";
import type {
  BulkMailerCampaignAttachment,
  BulkMailerEffectiveLimits,
  BulkMailerRecipientDraft,
  BulkMailerSmtpProfileInput,
  BulkMailerSmtpProfileSummary,
  BulkMailerTemplateWithOwner,
} from "./types";
import { defaultBulkMailerPlatformSettings } from "./types";
import { BulkMailerAnalyticsPanel } from "./components/BulkMailerAnalyticsPanel";
import { BulkMailerCampaignComposer } from "./components/BulkMailerCampaignComposer";
import { BulkMailerCampaignTable } from "./components/BulkMailerCampaignTable";
import { BulkMailerSmtpPanel } from "./components/BulkMailerSmtpPanel";
import { BulkMailerTemplateEditor } from "./components/BulkMailerTemplateEditor";

type BulkMailerToolPage = "compose" | "campaigns" | "templates" | "smtp" | "analytics";

const bulkMailerSurfaceStyle = {
  backgroundImage:
    "radial-gradient(circle at top left, rgb(var(--brand) / 0.16), transparent 30%), radial-gradient(circle at bottom right, rgb(var(--brand) / 0.12), transparent 28%), linear-gradient(135deg, rgb(var(--app-card) / 0.98) 0%, rgb(var(--app-card) / 0.95) 45%, rgb(var(--app-secondary) / 0.82) 100%)",
};

const bulkMailerPages = [
  { id: "compose" as const, label: "Compose" },
  { id: "campaigns" as const, label: "Campaigns" },
  { id: "templates" as const, label: "Templates" },
  { id: "smtp" as const, label: "SMTP" },
  { id: "analytics" as const, label: "Stats" },
] satisfies Array<{
  id: BulkMailerToolPage;
  label: string;
}>;

function resolveBulkMailerPage(pathname: string) {
  const segments = pathname.replace(/\/+$/, "").split("/").filter(Boolean);
  const bulkMailerIndex = segments.indexOf("bulk-mailer");
  const basePath =
    bulkMailerIndex >= 0
      ? `/${segments.slice(0, bulkMailerIndex + 1).join("/")}`
      : "/app/tools/bulk-mailer";
  const nextSegment = bulkMailerIndex >= 0 ? segments[bulkMailerIndex + 1] || "" : "";
  const activePage = bulkMailerPages.some((page) => page.id === nextSegment)
    ? (nextSegment as BulkMailerToolPage)
    : null;

  return { basePath, activePage };
}

function emptyTemplateDraft(userId?: string): Partial<BulkMailerTemplateRow> {
  return {
    owner_user_id: userId || "",
    name: "",
    slug: "",
    description: "",
    category: "general",
    subject: "",
    body_html: "",
    body_text: "",
    sample_variables: {},
    available_variables: [],
    is_active: true,
    is_shared: false,
  };
}

function emptyCampaignDraft(userId?: string): Partial<BulkMailerCampaignRow> {
  return {
    owner_user_id: userId || "",
    name: "",
    status: "draft",
    template_id: null,
    selected_smtp_profile_id: null,
    selected_email_connection_id: null,
    resolved_smtp_profile_id: null,
    resolved_email_connection_id: null,
    subject: "",
    body_html: "",
    body_text: null,
    recipient_source: "manual",
    variable_mapping: {},
    campaign_settings: {},
  };
}

function emptySmtpDraft(): BulkMailerSmtpProfileInput {
  return {
    scope: "user_owned",
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

function normalizeRecipientDrafts(
  records: Awaited<ReturnType<typeof listBulkMailerRecipients>>
): BulkMailerRecipientDraft[] {
  return records.map((entry) => ({
    id: entry.id,
    email: entry.recipient_email,
    name: entry.recipient_name || "",
    variables: Object.entries(entry.variable_payload || {}).reduce<Record<string, string>>(
      (accumulator, [key, value]) => {
        accumulator[key] = value == null ? "" : String(value);
        return accumulator;
      },
      {}
    ),
    sourceIndex: entry.source_index,
    sourceLabel: entry.source_label,
  }));
}

export function BulkMailerTool() {
  const location = useLocation();
  const navigate = useNavigate();
  const authHref = buildAuthRedirectPath(location);
  const { user, profile, loading } = useAuthStore();
  const refreshWallet = useCoinWalletStore((state) => state.refreshWallet);
  const { basePath, activePage } = useMemo(
    () => resolveBulkMailerPage(location.pathname),
    [location.pathname]
  );

  const [initialLoading, setInitialLoading] = useState(true);
  const [templates, setTemplates] = useState<BulkMailerTemplateWithOwner[]>([]);
  const [campaigns, setCampaigns] = useState<Awaited<ReturnType<typeof listBulkMailerCampaigns>>>([]);
  const [logs, setLogs] = useState<Awaited<ReturnType<typeof listBulkMailerLogs>>>([]);
  const [smtpProfiles, setSmtpProfiles] = useState<BulkMailerSmtpProfileSummary[]>([]);
  const [emailConnections, setEmailConnections] = useState<EmailConnectionRow[]>([]);
  const [platformSettings, setPlatformSettings] = useState(defaultBulkMailerPlatformSettings);
  const [override, setOverride] = useState<Awaited<ReturnType<typeof loadBulkMailerUserOverride>>>(null);

  const [templateDraft, setTemplateDraft] = useState<Partial<BulkMailerTemplateRow>>(emptyTemplateDraft());
  const [campaignDraft, setCampaignDraft] = useState<Partial<BulkMailerCampaignRow>>(emptyCampaignDraft());
  const [smtpDraft, setSmtpDraft] = useState<BulkMailerSmtpProfileInput>(emptySmtpDraft());
  const [recipients, setRecipients] = useState<BulkMailerRecipientDraft[]>([]);
  const [attachments, setAttachments] = useState<BulkMailerCampaignAttachment[]>([]);

  const [savingTemplate, setSavingTemplate] = useState(false);
  const [deletingTemplateId, setDeletingTemplateId] = useState<string | null>(null);
  const [savingCampaign, setSavingCampaign] = useState(false);
  const [busyCampaignId, setBusyCampaignId] = useState<string | null>(null);
  const [sendingCampaign, setSendingCampaign] = useState(false);
  const [savingSmtp, setSavingSmtp] = useState(false);
  const [testingSmtp, setTestingSmtp] = useState(false);
  const [deletingSmtpId, setDeletingSmtpId] = useState<string | null>(null);

  const effectiveLimits: BulkMailerEffectiveLimits = useMemo(
    () => resolveBulkMailerEffectiveLimits(platformSettings, override),
    [override, platformSettings]
  );

  const stats = useMemo(() => {
    const base = buildBulkMailerDashboardStats(campaigns);
    return { ...base, totalTemplates: templates.length };
  }, [campaigns, templates.length]);

  /* Admin SMTP profiles for display in campaign composer */
  const adminSmtpProfiles = useMemo(
    () => smtpProfiles.filter((p) => p.scope === "admin_default" && p.is_active),
    [smtpProfiles]
  );
  const activeEmailConnections = useMemo(
    () => getBulkMailerActiveEmailConnections(emailConnections),
    [emailConnections]
  );

  const refreshLists = useCallback(async () => {
    if (!user) return;

    const [
      templatesResult,
      campaignsResult,
      logsResult,
      settingsResult,
      overrideResult,
      smtpProfilesResult,
      emailConnectionsResult,
    ] =
      await Promise.allSettled([
        listBulkMailerTemplates(),
        listBulkMailerCampaigns({ ownerUserId: user.id }),
        listBulkMailerLogs({ ownerUserId: user.id, limit: 50 }),
        loadBulkMailerPlatformSettings(),
        loadBulkMailerUserOverride(user.id),
        listBulkMailerSmtpProfiles(),
        listEmailConnections(),
      ]);

    if (templatesResult.status === "fulfilled") setTemplates(templatesResult.value);
    if (campaignsResult.status === "fulfilled") setCampaigns(campaignsResult.value);
    if (logsResult.status === "fulfilled") setLogs(logsResult.value);
    if (settingsResult.status === "fulfilled") setPlatformSettings(settingsResult.value);
    if (overrideResult.status === "fulfilled") setOverride(overrideResult.value);
    if (smtpProfilesResult.status === "fulfilled") setSmtpProfiles(smtpProfilesResult.value);
    if (emailConnectionsResult.status === "fulfilled") setEmailConnections(emailConnectionsResult.value);
    else setEmailConnections([]);
  }, [user]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      setInitialLoading(true);
      await refreshLists();
      if (!cancelled) setInitialLoading(false);
    })();
    return () => { cancelled = true; };
  }, [refreshLists, user]);

  const resetTemplateDraft = () => setTemplateDraft(emptyTemplateDraft(user?.id));
  const resetCampaignDraft = () => {
    setCampaignDraft(emptyCampaignDraft(user?.id));
    setRecipients([]);
    setAttachments([]);
  };
  const resetSmtpDraft = () => setSmtpDraft(emptySmtpDraft());

  const openComposePage = useCallback(() => {
    navigate(`${basePath}/compose`);
  }, [basePath, navigate]);

  const ensureCampaignSenderSelection = useCallback(
    (draft: Partial<BulkMailerCampaignRow>) => {
      const hasActiveEmailSelection = Boolean(
        draft.selected_email_connection_id &&
          activeEmailConnections.some((connection) => connection.id === draft.selected_email_connection_id)
      );
      if (hasActiveEmailSelection) {
        return draft;
      }

      const hasActiveSmtpSelection = Boolean(
        draft.selected_smtp_profile_id &&
          smtpProfiles.some(
            (profile) => profile.id === draft.selected_smtp_profile_id && profile.is_active
          )
      );
      if (hasActiveSmtpSelection) {
        return draft;
      }

      const autoSender = getBulkMailerAutoSenderChoice(smtpProfiles, activeEmailConnections);
      if (!autoSender) {
        throw new Error("Add an active Student Email or SMTP sender before sending.");
      }

      return {
        ...draft,
        ...getBulkMailerCampaignSenderSelectionPatch(autoSender.value),
      };
    },
    [activeEmailConnections, smtpProfiles]
  );

  const openCampaignInComposer = useCallback(
    async (campaign: Awaited<ReturnType<typeof listBulkMailerCampaigns>>[number]) => {
      setCampaignDraft(campaign);
      setRecipients(normalizeRecipientDrafts(await listBulkMailerRecipients(campaign.id)));
      setAttachments(getBulkMailerCampaignAttachments(campaign.campaign_settings));
      navigate(`${basePath}/compose`);
    },
    [basePath, navigate]
  );

  const saveCampaignWithAudience = async (
    draftOverride?: Partial<BulkMailerCampaignRow>
  ) => {
    if (!user) throw new Error("Sign in to save campaigns.");
    const nextDraft = draftOverride || campaignDraft;

    if (!nextDraft.name?.trim() || !nextDraft.subject?.trim() || !nextDraft.body_html?.trim()) {
      throw new Error("Campaign name, subject, and HTML body are required.");
    }

    if (getBulkMailerAttachmentTotalSize(attachments) > BULK_MAILER_ATTACHMENT_TOTAL_LIMIT_BYTES) {
      throw new Error("Attachment total must stay within 3 MB.");
    }

    const savedCampaign = await saveBulkMailerCampaign({
      ...nextDraft,
      owner_user_id: user.id,
      campaign_settings: withBulkMailerCampaignAttachments(
        nextDraft.campaign_settings,
        attachments
      ),
    });

    await replaceBulkMailerAudience({
      campaignId: savedCampaign.id,
      ownerUserId: user.id,
      recipients: recipients.map((recipient) => ({
        recipient_email: recipient.email.trim(),
        recipient_name: recipient.name.trim() || null,
        variable_payload: recipient.variables,
        source_index: recipient.sourceIndex ?? null,
        source_label: recipient.sourceLabel ?? null,
      })),
    });

    setCampaignDraft(savedCampaign);
    setAttachments(getBulkMailerCampaignAttachments(savedCampaign.campaign_settings));
    return savedCampaign;
  };

  if (!activePage) {
    return <Navigate to={`${basePath}/compose`} replace />;
  }

  if (loading || (user && initialLoading)) {
    return (
      <div
        className="overflow-hidden rounded-[28px] border border-app-border/80 bg-app-card/95 p-6 text-center shadow-[0_22px_50px_-36px_rgba(15,23,42,0.35)] backdrop-blur-xl"
        style={bulkMailerSurfaceStyle}
      >
        <Loader2 className="mx-auto h-6 w-6 animate-spin text-brand" />
        <p className="mt-3 font-display text-xl font-semibold text-app-text">Bulk Mailer</p>
        <p className="mt-1 text-xs text-app-muted">Loading…</p>
      </div>
    );
  }

  if (!user || !profile) {
    return (
      <section
        className="overflow-hidden rounded-[28px] border border-app-border/80 bg-app-card/95 p-6 text-center shadow-[0_22px_50px_-36px_rgba(15,23,42,0.35)] backdrop-blur-xl"
        style={bulkMailerSurfaceStyle}
      >
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-[16px] bg-gradient-to-br from-[#2563eb] to-[#14b8a6] text-white shadow-[0_14px_24px_-16px_rgba(37,99,235,0.7)]">
          <Mail className="h-5 w-5" />
        </div>
        <p className="mt-4 font-display text-2xl font-semibold text-app-text">Bulk Mailer</p>
        <p className="mt-1 text-sm text-app-muted">Sign in to send.</p>
        <Link
          to={authHref}
          className="mt-4 inline-flex items-center justify-center rounded-full bg-gradient-to-r from-[#2563eb] to-[#14b8a6] px-5 py-2.5 text-sm font-semibold text-white shadow-[0_14px_24px_-16px_rgba(37,99,235,0.7)]"
        >
          Sign in
        </Link>
      </section>
    );
  }

  return (
    <div className="space-y-3">
      <section className="overflow-x-auto pb-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
        <div className="inline-flex min-w-full items-center gap-1 rounded-[18px] border border-app-border/80 bg-app-card/90 p-1.5 sm:min-w-0">
          {bulkMailerPages.map((page) => {
            const active = page.id === activePage;
            return (
              <Link
                key={page.id}
                to={`${basePath}/${page.id}`}
                className={`inline-flex shrink-0 items-center rounded-full px-3 py-1.5 text-[11px] font-semibold transition ${
                  active
                    ? "bg-app-text text-app-card shadow-[0_10px_20px_-16px_rgba(15,23,42,0.4)]"
                    : "text-app-muted hover:bg-app-secondary hover:text-app-text"
                }`}
              >
                {page.label}
              </Link>
            );
          })}
        </div>
      </section>

      {activePage === "compose" ? (
        <BulkMailerCampaignComposer
          templates={templates}
          smtpProfiles={smtpProfiles}
          emailConnections={activeEmailConnections}
          draft={campaignDraft}
          recipients={recipients}
          attachments={attachments}
          effectiveLimits={effectiveLimits}
          saving={savingCampaign}
          sending={sendingCampaign}
          onDraftChange={(updates) => setCampaignDraft((current) => ({ ...current, ...updates }))}
          onRecipientsChange={setRecipients}
          onAttachmentsChange={setAttachments}
          onSaveDraft={async () => {
            setSavingCampaign(true);
            try {
              const saved = await saveCampaignWithAudience();
              toast.success("Campaign draft saved.");
              await refreshLists();
              setCampaignDraft(saved);
            } catch (error) {
              toast.error(error instanceof Error ? error.message : "Could not save campaign draft.");
            } finally {
              setSavingCampaign(false);
            }
          }}
          onSendCampaign={async () => {
            if (recipients.length === 0) {
              toast.error("Add at least one recipient before sending.");
              return;
            }

            let readyDraft: Partial<BulkMailerCampaignRow>;
            try {
              readyDraft = ensureCampaignSenderSelection(campaignDraft);
              setCampaignDraft((current) => ({ ...current, ...readyDraft }));
            } catch (error) {
              toast.error(error instanceof Error ? error.message : "Add a sender before sending.");
              return;
            }

            const busyId = campaignDraft.id || "new";
            setSendingCampaign(true);
            setBusyCampaignId(busyId);

            try {
              const saved = await saveCampaignWithAudience(readyDraft);
              setBusyCampaignId(saved.id);
              const result = await runBulkMailerCampaignUntilSettled(saved.id, {
                batchSize: 20,
                onProgress: (progress) => {
                  toast.loading(
                    `Sending... ${progress.processed_count} processed, ${progress.remaining_count} left`,
                    { id: `bulk-mailer-progress-${saved.id}` }
                  );
                },
              });

              toast.dismiss(`bulk-mailer-progress-${saved.id}`);

              if (!result) {
                toast.error("No send result returned.");
                return;
              }

              if (result.status === "completed") toast.success("Campaign completed.");
              else if (result.status === "paused") toast.success(result.limit_message || "Paused. Resume later.");
              else if (result.status === "failed") toast.error(result.limit_message || "Campaign failed.");
              else toast.success("Batch processed.");

              await refreshWallet().catch(() => undefined);
              await refreshLists();
              const refreshedCampaigns = await listBulkMailerCampaigns({ ownerUserId: user.id });
              const latestCampaign = refreshedCampaigns.find((entry) => entry.id === saved.id);
              if (latestCampaign) {
                setCampaignDraft(latestCampaign);
                setRecipients(normalizeRecipientDrafts(await listBulkMailerRecipients(saved.id)));
                setAttachments(getBulkMailerCampaignAttachments(latestCampaign.campaign_settings));
              }
            } catch (error) {
              toast.error(error instanceof Error ? error.message : "Could not send campaign.");
            } finally {
              setSendingCampaign(false);
              setBusyCampaignId(null);
            }
          }}
        />
      ) : null}

      {activePage === "campaigns" ? (
        <section className="overflow-hidden rounded-[24px] border border-app-border/80 bg-app-card/95 p-4 shadow-[0_18px_44px_-32px_rgba(15,23,42,0.28)] backdrop-blur">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-app-text">Campaigns</p>
              <p className="mt-1 text-xs text-app-muted">
                {campaigns.length.toLocaleString()} saved campaign{campaigns.length === 1 ? "" : "s"}
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                resetCampaignDraft();
                openComposePage();
              }}
              className="rounded-full border border-app-border bg-app-card px-3 py-1.5 text-xs font-semibold text-app-text shadow-sm"
            >
              New
            </button>
          </div>

          <div className="mt-3">
            <BulkMailerCampaignTable
              campaigns={campaigns}
              smtpProfiles={smtpProfiles}
              emailConnections={activeEmailConnections}
              activeCampaignId={campaignDraft.id || null}
              busyCampaignId={busyCampaignId}
              onSelect={async (campaign) => {
                await openCampaignInComposer(campaign);
              }}
              onSend={async (campaign) => {
                const loadedRecipients = normalizeRecipientDrafts(await listBulkMailerRecipients(campaign.id));
                setCampaignDraft(campaign);
                setRecipients(loadedRecipients);
                setAttachments(getBulkMailerCampaignAttachments(campaign.campaign_settings));

                if (loadedRecipients.length === 0) {
                  toast.error("No recipients. Add them in the compose page first.");
                  return;
                }

                let targetCampaignId = campaign.id;
                try {
                  const patchedCampaign = ensureCampaignSenderSelection(campaign);
                  if (
                    patchedCampaign.selected_email_connection_id !== campaign.selected_email_connection_id ||
                    patchedCampaign.selected_smtp_profile_id !== campaign.selected_smtp_profile_id
                  ) {
                    const updatedCampaign = await saveBulkMailerCampaign({
                      ...campaign,
                      ...patchedCampaign,
                    });
                    targetCampaignId = updatedCampaign.id;
                  }
                } catch (error) {
                  toast.error(error instanceof Error ? error.message : "Add a sender before sending.");
                  return;
                }

                setBusyCampaignId(campaign.id);

                try {
                  const result = await runBulkMailerCampaignUntilSettled(targetCampaignId, {
                    batchSize: 20,
                    onProgress: (progress) => {
                      toast.loading(
                        `Sent ${progress.processed_count} — ${progress.remaining_count} left`,
                        { id: `bulk-mailer-progress-${campaign.id}` }
                      );
                    },
                  });

                  toast.dismiss(`bulk-mailer-progress-${campaign.id}`);

                  if (result?.status === "completed") toast.success("Campaign completed.");
                  else if (result?.status === "paused") toast.success(result.limit_message || "Paused.");
                  else if (result?.status === "failed") toast.error(result.limit_message || "Failed.");
                  else toast.success("Batch processed.");

                  await refreshWallet().catch(() => undefined);
                  await refreshLists();
                } catch (error) {
                  toast.error(error instanceof Error ? error.message : "Could not send campaign.");
                } finally {
                  setBusyCampaignId(null);
                }
              }}
              onDelete={async (campaign) => {
                const confirmed = window.confirm(`Delete "${campaign.name}"?`);
                if (!confirmed) return;

                await deleteBulkMailerCampaign(campaign.id);
                if (campaignDraft.id === campaign.id) resetCampaignDraft();
                toast.success("Campaign deleted.");
                await refreshLists();
              }}
            />
          </div>
        </section>
      ) : null}

      {activePage === "templates" ? (
        <BulkMailerTemplateEditor
          templates={templates}
          draft={templateDraft}
          allowShared
          saving={savingTemplate}
          deletingId={deletingTemplateId}
          onDraftChange={(updates) => setTemplateDraft((current) => ({ ...current, ...updates }))}
          onNew={resetTemplateDraft}
          onSelect={(template) => setTemplateDraft(template)}
          onSave={async () => {
            setSavingTemplate(true);
            try {
              const saved = await saveBulkMailerTemplate({
                ...templateDraft,
                owner_user_id: templateDraft.owner_user_id || user.id,
              });
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
            if (!confirmed) return;

            setDeletingTemplateId(template.id);
            try {
              await deleteBulkMailerTemplate(template.id);
              if (templateDraft.id === template.id) resetTemplateDraft();
              toast.success("Template deleted.");
              await refreshLists();
            } catch (error) {
              toast.error(error instanceof Error ? error.message : "Could not delete template.");
            } finally {
              setDeletingTemplateId(null);
            }
          }}
        />
      ) : null}

      {activePage === "smtp" ? (
        <div className="space-y-3">
          {adminSmtpProfiles.length > 0 ? (
            <section className="rounded-[20px] border border-emerald-500/20 bg-emerald-500/10 px-3.5 py-3">
              <div className="flex flex-wrap gap-2">
                {adminSmtpProfiles.map((profile) => (
                  <span
                    key={profile.id}
                    className="rounded-full border border-app-border bg-app-card px-2.5 py-1 text-[11px] font-semibold text-app-text"
                  >
                    {profile.name}
                  </span>
                ))}
              </div>
            </section>
          ) : null}

          <BulkMailerSmtpPanel
            profiles={smtpProfiles}
            draft={smtpDraft}
            saving={savingSmtp}
            testing={testingSmtp}
            deletingId={deletingSmtpId}
            onDraftChange={(updates) => setSmtpDraft((current) => ({ ...current, ...updates }))}
            onNew={resetSmtpDraft}
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
              if (!platformSettings.allow_user_smtp_profiles && smtpDraft.scope === "user_owned") {
                toast.error("Admin settings currently disable user SMTP profiles.");
                return;
              }

              setSavingSmtp(true);
              try {
                const saved = await saveBulkMailerSmtpProfile(smtpDraft);
                setSmtpDraft({
                  id: saved.id,
                  scope: saved.scope,
                  name: saved.name,
                  host: saved.host,
                  port: saved.port,
                  username: saved.username,
                  password: "",
                  encryption: saved.encryption,
                  auth_method: saved.auth_method,
                  from_name: saved.from_name,
                  from_email: saved.from_email,
                  reply_to_email: saved.reply_to_email || "",
                  is_active: saved.is_active,
                  is_default_fallback: saved.is_default_fallback,
                  rate_limit_per_minute: saved.rate_limit_per_minute,
                  rate_limit_per_hour: saved.rate_limit_per_hour,
                  daily_limit: saved.daily_limit,
                  monthly_limit: saved.monthly_limit,
                });
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
            onDelete={async (profileRecord) => {
              const confirmed = window.confirm(`Delete SMTP profile "${profileRecord.name}"?`);
              if (!confirmed) return;

              setDeletingSmtpId(profileRecord.id);
              try {
                await deleteBulkMailerSmtpProfile(profileRecord.id);
                if (smtpDraft.id === profileRecord.id) resetSmtpDraft();
                toast.success("SMTP profile deleted.");
                await refreshLists();
              } catch (error) {
                toast.error(error instanceof Error ? error.message : "Could not delete SMTP profile.");
              } finally {
                setDeletingSmtpId(null);
              }
            }}
          />
        </div>
      ) : null}

      {activePage === "analytics" ? <BulkMailerAnalyticsPanel stats={stats} logs={logs} /> : null}
    </div>
  );
}
