export type ThemePreference = "light" | "dark" | "system";
export type DiscussionKind = "study" | "job" | "anonymous";
export type ProfileVisibility =
  | "everyone"
  | "followers"
  | "followers_and_following"
  | "following"
  | "no_one";
export type ChatRequestPolicy =
  | "everyone"
  | "followers"
  | "followers_and_following"
  | "following"
  | "no_one";
export type ChatRequestStatus = "pending" | "accepted" | "declined" | "cancelled" | "expired";
export type ChatConversationType = "direct";
export type ChatMessageKind = "request_intro" | "text" | "image" | "voice" | "system";
export type ChatMediaKind = "image" | "voice";
export type ChatPresenceStatus = "online" | "offline";
export type PostScope = "discussion" | "community";
export type CommunityJoinPolicy = "open" | "approval_required";
export type CommunityFeedVisibility = "members_only" | "community_only" | "discussion_and_community";
export type CommunityMemberRole = "owner" | "admin" | "member";
export type CommunityMemberStatus = "pending" | "active" | "banned";
export type ModerationState = "published" | "hidden" | "flagged";
export type PostType = "standard" | "poll";
export type MediaUsage = "avatar" | "banner" | "post_image" | "post_pdf" | "verification_proof";
export type MediaKind = "image" | "pdf";
export type VerificationRequestStatus = "pending" | "approved" | "rejected" | "cancelled";
export type AccountDeletionRequestStatus = "pending" | "approved" | "rejected" | "completed" | "cancelled";
export type PostReportReason =
  | "spam"
  | "harassment"
  | "hate"
  | "nudity"
  | "violence"
  | "misinformation"
  | "scam"
  | "copyright"
  | "other";
export type PostReportStatus = "open" | "actioned" | "dismissed";
export type BugFixLanguage =
  | "javascript"
  | "python"
  | "java"
  | "cpp"
  | "csharp"
  | "c"
  | "ruby"
  | "php"
  | "html"
  | "css";
export type BugFixDifficulty = "easy" | "medium" | "hard";
export type BugFixQuestionStatus = "draft" | "published" | "archived";
export type ResumeTemplateKey = "ats_classic" | "sidebar_professional" | "executive_dark";
export type PortfolioTemplateKey = "minimal_hero" | "bold_cards" | "creative_timeline";
export type QrCodeType = "url" | "text" | "email" | "phone";
export type NotificationType =
  | "follow"
  | "post_like"
  | "post_comment"
  | "comment_reply"
  | "profile_view"
  | "post_mention"
  | "coin_wallet"
  | "chat_request"
  | "chat_message"
  | "email_mailbox";
export type AdminRole =
  | "super_admin"
  | "content_admin"
  | "community_admin"
  | "support_admin";
export type BulkMailerSmtpScope = "admin_default" | "user_owned" | "email_connection";
export type BulkMailerSmtpEncryption = "tls" | "ssl" | "none";
export type BulkMailerCampaignStatus =
  | "draft"
  | "queued"
  | "sending"
  | "paused"
  | "completed"
  | "failed"
  | "cancelled";
export type BulkMailerRecipientStatus = "queued" | "sending" | "sent" | "opened" | "failed" | "skipped";
export type BulkMailerLogStatus = "queued" | "sent" | "opened" | "failed" | "skipped";
export type BulkMailerRecipientSource = "manual" | "csv";
export type CoinBillingModel = "per_use" | "time_pass";
export type CoinTransactionDirection = "credit" | "debit";
export type CoinTransactionType =
  | "signup_bonus"
  | "referral_reward"
  | "admin_adjustment"
  | "feature_charge"
  | "feature_refund"
  | "wallet_recharge";
export type WalletRechargeStatus = "pending" | "approved" | "rejected";

export type EncryptedPayload = Record<string, unknown>;
export type ResumeDocumentPayload = Record<string, unknown>;
export type JsonMap = Record<string, unknown>;

export interface SocialLinks {
  instagram: string | null;
  linkedin: string | null;
  email: string | null;
  mobile_number: string | null;
  whatsapp: string | null;
  youtube: string | null;
  telegram: string | null;
  website: string | null;
  other_links: string[];
}

export interface ProfileRow {
  id: string;
  username: string;
  referral_code: string;
  full_name: string;
  headline: string | null;
  bio: string | null;
  campus: string | null;
  course: string | null;
  year_of_study: string | null;
  skills: string[];
  social_links: SocialLinks;
  avatar_url: string | null;
  banner_url: string | null;
  is_verified: boolean;
  profile_visibility: ProfileVisibility;
  chat_request_policy: ChatRequestPolicy;
  show_profile_stats: boolean;
  show_study_activity: boolean;
  show_job_activity: boolean;
  enable_chat_request_notifications: boolean;
  enable_message_notifications: boolean;
  can_post: boolean;
  is_banned: boolean;
  posting_restricted_until: string | null;
  moderation_note: string | null;
  theme_preference: ThemePreference;
  created_at: string;
  updated_at: string;
}

export interface FollowRow {
  id: string;
  follower_id: string;
  following_id: string;
  created_at: string;
}

export interface CommunityRow {
  id: string;
  name: string;
  slug: string;
  description: string;
  hero_color: string;
  is_visible: boolean;
  member_count?: number;
  posting_modes: DiscussionKind[];
  join_policy: CommunityJoinPolicy;
  requires_password: boolean;
  password_hint: string | null;
  password_version: number;
  feed_visibility: CommunityFeedVisibility;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface CommunityMemberRow {
  id: string;
  community_id: string;
  user_id: string;
  role: CommunityMemberRole;
  status: CommunityMemberStatus;
  requested_at: string;
  accepted_at: string | null;
  accepted_by: string | null;
  banned_reason: string | null;
  updated_at: string;
  joined_via_password_version: number;
  created_at: string;
}

export interface CommunityMemberWithProfile extends CommunityMemberRow {
  user: Pick<ProfileRow, "id" | "username" | "full_name" | "avatar_url" | "is_verified"> | null;
}

export interface ChatBlockRow {
  id: string;
  blocker_id: string;
  blocked_id: string;
  created_at: string;
}

export interface ChatConversationRow {
  id: string;
  conversation_type: ChatConversationType;
  direct_message_key: string | null;
  created_by: string;
  last_server_activity_at: string | null;
  expires_at: string;
  created_at: string;
  updated_at: string;
}

export interface ChatParticipantRow {
  id: string;
  conversation_id: string;
  user_id: string;
  joined_at: string;
  created_at: string;
}

export interface ChatRequestRow {
  id: string;
  sender_id: string;
  recipient_id: string;
  status: ChatRequestStatus;
  intro_message_client_id: string;
  intro_message_kind: ChatMessageKind;
  intro_envelope: EncryptedPayload;
  accepted_conversation_id: string | null;
  created_at: string;
  responded_at: string | null;
  expires_at: string;
}

export interface ChatDeviceRow {
  id: string;
  user_id: string;
  device_label: string;
  platform: string;
  app_version: string | null;
  installation_id: string;
  registration_id: number | null;
  identity_key_public: string;
  signed_pre_key_public: string;
  signed_pre_key_signature: string;
  signed_pre_key_id: string;
  is_active: boolean;
  is_primary: boolean;
  last_heartbeat_at: string | null;
  created_at: string;
  updated_at: string;
  revoked_at: string | null;
}

export interface PushDeviceRow {
  id: string;
  user_id: string;
  installation_id: string;
  device_label: string;
  platform: string;
  push_token: string;
  app_version: string | null;
  is_active: boolean;
  last_seen_at: string;
  created_at: string;
  updated_at: string;
  revoked_at: string | null;
}

export interface ChatDeviceOneTimeKeyRow {
  id: string;
  device_id: string;
  key_id: string;
  public_key: string;
  claimed_by_user_id: string | null;
  claimed_at: string | null;
  created_at: string;
}

export interface ChatMediaBlobRow {
  id: string;
  owner_id: string;
  sender_device_id: string | null;
  media_kind: ChatMediaKind;
  storage_provider: string;
  storage_path: string;
  mime_type: string;
  byte_size: number;
  sha256_hex: string;
  created_at: string;
  expires_at: string;
  consumed_at: string | null;
  deleted_at: string | null;
}

export interface ChatMessageEnvelopeRow {
  id: string;
  conversation_id: string | null;
  request_id: string | null;
  sender_id: string;
  sender_device_id: string;
  recipient_id: string;
  recipient_device_id: string;
  client_message_id: string;
  message_kind: ChatMessageKind;
  payload: EncryptedPayload;
  media_blob_id: string | null;
  sent_at: string;
  expires_at: string;
}

export interface ChatDeliveryReceiptRow {
  id: string;
  conversation_id: string | null;
  request_id: string | null;
  client_message_id: string;
  sender_id: string;
  recipient_id: string;
  recipient_device_id: string;
  delivered_at: string;
  expires_at: string;
  created_at: string;
}

export interface ChatPresenceRow {
  user_id: string;
  status: ChatPresenceStatus;
  last_heartbeat_at: string | null;
  expires_at: string | null;
  updated_at: string;
}

export interface ProfileHiddenCommunityRow {
  id: string;
  profile_id: string;
  community_id: string;
  created_at: string;
}

export interface PlatformSettingsRow {
  id: number;
  max_images_per_post: number;
  max_pdf_size_mb: number;
  max_resumes_per_user: number;
  max_portfolios_per_user: number;
  signup_bonus_coins: number;
  referral_reward_coins: number;
  enable_profile_view_notifications: boolean;
  ai_mention_reply_profile_id: string | null;
  ai_mention_reply_max_tokens: number;
  created_at: string;
  updated_at: string;
}

export interface CoinFeatureSettingRow {
  feature_key: string;
  feature_name: string;
  description: string;
  category: string;
  billing_model: CoinBillingModel;
  coins_required: number;
  access_key: string | null;
  duration_days: number | null;
  is_enabled: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface CoinWalletRow {
  user_id: string;
  balance: number;
  total_credited: number;
  total_debited: number;
  created_at: string;
  updated_at: string;
}

export interface CoinTransactionRow {
  id: string;
  user_id: string;
  direction: CoinTransactionDirection;
  transaction_type: CoinTransactionType;
  amount: number;
  balance_before: number;
  balance_after: number;
  feature_key: string | null;
  reference_type: string | null;
  reference_id: string | null;
  description: string | null;
  metadata: JsonMap;
  performed_by_user_id: string | null;
  reversed_transaction_id: string | null;
  idempotency_key: string | null;
  created_at: string;
}

export interface CoinFeatureAccessRow {
  user_id: string;
  access_key: string;
  granted_by_feature_key: string | null;
  last_transaction_id: string | null;
  activated_at: string;
  expires_at: string;
  created_at: string;
  updated_at: string;
}

export interface WalletUpiSettingRow {
  id: number;
  upi_id: string;
  merchant_name: string;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface WalletRechargeRequestRow {
  id: string;
  order_id: string;
  user_id: string;
  coins_requested: number;
  upi_id_used: string;
  merchant_name_used: string;
  qr_payload: string;
  upi_reference: string;
  payment_note: string | null;
  status: WalletRechargeStatus;
  admin_note: string | null;
  reviewed_by_user_id: string | null;
  reviewed_at: string | null;
  approved_coin_transaction_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface VerificationRequestRow {
  id: string;
  user_id: string;
  status: VerificationRequestStatus;
  proof_media_asset_id: string;
  proof_public_url: string;
  proof_file_kind: MediaKind;
  request_note: string | null;
  submitted_coin_transaction_id: string | null;
  review_note: string | null;
  reviewed_by_user_id: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface AccountDeletionRequestRow {
  id: string;
  user_id: string;
  status: AccountDeletionRequestStatus;
  email: string | null;
  username_snapshot: string;
  full_name_snapshot: string;
  reason: string | null;
  review_note: string | null;
  reviewed_by_user_id: string | null;
  reviewed_at: string | null;
  cancelled_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface PostReportRow {
  id: string;
  reporter_user_id: string;
  post_id: string;
  reason: PostReportReason;
  details: string | null;
  status: PostReportStatus;
  admin_note: string | null;
  reviewed_by_user_id: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserReferralRow {
  id: string;
  referrer_user_id: string;
  referred_user_id: string;
  referral_code_used: string;
  reward_transaction_id: string | null;
  rewarded_at: string | null;
  created_at: string;
}

export interface BulkMailerPlatformSettingsRow {
  id: number;
  default_hourly_send_limit: number;
  default_daily_send_limit: number;
  default_campaign_recipient_limit: number;
  default_max_smtp_profiles_per_user: number;
  default_max_templates_per_user: number;
  default_max_campaigns_per_day: number;
  allow_user_smtp_profiles: boolean;
  open_tracking_enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface BulkMailerUserLimitOverrideRow {
  id: string;
  user_id: string;
  hourly_send_limit: number | null;
  daily_send_limit: number | null;
  campaign_recipient_limit: number | null;
  max_smtp_profiles: number | null;
  max_templates: number | null;
  max_campaigns_per_day: number | null;
  sending_enabled: boolean;
  override_note: string | null;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface BulkMailerSmtpProfileRow {
  id: string;
  owner_user_id: string | null;
  scope: BulkMailerSmtpScope;
  name: string;
  host: string;
  port: number;
  username: string;
  password_encrypted: string;
  password_iv: string;
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

export interface BulkMailerTemplateRow {
  id: string;
  owner_user_id: string;
  name: string;
  slug: string;
  description: string | null;
  subject: string;
  body_html: string;
  body_text: string | null;
  category: string;
  available_variables: string[];
  sample_variables: JsonMap;
  is_active: boolean;
  is_shared: boolean;
  created_by: string;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface BulkMailerCampaignRow {
  id: string;
  owner_user_id: string;
  name: string;
  status: BulkMailerCampaignStatus;
  template_id: string | null;
  selected_smtp_profile_id: string | null;
  selected_email_connection_id: string | null;
  resolved_smtp_profile_id: string | null;
  resolved_email_connection_id: string | null;
  subject: string;
  body_html: string;
  body_text: string | null;
  from_name_override: string | null;
  reply_to_email: string | null;
  recipient_source: BulkMailerRecipientSource;
  variable_mapping: JsonMap;
  campaign_settings: JsonMap;
  total_recipients: number;
  sent_count: number;
  failed_count: number;
  opened_recipient_count: number;
  total_open_count: number;
  last_batch_processed_count: number;
  started_at: string | null;
  completed_at: string | null;
  last_activity_at: string | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

export interface BulkMailerCampaignRecipientRow {
  id: string;
  campaign_id: string;
  owner_user_id: string;
  recipient_email: string;
  recipient_name: string | null;
  variable_payload: JsonMap;
  source_index: number | null;
  source_label: string | null;
  status: BulkMailerRecipientStatus;
  attempt_count: number;
  last_error: string | null;
  sent_at: string | null;
  opened_at: string | null;
  last_opened_at: string | null;
  open_count: number;
  created_at: string;
  updated_at: string;
}

export interface BulkMailerSendLogRow {
  id: string;
  campaign_id: string | null;
  recipient_id: string | null;
  sender_user_id: string;
  smtp_profile_id: string | null;
  email_connection_id: string | null;
  smtp_scope: BulkMailerSmtpScope | null;
  template_id: string | null;
  recipient_email: string;
  recipient_name: string | null;
  subject: string;
  rendered_html: string | null;
  rendered_text: string | null;
  variable_payload: JsonMap;
  status: BulkMailerLogStatus;
  smtp_message_id: string | null;
  smtp_response: string | null;
  error_message: string | null;
  sent_at: string | null;
  opened_at: string | null;
  last_opened_at: string | null;
  open_count: number;
  created_at: string;
}

export interface InstagramAccountRow {
  id: string;
  user_id: string;
  connection_type: "facebook_login" | "instagram_login";
  account_name: string | null;
  instagram_username: string | null;
  ig_user_id: string;
  page_id: string;
  page_name: string | null;
  access_token_encrypted: string;
  access_token_iv: string;
  token_expires_at: string | null;
  granted_scopes: string[];
  webhook_subscribed: boolean;
  automation_enabled: boolean;
  last_synced_media_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface InstagramCommentRuleRow {
  id: string;
  user_id: string;
  instagram_account_id: string | null;
  media_id: string;
  keyword: string;
  keyword_list: string[];
  match_mode?: "contains_any" | "contains_all" | "exact" | "regex";
  negative_keywords?: string[];
  reply_text: string;
  reply_variants: string[];
  fallback_reply_text?: string | null;
  is_active: boolean;
  priority: number;
  delay_min_seconds: number;
  delay_max_seconds: number;
  daily_limit_per_sender?: number;
  cooldown_seconds?: number;
  created_at: string;
  updated_at: string;
}

export interface InstagramDmRuleRow {
  id: string;
  user_id: string;
  instagram_account_id: string | null;
  keyword: string;
  keyword_list: string[];
  match_mode?: "contains_any" | "contains_all" | "exact" | "regex";
  negative_keywords?: string[];
  reply_text: string;
  reply_variants: string[];
  fallback_reply_text?: string | null;
  is_active: boolean;
  priority: number;
  delay_min_seconds: number;
  delay_max_seconds: number;
  daily_limit_per_sender?: number;
  cooldown_seconds?: number;
  created_at: string;
  updated_at: string;
}

export interface InstagramCommentDmRuleRow {
  id: string;
  user_id: string;
  instagram_account_id: string | null;
  media_id: string | null;
  trigger_keyword: string;
  trigger_keyword_list: string[];
  match_mode?: "contains_any" | "contains_all" | "exact" | "regex";
  negative_keywords?: string[];
  comment_reply_text: string;
  comment_reply_variants: string[];
  dm_reply_text: string;
  dm_reply_variants: string[];
  fallback_comment_reply_text?: string | null;
  is_active: boolean;
  priority: number;
  delay_min_seconds: number;
  delay_max_seconds: number;
  daily_limit_per_sender?: number;
  cooldown_seconds?: number;
  created_at: string;
  updated_at: string;
}

export interface InstagramAutomationLogRow {
  id: string;
  user_id: string;
  instagram_account_id: string | null;
  action_type: string;
  source_type: string;
  status: string;
  message: string;
  related_media_id: string | null;
  related_comment_id: string | null;
  related_customer_id: string | null;
  matched_keyword: string | null;
  event_key: string | null;
  payload: JsonMap;
  error_message: string | null;
  created_at: string;
}

export interface NotificationPushPreferencesRow {
  user_id: string;
  enable_follow_push: boolean;
  enable_post_like_push: boolean;
  enable_post_comment_push: boolean;
  enable_comment_reply_push: boolean;
  enable_profile_view_push: boolean;
  enable_post_mention_push: boolean;
  enable_coin_wallet_push: boolean;
  enable_chat_request_push: boolean;
  enable_chat_message_push: boolean;
  enable_email_mailbox_push: boolean;
  created_at: string;
  updated_at: string;
}

export interface PostRow {
  id: string;
  author_id: string;
  community_id: string | null;
  visibility_scope: PostScope;
  discussion_kind: DiscussionKind;
  post_type: PostType;
  title: string;
  content: string;
  tags: string[];
  image_url: string | null;
  image_urls: string[];
  pdf_url: string | null;
  pdf_name: string | null;
  pdf_size_bytes: number | null;
  pdf_page_count: number | null;
  link_url: string | null;
  poll_question: string | null;
  poll_options: string[];
  is_anonymous: boolean;
  moderation_state: ModerationState;
  created_at: string;
  edited_at: string | null;
  updated_at: string;
}

export interface CommentRow {
  id: string;
  post_id: string;
  author_id: string;
  parent_comment_id: string | null;
  content: string;
  is_ai_generated: boolean;
  ai_generation_job_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface LikeRow {
  id: string;
  post_id: string;
  user_id: string;
  created_at: string;
}

export interface ShareRow {
  id: string;
  post_id: string;
  user_id: string;
  created_at: string;
}

export interface PollVoteRow {
  id: string;
  post_id: string;
  user_id: string;
  option_index: number;
  created_at: string;
}

export interface ProfileViewRow {
  id: string;
  viewer_id: string;
  viewed_profile_id: string;
  last_viewed_at: string;
  last_notified_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface NotificationRow {
  id: string;
  recipient_id: string;
  actor_id: string;
  post_id: string | null;
  comment_id: string | null;
  type: NotificationType;
  message: string;
  is_read: boolean;
  created_at: string;
}

export interface AdminRoleRow {
  id: string;
  user_id: string;
  role: AdminRole;
  created_at: string;
}

export interface ModerationActionRow {
  id: string;
  admin_id: string;
  target_user_id: string | null;
  target_post_id: string | null;
  target_comment_id: string | null;
  target_community_id: string | null;
  action_type: string;
  action_note: string | null;
  created_at: string;
}

export interface MediaAssetRow {
  id: string;
  owner_id: string;
  usage: MediaUsage;
  file_kind: MediaKind;
  original_name: string;
  stored_name: string;
  storage_path: string;
  public_url: string;
  mime_type: string;
  file_extension: string;
  original_size_bytes: number;
  stored_size_bytes: number;
  compression_quality: number;
  compression_ratio: number;
  width: number | null;
  height: number | null;
  pdf_page_count: number | null;
  attached_post_id: string | null;
  attached_profile_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface BugFixQuestionRow {
  id: string;
  title: string;
  language: BugFixLanguage;
  difficulty: BugFixDifficulty;
  prompt: string;
  broken_code: string;
  solution_code: string;
  hint: string | null;
  explanation: string | null;
  tags: string[];
  time_limit_seconds: number;
  points: number;
  status: BugFixQuestionStatus;
  reference_pdf_url: string | null;
  reference_pdf_name: string | null;
  reference_pdf_storage_path: string | null;
  reference_pdf_size_bytes: number | null;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface StudentResumeRow {
  id: string;
  owner_id: string;
  title: string;
  template_key: ResumeTemplateKey;
  content: ResumeDocumentPayload;
  share_slug: string;
  is_live: boolean;
  page_count: number;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface StudentPortfolioRow {
  id: string;
  owner_id: string;
  title: string;
  template_key: PortfolioTemplateKey;
  content: Record<string, unknown>;
  theme: Record<string, unknown>;
  share_slug: string;
  is_live: boolean;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface StudentWhitebookRow {
  id: string;
  owner_id: string;
  title: string;
  snapshot: Record<string, unknown>;
  preview_svg: string | null;
  share_slug: string;
  page_count: number;
  created_at: string;
  updated_at: string;
}

export interface StudentStudyNotesShareRow {
  id: string;
  owner_id: string;
  title: string;
  folder_name: string;
  snapshot: Record<string, unknown>;
  preview_text: string | null;
  preview_image_data_url: string | null;
  share_slug: string;
  entry_count: number;
  attachment_count: number;
  latest_timestamp_seconds: number;
  video_url: string;
  created_at: string;
  updated_at: string;
}

export interface QrCodeRow {
  id: string;
  owner_id: string;
  title: string;
  short_code: string;
  target_url: string;
  type: QrCodeType;
  settings: Record<string, unknown>;
  scan_count: number;
  created_at: string;
  updated_at: string;
}

export interface CommentWithAuthor extends CommentRow {
  author: ProfileRow | null;
  post?:
  | Pick<
    PostRow,
    "id" | "title" | "discussion_kind" | "visibility_scope" | "is_anonymous" | "post_type"
  >
  | null;
  replies?: CommentWithAuthor[];
}

export interface NotificationWithRelations extends NotificationRow {
  actor:
  | Pick<ProfileRow, "id" | "username" | "full_name" | "avatar_url" | "is_verified" | "updated_at">
  | null;
  post?:
  | (Pick<PostRow, "id" | "title" | "discussion_kind" | "visibility_scope" | "is_anonymous"> & {
    community?: Pick<CommunityRow, "slug" | "name"> | null;
  })
  | null;
  comment?: Pick<CommentRow, "id" | "post_id" | "parent_comment_id"> | null;
}

export interface PostWithRelations extends PostRow {
  author: ProfileRow | null;
  community: CommunityRow | null;
  likes: LikeRow[];
  shares: ShareRow[];
  poll_votes: PollVoteRow[];
  comments: CommentWithAuthor[];
}

export interface MediaAssetWithRelations extends MediaAssetRow {
  owner: Pick<ProfileRow, "id" | "username" | "full_name"> | null;
  post: Pick<PostRow, "id" | "title"> | null;
  profile: Pick<ProfileRow, "id" | "username" | "full_name"> | null;
}

export interface AdminBucketObjectRow {
  key: string;
  name: string;
  folder: string;
  size_bytes: number;
  public_url: string;
  etag: string | null;
  last_modified: string | null;
  media_asset_id: string | null;
  media_usage: MediaUsage | null;
  owner_id: string | null;
  owner_username: string | null;
  mime_type: string | null;
  file_extension: string | null;
  is_registered: boolean;
}

export interface VerificationRequestWithRelations extends VerificationRequestRow {
  user: Pick<ProfileRow, "id" | "username" | "full_name" | "is_verified"> | null;
  proof_asset: MediaAssetRow | null;
  reviewed_by: Pick<ProfileRow, "id" | "username" | "full_name"> | null;
}

export interface AccountDeletionRequestWithRelations extends AccountDeletionRequestRow {
  user: Pick<ProfileRow, "id" | "username" | "full_name" | "avatar_url" | "is_verified"> | null;
  reviewed_by: Pick<ProfileRow, "id" | "username" | "full_name"> | null;
}

export interface PostReportWithRelations extends PostReportRow {
  reporter: Pick<ProfileRow, "id" | "username" | "full_name" | "avatar_url"> | null;
  reviewed_by: Pick<ProfileRow, "id" | "username" | "full_name"> | null;
  post:
  | (Pick<
    PostRow,
    | "id"
    | "title"
    | "content"
    | "created_at"
    | "discussion_kind"
    | "visibility_scope"
    | "moderation_state"
    | "post_type"
    | "is_anonymous"
    > & {
      author: Pick<ProfileRow, "id" | "username" | "full_name" | "is_verified" | "can_post" | "is_banned"> | null;
      community: Pick<CommunityRow, "id" | "slug" | "name" | "hero_color"> | null;
    })
  | null;
}

export interface StudentResumeWithOwner extends StudentResumeRow {
  owner: Pick<ProfileRow, "id" | "username" | "full_name" | "avatar_url"> | null;
}

export interface StudentPortfolioWithOwner extends StudentPortfolioRow {
  owner: Pick<ProfileRow, "id" | "username" | "full_name" | "avatar_url"> | null;
}

export interface StudentWhitebookWithOwner extends StudentWhitebookRow {
  owner: Pick<ProfileRow, "id" | "username" | "full_name" | "avatar_url"> | null;
}

export interface StudentStudyNotesShareWithOwner extends StudentStudyNotesShareRow {
  owner: Pick<ProfileRow, "id" | "username" | "full_name" | "avatar_url"> | null;
}

export interface SearchResults {
  users: ProfileRow[];
  posts: PostWithRelations[];
}

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: ProfileRow;
        Insert: Partial<ProfileRow> & Pick<ProfileRow, "id" | "username">;
        Update: Partial<ProfileRow>;
      };
      follows: {
        Row: FollowRow;
        Insert: Partial<FollowRow> & Pick<FollowRow, "follower_id" | "following_id">;
        Update: Partial<FollowRow>;
      };
      communities: {
        Row: CommunityRow;
        Insert: Partial<CommunityRow> &
        Pick<CommunityRow, "name" | "slug" | "description" | "hero_color" | "posting_modes">;
        Update: Partial<CommunityRow>;
      };
      community_members: {
        Row: CommunityMemberRow;
        Insert: Partial<CommunityMemberRow> &
        Pick<CommunityMemberRow, "community_id" | "user_id">;
        Update: Partial<CommunityMemberRow>;
      };
      chat_blocks: {
        Row: ChatBlockRow;
        Insert: Partial<ChatBlockRow> & Pick<ChatBlockRow, "blocker_id" | "blocked_id">;
        Update: Partial<ChatBlockRow>;
      };
      chat_conversations: {
        Row: ChatConversationRow;
        Insert: Partial<ChatConversationRow> & Pick<ChatConversationRow, "created_by">;
        Update: Partial<ChatConversationRow>;
      };
      chat_participants: {
        Row: ChatParticipantRow;
        Insert: Partial<ChatParticipantRow> &
        Pick<ChatParticipantRow, "conversation_id" | "user_id">;
        Update: Partial<ChatParticipantRow>;
      };
      chat_requests: {
        Row: ChatRequestRow;
        Insert: Partial<ChatRequestRow> &
        Pick<
          ChatRequestRow,
          | "sender_id"
          | "recipient_id"
          | "intro_message_client_id"
          | "intro_message_kind"
          | "intro_envelope"
        >;
        Update: Partial<ChatRequestRow>;
      };
      chat_devices: {
        Row: ChatDeviceRow;
        Insert: Partial<ChatDeviceRow> &
        Pick<
          ChatDeviceRow,
          | "user_id"
          | "device_label"
          | "platform"
          | "installation_id"
          | "identity_key_public"
          | "signed_pre_key_public"
          | "signed_pre_key_signature"
          | "signed_pre_key_id"
        >;
        Update: Partial<ChatDeviceRow>;
      };
      push_devices: {
        Row: PushDeviceRow;
        Insert: Partial<PushDeviceRow> &
        Pick<PushDeviceRow, "user_id" | "installation_id" | "device_label" | "platform" | "push_token">;
        Update: Partial<PushDeviceRow>;
      };
      chat_device_one_time_keys: {
        Row: ChatDeviceOneTimeKeyRow;
        Insert: Partial<ChatDeviceOneTimeKeyRow> &
        Pick<ChatDeviceOneTimeKeyRow, "device_id" | "key_id" | "public_key">;
        Update: Partial<ChatDeviceOneTimeKeyRow>;
      };
      chat_media_blobs: {
        Row: ChatMediaBlobRow;
        Insert: Partial<ChatMediaBlobRow> &
        Pick<
          ChatMediaBlobRow,
          "owner_id" | "media_kind" | "storage_provider" | "storage_path" | "mime_type" | "byte_size" | "sha256_hex"
        >;
        Update: Partial<ChatMediaBlobRow>;
      };
      chat_message_envelopes: {
        Row: ChatMessageEnvelopeRow;
        Insert: Partial<ChatMessageEnvelopeRow> &
        Pick<
          ChatMessageEnvelopeRow,
          | "sender_id"
          | "sender_device_id"
          | "recipient_id"
          | "recipient_device_id"
          | "client_message_id"
          | "message_kind"
          | "payload"
        >;
        Update: Partial<ChatMessageEnvelopeRow>;
      };
      chat_delivery_receipts: {
        Row: ChatDeliveryReceiptRow;
        Insert: Partial<ChatDeliveryReceiptRow> &
        Pick<
          ChatDeliveryReceiptRow,
          "client_message_id" | "sender_id" | "recipient_id" | "recipient_device_id"
        >;
        Update: Partial<ChatDeliveryReceiptRow>;
      };
      chat_presence: {
        Row: ChatPresenceRow;
        Insert: Partial<ChatPresenceRow> & Pick<ChatPresenceRow, "user_id">;
        Update: Partial<ChatPresenceRow>;
      };
      profile_hidden_communities: {
        Row: ProfileHiddenCommunityRow;
        Insert: Partial<ProfileHiddenCommunityRow> &
        Pick<ProfileHiddenCommunityRow, "profile_id" | "community_id">;
        Update: Partial<ProfileHiddenCommunityRow>;
      };
      coin_feature_settings: {
        Row: CoinFeatureSettingRow;
        Insert: Partial<CoinFeatureSettingRow> & Pick<CoinFeatureSettingRow, "feature_key" | "feature_name">;
        Update: Partial<CoinFeatureSettingRow>;
      };
      coin_wallets: {
        Row: CoinWalletRow;
        Insert: Partial<CoinWalletRow> & Pick<CoinWalletRow, "user_id">;
        Update: Partial<CoinWalletRow>;
      };
      coin_transactions: {
        Row: CoinTransactionRow;
        Insert: Partial<CoinTransactionRow> &
        Pick<CoinTransactionRow, "user_id" | "direction" | "transaction_type" | "amount" | "balance_before" | "balance_after">;
        Update: Partial<CoinTransactionRow>;
      };
      coin_feature_access: {
        Row: CoinFeatureAccessRow;
        Insert: Partial<CoinFeatureAccessRow> &
        Pick<CoinFeatureAccessRow, "user_id" | "access_key" | "expires_at">;
        Update: Partial<CoinFeatureAccessRow>;
      };
      wallet_upi_settings: {
        Row: WalletUpiSettingRow;
        Insert: Partial<WalletUpiSettingRow> & Pick<WalletUpiSettingRow, "upi_id" | "merchant_name">;
        Update: Partial<WalletUpiSettingRow>;
      };
      wallet_recharge_requests: {
        Row: WalletRechargeRequestRow;
        Insert: Partial<WalletRechargeRequestRow> &
        Pick<
          WalletRechargeRequestRow,
          | "user_id"
          | "coins_requested"
          | "upi_id_used"
          | "merchant_name_used"
          | "qr_payload"
          | "upi_reference"
        >;
        Update: Partial<WalletRechargeRequestRow>;
      };
      verification_requests: {
        Row: VerificationRequestRow;
        Insert: Partial<VerificationRequestRow> &
        Pick<
          VerificationRequestRow,
          "user_id" | "proof_media_asset_id" | "proof_public_url" | "proof_file_kind"
        >;
        Update: Partial<VerificationRequestRow>;
      };
      account_deletion_requests: {
        Row: AccountDeletionRequestRow;
        Insert: Partial<AccountDeletionRequestRow> &
        Pick<AccountDeletionRequestRow, "user_id" | "username_snapshot" | "full_name_snapshot">;
        Update: Partial<AccountDeletionRequestRow>;
      };
      post_reports: {
        Row: PostReportRow;
        Insert: Partial<PostReportRow> &
        Pick<PostReportRow, "reporter_user_id" | "post_id" | "reason">;
        Update: Partial<PostReportRow>;
      };
      user_referrals: {
        Row: UserReferralRow;
        Insert: Partial<UserReferralRow> &
        Pick<UserReferralRow, "referrer_user_id" | "referred_user_id" | "referral_code_used">;
        Update: Partial<UserReferralRow>;
      };
      bulk_mailer_platform_settings: {
        Row: BulkMailerPlatformSettingsRow;
        Insert: Partial<BulkMailerPlatformSettingsRow>;
        Update: Partial<BulkMailerPlatformSettingsRow>;
      };
      bulk_mailer_user_limit_overrides: {
        Row: BulkMailerUserLimitOverrideRow;
        Insert: Partial<BulkMailerUserLimitOverrideRow> &
        Pick<BulkMailerUserLimitOverrideRow, "user_id">;
        Update: Partial<BulkMailerUserLimitOverrideRow>;
      };
      bulk_mailer_smtp_profiles: {
        Row: BulkMailerSmtpProfileRow;
        Insert: Partial<BulkMailerSmtpProfileRow> &
        Pick<
          BulkMailerSmtpProfileRow,
          | "scope"
          | "name"
          | "host"
          | "port"
          | "username"
          | "password_encrypted"
          | "password_iv"
          | "encryption"
          | "from_name"
          | "from_email"
          | "created_by"
        >;
        Update: Partial<BulkMailerSmtpProfileRow>;
      };
      bulk_mailer_templates: {
        Row: BulkMailerTemplateRow;
        Insert: Partial<BulkMailerTemplateRow> &
        Pick<BulkMailerTemplateRow, "owner_user_id" | "name" | "slug" | "subject" | "body_html" | "created_by">;
        Update: Partial<BulkMailerTemplateRow>;
      };
      bulk_mailer_campaigns: {
        Row: BulkMailerCampaignRow;
        Insert: Partial<BulkMailerCampaignRow> &
        Pick<BulkMailerCampaignRow, "owner_user_id" | "name" | "subject" | "body_html">;
        Update: Partial<BulkMailerCampaignRow>;
      };
      bulk_mailer_campaign_recipients: {
        Row: BulkMailerCampaignRecipientRow;
        Insert: Partial<BulkMailerCampaignRecipientRow> &
        Pick<BulkMailerCampaignRecipientRow, "campaign_id" | "owner_user_id" | "recipient_email">;
        Update: Partial<BulkMailerCampaignRecipientRow>;
      };
      bulk_mailer_send_logs: {
        Row: BulkMailerSendLogRow;
        Insert: Partial<BulkMailerSendLogRow> &
        Pick<BulkMailerSendLogRow, "sender_user_id" | "recipient_email" | "subject">;
        Update: Partial<BulkMailerSendLogRow>;
      };
      instagram_accounts: {
        Row: InstagramAccountRow;
        Insert: Partial<InstagramAccountRow> &
        Pick<
          InstagramAccountRow,
          | "user_id"
          | "connection_type"
          | "ig_user_id"
          | "page_id"
          | "access_token_encrypted"
          | "access_token_iv"
        >;
        Update: Partial<InstagramAccountRow>;
      };
      instagram_comment_rules: {
        Row: InstagramCommentRuleRow;
        Insert: Partial<InstagramCommentRuleRow> &
        Pick<InstagramCommentRuleRow, "user_id" | "media_id" | "keyword" | "reply_text">;
        Update: Partial<InstagramCommentRuleRow>;
      };
      instagram_dm_rules: {
        Row: InstagramDmRuleRow;
        Insert: Partial<InstagramDmRuleRow> &
        Pick<InstagramDmRuleRow, "user_id" | "keyword" | "reply_text">;
        Update: Partial<InstagramDmRuleRow>;
      };
      instagram_comment_dm_rules: {
        Row: InstagramCommentDmRuleRow;
        Insert: Partial<InstagramCommentDmRuleRow> &
        Pick<
          InstagramCommentDmRuleRow,
          "user_id" | "trigger_keyword" | "comment_reply_text" | "dm_reply_text"
        >;
        Update: Partial<InstagramCommentDmRuleRow>;
      };
      instagram_automation_logs: {
        Row: InstagramAutomationLogRow;
        Insert: Partial<InstagramAutomationLogRow> &
        Pick<InstagramAutomationLogRow, "user_id" | "action_type" | "message">;
        Update: Partial<InstagramAutomationLogRow>;
      };
      platform_settings: {
        Row: PlatformSettingsRow;
        Insert: Partial<PlatformSettingsRow>;
        Update: Partial<PlatformSettingsRow>;
      };
      notification_push_preferences: {
        Row: NotificationPushPreferencesRow;
        Insert: Partial<NotificationPushPreferencesRow> & Pick<NotificationPushPreferencesRow, "user_id">;
        Update: Partial<NotificationPushPreferencesRow>;
      };
      posts: {
        Row: PostRow;
        Insert: Partial<PostRow> &
        Pick<PostRow, "author_id" | "visibility_scope" | "discussion_kind" | "title" | "content">;
        Update: Partial<PostRow>;
      };
      comments: {
        Row: CommentRow;
        Insert: Partial<CommentRow> & Pick<CommentRow, "post_id" | "author_id" | "content">;
        Update: Partial<CommentRow>;
      };
      likes: {
        Row: LikeRow;
        Insert: Partial<LikeRow> & Pick<LikeRow, "post_id" | "user_id">;
        Update: Partial<LikeRow>;
      };
      shares: {
        Row: ShareRow;
        Insert: Partial<ShareRow> & Pick<ShareRow, "post_id" | "user_id">;
        Update: Partial<ShareRow>;
      };
      poll_votes: {
        Row: PollVoteRow;
        Insert: Partial<PollVoteRow> & Pick<PollVoteRow, "post_id" | "user_id" | "option_index">;
        Update: Partial<PollVoteRow>;
      };
      notifications: {
        Row: NotificationRow;
        Insert: Partial<NotificationRow> &
        Pick<NotificationRow, "recipient_id" | "actor_id" | "type" | "message">;
        Update: Partial<NotificationRow>;
      };
      profile_views: {
        Row: ProfileViewRow;
        Insert: Partial<ProfileViewRow> & Pick<ProfileViewRow, "viewer_id" | "viewed_profile_id">;
        Update: Partial<ProfileViewRow>;
      };
      media_assets: {
        Row: MediaAssetRow;
        Insert: Partial<MediaAssetRow> &
        Pick<
          MediaAssetRow,
          | "owner_id"
          | "usage"
          | "file_kind"
          | "original_name"
          | "stored_name"
          | "storage_path"
          | "public_url"
          | "mime_type"
          | "file_extension"
          | "original_size_bytes"
          | "stored_size_bytes"
        >;
        Update: Partial<MediaAssetRow>;
      };
      bugfix_questions: {
        Row: BugFixQuestionRow;
        Insert: Partial<BugFixQuestionRow> &
        Pick<
          BugFixQuestionRow,
          | "title"
          | "language"
          | "difficulty"
          | "prompt"
          | "broken_code"
          | "solution_code"
        >;
        Update: Partial<BugFixQuestionRow>;
      };
      student_resumes: {
        Row: StudentResumeRow;
        Insert: Partial<StudentResumeRow> &
        Pick<StudentResumeRow, "owner_id" | "title" | "template_key" | "content" | "share_slug">;
        Update: Partial<StudentResumeRow>;
      };
      student_portfolios: {
        Row: StudentPortfolioRow;
        Insert: Partial<StudentPortfolioRow> &
        Pick<StudentPortfolioRow, "owner_id" | "title" | "template_key" | "content" | "theme" | "share_slug">;
        Update: Partial<StudentPortfolioRow>;
      };
      student_whitebooks: {
        Row: StudentWhitebookRow;
        Insert: Partial<StudentWhitebookRow> &
        Pick<StudentWhitebookRow, "owner_id" | "title" | "snapshot" | "share_slug">;
        Update: Partial<StudentWhitebookRow>;
      };
      student_study_note_shares: {
        Row: StudentStudyNotesShareRow;
        Insert: Partial<StudentStudyNotesShareRow> &
        Pick<StudentStudyNotesShareRow, "owner_id" | "title" | "folder_name" | "snapshot" | "share_slug">;
        Update: Partial<StudentStudyNotesShareRow>;
      };
      qr_codes: {
        Row: QrCodeRow;
        Insert: Partial<QrCodeRow> &
        Pick<QrCodeRow, "owner_id" | "title" | "short_code" | "target_url" | "type">;
        Update: Partial<QrCodeRow>;
      };
      admin_roles: {
        Row: AdminRoleRow;
        Insert: Partial<AdminRoleRow> & Pick<AdminRoleRow, "user_id" | "role">;
        Update: Partial<AdminRoleRow>;
      };
      moderation_actions: {
        Row: ModerationActionRow;
        Insert: Partial<ModerationActionRow> &
        Pick<ModerationActionRow, "admin_id" | "action_type">;
        Update: Partial<ModerationActionRow>;
      };
    };
    Functions: {
      purchase_feature_access: {
        Args: {
          target_feature_key: string;
        };
        Returns: {
          transaction_id: string | null;
          charged_amount: number;
          balance_after: number;
          access_key: string;
          expires_at: string;
        }[];
      };
      consume_feature_coins_for_user: {
        Args: {
          target_user_id: string;
          target_feature_key: string;
          target_description?: string | null;
          target_reference_type?: string | null;
          target_reference_id?: string | null;
          target_metadata?: JsonMap | null;
          target_idempotency_key?: string | null;
        };
        Returns: {
          transaction_id: string | null;
          charged_amount: number;
          balance_after: number;
        }[];
      };
      refund_coin_transaction: {
        Args: {
          target_transaction_id: string;
          refund_description?: string | null;
          refund_metadata?: JsonMap | null;
        };
        Returns: {
          refund_transaction_id: string;
          balance_after: number;
        }[];
      };
      admin_adjust_user_coins: {
        Args: {
          target_user_id: string;
          amount_delta: number;
          adjustment_note?: string | null;
          adjustment_metadata?: JsonMap | null;
        };
        Returns: CoinTransactionRow;
      };
      approve_wallet_recharge_request: {
        Args: {
          target_request_id: string;
          admin_review_note?: string | null;
        };
        Returns: WalletRechargeRequestRow;
      };
      reject_wallet_recharge_request: {
        Args: {
          target_request_id: string;
          admin_review_note?: string | null;
        };
        Returns: WalletRechargeRequestRow;
      };
      review_verification_request: {
        Args: {
          target_request_id: string;
          next_status: VerificationRequestStatus;
          admin_review_note?: string | null;
        };
        Returns: VerificationRequestRow;
      };
      resolve_qr_code: {
        Args: {
          input_short_code: string;
        };
        Returns: {
          id: string;
          short_code: string;
          title: string;
          target_url: string;
          type: QrCodeType;
          scan_count: number;
        }[];
      };
      request_or_join_community: {
        Args: {
          p_community_id: string;
          p_password?: string | null;
        };
        Returns: Record<string, unknown>;
      };
      leave_community_membership: {
        Args: {
          p_community_id: string;
        };
        Returns: string;
      };
    };
  };
}
