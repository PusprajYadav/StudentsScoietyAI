import { supabase } from "./supabase";
import type {
  AccountDeletionRequestRow,
  AccountDeletionRequestStatus,
  AccountDeletionRequestWithRelations,
} from "../types/database";

interface CreateAccountDeletionRequestInput {
  userId: string;
  email?: string | null;
  usernameSnapshot: string;
  fullNameSnapshot: string;
  reason?: string;
}

function isUniqueViolation(error: unknown) {
  return Boolean(
    error &&
      typeof error === "object" &&
      "code" in error &&
      (error as { code?: string }).code === "23505"
  );
}

export async function loadLatestAccountDeletionRequest(userId: string) {
  const { data, error } = await supabase
    .from("account_deletion_requests")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
}

export async function createAccountDeletionRequest({
  userId,
  email,
  usernameSnapshot,
  fullNameSnapshot,
  reason,
}: CreateAccountDeletionRequestInput) {
  const trimmedReason = reason?.trim() || null;
  const { data, error } = await supabase
    .from("account_deletion_requests")
    .insert({
      user_id: userId,
      email: email?.trim().toLowerCase() || null,
      username_snapshot: usernameSnapshot,
      full_name_snapshot: fullNameSnapshot.trim(),
      reason: trimmedReason,
    })
    .select("*")
    .single();

  if (error) {
    if (isUniqueViolation(error)) {
      throw new Error("You already have a pending delete request.");
    }

    throw error;
  }

  return data as AccountDeletionRequestRow;
}

export async function deleteAccountDeletionRequest(requestId: string, userId: string) {
  const { data, error } = await supabase
    .from("account_deletion_requests")
    .delete()
    .eq("id", requestId)
    .eq("user_id", userId)
    .select("id");

  if (error) {
    throw error;
  }

  if (!data?.length) {
    throw new Error("That delete request could not be removed.");
  }
}

export async function loadAdminAccountDeletionRequests(limit = 120) {
  const { data, error } = await supabase
    .from("account_deletion_requests")
    .select(
      `
        *,
        user:profiles!account_deletion_requests_user_id_fkey(
          id,
          username,
          full_name,
          avatar_url,
          is_verified
        ),
        reviewed_by:profiles!account_deletion_requests_reviewed_by_user_id_fkey(
          id,
          username,
          full_name
        )
      `
    )
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw error;
  }

  return (data || []) as AccountDeletionRequestWithRelations[];
}

export async function reviewAccountDeletionRequest(input: {
  requestId: string;
  adminUserId: string;
  nextStatus: AccountDeletionRequestStatus;
  reviewNote?: string | null;
}) {
  const { data, error } = await supabase
    .from("account_deletion_requests")
    .update({
      status: input.nextStatus,
      review_note: input.reviewNote?.trim() || null,
      reviewed_by_user_id: input.adminUserId,
      reviewed_at: new Date().toISOString(),
      cancelled_at: input.nextStatus === "cancelled" ? new Date().toISOString() : null,
    })
    .eq("id", input.requestId)
    .select(
      `
        *,
        user:profiles!account_deletion_requests_user_id_fkey(
          id,
          username,
          full_name,
          avatar_url,
          is_verified
        ),
        reviewed_by:profiles!account_deletion_requests_reviewed_by_user_id_fkey(
          id,
          username,
          full_name
        )
      `
    )
    .single();

  if (error) {
    throw error;
  }

  return data as AccountDeletionRequestWithRelations;
}
