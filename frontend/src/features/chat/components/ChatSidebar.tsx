import { RefreshCw, ShieldCheck } from "lucide-react";
import { VerifiedBadge } from "../../../components/VerifiedBadge";
import type {
  ChatConversationDetails,
  ChatRequestRecord,
  LocalChatMessagePreview,
} from "../../../lib/chat/types";
import { formatRelativeTime } from "../../../lib/formatting";
import { ChatPeerAvatar } from "./ChatPeerAvatar";

function ConversationUnreadBadge({ unread }: { unread: number }) {
  if (unread <= 0) {
    return null;
  }

  return (
    <span className="inline-flex min-w-[1.5rem] items-center justify-center rounded-full bg-brand px-2 py-1 text-[10px] font-semibold text-white">
      {unread}
    </span>
  );
}

export function ChatSidebar({
  showMobileDetail,
  loading,
  unreadCount,
  pendingRequestCount,
  refreshing,
  pendingRequests,
  selectedRequestId,
  conversations,
  selectedConversationId,
  conversationPreviews,
  conversationUnreadCounts = {},
  onRefresh,
  onOpenRequest,
  onOpenConversation,
}: {
  showMobileDetail: boolean;
  loading: boolean;
  unreadCount: number;
  pendingRequestCount: number;
  refreshing: boolean;
  pendingRequests: ChatRequestRecord[];
  selectedRequestId: string | null;
  conversations: ChatConversationDetails[];
  selectedConversationId: string | null;
  conversationPreviews: Record<string, LocalChatMessagePreview>;
  conversationUnreadCounts?: Record<string, number>;
  onRefresh: () => void;
  onOpenRequest: (requestId: string) => void;
  onOpenConversation: (conversationId: string) => void;
}) {
  return (
    <aside
      className={`${showMobileDetail ? "hidden lg:flex" : "flex"} min-h-0 flex-col overflow-hidden border-r border-app-border/70 bg-[#f7f9fb] dark:bg-app-card`}
    >
      <div className="shrink-0 border-b border-app-border/70 bg-app-card/96 px-4 py-3 backdrop-blur-xl sm:px-5">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="font-display text-xl font-bold tracking-tight text-app-text sm:text-2xl">Chats</p>
            <p className="mt-0.5 text-[11px] font-medium text-app-muted">
              {unreadCount} unread · {pendingRequestCount} pending requests
            </p>
          </div>
          <button
            type="button"
            onClick={onRefresh}
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-app-border bg-app-card text-app-muted transition hover:border-brand/30 hover:text-brand"
            aria-label="Refresh chat list"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
          </button>
        </div>

        <div className="mt-3 flex w-full items-center gap-2 rounded-2xl bg-brand/10 px-3 py-2 text-[11px] font-medium text-brand">
          <ShieldCheck className="h-3.5 w-3.5 shrink-0" />
          <span>5 min relay queue • No permanent storage • Local-only history</span>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {loading ? (
          <div className="px-4 py-10 text-center text-sm text-app-muted sm:px-5">Loading chats...</div>
        ) : (
          <>
            {pendingRequests.length > 0 ? (
              <div className="border-b border-app-border/70 px-2 py-3 sm:px-3">
                <p className="px-2 pb-2 pt-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-brand">
                  Requests
                </p>

                {pendingRequests.map((request) => {
                  const peer =
                    request.direction === "incoming"
                      ? request.sender_profile
                      : request.recipient_profile;
                  const active = selectedRequestId === request.id;

                  return (
                    <button
                      key={request.id}
                      type="button"
                      onClick={() => onOpenRequest(request.id)}
                      className={`mb-1 flex w-full items-center gap-3 rounded-[20px] border px-3 py-3 text-left transition ${
                        active
                          ? "border-brand/20 bg-brand/10 text-app-text"
                          : "border-transparent bg-transparent hover:border-app-border hover:bg-app-card"
                      }`}
                    >
                      <ChatPeerAvatar peer={peer} />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-3">
                          <p className="flex min-w-0 items-center gap-1.5 font-semibold text-app-text">
                            <span className="truncate">{peer.full_name || peer.username}</span>
                            {peer.is_verified ? <VerifiedBadge className="h-4 w-4" /> : null}
                          </p>
                          <span className="rounded-full bg-brand/12 px-2 py-1 text-[10px] font-semibold text-brand">
                            Request
                          </span>
                        </div>
                        <p className="mt-1 line-clamp-2 text-sm text-app-muted">
                          {request.direction === "incoming"
                            ? request.decrypted_intro_text || request.decrypted_intro_error || "Encrypted intro"
                            : "Waiting for a reply to your first message request."}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : null}

            <div className="px-2 py-3 sm:px-3">
              <p className="px-2 pb-2 pt-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-app-muted">
                Conversations
              </p>

              {conversations.length === 0 ? (
                <div className="px-4 py-10 text-center text-sm text-app-muted">
                  Accepted conversations will appear here after the first request is approved.
                </div>
              ) : (
                conversations.map((entry) => {
                  const active = selectedConversationId === entry.conversation.id;
                  const summaryPreview =
                    conversationPreviews[entry.conversation.id] ||
                    ({
                      text: "No local messages yet",
                      createdAt: null,
                      kind: null,
                    } satisfies LocalChatMessagePreview);

                  return (
                    <button
                      key={entry.conversation.id}
                      type="button"
                      onClick={() => onOpenConversation(entry.conversation.id)}
                      className={`mb-1 flex w-full items-center gap-3 rounded-[20px] border px-3 py-3 text-left transition ${
                        active
                          ? "border-brand/20 bg-app-card text-app-text shadow-[0_18px_36px_-30px_rgba(15,23,42,0.25)]"
                          : "border-transparent hover:border-app-border hover:bg-app-card"
                      }`}
                    >
                      <ChatPeerAvatar peer={entry.peer} />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-3">
                          <p className="flex min-w-0 items-center gap-1.5 font-semibold text-app-text">
                            <span className="truncate">{entry.peer.full_name || entry.peer.username}</span>
                            {entry.peer.is_verified ? <VerifiedBadge className="h-4 w-4" /> : null}
                          </p>
                          <div className="flex shrink-0 items-center gap-2">
                            {summaryPreview.createdAt ? (
                              <span className="text-[11px] text-app-muted">
                                {formatRelativeTime(summaryPreview.createdAt)}
                              </span>
                            ) : null}
                            <ConversationUnreadBadge
                              unread={conversationUnreadCounts[entry.conversation.id] || 0}
                            />
                          </div>
                        </div>
                        <p className="mt-1 text-[11px] font-medium text-app-muted">
                          {entry.peer.online ? "Online" : "Offline"}
                        </p>
                        <p className="mt-1 line-clamp-2 text-sm text-app-muted">
                          {summaryPreview.text}
                        </p>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </>
        )}
      </div>
    </aside>
  );
}
