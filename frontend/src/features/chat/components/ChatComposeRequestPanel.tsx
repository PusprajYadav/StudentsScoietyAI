import { ArrowLeft, Coins, Send, ShieldCheck } from "lucide-react";
import { VerifiedBadge } from "../../../components/VerifiedBadge";
import type { ChatPeerProfile, ChatTargetDetails } from "../../../lib/chat/types";
import { ChatPeerAvatar } from "./ChatPeerAvatar";

const QUICK_EMOJIS = ["😀", "😂", "😍", "🔥", "🙏", "👍", "❤️", "🎉"];

function describeChatPolicy(policy: string) {
  if (policy === "followers") return "followers only";
  if (policy === "following") return "people this user follows";
  if (policy === "followers_and_following") return "followers and following";
  if (policy === "no_one") return "no one";
  return "everyone";
}

function composePeer(target: ChatTargetDetails): ChatPeerProfile {
  return {
    id: target.profile.id,
    username: target.profile.username,
    full_name: target.profile.full_name,
    avatar_url: target.profile.avatar_url,
    is_verified: target.profile.is_verified,
    updated_at: target.profile.updated_at,
    online: target.online,
    blockedByCurrentUser: target.blockState.blockedByCurrentUser,
    blockedCurrentUser: target.blockState.blockedCurrentUser,
    canChat: target.blockState.canChat,
  };
}

export function ChatComposeRequestPanel({
  composeTarget,
  requestText,
  sending,
  chatRequestCostLabel,
  onBack,
  onOpenProfile,
  onRequestTextChange,
  onAppendEmoji,
  onSend,
}: {
  composeTarget: ChatTargetDetails;
  requestText: string;
  sending: boolean;
  chatRequestCostLabel: string;
  onBack: () => void;
  onOpenProfile: () => void;
  onRequestTextChange: (value: string) => void;
  onAppendEmoji: (emoji: string) => void;
  onSend: () => void;
}) {
  const peer = composePeer(composeTarget);

  return (
    <>
      <div className="shrink-0 border-b border-app-border/70 bg-app-card/95 px-4 py-3 backdrop-blur-xl sm:px-5">
        <div className="mx-auto flex w-full max-w-5xl items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-app-border bg-app-secondary text-app-text lg:hidden"
            aria-label="Back to chats"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>

          <button type="button" onClick={onOpenProfile} className="flex min-w-0 items-center gap-3 text-left">
            <ChatPeerAvatar peer={peer} />
            <div className="min-w-0">
              <p className="flex min-w-0 items-center gap-1.5 font-semibold text-app-text">
                <span className="truncate">{composeTarget.profile.full_name || composeTarget.profile.username}</span>
                {composeTarget.profile.is_verified ? <VerifiedBadge className="h-4 w-4" /> : null}
              </p>
              <p className="text-sm text-app-muted">
                {composeTarget.online ? "Online" : "Offline"} • View profile
              </p>
            </div>
          </button>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 items-start justify-center overflow-y-auto px-4 py-6 sm:items-center sm:px-5">
        <div className="w-full max-w-xl">
          <div className="overflow-hidden rounded-[30px] border border-app-border bg-app-card shadow-[0_30px_70px_-42px_rgba(15,23,42,0.34)]">
            <div className="h-1.5 bg-[linear-gradient(90deg,#25D366,#16a34a,#0ea5e9)]" />

            <div className="px-5 pb-5 pt-5 sm:px-6">
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-300">
                  <ShieldCheck className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-[15px] font-bold text-app-text">Send first message request</p>
                  <p className="text-[11px] text-app-muted">
                    The other student must accept before the chat becomes active
                  </p>
                </div>
              </div>

              {!composeTarget.canSendRequest ? (
                <div className="mt-4 rounded-2xl border border-amber-500/20 bg-amber-500/8 px-3.5 py-2.5 text-[13px] text-amber-700 dark:text-amber-200">
                  Accepting requests from{" "}
                  <span className="font-semibold">
                    {describeChatPolicy(composeTarget.profile.chat_request_policy)}
                  </span>
                  .
                </div>
              ) : null}

              {!composeTarget.blockState.canChat ? (
                <div className="mt-4 rounded-2xl border border-rose-500/20 bg-rose-500/8 px-3.5 py-2.5 text-[13px] text-rose-600 dark:text-rose-300">
                  {composeTarget.blockState.blockedByCurrentUser
                    ? "You blocked this user. Unblock them before sending a request."
                    : "This chat is currently blocked."}
                </div>
              ) : null}

              {composeTarget.devices.length === 0 ? (
                <div className="mt-4 rounded-2xl border border-app-border bg-app-secondary/50 px-3.5 py-2.5 text-[13px] text-app-muted">
                  This user has not enabled secure chat yet on any device.
                </div>
              ) : null}

              <div className="mt-4 flex items-start gap-3 rounded-2xl border border-emerald-500/20 bg-emerald-500/8 px-3.5 py-3 text-[13px] text-app-text">
                <Coins className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-300" />
                <p>
                  New chat requests cost <span className="font-semibold">{chatRequestCostLabel}</span>.
                  After the request is accepted, regular messages in the conversation stay free.
                </p>
              </div>

              <textarea
                value={requestText}
                onChange={(event) => onRequestTextChange(event.target.value)}
                disabled={!composeTarget.blockState.canChat}
                className="mt-4 w-full resize-none rounded-[24px] border border-app-border bg-[#f0f2f5] px-4 py-3 text-sm text-app-text outline-none transition placeholder:text-app-muted focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/10 dark:bg-app-secondary/40"
                rows={5}
                placeholder="Write your first message..."
              />

              <div className="mt-3 flex flex-wrap items-center gap-1.5">
                {QUICK_EMOJIS.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => onAppendEmoji(emoji)}
                    disabled={!composeTarget.blockState.canChat}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-full text-sm transition hover:scale-110 hover:bg-app-secondary active:scale-95"
                  >
                    {emoji}
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={onSend}
                disabled={
                  sending ||
                  !requestText.trim() ||
                  !composeTarget.canSendRequest ||
                  composeTarget.devices.length === 0 ||
                  !composeTarget.blockState.canChat
                }
                className="mt-5 flex w-full items-center justify-center gap-2 rounded-full bg-[#25D366] py-3.5 text-sm font-bold text-white shadow-[0_18px_40px_-22px_rgba(37,211,102,0.72)] transition-all hover:bg-[#1fa855] active:scale-[0.985] disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none"
              >
                <Send className="h-4 w-4" />
                {sending ? "Sending Request..." : "Send Request"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
