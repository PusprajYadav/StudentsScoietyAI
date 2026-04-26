import { deleteManagedMediaAsset, uploadManagedMedia } from "./api";
import { supabase } from "./supabase";
import type { VerificationRequestRow } from "../types/database";

function isAllowedVerificationFile(file: File) {
  const lowerName = file.name.toLowerCase();

  return (
    file.type === "image/png" ||
    file.type === "application/pdf" ||
    lowerName.endsWith(".png") ||
    lowerName.endsWith(".pdf")
  );
}

export function getVerificationRequestBadge(status: VerificationRequestRow["status"]) {
  switch (status) {
    case "approved":
      return "Approved";
    case "rejected":
      return "Rejected";
    case "cancelled":
      return "Cancelled";
    default:
      return "Under review";
  }
}

export async function loadLatestVerificationRequest(userId: string) {
  const { data, error } = await supabase
    .from("verification_requests")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return (data as VerificationRequestRow | null) || null;
}

export async function loadVerificationRequestsForUsers(userIds: string[]) {
  if (userIds.length === 0) {
    return [] as VerificationRequestRow[];
  }

  const { data, error } = await supabase
    .from("verification_requests")
    .select("*")
    .in("user_id", Array.from(new Set(userIds)))
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return (data || []) as VerificationRequestRow[];
}

export async function submitVerificationRequest(input: {
  userId: string;
  username?: string | null;
  requestNote?: string | null;
  proofFile: File;
}) {
  if (!isAllowedVerificationFile(input.proofFile)) {
    throw new Error("Upload a PNG or PDF proof document.");
  }

  const uploadedAsset = await uploadManagedMedia({
    file: input.proofFile,
    usage: "verification_proof",
    attachedProfileId: input.userId,
    profileUsername: input.username || undefined,
  });

  try {
    const { data, error } = await supabase
      .from("verification_requests")
      .insert({
        user_id: input.userId,
        proof_media_asset_id: uploadedAsset.id,
        proof_public_url: uploadedAsset.public_url,
        proof_file_kind: uploadedAsset.file_kind,
        request_note: input.requestNote?.trim() || null,
      })
      .select("*")
      .single();

    if (error) {
      throw error;
    }

    return data as VerificationRequestRow;
  } catch (error) {
    await deleteManagedMediaAsset({
      storagePath: uploadedAsset.storage_path,
      publicUrl: uploadedAsset.public_url,
    }).catch(() => undefined);
    throw error;
  }
}

export async function reviewVerificationRequest(input: {
  requestId: string;
  nextStatus: "approved" | "rejected" | "cancelled";
  reviewNote?: string | null;
}) {
  const { data, error } = await supabase.rpc("review_verification_request", {
    target_request_id: input.requestId,
    next_status: input.nextStatus,
    admin_review_note: input.reviewNote?.trim() || null,
  });

  if (error) {
    throw error;
  }

  return data as VerificationRequestRow;
}
