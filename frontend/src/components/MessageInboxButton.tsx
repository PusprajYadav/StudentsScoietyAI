import { MessageCircle } from "lucide-react";
import { NavLink } from "react-router-dom";
import { formatCompactCount } from "../lib/formatting";
import { useChatStore } from "../store/chatStore";

export function MessageInboxButton({ compact = false }: { compact?: boolean }) {
  const unreadCount = useChatStore((state) => state.unreadCount);

  return (
    <NavLink
      to="/app/messages"
      className={({ isActive }) =>
        `native-icon-button relative ${compact ? "h-10 w-10" : ""} ${
          isActive
            ? "!border-brand/35 !bg-brand/10 !text-brand"
            : ""
        }`.trim()
      }
      aria-label="Open private messages"
    >
      <MessageCircle className="h-4 w-4" />
      {unreadCount > 0 ? (
        <span className="absolute -right-1 -top-1 rounded-full bg-brand px-1.5 py-0.5 text-[10px] font-semibold text-white">
          {formatCompactCount(unreadCount)}
        </span>
      ) : null}
    </NavLink>
  );
}
