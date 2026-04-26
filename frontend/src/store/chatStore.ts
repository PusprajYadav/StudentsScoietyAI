import { create } from "zustand";
import type { ProfileRow } from "../types/database";
import { ensureRealtimeRelayReady, getRealtimeRelayClient } from "../lib/realtimeChat/client";
import {
  getRealtimeBadgeSummary,
  markRealtimeConversationRead,
} from "../lib/realtimeChat/storage";
import type { RealtimeConnectionState } from "../lib/realtimeChat/types";

interface ChatStore {
  unreadCount: number;
  pendingRequestCount: number;
  queuedMessageCount: number;
  syncing: boolean;
  initialized: boolean;
  activeConversationId: string | null;
  connectionState: RealtimeConnectionState;
  sync: (profile: ProfileRow) => Promise<void>;
  refreshBadge: (userId: string) => Promise<void>;
  markConversationSeen: (userId: string, conversationId: string) => Promise<void>;
  setActiveConversation: (conversationId: string | null) => void;
  heartbeat: (userId: string) => Promise<void>;
  setConnectionState: (connectionState: RealtimeConnectionState) => void;
}

let syncPromise: Promise<void> | null = null;

function hasChatSummaryChanged(
  current: Pick<ChatStore, "unreadCount" | "pendingRequestCount" | "queuedMessageCount" | "initialized">,
  next: {
    unreadConversationCount: number;
    unreadNotificationCount: number;
    queuedMessageCount: number;
  }
) {
  return (
    current.unreadCount !== next.unreadConversationCount ||
    current.pendingRequestCount !== next.unreadNotificationCount ||
    current.queuedMessageCount !== next.queuedMessageCount ||
    !current.initialized
  );
}

export const useChatStore = create<ChatStore>((set) => ({
  unreadCount: 0,
  pendingRequestCount: 0,
  queuedMessageCount: 0,
  syncing: false,
  initialized: false,
  activeConversationId: null,
  connectionState: "idle",
  sync: async (profile) => {
    if (syncPromise) {
      return syncPromise;
    }

    syncPromise = (async () => {
      set({ syncing: true });

      try {
        await ensureRealtimeRelayReady(profile);
        const summary = await getRealtimeBadgeSummary(profile.id);

        set((current) => {
          if (!hasChatSummaryChanged(current, summary) && current.syncing === false) {
            return current;
          }

          return {
            ...current,
            unreadCount: summary.unreadConversationCount,
            pendingRequestCount: summary.unreadNotificationCount,
            queuedMessageCount: summary.queuedMessageCount,
            syncing: false,
            initialized: true,
          };
        });
      } catch (error) {
        console.error("Chat sync failed", error);
        set({ syncing: false, initialized: true });
      } finally {
        syncPromise = null;
      }
    })();

    return syncPromise;
  },
  refreshBadge: async (userId) => {
    try {
      const summary = await getRealtimeBadgeSummary(userId);

      set((current) => {
        if (!hasChatSummaryChanged(current, summary)) {
          return current;
        }

        return {
          ...current,
          unreadCount: summary.unreadConversationCount,
          pendingRequestCount: summary.unreadNotificationCount,
          queuedMessageCount: summary.queuedMessageCount,
          initialized: true,
        };
      });
    } catch (error) {
      console.error("Failed to refresh chat badge", error);
    }
  },
  markConversationSeen: async (userId, conversationId) => {
    await markRealtimeConversationRead(userId, conversationId);
    const summary = await getRealtimeBadgeSummary(userId);
    set((current) => {
      if (!hasChatSummaryChanged(current, summary)) {
        return current;
      }

      return {
        ...current,
        unreadCount: summary.unreadConversationCount,
        pendingRequestCount: summary.unreadNotificationCount,
        queuedMessageCount: summary.queuedMessageCount,
        initialized: true,
      };
    });
  },
  setActiveConversation: (conversationId) => set({ activeConversationId: conversationId }),
  heartbeat: async (userId) => {
    try {
      const client = getRealtimeRelayClient();
      if (client?.profile.id === userId) {
        await client.sendHeartbeat();
      }
    } catch (error) {
      console.error("Chat heartbeat failed", error);
    }
  },
  setConnectionState: (connectionState) => set({ connectionState }),
}));
