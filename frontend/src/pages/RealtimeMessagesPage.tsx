import { startTransition, useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { KeyboardEvent as ReactKeyboardEvent } from "react";
import toast from "react-hot-toast";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ChatConversationView } from "../features/chat/components/ChatConversationView";
import { ChatEmptyState } from "../features/chat/components/ChatEmptyState";
import { ChatSidebar } from "../features/chat/components/ChatSidebar";
import { subscribeToRealtimeStorageChanges } from "../lib/realtimeChat/events";
import { ensureRealtimeRelayReady, getRealtimeRelayClient } from "../lib/realtimeChat/client";
import {
  findRealtimeChatProfileByUsername,
} from "../lib/realtimeChat/profileDirectory";
import {
  createConversationId,
  deleteAllRealtimeConversationMessages,
  deleteRealtimeConversation,
  deleteRealtimeMessage,
  deleteRealtimeMessages,
  ensureRealtimeConversation,
  listRealtimeConversationMessages,
  listRealtimeConversations,
  markRealtimeConversationRead,
  markRealtimeNotificationsRead,
} from "../lib/realtimeChat/storage";
import type {
  LocalRealtimeConversation,
  LocalRealtimeMessage,
  RealtimePeerProfile,
} from "../lib/realtimeChat/types";
import type {
  ChatConversationDetails,
  ChatPeerProfile,
  LocalChatMessage,
  LocalChatMessagePreview,
} from "../lib/chat/types";
import type { ChatConversationRow } from "../types/database";
import { useAuthStore } from "../store/authStore";
import { useChatStore } from "../store/chatStore";

const REACTION_STORAGE_PREFIX = "student-society-realtime-reactions";
const BACKGROUND_REFRESH_DELAY_MS = 48;

function buildStatelessConversationRow(
  currentUserId: string,
  conversationId: string,
  lastMessageAt: string | null
): ChatConversationRow {
  const fallbackTimestamp = lastMessageAt || new Date().toISOString();
  return {
    id: conversationId,
    conversation_type: "direct",
    direct_message_key: null,
    created_by: currentUserId,
    last_server_activity_at: lastMessageAt,
    expires_at: fallbackTimestamp,
    created_at: fallbackTimestamp,
    updated_at: fallbackTimestamp,
  };
}

function mapRealtimeConversationToPeer(conversation: LocalRealtimeConversation): ChatPeerProfile {
  return {
    id: conversation.peerId,
    username: conversation.peerUsername || "student",
    full_name: conversation.peerFullName || conversation.peerUsername || "Student",
    avatar_url: conversation.peerAvatarUrl,
    is_verified: conversation.peerIsVerified,
    updated_at: conversation.peerUpdatedAt,
    online: conversation.online,
    blockedByCurrentUser: false,
    blockedCurrentUser: false,
    canChat: true,
  };
}

function mapRealtimeConversationToDetails(
  currentUserId: string,
  conversation: LocalRealtimeConversation
): ChatConversationDetails {
  return {
    conversation: buildStatelessConversationRow(
      currentUserId,
      conversation.id,
      conversation.lastMessageAt
    ),
    peer: mapRealtimeConversationToPeer(conversation),
  };
}

function mapRealtimeConversationToPreview(
  conversation: LocalRealtimeConversation
): LocalChatMessagePreview {
  return {
    text: conversation.lastMessageText?.trim() || "No local messages yet",
    createdAt: conversation.lastMessageAt,
    kind: null,
  };
}

function mapRealtimeStatusToChatStatus(
  status: LocalRealtimeMessage["status"]
): LocalChatMessage["status"] {
  if (status === "sent") {
    return "sent";
  }

  if (status === "delivered") {
    return "delivered";
  }

  if (status === "queued") {
    return "sending";
  }

  return "failed";
}

function mapRealtimeMessageToChatMessage(
  message: LocalRealtimeMessage
): LocalChatMessage {
  return {
    id: message.id,
    conversationId: message.conversationId,
    clientMessageId: message.id,
    requestId: null,
    senderId: message.senderId,
    recipientId: message.recipientId,
    createdAt: message.createdAt,
    fromCurrentUser: message.direction === "outgoing",
    unread: message.unread,
    status: mapRealtimeStatusToChatStatus(message.status),
    messageKind: "text",
    text: message.text,
    attachment: null,
  };
}

function mapChatPeerToRealtimePeer(peer: ChatPeerProfile): RealtimePeerProfile {
  return {
    id: peer.id,
    username: peer.username,
    fullName: peer.full_name,
    avatarUrl: peer.avatar_url,
    isVerified: peer.is_verified,
    updatedAt: peer.updated_at || null,
  };
}

function mapRealtimePeerToChatPeer(peer: RealtimePeerProfile): ChatPeerProfile {
  return {
    id: peer.id,
    username: peer.username,
    full_name: peer.fullName,
    avatar_url: peer.avatarUrl,
    is_verified: peer.isVerified,
    updated_at: peer.updatedAt,
    online: false,
    blockedByCurrentUser: false,
    blockedCurrentUser: false,
    canChat: true,
  };
}

function getReactionStorageKey(userId: string) {
  return `${REACTION_STORAGE_PREFIX}:${userId}`;
}

function readStoredReactions(userId: string) {
  if (typeof window === "undefined") {
    return {} as Record<string, string>;
  }

  try {
    const rawValue = window.localStorage.getItem(getReactionStorageKey(userId));
    if (!rawValue) {
      return {} as Record<string, string>;
    }

    const parsed = JSON.parse(rawValue) as Record<string, string>;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {} as Record<string, string>;
  }
}

function writeStoredReactions(userId: string, reactions: Record<string, string>) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(getReactionStorageKey(userId), JSON.stringify(reactions));
}

function removeStoredReactions(userId: string, clientMessageIds: string[]) {
  if (clientMessageIds.length === 0) {
    return;
  }

  const next = { ...readStoredReactions(userId) };
  for (const messageId of clientMessageIds) {
    delete next[messageId];
  }
  writeStoredReactions(userId, next);
}

type SidebarSelection =
  | {
      type: "conversation";
      conversationId: string;
    }
  | null;

type InboxLoadMode = "initial" | "manual" | "background";

export function RealtimeMessagesPage() {
  const { profile } = useAuthStore();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const setActiveConversation = useChatStore((state) => state.setActiveConversation);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [conversations, setConversations] = useState<ChatConversationDetails[]>([]);
  const [conversationPreviews, setConversationPreviews] = useState<
    Record<string, LocalChatMessagePreview>
  >({});
  const [conversationUnreadCounts, setConversationUnreadCounts] = useState<Record<string, number>>(
    {}
  );
  const [conversationMessages, setConversationMessages] = useState<LocalChatMessage[]>([]);
  const [draftText, setDraftText] = useState("");
  const [sending, setSending] = useState(false);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [recordedVoice, setRecordedVoice] = useState<File | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [replyToMessage, setReplyToMessage] = useState<LocalChatMessage | null>(null);
  const [selectMode, setSelectMode] = useState(false);
  const [selectedMessageIds, setSelectedMessageIds] = useState<Set<string>>(new Set());
  const [reactionTarget, setReactionTarget] = useState<{
    messageId: string;
    x: number;
    y: number;
    timestamp: number;
  } | null>(null);
  const [messageReactions, setMessageReactions] = useState<Record<string, string>>({});
  const [hasMoreMessages] = useState(false);
  const [isLoadingMore] = useState(false);
  const [conversationMenuOpen, setConversationMenuOpen] = useState(false);
  const [isMobileViewport, setIsMobileViewport] = useState(
    typeof window !== "undefined" ? window.matchMedia("(max-width: 767px)").matches : false
  );
  const [keyboardInset, setKeyboardInset] = useState(0);
  const [mobileHeaderHeight, setMobileHeaderHeight] = useState(96);
  const [mobileComposerHeight, setMobileComposerHeight] = useState(132);
  const draftTextareaRef = useRef<HTMLTextAreaElement | null>(null);
  const messageListRef = useRef<HTMLDivElement | null>(null);
  const conversationHeaderRef = useRef<HTMLDivElement | null>(null);
  const composerRef = useRef<HTMLDivElement | null>(null);
  const presenceSubscriptionKeyRef = useRef("");
  const preferredConversationIdRef = useRef<string | null>(null);
  const inboxRefreshTimerRef = useRef<number | null>(null);
  const threadRefreshTimerRef = useRef<number | null>(null);

  const selectedConversationId = searchParams.get("conversation");
  const composeUsername = searchParams.get("compose");

  const selection: SidebarSelection = useMemo(
    () =>
      selectedConversationId
        ? {
            type: "conversation",
            conversationId: selectedConversationId,
          }
        : null,
    [selectedConversationId]
  );

  const selectedConversation = useMemo(
    () =>
      conversations.find((entry) => entry.conversation.id === selectedConversationId) || null,
    [conversations, selectedConversationId]
  );

  const isConversationScreen =
    selection?.type === "conversation" && Boolean(selectedConversation);
  const unreadConversationCount = useMemo(
    () => Object.values(conversationUnreadCounts).filter((count) => count > 0).length,
    [conversationUnreadCounts]
  );

  const scrollToBottom = useCallback((behavior: ScrollBehavior = "auto") => {
    requestAnimationFrame(() => {
      const el = messageListRef.current;
      if (el) {
        el.scrollTo({
          top: el.scrollHeight,
          behavior,
        });
      }
    });
  }, []);

  const upsertConversationIntoState = useCallback(
    (peer: RealtimePeerProfile, conversationId: string) => {
      if (!profile) {
        return;
      }

      const nextEntry: ChatConversationDetails = {
        conversation: buildStatelessConversationRow(profile.id, conversationId, null),
        peer: mapRealtimePeerToChatPeer(peer),
      };

      startTransition(() => {
        setConversations((current) => [
          nextEntry,
          ...current.filter((entry) => entry.conversation.id !== conversationId),
        ]);
        setConversationPreviews((current) => ({
          ...current,
          [conversationId]:
            current[conversationId] ||
            ({
              text: "No local messages yet",
              createdAt: null,
              kind: null,
            } satisfies LocalChatMessagePreview),
        }));
        setConversationUnreadCounts((current) =>
          current[conversationId] === undefined
            ? {
                ...current,
                [conversationId]: 0,
              }
            : current
        );
      });
    },
    [profile]
  );

  const applyConversationSnapshot = useCallback(
    (localConversations: LocalRealtimeConversation[]) => {
      if (!profile) {
        return;
      }

      let visibleConversations = localConversations;
      const preferredConversationId = preferredConversationIdRef.current;
      if (preferredConversationId) {
        const preferredIndex = localConversations.findIndex(
          (conversation) => conversation.id === preferredConversationId
        );

        if (preferredIndex > 0) {
          const preferredConversation = localConversations[preferredIndex];
          visibleConversations = [
            preferredConversation,
            ...localConversations.slice(0, preferredIndex),
            ...localConversations.slice(preferredIndex + 1),
          ];
        }
      }

      const nextEntries = visibleConversations.map((conversation) =>
        mapRealtimeConversationToDetails(profile.id, conversation)
      );
      const nextPreviews = Object.fromEntries(
        visibleConversations.map((conversation) => [
          conversation.id,
          mapRealtimeConversationToPreview(conversation),
        ])
      );
      const nextUnreadCounts = Object.fromEntries(
        visibleConversations.map((conversation) => [conversation.id, conversation.unreadCount])
      );
      const peerIds = Array.from(
        new Set(visibleConversations.map((conversation) => conversation.peerId).filter(Boolean))
      ).sort();
      const nextPresenceKey = peerIds.join("|");

      startTransition(() => {
        setConversations(nextEntries);
        setConversationPreviews(nextPreviews);
        setConversationUnreadCounts(nextUnreadCounts);
      });

      if (presenceSubscriptionKeyRef.current !== nextPresenceKey) {
        presenceSubscriptionKeyRef.current = nextPresenceKey;
        getRealtimeRelayClient()?.subscribePresence(peerIds);
      }
    },
    [profile]
  );

  const loadInbox = useCallback(
    async (mode: InboxLoadMode = "background") => {
      if (!profile) {
        return;
      }

      if (mode === "initial" && conversations.length === 0) {
        setLoading(true);
      } else if (mode === "manual") {
        setRefreshing(true);
      }

      try {
        void ensureRealtimeRelayReady(profile);
        const localConversations = await listRealtimeConversations(profile.id);
        applyConversationSnapshot(localConversations);
      } catch (error) {
        if (mode !== "background") {
          toast.error(
            error instanceof Error ? error.message : "Could not load your local chat history."
          );
        } else {
          console.error("Background inbox refresh failed", error);
        }
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [applyConversationSnapshot, conversations.length, profile]
  );

  const loadConversationThread = useCallback(
    async (conversationId: string) => {
      if (!profile) {
        return;
      }

      const messages = await listRealtimeConversationMessages(profile.id, conversationId);
      const mappedMessages = messages.map(mapRealtimeMessageToChatMessage);
      const storedReactions = readStoredReactions(profile.id);
      const nextReactions = Object.fromEntries(
        mappedMessages
          .map((message) => [message.clientMessageId, storedReactions[message.clientMessageId]] as const)
          .filter((entry): entry is [string, string] => Boolean(entry[1]))
      );
      const hasUnreadIncoming = mappedMessages.some(
        (message) => !message.fromCurrentUser && message.unread
      );
      const nextMessages = hasUnreadIncoming
        ? mappedMessages.map((message) =>
            !message.fromCurrentUser && message.unread ? { ...message, unread: false } : message
          )
        : mappedMessages;

      startTransition(() => {
        setConversationMessages(nextMessages);
        setMessageReactions(nextReactions);
        if (hasUnreadIncoming) {
          setConversationUnreadCounts((current) => {
            if ((current[conversationId] || 0) === 0) {
              return current;
            }

            return {
              ...current,
              [conversationId]: 0,
            };
          });
        }
      });

      if (hasUnreadIncoming) {
        void markRealtimeConversationRead(profile.id, conversationId).catch(() => undefined);
      }

      scrollToBottom();
    },
    [profile, scrollToBottom]
  );

  const scheduleInboxRefresh = useCallback(() => {
    if (typeof window === "undefined") {
      void loadInbox("background");
      return;
    }

    if (inboxRefreshTimerRef.current !== null) {
      return;
    }

    inboxRefreshTimerRef.current = window.setTimeout(() => {
      inboxRefreshTimerRef.current = null;
      void loadInbox("background");
    }, BACKGROUND_REFRESH_DELAY_MS);
  }, [loadInbox]);

  const scheduleThreadRefresh = useCallback(
    (conversationId: string) => {
      if (typeof window === "undefined") {
        void loadConversationThread(conversationId);
        return;
      }

      if (threadRefreshTimerRef.current !== null) {
        return;
      }

      threadRefreshTimerRef.current = window.setTimeout(() => {
        threadRefreshTimerRef.current = null;
        void loadConversationThread(conversationId);
      }, BACKGROUND_REFRESH_DELAY_MS);
    },
    [loadConversationThread]
  );

  const applyPresenceUpdate = useCallback((peerUserId: string, online: boolean) => {
    startTransition(() => {
      setConversations((current) => {
        let changed = false;
        const next = current.map((entry) => {
          if (entry.peer.id !== peerUserId || entry.peer.online === online) {
            return entry;
          }

          changed = true;
          return {
            ...entry,
            peer: {
              ...entry.peer,
              online,
            },
          };
        });

        return changed ? next : current;
      });
    });
  }, []);

  const applyMessageStatusUpdate = useCallback(
    (messageId: string, status: LocalRealtimeMessage["status"]) => {
      const nextStatus = mapRealtimeStatusToChatStatus(status);

      startTransition(() => {
        setConversationMessages((current) => {
          let changed = false;
          const next = current.map((message) => {
            if (message.id !== messageId || message.status === nextStatus) {
              return message;
            }

            changed = true;
            return {
              ...message,
              status: nextStatus,
            };
          });

          return changed ? next : current;
        });
      });
    },
    []
  );

  useEffect(() => {
    if (!profile) {
      return;
    }

    void loadInbox("initial");
    void ensureRealtimeRelayReady(profile);
    void markRealtimeNotificationsRead(profile.id).catch(() => undefined);

    const unsubscribe = subscribeToRealtimeStorageChanges((detail) => {
      if (detail.userId !== profile.id) {
        return;
      }

      if (detail.reason === "presence" && detail.peerUserId) {
        applyPresenceUpdate(detail.peerUserId, Boolean(detail.online));
        return;
      }

      if (detail.reason === "message-status" && detail.messageId && detail.status) {
        applyMessageStatusUpdate(detail.messageId, detail.status);
      }

      if (detail.reason === "presence-sync") {
        scheduleInboxRefresh();
        return;
      }

      if (detail.affectsInbox) {
        scheduleInboxRefresh();
      }

      if (
        selectedConversationId &&
        detail.affectsThread &&
        (!detail.conversationId || detail.conversationId === selectedConversationId)
      ) {
        scheduleThreadRefresh(selectedConversationId);
      }
    });

    return () => {
      if (inboxRefreshTimerRef.current !== null) {
        window.clearTimeout(inboxRefreshTimerRef.current);
        inboxRefreshTimerRef.current = null;
      }
      if (threadRefreshTimerRef.current !== null) {
        window.clearTimeout(threadRefreshTimerRef.current);
        threadRefreshTimerRef.current = null;
      }
      unsubscribe();
    };
  }, [
    applyMessageStatusUpdate,
    applyPresenceUpdate,
    loadInbox,
    profile,
    scheduleInboxRefresh,
    scheduleThreadRefresh,
    selectedConversationId,
  ]);

  useEffect(() => {
    if (!profile || !selectedConversationId) {
      setActiveConversation(null);
      setConversationMessages([]);
      return;
    }

    void loadConversationThread(selectedConversationId);
    setActiveConversation(selectedConversationId);
  }, [loadConversationThread, profile, selectedConversationId, setActiveConversation]);

  useEffect(() => {
    if (!profile || !composeUsername) {
      return;
    }

    let disposed = false;

    const bootstrapComposeConversation = async () => {
      try {
        const peer = await findRealtimeChatProfileByUsername(profile.id, composeUsername);
        if (disposed) {
          return;
        }

        if (!peer) {
          toast.error("That user could not be found for messaging.");
          const next = new URLSearchParams(searchParams);
          next.delete("compose");
          setSearchParams(next, { replace: true });
          return;
        }

        const conversationId = createConversationId(profile.id, peer.id);
        await ensureRealtimeConversation(profile.id, peer);
        preferredConversationIdRef.current = conversationId;
        upsertConversationIntoState(peer, conversationId);
        const relayClient = await ensureRealtimeRelayReady(profile);
        relayClient.subscribePresence([peer.id]);
        const next = new URLSearchParams(searchParams);
        next.delete("request");
        next.delete("compose");
        next.set("conversation", conversationId);
        setSearchParams(next, { replace: true });
        void loadInbox("background");
      } catch (error) {
        if (!disposed) {
          toast.error(
            error instanceof Error ? error.message : "Could not open that conversation."
          );
        }
      }
    };

    void bootstrapComposeConversation();

    return () => {
      disposed = true;
    };
  }, [composeUsername, loadInbox, profile, searchParams, setSearchParams, upsertConversationIntoState]);

  useEffect(() => {
    if (!searchParams.has("request")) {
      return;
    }

    const next = new URLSearchParams(searchParams);
    next.delete("request");
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    setConversationMenuOpen(false);
  }, [selection]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const mediaQuery = window.matchMedia("(max-width: 767px)");
    const handleChange = (event: MediaQueryListEvent) => setIsMobileViewport(event.matches);
    setIsMobileViewport(mediaQuery.matches);
    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  useEffect(() => {
    const textarea = draftTextareaRef.current;

    if (!textarea) {
      return;
    }

    const minHeight = isMobileViewport ? 40 : 44;
    const maxHeight = isMobileViewport ? 112 : 132;
    textarea.style.height = "0px";
    textarea.style.height = `${Math.max(minHeight, Math.min(textarea.scrollHeight, maxHeight))}px`;
  }, [draftText, isMobileViewport, selection]);

  useEffect(() => {
    if (!isConversationScreen || !isMobileViewport || typeof window === "undefined") {
      setKeyboardInset(0);
      return;
    }

    const viewport = window.visualViewport;
    if (!viewport) {
      setKeyboardInset(0);
      return;
    }

    const updateInset = () => {
      const nextInset = Math.max(0, window.innerHeight - viewport.height - viewport.offsetTop);
      setKeyboardInset(nextInset);
    };

    updateInset();
    viewport.addEventListener("resize", updateInset);
    viewport.addEventListener("scroll", updateInset);

    return () => {
      viewport.removeEventListener("resize", updateInset);
      viewport.removeEventListener("scroll", updateInset);
    };
  }, [isConversationScreen, isMobileViewport]);

  useEffect(() => {
    if (!isConversationScreen || !isMobileViewport || typeof window === "undefined") {
      setMobileHeaderHeight(96);
      setMobileComposerHeight(132);
      return;
    }

    const updateMeasurements = () => {
      setMobileHeaderHeight(conversationHeaderRef.current?.offsetHeight ?? 96);
      setMobileComposerHeight(composerRef.current?.offsetHeight ?? 132);
    };

    updateMeasurements();

    if (typeof ResizeObserver === "undefined") {
      return;
    }

    const observer = new ResizeObserver(() => {
      updateMeasurements();
    });

    if (conversationHeaderRef.current) {
      observer.observe(conversationHeaderRef.current);
    }

    if (composerRef.current) {
      observer.observe(composerRef.current);
    }

    return () => observer.disconnect();
  }, [
    draftText,
    isConversationScreen,
    isMobileViewport,
    isRecording,
    recordedVoice,
    selectedImage,
    selectedConversationId,
  ]);

  useEffect(() => {
    if (!selectedConversationId) {
      return;
    }

    const frame = window.requestAnimationFrame(() => {
      const list = messageListRef.current;

      if (list) {
        list.scrollTop = list.scrollHeight;
      }
    });

    return () => {
      window.cancelAnimationFrame(frame);
    };
  }, [conversationMessages.length, selectedConversationId]);

  const openConversation = (conversationId: string) => {
    preferredConversationIdRef.current = null;
    const next = new URLSearchParams(searchParams);
    next.delete("request");
    next.delete("compose");
    next.set("conversation", conversationId);
    setSearchParams(next, { replace: false });
  };

  const clearSelection = () => {
    const next = new URLSearchParams(searchParams);
    next.delete("conversation");
    next.delete("request");
    next.delete("compose");
    setSearchParams(next, { replace: false });
  };

  const openPeerProfile = (username: string | null | undefined) => {
    if (!username) {
      return;
    }

    navigate(`/profile/${username}`);
  };

  const resetComposerState = () => {
    setDraftText("");
    setSelectedImage(null);
    setRecordedVoice(null);
    setReplyToMessage(null);
  };

  const exitSelectMode = () => {
    setSelectMode(false);
    setSelectedMessageIds(new Set());
  };

  const toggleMessageSelection = (messageId: string) => {
    setSelectedMessageIds((current) => {
      const next = new Set(current);
      if (next.has(messageId)) {
        next.delete(messageId);
      } else {
        next.add(messageId);
      }
      return next;
    });
  };

  const handleDeleteSelectedMessages = async () => {
    if (!profile || selectedMessageIds.size === 0) {
      return;
    }

    const confirmed = window.confirm(
      `Delete ${selectedMessageIds.size} message${selectedMessageIds.size === 1 ? "" : "s"} from this device?`
    );

    if (!confirmed) {
      return;
    }

    try {
      const idsToDelete = Array.from(selectedMessageIds);
      const idsToDeleteSet = new Set(idsToDelete);
      await deleteRealtimeMessages(profile.id, idsToDelete);
      removeStoredReactions(profile.id, idsToDelete);
      startTransition(() => {
        setConversationMessages((current) =>
          current.filter((message) => !idsToDeleteSet.has(message.id))
        );
        setMessageReactions((current) => {
          const next = { ...current };
          for (const messageId of idsToDelete) {
            delete next[messageId];
          }
          return next;
        });
      });
      toast.success(
        `${selectedMessageIds.size} message${selectedMessageIds.size === 1 ? "" : "s"} deleted.`
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not delete the messages.");
    } finally {
      exitSelectMode();
    }
  };

  const handleReactToMessage = async (messageId: string, emoji: string) => {
    if (!profile) {
      return;
    }

    const msg = conversationMessages.find((message) => message.id === messageId);
    if (!msg) {
      return;
    }

    const next = { ...readStoredReactions(profile.id) };
    if (next[msg.clientMessageId] === emoji) {
      delete next[msg.clientMessageId];
    } else {
      next[msg.clientMessageId] = emoji;
    }
    writeStoredReactions(profile.id, next);

    const nextConversationReactions = Object.fromEntries(
      conversationMessages
        .map((message) => [message.clientMessageId, next[message.clientMessageId]] as const)
        .filter((entry): entry is [string, string] => Boolean(entry[1]))
    );

    setMessageReactions(nextConversationReactions);
    setReactionTarget(null);
  };

  const handleSendMessage = async () => {
    if (!profile || !selectedConversation) {
      return;
    }

    if (!selectedConversation.peer.canChat) {
      toast.error("This chat is currently blocked on this device.");
      return;
    }

    if (selectedImage || recordedVoice) {
      resetComposerState();
      toast.error("Stateless relay chat currently supports text messages only.");
      return;
    }

    const textToSend = draftText.trim();
    const replyRef = replyToMessage;

    if (!textToSend) {
      return;
    }

    const finalText = replyRef
      ? `[reply:${replyRef.clientMessageId}] ${textToSend}`
      : textToSend;

    setSending(true);
    resetComposerState();

    try {
      const relayClient = await ensureRealtimeRelayReady(profile);
      await relayClient.queueTextMessage(
        mapChatPeerToRealtimePeer(selectedConversation.peer),
        finalText
      );
      scrollToBottom("smooth");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not send the message.");
    } finally {
      setSending(false);
    }
  };

  const handleDraftKeyDown = (event: ReactKeyboardEvent<HTMLTextAreaElement>) => {
    if (
      isMobileViewport ||
      event.key !== "Enter" ||
      event.shiftKey ||
      event.nativeEvent.isComposing
    ) {
      return;
    }

    event.preventDefault();

    if (!draftText.trim() || sending) {
      return;
    }

    void handleSendMessage();
  };

  const handleRefreshConversation = async () => {
    if (!profile || !selectedConversationId) {
      return;
    }

    setConversationMenuOpen(false);

    try {
      const relayClient = await ensureRealtimeRelayReady(profile);
      await relayClient.sendHeartbeat();
      await relayClient.flushQueuedMessages();
      await loadInbox("background");
      await loadConversationThread(selectedConversationId);
      toast.success("Chat refreshed.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not refresh this chat.");
    }
  };

  const handleDeleteAllMessages = async () => {
    if (!profile || !selectedConversation) {
      return;
    }

    const confirmed = window.confirm(
      "Delete all messages from this device for this conversation?"
    );

    if (!confirmed) {
      return;
    }

    setConversationMenuOpen(false);

    try {
      const clientMessageIds = conversationMessages.map((message) => message.clientMessageId);
      await deleteAllRealtimeConversationMessages(
        profile.id,
        selectedConversation.conversation.id
      );
      removeStoredReactions(profile.id, clientMessageIds);
      startTransition(() => {
        setConversationMessages([]);
        setMessageReactions({});
      });
      toast.success("Local chat history cleared for this device.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not clear the local chat history.");
    }
  };

  const handleDeleteConversation = async () => {
    if (!profile || !selectedConversation) {
      return;
    }

    const confirmed = window.confirm(
      "Delete this conversation from this device? This only removes the local copy."
    );

    if (!confirmed) {
      return;
    }

    setConversationMenuOpen(false);

    try {
      const clientMessageIds = conversationMessages.map((message) => message.clientMessageId);
      await deleteRealtimeConversation(profile.id, selectedConversation.conversation.id);
      removeStoredReactions(profile.id, clientMessageIds);
      startTransition(() => {
        setConversations((current) =>
          current.filter((entry) => entry.conversation.id !== selectedConversation.conversation.id)
        );
        setConversationMessages([]);
        setMessageReactions({});
        setConversationPreviews((current) => {
          const next = { ...current };
          delete next[selectedConversation.conversation.id];
          return next;
        });
        setConversationUnreadCounts((current) => {
          const next = { ...current };
          delete next[selectedConversation.conversation.id];
          return next;
        });
      });
      clearSelection();
      toast.success("Conversation removed from this device.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not delete this conversation.");
    }
  };

  const handleToggleBlockUser = async () => {
    if (!selectedConversation) {
      return;
    }

    setConversationMenuOpen(false);
    toast("User blocking is not part of the stateless relay mode yet.");
  };

  const toggleVoiceRecording = async () => {
    if (isRecording) {
      setIsRecording(false);
      toast("Voice sending is not available in the stateless relay mode yet.");
      return;
    }

    setSelectedImage(null);
    setRecordedVoice(null);
    setIsRecording(true);
    toast("Voice upload is not available in the stateless relay mode yet.");
  };

  const handleDeleteSingleMessage = async (messageId: string) => {
    if (!profile) {
      return;
    }

    const confirmed = window.confirm("Delete this message from this device?");

    if (!confirmed) {
      return;
    }

    try {
      const target = conversationMessages.find((message) => message.id === messageId);
      await deleteRealtimeMessage(profile.id, messageId);
      if (target) {
        removeStoredReactions(profile.id, [target.clientMessageId]);
      }
      startTransition(() => {
        setConversationMessages((current) => current.filter((message) => message.id !== messageId));
        setMessageReactions((current) => {
          const next = { ...current };
          if (target) {
            delete next[target.clientMessageId];
          }
          return next;
        });
      });
      toast.success("Message deleted.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not delete this message.");
    }
  };

  if (!profile) {
    return null;
  }

  const pendingRequests: never[] = [];
  const showMobileDetail = Boolean(selection) || Boolean(composeUsername);
  const isPreparingConversation =
    Boolean(composeUsername) ||
    (Boolean(selectedConversationId) &&
      !selectedConversation &&
      preferredConversationIdRef.current === selectedConversationId);
  const blockBannerText = selectedConversation?.peer.blockedByCurrentUser
    ? "You blocked this user on this device. Unblock them from the menu to start chatting again."
    : null;

  return (
    <div
      className={`${
        isConversationScreen ? "h-[100dvh] min-h-[100dvh] md:h-full md:min-h-0" : "h-full min-h-0"
      } overflow-hidden bg-app-card shadow-[0_20px_60px_rgba(15,23,42,0.08)] ${
        showMobileDetail
          ? "border-0 sm:rounded-[30px] sm:border"
          : "border-y border-app-border sm:rounded-[30px] sm:border"
      }`}
    >
      <div className="flex h-full min-h-0 lg:grid lg:grid-cols-[clamp(19rem,24vw,22rem)_minmax(0,1fr)] xl:grid-cols-[clamp(20rem,23vw,23rem)_minmax(0,1fr)]">
        <ChatSidebar
          showMobileDetail={showMobileDetail}
          loading={loading}
          unreadCount={unreadConversationCount}
          pendingRequestCount={0}
          refreshing={refreshing}
          pendingRequests={pendingRequests}
          selectedRequestId={null}
          conversations={conversations}
          selectedConversationId={
            selection?.type === "conversation" ? selection.conversationId : null
          }
          conversationPreviews={conversationPreviews}
          conversationUnreadCounts={conversationUnreadCounts}
          onRefresh={() => void loadInbox("manual")}
          onOpenRequest={() => undefined}
          onOpenConversation={openConversation}
        />

        <section
          className={`${showMobileDetail ? "flex" : "hidden lg:flex"} relative h-full min-h-0 flex-1 flex-col overflow-hidden ${
            isConversationScreen
              ? "bg-transparent"
              : "bg-[linear-gradient(180deg,rgba(37,211,102,0.04),rgba(37,99,235,0.02))]"
          }`}
          style={
            isConversationScreen
              ? undefined
              : {
                  backgroundImage:
                    "radial-gradient(circle at top left, rgba(37,211,102,0.08), transparent 22%), radial-gradient(circle at bottom right, rgba(16,185,129,0.08), transparent 24%), linear-gradient(180deg, rgba(37,99,235,0.02), rgba(37,99,235,0.01))",
                }
          }
        >
          {loading || isPreparingConversation ? (
            <div className="flex min-h-[32rem] items-center justify-center text-sm text-app-muted">
              Preparing local realtime chat...
            </div>
          ) : selection?.type === "conversation" && selectedConversation ? (
            <ChatConversationView
              selectedConversation={selectedConversation}
              conversationMessages={conversationMessages}
              attachmentUrls={{}}
              draftText={draftText}
              selectedImage={selectedImage}
              recordedVoice={recordedVoice}
              isRecording={isRecording}
              replyToMessage={replyToMessage}
              selectMode={selectMode}
              selectedMessageIds={selectedMessageIds}
              reactionTarget={reactionTarget}
              messageReactions={messageReactions}
              hasMoreMessages={hasMoreMessages}
              isLoadingMore={isLoadingMore}
              isConversationScreen={isConversationScreen}
              isMobileViewport={isMobileViewport}
              keyboardInset={keyboardInset}
              mobileHeaderHeight={mobileHeaderHeight}
              mobileComposerHeight={mobileComposerHeight}
              blockBannerText={blockBannerText}
              conversationMenuOpen={conversationMenuOpen}
              messageListRef={messageListRef}
              conversationHeaderRef={conversationHeaderRef}
              composerRef={composerRef}
              draftTextareaRef={draftTextareaRef}
              onBack={clearSelection}
              onOpenProfile={() => openPeerProfile(selectedConversation.peer.username)}
              onToggleMenu={() => setConversationMenuOpen((current) => !current)}
              onCloseMenu={() => setConversationMenuOpen(false)}
              onRefreshConversation={() => void handleRefreshConversation()}
              onEnterSelectMode={() => setSelectMode(true)}
              onDeleteConversation={() => void handleDeleteConversation()}
              onDeleteAllMessages={() => void handleDeleteAllMessages()}
              onToggleBlockUser={() => void handleToggleBlockUser()}
              onLoadMoreMessages={() => undefined}
              onToggleMessageSelection={toggleMessageSelection}
              onDeleteSelectedMessages={() => void handleDeleteSelectedMessages()}
              onDeleteSingleMessage={(messageId) => void handleDeleteSingleMessage(messageId)}
              onExitSelectMode={exitSelectMode}
              onSetReplyToMessage={setReplyToMessage}
              onSetReactionTarget={setReactionTarget}
              onReactToMessage={handleReactToMessage}
              onDraftChange={setDraftText}
              onDraftKeyDown={handleDraftKeyDown}
              onImageChange={(file) => {
                setSelectedImage(file);
                if (file) {
                  setRecordedVoice(null);
                  setIsRecording(false);
                }
              }}
              onToggleVoiceRecording={() => void toggleVoiceRecording()}
              onSendMessage={() => void handleSendMessage()}
            />
          ) : (
            <ChatEmptyState />
          )}
        </section>
      </div>
    </div>
  );
}
