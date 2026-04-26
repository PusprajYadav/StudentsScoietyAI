import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { KeyboardEvent as ReactKeyboardEvent } from "react";
import toast from "react-hot-toast";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ChatComposeRequestPanel } from "../features/chat/components/ChatComposeRequestPanel";
import { ChatConversationView } from "../features/chat/components/ChatConversationView";
import { ChatEmptyState } from "../features/chat/components/ChatEmptyState";
import { ChatRequestDetailPanel } from "../features/chat/components/ChatRequestDetailPanel";
import { ChatSidebar } from "../features/chat/components/ChatSidebar";
import {
  blockChatUser,
  createChatRequest,
  deleteChatConversation,
  hydrateAcceptedRequestIntoConversation,
  loadChatConversations,
  loadChatRequests,
  loadChatTarget,
  loadConversationReactions,
  respondToChatRequest,
  sendChatMessage,
  toggleMessageReaction,
  unblockChatUser,
} from "../lib/chat/api";
import { COIN_FEATURE_KEYS, getCoinCostLabel } from "../lib/coins";
import type { ChatReaction } from "../lib/chat/api";
import {
  deleteAllLocalConversationMessages,
  listConversationSummaries,
  deleteLocalConversation,
  deleteLocalMessage,
  getAttachmentBlob,
  getLatestConversationPreview,
  listConversationMessagesPaginated,
} from "../lib/chat/localStore";
import type {
  ChatConversationDetails,
  ChatRequestRecord,
  ChatTargetDetails,
  LocalChatMessage,
  LocalChatMessagePreview,
} from "../lib/chat/types";
import { useAuthStore } from "../store/authStore";
import { useChatStore } from "../store/chatStore";
import { useCoinWalletStore } from "../store/coinWalletStore";

type SidebarSelection =
  | {
      type: "conversation";
      conversationId: string;
    }
  | {
      type: "request";
      requestId: string;
    }
  | {
      type: "compose";
      username: string;
    }
  | null;

export function MessagesPage() {
  const { profile } = useAuthStore();
  const coinFeatureSettings = useCoinWalletStore((state) => state.featureSettings);
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const sync = useChatStore((state) => state.sync);
  const markConversationSeen = useChatStore((state) => state.markConversationSeen);
  const unreadCount = useChatStore((state) => state.unreadCount);
  const pendingRequestCount = useChatStore((state) => state.pendingRequestCount);
  const setActiveConversation = useChatStore((state) => state.setActiveConversation);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [conversations, setConversations] = useState<ChatConversationDetails[]>([]);
  const [requests, setRequests] = useState<ChatRequestRecord[]>([]);
  const [composeTarget, setComposeTarget] = useState<ChatTargetDetails | null>(null);
  const [conversationMessages, setConversationMessages] = useState<LocalChatMessage[]>([]);
  const [conversationPreviews, setConversationPreviews] = useState<Record<string, LocalChatMessagePreview>>({});
  const [attachmentUrls, setAttachmentUrls] = useState<Record<string, string>>({});
  const [draftText, setDraftText] = useState("");
  const [requestText, setRequestText] = useState("");
  const [sending, setSending] = useState(false);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [recordedVoice, setRecordedVoice] = useState<File | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [replyToMessage, setReplyToMessage] = useState<LocalChatMessage | null>(null);
  const [selectMode, setSelectMode] = useState(false);
  const [selectedMessageIds, setSelectedMessageIds] = useState<Set<string>>(new Set());
  const [reactionTarget, setReactionTarget] = useState<{ messageId: string; x: number; y: number; timestamp: number } | null>(null);
  const [messageReactions, setMessageReactions] = useState<Record<string, string>>({}); // clientMessageId -> emoji
  const [hasMoreMessages, setHasMoreMessages] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const draftTextareaRef = useRef<HTMLTextAreaElement | null>(null);
  const messageListRef = useRef<HTMLDivElement | null>(null);
  const conversationHeaderRef = useRef<HTMLDivElement | null>(null);
  const composerRef = useRef<HTMLDivElement | null>(null);
  const PAGE_SIZE = 15;
  const [conversationMenuOpen, setConversationMenuOpen] = useState(false);
  const [isMobileViewport, setIsMobileViewport] = useState(
    typeof window !== "undefined" ? window.matchMedia("(max-width: 767px)").matches : false
  );
  const [keyboardInset, setKeyboardInset] = useState(0);
  const [mobileHeaderHeight, setMobileHeaderHeight] = useState(96);
  const [mobileComposerHeight, setMobileComposerHeight] = useState(132);

  const selectedConversationId = searchParams.get("conversation");
  const selectedRequestId = searchParams.get("request");
  const composeUsername = searchParams.get("compose");

  const selection: SidebarSelection = useMemo(
    () =>
      selectedConversationId
        ? {
            type: "conversation",
            conversationId: selectedConversationId,
          }
        : selectedRequestId
          ? {
              type: "request",
              requestId: selectedRequestId,
            }
          : composeUsername
            ? {
                type: "compose",
                username: composeUsername,
              }
            : null,
    [composeUsername, selectedConversationId, selectedRequestId]
  );

  const selectedConversation = useMemo(
    () =>
      conversations.find((entry) => entry.conversation.id === selectedConversationId) || null,
    [conversations, selectedConversationId]
  );
  const selectedRequest = useMemo(
    () => requests.find((entry) => entry.id === selectedRequestId) || null,
    [requests, selectedRequestId]
  );
  const chatRequestCostLabel = getCoinCostLabel(
    coinFeatureSettings,
    COIN_FEATURE_KEYS.chatRequestSend
  );
  const isConversationScreen = selection?.type === "conversation" && Boolean(selectedConversation);
  const isConversationBlocked = Boolean(selectedConversation && !selectedConversation.peer.canChat);

  const scrollToBottom = useCallback(() => {
    requestAnimationFrame(() => {
      const el = messageListRef.current;
      if (el) {
        el.scrollTop = el.scrollHeight;
      }
    });
  }, []);

  const loadConversationThread = useCallback(
    async (conversationId: string) => {
      if (!profile) {
        return;
      }

      const [{ messages }, reactions] = await Promise.all([
        listConversationMessagesPaginated(profile.id, conversationId, PAGE_SIZE, 0),
        loadConversationReactions(conversationId).catch(() => [] as ChatReaction[]),
      ]);
      setConversationMessages(messages);
      setHasMoreMessages(messages.length === PAGE_SIZE);

      // Build reactions map: clientMessageId -> emoji (from current user)
      const reactionsMap: Record<string, string> = {};
      for (const r of reactions) {
        if (r.reactor_id === profile.id) {
          reactionsMap[r.client_message_id] = r.emoji;
        }
      }
      setMessageReactions(reactionsMap);

      await markConversationSeen(profile.id, conversationId);

      // Scroll to bottom after messages render
      scrollToBottom();
    },
    [markConversationSeen, profile, scrollToBottom]
  );

  const hydrateInboxFromLocalCache = useCallback(async () => {
    if (!profile) {
      return;
    }

    const summaries = await listConversationSummaries(profile.id);

    if (!summaries.length) {
      return;
    }

    const localEntries: ChatConversationDetails[] = summaries.map((summary) => ({
      conversation: {
        id: summary.id,
        conversation_type: "direct",
        direct_message_key: null,
        created_by: profile.id,
        last_server_activity_at: summary.lastMessageAt,
        expires_at:
          new Date(
            (summary.lastMessageAt ? new Date(summary.lastMessageAt) : new Date()).getTime() +
              7 * 24 * 60 * 60 * 1000
          ).toISOString(),
        created_at: summary.lastMessageAt || new Date().toISOString(),
        updated_at: summary.lastMessageAt || new Date().toISOString(),
      },
      peer: {
        id: summary.peerId,
        username: summary.peerUsername || "student",
        full_name: summary.peerFullName || summary.peerUsername || "Student",
        avatar_url: summary.peerAvatarUrl,
        is_verified: summary.peerIsVerified,
        updated_at: summary.peerUpdatedAt,
        online: false,
        blockedByCurrentUser: false,
        blockedCurrentUser: false,
        canChat: true,
      },
    }));

    const localPreviewMap = Object.fromEntries(
      summaries.map((summary) => [
        summary.id,
        {
          text: summary.lastPreviewText || "No local messages yet",
          createdAt: summary.lastMessageAt,
          kind: summary.lastMessageKind,
        } satisfies LocalChatMessagePreview,
      ])
    );

    setConversations((current) => (current.length > 0 ? current : localEntries));
    setConversationPreviews((current) =>
      Object.keys(current).length > 0 ? current : localPreviewMap
    );
    setLoading(false);
  }, [profile]);

  const loadMoreMessages = useCallback(async () => {
    if (!profile || !selectedConversation || isLoadingMore || !hasMoreMessages) return;

    setIsLoadingMore(true);
    const currentCount = conversationMessages.length;

    try {
      const { messages: olderMessages } = await listConversationMessagesPaginated(
        profile.id,
        selectedConversation.conversation.id,
        PAGE_SIZE,
        currentCount
      );

      if (olderMessages.length > 0) {
        // Remember scroll position so we can restore it
        const el = messageListRef.current;
        const prevScrollHeight = el?.scrollHeight || 0;

        setConversationMessages((current) => [...olderMessages, ...current]);
        setHasMoreMessages(olderMessages.length === PAGE_SIZE);

        // Restore scroll position after new messages are prepended
        requestAnimationFrame(() => {
          if (el) {
            const newScrollHeight = el.scrollHeight;
            el.scrollTop = newScrollHeight - prevScrollHeight;
          }
        });
      } else {
        setHasMoreMessages(false);
      }
    } catch (error) {
      console.error("[loadMoreMessages] Failed:", error);
    } finally {
      setIsLoadingMore(false);
    }
  }, [profile, selectedConversation, isLoadingMore, hasMoreMessages, conversationMessages.length]);

  const loadInbox = useCallback(
    async (showSpinner = true) => {
      if (!profile) {
        return;
      }

      if (showSpinner && conversations.length === 0 && requests.length === 0) {
        setLoading(true);
      } else {
        setRefreshing(true);
      }

      try {
        const syncTask = sync(profile.id);
        const [nextConversations, nextRequests] = await Promise.all([
          loadChatConversations(profile.id),
          loadChatRequests(profile.id),
        ]);
        await syncTask;

        const previewEntries = await Promise.all(
          nextConversations.map(async (entry) => {
            const preview = await getLatestConversationPreview(profile.id, entry.conversation.id);
            return [entry.conversation.id, preview] as const;
          })
        );

        const previewMap = Object.fromEntries(previewEntries);
        setConversations(nextConversations);
        setRequests(nextRequests);
        setConversationPreviews(previewMap);

        await Promise.all(
          nextRequests.map(async (request) => {
            if (
              request.direction === "outgoing" &&
              request.status === "accepted" &&
              request.accepted_conversation_id
            ) {
              await hydrateAcceptedRequestIntoConversation({
                currentUserId: profile.id,
                requestId: request.id,
                conversationId: request.accepted_conversation_id,
                peer: request.recipient_profile,
              });
            }
          })
        );
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Could not load your messages.");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [conversations.length, profile, requests.length, sync]
  );

  useEffect(() => {
    void hydrateInboxFromLocalCache();
  }, [hydrateInboxFromLocalCache]);

  useEffect(() => {
    void loadInbox(true);
  }, [loadInbox]);

  useEffect(() => {
    if (!profile) {
      return;
    }

    if (selection?.type === "conversation") {
      void loadConversationThread(selection.conversationId);
      setActiveConversation(selection.conversationId);
      return;
    }

    setActiveConversation(null);
    setConversationMessages([]);
  }, [loadConversationThread, profile, selection, setActiveConversation]);

  useEffect(() => {
    if (!profile || selection?.type !== "compose") {
      setComposeTarget(null);
      return;
    }

    let disposed = false;

    const bootstrapCompose = async () => {
      try {
        const target = await loadChatTarget({ username: selection.username });

        if (disposed) {
          return;
        }

        if (target.existingConversation) {
          const next = new URLSearchParams(searchParams);
          next.delete("compose");
          next.set("conversation", target.existingConversation.id);
          setSearchParams(next, { replace: true });
          return;
        }

        setComposeTarget(target);
      } catch (error) {
        if (!disposed) {
          toast.error(error instanceof Error ? error.message : "Could not open this chat target.");
        }
      }
    };

    void bootstrapCompose();

    return () => {
      disposed = true;
    };
  }, [profile, searchParams, selection, setSearchParams]);

  useEffect(() => {
    if (!profile || selection?.type !== "conversation") {
      setAttachmentUrls({});
      return;
    }

    let disposed = false;
    const urlsToRevoke: string[] = [];

    const loadAttachments = async () => {
      const attachmentEntries = await Promise.all(
        conversationMessages.map(async (message) => {
          if (!message.attachment) {
            return null;
          }

          const blob = await getAttachmentBlob(profile.id, message.attachment.id);

          if (!blob || disposed) {
            return null;
          }

          return [message.attachment.id, URL.createObjectURL(blob)] as const;
        })
      );

      const nextUrls: Record<string, string> = {};

      attachmentEntries.forEach((entry) => {
        if (!entry) {
          return;
        }

        const [attachmentId, objectUrl] = entry;
        urlsToRevoke.push(objectUrl);
        nextUrls[attachmentId] = objectUrl;
      });

      if (!disposed) {
        setAttachmentUrls(nextUrls);
      }
    };

    void loadAttachments();

    return () => {
      disposed = true;
      urlsToRevoke.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [conversationMessages, profile, selection]);

  useEffect(() => {
    setConversationMenuOpen(false);
  }, [selection]);

  // Menu closes when tapping the backdrop — no need for document event listeners

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
  }, [draftText, isConversationScreen, isMobileViewport, isRecording, recordedVoice, selectedImage, selectedConversationId]);

  useEffect(() => {
    if (selection?.type !== "conversation") {
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
  }, [conversationMessages.length, selection, selectedConversationId]);

  const openConversation = (conversationId: string) => {
    const next = new URLSearchParams(searchParams);
    next.delete("request");
    next.delete("compose");
    next.set("conversation", conversationId);
    setSearchParams(next, { replace: false });
  };

  const openRequest = (requestId: string) => {
    const next = new URLSearchParams(searchParams);
    next.delete("conversation");
    next.delete("compose");
    next.set("request", requestId);
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
    setRequestText("");
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
      for (const messageId of selectedMessageIds) {
        await deleteLocalMessage(profile.id, messageId);
      }

      if (selection?.type === "conversation") {
        await loadConversationThread(selection.conversationId);
      }

      await loadInbox(false);
      toast.success(`${selectedMessageIds.size} message${selectedMessageIds.size === 1 ? "" : "s"} deleted.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not delete the messages.");
    } finally {
      exitSelectMode();
    }
  };

  const handleReactToMessage = async (messageId: string, emoji: string) => {
    // Find the message to get clientMessageId and conversationId
    const msg = conversationMessages.find((m) => m.id === messageId);
    if (!msg) return;

    // Optimistic update
    setMessageReactions((current) => {
      const next = { ...current };
      if (next[msg.clientMessageId] === emoji) {
        delete next[msg.clientMessageId];
      } else {
        next[msg.clientMessageId] = emoji;
      }
      return next;
    });
    setReactionTarget(null);

    // Persist to backend
    try {
      const result = await toggleMessageReaction({
        conversationId: msg.conversationId,
        clientMessageId: msg.clientMessageId,
        emoji,
      });

      // Sync with server response
      setMessageReactions((current) => {
        const next = { ...current };
        if (result.emoji === null) {
          delete next[msg.clientMessageId];
        } else {
          next[msg.clientMessageId] = result.emoji;
        }
        return next;
      });
    } catch (error) {
      console.error("[handleReactToMessage] Failed:", error);
      // Revert optimistic update on error
      setMessageReactions((current) => {
        const next = { ...current };
        delete next[msg.clientMessageId];
        return next;
      });
    }
  };

  const handleSendRequest = async () => {
    if (!profile || !composeTarget) {
      return;
    }

    setSending(true);

    try {
      const result = await createChatRequest({
        currentUserId: profile.id,
        recipientId: composeTarget.profile.id,
        text: requestText,
      });

      resetComposerState();
      void loadInbox(false);

      if (result.conversationId) {
        openConversation(result.conversationId);
      } else {
        const next = new URLSearchParams(searchParams);
        next.delete("compose");
        if (result.requestId) {
          next.set("request", result.requestId);
        }
        setSearchParams(next, { replace: true });
      }

      toast.success("Chat request sent.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not send the chat request.");
    } finally {
      setSending(false);
    }
  };

  const handleRespondToRequest = async (action: "accept" | "decline") => {
    if (!profile || !selectedRequest) {
      return;
    }

    setSending(true);

    try {
      const response = await respondToRequestWithUi({
        currentUserId: profile.id,
        request: selectedRequest,
        action,
      });

      void loadInbox(false);

      if (action === "accept" && response.accepted_conversation_id) {
        openConversation(response.accepted_conversation_id);
      } else {
        const next = new URLSearchParams(searchParams);
        next.delete("request");
        setSearchParams(next, { replace: true });
      }

      toast.success(action === "accept" ? "Chat request accepted." : "Chat request declined.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update the chat request.");
    } finally {
      setSending(false);
    }
  };

  const handleSendMessage = async () => {
    if (!profile || !selectedConversation) {
      return;
    }

    if (!selectedConversation.peer.canChat) {
      toast.error(
        selectedConversation.peer.blockedByCurrentUser
          ? "You blocked this user. Unblock them to message again."
          : "This chat is currently blocked."
      );
      return;
    }

    const textToSend = draftText.trim();
    const imageToSend = selectedImage;
    const voiceToSend = recordedVoice;
    const replyRef = replyToMessage;

    if (!textToSend && !imageToSend && !voiceToSend) {
      return;
    }

    // Prefix reply reference if replying
    const finalText = replyRef
      ? `[reply:${replyRef.clientMessageId}] ${textToSend}`
      : textToSend;

    // ── Optimistic UI: clear input + show message INSTANTLY ──
    resetComposerState();

    const optimisticId = `optimistic-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const optimisticMessage: LocalChatMessage = {
      id: optimisticId,
      conversationId: selectedConversation.conversation.id,
      clientMessageId: optimisticId,
      requestId: null,
      senderId: profile.id,
      recipientId: selectedConversation.peer.id,
      createdAt: new Date().toISOString(),
      fromCurrentUser: true,
      unread: false,
      status: "sent" as const,
      messageKind: imageToSend ? "image" : voiceToSend ? "voice" : "text",
      text: finalText || null,
      attachment: null,
    };

    setConversationMessages((current) => [...current, optimisticMessage]);

    // Scroll to bottom when sending a message
    scrollToBottom("smooth");

    // ── Send in background — don't block the UI ──
    const sendInBackground = async () => {
      try {
        if (imageToSend) {
          await sendChatMessage({
            currentUserId: profile.id,
            conversationId: selectedConversation.conversation.id,
            peer: selectedConversation.peer,
            messageKind: "image",
            text: finalText,
            file: imageToSend,
          });
        } else if (voiceToSend) {
          await sendChatMessage({
            currentUserId: profile.id,
            conversationId: selectedConversation.conversation.id,
            peer: selectedConversation.peer,
            messageKind: "voice",
            text: finalText,
            file: voiceToSend,
          });
        } else {
          await sendChatMessage({
            currentUserId: profile.id,
            conversationId: selectedConversation.conversation.id,
            peer: selectedConversation.peer,
            messageKind: "text",
            text: finalText,
          });
        }

        // Refresh thread to get the real message from local store
        await loadConversationThread(selectedConversation.conversation.id);
        void loadInbox(false);
      } catch (error) {
        // Remove optimistic message on failure
        setConversationMessages((current) =>
          current.filter((message) => message.id !== optimisticId)
        );
        toast.error(error instanceof Error ? error.message : "Could not send the message.");
      }
    };

    void sendInBackground();
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

    if (isConversationBlocked || (!draftText.trim() && !selectedImage && !recordedVoice)) {
      return;
    }

    void handleSendMessage();
  };

  const updateConversationPeerBlockState = useCallback(
    (
      conversationId: string,
      blockState: {
        blockedByCurrentUser: boolean;
        blockedCurrentUser: boolean;
        canChat: boolean;
      }
    ) => {
      setConversations((current) =>
        current.map((entry) =>
          entry.conversation.id === conversationId
            ? {
                ...entry,
                peer: {
                  ...entry.peer,
                  ...blockState,
                },
              }
            : entry
        )
      );
    },
    []
  );

  const handleRefreshConversation = async () => {
    if (!selection || selection.type !== "conversation") {
      return;
    }

    setConversationMenuOpen(false);

    try {
      await loadInbox(false);
      await loadConversationThread(selection.conversationId);
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
      "Delete all messages from this device for this conversation? This only removes the local copies saved on this phone/browser."
    );

    if (!confirmed) {
      return;
    }

    setConversationMenuOpen(false);

    try {
      await deleteAllLocalConversationMessages(profile.id, selectedConversation.conversation.id);
      await loadConversationThread(selectedConversation.conversation.id);
      await loadInbox(false);
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
      "Delete this conversation for both users and clear it from the server now? If you do nothing, it will still auto-delete from the server after 7 days."
    );

    if (!confirmed) {
      return;
    }

    setConversationMenuOpen(false);

    try {
      await deleteChatConversation(selectedConversation.conversation.id);
      await deleteLocalConversation(profile.id, selectedConversation.conversation.id);
      const next = new URLSearchParams(searchParams);
      next.delete("conversation");
      setSearchParams(next, { replace: true });
      await loadInbox(false);
      setConversationMessages([]);
      toast.success("Conversation deleted.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not delete this conversation.");
    }
  };

  const handleToggleBlockUser = async () => {
    if (!selectedConversation) {
      return;
    }

    const { peer, conversation } = selectedConversation;
    const wantsToUnblock = peer.blockedByCurrentUser;
    const confirmed = wantsToUnblock
      ? true
      : window.confirm(
          `Block ${peer.full_name || peer.username}? They will not be able to send you new chat messages or requests until you unblock them.`
        );

    if (!confirmed) {
      return;
    }

    setConversationMenuOpen(false);

    try {
      const nextState = wantsToUnblock
        ? await unblockChatUser(peer.id)
        : await blockChatUser(peer.id);

      updateConversationPeerBlockState(conversation.id, nextState);

      if (nextState.blockedByCurrentUser) {
        resetComposerState();
      }

      await loadInbox(false);
      toast.success(
        wantsToUnblock
          ? `${peer.full_name || peer.username} has been unblocked.`
          : `${peer.full_name || peer.username} has been blocked.`
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update this chat block setting.");
    }
  };

  const toggleVoiceRecording = async () => {
    if (isRecording) {
      recorderRef.current?.stop();
      setIsRecording(false);
      return;
    }

    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      toast.error("Voice recording is not supported in this browser.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported("audio/webm")
          ? "audio/webm"
          : undefined,
      });

      recordedChunksRef.current = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      };
      recorder.onstop = () => {
        const blob = new Blob(recordedChunksRef.current, {
          type: recorder.mimeType || "audio/webm",
        });
        stream.getTracks().forEach((track) => track.stop());
        setRecordedVoice(
          new File([blob], `voice-${Date.now()}.webm`, {
            type: blob.type || "audio/webm",
          })
        );
      };

      recorder.start();
      recorderRef.current = recorder;
      setRecordedVoice(null);
      setSelectedImage(null);
      setIsRecording(true);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not start voice recording.");
    }
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
      await deleteLocalMessage(profile.id, messageId);

      if (selection?.type === "conversation") {
        await loadConversationThread(selection.conversationId);
      }

      await loadInbox(false);
      toast.success("Message deleted.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not delete this message.");
    }
  };

  if (!profile) {
    return null;
  }

  const pendingRequests = requests.filter((request) => request.status === "pending");
  const showMobileDetail = Boolean(selection);
  const blockBannerText = selectedConversation?.peer.blockedByCurrentUser
    ? "You blocked this user. Unblock them from the menu to start chatting again."
    : selectedConversation?.peer.blockedCurrentUser
      ? "This user is not available for chatting right now."
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
          unreadCount={unreadCount}
          pendingRequestCount={pendingRequestCount}
          refreshing={refreshing}
          pendingRequests={pendingRequests}
          selectedRequestId={selection?.type === "request" ? selection.requestId : null}
          conversations={conversations}
          selectedConversationId={
            selection?.type === "conversation" ? selection.conversationId : null
          }
          conversationPreviews={conversationPreviews}
          onRefresh={() => void loadInbox(false)}
          onOpenRequest={openRequest}
          onOpenConversation={openConversation}
        />

        <section
          className={`${showMobileDetail ? "flex" : "hidden lg:flex"} relative min-h-0 flex-1 flex-col overflow-hidden ${
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
          {loading ? (
            <div className="flex min-h-[32rem] items-center justify-center text-sm text-app-muted">
              Loading secure conversations...
            </div>
          ) : selection?.type === "compose" ? (
            composeTarget ? (
              <ChatComposeRequestPanel
                composeTarget={composeTarget}
                requestText={requestText}
                sending={sending}
                chatRequestCostLabel={chatRequestCostLabel}
                onBack={clearSelection}
                onOpenProfile={() => openPeerProfile(composeTarget.profile.username)}
                onRequestTextChange={setRequestText}
                onAppendEmoji={(emoji) => setRequestText((current) => `${current}${emoji}`)}
                onSend={() => void handleSendRequest()}
              />
            ) : (
              <div className="flex min-h-[24rem] items-center justify-center text-sm text-app-muted">
                Preparing secure chat target...
              </div>
            )
          ) : selection?.type === "request" ? (
            selectedRequest ? (
              <ChatRequestDetailPanel
                request={selectedRequest}
                sending={sending}
                onBack={clearSelection}
                onOpenProfile={() =>
                  openPeerProfile(
                    selectedRequest.direction === "incoming"
                      ? selectedRequest.sender_profile.username
                      : selectedRequest.recipient_profile.username
                  )
                }
                onRespond={(action) => void handleRespondToRequest(action)}
              />
            ) : (
              <div className="flex min-h-[24rem] items-center justify-center text-sm text-app-muted">
                That request could not be found.
              </div>
            )
          ) : selection?.type === "conversation" && selectedConversation ? (
            <ChatConversationView
              selectedConversation={selectedConversation}
              conversationMessages={conversationMessages}
              attachmentUrls={attachmentUrls}
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
              onLoadMoreMessages={() => void loadMoreMessages()}
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

async function respondToRequestWithUi(input: {
  currentUserId: string;
  request: ChatRequestRecord;
  action: "accept" | "decline";
}) {
  return respondToChatRequest({
    currentUserId: input.currentUserId,
    requestId: input.request.id,
    action: input.action,
    introText: input.request.decrypted_intro_text,
    peer: input.request.sender_profile,
  });
}
