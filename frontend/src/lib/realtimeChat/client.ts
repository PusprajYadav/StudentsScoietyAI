import type { NotificationWithRelations, ProfileRow } from "../../types/database";
import { getLatestPushToken, isNativePlatform, showLocalNotification } from "../capacitorNotifications";
import { saveLocalNotifications } from "../notifications/localStore";
import { supabase } from "../supabase";
import {
  emitRealtimeConnectionChanged,
} from "./events";
import {
  resolveRealtimeMessageTtlSeconds,
  resolveRealtimeRelayWebSocketUrl,
} from "./config";
import { currentProfileToRealtimePeer, profileToRealtimePeerProfile } from "./profileDirectory";
import {
  createConversationId,
  getRealtimeRelayInstallationId,
  listQueuedRealtimeMessages,
  saveIncomingRealtimeMessage,
  saveOutgoingRealtimeMessage,
  saveRealtimeNotification,
  setRealtimePeerPresence,
  setRealtimePeersPresence,
  updateRealtimeMessageStatus,
} from "./storage";
import type {
  LocalRealtimeNotification,
  RealtimeConnectionSnapshot,
  RealtimePeerProfile,
} from "./types";

function createMessageId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `msg-${Math.random().toString(36).slice(2, 10)}-${Date.now().toString(36)}`;
}

function isSocketOpen(socket: WebSocket | null) {
  return Boolean(socket && socket.readyState === WebSocket.OPEN);
}

function nowIso() {
  return new Date().toISOString();
}

const REALTIME_MESSAGE_TTL_SECONDS = resolveRealtimeMessageTtlSeconds();

function createNotificationId(prefix: string, id: string) {
  return `${prefix}:${id}`;
}

function shouldShowDeferredNotificationAlert(createdAt: string) {
  if (isNativePlatform() && getLatestPushToken()) {
    return false;
  }

  const createdAtMs = Date.parse(createdAt);
  if (!Number.isNaN(createdAtMs) && Date.now() - createdAtMs > 15000) {
    return false;
  }

  return true;
}

class RealtimeRelayClient {
  profile: ProfileRow;
  socket: WebSocket | null = null;
  reconnectTimer: number | null = null;
  reconnectAttempt = 0;
  authenticated = false;
  stopped = false;
  watchedPeerIds = new Set<string>();
  snapshot: RealtimeConnectionSnapshot = {
    state: "idle",
    reason: null,
    connectedAt: null,
  };

  constructor(profile: ProfileRow) {
    this.profile = profile;
  }

  setSnapshot(next: Partial<RealtimeConnectionSnapshot>) {
    this.snapshot = {
      ...this.snapshot,
      ...next,
    };
    emitRealtimeConnectionChanged(this.snapshot);
  }

  start() {
    this.stopped = false;
    if (this.socket && (this.socket.readyState === WebSocket.OPEN || this.socket.readyState === WebSocket.CONNECTING)) {
      return;
    }

    this.openSocket();
  }

  stop() {
    this.stopped = true;
    this.authenticated = false;
    if (this.reconnectTimer !== null) {
      window.clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.socket?.close();
    this.socket = null;
    this.setSnapshot({
      state: "idle",
      reason: null,
      connectedAt: null,
    });
  }

  openSocket() {
    if (this.stopped) {
      return;
    }

    this.setSnapshot({
      state: "connecting",
      reason: null,
    });

    const socket = new WebSocket(resolveRealtimeRelayWebSocketUrl());
    this.socket = socket;

    socket.addEventListener("open", () => {
      void this.authenticate(socket);
    });

    socket.addEventListener("message", (event) => {
      void this.handleMessage(event.data);
    });

    socket.addEventListener("close", () => {
      if (this.socket !== socket) {
        return;
      }

      this.socket = null;
      this.authenticated = false;
      this.setSnapshot({
        state: "disconnected",
        reason: this.stopped ? null : "Connection dropped. Retrying...",
        connectedAt: null,
      });
      this.scheduleReconnect();
    });

    socket.addEventListener("error", () => {
      this.setSnapshot({
        state: "error",
        reason: "Realtime relay is unavailable right now.",
        connectedAt: null,
      });
    });
  }

  scheduleReconnect() {
    if (this.stopped) {
      return;
    }

    if (this.reconnectTimer !== null) {
      window.clearTimeout(this.reconnectTimer);
    }

    const nextDelay = Math.min(15000, 1000 * 2 ** this.reconnectAttempt);
    this.reconnectAttempt += 1;
    this.reconnectTimer = window.setTimeout(() => {
      this.reconnectTimer = null;
      this.openSocket();
    }, nextDelay + Math.round(Math.random() * 350));
  }

  async authenticate(socket: WebSocket) {
    this.setSnapshot({
      state: "authenticating",
      reason: null,
    });

    const {
      data: { session },
    } = await supabase.auth.getSession();

    const accessToken = session?.access_token || null;
    if (!accessToken || socket !== this.socket) {
      socket.close();
      return;
    }

    const deviceId = await getRealtimeRelayInstallationId(this.profile.id);
    socket.send(
      JSON.stringify({
        type: "auth",
        accessToken,
        deviceId,
      })
    );
  }

  async sendHeartbeat() {
    this.start();

    if (!isSocketOpen(this.socket) || !this.authenticated) {
      return;
    }

    this.socket?.send(
      JSON.stringify({
        type: "presence.heartbeat",
      })
    );
  }

  subscribePresence(peerUserIds: string[]) {
    this.watchedPeerIds = new Set(peerUserIds.filter(Boolean));
    this.start();

    if (!isSocketOpen(this.socket) || !this.authenticated) {
      return;
    }

    this.socket.send(
      JSON.stringify({
        type: "presence.subscribe",
        peerUserIds: Array.from(this.watchedPeerIds),
      })
    );
  }

  async queueTextMessage(peer: RealtimePeerProfile, text: string) {
    const normalizedText = text.trim();
    if (!normalizedText) {
      throw new Error("Message text cannot be empty.");
    }

    const createdAt = nowIso();
    const messageId = createMessageId();
    const conversationId = createConversationId(this.profile.id, peer.id);

    await saveOutgoingRealtimeMessage(this.profile.id, peer, {
      messageId,
      conversationId,
      recipientId: peer.id,
      senderId: this.profile.id,
      text: normalizedText,
      createdAt,
      expiresAt: new Date(Date.now() + REALTIME_MESSAGE_TTL_SECONDS * 1000).toISOString(),
    });

    this.start();
    void this.flushQueuedMessages();

    return {
      messageId,
      conversationId,
    };
  }

  async flushQueuedMessages() {
    if (!isSocketOpen(this.socket) || !this.authenticated) {
      return;
    }

    const queuedMessages = await listQueuedRealtimeMessages(this.profile.id);
    const senderProfile = currentProfileToRealtimePeer(this.profile);

    for (const message of queuedMessages) {
      this.socket?.send(
        JSON.stringify({
          type: "chat.send",
          messageId: message.id,
          recipientUserId: message.recipientId,
          conversationId: message.conversationId,
          text: message.text,
          senderProfile,
        })
      );
    }
  }

  async maybeShowNativeNotification(notification: LocalRealtimeNotification) {
    const appVisible = typeof document !== "undefined" ? document.visibilityState === "visible" : true;
    const onMessagesRoute =
      typeof window !== "undefined" ? window.location.pathname.startsWith("/app/messages") : false;

    if (appVisible && onMessagesRoute) {
      return;
    }

    await showLocalNotification({
      title: notification.title,
      body: notification.body,
      data: {
        path: notification.route,
      },
    });
  }

  async handleChatEnvelope(envelope: {
    id: string;
    conversationId: string | null;
    createdAt: string;
    senderUserId: string;
    payload: {
      text: string;
      senderProfile?: RealtimePeerProfile;
      expiresAt?: string;
    };
  }) {
    const peer = profileToRealtimePeerProfile(
      envelope.payload.senderProfile || {
        id: envelope.senderUserId,
        username: "student",
        fullName: "Student",
        avatarUrl: null,
        isVerified: false,
        updatedAt: null,
      }
    );
    const conversationId =
      envelope.conversationId || createConversationId(this.profile.id, envelope.senderUserId);

    await saveIncomingRealtimeMessage(this.profile.id, {
      messageId: envelope.id,
      conversationId,
      senderId: envelope.senderUserId,
      recipientId: this.profile.id,
      text: envelope.payload.text || "",
      createdAt: envelope.createdAt,
      expiresAt: envelope.payload.expiresAt || null,
      peer,
    });

    const notification: LocalRealtimeNotification = {
      id: createNotificationId("chat", envelope.id),
      kind: "chat_message",
      title: peer.fullName || peer.username || "New message",
      body: "sent you a message",
      createdAt: envelope.createdAt,
      route: `/app/messages?conversation=${encodeURIComponent(conversationId)}`,
      read: false,
      conversationId,
      messageId: envelope.id,
      actor: peer,
    };

    await saveRealtimeNotification(this.profile.id, notification);
    await this.maybeShowNativeNotification(notification);

    if (isSocketOpen(this.socket) && this.authenticated) {
      this.socket?.send(
        JSON.stringify({
          type: "chat.ack",
          messageId: envelope.id,
        })
      );
    }
  }

  async handleSystemNotificationEnvelope(envelope: {
    id: string;
    createdAt: string;
    payload: {
      title: string;
      body: string;
      route?: string;
      actor?: RealtimePeerProfile;
      notification?: NotificationWithRelations | null;
    };
  }) {
    const rawNotification = envelope.payload.notification;

    if (rawNotification) {
      await saveLocalNotifications(this.profile.id, [rawNotification]);

      if (isSocketOpen(this.socket) && this.authenticated) {
        this.socket?.send(
          JSON.stringify({
            type: "notification.ack",
            notificationId: envelope.id,
          })
        );
      }

      if (shouldShowDeferredNotificationAlert(envelope.createdAt)) {
        await this.maybeShowNativeNotification({
          id: createNotificationId("system", envelope.id),
          kind: "system",
          title: envelope.payload.title || "Notification",
          body: envelope.payload.body || "",
          createdAt: envelope.createdAt,
          route: envelope.payload.route || "/app",
          read: false,
          conversationId: null,
          messageId: envelope.id,
          actor: envelope.payload.actor ? profileToRealtimePeerProfile(envelope.payload.actor) : null,
        });
      }
      return;
    }

    const notification: LocalRealtimeNotification = {
      id: createNotificationId("system", envelope.id),
      kind: "system",
      title: envelope.payload.title || "Notification",
      body: envelope.payload.body || "",
      createdAt: envelope.createdAt,
      route: envelope.payload.route || "/app/messages",
      read: false,
      conversationId: null,
      messageId: envelope.id,
      actor: envelope.payload.actor ? profileToRealtimePeerProfile(envelope.payload.actor) : null,
    };

    await saveRealtimeNotification(this.profile.id, notification);
    if (isSocketOpen(this.socket) && this.authenticated) {
      this.socket?.send(
        JSON.stringify({
          type: "notification.ack",
          notificationId: envelope.id,
        })
      );
    }
    if (shouldShowDeferredNotificationAlert(envelope.createdAt)) {
      await this.maybeShowNativeNotification(notification);
    }
  }

  async handleMessage(rawData: string | ArrayBuffer | Blob) {
    const payload =
      typeof rawData === "string"
        ? rawData
        : rawData instanceof Blob
          ? await rawData.text()
          : new TextDecoder().decode(rawData);
    const parsed = JSON.parse(payload);

    switch (parsed.type) {
      case "auth.ok":
        this.authenticated = true;
        this.reconnectAttempt = 0;
        this.setSnapshot({
          state: "connected",
          reason: null,
          connectedAt: nowIso(),
        });
        this.subscribePresence(Array.from(this.watchedPeerIds));
        await this.flushQueuedMessages();
        return;
      case "auth.error":
        this.authenticated = false;
        this.setSnapshot({
          state: "error",
          reason: parsed.message || "Authentication failed.",
          connectedAt: null,
        });
        this.socket?.close();
        return;
      case "chat.accepted":
        await updateRealtimeMessageStatus(this.profile.id, parsed.messageId, "sent", {
          expiresAt: parsed.expiresAt || null,
        });
        return;
      case "chat.delivered":
        await updateRealtimeMessageStatus(this.profile.id, parsed.messageId, "delivered", {
          deliveredAt: parsed.deliveredAt || nowIso(),
        });
        return;
      case "chat.expired":
        await updateRealtimeMessageStatus(this.profile.id, parsed.messageId, "expired");
        return;
      case "chat.receive":
        await this.handleChatEnvelope(parsed.envelope);
        return;
      case "notification.receive":
        await this.handleSystemNotificationEnvelope(parsed.envelope);
        return;
      case "presence.snapshot":
        if (Array.isArray(parsed.peers)) {
          await setRealtimePeersPresence(
            this.profile.id,
            parsed.peers.map((peer: { peerUserId: string; online: boolean }) => ({
              peerUserId: peer.peerUserId,
              online: Boolean(peer.online),
            }))
          );
        }
        return;
      case "presence.update":
        if (typeof parsed.peerUserId === "string") {
          await setRealtimePeerPresence(this.profile.id, parsed.peerUserId, Boolean(parsed.online));
        }
        return;
      default:
        return;
    }
  }
}

let activeClient: RealtimeRelayClient | null = null;

export function getRealtimeRelayClient() {
  return activeClient;
}

export async function ensureRealtimeRelayReady(profile: ProfileRow) {
  if (!activeClient || activeClient.profile.id !== profile.id) {
    activeClient?.stop();
    activeClient = new RealtimeRelayClient(profile);
  }

  activeClient.start();
  return activeClient;
}
