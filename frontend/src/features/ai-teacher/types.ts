export type AiTeacherToolType =
  | "ask_question"
  | "notes"
  | "summary"
  | "quiz"
  | "mindmap"
  | "image_solver"
  | "practical_use";

export type AiTeacherTheme = "yellow" | "blue" | "pink" | "green";
export type AiTeacherRoutePriority = "cheap" | "fast" | "balanced" | "best";
export type AiTeacherProviderKeyScope = "platform" | "user";
export type AiTeacherProviderSlug = "litellm" | "workers_ai" | "mimo" | "ollama";
export type AiTeacherRouteToolType = "default" | AiTeacherToolType | "social_reply";

export interface AiTeacherChat {
  id: string;
  title: string;
  summary_text: string | null;
  last_tool_type: AiTeacherToolType | null;
  last_message_preview: string | null;
  source_file_url?: string | null;
  source_file_name?: string | null;
  source_mime_type?: string | null;
  source_context_summary?: string | null;
  message_count?: number;
  created_at: string;
  updated_at: string;
}

export interface AiTeacherStructuredBlock {
  type: string;
  title?: string;
  text?: string;
  items?: Array<string | { title?: string; text?: string }>;
  cards?: Array<{ front: string; back: string; accent?: string }>;
  questions?: Array<{
    question: string;
    options?: string[];
    answer?: string;
    answer_index?: number;
    explanation?: string;
  }>;
  nodes?: Array<{
    id: string;
    label: string;
    parent_id?: string | null;
    depth?: number;
  }>;
  url?: string;
  caption?: string;
}

export interface AiTeacherStructuredContent {
  title?: string;
  theme?: AiTeacherTheme;
  message?: string;
  graph_required?: boolean;
  graph_url?: string | null;
  graph_spec?: Record<string, unknown> | null;
  plain_text_fallback?: string;
  source_file_name?: string | null;
  source_mime_type?: string | null;
  source_context_summary?: string | null;
  source_kind?: string | null;
  blocks?: AiTeacherStructuredBlock[];
}

export interface AiTeacherMessage {
  id: string;
  chat_id: string;
  owner_id?: string;
  role: "user" | "assistant";
  tool_type: AiTeacherToolType;
  input_text: string | null;
  content: AiTeacherStructuredContent & Record<string, unknown>;
  file_url: string | null;
  graph_url: string | null;
  api_mode: "admin_api" | "user_api" | "local_ollama";
  provider_name: string | null;
  provider_key_label?: string | null;
  model_name?: string | null;
  route_id?: string | null;
  usage_log_id?: string | null;
  coin_cost: number;
  created_at: string;
}

export interface AiTeacherFolder {
  id: string;
  name: string;
  color_theme: AiTeacherTheme;
  item_count?: number;
  created_at: string;
  updated_at: string;
}

export interface AiTeacherSavedItem {
  id: string;
  folder_id: string | null;
  chat_id: string | null;
  message_id: string | null;
  title: string;
  tool_type: AiTeacherToolType;
  preview_text: string | null;
  structured_content: AiTeacherStructuredContent;
  folder_name?: string | null;
  folder_color_theme?: AiTeacherTheme | null;
  created_at: string;
}

export interface AiTeacherWalletCharge {
  feature_key: string;
  api_mode: "admin_api" | "user_api";
  coins_charged: number;
  balance_after: number;
}

export interface AiTeacherUsage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  total_cost_usd: number;
  latency_ms: number;
}

export interface AiTeacherChatTurn {
  chat: AiTeacherChat;
  user_message: AiTeacherMessage;
  assistant_message: AiTeacherMessage;
  wallet: AiTeacherWalletCharge;
  usage?: AiTeacherUsage;
}

export interface AiTeacherProviderKey {
  id: string;
  owner_scope?: AiTeacherProviderKeyScope;
  owner_id?: string | null;
  provider_slug?: AiTeacherProviderSlug;
  adapter_kind?: AiTeacherProviderSlug;
  label: string;
  provider: string;
  default_model_name?: string | null;
  api_base?: string | null;
  api_version?: string | null;
  masked_key: string;
  extra_headers?: Record<string, string>;
  extra_config?: Record<string, unknown>;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface AiTeacherModelRoute {
  id: string;
  provider_key_id?: string | null;
  provider_slug?: AiTeacherProviderSlug;
  adapter_kind?: AiTeacherProviderSlug;
  label: string;
  description?: string | null;
  tool_type: AiTeacherRouteToolType;
  priority: AiTeacherRoutePriority;
  provider: string;
  model_name: string;
  temperature?: number | null;
  max_output_tokens?: number | null;
  sort_order?: number | null;
  supports_vision: boolean;
  is_enabled?: boolean;
  route_config?: Record<string, unknown>;
  fallback_to_litellm?: boolean;
  provider_key_label?: string | null;
  provider_label?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface AiTeacherProviderConfigItem {
  id: string;
  slug: AiTeacherProviderSlug;
  label: string;
  adapter_kind: AiTeacherProviderSlug;
  provider_type: "default" | "custom" | "local";
  description?: string | null;
  is_enabled: boolean;
  supports_text: boolean;
  supports_vision: boolean;
  supports_model_management: boolean;
  requires_api_key: boolean;
  config: Record<string, unknown>;
  created_at?: string;
  updated_at?: string;
}

export interface AiTeacherOllamaModel {
  name: string;
  digest?: string;
  size_bytes?: number;
  modified_at?: string | null;
  family?: string;
  parameter_size?: string;
  quantization_level?: string;
  status?: string;
}

export interface AiTeacherSettingsPayload {
  providers: AiTeacherProviderConfigItem[];
  platform_routes: AiTeacherModelRoute[];
  user_keys: AiTeacherProviderKey[];
  coin_pricing?: {
    platform_message_coins: number;
    user_key_message_coins: number;
  };
  availability?: {
    is_enabled: boolean;
    platform_mode_enabled: boolean;
    user_mode_enabled: boolean;
    unavailable_message: string;
  };
}

export interface AiTeacherAdminConfigPayload {
  providers: AiTeacherProviderConfigItem[];
  platform_keys: AiTeacherProviderKey[];
  model_routes: AiTeacherModelRoute[];
  ollama_models: AiTeacherOllamaModel[];
  usage_summary: {
    total_requests: number;
    total_tokens: number;
    total_cost_usd: number;
  };
}
