import { supabase } from "../../lib/supabase";
import {
  FastApiConnectionError,
  getFastApiUnavailableMessage,
  isFastApiConnectionError,
  resolveFastApiBaseUrls,
} from "../../lib/fastApi";
import type {
  BulkMailerCampaignStatus,
  BulkMailerCampaignRow,
  BulkMailerPlatformSettingsRow,
  BulkMailerTemplateRow,
  BulkMailerUserLimitOverrideRow,
  JsonMap,
  ProfileRow,
} from "../../types/database";
import {
  buildBulkMailerTemplateDraft,
  extractBulkMailerVariables,
  normalizeBulkMailerSlug,
  sanitizeBulkMailerText,
} from "./helpers";
import type {
  BulkMailerAudienceReplacementInput,
  BulkMailerCampaignWithTemplate,
  BulkMailerLogWithCampaign,
  BulkMailerRecipientWithCampaign,
  BulkMailerSendBatchResult,
  BulkMailerSmtpListResponse,
  BulkMailerSmtpProfileInput,
  BulkMailerSmtpProfileSummary,
  BulkMailerSmtpTestResult,
  BulkMailerTemplateWithOwner,
} from "./types";
import { defaultBulkMailerPlatformSettings } from "./types";

type BulkMailerProfileLookup = Pick<
  ProfileRow,
  "id" | "username" | "full_name" | "avatar_url"
>;

function getUniqueBulkMailerIds(values: Array<string | null | undefined>) {
  return Array.from(new Set(values.map((value) => String(value || "").trim()).filter(Boolean)));
}

async function loadBulkMailerProfileLookup(
  userIds: Array<string | null | undefined>
) {
  const ids = getUniqueBulkMailerIds(userIds);
  if (!ids.length) {
    return {} as Record<string, BulkMailerProfileLookup>;
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("id,username,full_name,avatar_url")
    .in("id", ids);

  if (error) {
    throw error;
  }

  return (data || []).reduce<Record<string, BulkMailerProfileLookup>>((accumulator, row) => {
    accumulator[row.id] = row as BulkMailerProfileLookup;
    return accumulator;
  }, {});
}

async function loadBulkMailerTemplateLookup(
  templateIds: Array<string | null | undefined>
) {
  const ids = getUniqueBulkMailerIds(templateIds);
  if (!ids.length) {
    return {} as Record<
      string,
      Pick<BulkMailerTemplateRow, "id" | "name" | "is_shared" | "owner_user_id">
    >;
  }

  const { data, error } = await supabase
    .from("bulk_mailer_templates")
    .select("id,name,is_shared,owner_user_id")
    .in("id", ids);

  if (error) {
    throw error;
  }

  return (data || []).reduce<
    Record<string, Pick<BulkMailerTemplateRow, "id" | "name" | "is_shared" | "owner_user_id">>
  >((accumulator, row) => {
    accumulator[row.id] = row as Pick<BulkMailerTemplateRow, "id" | "name" | "is_shared" | "owner_user_id">;
    return accumulator;
  }, {});
}

async function loadBulkMailerCampaignLookup(
  campaignIds: Array<string | null | undefined>
) {
  const ids = getUniqueBulkMailerIds(campaignIds);
  if (!ids.length) {
    return {} as Record<string, Pick<BulkMailerCampaignRow, "id" | "name" | "status">>;
  }

  const { data, error } = await supabase
    .from("bulk_mailer_campaigns")
    .select("id,name,status")
    .in("id", ids);

  if (error) {
    throw error;
  }

  return (data || []).reduce<Record<string, Pick<BulkMailerCampaignRow, "id" | "name" | "status">>>(
    (accumulator, row) => {
      accumulator[row.id] = row as Pick<BulkMailerCampaignRow, "id" | "name" | "status">;
      return accumulator;
    },
    {}
  );
}

function isMissingBulkMailerEmailConnectionColumnsError(error: unknown) {
  const payload = error as {
    message?: string;
    details?: string;
    hint?: string;
  } | null;
  const text = `${payload?.message || ""} ${payload?.details || ""} ${payload?.hint || ""}`.toLowerCase();

  return (
    text.includes("selected_email_connection_id") ||
    text.includes("resolved_email_connection_id")
  );
}

function buildBulkMailerCampaignPayload(
  input: Partial<BulkMailerCampaignRow>,
  userId: string,
  options?: {
    omitEmailConnectionColumns?: boolean;
  }
) {
  const payload: Partial<BulkMailerCampaignRow> & {
    owner_user_id: string;
    name: string;
    status: BulkMailerCampaignStatus;
    subject: string;
    body_html: string;
    recipient_source: BulkMailerCampaignRow["recipient_source"];
    variable_mapping: JsonMap;
    campaign_settings: JsonMap;
  } = {
    owner_user_id: input.owner_user_id || userId,
    name: (input.name || "").trim(),
    status: input.status || "draft",
    template_id: input.template_id || null,
    selected_smtp_profile_id: input.selected_smtp_profile_id || null,
    subject: (input.subject || "").trim(),
    body_html: input.body_html || "",
    body_text: sanitizeBulkMailerText(input.body_text),
    from_name_override: sanitizeBulkMailerText(input.from_name_override),
    reply_to_email: sanitizeBulkMailerText(input.reply_to_email),
    recipient_source: input.recipient_source || "manual",
    variable_mapping: input.variable_mapping || {},
    campaign_settings: input.campaign_settings || {},
    error_message: sanitizeBulkMailerText(input.error_message),
  };

  if (!options?.omitEmailConnectionColumns && input.selected_email_connection_id) {
    payload.selected_email_connection_id = input.selected_email_connection_id;
  }

  return payload;
}

const BULK_MAILER_INSERT_CHUNK_SIZE = 200;
const BULK_MAILER_SMTP_PROFILE_SELECT = [
  "id",
  "owner_user_id",
  "scope",
  "name",
  "host",
  "port",
  "username",
  "encryption",
  "auth_method",
  "from_name",
  "from_email",
  "reply_to_email",
  "is_active",
  "is_default_fallback",
  "rate_limit_per_minute",
  "rate_limit_per_hour",
  "daily_limit",
  "monthly_limit",
  "total_sent_count",
  "total_failed_count",
  "last_used_at",
  "last_tested_at",
  "last_test_status",
  "last_test_error",
  "created_by",
  "updated_by",
  "created_at",
  "updated_at",
].join(",");

// ---------------------------------------------------------------------------
// FastAPI Backend Base URL
// ---------------------------------------------------------------------------

function getBulkMailerApiBaseUrls(): string[] {
  return resolveFastApiBaseUrls({
    proxyPrefix: "/__bulk-mailer-api-proxy",
    envKeys: [
      "VITE_BULK_MAILER_API_BASE_URL",
      "VITE_BACKEND_BASE_URL",
      "VITE_FASTAPI_API_BASE_URL",
    ],
    errorMessage:
      "Bulk Mailer backend is not configured. Set VITE_BACKEND_BASE_URL or VITE_FASTAPI_API_BASE_URL for production or run the local FastAPI server for development.",
  });
}

function isLoopbackBulkMailerBaseUrl(value: string) {
  try {
    const parsed = new URL(value, typeof window === "undefined" ? "http://localhost" : window.location.origin);
    return parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1" || parsed.hostname === "::1";
  } catch {
    return false;
  }
}

function getBulkMailerAttemptTimeout(baseUrl: string, attemptIndex: number, totalAttempts: number, fallbackTimeout: number) {
  if (attemptIndex >= totalAttempts - 1) {
    return fallbackTimeout;
  }

  return Math.min(fallbackTimeout, isLoopbackBulkMailerBaseUrl(baseUrl) ? 3500 : 6000);
}

async function fetchBulkMailerApiResponse(
  path: string,
  init: RequestInit,
  timeoutMs: number,
  timeoutMessage: string
) {
  const baseUrls = getBulkMailerApiBaseUrls();

  for (let index = 0; index < baseUrls.length; index += 1) {
    const baseUrl = baseUrls[index];
    const controller = new AbortController();
    const timeout = window.setTimeout(
      () => controller.abort(),
      getBulkMailerAttemptTimeout(baseUrl, index, baseUrls.length, timeoutMs)
    );

    try {
      const response = await fetch(`${baseUrl}${path}`, {
        ...init,
        cache: "no-store",
        signal: init.signal ?? controller.signal,
      });

      // In development we try the Vite proxy first. If that proxy path is not
      // mounted and returns a 404, fall through to the next configured base URL
      // instead of surfacing a false "Bulk Mailer is broken" error immediately.
      if (
        response.status === 404 &&
        index < baseUrls.length - 1 &&
        baseUrl.startsWith("/")
      ) {
        continue;
      }

      return response;
    } catch (error) {
      const isLastAttempt = index >= baseUrls.length - 1;

      if (error instanceof DOMException && error.name === "AbortError") {
        if (!isLastAttempt) {
          continue;
        }

        throw new Error(timeoutMessage);
      }

      if (isFastApiConnectionError(error)) {
        if (!isLastAttempt) {
          continue;
        }

        throw new FastApiConnectionError(getFastApiUnavailableMessage("Bulk Mailer"));
      }

      throw error;
    } finally {
      window.clearTimeout(timeout);
    }
  }

  throw new FastApiConnectionError(getFastApiUnavailableMessage("Bulk Mailer"));
}

// ---------------------------------------------------------------------------
// Auth & HTTP helpers
// ---------------------------------------------------------------------------

async function getAccessToken() {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (session?.access_token) {
    return session.access_token;
  }

  const {
    data: { session: refreshedSession },
  } = await supabase.auth.refreshSession().catch(() => ({ data: { session: null } }));

  return refreshedSession?.access_token || null;
}

async function requireCurrentUserId() {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Sign in to use Bulk Mailer.");
  }

  return user.id;
}

async function parseApiResponse<T>(response: Response): Promise<T> {
  const payload = (await response.json().catch(() => ({}))) as {
    error?: string;
    detail?: string;
    data?: T;
  };

  if (!response.ok) {
    throw new Error(
      payload.detail || payload.error || `Request failed (${response.status}).`
    );
  }

  return payload.data as T;
}

async function callBulkMailerApi<T>(
  path: string,
  body: JsonMap,
  method: string = "POST"
): Promise<T> {
  const accessToken = await getAccessToken();

  if (!accessToken) {
    throw new Error("Sign in to use Bulk Mailer.");
  }

  try {
    const response = await fetchBulkMailerApiResponse(
      path,
      {
        method,
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      },
      20000,
      "Bulk Mailer backend did not respond in time. Check the FastAPI server and try again."
    );

    return parseApiResponse<T>(response);
  } catch (error) {
    if (error instanceof FastApiConnectionError) {
      throw error;
    }

    if (error instanceof DOMException && error.name === "AbortError") {
      throw new Error("Bulk Mailer backend did not respond in time. Check the FastAPI server and try again.");
    }

    if (isFastApiConnectionError(error)) {
      throw new FastApiConnectionError(getFastApiUnavailableMessage("Bulk Mailer"));
    }

    throw error;
  }
}

async function callBulkMailerApiGet<T>(path: string): Promise<T> {
  const accessToken = await getAccessToken();

  if (!accessToken) {
    throw new Error("Sign in to use Bulk Mailer.");
  }

  try {
    const response = await fetchBulkMailerApiResponse(
      path,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
      12000,
      "Bulk Mailer backend did not respond in time. Check the FastAPI server and try again."
    );

    return parseApiResponse<T>(response);
  } catch (error) {
    if (error instanceof FastApiConnectionError) {
      throw new FastApiConnectionError(getFastApiUnavailableMessage("Bulk Mailer"));
    }

    throw error;
  }
}

// ---------------------------------------------------------------------------
// Templates (direct Supabase — unchanged)
// ---------------------------------------------------------------------------

export async function listBulkMailerTemplates(input?: {
  ownerUserId?: string;
}) {
  let query = supabase
    .from("bulk_mailer_templates")
    .select("*")
    .order("updated_at", { ascending: false });

  if (input?.ownerUserId) {
    query = query.eq("owner_user_id", input.ownerUserId);
  }

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  const rows = (data || []) as BulkMailerTemplateRow[];
  const ownerLookup = await loadBulkMailerProfileLookup(rows.map((row) => row.owner_user_id));

  return rows.map((row) => ({
    ...row,
    owner: ownerLookup[row.owner_user_id] || null,
  })) as BulkMailerTemplateWithOwner[];
}

export async function saveBulkMailerTemplate(
  input: Partial<BulkMailerTemplateRow>
) {
  const userId = await requireCurrentUserId();
  const draft = buildBulkMailerTemplateDraft(input);
  const payload = {
    owner_user_id: input.owner_user_id || userId,
    name: (draft.name || "").trim(),
    slug: normalizeBulkMailerSlug(draft.slug || draft.name || ""),
    description: sanitizeBulkMailerText(draft.description),
    subject: (draft.subject || "").trim(),
    body_html: draft.body_html || "",
    body_text: sanitizeBulkMailerText(draft.body_text),
    category: sanitizeBulkMailerText(draft.category) || "general",
    available_variables:
      draft.available_variables ||
      extractBulkMailerVariables({
        subject: draft.subject,
        bodyHtml: draft.body_html,
      }),
    sample_variables: draft.sample_variables || {},
    is_active: draft.is_active ?? true,
    is_shared: draft.is_shared ?? false,
    created_by: input.created_by || userId,
    updated_by: userId,
  };

  if (!payload.name || !payload.subject || !payload.body_html) {
    throw new Error("Template name, subject, and email body are required.");
  }

  if (input.id) {
    const { data, error } = await supabase
      .from("bulk_mailer_templates")
      .update(payload)
      .eq("id", input.id)
      .select("*")
      .single();

    if (error) {
      throw error;
    }

    return data as BulkMailerTemplateRow;
  }

  const { data, error } = await supabase
    .from("bulk_mailer_templates")
    .insert(payload)
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return data as BulkMailerTemplateRow;
}

export async function deleteBulkMailerTemplate(templateId: string) {
  const { error } = await supabase
    .from("bulk_mailer_templates")
    .delete()
    .eq("id", templateId);

  if (error) {
    throw error;
  }
}

// ---------------------------------------------------------------------------
// Campaigns (direct Supabase — unchanged)
// ---------------------------------------------------------------------------

export async function listBulkMailerCampaigns(input?: {
  ownerUserId?: string;
  limit?: number;
}) {
  let query = supabase
    .from("bulk_mailer_campaigns")
    .select("*")
    .order("created_at", { ascending: false });

  if (input?.ownerUserId) {
    query = query.eq("owner_user_id", input.ownerUserId);
  }

  if (typeof input?.limit === "number") {
    query = query.limit(input.limit);
  }

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  const rows = (data || []) as BulkMailerCampaignRow[];
  const [templateLookup, ownerLookup] = await Promise.all([
    loadBulkMailerTemplateLookup(rows.map((row) => row.template_id)),
    loadBulkMailerProfileLookup(rows.map((row) => row.owner_user_id)),
  ]);

  return rows.map((row) => {
    const owner = ownerLookup[row.owner_user_id];
    return {
      ...row,
      template: row.template_id ? templateLookup[row.template_id] || null : null,
      owner: owner
        ? {
            id: owner.id,
            username: owner.username,
            full_name: owner.full_name,
          }
        : null,
    };
  }) as BulkMailerCampaignWithTemplate[];
}

export async function saveBulkMailerCampaign(
  input: Partial<BulkMailerCampaignRow>
) {
  const userId = await requireCurrentUserId();
  const payload = buildBulkMailerCampaignPayload(input, userId);

  if (!payload.name || !payload.subject || !payload.body_html) {
    throw new Error("Campaign name, subject, and email body are required.");
  }

  if (input.id) {
    const attemptUpdate = async (nextPayload: Partial<BulkMailerCampaignRow>) =>
      supabase
        .from("bulk_mailer_campaigns")
        .update(nextPayload)
        .eq("id", input.id)
        .select("*")
        .single();

    let result = await attemptUpdate(payload);
    if (result.error && isMissingBulkMailerEmailConnectionColumnsError(result.error)) {
      if (input.selected_email_connection_id || input.resolved_email_connection_id) {
        throw new Error(
          "This database still needs the Bulk Mailer Student Email sender migration before that sender can be used."
        );
      }

      result = await attemptUpdate(
        buildBulkMailerCampaignPayload(input, userId, { omitEmailConnectionColumns: true })
      );
    }

    if (result.error) {
      throw result.error;
    }

    return result.data as BulkMailerCampaignRow;
  }

  const attemptInsert = async (nextPayload: Partial<BulkMailerCampaignRow>) =>
    supabase
      .from("bulk_mailer_campaigns")
      .insert(nextPayload)
      .select("*")
      .single();

  let result = await attemptInsert(payload);
  if (result.error && isMissingBulkMailerEmailConnectionColumnsError(result.error)) {
    if (input.selected_email_connection_id || input.resolved_email_connection_id) {
      throw new Error(
        "This database still needs the Bulk Mailer Student Email sender migration before that sender can be used."
      );
    }

    result = await attemptInsert(
      buildBulkMailerCampaignPayload(input, userId, { omitEmailConnectionColumns: true })
    );
  }

  if (result.error) {
    throw result.error;
  }

  return result.data as BulkMailerCampaignRow;
}

export async function deleteBulkMailerCampaign(campaignId: string) {
  const { error } = await supabase
    .from("bulk_mailer_campaigns")
    .delete()
    .eq("id", campaignId);

  if (error) {
    throw error;
  }
}

// ---------------------------------------------------------------------------
// Recipients (direct Supabase — unchanged)
// ---------------------------------------------------------------------------

export async function listBulkMailerRecipients(campaignId: string) {
  const { data, error } = await supabase
    .from("bulk_mailer_campaign_recipients")
    .select("*")
    .eq("campaign_id", campaignId)
    .order("created_at", { ascending: true });

  if (error) {
    throw error;
  }

  const rows = data || [];
  const campaignLookup = await loadBulkMailerCampaignLookup([campaignId]);

  return rows.map((row) => ({
    ...row,
    campaign: campaignLookup[campaignId] || null,
  })) as BulkMailerRecipientWithCampaign[];
}

export async function replaceBulkMailerAudience(
  input: BulkMailerAudienceReplacementInput
) {
  const deleteResult = await supabase
    .from("bulk_mailer_campaign_recipients")
    .delete()
    .eq("campaign_id", input.campaignId);

  if (deleteResult.error) {
    throw deleteResult.error;
  }

  for (
    let start = 0;
    start < input.recipients.length;
    start += BULK_MAILER_INSERT_CHUNK_SIZE
  ) {
    const chunk = input.recipients.slice(
      start,
      start + BULK_MAILER_INSERT_CHUNK_SIZE
    );

    const { error } = await supabase
      .from("bulk_mailer_campaign_recipients")
      .insert(
        chunk.map((entry) => ({
          campaign_id: input.campaignId,
          owner_user_id: input.ownerUserId,
          recipient_email: entry.recipient_email.trim(),
          recipient_name: sanitizeBulkMailerText(entry.recipient_name),
          variable_payload: entry.variable_payload || {},
          source_index: entry.source_index ?? null,
          source_label: sanitizeBulkMailerText(entry.source_label),
        }))
      );

    if (error) {
      throw error;
    }
  }
}

// ---------------------------------------------------------------------------
// Send logs (direct Supabase — unchanged)
// ---------------------------------------------------------------------------

export async function listBulkMailerLogs(input?: {
  ownerUserId?: string;
  campaignId?: string;
  limit?: number;
}) {
  let query = supabase
    .from("bulk_mailer_send_logs")
    .select("*")
    .order("created_at", { ascending: false });

  if (input?.ownerUserId) {
    query = query.eq("sender_user_id", input.ownerUserId);
  }

  if (input?.campaignId) {
    query = query.eq("campaign_id", input.campaignId);
  }

  if (typeof input?.limit === "number") {
    query = query.limit(input.limit);
  }

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  const rows = data || [];
  const campaignLookup = await loadBulkMailerCampaignLookup(rows.map((row) => row.campaign_id));

  return rows.map((row) => ({
    ...row,
    campaign: row.campaign_id ? campaignLookup[row.campaign_id] || null : null,
  })) as BulkMailerLogWithCampaign[];
}

// ---------------------------------------------------------------------------
// Platform settings (direct Supabase — unchanged)
// ---------------------------------------------------------------------------

export async function loadBulkMailerPlatformSettings() {
  const { data, error } = await supabase
    .from("bulk_mailer_platform_settings")
    .select("*")
    .eq("id", 1)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return (data ||
    defaultBulkMailerPlatformSettings) as BulkMailerPlatformSettingsRow;
}

export async function saveBulkMailerPlatformSettings(
  input: Partial<BulkMailerPlatformSettingsRow>
) {
  const payload = {
    id: 1,
    ...input,
  };

  const { data, error } = await supabase
    .from("bulk_mailer_platform_settings")
    .upsert(payload, { onConflict: "id" })
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return data as BulkMailerPlatformSettingsRow;
}

// ---------------------------------------------------------------------------
// User limit overrides (direct Supabase — unchanged)
// ---------------------------------------------------------------------------

export async function listBulkMailerUserOverrides() {
  const { data, error } = await supabase
    .from("bulk_mailer_user_limit_overrides")
    .select(
      "*, profile:profiles!bulk_mailer_user_limit_overrides_user_id_fkey(id,username,full_name,avatar_url)"
    )
    .order("updated_at", { ascending: false });

  if (error) {
    throw error;
  }

  return (data || []) as Array<
    BulkMailerUserLimitOverrideRow & { profile?: JsonMap | null }
  >;
}

export async function loadBulkMailerUserOverride(userId: string) {
  const { data, error } = await supabase
    .from("bulk_mailer_user_limit_overrides")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return (data || null) as BulkMailerUserLimitOverrideRow | null;
}

export async function saveBulkMailerUserOverride(
  input: Partial<BulkMailerUserLimitOverrideRow>
) {
  const userId = await requireCurrentUserId();

  if (!input.user_id) {
    throw new Error("Choose a user for the limit override.");
  }

  const payload = {
    user_id: input.user_id,
    hourly_send_limit: input.hourly_send_limit ?? null,
    daily_send_limit: input.daily_send_limit ?? null,
    campaign_recipient_limit: input.campaign_recipient_limit ?? null,
    max_smtp_profiles: input.max_smtp_profiles ?? null,
    max_templates: input.max_templates ?? null,
    max_campaigns_per_day: input.max_campaigns_per_day ?? null,
    sending_enabled: input.sending_enabled ?? true,
    override_note: sanitizeBulkMailerText(input.override_note),
    created_by: input.created_by || userId,
    updated_by: userId,
  };

  const { data, error } = await supabase
    .from("bulk_mailer_user_limit_overrides")
    .upsert(payload, { onConflict: "user_id" })
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return data as BulkMailerUserLimitOverrideRow;
}

export async function deleteBulkMailerUserOverride(overrideId: string) {
  const { error } = await supabase
    .from("bulk_mailer_user_limit_overrides")
    .delete()
    .eq("id", overrideId);

  if (error) {
    throw error;
  }
}

// ---------------------------------------------------------------------------
// SMTP Profiles (via FastAPI backend)
// ---------------------------------------------------------------------------

export async function listBulkMailerSmtpProfiles() {
  try {
    const data = await callBulkMailerApiGet<BulkMailerSmtpListResponse>(
      "/api/bulk-mailer/smtp/profiles"
    );
    return data.profiles || [];
  } catch (apiError) {
    if (!isFastApiConnectionError(apiError)) {
      console.warn(
        "Bulk Mailer API profile list failed, falling back to direct Supabase read.",
        apiError
      );
    }

    const { data, error } = await supabase
      .from("bulk_mailer_smtp_profiles")
      .select(BULK_MAILER_SMTP_PROFILE_SELECT)
      .order("created_at", { ascending: false });

    if (error) {
      throw error;
    }

    return (data || []) as BulkMailerSmtpProfileSummary[];
  }
}

export async function saveBulkMailerSmtpProfile(
  input: BulkMailerSmtpProfileInput
) {
  return callBulkMailerApi<BulkMailerSmtpProfileSummary>(
    "/api/bulk-mailer/smtp",
    {
      action: "save",
      profile: input,
    }
  );
}

export async function testBulkMailerSmtpProfile(input: {
  id?: string;
  profile?: BulkMailerSmtpProfileInput;
}) {
  return callBulkMailerApi<BulkMailerSmtpTestResult>("/api/bulk-mailer/smtp", {
    action: "test",
    profile_id: input.id || null,
    profile: input.profile || null,
  });
}

export async function deleteBulkMailerSmtpProfile(profileId: string) {
  await callBulkMailerApi<{ deleted: boolean }>("/api/bulk-mailer/smtp", {
    action: "delete",
    profile_id: profileId,
  });
}

// ---------------------------------------------------------------------------
// Campaign send (via FastAPI backend)
// ---------------------------------------------------------------------------

export async function processBulkMailerCampaignBatch(
  campaignId: string,
  batchSize = 20
) {
  return callBulkMailerApi<BulkMailerSendBatchResult>(
    "/api/bulk-mailer/send",
    {
      action: "send_campaign",
      campaign_id: campaignId,
      batch_size: batchSize,
    }
  );
}

export async function runBulkMailerCampaignUntilSettled(
  campaignId: string,
  options?: {
    batchSize?: number;
    maxBatches?: number;
    onProgress?: (result: BulkMailerSendBatchResult) => void;
  }
) {
  const batchSize = Math.max(1, Math.min(options?.batchSize || 20, 100));
  const maxBatches = Math.max(1, options?.maxBatches || 500);
  let latestResult: BulkMailerSendBatchResult | null = null;

  for (let batchIndex = 0; batchIndex < maxBatches; batchIndex += 1) {
    latestResult = await processBulkMailerCampaignBatch(campaignId, batchSize);
    options?.onProgress?.(latestResult);

    if (latestResult.remaining_count <= 0) {
      return latestResult;
    }

    if (
      latestResult.status === "paused" ||
      latestResult.status === "failed" ||
      latestResult.status === "cancelled"
    ) {
      return latestResult;
    }
  }

  return latestResult;
}
