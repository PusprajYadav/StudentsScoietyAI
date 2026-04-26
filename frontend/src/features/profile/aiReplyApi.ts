import { requestBackend } from "../../lib/backendApi";
import type { UserMentionReplySettings } from "./aiReplyTypes";

export async function loadUserMentionReplySettings() {
  return requestBackend<UserMentionReplySettings>("/social-ai-mentions/settings", {
    featureName: "AI mention replies",
  });
}

export async function saveUserMentionReplySettings(
  input: Omit<UserMentionReplySettings, "user_id" | "created_at" | "updated_at">
) {
  return requestBackend<UserMentionReplySettings>("/social-ai-mentions/settings", {
    method: "PUT",
    body: input,
    featureName: "AI mention replies",
  });
}
