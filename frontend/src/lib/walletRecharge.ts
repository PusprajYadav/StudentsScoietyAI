import { format } from "date-fns";
import { supabase } from "./supabase";
import type {
  ProfileRow,
  WalletRechargeRequestRow,
  WalletUpiSettingRow,
} from "../types/database";

export const WALLET_RECHARGE_PRESET_AMOUNTS = [100, 500, 1000, 2000] as const;
export const MAX_WALLET_RECHARGE_COINS = 10000;

export interface WalletRechargeRequestWithUser extends WalletRechargeRequestRow {
  user: Pick<ProfileRow, "id" | "username" | "full_name" | "avatar_url"> | null;
}

function normalizeText(value: string | null | undefined) {
  return value?.trim() || null;
}

function resolveWalletRechargeErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message.trim()) {
    return error.message.trim();
  }

  if (error && typeof error === "object") {
    const message =
      "message" in error && typeof error.message === "string"
        ? error.message.trim()
        : "";
    const code =
      "code" in error && typeof error.code === "string" ? error.code.trim() : "";
    const details =
      "details" in error && typeof error.details === "string"
        ? error.details.trim()
        : "";

    if (code === "PGRST202" || message.includes("Could not find the function")) {
      return "Wallet approval is not available yet on this Supabase API. Refresh the app or reload the latest database schema.";
    }

    if (message) {
      return details ? `${message} ${details}` : message;
    }
  }

  if (typeof error === "string" && error.trim()) {
    return error.trim();
  }

  return fallback;
}

function toWalletRechargeError(error: unknown, fallback: string) {
  return new Error(resolveWalletRechargeErrorMessage(error, fallback));
}

export function clampWalletRechargeCoins(value: number) {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.max(1, Math.min(MAX_WALLET_RECHARGE_COINS, Math.floor(value)));
}

export function createWalletRechargeOrderId(at = new Date()) {
  const suffix = Math.random().toString(36).slice(2, 10).toUpperCase();
  return `WR-${format(at, "yyyyMMdd")}-${suffix}`;
}

export function getWalletRechargeStatusLabel(
  status: WalletRechargeRequestRow["status"]
) {
  switch (status) {
    case "approved":
      return "Approved";
    case "rejected":
      return "Rejected";
    default:
      return "Pending";
  }
}

export function buildWalletRechargeUpiLink(
  setting: Pick<WalletUpiSettingRow, "upi_id" | "merchant_name">,
  coins: number,
  orderId: string
) {
  const normalizedCoins = clampWalletRechargeCoins(coins);
  const transactionNote = `Student Society wallet ${orderId}`;

  return `upi://pay?pa=${encodeURIComponent(setting.upi_id)}&pn=${encodeURIComponent(
    setting.merchant_name
  )}&am=${normalizedCoins.toFixed(2)}&cu=INR&tn=${encodeURIComponent(
    transactionNote
  )}`;
}

export async function loadActiveWalletUpiSettings() {
  const { data, error } = await supabase
    .from("wallet_upi_settings")
    .select("*")
    .eq("is_active", true)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });

  if (error) {
    throw toWalletRechargeError(error, "Could not load active wallet UPI settings.");
  }

  return (data || []) as WalletUpiSettingRow[];
}

export async function loadActiveWalletUpiSetting() {
  const items = await loadActiveWalletUpiSettings();
  return items[0] || null;
}

export async function loadWalletUpiSettingsForAdmin() {
  const { data, error } = await supabase
    .from("wallet_upi_settings")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });

  if (error) {
    throw toWalletRechargeError(error, "Could not load wallet UPI settings.");
  }

  return (data || []) as WalletUpiSettingRow[];
}

export async function loadWalletUpiSettingForAdmin() {
  const items = await loadWalletUpiSettingsForAdmin();
  return items[0] || null;
}

export async function saveWalletUpiSetting(input: {
  id?: number | null;
  upiId: string;
  merchantName: string;
  isActive: boolean;
  sortOrder?: number | null;
}) {
  const { data, error } = await supabase
    .from("wallet_upi_settings")
    .upsert(
      {
        id: input.id || undefined,
        upi_id: input.upiId.trim(),
        merchant_name: input.merchantName.trim() || "Student Society",
        is_active: input.isActive,
        sort_order: Math.max(0, Number(input.sortOrder || 100) || 100),
      },
      {
        onConflict: "id",
        ignoreDuplicates: false,
      }
    )
    .select("*")
    .single();

  if (error) {
    throw toWalletRechargeError(error, "Could not save wallet UPI settings.");
  }

  return data as WalletUpiSettingRow;
}

export async function deleteWalletUpiSetting(id: number) {
  const { error } = await supabase
    .from("wallet_upi_settings")
    .delete()
    .eq("id", id);

  if (error) {
    throw toWalletRechargeError(error, "Could not delete wallet UPI setting.");
  }
}

export async function loadWalletRechargeRequests(userId: string, limit = 10) {
  const { data, error } = await supabase
    .from("wallet_recharge_requests")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw toWalletRechargeError(error, "Could not load wallet recharge requests.");
  }

  return (data || []) as WalletRechargeRequestRow[];
}

export async function loadAdminWalletRechargeRequests(limit = 40) {
  const { data, error } = await supabase
    .from("wallet_recharge_requests")
    .select(
      "*, user:profiles!wallet_recharge_requests_user_id_fkey(id,username,full_name,avatar_url)"
    )
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw toWalletRechargeError(error, "Could not load admin wallet recharge requests.");
  }

  return (data || []) as WalletRechargeRequestWithUser[];
}

export async function createWalletRechargeRequest(input: {
  orderId: string;
  userId: string;
  coinsRequested: number;
  upiSetting: Pick<WalletUpiSettingRow, "upi_id" | "merchant_name">;
  upiReference: string;
  paymentNote?: string | null;
  qrPayload: string;
}) {
  const normalizedCoins = clampWalletRechargeCoins(input.coinsRequested);
  const { data, error } = await supabase
    .from("wallet_recharge_requests")
    .insert({
      order_id: input.orderId.trim(),
      user_id: input.userId,
      coins_requested: normalizedCoins,
      upi_id_used: input.upiSetting.upi_id.trim(),
      merchant_name_used: input.upiSetting.merchant_name.trim(),
      qr_payload: input.qrPayload.trim(),
      upi_reference: input.upiReference.trim(),
      payment_note: normalizeText(input.paymentNote),
    })
    .select("*")
    .single();

  if (error) {
    throw toWalletRechargeError(error, "Could not create wallet recharge request.");
  }

  return data as WalletRechargeRequestRow;
}

export async function approveWalletRechargeRequest(
  requestId: string,
  adminNote?: string | null
) {
  const { data, error } = await supabase.rpc("approve_wallet_recharge_request", {
    target_request_id: requestId,
    admin_review_note: normalizeText(adminNote),
  });

  if (error) {
    throw toWalletRechargeError(error, "Could not approve wallet recharge request.");
  }

  return data as WalletRechargeRequestRow;
}

export async function rejectWalletRechargeRequest(
  requestId: string,
  adminNote?: string | null
) {
  const { data, error } = await supabase.rpc("reject_wallet_recharge_request", {
    target_request_id: requestId,
    admin_review_note: normalizeText(adminNote),
  });

  if (error) {
    throw toWalletRechargeError(error, "Could not reject wallet recharge request.");
  }

  return data as WalletRechargeRequestRow;
}
