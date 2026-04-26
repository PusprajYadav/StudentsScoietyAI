import { supabase } from "./supabase";
import type {
  PostReportReason,
  PostReportStatus,
  PostReportWithRelations,
} from "../types/database";

export const POST_REPORT_REASON_OPTIONS: Array<{
  value: PostReportReason;
  label: string;
  description: string;
}> = [
  { value: "spam", label: "Spam", description: "Promotional, repetitive, or low-value content." },
  { value: "harassment", label: "Harassment", description: "Targeted bullying, abuse, or intimidation." },
  { value: "hate", label: "Hate", description: "Hateful or discriminatory language." },
  { value: "nudity", label: "Nudity", description: "Sexual or explicit media or text." },
  { value: "violence", label: "Violence", description: "Graphic threats or violent content." },
  { value: "misinformation", label: "Misinformation", description: "False or misleading claims." },
  { value: "scam", label: "Scam", description: "Fraud, phishing, or suspicious money asks." },
  { value: "copyright", label: "Copyright", description: "Stolen work or unauthorized reuse." },
  { value: "other", label: "Other", description: "Anything else that needs moderator review." },
];

export function getPostReportReasonLabel(reason: PostReportReason) {
  return POST_REPORT_REASON_OPTIONS.find((option) => option.value === reason)?.label || reason;
}

export function getPostReportStatusLabel(status: PostReportStatus) {
  switch (status) {
    case "actioned":
      return "Actioned";
    case "dismissed":
      return "Dismissed";
    default:
      return "Open";
  }
}

function isUniqueViolation(error: unknown) {
  return Boolean(
    error &&
      typeof error === "object" &&
      "code" in error &&
      (error as { code?: string }).code === "23505"
  );
}

export async function createPostReport(input: {
  reporterUserId: string;
  postId: string;
  reason: PostReportReason;
  details?: string;
}) {
  const { data, error } = await supabase
    .from("post_reports")
    .insert({
      reporter_user_id: input.reporterUserId,
      post_id: input.postId,
      reason: input.reason,
      details: input.details?.trim() || null,
    })
    .select("id")
    .single();

  if (error) {
    if (isUniqueViolation(error)) {
      throw new Error("You already reported this post.");
    }

    throw error;
  }

  return data;
}

export async function loadAdminPostReports(limit = 300) {
  const { data, error } = await supabase
    .from("post_reports")
    .select(
      `
        *,
        reporter:profiles!post_reports_reporter_user_id_fkey(
          id,
          username,
          full_name,
          avatar_url
        ),
        reviewed_by:profiles!post_reports_reviewed_by_user_id_fkey(
          id,
          username,
          full_name
        ),
        post:posts!post_reports_post_id_fkey(
          id,
          title,
          content,
          created_at,
          discussion_kind,
          visibility_scope,
          moderation_state,
          post_type,
          is_anonymous,
          author:profiles!posts_author_id_fkey(
            id,
            username,
            full_name,
            is_verified,
            can_post,
            is_banned
          ),
          community:communities(
            id,
            slug,
            name,
            hero_color
          )
        )
      `
    )
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw error;
  }

  return (data || []) as PostReportWithRelations[];
}

export async function reviewPostReportsForPost(input: {
  postId: string;
  adminUserId: string;
  nextStatus: PostReportStatus;
  adminNote?: string | null;
}) {
  const { data, error } = await supabase
    .from("post_reports")
    .update({
      status: input.nextStatus,
      admin_note: input.adminNote?.trim() || null,
      reviewed_by_user_id: input.adminUserId,
      reviewed_at: new Date().toISOString(),
    })
    .eq("post_id", input.postId)
    .eq("status", "open")
    .select("id");

  if (error) {
    throw error;
  }

  return data || [];
}
