import type {
  NotificationPushPreferencesRow,
  NotificationType,
} from "../types/database";

export type NotificationPushPreferenceField =
  | "enable_follow_push"
  | "enable_post_like_push"
  | "enable_post_comment_push"
  | "enable_comment_reply_push"
  | "enable_profile_view_push"
  | "enable_post_mention_push"
  | "enable_coin_wallet_push"
  | "enable_chat_request_push"
  | "enable_chat_message_push"
  | "enable_email_mailbox_push";

export interface NotificationPushPreferenceItem {
  field: NotificationPushPreferenceField;
  type: NotificationType;
  label: string;
  description: string;
}

export const notificationPushPreferenceItems: NotificationPushPreferenceItem[] = [
  {
    field: "enable_follow_push",
    type: "follow",
    label: "Follows",
    description: "When someone starts following you.",
  },
  {
    field: "enable_post_like_push",
    type: "post_like",
    label: "Post likes",
    description: "When someone likes one of your posts.",
  },
  {
    field: "enable_post_comment_push",
    type: "post_comment",
    label: "Post comments",
    description: "When someone comments on your post.",
  },
  {
    field: "enable_comment_reply_push",
    type: "comment_reply",
    label: "Comment replies",
    description: "When someone replies to your comment.",
  },
  {
    field: "enable_profile_view_push",
    type: "profile_view",
    label: "Profile views",
    description: "When someone views your profile.",
  },
  {
    field: "enable_post_mention_push",
    type: "post_mention",
    label: "Post tags",
    description: "When someone tags you in a post title, body, or poll.",
  },
  {
    field: "enable_coin_wallet_push",
    type: "coin_wallet",
    label: "Wallet coins",
    description: "When coins are credited to or debited from your wallet.",
  },
  {
    field: "enable_chat_request_push",
    type: "chat_request",
    label: "Chat requests",
    description: "When someone sends or responds to a chat request.",
  },
  {
    field: "enable_chat_message_push",
    type: "chat_message",
    label: "Private messages",
    description: "When you receive a private message.",
  },
  {
    field: "enable_email_mailbox_push",
    type: "email_mailbox",
    label: "Student Email",
    description: "When a new email lands in your Student Society mailbox.",
  },
];

export const notificationTypeToPushPreferenceField: Record<
  NotificationType,
  NotificationPushPreferenceField
> = {
  follow: "enable_follow_push",
  post_like: "enable_post_like_push",
  post_comment: "enable_post_comment_push",
  comment_reply: "enable_comment_reply_push",
  profile_view: "enable_profile_view_push",
  post_mention: "enable_post_mention_push",
  coin_wallet: "enable_coin_wallet_push",
  chat_request: "enable_chat_request_push",
  chat_message: "enable_chat_message_push",
  email_mailbox: "enable_email_mailbox_push",
};

export function createDefaultNotificationPushPreferences(
  userId = ""
): NotificationPushPreferencesRow {
  return {
    user_id: userId,
    enable_follow_push: true,
    enable_post_like_push: true,
    enable_post_comment_push: true,
    enable_comment_reply_push: true,
    enable_profile_view_push: true,
    enable_post_mention_push: true,
    enable_coin_wallet_push: true,
    enable_chat_request_push: true,
    enable_chat_message_push: true,
    enable_email_mailbox_push: true,
    created_at: new Date(0).toISOString(),
    updated_at: new Date(0).toISOString(),
  };
}

export function isNativePushEnabledForNotificationType(
  type: NotificationType,
  preferences?: NotificationPushPreferencesRow | null
) {
  if (!preferences) {
    return true;
  }

  return preferences[notificationTypeToPushPreferenceField[type]] ?? true;
}
