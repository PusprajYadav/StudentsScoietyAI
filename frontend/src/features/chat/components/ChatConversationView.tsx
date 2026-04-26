import {
  ArrowLeft,
  CheckSquare,
  Download,
  ImagePlus,
  Mic,
  MicOff,
  MoreVertical,
  RefreshCw,
  Reply,
  Send,
  SmilePlus,
  Square,
  Trash2,
  UserCheck,
  UserX,
  X,
} from "lucide-react";
import { useMemo, useRef, type KeyboardEvent as ReactKeyboardEvent, type MutableRefObject } from "react";
import toast from "react-hot-toast";
import { VerifiedBadge } from "../../../components/VerifiedBadge";
import { downloadBlobNatively } from "../../../lib/nativeDownload";
import { formatFileSize, formatRelativeTime } from "../../../lib/formatting";
import type { ChatConversationDetails, LocalChatMessage } from "../../../lib/chat/types";
import { ChatPeerAvatar } from "./ChatPeerAvatar";
import { MessageStatusIcon } from "./MessageStatusIcon";

const REACTION_EMOJIS = ["❤️", "😂", "😮", "😢", "😡", "👍"];
const DOUBLE_TAP_DELAY = 300;

type ReactionTarget = {
  messageId: string;
  x: number;
  y: number;
  timestamp: number;
};

type DayGroup = {
  label: string;
  items: LocalChatMessage[];
};

function formatMessageDayLabel(value: string) {
  const date = new Date(value);
  const target = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  const todayDate = new Date();
  const today = new Date(
    todayDate.getFullYear(),
    todayDate.getMonth(),
    todayDate.getDate()
  ).getTime();
  const diffDays = Math.round((today - target) / 86_400_000);

  if (diffDays === 0) {
    return "Today";
  }

  if (diffDays === 1) {
    return "Yesterday";
  }

  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: todayDate.getFullYear() === date.getFullYear() ? undefined : "numeric",
  }).format(date);
}

function groupMessagesByDay(messages: LocalChatMessage[]) {
  const groups = new Map<string, DayGroup>();

  for (const message of messages) {
    const date = new Date(message.createdAt);
    const key = new Date(date.getFullYear(), date.getMonth(), date.getDate()).toISOString();
    const existing = groups.get(key);

    if (existing) {
      existing.items.push(message);
      continue;
    }

    groups.set(key, {
      label: formatMessageDayLabel(message.createdAt),
      items: [message],
    });
  }

  return Array.from(groups.values());
}

export function ChatConversationView({
  selectedConversation,
  conversationMessages,
  attachmentUrls,
  draftText,
  selectedImage,
  recordedVoice,
  isRecording,
  replyToMessage,
  selectMode,
  selectedMessageIds,
  reactionTarget,
  messageReactions,
  hasMoreMessages,
  isLoadingMore,
  isConversationScreen,
  isMobileViewport,
  keyboardInset,
  mobileHeaderHeight,
  mobileComposerHeight,
  blockBannerText,
  conversationMenuOpen,
  messageListRef,
  conversationHeaderRef,
  composerRef,
  draftTextareaRef,
  onBack,
  onOpenProfile,
  onToggleMenu,
  onCloseMenu,
  onRefreshConversation,
  onEnterSelectMode,
  onDeleteConversation,
  onDeleteAllMessages,
  onToggleBlockUser,
  onLoadMoreMessages,
  onToggleMessageSelection,
  onDeleteSelectedMessages,
  onDeleteSingleMessage,
  onExitSelectMode,
  onSetReplyToMessage,
  onSetReactionTarget,
  onReactToMessage,
  onDraftChange,
  onDraftKeyDown,
  onImageChange,
  onToggleVoiceRecording,
  onSendMessage,
}: {
  selectedConversation: ChatConversationDetails;
  conversationMessages: LocalChatMessage[];
  attachmentUrls: Record<string, string>;
  draftText: string;
  selectedImage: File | null;
  recordedVoice: File | null;
  isRecording: boolean;
  replyToMessage: LocalChatMessage | null;
  selectMode: boolean;
  selectedMessageIds: Set<string>;
  reactionTarget: ReactionTarget | null;
  messageReactions: Record<string, string>;
  hasMoreMessages: boolean;
  isLoadingMore: boolean;
  isConversationScreen: boolean;
  isMobileViewport: boolean;
  keyboardInset: number;
  mobileHeaderHeight: number;
  mobileComposerHeight: number;
  blockBannerText: string | null;
  conversationMenuOpen: boolean;
  messageListRef: MutableRefObject<HTMLDivElement | null>;
  conversationHeaderRef: MutableRefObject<HTMLDivElement | null>;
  composerRef: MutableRefObject<HTMLDivElement | null>;
  draftTextareaRef: MutableRefObject<HTMLTextAreaElement | null>;
  onBack: () => void;
  onOpenProfile: () => void;
  onToggleMenu: () => void;
  onCloseMenu: () => void;
  onRefreshConversation: () => void;
  onEnterSelectMode: () => void;
  onDeleteConversation: () => void;
  onDeleteAllMessages: () => void;
  onToggleBlockUser: () => void;
  onLoadMoreMessages: () => void;
  onToggleMessageSelection: (messageId: string) => void;
  onDeleteSelectedMessages: () => void;
  onDeleteSingleMessage: (messageId: string) => void;
  onExitSelectMode: () => void;
  onSetReplyToMessage: (message: LocalChatMessage | null) => void;
  onSetReactionTarget: (target: ReactionTarget | null) => void;
  onReactToMessage: (messageId: string, emoji: string) => void;
  onDraftChange: (value: string) => void;
  onDraftKeyDown: (event: ReactKeyboardEvent<HTMLTextAreaElement>) => void;
  onImageChange: (file: File | null) => void;
  onToggleVoiceRecording: () => void;
  onSendMessage: () => void;
}) {
  const lastTapRef = useRef<{ messageId: string; time: number } | null>(null);
  const dayGroups = useMemo(() => groupMessagesByDay(conversationMessages), [conversationMessages]);
  const isMobileConversationLayout = isConversationScreen && isMobileViewport;
  const conversationSurfaceStyle = {
    backgroundColor: "#efeae2",
    backgroundImage:
      "linear-gradient(180deg, rgba(255,255,255,0.3), rgba(255,255,255,0.12)), radial-gradient(rgba(15,23,42,0.045) 1px, transparent 1px), radial-gradient(circle at top left, rgba(37,99,235,0.09), transparent 24%), radial-gradient(circle at bottom right, rgba(56,189,248,0.08), transparent 28%)",
    backgroundSize: "auto, 24px 24px, auto, auto",
    backgroundPosition: "0 0, 0 0, 0 0, 100% 100%",
  } as const;

  const handleDoubleTap = (messageId: string, event: React.TouchEvent | React.MouseEvent) => {
    if (selectMode) {
      return;
    }

    const now = Date.now();
    const lastTap = lastTapRef.current;

    if (lastTap && lastTap.messageId === messageId && now - lastTap.time < DOUBLE_TAP_DELAY) {
      const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
      onSetReactionTarget({
        messageId,
        x: rect.left + rect.width / 2,
        y: rect.top,
        timestamp: Date.now(),
      });
      lastTapRef.current = null;
    } else {
      lastTapRef.current = { messageId, time: now };
    }
  };

  const isConversationBlocked = !selectedConversation.peer.canChat;

  return (
    <>
      <div
        className={
          isMobileConversationLayout
            ? "fixed inset-0 z-10 min-h-[100dvh] w-screen overflow-hidden"
            : "relative grid h-full w-full min-h-0 flex-1 grid-rows-[auto_minmax(0,1fr)_auto] overflow-hidden"
        }
        style={conversationSurfaceStyle}
      >
        <div
          ref={conversationHeaderRef}
          className={`shrink-0 border-b border-white/10 bg-[linear-gradient(135deg,#1d4ed8,#1e3a8a)] px-4 py-2.5 text-white backdrop-blur-xl sm:px-5 sm:py-3 ${
            isMobileConversationLayout ? "fixed inset-x-0 top-0 z-20" : ""
          }`}
          style={
            isMobileConversationLayout
              ? {
                  paddingTop: "calc(var(--safe-area-top, 0px) + 0.6rem)",
                }
              : undefined
          }
        >
          <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <button
                type="button"
                onClick={onBack}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/10 text-white lg:hidden"
                aria-label="Back to chats"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>

              <button type="button" onClick={onOpenProfile} className="flex min-w-0 items-center gap-3 text-left">
                <ChatPeerAvatar peer={selectedConversation.peer} />
                <div className="min-w-0">
                  <p className="flex min-w-0 items-center gap-1.5 font-semibold text-white">
                    <span className="truncate">
                      {selectedConversation.peer.full_name || selectedConversation.peer.username}
                    </span>
                    {selectedConversation.peer.is_verified ? <VerifiedBadge className="h-4 w-4" /> : null}
                  </p>
                  <p className="text-sm text-slate-300">
                    {selectedConversation.peer.online ? "Online" : "Offline"} • View profile
                  </p>
                </div>
              </button>
            </div>

            <button
              type="button"
              onClick={onToggleMenu}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/10 text-white transition hover:bg-white/15"
              aria-label="Open chat options"
            >
              <MoreVertical className="h-4 w-4" />
            </button>
          </div>
        </div>

        {conversationMenuOpen ? (
          <div className="fixed inset-0 z-[9999]" onClick={onCloseMenu} onTouchEnd={onCloseMenu}>
            <div
              className="absolute right-3 w-64 rounded-[22px] border border-app-border bg-app-card p-2 shadow-[0_24px_60px_rgba(15,23,42,0.25)]"
              style={{ top: "calc(var(--safe-area-top, 0px) + 3.5rem)" }}
              onClick={(event) => event.stopPropagation()}
              onTouchEnd={(event) => event.stopPropagation()}
            >
              <button
                type="button"
                onClick={() => {
                  onCloseMenu();
                  onOpenProfile();
                }}
                className="flex w-full items-center justify-between rounded-2xl px-3 py-3 text-left text-sm text-app-text transition hover:bg-app-secondary"
              >
                <span>View profile</span>
                <span className="text-xs text-app-muted">Open</span>
              </button>
              <button
                type="button"
                onClick={onRefreshConversation}
                className="flex w-full items-center justify-between rounded-2xl px-3 py-3 text-left text-sm text-app-text transition hover:bg-app-secondary"
              >
                <span>Refresh chat</span>
                <RefreshCw className="h-4 w-4 text-app-muted" />
              </button>
              <button
                type="button"
                onClick={() => {
                  onCloseMenu();
                  onEnterSelectMode();
                }}
                className="flex w-full items-center justify-between rounded-2xl px-3 py-3 text-left text-sm text-app-text transition hover:bg-app-secondary"
              >
                <span>Select messages</span>
                <CheckSquare className="h-4 w-4 text-app-muted" />
              </button>
              <button
                type="button"
                onClick={onDeleteConversation}
                className="flex w-full items-center justify-between rounded-2xl px-3 py-3 text-left text-sm text-rose-600 transition hover:bg-rose-500/10 dark:text-rose-300"
              >
                <span>Delete conversation</span>
                <Trash2 className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={onDeleteAllMessages}
                className="flex w-full items-center justify-between rounded-2xl px-3 py-3 text-left text-sm text-rose-600 transition hover:bg-rose-500/10 dark:text-rose-300"
              >
                <span>Delete local messages</span>
                <Trash2 className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={onToggleBlockUser}
                className={`flex w-full items-center justify-between rounded-2xl px-3 py-3 text-left text-sm transition ${
                  selectedConversation.peer.blockedByCurrentUser
                    ? "text-brand hover:bg-brand/10"
                    : "text-amber-700 hover:bg-amber-500/10 dark:text-amber-200"
                }`}
              >
                <span>{selectedConversation.peer.blockedByCurrentUser ? "Unblock user" : "Block user"}</span>
                {selectedConversation.peer.blockedByCurrentUser ? (
                  <UserCheck className="h-4 w-4" />
                ) : (
                  <UserX className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>
        ) : null}

        <div
          ref={messageListRef}
          className={`bg-transparent px-4 py-4 sm:px-5 ${
            isMobileConversationLayout
              ? "absolute inset-0 overflow-y-auto"
              : "min-h-0 overflow-y-auto overscroll-contain"
          }`}
          style={
            isMobileConversationLayout
              ? {
                  paddingTop: `${mobileHeaderHeight + 12}px`,
                  paddingBottom: `${mobileComposerHeight + keyboardInset + 12}px`,
                }
              : undefined
          }
          onScroll={(event) => {
            const element = event.currentTarget;
            if (element.scrollTop < 100 && hasMoreMessages && !isLoadingMore) {
              onLoadMoreMessages();
            }
          }}
        >
          <div
            className={`mx-auto flex w-full max-w-5xl flex-col ${
              conversationMessages.length > 0 || hasMoreMessages || isLoadingMore
                ? "min-h-full justify-end gap-4"
                : "min-h-full justify-center"
            }`}
          >
            {isLoadingMore ? (
              <div className="flex justify-center py-2">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-brand border-t-transparent" />
              </div>
            ) : null}

            {hasMoreMessages && !isLoadingMore ? (
              <div className="flex justify-center">
                <button
                  type="button"
                  onClick={onLoadMoreMessages}
                  className="rounded-full bg-app-card/90 px-4 py-1.5 text-xs text-app-muted shadow-sm transition hover:bg-app-card"
                >
                  Load older messages
                </button>
              </div>
            ) : null}

            {conversationMessages.length === 0 ? (
              <div className="mx-auto max-w-xl rounded-[24px] border border-dashed border-app-border bg-app-card/80 px-4 py-8 text-center text-sm text-app-muted">
                No local messages are stored for this conversation on this device yet.
              </div>
            ) : (
              dayGroups.map((group) => (
                <section key={group.label} className="space-y-3">
                  <div className="flex justify-center">
                    <span className="rounded-full bg-app-card/90 px-4 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-app-muted shadow-sm">
                      {group.label}
                    </span>
                  </div>

                  {group.items.map((message) => {
                    const repliedMessage = message.text?.startsWith("[reply:")
                      ? (() => {
                          const match = message.text?.match(/^\[reply:([^\]]+)\]/);
                          if (!match) {
                            return null;
                          }

                          return (
                            conversationMessages.find((entry) => entry.clientMessageId === match[1]) || null
                          );
                        })()
                      : null;
                    const displayText =
                      message.text?.replace(/^\[reply:[^\]]+\]\s*/, "") || message.text;
                    const reaction = messageReactions[message.clientMessageId];

                    return (
                      <div
                        key={message.id}
                        className={`group relative flex ${
                          message.fromCurrentUser ? "justify-end" : "justify-start"
                        } ${selectMode ? "cursor-pointer" : ""}`}
                        onClick={() => {
                          if (selectMode) {
                            onToggleMessageSelection(message.id);
                          }
                        }}
                      >
                        {selectMode ? (
                          <div className="flex shrink-0 items-center pr-2">
                            {selectedMessageIds.has(message.id) ? (
                              <CheckSquare className="h-5 w-5 text-brand" />
                            ) : (
                              <Square className="h-5 w-5 text-app-muted" />
                            )}
                          </div>
                        ) : null}

                        <div className="relative min-w-0 max-w-[min(84%,38rem)]">
                          {!selectMode ? (
                            <div
                              className={`absolute top-1/2 flex -translate-y-1/2 items-center gap-0.5 rounded-full border border-app-border/40 bg-app-card/70 p-0.5 shadow-sm backdrop-blur-md opacity-0 transition-all group-hover:opacity-100 ${
                                message.fromCurrentUser
                                  ? "right-[calc(100%+0.5rem)] flex-row-reverse"
                                  : "left-[calc(100%+0.5rem)]"
                              }`}
                            >
                              <button
                                type="button"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  onSetReplyToMessage(message);
                                  draftTextareaRef.current?.focus();
                                }}
                                className="flex h-7 w-7 items-center justify-center rounded-full text-app-muted transition hover:bg-app-secondary hover:text-brand"
                                aria-label="Reply to message"
                              >
                                <Reply className="h-3.5 w-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
                                  onSetReactionTarget({
                                    messageId: message.id,
                                    x: rect.left + rect.width / 2,
                                    y: rect.top,
                                    timestamp: Date.now(),
                                  });
                                }}
                                className="flex h-7 w-7 items-center justify-center rounded-full text-app-muted transition hover:bg-app-secondary hover:text-brand"
                                aria-label="React to message"
                              >
                                <SmilePlus className="h-3.5 w-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  onDeleteSingleMessage(message.id);
                                }}
                                className="flex h-7 w-7 items-center justify-center rounded-full text-app-muted transition hover:bg-rose-500/10 hover:text-rose-600"
                                aria-label="Delete message"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          ) : null}

                          <div
                            className={`rounded-[22px] px-4 py-3 shadow-sm transition-all ${
                              message.fromCurrentUser
                                ? "bg-[linear-gradient(145deg,#dbeafe,#bfdbfe)] text-slate-900"
                                : "border border-app-border bg-app-card text-app-text"
                            } ${
                              selectMode && selectedMessageIds.has(message.id)
                                ? "ring-2 ring-brand ring-offset-2 ring-offset-[#efeae2]"
                                : ""
                            } min-w-0 overflow-hidden`}
                            onClick={(event) => {
                              event.stopPropagation();
                              handleDoubleTap(message.id, event);
                            }}
                            onDoubleClick={(event) => {
                              if (selectMode) {
                                return;
                              }

                              event.preventDefault();
                              const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
                              onSetReactionTarget({
                                messageId: message.id,
                                x: rect.left + rect.width / 2,
                                y: rect.top,
                                timestamp: Date.now(),
                              });
                            }}
                          >
                            {repliedMessage ? (
                              <div
                                className={`mb-2 rounded-[14px] px-3 py-2 text-[12px] leading-[1.35] ${
                                  message.fromCurrentUser
                                    ? "border-l-2 border-blue-700/25 bg-blue-700/8 text-slate-700"
                                    : "border-l-2 border-brand/40 bg-brand/10 text-app-muted"
                                }`}
                              >
                                <p className="mb-0.5 text-[11px] font-semibold">
                                  {repliedMessage.fromCurrentUser
                                    ? "You"
                                    : selectedConversation.peer.full_name ||
                                      selectedConversation.peer.username ||
                                      "Them"}
                                </p>
                                <p className="line-clamp-2">
                                  {repliedMessage.text ||
                                    (repliedMessage.attachment
                                      ? `Attachment: ${repliedMessage.attachment.kind}`
                                      : "Message")}
                                </p>
                              </div>
                            ) : null}

                            {displayText ? (
                              <p className="whitespace-pre-wrap break-words [overflow-wrap:anywhere] text-sm leading-6">
                                {displayText}
                              </p>
                            ) : null}

                            {message.attachment ? (
                              <div className={`${displayText ? "mt-3" : ""}`}>
                                {message.attachment.kind === "image" ? (
                                  attachmentUrls[message.attachment.id] ? (
                                    <img
                                      src={attachmentUrls[message.attachment.id]}
                                      alt={message.attachment.fileName || "Shared image"}
                                      className="max-h-[24rem] w-full rounded-[18px] object-cover"
                                    />
                                  ) : (
                                    <div className="rounded-[18px] bg-app-secondary/70 px-4 py-6 text-xs">
                                      Decrypting image...
                                    </div>
                                  )
                                ) : attachmentUrls[message.attachment.id] ? (
                                  <audio controls src={attachmentUrls[message.attachment.id]} className="w-full" />
                                ) : (
                                  <div className="rounded-[18px] bg-app-secondary/70 px-4 py-6 text-xs">
                                    Decrypting voice note...
                                  </div>
                                )}

                                <div className="mt-2 flex items-center justify-between gap-3">
                                  <p className="text-[11px] text-app-muted">
                                    {formatFileSize(message.attachment.byteSize)}
                                  </p>

                                  {attachmentUrls[message.attachment.id] ? (
                                    <button
                                      type="button"
                                      onClick={async (event) => {
                                        event.stopPropagation();

                                        try {
                                          const response = await fetch(attachmentUrls[message.attachment.id]);
                                          const blob = await response.blob();
                                          const fileName =
                                            message.attachment?.fileName ||
                                            (message.attachment?.kind === "image"
                                              ? `image-${message.id}.jpg`
                                              : `voice-${message.id}.webm`);

                                          downloadBlobNatively(
                                            blob,
                                            fileName,
                                            () => {
                                              toast.success("File saved to downloads.");
                                            },
                                            (error: Error) => {
                                              toast.error(`Download failed: ${error.message}`);
                                            }
                                          );
                                        } catch {
                                          toast.error("Could not prepare download.");
                                        }
                                      }}
                                      className="inline-flex items-center gap-1.5 rounded-full bg-app-secondary px-2 py-1 text-[10px] font-medium text-app-text transition hover:bg-app-border"
                                    >
                                      <Download className="h-3 w-3" />
                                      <span>Download</span>
                                    </button>
                                  ) : null}
                                </div>
                              </div>
                            ) : null}

                            <div className="mt-2 flex items-center justify-end gap-1.5 text-[11px] text-app-muted">
                              {!selectMode ? (
                                <button
                                  type="button"
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    onSetReplyToMessage(message);
                                    draftTextareaRef.current?.focus();
                                  }}
                                  className="mr-auto inline-flex items-center gap-1 rounded-full bg-app-secondary px-2 py-1 transition md:hidden"
                                  aria-label="Reply"
                                >
                                  <Reply className="h-3 w-3" />
                                </button>
                              ) : null}
                              <span>{formatRelativeTime(message.createdAt)}</span>
                              {message.fromCurrentUser ? <MessageStatusIcon status={message.status} /> : null}
                            </div>
                          </div>

                          {reaction ? (
                            <div className={`absolute -bottom-2 ${message.fromCurrentUser ? "left-3" : "right-3"} z-10`}>
                              <button
                                type="button"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  onReactToMessage(message.id, reaction);
                                }}
                                className="flex h-7 w-7 items-center justify-center rounded-full border border-app-border bg-app-card text-sm shadow-sm transition hover:scale-110"
                                aria-label="Remove reaction"
                              >
                                {reaction}
                              </button>
                            </div>
                          ) : null}
                        </div>
                      </div>
                    );
                  })}
                </section>
              ))
            )}
          </div>
        </div>

        <div
          ref={composerRef}
          className={`shrink-0 border-t border-app-border/70 bg-[#f0f2f5] px-4 py-2.5 pb-[calc(env(safe-area-inset-bottom,0px)+0.5rem)] backdrop-blur-xl sm:px-5 sm:py-3 sm:pb-3 ${
            isMobileConversationLayout ? "fixed inset-x-0 bottom-0 z-20" : ""
          }`}
          style={
            isMobileConversationLayout && keyboardInset > 0
              ? { bottom: `${keyboardInset}px` }
              : undefined
          }
        >
          <div className="mx-auto w-full max-w-5xl">
            {selectMode ? (
              <div className="mb-2 flex items-center justify-between rounded-[18px] border border-brand/20 bg-brand/10 px-4 py-2.5">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={onExitSelectMode}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-app-border bg-app-card text-app-muted transition hover:text-app-text"
                    aria-label="Cancel selection"
                  >
                    <X className="h-4 w-4" />
                  </button>
                  <span className="text-sm font-medium text-app-text">
                    {selectedMessageIds.size} selected
                  </span>
                </div>
                <button
                  type="button"
                  onClick={onDeleteSelectedMessages}
                  disabled={selectedMessageIds.size === 0}
                  className="inline-flex items-center gap-2 rounded-full bg-rose-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete
                </button>
              </div>
            ) : null}

            {blockBannerText ? (
              <div className="mb-3 rounded-[18px] border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-700 dark:text-amber-200">
                {blockBannerText}
              </div>
            ) : null}

            {replyToMessage && !selectMode ? (
              <div className="mb-2 flex items-center gap-3 rounded-[18px] border border-brand/20 bg-brand/10 px-4 py-2.5">
                <Reply className="h-4 w-4 shrink-0 text-brand" />
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-semibold text-brand">
                    Replying to{" "}
                    {replyToMessage.fromCurrentUser
                      ? "yourself"
                      : selectedConversation.peer.full_name || selectedConversation.peer.username}
                  </p>
                  <p className="mt-0.5 truncate text-sm text-app-muted">
                    {replyToMessage.text ||
                      (replyToMessage.attachment
                        ? `Attachment: ${replyToMessage.attachment.kind}`
                        : "Message")}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onSetReplyToMessage(null)}
                  className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-app-border bg-app-card text-app-muted transition hover:text-app-text"
                  aria-label="Cancel reply"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : null}

            {selectedImage || recordedVoice ? (
              <div className="mb-3 rounded-[18px] border border-app-border bg-app-card px-4 py-3 text-sm text-app-text">
                {selectedImage ? (
                  <span>Ready to send image: {selectedImage.name}</span>
                ) : recordedVoice ? (
                  <span>Ready to send voice note: {recordedVoice.name}</span>
                ) : null}
              </div>
            ) : null}

            <div className="flex items-end gap-2">
              <div className="flex flex-1 items-end gap-1 rounded-[22px] border border-app-border/80 bg-app-card px-2 py-1.5 shadow-sm transition-colors focus-within:border-brand/30 sm:gap-1.5 sm:rounded-[26px] sm:px-2.5 sm:py-2">
                <label className="inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-full text-app-muted transition hover:bg-app-secondary hover:text-app-text">
                  <ImagePlus className="h-[18px] w-[18px]" />
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    disabled={isConversationBlocked}
                    onChange={(event) => {
                      onImageChange(event.target.files?.[0] || null);
                    }}
                  />
                </label>

                <textarea
                  ref={draftTextareaRef}
                  value={draftText}
                  onChange={(event) => onDraftChange(event.target.value)}
                  onKeyDown={onDraftKeyDown}
                  rows={1}
                  enterKeyHint="send"
                  className="max-h-28 min-h-[36px] flex-1 resize-none overflow-y-auto bg-transparent px-1 py-1.5 text-[14px] text-app-text outline-none placeholder:text-app-muted sm:max-h-32 sm:min-h-[40px] sm:py-2"
                  placeholder={isConversationBlocked ? "Messaging unavailable" : "Message"}
                  disabled={isConversationBlocked}
                />

                <button
                  type="button"
                  onClick={onToggleVoiceRecording}
                  disabled={isConversationBlocked}
                  className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition ${
                    isRecording
                      ? "bg-rose-500/10 text-rose-600 dark:text-rose-300"
                      : "text-app-muted hover:bg-app-secondary hover:text-app-text"
                  }`}
                  aria-label={isRecording ? "Stop recording" : "Record voice"}
                >
                  {isRecording ? (
                    <MicOff className="h-[18px] w-[18px]" />
                  ) : (
                    <Mic className="h-[18px] w-[18px]" />
                  )}
                </button>
              </div>

              <button
                type="button"
                onClick={onSendMessage}
                disabled={isConversationBlocked || (!draftText.trim() && !selectedImage && !recordedVoice)}
                className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-brand text-white shadow-[0_18px_40px_-22px_rgba(37,99,235,0.58)] transition-all active:scale-90 hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none sm:h-[52px] sm:w-[52px]"
                aria-label="Send message"
              >
                <Send className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {reactionTarget ? (
        <div
          className="fixed inset-0 z-[99999] bg-black/5 backdrop-blur-[1px]"
          onClick={() => {
            if (Date.now() - reactionTarget.timestamp > 300) {
              onSetReactionTarget(null);
            }
          }}
        >
          <div
            className="absolute z-50 flex gap-1.5 rounded-full border border-app-border/80 bg-app-card/95 px-3 py-2 shadow-[0_16px_48px_rgba(0,0,0,0.2)] backdrop-blur-xl"
            style={{
              left: `${Math.min(
                Math.max(reactionTarget.x - 120, 12),
                (typeof window === "undefined" ? 360 : window.innerWidth) - 260
              )}px`,
              top: `${Math.max(reactionTarget.y - 56, 12)}px`,
            }}
            onClick={(event) => event.stopPropagation()}
          >
            {REACTION_EMOJIS.map((emoji) => {
              const targetMessage = conversationMessages.find((entry) => entry.id === reactionTarget.messageId);
              const targetClientId = targetMessage?.clientMessageId || reactionTarget.messageId;

              return (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => onReactToMessage(reactionTarget.messageId, emoji)}
                  className={`flex h-10 w-10 items-center justify-center rounded-full text-xl transition-transform active:scale-95 ${
                    messageReactions[targetClientId] === emoji
                      ? "scale-125 bg-brand/10 shadow-inner"
                      : "hover:scale-125 hover:bg-app-secondary"
                  }`}
                >
                  {emoji}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
    </>
  );
}
