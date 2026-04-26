import type {
  BulkMailerCampaignRow,
  BulkMailerPlatformSettingsRow,
  BulkMailerTemplateRow,
  BulkMailerUserLimitOverrideRow,
  JsonMap,
} from "../../types/database";
import type { EmailConnectionRow } from "../emails/types";
import type {
  BulkMailerCampaignAttachment,
  BulkMailerDashboardStats,
  BulkMailerEffectiveLimits,
  BulkMailerRecipientDraft,
  BulkMailerSmtpProfileSummary,
} from "./types";

export const BULK_MAILER_VARIABLE_PATTERN = /{{\s*([a-zA-Z0-9_.-]+)\s*}}/g;
export const BULK_MAILER_ATTACHMENT_TOTAL_LIMIT_BYTES = 3 * 1024 * 1024;

export const BULK_MAILER_SYSTEM_VARIABLES = [
  "recipient_email",
  "recipient_name",
  "campaign_name",
  "sender_name",
  "sender_email",
  "current_date",
  "current_time",
  "current_year",
] as const;

export function normalizeBulkMailerVariableName(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

export function extractBulkMailerVariables(input: { subject?: string | null; bodyHtml?: string | null }) {
  const found = new Set<string>();
  const content = `${input.subject || ""}\n${input.bodyHtml || ""}`;

  for (const match of content.matchAll(BULK_MAILER_VARIABLE_PATTERN)) {
    const name = normalizeBulkMailerVariableName(match[1] || "");
    if (name) {
      found.add(name);
    }
  }

  BULK_MAILER_SYSTEM_VARIABLES.forEach((entry) => found.add(entry));
  return Array.from(found).sort();
}

export function normalizeBulkMailerSlug(value: string) {
  const normalized = normalizeBulkMailerVariableName(value);
  return normalized || `template_${Math.random().toString(36).slice(2, 8)}`;
}

export function renderBulkMailerTemplate(template: string, values: Record<string, string | number | null | undefined>) {
  return template.replace(BULK_MAILER_VARIABLE_PATTERN, (_, token: string) => {
    const key = normalizeBulkMailerVariableName(token);
    const value = values[key];
    return value == null ? "" : String(value);
  });
}

export function buildBulkMailerSystemValues(input: {
  campaignName: string;
  senderName: string;
  senderEmail: string;
  recipientEmail: string;
  recipientName?: string | null;
}) {
  const now = new Date();

  return {
    recipient_email: input.recipientEmail,
    recipient_name: input.recipientName || "",
    campaign_name: input.campaignName,
    sender_name: input.senderName,
    sender_email: input.senderEmail,
    current_date: now.toLocaleDateString(),
    current_time: now.toLocaleTimeString(),
    current_year: String(now.getFullYear()),
  };
}

export function sanitizeBulkMailerText(value?: string | null) {
  const trimmed = value?.trim() || "";
  return trimmed ? trimmed : null;
}

export function formatBulkMailerPercent(value: number) {
  if (!Number.isFinite(value)) {
    return "0%";
  }

  if (value === 0) {
    return "0%";
  }

  return `${value.toFixed(value >= 10 ? 0 : 1)}%`;
}

export function resolveBulkMailerEffectiveLimits(
  settings: BulkMailerPlatformSettingsRow,
  override: BulkMailerUserLimitOverrideRow | null | undefined
): BulkMailerEffectiveLimits {
  return {
    hourlySendLimit: override?.hourly_send_limit ?? settings.default_hourly_send_limit,
    dailySendLimit: override?.daily_send_limit ?? settings.default_daily_send_limit,
    campaignRecipientLimit: override?.campaign_recipient_limit ?? settings.default_campaign_recipient_limit,
    maxSmtpProfiles: override?.max_smtp_profiles ?? settings.default_max_smtp_profiles_per_user,
    maxTemplates: override?.max_templates ?? settings.default_max_templates_per_user,
    maxCampaignsPerDay: override?.max_campaigns_per_day ?? settings.default_max_campaigns_per_day,
    sendingEnabled: override?.sending_enabled ?? true,
  };
}

export function buildBulkMailerDashboardStats(campaigns: BulkMailerCampaignRow[]): BulkMailerDashboardStats {
  const totalCampaigns = campaigns.length;
  const totalSent = campaigns.reduce((sum, entry) => sum + entry.sent_count, 0);
  const totalFailed = campaigns.reduce((sum, entry) => sum + entry.failed_count, 0);
  const totalOpenedRecipients = campaigns.reduce((sum, entry) => sum + entry.opened_recipient_count, 0);
  const totalOpenEvents = campaigns.reduce((sum, entry) => sum + entry.total_open_count, 0);
  const openRateBase = campaigns.reduce((sum, entry) => sum + Math.max(entry.sent_count, 0), 0);

  return {
    totalTemplates: 0,
    totalCampaigns,
    totalSent,
    totalFailed,
    totalOpenedRecipients,
    totalOpenEvents,
    averageOpenRate: openRateBase > 0 ? (totalOpenedRecipients / openRateBase) * 100 : 0,
  };
}

export function buildBulkMailerTemplateDraft(input?: Partial<BulkMailerTemplateRow>): Partial<BulkMailerTemplateRow> {
  const subject = input?.subject || "";
  const bodyHtml = input?.body_html || "";

  return {
    ...input,
    category: input?.category || "general",
    subject,
    body_html: bodyHtml,
    body_text: sanitizeBulkMailerText(input?.body_text),
    available_variables: extractBulkMailerVariables({ subject, bodyHtml }),
    sample_variables: input?.sample_variables || {},
    is_active: input?.is_active ?? true,
    is_shared: input?.is_shared ?? false,
  };
}

export function mergeBulkMailerVariableValues(base: JsonMap | null | undefined, extra: JsonMap | null | undefined) {
  return {
    ...(base || {}),
    ...(extra || {}),
  };
}

export function bulkMailerRecipientDraftIsEmpty(entry: BulkMailerRecipientDraft) {
  return !entry.email.trim() && !entry.name.trim() && Object.values(entry.variables).every((value) => !value.trim());
}

export function formatBulkMailerFileSize(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) {
    return "0 B";
  }

  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(bytes >= 10 * 1024 ? 0 : 1)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(bytes >= 10 * 1024 * 1024 ? 0 : 1)} MB`;
}

export function getBulkMailerAttachmentTotalSize(
  attachments: BulkMailerCampaignAttachment[]
) {
  return attachments.reduce((sum, attachment) => sum + Math.max(0, attachment.size || 0), 0);
}

export async function readBulkMailerAttachmentFile(
  file: File
): Promise<BulkMailerCampaignAttachment> {
  const contentBase64 = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error(`Could not read ${file.name}.`));
    reader.onload = () => {
      const result = typeof reader.result === "string" ? reader.result : "";
      const [, base64 = ""] = result.split(",", 2);
      if (!base64) {
        reject(new Error(`Could not encode ${file.name}.`));
        return;
      }
      resolve(base64);
    };
    reader.readAsDataURL(file);
  });

  return {
    id: `attachment_${Math.random().toString(36).slice(2, 10)}`,
    name: file.name || "attachment",
    contentType: file.type || "application/octet-stream",
    size: file.size,
    contentBase64,
  };
}

function isBulkMailerAttachmentRecord(value: unknown): value is BulkMailerCampaignAttachment {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.id === "string" &&
    typeof candidate.name === "string" &&
    typeof candidate.contentType === "string" &&
    typeof candidate.size === "number" &&
    typeof candidate.contentBase64 === "string"
  );
}

export function getBulkMailerCampaignAttachments(
  campaignSettings: JsonMap | null | undefined
) {
  const rawAttachments = campaignSettings?.attachments;
  if (!Array.isArray(rawAttachments)) {
    return [] as BulkMailerCampaignAttachment[];
  }

  return rawAttachments
    .filter(isBulkMailerAttachmentRecord)
    .map((attachment) => ({
      id: attachment.id.trim() || `attachment_${Math.random().toString(36).slice(2, 10)}`,
      name: attachment.name.trim() || "attachment",
      contentType: attachment.contentType.trim() || "application/octet-stream",
      size: Math.max(0, Math.floor(attachment.size || 0)),
      contentBase64: attachment.contentBase64.trim(),
    }))
    .filter((attachment) => attachment.contentBase64.length > 0);
}

export function withBulkMailerCampaignAttachments(
  campaignSettings: JsonMap | null | undefined,
  attachments: BulkMailerCampaignAttachment[]
): JsonMap {
  const nextSettings: JsonMap = { ...(campaignSettings || {}) };

  if (attachments.length === 0) {
    delete nextSettings.attachments;
    return nextSettings;
  }

  nextSettings.attachments = attachments.map((attachment) => ({
    id: attachment.id,
    name: attachment.name,
    contentType: attachment.contentType,
    size: attachment.size,
    contentBase64: attachment.contentBase64,
  }));

  return nextSettings;
}

export function getBulkMailerActiveEmailConnections(
  connections: EmailConnectionRow[]
) {
  return connections.filter((connection) => connection.is_active && connection.outbound_enabled);
}

export function getBulkMailerAutoSenderChoice(
  smtpProfiles: BulkMailerSmtpProfileSummary[],
  emailConnections: EmailConnectionRow[]
) {
  const adminFallback =
    smtpProfiles.find(
      (profile) =>
        profile.scope === "admin_default" &&
        profile.is_active &&
        profile.is_default_fallback
    ) ||
    smtpProfiles.find(
      (profile) => profile.scope === "admin_default" && profile.is_active
    );
  if (adminFallback) {
    return {
      type: "smtp" as const,
      id: adminFallback.id,
      value: `smtp:${adminFallback.id}`,
      label: `${adminFallback.name} · ${adminFallback.from_email}`,
    };
  }

  const userFallback = smtpProfiles.find(
    (profile) => profile.scope === "user_owned" && profile.is_active
  );
  if (userFallback) {
    return {
      type: "smtp" as const,
      id: userFallback.id,
      value: `smtp:${userFallback.id}`,
      label: `${userFallback.name} · ${userFallback.from_email}`,
    };
  }

  const firstEmailConnection = getBulkMailerActiveEmailConnections(emailConnections)[0];
  if (firstEmailConnection) {
    const label = firstEmailConnection.name.trim() || firstEmailConnection.email_address;
    return {
      type: "email" as const,
      id: firstEmailConnection.id,
      value: `email:${firstEmailConnection.id}`,
      label: `${label} · ${firstEmailConnection.email_address}`,
    };
  }

  return null;
}

export function getBulkMailerCampaignSenderSelectValue(
  campaign: Pick<
    Partial<BulkMailerCampaignRow>,
    "selected_smtp_profile_id" | "selected_email_connection_id"
  >
) {
  if (campaign.selected_email_connection_id) {
    return `email:${campaign.selected_email_connection_id}`;
  }

  if (campaign.selected_smtp_profile_id) {
    return `smtp:${campaign.selected_smtp_profile_id}`;
  }

  return "";
}

export function getBulkMailerCampaignSenderSelectionPatch(value: string) {
  if (value.startsWith("email:")) {
    return {
      selected_smtp_profile_id: null,
      selected_email_connection_id: value.slice("email:".length) || null,
      resolved_smtp_profile_id: null,
      resolved_email_connection_id: null,
    };
  }

  if (value.startsWith("smtp:")) {
    return {
      selected_smtp_profile_id: value.slice("smtp:".length) || null,
      selected_email_connection_id: null,
      resolved_smtp_profile_id: null,
      resolved_email_connection_id: null,
    };
  }

  return {
    selected_smtp_profile_id: null,
    selected_email_connection_id: null,
    resolved_smtp_profile_id: null,
    resolved_email_connection_id: null,
  };
}

function resolveBulkMailerAutoSenderLabel(
  smtpProfiles: BulkMailerSmtpProfileSummary[],
  emailConnections: EmailConnectionRow[]
) {
  const choice = getBulkMailerAutoSenderChoice(smtpProfiles, emailConnections);
  if (!choice) {
    return "No sender";
  }

  return `Auto (${choice.label})`;
}

export function resolveBulkMailerCampaignSenderLabel(
  campaign: Pick<
    Partial<BulkMailerCampaignRow>,
    | "selected_smtp_profile_id"
    | "selected_email_connection_id"
    | "resolved_smtp_profile_id"
    | "resolved_email_connection_id"
  >,
  smtpProfiles: BulkMailerSmtpProfileSummary[],
  emailConnections: EmailConnectionRow[]
) {
  const emailConnectionId =
    campaign.resolved_email_connection_id || campaign.selected_email_connection_id;
  if (emailConnectionId) {
    const connection = emailConnections.find((entry) => entry.id === emailConnectionId);
    if (!connection) {
      return "Student Email sender";
    }

    const label = connection.name.trim() || connection.email_address;
    return `${label} · ${connection.email_address}`;
  }

  const smtpProfileId =
    campaign.resolved_smtp_profile_id || campaign.selected_smtp_profile_id;
  if (smtpProfileId) {
    const profile = smtpProfiles.find((entry) => entry.id === smtpProfileId);
    if (!profile) {
      return "SMTP sender";
    }

    return `${profile.name} · ${profile.from_email}`;
  }

  return resolveBulkMailerAutoSenderLabel(smtpProfiles, emailConnections);
}
