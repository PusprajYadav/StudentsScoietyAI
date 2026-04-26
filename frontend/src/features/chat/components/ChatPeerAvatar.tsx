import { buildAvatarSeed, resolveAvatarUrl } from "../../../lib/avatar";
import type { ChatPeerProfile } from "../../../lib/chat/types";

export function ChatPeerAvatar({
  peer,
  size = "md",
}: {
  peer: ChatPeerProfile;
  size?: "sm" | "md";
}) {
  const shellClassName =
    size === "sm" ? "h-11 w-11 rounded-2xl" : "h-12 w-12 rounded-[1.1rem]";
  const indicatorClassName = size === "sm" ? "h-3 w-3" : "h-3.5 w-3.5";

  return (
    <div
      className={`relative flex items-center justify-center overflow-hidden bg-app-secondary shadow-[0_14px_28px_-24px_rgba(15,23,42,0.45)] ${shellClassName}`}
    >
      <img
        src={resolveAvatarUrl(peer.avatar_url, buildAvatarSeed(peer), peer.updated_at || null)}
        alt={peer.full_name || peer.username}
        className="h-full w-full object-cover"
      />
      {peer.online ? (
        <span
          className={`absolute bottom-0.5 right-0.5 rounded-full border-2 border-app-card bg-emerald-500 ${indicatorClassName}`}
        />
      ) : null}
    </div>
  );
}
