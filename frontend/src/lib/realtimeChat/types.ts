import type { ProfileRow } from "../../types/database";

export type RealtimeMessageStatus = "queued" | "sent" | "delivered" | "expired" | "failed";

export type RealtimeConnectionState =
  | "idle"
  | "connecting"
  | "authenticating"
  | "connected"
  | "disconnected"
  | "error";

export interface RealtimePeerProfile {
  id: string;
  username: string;
  fullName: string;
  avatarUrl: string | null;
  isVerified: boolean;
  updatedAt: string | null;
}

export interface LocalRealtimeConversation {
  id: string;
  peerId: string;
  peerUsername: string | null;
  peerFullName: string | null;
  peerAvatarUrl: string | null;
  peerIsVerified: boolean;
  peerUpdatedAt: string | null;
  lastMessageText: string | null;
  lastMessageAt: string | null;
  unreadCount: number;
  online: boolean;
}

export interface LocalRealtimeMessage {
  id: string;
  conversationId: string;
  senderId: string;
  recipientId: string;
  text: string;
  createdAt: string;
  expiresAt: string | null;
  deliveredAt: string | null;
  direction: "incoming" | "outgoing";
  status: RealtimeMessageStatus;
  unread: boolean;
}

export interface LocalRealtimeNotification {
  id: string;
  kind: "chat_message" | "system";
  title: string;
  body: string;
  createdAt: string;
  route: string;
  read: boolean;
  conversationId: string | null;
  messageId: string | null;
  actor: RealtimePeerProfile | null;
}

export interface RealtimeBadgeSummary {
  unreadConversationCount: number;
  unreadNotificationCount: number;
  queuedMessageCount: number;
  totalBadgeCount: number;
}

export interface RealtimeConnectionSnapshot {
  state: RealtimeConnectionState;
  reason: string | null;
  connectedAt: string | null;
}

export interface RealtimeOutgoingMessageInput {
  messageId: string;
  conversationId: string;
  recipientId: string;
  senderId: string;
  text: string;
  createdAt: string;
  expiresAt: string | null;
}

export interface RealtimeIncomingMessageInput {
  messageId: string;
  conversationId: string;
  senderId: string;
  recipientId: string;
  text: string;
  createdAt: string;
  expiresAt: string | null;
  peer: RealtimePeerProfile;
}

export type SearchableChatProfile = Pick<
  ProfileRow,
  "id" | "username" | "full_name" | "avatar_url" | "is_verified" | "updated_at"
>;
