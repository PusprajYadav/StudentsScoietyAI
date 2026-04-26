import { supabase } from "./supabase";
import type {
  CoinFeatureAccessRow,
  CoinFeatureSettingRow,
  CoinTransactionRow,
  CoinWalletRow,
  UserReferralRow,
} from "../types/database";

export const COIN_FEATURE_KEYS = {
  postCreate: "post_create",
  communityCreate: "community_create",
  postEdit: "post_edit",
  chatRequestSend: "chat_request_send",
  studentResumeCreate: "student_resume_create",
  studentPortfolioCreate: "student_portfolio_create",
  bulkMailerEmailSend: "bulk_mailer_email_send",
  verificationRequestSubmit: "verification_request_submit",
  instagramAutomationDayPass: "instagram_automation_day_pass",
  instagramAutomationWeekPass: "instagram_automation_week_pass",
  instagramAutomationMonthPass: "instagram_automation_month_pass",
  instagramAutomationYearPass: "instagram_automation_year_pass",
} as const;

export const COIN_ACCESS_KEYS = {
  instagramAutomation: "instagram_automation_access",
} as const;

export type CoinFeatureKey = (typeof COIN_FEATURE_KEYS)[keyof typeof COIN_FEATURE_KEYS];
export type CoinAccessKey = (typeof COIN_ACCESS_KEYS)[keyof typeof COIN_ACCESS_KEYS];

function extractSupabaseErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  if (error && typeof error === "object") {
    const message =
      "message" in error && typeof error.message === "string" ? error.message.trim() : "";
    const details =
      "details" in error && typeof error.details === "string" ? error.details.trim() : "";
    const hint = "hint" in error && typeof error.hint === "string" ? error.hint.trim() : "";

    const pieces = [message, details, hint].filter(Boolean);
    if (pieces.length > 0) {
      return pieces.join(" ");
    }
  }

  return fallback;
}

async function ensureAuthenticatedCoinSession() {
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();

  if (error) {
    throw new Error(extractSupabaseErrorMessage(error, "Sign in to use wallet features."));
  }

  const expiresAtMs = (session?.expires_at || 0) * 1000;
  if (session?.access_token && expiresAtMs > Date.now() + 30_000) {
    return session;
  }

  const { data: refreshed, error: refreshError } = await supabase.auth.refreshSession();

  if (refreshError) {
    throw new Error(extractSupabaseErrorMessage(refreshError, "Sign in to use wallet features."));
  }

  if (!refreshed.session?.access_token) {
    throw new Error("Sign in to use wallet features.");
  }

  return refreshed.session;
}

export function formatCoinAmount(value: number) {
  return `${value} coin${value === 1 ? "" : "s"}`;
}

export function normalizeReferralCode(value: string) {
  return value.replace(/[^a-z0-9]/gi, "").toUpperCase().slice(0, 16);
}

export function findCoinFeatureSetting(
  settings: CoinFeatureSettingRow[],
  featureKey: string
) {
  return settings.find((entry) => entry.feature_key === featureKey) || null;
}

export function getCoinCostLabel(
  settings: CoinFeatureSettingRow[],
  featureKey: string,
  fallback = "Free"
) {
  const setting = findCoinFeatureSetting(settings, featureKey);

  if (!setting || !setting.is_enabled || setting.coins_required <= 0) {
    return fallback;
  }

  return formatCoinAmount(setting.coins_required);
}

export function hasActiveCoinAccess(
  access: CoinFeatureAccessRow[],
  accessKey: string,
  at = new Date()
) {
  return access.some((entry) => entry.access_key === accessKey && new Date(entry.expires_at) > at);
}

export function getActiveCoinAccess(
  access: CoinFeatureAccessRow[],
  accessKey: string,
  at = new Date()
) {
  return (
    access
      .filter((entry) => entry.access_key === accessKey && new Date(entry.expires_at) > at)
      .sort((left, right) => right.expires_at.localeCompare(left.expires_at))[0] || null
  );
}

export async function loadCoinFeatureSettings() {
  const { data, error } = await supabase
    .from("coin_feature_settings")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("feature_name", { ascending: true });

  if (error) {
    throw error;
  }

  return (data || []) as CoinFeatureSettingRow[];
}

export async function saveCoinFeatureSettings(settings: CoinFeatureSettingRow[]) {
  if (settings.length === 0) {
    return [];
  }

  const { data, error } = await supabase
    .from("coin_feature_settings")
    .upsert(settings, {
      onConflict: "feature_key",
      ignoreDuplicates: false,
    })
    .select("*")
    .order("sort_order", { ascending: true })
    .order("feature_name", { ascending: true });

  if (error) {
    throw error;
  }

  return (data || []) as CoinFeatureSettingRow[];
}

export async function loadCoinWallet(userId: string) {
  const { data, error } = await supabase
    .from("coin_wallets")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return (data as CoinWalletRow | null) || null;
}

export async function loadCoinWalletsForUsers(userIds: string[]) {
  if (userIds.length === 0) {
    return [] as CoinWalletRow[];
  }

  const { data, error } = await supabase
    .from("coin_wallets")
    .select("*")
    .in("user_id", Array.from(new Set(userIds)));

  if (error) {
    throw error;
  }

  return (data || []) as CoinWalletRow[];
}

export async function loadCoinTransactions(
  userId: string,
  limit = 20,
  offset = 0
) {
  const { data, error } = await supabase
    .from("coin_transactions")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    throw error;
  }

  return (data || []) as CoinTransactionRow[];
}

export async function loadCoinAccess(userId: string) {
  const nowIso = new Date().toISOString();
  const { data, error } = await supabase
    .from("coin_feature_access")
    .select("*")
    .eq("user_id", userId)
    .gt("expires_at", nowIso)
    .order("expires_at", { ascending: false });

  if (error) {
    throw error;
  }

  return (data || []) as CoinFeatureAccessRow[];
}

export async function loadUserReferrals(userId: string) {
  const { data, error } = await supabase
    .from("user_referrals")
    .select("*")
    .eq("referrer_user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return (data || []) as UserReferralRow[];
}

export async function purchaseFeatureAccess(featureKey: string) {
  await ensureAuthenticatedCoinSession();

  const { data, error } = await supabase.rpc("purchase_feature_access", {
    target_feature_key: featureKey,
  });

  if (error) {
    throw new Error(extractSupabaseErrorMessage(error, "Could not activate this pass."));
  }

  if (Array.isArray(data)) {
    return data[0] || null;
  }

  return data || null;
}

export async function adminAdjustUserCoins(input: {
  userId: string;
  amountDelta: number;
  note?: string | null;
  metadata?: Record<string, unknown>;
}) {
  await ensureAuthenticatedCoinSession();

  const { data, error } = await supabase.rpc("admin_adjust_user_coins", {
    target_user_id: input.userId,
    amount_delta: input.amountDelta,
    adjustment_note: input.note || null,
    adjustment_metadata: input.metadata || {},
  });

  if (error) {
    throw new Error(extractSupabaseErrorMessage(error, "Could not update wallet balance."));
  }

  return data as CoinTransactionRow;
}
