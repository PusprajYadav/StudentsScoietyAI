import {
  Bot,
  BrainCircuit,
  Cloud,
  Coins,
  Cpu,
  Eye,
  HardDriveDownload,
  Info,
  KeyRound,
  Loader2,
  RefreshCw,
  Route,
  Save,
  Server,
  ShieldCheck,
  Trash2,
  WandSparkles,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import {
  deleteAiTeacherModelRoute,
  deleteAiTeacherOllamaModel,
  deleteAiTeacherProviderKey,
  getAiTeacherAdminConfig,
  pullAiTeacherOllamaModel,
  saveAiTeacherModelRoute,
  saveAiTeacherProvider,
  saveAiTeacherProviderKey,
} from "../ai-teacher/api";
import type {
  AiTeacherAdminConfigPayload,
  AiTeacherModelRoute,
  AiTeacherOllamaModel,
  AiTeacherProviderConfigItem,
  AiTeacherProviderKey,
  AiTeacherProviderSlug,
  AiTeacherRoutePriority,
  AiTeacherRouteToolType,
} from "../ai-teacher/types";
import type { CoinFeatureSettingRow } from "../../types/database";
import { AdminMiniStatGrid, AdminPanelCard, AdminSectionHeading } from "./AdminUi";

interface AiTeacherRoutingAdminSectionProps {
  searchTerm?: string;
  coinSettings: CoinFeatureSettingRow[];
  onSaveCoinSettings: (items: CoinFeatureSettingRow[]) => Promise<void>;
}

const LITELLM_PROVIDER_SUGGESTIONS = [
  "openai",
  "anthropic",
  "gemini",
  "groq",
  "deepseek",
  "xai",
  "moonshot",
  "openrouter",
  "together_ai",
  "fireworks_ai",
  "mistral",
];

const PROVIDER_ORDER: AiTeacherProviderSlug[] = ["litellm", "workers_ai", "mimo", "ollama"];
const ROUTE_TOOL_OPTIONS: AiTeacherRouteToolType[] = [
  "default",
  "ask_question",
  "notes",
  "summary",
  "quiz",
  "mindmap",
  "image_solver",
  "practical_use",
  "social_reply",
];
const PRIORITY_OPTIONS: AiTeacherRoutePriority[] = ["cheap", "fast", "balanced", "best"];
const AI_TEACHER_BUSY_MESSAGE = "Server is too much busy there pls try again later.";

const EMPTY_ADMIN_CONFIG: AiTeacherAdminConfigPayload = {
  providers: [],
  platform_keys: [],
  model_routes: [],
  ollama_models: [],
  usage_summary: {
    total_requests: 0,
    total_tokens: 0,
    total_cost_usd: 0,
  },
};

function findCoinSetting(settings: CoinFeatureSettingRow[], featureKey: string) {
  return settings.find((entry) => entry.feature_key === featureKey) || null;
}

function toolLabel(toolType: AiTeacherRouteToolType) {
  if (toolType === "default") {
    return "All tools";
  }
  if (toolType === "social_reply") {
    return "Social Reply";
  }

  return toolType
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function providerTone(provider: string) {
  const lowered = provider.trim().toLowerCase();
  if (lowered.includes("openai") || lowered === "litellm") return "bg-sky-50 text-sky-700 border-sky-100";
  if (lowered.includes("workers")) return "bg-emerald-50 text-emerald-700 border-emerald-100";
  if (lowered.includes("mimo")) return "bg-fuchsia-50 text-fuchsia-700 border-fuchsia-100";
  if (lowered.includes("ollama")) return "bg-amber-50 text-amber-700 border-amber-100";
  return "bg-slate-100 text-slate-700 border-slate-200";
}

function priorityTone(priority: AiTeacherRoutePriority) {
  switch (priority) {
    case "cheap":
      return "bg-emerald-50 text-emerald-700 border-emerald-100";
    case "fast":
      return "bg-sky-50 text-sky-700 border-sky-100";
    case "best":
      return "bg-fuchsia-50 text-fuchsia-700 border-fuchsia-100";
    default:
      return "bg-violet-50 text-violet-700 border-violet-100";
  }
}

function cleanOptional(value: string) {
  const trimmed = value.trim();
  return trimmed || undefined;
}

function parsePositiveInteger(value: string) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}

function parseNonNegativeInteger(value: string, fallback = 0) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

function parseFloatString(value: string, fallback = 0) {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function formatBytes(bytes?: number) {
  const value = Math.max(0, Number(bytes || 0));
  if (!value) return "0 B";
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  if (value < 1024 * 1024 * 1024) return `${(value / (1024 * 1024)).toFixed(1)} MB`;
  return `${(value / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

function buildProviderForm(provider?: AiTeacherProviderConfigItem) {
  const config = (provider?.config || {}) as Record<string, unknown>;
  return {
    slug: provider?.slug || ("litellm" as AiTeacherProviderSlug),
    label: provider?.label || "LiteLLM",
    description: provider?.description || "",
    isEnabled: provider?.is_enabled ?? true,
    apiBase: String(config.api_base || ""),
    accountId: String(config.account_id || ""),
    chatEndpoint: String(config.chat_endpoint || "/v1/chat/completions"),
    authHeaderName: String(config.auth_header_name || "Authorization"),
    authScheme: String(config.auth_scheme || "Bearer"),
    keepAlive: String(config.keep_alive || "5m"),
    inputCost: String(config.input_cost_per_1k_tokens ?? 0),
    outputCost: String(config.output_cost_per_1k_tokens ?? 0),
  };
}

function providerIcon(slug: AiTeacherProviderSlug) {
  switch (slug) {
    case "workers_ai":
      return Cloud;
    case "mimo":
      return Cpu;
    case "ollama":
      return HardDriveDownload;
    default:
      return Bot;
  }
}

function providerShortDescription(provider: AiTeacherProviderConfigItem) {
  switch (provider.slug) {
    case "workers_ai":
      return "Cloudflare API route";
    case "mimo":
      return "Custom multimodal API";
    case "ollama":
      return "Local/self-hosted server";
    default:
      return "Default model gateway";
  }
}

function providerKeyHelperText(providerSlug: AiTeacherProviderSlug) {
  switch (providerSlug) {
    case "workers_ai":
      return "Use the Cloudflare API token for Workers AI.";
    case "mimo":
      return "Use the MiMo API key for the configured endpoint.";
    default:
      return "Use the provider API key used by LiteLLM.";
  }
}

function buildProviderConfigPayload(form: ReturnType<typeof buildProviderForm>) {
  const shared = {
    input_cost_per_1k_tokens: parseFloatString(form.inputCost, 0),
    output_cost_per_1k_tokens: parseFloatString(form.outputCost, 0),
  };

  switch (form.slug) {
    case "workers_ai":
      return {
        ...shared,
        api_base: cleanOptional(form.apiBase) || "https://api.cloudflare.com",
        account_id: cleanOptional(form.accountId) || "",
      };
    case "mimo":
      return {
        ...shared,
        api_base: cleanOptional(form.apiBase) || "",
        chat_endpoint: cleanOptional(form.chatEndpoint) || "/v1/chat/completions",
        auth_header_name: cleanOptional(form.authHeaderName) || "Authorization",
        auth_scheme: cleanOptional(form.authScheme) || "Bearer",
        request_format: "openai_chat",
      };
    case "ollama":
      return {
        ...shared,
        api_base: cleanOptional(form.apiBase) || "http://localhost:11434",
        keep_alive: cleanOptional(form.keepAlive) || "5m",
      };
    default:
      return shared;
  }
}

function routeConfigSummary(route: AiTeacherModelRoute) {
  const config = (route.route_config || {}) as Record<string, unknown>;
  const parts: string[] = [];
  if (typeof config.chat_endpoint === "string" && config.chat_endpoint.trim()) {
    parts.push(config.chat_endpoint.trim());
  }
  if (typeof config.keep_alive === "string" && config.keep_alive.trim()) {
    parts.push(`keep ${config.keep_alive.trim()}`);
  }
  if (typeof config.account_id === "string" && config.account_id.trim()) {
    parts.push(`acct ${config.account_id.trim()}`);
  }
  return parts.join(" · ");
}

function ProviderStatusCard({
  item,
  active,
  onSelect,
  onToggle,
  disabled,
}: {
  item: AiTeacherProviderConfigItem;
  active: boolean;
  onSelect: () => void;
  onToggle: () => void;
  disabled?: boolean;
}) {
  const Icon = providerIcon(item.slug);
  return (
    <article
      className={`rounded-[18px] border p-3 transition ${
        active
          ? "border-slate-900 bg-slate-900 text-white shadow-[0_18px_40px_-30px_rgba(15,23,42,0.7)]"
          : "border-slate-200 bg-white hover:border-slate-300"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <button type="button" onClick={onSelect} className="min-w-0 text-left">
          <div className="flex items-center gap-2">
            <span
              className={`inline-flex h-9 w-9 items-center justify-center rounded-2xl ${
                active ? "bg-white/15 text-white" : "bg-slate-100 text-slate-700"
              }`}
            >
              <Icon className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <p className={`truncate text-sm font-semibold ${active ? "text-white" : "text-slate-900"}`}>{item.label}</p>
              <p className={`text-[11px] ${active ? "text-white/70" : "text-slate-500"}`}>{providerShortDescription(item)}</p>
            </div>
          </div>
        </button>

        <button
          type="button"
          onClick={onToggle}
          disabled={disabled}
          className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] ${
            item.is_enabled
              ? active
                ? "border-white/20 bg-white/10 text-white"
                : "border-emerald-100 bg-emerald-50 text-emerald-700"
              : active
                ? "border-white/20 bg-white/10 text-white/80"
                : "border-slate-200 bg-slate-100 text-slate-500"
          } disabled:cursor-not-allowed disabled:opacity-60`}
        >
          {item.is_enabled ? "Enabled" : "Disabled"}
        </button>
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        <span
          className={`rounded-full border px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.14em] ${
            active ? "border-white/15 bg-white/10 text-white/85" : "border-slate-200 bg-slate-50 text-slate-600"
          }`}
        >
          {item.provider_type}
        </span>
        {item.supports_vision ? (
          <span
            className={`rounded-full border px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.14em] ${
              active ? "border-white/15 bg-white/10 text-white/85" : "border-slate-200 bg-slate-50 text-slate-600"
            }`}
          >
            Vision
          </span>
        ) : null}
        {item.requires_api_key ? (
          <span
            className={`rounded-full border px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.14em] ${
              active ? "border-white/15 bg-white/10 text-white/85" : "border-slate-200 bg-slate-50 text-slate-600"
            }`}
          >
            Key required
          </span>
        ) : null}
      </div>
    </article>
  );
}

function SavedProviderKeyCard({
  item,
  onEdit,
  onDelete,
  deleting,
}: {
  item: AiTeacherProviderKey;
  onEdit: () => void;
  onDelete: () => void;
  deleting: boolean;
}) {
  return (
    <article className="rounded-[16px] border border-slate-200 bg-[linear-gradient(135deg,#ffffff,#f8fbff)] p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-[13px] font-semibold text-slate-900">{item.label}</p>
            <span className={`rounded-full border px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.14em] ${providerTone(item.provider_slug || item.provider)}`}>
              {item.provider_slug || item.provider}
            </span>
            <span
              className={`rounded-full border px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.14em] ${
                item.is_active ? "border-emerald-100 bg-emerald-50 text-emerald-700" : "border-slate-200 bg-slate-100 text-slate-500"
              }`}
            >
              {item.is_active ? "Active" : "Inactive"}
            </span>
          </div>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            <div className="rounded-[12px] bg-white/80 px-2.5 py-2">
              <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-slate-400">Provider</p>
              <p className="mt-1 truncate text-[11px] font-medium text-slate-700">{item.provider}</p>
            </div>
            <div className="rounded-[12px] bg-white/80 px-2.5 py-2">
              <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-slate-400">Masked key</p>
              <p className="mt-1 truncate text-[11px] font-medium text-slate-700">{item.masked_key}</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={onEdit}
            className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700"
            aria-label="Edit provider key"
          >
            <WandSparkles className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-rose-200 bg-rose-50 text-rose-600"
            aria-label="Delete provider key"
          >
            {deleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
          </button>
        </div>
      </div>
    </article>
  );
}

function SavedRouteCard({
  item,
  onEdit,
  onDelete,
  deleting,
}: {
  item: AiTeacherModelRoute;
  onEdit: () => void;
  onDelete: () => void;
  deleting: boolean;
}) {
  return (
    <article className="rounded-[16px] border border-slate-200 bg-[linear-gradient(135deg,#ffffff,#faf7ff)] p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-[13px] font-semibold text-slate-900">{item.label}</p>
            <span className={`rounded-full border px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.14em] ${priorityTone(item.priority)}`}>
              {item.priority}
            </span>
            <span className={`rounded-full border px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.14em] ${providerTone(item.provider_slug || item.provider)}`}>
              {item.provider_slug || item.provider}
            </span>
            {item.supports_vision ? (
              <span className="rounded-full border border-emerald-100 bg-emerald-50 px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.14em] text-emerald-700">
                <span className="inline-flex items-center gap-1">
                  <Eye className="h-3 w-3" />
                  Vision
                </span>
              </span>
            ) : null}
          </div>

          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            <div className="rounded-[12px] bg-white/80 px-2.5 py-2">
              <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-slate-400">Tool</p>
              <p className="mt-1 text-[11px] font-medium text-slate-700">{toolLabel(item.tool_type)}</p>
            </div>
            <div className="rounded-[12px] bg-white/80 px-2.5 py-2">
              <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-slate-400">Route target</p>
              <p className="mt-1 truncate text-[11px] font-medium text-slate-700">{item.model_name}</p>
            </div>
            <div className="rounded-[12px] bg-white/80 px-2.5 py-2">
              <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-slate-400">Provider key</p>
              <p className="mt-1 truncate text-[11px] font-medium text-slate-700">
                {item.provider_key_label || "Not required"}
              </p>
            </div>
            <div className="rounded-[12px] bg-white/80 px-2.5 py-2">
              <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-slate-400">Fallback</p>
              <p className="mt-1 text-[11px] font-medium text-slate-700">
                {item.fallback_to_litellm ? "LiteLLM fallback on" : "Fallback off"}
              </p>
            </div>
          </div>

          {item.description ? <p className="mt-2 text-[11px] text-slate-500">{item.description}</p> : null}
          {routeConfigSummary(item) ? <p className="mt-1 text-[10px] text-slate-400">{routeConfigSummary(item)}</p> : null}
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={onEdit}
            className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700"
            aria-label="Edit model route"
          >
            <WandSparkles className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-rose-200 bg-rose-50 text-rose-600"
            aria-label="Delete model route"
          >
            {deleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
          </button>
        </div>
      </div>
    </article>
  );
}

function OllamaModelCard({
  item,
  onDelete,
  deleting,
}: {
  item: AiTeacherOllamaModel;
  onDelete: () => void;
  deleting: boolean;
}) {
  const available = Boolean(item.name);
  return (
    <article className="rounded-[16px] border border-slate-200 bg-white p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate text-[13px] font-semibold text-slate-900">{item.name || "Ollama unavailable"}</p>
            {item.parameter_size ? (
              <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.14em] text-slate-600">
                {item.parameter_size}
              </span>
            ) : null}
          </div>
          <p className="mt-1 text-[11px] text-slate-500">
            {item.status ? item.status : `${formatBytes(item.size_bytes)}${item.family ? ` · ${item.family}` : ""}`}
          </p>
        </div>

        {available ? (
          <button
            type="button"
            onClick={onDelete}
            className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-rose-200 bg-rose-50 text-rose-600"
            aria-label="Delete Ollama model"
          >
            {deleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
          </button>
        ) : null}
      </div>
    </article>
  );
}

export function AiTeacherRoutingAdminSection({
  searchTerm = "",
  coinSettings,
  onSaveCoinSettings,
}: AiTeacherRoutingAdminSectionProps) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [savingProvider, setSavingProvider] = useState(false);
  const [savingKey, setSavingKey] = useState(false);
  const [savingRoute, setSavingRoute] = useState(false);
  const [savingCoins, setSavingCoins] = useState(false);
  const [savingAvailability, setSavingAvailability] = useState(false);
  const [pullingOllama, setPullingOllama] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [config, setConfig] = useState<AiTeacherAdminConfigPayload>(EMPTY_ADMIN_CONFIG);
  const [selectedProviderSlug, setSelectedProviderSlug] = useState<AiTeacherProviderSlug>("litellm");
  const [providerForm, setProviderForm] = useState(buildProviderForm());
  const [ollamaModelName, setOllamaModelName] = useState("");

  const [keyForm, setKeyForm] = useState({
    id: "",
    providerSlug: "litellm" as AiTeacherProviderSlug,
    label: "",
    provider: "openai",
    apiKey: "",
    defaultModelName: "",
    apiBase: "",
    apiVersion: "",
    isActive: true,
  });

  const [routeForm, setRouteForm] = useState({
    id: "",
    providerSlug: "litellm" as AiTeacherProviderSlug,
    providerKeyId: "",
    label: "",
    description: "",
    provider: "",
    toolType: "default" as AiTeacherRouteToolType,
    priority: "balanced" as AiTeacherRoutePriority,
    modelName: "",
    temperature: "0.2",
    maxOutputTokens: "",
    sortOrder: "100",
    supportsVision: false,
    isEnabled: true,
    fallbackToLitellm: true,
    routeConfigText: "",
  });

  const [coinDrafts, setCoinDrafts] = useState({
    platform: String(findCoinSetting(coinSettings, "ai_teacher_admin_generate")?.coins_required || 0),
    user: String(findCoinSetting(coinSettings, "ai_teacher_user_generate")?.coins_required || 0),
  });

  useEffect(() => {
    setCoinDrafts({
      platform: String(findCoinSetting(coinSettings, "ai_teacher_admin_generate")?.coins_required || 0),
      user: String(findCoinSetting(coinSettings, "ai_teacher_user_generate")?.coins_required || 0),
    });
  }, [coinSettings]);

  async function loadConfig(showRefreshing = false) {
    if (showRefreshing) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const payload = await getAiTeacherAdminConfig();
      setConfig(payload);
      const nextProvider = payload.providers.find((item) => item.slug === selectedProviderSlug) || payload.providers[0];
      if (nextProvider) {
        setSelectedProviderSlug(nextProvider.slug);
        setProviderForm(buildProviderForm(nextProvider));
      }
      setRouteForm((current) => {
        const providerSlug = payload.providers.some((item) => item.slug === current.providerSlug)
          ? current.providerSlug
          : (nextProvider?.slug || "litellm");
        const providerMeta = payload.providers.find((item) => item.slug === providerSlug);
        const matchingKeys = payload.platform_keys.filter(
          (item) => item.provider_slug === providerSlug && item.is_active
        );
        return {
          ...current,
          providerSlug,
          providerKeyId: providerMeta?.requires_api_key ? current.providerKeyId || matchingKeys[0]?.id || "" : "",
        };
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not load AI routing admin data.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    void loadConfig();
  }, []);

  useEffect(() => {
    const selected = config.providers.find((item) => item.slug === selectedProviderSlug);
    if (selected) {
      setProviderForm(buildProviderForm(selected));
    }
  }, [config.providers, selectedProviderSlug]);

  const normalizedSearch = searchTerm.trim().toLowerCase();
  const filteredProviders = useMemo(() => {
    const ordered = [...config.providers].sort(
      (left, right) => PROVIDER_ORDER.indexOf(left.slug) - PROVIDER_ORDER.indexOf(right.slug)
    );
    if (!normalizedSearch) {
      return ordered;
    }
    return ordered.filter((item) =>
      `${item.label} ${item.slug} ${item.description || ""}`.toLowerCase().includes(normalizedSearch)
    );
  }, [config.providers, normalizedSearch]);

  const filteredKeys = useMemo(() => {
    if (!normalizedSearch) {
      return config.platform_keys;
    }
    return config.platform_keys.filter((item) =>
      [
        item.label,
        item.provider,
        item.provider_slug || "",
        item.default_model_name || "",
        item.masked_key,
      ].some((value) => value.toLowerCase().includes(normalizedSearch))
    );
  }, [config.platform_keys, normalizedSearch]);

  const filteredRoutes = useMemo(() => {
    if (!normalizedSearch) {
      return config.model_routes;
    }
    return config.model_routes.filter((item) =>
      [
        item.label,
        item.provider,
        item.provider_slug || "",
        item.model_name,
        item.provider_key_label || "",
        item.description || "",
        item.tool_type,
      ].some((value) => value.toLowerCase().includes(normalizedSearch))
    );
  }, [config.model_routes, normalizedSearch]);

  const filteredOllamaModels = useMemo(() => {
    if (!normalizedSearch) {
      return config.ollama_models;
    }
    return config.ollama_models.filter((item) =>
      `${item.name || ""} ${item.family || ""} ${item.status || ""}`.toLowerCase().includes(normalizedSearch)
    );
  }, [config.ollama_models, normalizedSearch]);

  const enabledProviders = config.providers.filter((item) => item.is_enabled).length;
  const activeKeys = config.platform_keys.filter((item) => item.is_active).length;
  const enabledRoutes = config.model_routes.filter((item) => item.is_enabled).length;
  const platformCoinSetting = findCoinSetting(coinSettings, "ai_teacher_admin_generate");
  const userCoinSetting = findCoinSetting(coinSettings, "ai_teacher_user_generate");
  const aiTeacherEnabled = Boolean(platformCoinSetting?.is_enabled && userCoinSetting?.is_enabled);
  const selectedProvider = useMemo(
    () => config.providers.find((item) => item.slug === selectedProviderSlug) || null,
    [config.providers, selectedProviderSlug]
  );
  const selectedRouteProvider = useMemo(
    () => config.providers.find((item) => item.slug === routeForm.providerSlug) || null,
    [config.providers, routeForm.providerSlug]
  );
  const routeProviderKeys = useMemo(
    () =>
      config.platform_keys.filter(
        (item) => item.provider_slug === routeForm.providerSlug && item.is_active
      ),
    [config.platform_keys, routeForm.providerSlug]
  );

  function resetKeyForm() {
    setKeyForm({
      id: "",
      providerSlug: "litellm",
      label: "",
      provider: "openai",
      apiKey: "",
      defaultModelName: "",
      apiBase: "",
      apiVersion: "",
      isActive: true,
    });
  }

  function resetRouteForm(providerSlug: AiTeacherProviderSlug = selectedProvider?.slug || "litellm") {
    const providerMeta = config.providers.find((item) => item.slug === providerSlug);
    const matchingKeys = config.platform_keys.filter(
      (item) => item.provider_slug === providerSlug && item.is_active
    );
    setRouteForm({
      id: "",
      providerSlug,
      providerKeyId: providerMeta?.requires_api_key ? matchingKeys[0]?.id || "" : "",
      label: "",
      description: "",
      provider: "",
      toolType: "default",
      priority: "balanced",
      modelName: "",
      temperature: "0.2",
      maxOutputTokens: "",
      sortOrder: "100",
      supportsVision: providerMeta?.supports_vision ?? false,
      isEnabled: true,
      fallbackToLitellm: providerSlug !== "litellm",
      routeConfigText: "",
    });
  }

  async function handleSaveProvider() {
    setSavingProvider(true);
    try {
      await saveAiTeacherProvider({
        slug: providerForm.slug,
        label: providerForm.label.trim() || providerForm.slug,
        description: cleanOptional(providerForm.description) || null,
        is_enabled: providerForm.isEnabled,
        config: buildProviderConfigPayload(providerForm),
      });
      toast.success(`${providerForm.label || providerForm.slug} saved.`);
      await loadConfig(true);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save provider settings.");
    } finally {
      setSavingProvider(false);
    }
  }

  async function handleQuickProviderToggle(item: AiTeacherProviderConfigItem) {
    setDeletingId(`provider:${item.slug}`);
    try {
      await saveAiTeacherProvider({
        slug: item.slug,
        label: item.label,
        description: item.description || null,
        is_enabled: !item.is_enabled,
        config: item.config,
      });
      toast.success(`${item.label} ${item.is_enabled ? "disabled" : "enabled"}.`);
      await loadConfig(true);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update provider.");
    } finally {
      setDeletingId(null);
    }
  }

  async function handleSaveKey() {
    if (!keyForm.label.trim() || !keyForm.provider.trim()) {
      toast.error("Enter a label and provider for the platform key.");
      return;
    }
    if (!keyForm.id && !keyForm.apiKey.trim()) {
      toast.error("Enter the API key before saving.");
      return;
    }

    setSavingKey(true);
    try {
      await saveAiTeacherProviderKey({
        id: keyForm.id || undefined,
        scope: "platform",
        provider_slug: keyForm.providerSlug,
        label: keyForm.label.trim(),
        provider: keyForm.provider.trim(),
        api_key: keyForm.apiKey.trim() || undefined,
        default_model_name: cleanOptional(keyForm.defaultModelName),
        api_base: cleanOptional(keyForm.apiBase),
        api_version: cleanOptional(keyForm.apiVersion),
        is_active: keyForm.isActive,
      });
      toast.success(keyForm.id ? "Platform key updated." : "Platform key added.");
      resetKeyForm();
      await loadConfig(true);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save platform key.");
    } finally {
      setSavingKey(false);
    }
  }

  async function handleSaveRoute() {
    if (!routeForm.label.trim() || !routeForm.modelName.trim()) {
      toast.error("Enter a route label and model name.");
      return;
    }
    if (selectedRouteProvider?.requires_api_key && !routeForm.providerKeyId) {
      toast.error("Choose a platform key for this provider.");
      return;
    }

    let routeConfig: Record<string, unknown> | undefined;
    if (routeForm.routeConfigText.trim()) {
      try {
        const parsed = JSON.parse(routeForm.routeConfigText) as Record<string, unknown>;
        routeConfig = parsed && typeof parsed === "object" ? parsed : undefined;
      } catch {
        toast.error("Advanced route JSON is not valid.");
        return;
      }
    }

    setSavingRoute(true);
    try {
      await saveAiTeacherModelRoute({
        id: routeForm.id || undefined,
        provider_slug: routeForm.providerSlug,
        provider_key_id: selectedRouteProvider?.requires_api_key ? routeForm.providerKeyId || undefined : undefined,
        label: routeForm.label.trim(),
        description: cleanOptional(routeForm.description),
        tool_type: routeForm.toolType,
        priority: routeForm.priority,
        provider: cleanOptional(routeForm.provider),
        model_name: routeForm.modelName.trim(),
        temperature: parseFloatString(routeForm.temperature, 0.2),
        max_output_tokens: parsePositiveInteger(routeForm.maxOutputTokens),
        sort_order: parseNonNegativeInteger(routeForm.sortOrder, 100),
        supports_vision: routeForm.supportsVision,
        is_enabled: routeForm.isEnabled,
        route_config: routeConfig,
        fallback_to_litellm: routeForm.fallbackToLitellm,
      });
      toast.success(routeForm.id ? "Model route updated." : "Model route added.");
      resetRouteForm(routeForm.providerSlug);
      await loadConfig(true);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save model route.");
    } finally {
      setSavingRoute(false);
    }
  }

  async function handleSaveCoins() {
    const nextPlatformCoins = Math.max(0, Number.parseInt(coinDrafts.platform, 10) || 0);
    const nextUserCoins = Math.max(0, Number.parseInt(coinDrafts.user, 10) || 0);
    const platformSetting = findCoinSetting(coinSettings, "ai_teacher_admin_generate");
    const userSetting = findCoinSetting(coinSettings, "ai_teacher_user_generate");

    if (!platformSetting || !userSetting) {
      toast.error("AI Teacher coin settings could not be found.");
      return;
    }

    setSavingCoins(true);
    try {
      await onSaveCoinSettings(
        coinSettings.map((item) => {
          if (item.feature_key === "ai_teacher_admin_generate") {
            return { ...item, coins_required: nextPlatformCoins };
          }
          if (item.feature_key === "ai_teacher_user_generate") {
            return { ...item, coins_required: nextUserCoins };
          }
          return item;
        })
      );
      toast.success("AI Teacher coin pricing saved.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save AI Teacher coin pricing.");
    } finally {
      setSavingCoins(false);
    }
  }

  async function handleToggleAvailability(nextEnabled: boolean) {
    if (!platformCoinSetting || !userCoinSetting) {
      toast.error("AI Teacher settings could not be found.");
      return;
    }

    setSavingAvailability(true);
    try {
      await onSaveCoinSettings(
        coinSettings.map((item) => {
          if (
            item.feature_key === "ai_teacher_admin_generate" ||
            item.feature_key === "ai_teacher_user_generate"
          ) {
            return { ...item, is_enabled: nextEnabled };
          }
          return item;
        })
      );
      toast.success(nextEnabled ? "AI Teacher enabled." : "AI Teacher paused.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update AI Teacher status.");
    } finally {
      setSavingAvailability(false);
    }
  }

  async function handlePullOllamaModel() {
    if (!ollamaModelName.trim()) {
      toast.error("Enter an Ollama model name first.");
      return;
    }
    setPullingOllama(true);
    try {
      const result = await pullAiTeacherOllamaModel(ollamaModelName.trim());
      toast.success(result.status || "Ollama model pulled.");
      setOllamaModelName("");
      await loadConfig(true);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not pull Ollama model.");
    } finally {
      setPullingOllama(false);
    }
  }

  const selectedProviderIcon = providerIcon(selectedProvider?.slug || "litellm");

  return (
    <section className="space-y-3">
      <AdminMiniStatGrid
        items={[
          {
            label: "Providers live",
            value: enabledProviders,
            icon: ShieldCheck,
            toneClassName: "bg-emerald-100 text-emerald-700",
          },
          {
            label: "Platform keys",
            value: activeKeys,
            icon: KeyRound,
            toneClassName: "bg-sky-100 text-sky-700",
          },
          {
            label: "Routes live",
            value: enabledRoutes,
            icon: Route,
            toneClassName: "bg-violet-100 text-violet-700",
          },
          {
            label: "30d spend",
            value: `$${config.usage_summary.total_cost_usd.toFixed(4)}`,
            icon: Coins,
            toneClassName: "bg-amber-100 text-amber-700",
          },
        ]}
      />

      <div className="grid gap-3 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
        <AdminPanelCard className="space-y-3">
          <div className="flex items-start justify-between gap-3">
            <AdminSectionHeading
              icon={Server}
              title="Provider registry"
              description="Enable or pause each AI backend, then save the connection values only once for AI Teacher and social reply routes."
              iconClassName="from-slate-700 to-slate-900"
              badge={
                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-semibold text-slate-700">
                  Multi-provider
                </span>
              }
            />

            <button
              type="button"
              onClick={() => void loadConfig(true)}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-slate-700"
              aria-label="Refresh AI routing config"
            >
              {refreshing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            </button>
          </div>

          <div className="rounded-[18px] border border-slate-200 bg-slate-50/80 px-3.5 py-3">
            <div className="flex items-start gap-2.5">
              <div className="rounded-full bg-white p-1.5 text-slate-600 shadow-sm">
                <Info className="h-3.5 w-3.5" />
              </div>
              <div>
                <p className="text-[12px] font-semibold text-slate-900">Step 1. Turn providers on or off here</p>
                <p className="mt-1 text-[11px] leading-5 text-slate-600">
                  The router only uses providers that are enabled here. Keys and routes below stay saved, but disabled providers are skipped completely.
                </p>
              </div>
            </div>
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            {filteredProviders.map((item) => (
              <ProviderStatusCard
                key={item.slug}
                item={item}
                active={item.slug === selectedProviderSlug}
                onSelect={() => setSelectedProviderSlug(item.slug)}
                onToggle={() => void handleQuickProviderToggle(item)}
                disabled={deletingId === `provider:${item.slug}`}
              />
            ))}
          </div>

          {selectedProvider ? (
            <div className="rounded-[20px] border border-slate-200 bg-[linear-gradient(135deg,#ffffff,#f8fafc)] p-3.5">
              <div className="flex items-start gap-3">
                <div className="rounded-2xl bg-slate-100 p-2 text-slate-700">
                  {(() => {
                    const Icon = selectedProviderIcon;
                    return <Icon className="h-4 w-4" />;
                  })()}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-900">{selectedProvider.label}</p>
                  <p className="mt-1 text-[11px] text-slate-500">
                    {selectedProvider.description || "Admin connection settings for this provider."}
                  </p>
                </div>
              </div>

              <div className="mt-3 grid gap-2.5">
                <label className="grid gap-1.5">
                  <span className="text-[10px] font-medium uppercase tracking-[0.16em] text-slate-500">Label</span>
                  <input
                    value={providerForm.label}
                    onChange={(event) => setProviderForm((current) => ({ ...current, label: event.target.value }))}
                    className="input-shell"
                    placeholder={selectedProvider.label}
                  />
                </label>

                <label className="grid gap-1.5">
                  <span className="text-[10px] font-medium uppercase tracking-[0.16em] text-slate-500">Description</span>
                  <input
                    value={providerForm.description}
                    onChange={(event) => setProviderForm((current) => ({ ...current, description: event.target.value }))}
                    className="input-shell"
                    placeholder="Short admin note"
                  />
                </label>

                {selectedProvider.slug === "workers_ai" ? (
                  <div className="grid gap-2 sm:grid-cols-2">
                    <label className="grid gap-1.5">
                      <span className="text-[10px] font-medium uppercase tracking-[0.16em] text-slate-500">API base</span>
                      <input
                        value={providerForm.apiBase}
                        onChange={(event) => setProviderForm((current) => ({ ...current, apiBase: event.target.value }))}
                        className="input-shell"
                        placeholder="https://api.cloudflare.com"
                      />
                    </label>
                    <label className="grid gap-1.5">
                      <span className="text-[10px] font-medium uppercase tracking-[0.16em] text-slate-500">Account ID</span>
                      <input
                        value={providerForm.accountId}
                        onChange={(event) => setProviderForm((current) => ({ ...current, accountId: event.target.value }))}
                        className="input-shell"
                        placeholder="Cloudflare account id"
                      />
                    </label>
                  </div>
                ) : null}

                {selectedProvider.slug === "mimo" ? (
                  <div className="grid gap-2">
                    <div className="grid gap-2 sm:grid-cols-2">
                      <label className="grid gap-1.5">
                        <span className="text-[10px] font-medium uppercase tracking-[0.16em] text-slate-500">API base</span>
                        <input
                          value={providerForm.apiBase}
                          onChange={(event) => setProviderForm((current) => ({ ...current, apiBase: event.target.value }))}
                          className="input-shell"
                          placeholder="https://api.mimo.example"
                        />
                      </label>
                      <label className="grid gap-1.5">
                        <span className="text-[10px] font-medium uppercase tracking-[0.16em] text-slate-500">Chat endpoint</span>
                        <input
                          value={providerForm.chatEndpoint}
                          onChange={(event) => setProviderForm((current) => ({ ...current, chatEndpoint: event.target.value }))}
                          className="input-shell"
                          placeholder="/v1/chat/completions"
                        />
                      </label>
                    </div>
                    <div className="grid gap-2 sm:grid-cols-2">
                      <label className="grid gap-1.5">
                        <span className="text-[10px] font-medium uppercase tracking-[0.16em] text-slate-500">Auth header</span>
                        <input
                          value={providerForm.authHeaderName}
                          onChange={(event) =>
                            setProviderForm((current) => ({ ...current, authHeaderName: event.target.value }))
                          }
                          className="input-shell"
                          placeholder="Authorization"
                        />
                      </label>
                      <label className="grid gap-1.5">
                        <span className="text-[10px] font-medium uppercase tracking-[0.16em] text-slate-500">Auth scheme</span>
                        <input
                          value={providerForm.authScheme}
                          onChange={(event) => setProviderForm((current) => ({ ...current, authScheme: event.target.value }))}
                          className="input-shell"
                          placeholder="Bearer"
                        />
                      </label>
                    </div>
                  </div>
                ) : null}

                {selectedProvider.slug === "ollama" ? (
                  <div className="grid gap-2 sm:grid-cols-2">
                    <label className="grid gap-1.5">
                      <span className="text-[10px] font-medium uppercase tracking-[0.16em] text-slate-500">Server URL</span>
                      <input
                        value={providerForm.apiBase}
                        onChange={(event) => setProviderForm((current) => ({ ...current, apiBase: event.target.value }))}
                        className="input-shell"
                        placeholder="http://localhost:11434"
                      />
                    </label>
                    <label className="grid gap-1.5">
                      <span className="text-[10px] font-medium uppercase tracking-[0.16em] text-slate-500">Keep alive</span>
                      <input
                        value={providerForm.keepAlive}
                        onChange={(event) => setProviderForm((current) => ({ ...current, keepAlive: event.target.value }))}
                        className="input-shell"
                        placeholder="5m"
                      />
                    </label>
                  </div>
                ) : null}

                <div className="grid gap-2 sm:grid-cols-2">
                  <label className="grid gap-1.5">
                    <span className="text-[10px] font-medium uppercase tracking-[0.16em] text-slate-500">Input cost / 1k</span>
                    <input
                      value={providerForm.inputCost}
                      onChange={(event) => setProviderForm((current) => ({ ...current, inputCost: event.target.value }))}
                      className="input-shell"
                      inputMode="decimal"
                      placeholder="0"
                    />
                  </label>
                  <label className="grid gap-1.5">
                    <span className="text-[10px] font-medium uppercase tracking-[0.16em] text-slate-500">Output cost / 1k</span>
                    <input
                      value={providerForm.outputCost}
                      onChange={(event) => setProviderForm((current) => ({ ...current, outputCost: event.target.value }))}
                      className="input-shell"
                      inputMode="decimal"
                      placeholder="0"
                    />
                  </label>
                </div>

                <label className="flex items-center justify-between rounded-[16px] border border-slate-200 bg-slate-50 px-3 py-2.5">
                  <div>
                    <p className="text-[13px] font-semibold text-slate-900">Provider enabled</p>
                    <p className="mt-1 text-[10px] text-slate-500">The router skips disabled providers fully.</p>
                  </div>

                  <input
                    type="checkbox"
                    checked={providerForm.isEnabled}
                    onChange={(event) => setProviderForm((current) => ({ ...current, isEnabled: event.target.checked }))}
                    className="h-4 w-4 rounded border-slate-300 text-brand focus:ring-brand"
                  />
                </label>
              </div>

              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  onClick={handleSaveProvider}
                  disabled={savingProvider}
                  className="btn-primary inline-flex flex-1 items-center justify-center gap-2 !rounded-full !px-4 !py-2 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {savingProvider ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Save provider
                </button>
              </div>
            </div>
          ) : null}
        </AdminPanelCard>

        <div className="space-y-3">
          <AdminPanelCard className="space-y-3">
            <AdminSectionHeading
              icon={KeyRound}
              title="Platform keys"
              description="Store the encrypted keys or tokens used by the enabled providers."
              iconClassName="from-sky-500 to-cyan-500"
              badge={
                <span className="rounded-full bg-sky-50 px-2.5 py-1 text-[10px] font-semibold text-sky-700">
                  Encrypted
                </span>
              }
            />

            <div className="rounded-[18px] border border-sky-100 bg-sky-50/70 px-3.5 py-3">
              <div className="flex items-start gap-2.5">
                <div className="rounded-full bg-white p-1.5 text-sky-600 shadow-sm">
                  <Info className="h-3.5 w-3.5" />
                </div>
                <div>
                  <p className="text-[12px] font-semibold text-slate-900">Step 2. Save a key only when that provider needs one</p>
                  <p className="mt-1 text-[11px] leading-5 text-slate-600">
                    LiteLLM, Workers AI, and MiMo can use saved secrets here. Ollama does not need a stored API key.
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-[18px] border border-emerald-100 bg-emerald-50/70 px-3.5 py-3">
              <div className="flex items-start gap-2.5">
                <div className="rounded-full bg-white p-1.5 text-emerald-600 shadow-sm">
                  <Info className="h-3.5 w-3.5" />
                </div>
                <div>
                  <p className="text-[12px] font-semibold text-slate-900">Social reply API keys live here too</p>
                  <p className="mt-1 text-[11px] leading-5 text-slate-600">
                    Save a dedicated key for tagged post replies here, then attach that key to a route whose tool is
                    {" "}
                    <span className="font-semibold text-slate-900">Social Reply</span>.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid gap-2.5">
              <label className="grid gap-1.5">
                <span className="text-[10px] font-medium uppercase tracking-[0.16em] text-slate-500">Provider</span>
                <select
                  value={keyForm.providerSlug}
                  onChange={(event) =>
                    setKeyForm((current) => ({
                      ...current,
                      providerSlug: event.target.value as AiTeacherProviderSlug,
                      provider:
                        event.target.value === "workers_ai"
                          ? "workers_ai"
                          : event.target.value === "mimo"
                            ? "mimo"
                            : "openai",
                    }))
                  }
                  className="input-shell"
                >
                  {config.providers
                    .filter((item) => item.requires_api_key)
                    .map((item) => (
                      <option key={item.slug} value={item.slug}>
                        {item.label}
                      </option>
                    ))}
                </select>
              </label>

              <label className="grid gap-1.5">
                <span className="text-[10px] font-medium uppercase tracking-[0.16em] text-slate-500">Label</span>
                <input
                  value={keyForm.label}
                  onChange={(event) => setKeyForm((current) => ({ ...current, label: event.target.value }))}
                  className="input-shell"
                  placeholder="OpenAI production"
                />
              </label>

              <label className="grid gap-1.5">
                <span className="text-[10px] font-medium uppercase tracking-[0.16em] text-slate-500">Provider value</span>
                <input
                  value={keyForm.provider}
                  onChange={(event) => setKeyForm((current) => ({ ...current, provider: event.target.value }))}
                  className="input-shell"
                  placeholder={keyForm.providerSlug === "litellm" ? "openai" : keyForm.providerSlug}
                />
                {keyForm.providerSlug === "litellm" ? (
                  <div className="flex flex-wrap gap-1.5">
                    {LITELLM_PROVIDER_SUGGESTIONS.map((provider) => {
                      const active = keyForm.provider.trim().toLowerCase() === provider;
                      return (
                        <button
                          key={provider}
                          type="button"
                          onClick={() => setKeyForm((current) => ({ ...current, provider }))}
                          className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] transition ${
                            active
                              ? "border-sky-200 bg-sky-50 text-sky-700"
                              : "border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:text-slate-700"
                          }`}
                        >
                          {provider}
                        </button>
                      );
                    })}
                  </div>
                ) : null}
              </label>

              <label className="grid gap-1.5">
                <span className="text-[10px] font-medium uppercase tracking-[0.16em] text-slate-500">
                  API key {keyForm.id ? "(leave blank to keep existing)" : ""}
                </span>
                <input
                  value={keyForm.apiKey}
                  onChange={(event) => setKeyForm((current) => ({ ...current, apiKey: event.target.value }))}
                  className="input-shell"
                  type="password"
                  placeholder="sk-..."
                />
                <p className="text-[10px] text-slate-500">{providerKeyHelperText(keyForm.providerSlug)}</p>
              </label>

              <div className="grid gap-2 sm:grid-cols-3">
                <label className="grid gap-1.5 sm:col-span-1">
                  <span className="text-[10px] font-medium uppercase tracking-[0.16em] text-slate-500">Default model</span>
                  <input
                    value={keyForm.defaultModelName}
                    onChange={(event) => setKeyForm((current) => ({ ...current, defaultModelName: event.target.value }))}
                    className="input-shell"
                    placeholder="openai/gpt-4o-mini"
                  />
                </label>
                <label className="grid gap-1.5">
                  <span className="text-[10px] font-medium uppercase tracking-[0.16em] text-slate-500">API base</span>
                  <input
                    value={keyForm.apiBase}
                    onChange={(event) => setKeyForm((current) => ({ ...current, apiBase: event.target.value }))}
                    className="input-shell"
                    placeholder="Optional"
                  />
                </label>
                <label className="grid gap-1.5">
                  <span className="text-[10px] font-medium uppercase tracking-[0.16em] text-slate-500">API version</span>
                  <input
                    value={keyForm.apiVersion}
                    onChange={(event) => setKeyForm((current) => ({ ...current, apiVersion: event.target.value }))}
                    className="input-shell"
                    placeholder="Optional"
                  />
                </label>
              </div>

              <label className="flex items-center justify-between rounded-[16px] border border-slate-200 bg-slate-50 px-3 py-2.5">
                <div>
                  <p className="text-[13px] font-semibold text-slate-900">Active</p>
                  <p className="mt-1 text-[10px] text-slate-500">Inactive keys stay saved but cannot power routes.</p>
                </div>

                <input
                  type="checkbox"
                  checked={keyForm.isActive}
                  onChange={(event) => setKeyForm((current) => ({ ...current, isActive: event.target.checked }))}
                  className="h-4 w-4 rounded border-slate-300 text-brand focus:ring-brand"
                />
              </label>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleSaveKey}
                disabled={savingKey}
                className="btn-primary inline-flex flex-1 items-center justify-center gap-2 !rounded-full !px-4 !py-2 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {savingKey ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                {keyForm.id ? "Update key" : "Save key"}
              </button>
              <button
                type="button"
                onClick={resetKeyForm}
                className="btn-secondary inline-flex items-center justify-center gap-2 !rounded-full !px-4 !py-2"
              >
                Clear
              </button>
            </div>
          </AdminPanelCard>

          <AdminPanelCard className="space-y-3">
            <AdminSectionHeading
              icon={Route}
              title="Tool routes"
              description="Choose which provider/model each AI Teacher tool or social reply bot should use, and whether LiteLLM should catch failures."
              iconClassName="from-violet-500 to-indigo-500"
              badge={
                <span className="rounded-full bg-violet-50 px-2.5 py-1 text-[10px] font-semibold text-violet-700">
                  Router
                </span>
              }
            />

            <div className="rounded-[18px] border border-violet-100 bg-violet-50/70 px-3.5 py-3">
              <div className="flex items-start gap-2.5">
                <div className="rounded-full bg-white p-1.5 text-violet-600 shadow-sm">
                  <Info className="h-3.5 w-3.5" />
                </div>
                <div>
                  <p className="text-[12px] font-semibold text-slate-900">Step 3. Map each tool to the right backend</p>
                  <p className="mt-1 text-[11px] leading-5 text-slate-600">
                    Routes can point to LiteLLM, Workers AI, MiMo, or Ollama. If fallback is on, the router retries once with a LiteLLM route when the main provider fails.
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-[18px] border border-violet-100 bg-white px-3.5 py-3">
              <p className="text-[12px] font-semibold text-slate-900">Use the Social Reply tool for tagged post comments</p>
              <p className="mt-1 text-[11px] leading-5 text-slate-600">
                When your social AI account is tagged in a post or comment, the mention worker now looks for a
                {" "}
                <span className="font-semibold text-slate-900">Social Reply</span>
                {" "}
                route first and uses the platform key linked to that route. Enabled providers here also show up inside
                user settings for per-profile mention replies.
              </p>
            </div>

            <div className="grid gap-3">
              <div className="grid gap-2 sm:grid-cols-2">
                <label className="grid gap-1.5">
                  <span className="text-[10px] font-medium uppercase tracking-[0.16em] text-slate-500">Provider</span>
                  <select
                    value={routeForm.providerSlug}
                    onChange={(event) => {
                      const nextProviderSlug = event.target.value as AiTeacherProviderSlug;
                      const meta = config.providers.find((item) => item.slug === nextProviderSlug);
                      const matchingKeys = config.platform_keys.filter(
                        (item) => item.provider_slug === nextProviderSlug && item.is_active
                      );
                      setRouteForm((current) => ({
                        ...current,
                        providerSlug: nextProviderSlug,
                        providerKeyId: meta?.requires_api_key ? matchingKeys[0]?.id || "" : "",
                        supportsVision: meta?.supports_vision ?? current.supportsVision,
                        fallbackToLitellm: nextProviderSlug !== "litellm",
                      }));
                    }}
                    className="input-shell"
                  >
                    {config.providers.map((item) => (
                      <option key={item.slug} value={item.slug}>
                        {item.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="grid gap-1.5">
                  <span className="text-[10px] font-medium uppercase tracking-[0.16em] text-slate-500">Route label</span>
                  <input
                    value={routeForm.label}
                    onChange={(event) => setRouteForm((current) => ({ ...current, label: event.target.value }))}
                    className="input-shell"
                    placeholder="Fast summary route"
                  />
                </label>
              </div>

              {selectedRouteProvider?.requires_api_key ? (
                <label className="grid gap-1.5">
                  <span className="text-[10px] font-medium uppercase tracking-[0.16em] text-slate-500">Platform key</span>
                  <select
                    value={routeForm.providerKeyId}
                    onChange={(event) => setRouteForm((current) => ({ ...current, providerKeyId: event.target.value }))}
                    className="input-shell"
                  >
                    <option value="">Select platform key</option>
                    {routeProviderKeys.map((key) => (
                      <option key={key.id} value={key.id}>
                        {key.label} · {key.provider}
                      </option>
                    ))}
                  </select>
                </label>
              ) : (
                <div className="rounded-[16px] border border-emerald-200 bg-emerald-50 px-3.5 py-3 text-[11px] text-emerald-800">
                  {selectedRouteProvider?.label || "This provider"} does not need a saved key. The router will call it directly from the provider config.
                </div>
              )}

              <div className="grid gap-2 sm:grid-cols-2">
                <label className="grid gap-1.5">
                  <span className="text-[10px] font-medium uppercase tracking-[0.16em] text-slate-500">Tool</span>
                  <select
                    value={routeForm.toolType}
                    onChange={(event) =>
                      setRouteForm((current) => ({ ...current, toolType: event.target.value as AiTeacherRouteToolType }))
                    }
                    className="input-shell"
                  >
                    {ROUTE_TOOL_OPTIONS.map((tool) => (
                      <option key={tool} value={tool}>
                        {toolLabel(tool)}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="grid gap-1.5">
                  <span className="text-[10px] font-medium uppercase tracking-[0.16em] text-slate-500">Priority</span>
                  <select
                    value={routeForm.priority}
                    onChange={(event) =>
                      setRouteForm((current) => ({ ...current, priority: event.target.value as AiTeacherRoutePriority }))
                    }
                    className="input-shell"
                  >
                    {PRIORITY_OPTIONS.map((priority) => (
                      <option key={priority} value={priority}>
                        {priority}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              {routeForm.toolType === "social_reply" ? (
                <div className="rounded-[16px] border border-sky-100 bg-sky-50 px-3.5 py-3 text-[11px] leading-5 text-sky-900">
                  This route powers the AI account reply when someone tags the configured bot username in a post or in a comment.
                  Keep max tokens short and choose the exact platform key you want the social reply API to use.
                </div>
              ) : null}

              <div className="grid gap-2">
                <label className="grid gap-1.5">
                  <span className="text-[10px] font-medium uppercase tracking-[0.16em] text-slate-500">Provider label</span>
                  <input
                    value={routeForm.provider}
                    onChange={(event) => setRouteForm((current) => ({ ...current, provider: event.target.value }))}
                    className="input-shell"
                    placeholder={routeForm.providerSlug}
                  />
                </label>

                <label className="grid gap-1.5">
                  <span className="text-[10px] font-medium uppercase tracking-[0.16em] text-slate-500">Model target</span>
                  <input
                    value={routeForm.modelName}
                    onChange={(event) => setRouteForm((current) => ({ ...current, modelName: event.target.value }))}
                    className="input-shell"
                    placeholder={
                      routeForm.providerSlug === "ollama"
                        ? "llama3.2:latest"
                        : routeForm.providerSlug === "workers_ai"
                          ? "@cf/meta/llama-3.1-8b-instruct"
                          : routeForm.providerSlug === "mimo"
                            ? "mimo-v2-omni"
                            : "openai/gpt-4o-mini"
                    }
                  />
                </label>

                <label className="grid gap-1.5">
                  <span className="text-[10px] font-medium uppercase tracking-[0.16em] text-slate-500">Description</span>
                  <input
                    value={routeForm.description}
                    onChange={(event) => setRouteForm((current) => ({ ...current, description: event.target.value }))}
                    className="input-shell"
                    placeholder="Short admin note"
                  />
                </label>
              </div>

              <div className="grid gap-2 sm:grid-cols-3">
                <label className="grid gap-1.5">
                  <span className="text-[10px] font-medium uppercase tracking-[0.16em] text-slate-500">Temperature</span>
                  <input
                    value={routeForm.temperature}
                    onChange={(event) => setRouteForm((current) => ({ ...current, temperature: event.target.value }))}
                    className="input-shell"
                    inputMode="decimal"
                    placeholder="0.2"
                  />
                </label>
                <label className="grid gap-1.5">
                  <span className="text-[10px] font-medium uppercase tracking-[0.16em] text-slate-500">Max tokens</span>
                  <input
                    value={routeForm.maxOutputTokens}
                    onChange={(event) => setRouteForm((current) => ({ ...current, maxOutputTokens: event.target.value }))}
                    className="input-shell"
                    inputMode="numeric"
                    placeholder="Auto"
                  />
                </label>
                <label className="grid gap-1.5">
                  <span className="text-[10px] font-medium uppercase tracking-[0.16em] text-slate-500">Sort order</span>
                  <input
                    value={routeForm.sortOrder}
                    onChange={(event) => setRouteForm((current) => ({ ...current, sortOrder: event.target.value }))}
                    className="input-shell"
                    inputMode="numeric"
                    placeholder="100"
                  />
                </label>
              </div>

              <label className="grid gap-1.5">
                <span className="text-[10px] font-medium uppercase tracking-[0.16em] text-slate-500">Advanced route JSON</span>
                <textarea
                  value={routeForm.routeConfigText}
                  onChange={(event) => setRouteForm((current) => ({ ...current, routeConfigText: event.target.value }))}
                  className="input-shell min-h-[92px] resize-y"
                  placeholder='Optional. Example: {"keep_alive":"10m"}'
                />
              </label>

              <div className="grid gap-2 sm:grid-cols-3">
                <label className="flex items-center justify-between rounded-[16px] border border-slate-200 bg-slate-50 px-3 py-2.5">
                  <div>
                    <p className="text-[13px] font-semibold text-slate-900">Supports vision</p>
                    <p className="mt-1 text-[10px] text-slate-500">Allow this route for image uploads.</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={routeForm.supportsVision}
                    onChange={(event) => setRouteForm((current) => ({ ...current, supportsVision: event.target.checked }))}
                    className="h-4 w-4 rounded border-slate-300 text-brand focus:ring-brand"
                  />
                </label>

                <label className="flex items-center justify-between rounded-[16px] border border-slate-200 bg-slate-50 px-3 py-2.5">
                  <div>
                    <p className="text-[13px] font-semibold text-slate-900">Route enabled</p>
                    <p className="mt-1 text-[10px] text-slate-500">Saved routes can stay paused.</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={routeForm.isEnabled}
                    onChange={(event) => setRouteForm((current) => ({ ...current, isEnabled: event.target.checked }))}
                    className="h-4 w-4 rounded border-slate-300 text-brand focus:ring-brand"
                  />
                </label>

                <label className="flex items-center justify-between rounded-[16px] border border-slate-200 bg-slate-50 px-3 py-2.5">
                  <div>
                    <p className="text-[13px] font-semibold text-slate-900">LiteLLM fallback</p>
                    <p className="mt-1 text-[10px] text-slate-500">Retry once on LiteLLM if this route fails.</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={routeForm.fallbackToLitellm}
                    onChange={(event) =>
                      setRouteForm((current) => ({ ...current, fallbackToLitellm: event.target.checked }))
                    }
                    className="h-4 w-4 rounded border-slate-300 text-brand focus:ring-brand"
                  />
                </label>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleSaveRoute}
                disabled={savingRoute}
                className="btn-primary inline-flex flex-1 items-center justify-center gap-2 !rounded-full !px-4 !py-2 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {savingRoute ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                {routeForm.id ? "Update route" : "Save route"}
              </button>
              <button
                type="button"
                onClick={() => resetRouteForm(routeForm.providerSlug)}
                className="btn-secondary inline-flex items-center justify-center gap-2 !rounded-full !px-4 !py-2"
              >
                Clear
              </button>
            </div>
          </AdminPanelCard>

          <AdminPanelCard className="space-y-3">
            <AdminSectionHeading
              icon={HardDriveDownload}
              title="Ollama models"
              description="View installed local models and pull or delete them without leaving the admin panel."
              iconClassName="from-amber-500 to-orange-500"
              badge={
                <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-semibold text-amber-700">
                  Local models
                </span>
              }
            />

            <div className="flex gap-2">
              <input
                value={ollamaModelName}
                onChange={(event) => setOllamaModelName(event.target.value)}
                className="input-shell"
                placeholder="llama3.2:latest"
              />
              <button
                type="button"
                onClick={handlePullOllamaModel}
                disabled={pullingOllama}
                className="btn-primary inline-flex items-center justify-center gap-2 !rounded-full !px-4 !py-2 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {pullingOllama ? <Loader2 className="h-4 w-4 animate-spin" /> : <HardDriveDownload className="h-4 w-4" />}
                Pull
              </button>
            </div>

            {loading ? (
              <div className="flex items-center justify-center rounded-[16px] border border-slate-200 bg-slate-50 px-4 py-8 text-slate-500">
                <Loader2 className="h-4 w-4 animate-spin" />
              </div>
            ) : filteredOllamaModels.length ? (
              <div className="space-y-2">
                {filteredOllamaModels.map((item) => (
                  <OllamaModelCard
                    key={`${item.name || item.status || "ollama"}:${item.digest || item.modified_at || ""}`}
                    item={item}
                    deleting={deletingId === `ollama:${item.name}`}
                    onDelete={() => {
                      if (!item.name) {
                        return;
                      }
                      setDeletingId(`ollama:${item.name}`);
                      void deleteAiTeacherOllamaModel(item.name)
                        .then(async () => {
                          toast.success("Ollama model deleted.");
                          await loadConfig(true);
                        })
                        .catch((error) => {
                          toast.error(error instanceof Error ? error.message : "Could not delete Ollama model.");
                        })
                        .finally(() => setDeletingId(null));
                    }}
                  />
                ))}
              </div>
            ) : (
              <div className="rounded-[16px] border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-500">
                No Ollama models found.
              </div>
            )}
          </AdminPanelCard>

          <AdminPanelCard className="space-y-3">
            <AdminSectionHeading
              icon={Coins}
              title="AI Teacher message pricing"
              description="Set the coin cost for platform AI and for user-supplied keys."
              iconClassName="from-amber-500 to-orange-500"
              badge={
                <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-semibold text-amber-700">
                  Per message
                </span>
              }
            />

            <label className="flex items-center justify-between rounded-[16px] border border-slate-200 bg-slate-50 px-3 py-2.5">
              <div className="pr-3">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-[13px] font-semibold text-slate-900">AI Teacher live</p>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                      aiTeacherEnabled ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"
                    }`}
                  >
                    {aiTeacherEnabled ? "Live" : "Paused"}
                  </span>
                </div>
                <p className="mt-1 text-[10px] text-slate-500">
                  Pause all AI Teacher traffic instantly for both platform and user-key mode.
                </p>
              </div>

              <input
                type="checkbox"
                checked={aiTeacherEnabled}
                disabled={savingAvailability}
                onChange={(event) => void handleToggleAvailability(event.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-brand focus:ring-brand disabled:cursor-not-allowed disabled:opacity-60"
              />
            </label>

            {!aiTeacherEnabled ? (
              <div className="rounded-[16px] border border-amber-200 bg-amber-50 px-3 py-2.5">
                <p className="text-[11px] font-semibold text-amber-800">Paused reply shown to users</p>
                <p className="mt-1 text-[11px] leading-5 text-amber-700">{AI_TEACHER_BUSY_MESSAGE}</p>
              </div>
            ) : null}

            <div className="grid gap-2 sm:grid-cols-2">
              <label className="grid gap-1.5">
                <span className="text-[10px] font-medium text-slate-500">Platform AI coins</span>
                <input
                  inputMode="numeric"
                  value={coinDrafts.platform}
                  onChange={(event) => setCoinDrafts((current) => ({ ...current, platform: event.target.value }))}
                  className="input-shell"
                />
              </label>

              <label className="grid gap-1.5">
                <span className="text-[10px] font-medium text-slate-500">User key coins</span>
                <input
                  inputMode="numeric"
                  value={coinDrafts.user}
                  onChange={(event) => setCoinDrafts((current) => ({ ...current, user: event.target.value }))}
                  className="input-shell"
                />
              </label>
            </div>

            <button
              type="button"
              onClick={handleSaveCoins}
              disabled={savingCoins}
              className="btn-primary inline-flex items-center justify-center gap-2 !rounded-full !px-4 !py-2 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {savingCoins ? <Loader2 className="h-4 w-4 animate-spin" /> : <Coins className="h-4 w-4" />}
              Save pricing
            </button>
          </AdminPanelCard>
        </div>
      </div>

      <div className="grid gap-3 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <AdminPanelCard className="space-y-3">
          <AdminSectionHeading
            icon={KeyRound}
            title="Saved platform keys"
            description="Reusable encrypted keys for the provider routes."
            iconClassName="from-sky-500 to-cyan-500"
          />

          {loading ? (
            <div className="flex items-center justify-center rounded-[16px] border border-slate-200 bg-slate-50 px-4 py-8 text-slate-500">
              <Loader2 className="h-4 w-4 animate-spin" />
            </div>
          ) : filteredKeys.length ? (
            <div className="space-y-2">
              {filteredKeys.map((item) => (
                <SavedProviderKeyCard
                  key={item.id}
                  item={item}
                  deleting={deletingId === item.id}
                  onEdit={() =>
                    setKeyForm({
                      id: item.id,
                      providerSlug: item.provider_slug || "litellm",
                      label: item.label,
                      provider: item.provider,
                      apiKey: "",
                      defaultModelName: item.default_model_name || "",
                      apiBase: item.api_base || "",
                      apiVersion: item.api_version || "",
                      isActive: item.is_active,
                    })
                  }
                  onDelete={() => {
                    setDeletingId(item.id);
                    void deleteAiTeacherProviderKey(item.id)
                      .then(async () => {
                        toast.success("Platform key deleted.");
                        if (keyForm.id === item.id) {
                          resetKeyForm();
                        }
                        await loadConfig(true);
                      })
                      .catch((error) => {
                        toast.error(error instanceof Error ? error.message : "Could not delete platform key.");
                      })
                      .finally(() => setDeletingId(null));
                  }}
                />
              ))}
            </div>
          ) : (
            <div className="rounded-[16px] border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-500">
              No platform keys yet.
            </div>
          )}
        </AdminPanelCard>

        <AdminPanelCard className="space-y-3">
          <AdminSectionHeading
            icon={BrainCircuit}
            title="Saved routes"
            description="All active AI Teacher and social reply routes across LiteLLM, Workers AI, MiMo, and Ollama."
            iconClassName="from-violet-500 to-indigo-500"
          />

          {loading ? (
            <div className="flex items-center justify-center rounded-[16px] border border-slate-200 bg-slate-50 px-4 py-8 text-slate-500">
              <Loader2 className="h-4 w-4 animate-spin" />
            </div>
          ) : filteredRoutes.length ? (
            <div className="space-y-2">
              {filteredRoutes.map((item) => (
                <SavedRouteCard
                  key={item.id}
                  item={item}
                  deleting={deletingId === item.id}
                  onEdit={() =>
                    setRouteForm({
                      id: item.id,
                      providerSlug: item.provider_slug || "litellm",
                      providerKeyId: item.provider_key_id || "",
                      label: item.label,
                      description: item.description || "",
                      provider: item.provider || "",
                      toolType: item.tool_type,
                      priority: item.priority,
                      modelName: item.model_name,
                      temperature: String(item.temperature ?? 0.2),
                      maxOutputTokens: item.max_output_tokens ? String(item.max_output_tokens) : "",
                      sortOrder: String(item.sort_order ?? 100),
                      supportsVision: item.supports_vision,
                      isEnabled: item.is_enabled ?? true,
                      fallbackToLitellm: item.fallback_to_litellm ?? true,
                      routeConfigText: item.route_config ? JSON.stringify(item.route_config, null, 2) : "",
                    })
                  }
                  onDelete={() => {
                    setDeletingId(item.id);
                    void deleteAiTeacherModelRoute(item.id)
                      .then(async () => {
                        toast.success("Model route deleted.");
                        if (routeForm.id === item.id) {
                          resetRouteForm(item.provider_slug || "litellm");
                        }
                        await loadConfig(true);
                      })
                      .catch((error) => {
                        toast.error(error instanceof Error ? error.message : "Could not delete model route.");
                      })
                      .finally(() => setDeletingId(null));
                  }}
                />
              ))}
            </div>
          ) : (
            <div className="rounded-[16px] border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-500">
              No routes yet. Enable a provider first, then map it to a tool route.
            </div>
          )}
        </AdminPanelCard>
      </div>
    </section>
  );
}
