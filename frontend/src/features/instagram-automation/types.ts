import type {
  InstagramAccountRow,
  InstagramAutomationLogRow,
  InstagramCommentDmRuleRow,
  InstagramCommentRuleRow,
  InstagramDmRuleRow,
} from "../../types/database";

export interface InstagramMediaItem {
  id: string;
  caption?: string | null;
  media_type?: string | null;
  media_product_type?: string | null;
  permalink?: string | null;
  media_url?: string | null;
  thumbnail_url?: string | null;
  timestamp?: string | null;
}

export type InstagramAccountSummary = Omit<InstagramAccountRow, "access_token_encrypted" | "access_token_iv">;

export interface InstagramAnalyticsSummary {
  total_actions: number;
  successful_actions: number;
  failed_actions: number;
  skipped_actions?: number;
  partial_actions?: number;
  comment_replies: number;
  dm_replies: number;
  comment_to_dm: number;
  success_rate: number;
  daily_actions: Array<{ date: string; label: string; count: number }>;
}

export interface InstagramRecentComment {
  id: string;
  ig_media_id?: string | null;
  ig_comment_id?: string | null;
  commenter_username?: string | null;
  commenter_ig_user_id?: string | null;
  comment_text: string;
  commented_at?: string | null;
}

export interface InstagramDashboardData {
  account: InstagramAccountSummary | null;
  comment_rules: InstagramCommentRuleRow[];
  dm_rules: InstagramDmRuleRow[];
  comment_dm_rules: InstagramCommentDmRuleRow[];
  logs: InstagramAutomationLogRow[];
  analytics: InstagramAnalyticsSummary;
  media: InstagramMediaItem[];
  recent_comments: InstagramRecentComment[];
  media_error: string | null;
}

export interface InstagramCommentRuleDraft {
  id?: string;
  instagram_account_id?: string | null;
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
}

export interface InstagramDmRuleDraft {
  id?: string;
  instagram_account_id?: string | null;
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
}

export interface InstagramCommentDmRuleDraft {
  id?: string;
  instagram_account_id?: string | null;
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
}

export type InstagramAutomationTab =
  | "overview"
  | "comment-replies"
  | "dm-replies"
  | "comment-to-dm"
  | "activity";
