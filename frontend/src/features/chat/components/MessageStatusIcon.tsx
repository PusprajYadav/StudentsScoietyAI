import { Check, CheckCheck } from "lucide-react";
import type { LocalChatMessage } from "../../../lib/chat/types";

export function MessageStatusIcon({ status }: { status: LocalChatMessage["status"] }) {
  if (status === "delivered") {
    return <CheckCheck className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-300" />;
  }

  if (status === "sent") {
    return <Check className="h-3.5 w-3.5 text-app-muted" />;
  }

  return null;
}
