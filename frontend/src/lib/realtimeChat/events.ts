import type { RealtimeConnectionSnapshot, RealtimeMessageStatus } from "./types";

const relayEvents = new EventTarget();

export type RealtimeStorageChangeReason =
  | "conversation-upsert"
  | "message-created"
  | "message-status"
  | "conversation-read"
  | "presence"
  | "presence-sync"
  | "notification-created"
  | "notifications-read"
  | "message-deleted"
  | "conversation-cleared"
  | "conversation-deleted";

export interface RealtimeStorageChangeDetail {
  userId: string;
  reason: RealtimeStorageChangeReason;
  conversationId?: string | null;
  messageId?: string | null;
  peerUserId?: string | null;
  online?: boolean;
  status?: RealtimeMessageStatus;
  affectsInbox: boolean;
  affectsThread: boolean;
  affectsBadge: boolean;
}

export function emitRealtimeStorageChanged(detail: RealtimeStorageChangeDetail) {
  relayEvents.dispatchEvent(new CustomEvent("relay-storage", { detail }));
}

export function subscribeToRealtimeStorageChanges(
  listener: (detail: RealtimeStorageChangeDetail) => void
) {
  const handler = (event: Event) => {
    listener((event as CustomEvent<RealtimeStorageChangeDetail>).detail);
  };

  relayEvents.addEventListener("relay-storage", handler);
  return () => relayEvents.removeEventListener("relay-storage", handler);
}

export function emitRealtimeConnectionChanged(snapshot: RealtimeConnectionSnapshot) {
  relayEvents.dispatchEvent(new CustomEvent("relay-connection", { detail: snapshot }));
}

export function subscribeToRealtimeConnectionChanges(
  listener: (snapshot: RealtimeConnectionSnapshot) => void
) {
  const handler = (event: Event) => {
    listener((event as CustomEvent<RealtimeConnectionSnapshot>).detail);
  };

  relayEvents.addEventListener("relay-connection", handler);
  return () => relayEvents.removeEventListener("relay-connection", handler);
}
