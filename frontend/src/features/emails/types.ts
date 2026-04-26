import type { CoinFeatureSettingRow, JsonMap } from "../../types/database";

export type EmailPlanFeatureKey =
  | "student_email_month_pass"
  | "student_email_six_month_pass"
  | "student_email_year_pass";

export interface EmailPlanDefinition {
  featureKey: EmailPlanFeatureKey;
  label: string;
  durationLabel: string;
  durationDays: number;
}

export const EMAIL_PLAN_DEFINITIONS: EmailPlanDefinition[] = [
  {
    featureKey: "student_email_month_pass",
    label: "Monthly",
    durationLabel: "30 days",
    durationDays: 30,
  },
  {
    featureKey: "student_email_six_month_pass",
    label: "6 Months",
    durationLabel: "180 days",
    durationDays: 180,
  },
  {
    featureKey: "student_email_year_pass",
    label: "Yearly",
    durationLabel: "365 days",
    durationDays: 365,
  },
];

export interface EmailMailboxRequestRow {
  id: string;
  user_id: string;
  preferred_local_part: string;
  requested_domain: string;
  preferred_email_address: string;
  plan_feature_key: EmailPlanFeatureKey;
  status: "pending" | "approved" | "rejected" | "assigned" | "cancelled";
  request_note: string | null;
  admin_note: string | null;
  reviewed_by_user_id: string | null;
  reviewed_at: string | null;
  approved_mailbox_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface EmailMailboxRow {
  id: string;
  user_id: string;
  request_id: string | null;
  domain: string;
  local_part: string;
  email_address: string;
  display_name: string | null;
  status: "pending_setup" | "active" | "suspended" | "renewal_required" | "disabled";
  quota_bytes: number;
  used_bytes: number;
  assigned_by_user_id: string | null;
  assigned_at: string | null;
  last_synced_at: string | null;
  last_sync_error: string | null;
  created_at: string;
  updated_at: string;
}

export interface EmailConnectionRow {
  id: string;
  mailbox_id: string;
  owner_user_id: string;
  scope: "assigned" | "user_owned";
  name: string;
  email_address: string;
  username: string;
  smtp_host: string;
  smtp_port: number;
  smtp_encryption: "ssl" | "tls" | "none";
  imap_host: string | null;
  imap_port: number | null;
  imap_encryption: "ssl" | "tls" | "none" | null;
  outbound_enabled: boolean;
  inbound_enabled: boolean;
  is_active: boolean;
  is_default: boolean;
  last_synced_uid: number | null;
  last_synced_at: string | null;
  last_sync_error: string | null;
  created_at: string;
  updated_at: string;
}

export interface EmailAddressItem {
  email: string;
  name?: string | null;
}

export interface EmailMessageSummaryRow {
  id: string;
  mailbox_id: string;
  owner_user_id: string;
  folder: "inbox" | "sent" | "trash";
  direction: "incoming" | "outgoing";
  thread_id: string | null;
  external_message_id: string | null;
  in_reply_to_message_id: string | null;
  forwarded_from_message_id: string | null;
  subject: string;
  from_email: string;
  from_name: string | null;
  to_recipients: EmailAddressItem[];
  cc_recipients: EmailAddressItem[];
  bcc_recipients: EmailAddressItem[];
  snippet: string | null;
  has_attachments: boolean;
  attachment_count: number;
  stored_size_bytes: number;
  tracking_enabled: boolean;
  tracked_recipient_count: number;
  opened_recipient_count: number;
  total_open_count: number;
  is_read: boolean;
  deleted_at: string | null;
  batch_number: number;
  batch_position: number;
  r2_batch_key: string;
  message_payload_version: number;
  sent_at: string | null;
  received_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface EmailAttachment {
  name: string;
  content_type: string;
  size: number;
  object_key?: string;
}

export interface EmailMessagePayload {
  text: string;
  html: string;
  attachments: EmailAttachment[];
  headers?: JsonMap;
  failed_recipients?: Array<{ email: string; error: string }>;
  connection_profile?: {
    id: string;
    name: string;
    email_address: string;
  };
}

export interface EmailDeliveryReceiptRow {
  id: string;
  recipient_email: string;
  recipient_name: string | null;
  open_count: number;
  opened_at: string | null;
  last_opened_at: string | null;
}

export interface EmailMailboxOverview {
  mailbox: EmailMailboxRow | null;
  requests: EmailMailboxRequestRow[];
  active_access: {
    user_id: string;
    access_key: string;
    granted_by_feature_key: EmailPlanFeatureKey;
    expires_at: string;
  } | null;
  unread_inbox_count: number;
  sent_count: number;
  connection_profiles: EmailConnectionRow[];
  mailbox_domain: string;
  storage_limit_bytes: number;
}

export interface EmailMessageListResponse {
  items: EmailMessageSummaryRow[];
  total_count: number;
  has_more: boolean;
  next_offset: number;
}

export interface EmailMessageDetail {
  message: EmailMessageSummaryRow;
  payload: EmailMessagePayload;
  receipts: EmailDeliveryReceiptRow[];
}

export interface EmailAdminDashboard {
  requests: EmailMailboxRequestRow[];
  mailboxes: EmailMailboxRow[];
  connections: EmailConnectionRow[];
}

export function findEmailPlanSetting(
  settings: CoinFeatureSettingRow[],
  featureKey: EmailPlanFeatureKey
) {
  return settings.find((entry) => entry.feature_key === featureKey) || null;
}

export function formatStorageSize(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) {
    return "0 B";
  }

  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(bytes >= 10 * 1024 ? 0 : 1)} KB`;
  }

  if (bytes < 1024 * 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(bytes >= 10 * 1024 * 1024 ? 0 : 1)} MB`;
  }

  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

export function formatMailboxStatus(status: EmailMailboxRow["status"] | EmailMailboxRequestRow["status"]) {
  return status.replace(/_/g, " ");
}
