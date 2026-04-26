import type {
  BulkMailerCampaignRecipientRow,
  BulkMailerCampaignRow,
  BulkMailerCampaignStatus,
  BulkMailerPlatformSettingsRow,
  BulkMailerSendLogRow,
  BulkMailerSmtpEncryption,
  BulkMailerSmtpScope,
  BulkMailerTemplateRow,
  BulkMailerUserLimitOverrideRow,
  JsonMap,
  ProfileRow,
} from "../../types/database";

export interface BulkMailerEffectiveLimits {
  hourlySendLimit: number;
  dailySendLimit: number;
  campaignRecipientLimit: number;
  maxSmtpProfiles: number;
  maxTemplates: number;
  maxCampaignsPerDay: number;
  sendingEnabled: boolean;
}

export interface BulkMailerSmtpProfileSummary {
  id: string;
  owner_user_id: string | null;
  scope: BulkMailerSmtpScope;
  name: string;
  host: string;
  port: number;
  username: string;
  encryption: BulkMailerSmtpEncryption;
  auth_method: "login" | "plain";
  from_name: string;
  from_email: string;
  reply_to_email: string | null;
  is_active: boolean;
  is_default_fallback: boolean;
  rate_limit_per_minute: number;
  rate_limit_per_hour: number;
  daily_limit: number;
  monthly_limit: number;
  total_sent_count: number;
  total_failed_count: number;
  last_used_at: string | null;
  last_tested_at: string | null;
  last_test_status: "untested" | "success" | "failed";
  last_test_error: string | null;
  created_by: string;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface BulkMailerSmtpProfileInput {
  id?: string;
  scope: BulkMailerSmtpScope;
  name: string;
  host: string;
  port: number;
  username: string;
  password?: string;
  encryption: BulkMailerSmtpEncryption;
  auth_method: "login" | "plain";
  from_name: string;
  from_email: string;
  reply_to_email?: string | null;
  is_active: boolean;
  is_default_fallback: boolean;
  rate_limit_per_minute: number;
  rate_limit_per_hour: number;
  daily_limit: number;
  monthly_limit: number;
}

export interface BulkMailerRecipientDraft {
  id: string;
  email: string;
  name: string;
  variables: Record<string, string>;
  sourceLabel?: string | null;
  sourceIndex?: number | null;
}

export interface BulkMailerCampaignAttachment {
  id: string;
  name: string;
  contentType: string;
  size: number;
  contentBase64: string;
}

export interface BulkMailerCsvRow {
  id: string;
  values: Record<string, string>;
}

export interface BulkMailerParsedCsv {
  headers: string[];
  rows: BulkMailerCsvRow[];
}

export interface BulkMailerCampaignWithTemplate extends BulkMailerCampaignRow {
  template: Pick<BulkMailerTemplateRow, "id" | "name" | "is_shared" | "owner_user_id"> | null;
  owner: Pick<ProfileRow, "id" | "username" | "full_name"> | null;
}

export interface BulkMailerLogWithCampaign extends BulkMailerSendLogRow {
  campaign: Pick<BulkMailerCampaignRow, "id" | "name" | "status"> | null;
}

export interface BulkMailerTemplateWithOwner extends BulkMailerTemplateRow {
  owner: Pick<ProfileRow, "id" | "username" | "full_name" | "avatar_url"> | null;
}

export interface BulkMailerRecipientWithCampaign extends BulkMailerCampaignRecipientRow {
  campaign: Pick<BulkMailerCampaignRow, "id" | "name" | "status"> | null;
}

export interface BulkMailerDashboardStats {
  totalTemplates: number;
  totalCampaigns: number;
  totalSent: number;
  totalFailed: number;
  totalOpenedRecipients: number;
  totalOpenEvents: number;
  averageOpenRate: number;
}

export interface BulkMailerSendBatchResult {
  campaign_id: string;
  processed_count: number;
  sent_count: number;
  failed_count: number;
  remaining_count: number;
  status: BulkMailerCampaignStatus;
  resolved_smtp_profile_id: string | null;
  resolved_email_connection_id: string | null;
  limit_message: string | null;
}

export interface BulkMailerSmtpTestResult {
  success: boolean;
  profile: BulkMailerSmtpProfileSummary;
  message: string;
}

export interface BulkMailerSmtpListResponse {
  profiles: BulkMailerSmtpProfileSummary[];
}

export interface BulkMailerAudienceReplacementInput {
  campaignId: string;
  ownerUserId: string;
  recipients: Array<{
    recipient_email: string;
    recipient_name?: string | null;
    variable_payload?: JsonMap;
    source_index?: number | null;
    source_label?: string | null;
  }>;
}

export const defaultBulkMailerPlatformSettings: BulkMailerPlatformSettingsRow = {
  id: 1,
  default_hourly_send_limit: 200,
  default_daily_send_limit: 1000,
  default_campaign_recipient_limit: 500,
  default_max_smtp_profiles_per_user: 2,
  default_max_templates_per_user: 30,
  default_max_campaigns_per_day: 10,
  allow_user_smtp_profiles: true,
  open_tracking_enabled: true,
  created_at: new Date(0).toISOString(),
  updated_at: new Date(0).toISOString(),
};

export const emptyBulkMailerOverride = (): BulkMailerUserLimitOverrideRow => ({
  id: "",
  user_id: "",
  hourly_send_limit: null,
  daily_send_limit: null,
  campaign_recipient_limit: null,
  max_smtp_profiles: null,
  max_templates: null,
  max_campaigns_per_day: null,
  sending_enabled: true,
  override_note: null,
  created_by: null,
  updated_by: null,
  created_at: new Date(0).toISOString(),
  updated_at: new Date(0).toISOString(),
});
