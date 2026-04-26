import { supabase } from "../../../lib/supabase";
import type { QrCodeRow, QrCodeType } from "../../../types/database";
import { generateShortCode } from "./helpers";

interface CreateDynamicQrInput {
  ownerId: string;
  title: string;
  targetUrl: string;
  type: QrCodeType;
  settings: Record<string, unknown>;
}

interface UpdateDynamicQrInput {
  id: string;
  title: string;
  targetUrl: string;
  type: QrCodeType;
  settings: Record<string, unknown>;
}

export interface ResolvedDynamicQr {
  id: string;
  short_code: string;
  title: string;
  target_url: string;
  type: QrCodeType;
  scan_count: number;
}

function isUniqueViolation(error: unknown) {
  return Boolean(
    error &&
      typeof error === "object" &&
      "code" in error &&
      (error as { code?: string }).code === "23505"
  );
}

export async function listDynamicQrCodes(ownerId: string) {
  const { data, error } = await supabase
    .from("qr_codes")
    .select("*")
    .eq("owner_id", ownerId)
    .order("updated_at", { ascending: false });

  if (error) {
    throw error;
  }

  return data ?? [];
}

export async function createDynamicQrCode(input: CreateDynamicQrInput) {
  let attempts = 0;
  let lastError: unknown = null;

  while (attempts < 4) {
    const shortCode = generateShortCode();
    const { data, error } = await supabase
      .from("qr_codes")
      .insert({
        owner_id: input.ownerId,
        title: input.title,
        short_code: shortCode,
        target_url: input.targetUrl,
        type: input.type,
        settings: input.settings,
      })
      .select("*")
      .single();

    if (!error && data) {
      return data;
    }

    if (!isUniqueViolation(error)) {
      throw error;
    }

    lastError = error;
    attempts += 1;
  }

  throw lastError instanceof Error ? lastError : new Error("Could not create a unique QR link.");
}

export async function updateDynamicQrCode(input: UpdateDynamicQrInput) {
  const { data, error } = await supabase
    .from("qr_codes")
    .update({
      title: input.title,
      target_url: input.targetUrl,
      type: input.type,
      settings: input.settings,
    })
    .eq("id", input.id)
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export async function deleteDynamicQrCode(id: string) {
  const { error } = await supabase.from("qr_codes").delete().eq("id", id);

  if (error) {
    throw error;
  }
}

export async function resolveDynamicQrCode(shortCode: string) {
  const trimmedCode = shortCode.trim();

  // Try the RPC approach first (atomically resolves + increments scan_count)
  try {
    const { data, error } = await supabase.rpc("resolve_qr_code", {
      input_short_code: trimmedCode,
    });

    if (!error && data && Array.isArray(data) && data.length > 0) {
      return data[0] as ResolvedDynamicQr;
    }

    // If RPC returned no rows (not found), return null
    if (!error && (!data || (Array.isArray(data) && data.length === 0))) {
      // Fall through to direct query to double check
    }

    // If there was an RPC error, log it and fall through to direct query
    if (error) {
      console.warn("[QR Resolve] RPC failed, falling back to direct query:", error.message);
    }
  } catch (rpcError) {
    console.warn("[QR Resolve] RPC threw, falling back to direct query:", rpcError);
  }

  // Fallback: direct table query
  const { data: row, error: selectError } = await supabase
    .from("qr_codes")
    .select("id, short_code, title, target_url, type, scan_count")
    .eq("short_code", trimmedCode)
    .single();

  if (selectError) {
    // PGRST116 = "no rows found" — this is not a real error, just means the code doesn't exist
    if (selectError.code === "PGRST116") {
      return null;
    }
    throw selectError;
  }

  if (!row) {
    return null;
  }

  // Best-effort scan count increment (don't block the redirect on this)
  supabase
    .from("qr_codes")
    .update({ scan_count: (row.scan_count || 0) + 1 })
    .eq("id", row.id)
    .then(({ error: updateError }) => {
      if (updateError) {
        console.warn("[QR Resolve] Could not increment scan count:", updateError.message);
      }
    });

  return row as ResolvedDynamicQr;
}

export function qrCodeToStoredSettings(qrCode: QrCodeRow) {
  return qrCode.settings && typeof qrCode.settings === "object" ? qrCode.settings : {};
}
