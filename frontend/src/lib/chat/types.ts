import type {
  ChatConversationRow,
  ChatDeliveryReceiptRow,
  ChatDeviceRow,
  ChatMessageKind,
  ChatRequestRow,
  ProfileRow,
} from "../../types/database";

export interface ChatPeerProfile {
  id: string;
  username: string;
  full_name: string;
  avatar_url: string | null;
  is_verified: boolean;
  updated_at?: string | null;
  online: boolean;
  blockedByCurrentUser: boolean;
  blockedCurrentUser: boolean;
  canChat: boolean;
}

export interface ChatBlockState {
  blockedByCurrentUser: boolean;
  blockedCurrentUser: boolean;
  canChat: boolean;
}

export interface ChatTargetDetails {
  profile: Pick<
    ProfileRow,
    | "id"
    | "username"
    | "full_name"
    | "avatar_url"
    | "is_verified"
    | "updated_at"
    | "chat_request_policy"
    | "enable_chat_request_notifications"
    | "enable_message_notifications"
  >;
  devices: ChatDeviceRow[];
  existingConversation: ChatConversationRow | null;
  canSendRequest: boolean;
  online: boolean;
  blockState: ChatBlockState;
}

export interface ChatConversationDetails {
  conversation: ChatConversationRow;
  peer: ChatPeerProfile;
}

export interface ChatRequestRecord extends ChatRequestRow {
  direction: "incoming" | "outgoing";
  sender_profile: ChatPeerProfile;
  recipient_profile: ChatPeerProfile;
  decrypted_intro_text: string | null;
  decrypted_intro_error: string | null;
}

export interface LocalChatAttachment {
  id: string;
  kind: "image" | "voice";
  mimeType: string;
  byteSize: number;
  fileName: string | null;
}

export interface LocalChatMessage {
  id: string;
  conversationId: string;
  clientMessageId: string;
  requestId: string | null;
  senderId: string;
  recipientId: string;
  createdAt: string;
  fromCurrentUser: boolean;
  unread: boolean;
  status: "sending" | "sent" | "delivered" | "failed";
  messageKind: Exclude<ChatMessageKind, "request_intro" | "system"> | "request_intro";
  text: string | null;
  attachment: LocalChatAttachment | null;
}

export interface LocalChatMessagePreview {
  text: string;
  createdAt: string | null;
  kind: LocalChatMessage["messageKind"] | null;
}

export interface LocalConversationSummary {
  id: string;
  peerId: string;
  peerUsername: string | null;
  peerFullName: string | null;
  peerAvatarUrl: string | null;
  peerIsVerified: boolean;
  peerUpdatedAt: string | null;
  unreadCount: number;
  lastMessageAt: string | null;
  lastMessageKind: LocalChatMessage["messageKind"] | null;
  lastPreviewText: string | null;
}

export interface ChatSummaryCounts {
  pendingRequests: number;
  queuedMessages: number;
  deliveredReceiptsPending: number;
}

export type ChatReceiptRecord = ChatDeliveryReceiptRow;

export interface PulledEncryptedMessage {
  id: string;
  conversation_id: string | null;
  request_id: string | null;
  sender_id: string;
  sender_device_id: string;
  recipient_id: string;
  recipient_device_id: string;
  client_message_id: string;
  message_kind: ChatMessageKind;
  payload: Record<string, unknown>;
  media_blob_id: string | null;
  sent_at: string;
  sender_profile: ChatPeerProfile | null;
}

export interface RegisteredChatDevice {
  id: string;
  installationId: string;
  identityKeyPublic: string;
}

export interface ChatMediaUploadResult {
  id: string;
  media_kind: "image" | "voice";
  byte_size: number;
  mime_type: string;
  created_at: string;
}
