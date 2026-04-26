import { AlertTriangle, Bot, KeyRound, Loader2, Pencil, Plus, Save, Sparkles, Trash2, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { deleteAiTeacherProviderKey, getAiTeacherSettings, saveAiTeacherProviderKey } from "../ai-teacher/api";
import type {
  AiTeacherModelRoute,
  AiTeacherProviderKey,
  AiTeacherProviderSlug,
  AiTeacherSettingsPayload,
} from "../ai-teacher/types";
import { loadUserMentionReplySettings, saveUserMentionReplySettings } from "./aiReplyApi";
import type {
  MentionReplyAiSource,
  MentionReplyAudience,
  MentionReplyFallbackMode,
  UserMentionReplyKeywordRule,
  UserMentionReplySettings,
} from "./aiReplyTypes";

const EMPTY_AI_SETTINGS: AiTeacherSettingsPayload = {
  providers: [],
  platform_routes: [],
  user_keys: [],
  coin_pricing: {
    platform_message_coins: 0,
    user_key_message_coins: 0,
  },
  availability: {
    is_enabled: true,
    platform_mode_enabled: true,
    user_mode_enabled: true,
    unavailable_message: "",
  },
};

const DEFAULT_PROVIDER_BY_SLUG: Record<AiTeacherProviderSlug, string> = {
  litellm: "openai",
  workers_ai: "workers-ai",
  mimo: "mimo",
  ollama: "ollama",
};

const PROVIDER_NAME_OPTIONS_BY_SLUG: Record<AiTeacherProviderSlug, string[]> = {
  litellm: [
    "openai",
    "anthropic",
    "google",
    "moonshot",
    "xai",
    "groq",
    "mistral",
    "cohere",
    "deepseek",
    "perplexity",
    "openrouter",
    "azure",
    "together_ai",
    "fireworks_ai",
    "bedrock",
    "vertex_ai",
  ],
  workers_ai: ["workers-ai", "cloudflare"],
  mimo: ["mimo"],
  ollama: ["ollama"],
};

const AUDIENCE_OPTIONS: Array<{ value: MentionReplyAudience; label: string }> = [
  { value: "everyone", label: "AI for all" },
  { value: "followers", label: "Followers AI" },
  { value: "following", label: "Following AI" },
  { value: "followers_and_following", label: "Follow graph AI" },
  { value: "no_one", label: "Auto only" },
];

const FALLBACK_OPTIONS: Array<{ value: MentionReplyFallbackMode; label: string }> = [
  { value: "auto_reply", label: "Auto reply" },
  { value: "ignore", label: "Ignore" },
];

const AI_SOURCE_OPTIONS: Array<{ value: MentionReplyAiSource; label: string }> = [
  { value: "context", label: "Context" },
  { value: "rag", label: "RAG" },
];

const AUDIENCE_DESCRIPTIONS: Record<MentionReplyAudience, string> = {
  everyone: "Anyone who tags you gets an AI reply first.",
  followers: "Only users who follow you get AI replies.",
  following: "Only users you follow get AI replies.",
  followers_and_following: "Either direction in the follow graph can get AI replies.",
  no_one: "AI is off for mentions. Fallback rules decide what happens.",
};

const FALLBACK_DESCRIPTIONS: Record<MentionReplyFallbackMode, string> = {
  auto_reply:
    "Check keyword rules against the tagged post/comment context, then fall back to your saved auto reply. This also covers API or model failures on the first AI reply.",
  ignore: "Do not send anything.",
};

function createKeywordRule(): UserMentionReplyKeywordRule {
  return {
    id:
      typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : `rule-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    keyword: "",
    reply: "",
  };
}

function hasMeaningfulReplyConfiguration(settings: UserMentionReplySettings) {
  const hasKeywordRules = settings.keyword_rules.some(
    (rule) => rule.keyword.trim() && rule.reply.trim()
  );
  const hasAutoReplyMessage = settings.auto_reply_message.trim().length > 0;
  const aiEnabled = settings.ai_reply_scope !== "no_one";
  const autoReplyEnabled =
    settings.non_ai_reply_mode === "auto_reply" && hasAutoReplyMessage;
  const secondAutoReplyEnabled =
    settings.second_reply_behavior === "auto_reply" && hasAutoReplyMessage;

  return aiEnabled || autoReplyEnabled || secondAutoReplyEnabled || hasKeywordRules;
}

function segmentedTone(active: boolean) {
  return active
    ? "border-brand bg-brand text-white shadow-[0_14px_28px_-22px_rgba(37,99,235,0.65)]"
    : "border-app-border bg-app-card text-app-text hover:border-brand/25 hover:bg-app-secondary";
}

function createKeyForm(providerSlug: AiTeacherProviderSlug) {
  return {
    providerSlug,
    label: "",
    provider: DEFAULT_PROVIDER_BY_SLUG[providerSlug],
    defaultModelName: "",
    apiKey: "",
    apiBase: "",
    apiVersion: "",
  };
}

function createKeyFormFromSavedKey(savedKey: AiTeacherProviderKey) {
  const providerSlug = (savedKey.provider_slug || "litellm") as AiTeacherProviderSlug;
  return {
    ...createKeyForm(providerSlug),
    label: savedKey.label || "",
    provider: savedKey.provider || DEFAULT_PROVIDER_BY_SLUG[providerSlug],
    defaultModelName: savedKey.default_model_name || "",
    apiBase: savedKey.api_base || "",
    apiVersion: savedKey.api_version || "",
    apiKey: "",
  };
}

function findInheritedRouteForSavedKey(
  savedKey: AiTeacherProviderKey | null | undefined,
  routes: AiTeacherModelRoute[]
) {
  if (!savedKey) {
    return null;
  }

  const providerSlug = String(savedKey.provider_slug || "litellm").trim().toLowerCase();
  const providerName = String(savedKey.provider || "").trim().toLowerCase();
  const candidates = routes
    .filter((route) => {
      const routeSlug = String(route.provider_slug || "").trim().toLowerCase();
      if (routeSlug !== providerSlug) {
        return false;
      }

      return route.tool_type === "social_reply" || route.tool_type === "default";
    })
    .sort((left, right) => {
      const leftProvider = String(left.provider || "").trim().toLowerCase();
      const rightProvider = String(right.provider || "").trim().toLowerCase();
      const leftProviderRank = providerName ? (leftProvider === providerName ? 0 : 1) : 0;
      const rightProviderRank = providerName ? (rightProvider === providerName ? 0 : 1) : 0;
      if (leftProviderRank !== rightProviderRank) {
        return leftProviderRank - rightProviderRank;
      }

      const leftToolRank = left.tool_type === "social_reply" ? 0 : 1;
      const rightToolRank = right.tool_type === "social_reply" ? 0 : 1;
      if (leftToolRank !== rightToolRank) {
        return leftToolRank - rightToolRank;
      }

      return (left.sort_order ?? 100) - (right.sort_order ?? 100);
    });

  return candidates[0] || null;
}

function describeFirstReplyFlow(settings: UserMentionReplySettings) {
  if (settings.ai_reply_scope === "no_one") {
    return settings.non_ai_reply_mode === "auto_reply"
      ? {
          title: "Context-aware auto reply",
          description:
            "First tags skip AI and use keyword rules plus your saved fallback message against the tagged post and comment context.",
        }
      : {
          title: "No first reply",
          description:
            "First tags are ignored because AI is off for everyone and the fallback rule is set to ignore.",
        };
  }

  return settings.ai_reply_source === "rag"
    ? {
        title: "AI reply with RAG",
        description:
          "The first allowed tag gets an AI-generated reply using the tagged post/comment context plus your saved RAG notes.",
      }
    : {
        title: "AI reply with context",
        description:
          "The first allowed tag gets an AI-generated reply using only the tagged post and comment context.",
      };
}

function describeSecondReplyFlow(settings: UserMentionReplySettings) {
  if (settings.second_reply_behavior !== "auto_reply") {
    return {
      title: "Ignore second tags",
      description: "After the first reply is sent, repeated tags on the same post are ignored.",
    };
  }

  return settings.keyword_rules.length
    ? {
        title: "Auto reply with context",
        description:
          "A second tag uses keyword rules matched against the tagged post/comment context, then falls back to your saved message.",
      }
    : {
        title: "Auto reply with context",
        description:
          "A second tag sends your saved auto reply. Add keyword rules if you want context-based second replies by topic.",
      };
}

function normalizeSettingsForSave(settings: UserMentionReplySettings) {
  return !settings.is_enabled && hasMeaningfulReplyConfiguration(settings)
    ? { ...settings, is_enabled: true }
    : settings;
}

function buildSettingsSaveInput(settings: UserMentionReplySettings) {
  const normalizedSettings = normalizeSettingsForSave(settings);

  return {
    is_enabled: normalizedSettings.is_enabled,
    ai_provider_mode: normalizedSettings.ai_provider_mode,
    ai_provider_key_id: normalizedSettings.ai_provider_key_id,
    ai_provider_model_name: normalizedSettings.ai_provider_model_name,
    ai_reply_scope: normalizedSettings.ai_reply_scope,
    non_ai_reply_mode: normalizedSettings.non_ai_reply_mode,
    second_reply_behavior: normalizedSettings.second_reply_behavior,
    ai_reply_source: normalizedSettings.ai_reply_source,
    auto_reply_message: normalizedSettings.auto_reply_message,
    keyword_rules: normalizedSettings.keyword_rules
      .map((rule) => ({
        id: rule.id || undefined,
        keyword: rule.keyword.trim(),
        reply: rule.reply.trim(),
      }))
      .filter((rule) => rule.keyword && rule.reply),
    rag_knowledge_base: normalizedSettings.rag_knowledge_base,
    max_output_tokens: normalizedSettings.max_output_tokens,
  };
}

export function AiReplySettingsSection() {
  const [settings, setSettings] = useState<UserMentionReplySettings | null>(null);
  const [aiSettings, setAiSettings] = useState<AiTeacherSettingsPayload>(EMPTY_AI_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingKey, setSavingKey] = useState(false);
  const [deletingKeyId, setDeletingKeyId] = useState<string | null>(null);
  const [editingKeyId, setEditingKeyId] = useState<string | null>(null);
  const [keyForm, setKeyForm] = useState(() => createKeyForm("litellm"));

  const availableKeyProviders = useMemo(
    () => aiSettings.providers.filter((item) => item.requires_api_key),
    [aiSettings.providers]
  );
  const visibleProviders = useMemo(
    () => aiSettings.providers.filter((item) => item.is_enabled),
    [aiSettings.providers]
  );
  const ollamaEnabled = useMemo(
    () => aiSettings.providers.some((item) => item.slug === "ollama"),
    [aiSettings.providers]
  );
  const selectedKey = useMemo(
    () => aiSettings.user_keys.find((item) => item.id === settings?.ai_provider_key_id) || null,
    [aiSettings.user_keys, settings?.ai_provider_key_id]
  );
  const editingKey = useMemo(
    () => aiSettings.user_keys.find((item) => item.id === editingKeyId) || null,
    [aiSettings.user_keys, editingKeyId]
  );
  const selectedKeyInheritedRoute = useMemo(
    () => findInheritedRouteForSavedKey(selectedKey, aiSettings.platform_routes),
    [aiSettings.platform_routes, selectedKey]
  );
  const editingKeyInheritedRoute = useMemo(
    () => findInheritedRouteForSavedKey(editingKey, aiSettings.platform_routes),
    [aiSettings.platform_routes, editingKey]
  );
  const selectedKeyEffectiveModel = selectedKey?.default_model_name || selectedKeyInheritedRoute?.model_name || "";
  const providerNameOptions = useMemo(() => {
    const defaults = PROVIDER_NAME_OPTIONS_BY_SLUG[keyForm.providerSlug] || [];
    const fromSavedKeys = aiSettings.user_keys
      .map((item) => String(item.provider || "").trim())
      .filter(Boolean);

    return Array.from(new Set([...defaults, ...fromSavedKeys]));
  }, [aiSettings.user_keys, keyForm.providerSlug]);
  const replyFlowSummary = useMemo(() => {
    if (!settings) {
      return null;
    }

    return {
      first: describeFirstReplyFlow(settings),
      second: describeSecondReplyFlow(settings),
    };
  }, [settings]);

  useEffect(() => {
    if (editingKeyId && !editingKey) {
      setEditingKeyId(null);
      const firstProvider = (aiSettings.providers.find((item) => item.requires_api_key)?.slug || "litellm") as AiTeacherProviderSlug;
      setKeyForm(createKeyForm(firstProvider));
    }
  }, [aiSettings.providers, editingKey, editingKeyId]);

  useEffect(() => {
    let active = true;

    const load = async () => {
      setLoading(true);
      try {
        const [replySettings, teacherSettings] = await Promise.all([
          loadUserMentionReplySettings(),
          getAiTeacherSettings(),
        ]);
        if (!active) {
          return;
        }
        setSettings(replySettings);
        setAiSettings(teacherSettings);
        const firstProvider = (teacherSettings.providers.find((item) => item.requires_api_key)?.slug || "litellm") as AiTeacherProviderSlug;
        setKeyForm(createKeyForm(firstProvider));
      } catch (error) {
        if (!active) {
          return;
        }
        toast.error(error instanceof Error ? error.message : "Could not load AI reply settings.");
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    void load();

    return () => {
      active = false;
    };
  }, []);

  const updateSettings = (updates: Partial<UserMentionReplySettings>) => {
    setSettings((current) => {
      if (!current) {
        return current;
      }

      const nextSettings = { ...current, ...updates };
      const changedEnabledState = Object.prototype.hasOwnProperty.call(updates, "is_enabled");

      if (!changedEnabledState && !nextSettings.is_enabled && hasMeaningfulReplyConfiguration(nextSettings)) {
        nextSettings.is_enabled = true;
      }

      return nextSettings;
    });
  };

  const refreshAiSettings = async () => {
    const payload = await getAiTeacherSettings();
    setAiSettings(payload);
    return payload;
  };

  const persistSettingsSnapshot = async (
    snapshot: UserMentionReplySettings,
    options: { successMessage?: string | null } = {}
  ) => {
    const payload = await saveUserMentionReplySettings(buildSettingsSaveInput(snapshot));
    setSettings(payload);
    if (options.successMessage) {
      toast.success(options.successMessage);
    }
    return payload;
  };

  const handleSaveSettings = async () => {
    if (!settings) {
      return;
    }

    setSaving(true);
    try {
      await persistSettingsSnapshot(settings, { successMessage: "AI reply settings updated." });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save AI reply settings.");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveKey = async () => {
    if (!editingKeyId && !keyForm.apiKey.trim()) {
      toast.error("Enter the API key first.");
      return;
    }

    setSavingKey(true);
    try {
      const savedKey = await saveAiTeacherProviderKey({
        id: editingKeyId || undefined,
        scope: "user",
        provider_slug: keyForm.providerSlug,
        label: keyForm.label.trim() || `${keyForm.provider.trim() || keyForm.providerSlug} key`,
        provider: keyForm.provider.trim() || DEFAULT_PROVIDER_BY_SLUG[keyForm.providerSlug],
        api_key: keyForm.apiKey.trim() || null,
        default_model_name: keyForm.defaultModelName.trim() || null,
        api_base: keyForm.apiBase.trim() || null,
        api_version: keyForm.apiVersion.trim() || null,
        is_active: true,
      });
      const payload = await refreshAiSettings();
      if (editingKeyId) {
        if (settings?.ai_provider_key_id === savedKey.id) {
          setSettings((current) => (current ? { ...current, ai_provider_mode: "saved_key" } : current));
        }
        toast.success("Saved API key updated.");
      } else {
        const nextSettings = settings
          ? {
              ...settings,
              ai_provider_mode: "saved_key" as const,
              ai_provider_key_id: savedKey.id,
            }
          : null;
        if (nextSettings) {
          await persistSettingsSnapshot(nextSettings, {
            successMessage: "API key saved and connected to mention replies.",
          });
        }
      }
      const firstProvider = (payload.providers.find((item) => item.requires_api_key)?.slug || "litellm") as AiTeacherProviderSlug;
      setKeyForm(createKeyForm(firstProvider));
      setEditingKeyId(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save the API key.");
    } finally {
      setSavingKey(false);
    }
  };

  const handleSavedKeySelection = async (nextKeyId: string) => {
    if (!settings) {
      return;
    }

    const nextSettings = {
      ...settings,
      ai_provider_mode: "saved_key" as const,
      ai_provider_key_id: nextKeyId || null,
    };
    setEditingKeyId(null);
    setSettings(nextSettings);

    if (!nextKeyId) {
      return;
    }

    try {
      await persistSettingsSnapshot(nextSettings, {
        successMessage: "Mention reply connection updated.",
      });
    } catch (error) {
      setSettings(settings);
      toast.error(error instanceof Error ? error.message : "Could not switch the saved API key.");
    }
  };

  const handleDeleteKey = async (keyId: string) => {
    setDeletingKeyId(keyId);
    try {
      await deleteAiTeacherProviderKey(keyId);
      if (editingKeyId === keyId) {
        setEditingKeyId(null);
      }
      const payload = await refreshAiSettings();
      if (!settings || settings.ai_provider_key_id !== keyId) {
        toast.success("Saved API key removed.");
        return;
      }

      const replacementKeyId = payload.user_keys[0]?.id || null;
      const nextSettings = {
        ...settings,
        ai_provider_key_id: replacementKeyId,
      };

      if (replacementKeyId) {
        await persistSettingsSnapshot(nextSettings, {
          successMessage: "Saved API key removed and mention replies switched to the next key.",
        });
      } else {
        setSettings(nextSettings);
        toast.success("Saved API key removed. Choose another key or switch to Ollama before using AI replies.");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not remove the API key.");
    } finally {
      setDeletingKeyId(null);
    }
  };

  const handleStartEditKey = (key: AiTeacherProviderKey) => {
    setEditingKeyId(key.id);
    setKeyForm(createKeyFormFromSavedKey(key));
  };

  const handleCancelEditKey = () => {
    setEditingKeyId(null);
    const firstProvider = (aiSettings.providers.find((item) => item.requires_api_key)?.slug || "litellm") as AiTeacherProviderSlug;
    setKeyForm(createKeyForm(firstProvider));
  };

  if (loading || !settings) {
    return (
      <div className="rounded-[24px] border border-app-border bg-app-card p-5 text-sm text-app-muted">
        <div className="flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading AI reply settings...
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="rounded-[24px] border border-app-border bg-app-card p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-[16px] bg-brand/10 text-brand">
                <Bot className="h-4 w-4" />
              </span>
              <div>
                <p className="text-sm font-semibold text-app-text">Mention replies</p>
                <p className="text-xs text-app-muted">
                  Reply automatically when someone tags your username in a post or comment.
                  Auto only mode works without any API key.
                </p>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => updateSettings({ is_enabled: !settings.is_enabled })}
            className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 text-sm font-semibold transition ${
              settings.is_enabled
                ? "border-brand bg-brand text-white"
                : "border-app-border bg-app-secondary text-app-text"
            }`}
          >
            <Sparkles className="h-4 w-4" />
            {settings.is_enabled ? "Enabled" : "Disabled"}
          </button>
        </div>
        <p className="mt-3 text-xs text-app-muted">
          Keep this on for any AI reply or auto reply rule below to run.
        </p>
      </div>

      <div className="rounded-[24px] border border-app-border bg-app-card p-4 sm:p-5">
        <div className="flex items-center gap-2">
          <KeyRound className="h-4 w-4 text-brand" />
          <p className="text-sm font-semibold text-app-text">Connection</p>
        </div>

        {settings.last_ai_error ? (
          <div className="mt-4 rounded-[18px] border border-amber-200 bg-amber-50/90 px-4 py-3 text-sm text-amber-900">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />
              <div className="min-w-0 flex-1">
                <p className="font-semibold">Last AI error</p>
                <p className="mt-1 text-xs leading-5 text-amber-800">{settings.last_ai_error}</p>
                {settings.last_ai_error_at ? (
                  <p className="mt-1 text-[11px] text-amber-700">
                    {new Date(settings.last_ai_error_at).toLocaleString()}
                  </p>
                ) : null}
              </div>
              {selectedKey ? (
                <button
                  type="button"
                  onClick={() => handleStartEditKey(selectedKey)}
                  className="inline-flex items-center gap-1 rounded-full border border-amber-300 bg-white/80 px-3 py-1.5 text-xs font-semibold text-amber-900 transition hover:bg-white"
                >
                  <Pencil className="h-3.5 w-3.5" />
                  Edit key
                </button>
              ) : null}
            </div>
          </div>
        ) : null}

        <div className="mt-3 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => updateSettings({ ai_provider_mode: "saved_key" })}
            className={`rounded-[16px] border px-3 py-2.5 text-sm font-semibold transition ${segmentedTone(
              settings.ai_provider_mode === "saved_key"
            )}`}
          >
            Saved API key
          </button>
          <button
            type="button"
            onClick={() => updateSettings({ ai_provider_mode: "ollama" })}
            className={`rounded-[16px] border px-3 py-2.5 text-sm font-semibold transition ${segmentedTone(
              settings.ai_provider_mode === "ollama"
            )}`}
          >
            Ollama
          </button>
        </div>

        <div className="mt-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-app-muted">
              Available providers
            </p>
            <p className="text-xs text-app-muted">
              {visibleProviders.length} enabled
            </p>
          </div>

          <div className="mt-2 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
            {visibleProviders.map((provider) => {
              const isSelectedSavedKey =
                settings.ai_provider_mode === "saved_key" &&
                availableKeyProviders.some((item) => item.slug === provider.slug) &&
                keyForm.providerSlug === provider.slug;
              const isSelectedOllama =
                settings.ai_provider_mode === "ollama" && provider.slug === "ollama";
              const isSelected = isSelectedSavedKey || isSelectedOllama;

              return (
                <button
                  key={provider.id}
                  type="button"
                  onClick={() => {
                    if (provider.slug === "ollama") {
                      updateSettings({ ai_provider_mode: "ollama" });
                      return;
                    }

                    if (provider.requires_api_key) {
                      updateSettings({ ai_provider_mode: "saved_key" });
                      setKeyForm((current) => ({
                        ...createKeyForm(provider.slug as AiTeacherProviderSlug),
                        label: current.label,
                        apiBase: current.apiBase,
                        apiVersion: current.apiVersion,
                        apiKey: current.apiKey,
                        defaultModelName: current.defaultModelName,
                      }));
                    }
                  }}
                  className={`rounded-[18px] border px-3 py-3 text-left transition ${
                    isSelected
                      ? "border-brand bg-brand/10 shadow-[0_16px_28px_-24px_rgba(37,99,235,0.38)]"
                      : "border-app-border bg-app-secondary/45 hover:border-brand/25 hover:bg-app-secondary"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-app-text">{provider.label}</p>
                      <p className="mt-1 text-xs text-app-muted">
                        {provider.provider_type === "local"
                          ? "Local"
                          : provider.requires_api_key
                            ? "API key"
                            : "Managed"}
                      </p>
                    </div>
                    <span
                      className={`rounded-full px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] ${
                        provider.supports_vision
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-app-card text-app-muted"
                      }`}
                    >
                      {provider.supports_vision ? "Vision" : "Text"}
                    </span>
                  </div>

                  <p className="mt-2 line-clamp-2 text-xs leading-5 text-app-muted">
                    {provider.description || "Available for AI replies in your account settings."}
                  </p>
                </button>
              );
            })}
          </div>
        </div>

        {settings.ai_provider_mode === "saved_key" ? (
          <div className="mt-4 space-y-3">
            <label className="grid gap-1.5">
              <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-app-muted">Saved key</span>
              <select
                value={settings.ai_provider_key_id || ""}
                onChange={(event) => {
                  void handleSavedKeySelection(event.target.value);
                }}
                className="input-shell h-11"
              >
                <option value="">Select key</option>
                {aiSettings.user_keys.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.label} · {item.provider} ·{" "}
                    {item.default_model_name || findInheritedRouteForSavedKey(item, aiSettings.platform_routes)?.model_name || "No model"}
                  </option>
                ))}
              </select>
            </label>

            {selectedKey ? (
              <div className="rounded-[18px] border border-app-border bg-app-secondary px-3 py-3 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-app-text">{selectedKey.label}</p>
                    <p className="truncate text-xs text-app-muted">
                      {selectedKey.provider} · {selectedKeyEffectiveModel || "No model"} · {selectedKey.masked_key}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleStartEditKey(selectedKey)}
                      className="inline-flex items-center gap-2 rounded-full border border-app-border bg-app-card px-3 py-1.5 text-xs font-semibold text-app-text transition hover:border-brand/25 hover:text-brand"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleDeleteKey(selectedKey.id)}
                      disabled={deletingKeyId === selectedKey.id}
                      className="inline-flex items-center gap-2 rounded-full border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {deletingKeyId === selectedKey.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                      Remove
                    </button>
                  </div>
                </div>

                {!selectedKey.default_model_name && selectedKeyInheritedRoute ? (
                  <div className="mt-3 rounded-[16px] border border-brand/15 bg-brand/5 px-3 py-2 text-xs text-app-text">
                    <p className="font-semibold">Model inherited from admin route</p>
                    <p className="mt-1 text-app-muted">
                      {selectedKeyInheritedRoute.label} · {selectedKeyInheritedRoute.model_name}
                    </p>
                  </div>
                ) : null}

                {!selectedKey.default_model_name && !selectedKeyInheritedRoute ? (
                  <div className="mt-3 rounded-[16px] border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                    <p className="font-semibold">This key still needs a model path</p>
                    <p className="mt-1 text-amber-800">
                      Add a default model here, or ask admin to enable a matching Social Reply or default route for this provider.
                    </p>
                  </div>
                ) : null}
              </div>
            ) : null}

            <div className="rounded-[20px] border border-app-border bg-app-secondary/60 p-3 sm:p-4">
              {editingKey ? (
                <div className="mb-3 flex items-center justify-between gap-3 rounded-[16px] border border-brand/15 bg-brand/5 px-3 py-2 text-xs text-app-text">
                  <div className="min-w-0">
                    <p className="font-semibold">Editing saved key</p>
                    <p className="truncate text-app-muted">
                      {editingKey.label} · {editingKey.provider} ·{" "}
                      {editingKey.default_model_name || editingKeyInheritedRoute?.model_name || "No model"}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleCancelEditKey}
                    className="inline-flex items-center gap-1 rounded-full border border-app-border bg-app-card px-3 py-1.5 text-xs font-semibold text-app-text transition hover:border-brand/25 hover:text-brand"
                  >
                    <X className="h-3.5 w-3.5" />
                    Cancel
                  </button>
                </div>
              ) : null}

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="grid gap-1.5">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-app-muted">Provider</span>
                  <select
                    value={keyForm.providerSlug}
                    onChange={(event) => {
                      const nextSlug = event.target.value as AiTeacherProviderSlug;
                      setKeyForm((current) => ({
                        ...createKeyForm(nextSlug),
                        label: current.label,
                        apiBase: current.apiBase,
                        apiVersion: current.apiVersion,
                      }));
                    }}
                    className="input-shell h-11"
                  >
                    {availableKeyProviders.map((item) => (
                      <option key={item.slug} value={item.slug}>
                        {item.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="grid gap-1.5">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-app-muted">Label</span>
                  <input
                    value={keyForm.label}
                    onChange={(event) => setKeyForm((current) => ({ ...current, label: event.target.value }))}
                    placeholder="My reply key"
                    className="input-shell h-11"
                  />
                </label>

                <label className="grid gap-1.5">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-app-muted">Provider name</span>
                  <input
                    value={keyForm.provider}
                    onChange={(event) => setKeyForm((current) => ({ ...current, provider: event.target.value }))}
                    placeholder="openai"
                    list="mention-provider-name-options"
                    className="input-shell h-11"
                  />
                  <datalist id="mention-provider-name-options">
                    {providerNameOptions.map((name) => (
                      <option key={name} value={name} />
                    ))}
                  </datalist>
                </label>

                <label className="grid gap-1.5">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-app-muted">
                    Default model (optional)
                  </span>
                  <input
                    value={keyForm.defaultModelName}
                    onChange={(event) => setKeyForm((current) => ({ ...current, defaultModelName: event.target.value }))}
                    placeholder="Leave blank to inherit from admin route"
                    className="input-shell h-11"
                  />
                  <p className="text-[11px] leading-5 text-app-muted">
                    If blank, this key will use the enabled Social Reply or default route for the same provider when available.
                  </p>
                </label>

                <label className="grid gap-1.5 sm:col-span-2">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-app-muted">API key</span>
                  <input
                    value={keyForm.apiKey}
                    onChange={(event) => setKeyForm((current) => ({ ...current, apiKey: event.target.value }))}
                    placeholder={editingKey ? "Leave blank to keep the current secret key" : "sk-..."}
                    className="input-shell h-11"
                  />
                </label>

                <label className="grid gap-1.5">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-app-muted">API base</span>
                  <input
                    value={keyForm.apiBase}
                    onChange={(event) => setKeyForm((current) => ({ ...current, apiBase: event.target.value }))}
                    placeholder="Optional"
                    className="input-shell h-11"
                  />
                </label>

                <label className="grid gap-1.5">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-app-muted">API version</span>
                  <input
                    value={keyForm.apiVersion}
                    onChange={(event) => setKeyForm((current) => ({ ...current, apiVersion: event.target.value }))}
                    placeholder="Optional"
                    className="input-shell h-11"
                  />
                </label>
              </div>

              {providerNameOptions.length ? (
                <div className="mt-3 rounded-[16px] border border-app-border bg-app-card/80 px-3 py-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-app-muted">
                    LLM/API provider list
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {providerNameOptions.map((providerName) => (
                      <button
                        key={providerName}
                        type="button"
                        onClick={() => setKeyForm((current) => ({ ...current, provider: providerName }))}
                        className={`rounded-full border px-2.5 py-1 text-xs font-semibold transition ${
                          keyForm.provider.trim().toLowerCase() === providerName.toLowerCase()
                            ? "border-brand bg-brand/10 text-brand"
                            : "border-app-border bg-app-secondary text-app-text hover:border-brand/25 hover:text-brand"
                        }`}
                      >
                        {providerName}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}

              <button
                type="button"
                onClick={() => void handleSaveKey()}
                disabled={savingKey || !availableKeyProviders.length}
                className="mt-3 inline-flex items-center gap-2 rounded-full border border-app-border bg-app-card px-4 py-2 text-sm font-semibold text-app-text transition hover:border-brand/25 hover:text-brand disabled:cursor-not-allowed disabled:opacity-60"
              >
                {savingKey ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                {editingKey ? "Update key" : "Save key"}
              </button>
            </div>
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            <div className="rounded-[18px] border border-app-border bg-app-secondary px-3 py-3 text-xs text-app-muted">
              {ollamaEnabled ? "Server Ollama is enabled by admin." : "Ollama is currently disabled by admin."}
            </div>
            <label className="grid gap-1.5">
              <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-app-muted">Ollama model</span>
              <input
                value={settings.ai_provider_model_name || ""}
                onChange={(event) => updateSettings({ ai_provider_model_name: event.target.value })}
                placeholder="llama3.2:3b"
                className="input-shell h-11"
                disabled={!ollamaEnabled}
              />
            </label>
          </div>
        )}
      </div>

      <div className="rounded-[24px] border border-app-border bg-app-card p-4 sm:p-5">
        <div className="space-y-1">
          <p className="text-sm font-semibold text-app-text">Reply rules</p>
          <p className="text-xs text-app-muted">
            If the tag is inside a comment, your reply appears as a threaded reply to that exact comment.
          </p>
        </div>

        <div className="mt-3 grid gap-3">
          {replyFlowSummary ? (
            <div className="grid gap-3 lg:grid-cols-2">
              <div className="rounded-[20px] border border-app-border bg-app-secondary/45 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-app-muted">First tag</p>
                <p className="mt-2 text-sm font-semibold text-app-text">{replyFlowSummary.first.title}</p>
                <p className="mt-1 text-xs leading-5 text-app-muted">{replyFlowSummary.first.description}</p>
              </div>
              <div className="rounded-[20px] border border-app-border bg-app-secondary/45 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-app-muted">Second tag</p>
                <p className="mt-2 text-sm font-semibold text-app-text">{replyFlowSummary.second.title}</p>
                <p className="mt-1 text-xs leading-5 text-app-muted">{replyFlowSummary.second.description}</p>
              </div>
            </div>
          ) : null}

          <div className="grid gap-3 xl:grid-cols-2">
            <div className="rounded-[20px] border border-app-border bg-app-secondary/35 p-4">
              <div className="space-y-1">
                <p className="text-sm font-semibold text-app-text">First reply</p>
                <p className="text-xs text-app-muted">
                  Use this for the first tag on a post or comment. This is where AI with RAG or context is chosen.
                </p>
              </div>

              <div className="mt-4 space-y-4">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-app-muted">Who gets AI replies</p>
                  <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {AUDIENCE_OPTIONS.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => updateSettings({ ai_reply_scope: option.value })}
                        className={`rounded-[16px] border px-3 py-2.5 text-sm font-semibold transition ${segmentedTone(
                          settings.ai_reply_scope === option.value
                        )}`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                  <p className="mt-2 text-xs text-app-muted">{AUDIENCE_DESCRIPTIONS[settings.ai_reply_scope]}</p>
                  {settings.ai_reply_scope === "no_one" ? (
                    <p className="mt-1 text-xs font-medium text-brand">
                      Auto only mode uses your fallback auto reply and does not need an API key.
                    </p>
                  ) : null}
                </div>

                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-app-muted">If AI is not allowed</p>
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    {FALLBACK_OPTIONS.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => updateSettings({ non_ai_reply_mode: option.value })}
                        className={`rounded-[16px] border px-3 py-2.5 text-sm font-semibold transition ${segmentedTone(
                          settings.non_ai_reply_mode === option.value
                        )}`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                  <p className="mt-2 text-xs text-app-muted">{FALLBACK_DESCRIPTIONS[settings.non_ai_reply_mode]}</p>
                </div>

                <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_140px]">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-app-muted">
                      First AI reply knowledge source
                    </p>
                    <div className="mt-2 grid grid-cols-2 gap-2">
                      {AI_SOURCE_OPTIONS.map((option) => (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => updateSettings({ ai_reply_source: option.value })}
                          className={`rounded-[16px] border px-3 py-2.5 text-sm font-semibold transition ${segmentedTone(
                            settings.ai_reply_source === option.value
                          )}`}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                    <p className="mt-2 text-xs text-app-muted">
                      {settings.ai_reply_source === "rag"
                        ? "Use your saved knowledge notes along with the tagged post and comment context."
                        : "Use the tagged post and comment context only."}
                    </p>
                  </div>

                  <label className="grid gap-1.5">
                    <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-app-muted">Max tokens</span>
                    <input
                      type="number"
                      min={32}
                      max={4000}
                      value={settings.max_output_tokens}
                      onChange={(event) =>
                        updateSettings({
                          max_output_tokens: Math.max(32, Math.min(4000, Number(event.target.value) || 220)),
                        })
                      }
                      className="input-shell h-11"
                    />
                  </label>
                </div>
              </div>
            </div>

            <div className="rounded-[20px] border border-app-border bg-app-secondary/35 p-4">
              <div className="space-y-1">
                <p className="text-sm font-semibold text-app-text">Second reply</p>
                <p className="text-xs text-app-muted">
                  Use this when someone tags you again on the same post after the first reply has already been sent.
                </p>
              </div>

              <div className="mt-4 space-y-4">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-app-muted">If tagged again on the same post</p>
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    {FALLBACK_OPTIONS.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => updateSettings({ second_reply_behavior: option.value })}
                        className={`rounded-[16px] border px-3 py-2.5 text-sm font-semibold transition ${segmentedTone(
                          settings.second_reply_behavior === option.value
                        )}`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                  <p className="mt-2 text-xs text-app-muted">
                    {settings.second_reply_behavior === "auto_reply"
                      ? "The second reply uses keyword rules and the tagged post/comment context, then falls back to your saved auto reply."
                      : "Ignore repeated tags in the same post after the first reply."}
                  </p>
                </div>

                <div className="rounded-[18px] border border-app-border bg-app-card px-3 py-3 text-xs leading-5 text-app-muted">
                  Second-tag auto replies are context-aware. They first try your keyword rules against the post, poll,
                  and tagged comment text. If nothing matches, the saved fallback message is used.
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-[24px] border border-app-border bg-app-card p-4 sm:p-5">
        <div className="space-y-1">
          <p className="text-sm font-semibold text-app-text">Auto reply</p>
          <p className="text-xs text-app-muted">
            These replies are used whenever fallback mode is set to auto reply, and they can also be used for second
            tags.
          </p>
        </div>
        <label className="mt-3 grid gap-1.5">
          <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-app-muted">Fallback message</span>
          <textarea
            value={settings.auto_reply_message}
            onChange={(event) => updateSettings({ auto_reply_message: event.target.value })}
            rows={3}
            className="input-shell min-h-[96px] resize-y"
          />
        </label>

        <div className="mt-4 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-semibold text-app-text">Keyword rules</p>
            <button
              type="button"
              onClick={() => updateSettings({ keyword_rules: [...settings.keyword_rules, createKeywordRule()] })}
              className="inline-flex items-center gap-2 rounded-full border border-app-border bg-app-secondary px-3 py-1.5 text-xs font-semibold text-app-text transition hover:border-brand/25 hover:text-brand"
            >
              <Plus className="h-3.5 w-3.5" />
              Add rule
            </button>
          </div>

          {settings.keyword_rules.length ? (
            settings.keyword_rules.map((rule, index) => (
              <div key={rule.id || index} className="rounded-[18px] border border-app-border bg-app-secondary/60 p-3">
                <div className="grid gap-3 sm:grid-cols-[minmax(0,180px)_minmax(0,1fr)_auto]">
                  <label className="grid gap-1.5">
                    <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-app-muted">Keyword</span>
                    <input
                      value={rule.keyword}
                      onChange={(event) =>
                        updateSettings({
                          keyword_rules: settings.keyword_rules.map((item, itemIndex) =>
                            itemIndex === index ? { ...item, keyword: event.target.value } : item
                          ),
                        })
                      }
                      placeholder="fees, refund"
                      className="input-shell h-11"
                    />
                  </label>

                  <label className="grid gap-1.5">
                    <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-app-muted">Reply</span>
                    <input
                      value={rule.reply}
                      onChange={(event) =>
                        updateSettings({
                          keyword_rules: settings.keyword_rules.map((item, itemIndex) =>
                            itemIndex === index ? { ...item, reply: event.target.value } : item
                          ),
                        })
                      }
                      placeholder="Send me the document link too."
                      className="input-shell h-11"
                    />
                  </label>

                  <button
                    type="button"
                    onClick={() =>
                      updateSettings({
                        keyword_rules: settings.keyword_rules.filter((_, itemIndex) => itemIndex !== index),
                      })
                    }
                    className="inline-flex items-center justify-center rounded-full border border-rose-200 bg-rose-50 px-3 py-2 text-rose-700 transition hover:bg-rose-100 sm:self-end"
                    aria-label="Remove keyword rule"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="rounded-[18px] border border-dashed border-app-border px-3 py-4 text-sm text-app-muted">
              No keyword rules yet. Add one if you want the auto reply to change based on the tagged post or comment context.
            </div>
          )}
        </div>
      </div>

      {settings.ai_reply_source === "rag" ? (
        <div className="rounded-[24px] border border-app-border bg-app-card p-4 sm:p-5">
          <div className="space-y-1">
            <p className="text-sm font-semibold text-app-text">RAG notes</p>
            <p className="text-xs text-app-muted">
              Add facts, identity details, FAQ text, or style notes you want the AI to use while replying.
            </p>
          </div>
          <label className="mt-3 grid gap-1.5">
            <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-app-muted">Knowledge base</span>
            <textarea
              value={settings.rag_knowledge_base}
              onChange={(event) => updateSettings({ rag_knowledge_base: event.target.value })}
              rows={7}
              placeholder="Add the facts, links, style notes, or FAQ text the AI should use while replying."
              className="input-shell min-h-[180px] resize-y"
            />
          </label>
        </div>
      ) : null}

      <button
        type="button"
        onClick={() => void handleSaveSettings()}
        disabled={saving}
        className="inline-flex items-center gap-2 rounded-full border border-brand bg-brand px-4 py-2.5 text-sm font-semibold text-white shadow-[0_16px_28px_-22px_rgba(37,99,235,0.75)] transition hover:brightness-[1.03] disabled:cursor-not-allowed disabled:opacity-70"
      >
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
        Save AI reply settings
      </button>
    </div>
  );
}
