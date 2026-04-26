import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { cancelDeferredTask, scheduleDeferredTask } from "../lib/browserTasks";
import type { ProfileRow } from "../types/database";
import { useChatStore } from "../store/chatStore";
import { subscribeToRealtimeConnectionChanges, subscribeToRealtimeStorageChanges } from "../lib/realtimeChat/events";

interface ChatSyncBridgeProps {
  profile: ProfileRow | null;
}

export function ChatSyncBridge({ profile }: ChatSyncBridgeProps) {
  const location = useLocation();
  const sync = useChatStore((state) => state.sync);
  const refreshBadge = useChatStore((state) => state.refreshBadge);
  const heartbeat = useChatStore((state) => state.heartbeat);
  const setConnectionState = useChatStore((state) => state.setConnectionState);
  const isMessagesRoute = location.pathname.startsWith("/app/messages");

  useEffect(() => {
    if (!profile) {
      return;
    }

    let disposed = false;
    let syncTimer: number | null = null;
    let heartbeatTimer: number | null = null;
    const syncIntervalMs = isMessagesRoute ? 20000 : 30000;
    const heartbeatIntervalMs = isMessagesRoute ? 60000 : 180000;
    const isDocumentVisible = () =>
      typeof document === "undefined" || document.visibilityState !== "hidden";

    const clearSyncTimer = () => {
      if (syncTimer !== null) {
        window.clearTimeout(syncTimer);
        syncTimer = null;
      }
    };

    const clearHeartbeatTimer = () => {
      if (heartbeatTimer !== null) {
        window.clearTimeout(heartbeatTimer);
        heartbeatTimer = null;
      }
    };

    const scheduleSync = (delay = syncIntervalMs) => {
      clearSyncTimer();
      if (disposed) {
        return;
      }
      syncTimer = window.setTimeout(() => {
        void runSync();
      }, delay);
    };

    const scheduleHeartbeat = (delay = heartbeatIntervalMs) => {
      clearHeartbeatTimer();
      if (disposed) {
        return;
      }
      heartbeatTimer = window.setTimeout(() => {
        void runHeartbeat();
      }, delay);
    };

    const runSync = async () => {
      if (disposed || !isDocumentVisible()) {
        scheduleSync(syncIntervalMs);
        return;
      }

      try {
        await (isMessagesRoute ? sync(profile) : refreshBadge(profile.id));
      } finally {
        scheduleSync(syncIntervalMs);
      }
    };

    const runHeartbeat = async () => {
      if (disposed || !isDocumentVisible()) {
        scheduleHeartbeat(heartbeatIntervalMs);
        return;
      }

      try {
        await heartbeat(profile.id);
      } finally {
        scheduleHeartbeat(heartbeatIntervalMs);
      }
    };

    const deferredSync = scheduleDeferredTask(() => {
      if (!isDocumentVisible()) {
        scheduleSync(syncIntervalMs);
        return;
      }

      void runSync();
    }, { timeout: isMessagesRoute ? 300 : 1400 });
    const deferredHeartbeat = scheduleDeferredTask(() => {
      if (!isDocumentVisible()) {
        scheduleHeartbeat(heartbeatIntervalMs);
        return;
      }

      void runHeartbeat();
    }, { timeout: isMessagesRoute ? 600 : 2200 });
    const handleVisibility = () => {
      if (!isDocumentVisible()) {
        clearSyncTimer();
        clearHeartbeatTimer();
        return;
      }

      scheduleSync(syncIntervalMs);
      scheduleHeartbeat(heartbeatIntervalMs);
    };
    const handleOnline = () => {
      if (!isDocumentVisible()) {
        return;
      }

      void runHeartbeat();
      void runSync();
    };

    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("online", handleOnline);
    const unsubscribeStorage = subscribeToRealtimeStorageChanges((detail) => {
      if (detail.userId === profile.id && detail.affectsBadge) {
        void refreshBadge(profile.id);
      }
    });
    const unsubscribeConnection = subscribeToRealtimeConnectionChanges((snapshot) => {
      setConnectionState(snapshot.state);
    });

    return () => {
      disposed = true;
      cancelDeferredTask(deferredSync);
      cancelDeferredTask(deferredHeartbeat);
      clearSyncTimer();
      clearHeartbeatTimer();
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("online", handleOnline);
      unsubscribeStorage();
      unsubscribeConnection();
    };
  }, [heartbeat, isMessagesRoute, profile, refreshBadge, setConnectionState, sync]);

  return null;
}
