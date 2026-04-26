import { ArrowLeft, ShieldCheck, UserCheck, UserX } from "lucide-react";
import { VerifiedBadge } from "../../../components/VerifiedBadge";
import type { ChatPeerProfile, ChatRequestRecord } from "../../../lib/chat/types";
import { ChatPeerAvatar } from "./ChatPeerAvatar";

function getRequestPeer(request: ChatRequestRecord): ChatPeerProfile {
  return request.direction === "incoming" ? request.sender_profile : request.recipient_profile;
}

export function ChatRequestDetailPanel({
  request,
  sending,
  onBack,
  onOpenProfile,
  onRespond,
}: {
  request: ChatRequestRecord;
  sending: boolean;
  onBack: () => void;
  onOpenProfile: () => void;
  onRespond: (action: "accept" | "decline") => void;
}) {
  const peer = getRequestPeer(request);
  const introText =
    request.direction === "incoming"
      ? request.decrypted_intro_text || request.decrypted_intro_error || "Encrypted intro"
      : "Your intro message is stored locally and will move into the full conversation after acceptance.";

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
                <span className="truncate">{peer.full_name || peer.username}</span>
                {peer.is_verified ? <VerifiedBadge className="h-4 w-4" /> : null}
              </p>
              <p className="text-sm text-app-muted">
                {request.direction === "incoming"
                  ? "First-message request • View profile"
                  : "Waiting for reply • View profile"}
              </p>
            </div>
          </button>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-5">
        <div className="mx-auto max-w-3xl space-y-4">
          <div className="rounded-[28px] border border-app-border bg-app-card px-5 py-5 shadow-[0_24px_60px_-40px_rgba(15,23,42,0.28)]">
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-300">
                <ShieldCheck className="h-4 w-4" />
              </div>
              <div>
                <p className="text-sm font-semibold text-app-text">Intro request</p>
                <p className="text-[11px] text-app-muted">
                  Accept to open a full conversation with this student
                </p>
              </div>
            </div>

            <div className="mt-4 rounded-[22px] bg-[#f0f2f5] px-4 py-4 dark:bg-app-secondary/50">
              <p className="whitespace-pre-wrap text-sm leading-7 text-app-text">{introText}</p>
            </div>
          </div>

          {request.direction === "incoming" && request.status === "pending" ? (
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => onRespond("accept")}
                disabled={sending}
                className="inline-flex items-center gap-2 rounded-full bg-[#25D366] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#1fa855] disabled:opacity-60"
              >
                <UserCheck className="h-4 w-4" />
                Accept request
              </button>
              <button
                type="button"
                onClick={() => onRespond("decline")}
                disabled={sending}
                className="inline-flex items-center gap-2 rounded-full border border-rose-500/20 bg-rose-500/10 px-5 py-3 text-sm font-semibold text-rose-600 transition hover:bg-rose-500/15 disabled:opacity-60 dark:text-rose-300"
              >
                <UserX className="h-4 w-4" />
                Decline
              </button>
            </div>
          ) : (
            <p className="text-sm text-app-muted">
              This request is currently <span className="font-semibold text-app-text">{request.status}</span>.
            </p>
          )}
        </div>
      </div>
    </>
  );
}
