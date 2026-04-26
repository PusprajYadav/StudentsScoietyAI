export type MentionReplyProviderMode = "saved_key" | "ollama";
export type MentionReplyAudience =
  | "everyone"
  | "followers"
  | "following"
  | "followers_and_following"
  | "no_one";
export type MentionReplyFallbackMode = "auto_reply" | "ignore";
export type MentionReplyAiSource = "context" | "rag";

export interface UserMentionReplyKeywordRule {
  id?: string | null;
  keyword: string;
  reply: string;
}

export interface UserMentionReplySettings {
  user_id: string;
  is_enabled: boolean;
  ai_provider_mode: MentionReplyProviderMode;
  ai_provider_key_id: string | null;
  ai_provider_model_name: string | null;
  ai_reply_scope: MentionReplyAudience;
  non_ai_reply_mode: MentionReplyFallbackMode;
  second_reply_behavior: MentionReplyFallbackMode;
  ai_reply_source: MentionReplyAiSource;
  auto_reply_message: string;
  keyword_rules: UserMentionReplyKeywordRule[];
  rag_knowledge_base: string;
  max_output_tokens: number;
  last_ai_error: string | null;
  last_ai_error_at: string | null;
  created_at: string | null;
  updated_at: string | null;
}
