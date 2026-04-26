import { AlertCircle, CheckCircle2, XCircle } from "lucide-react";
import type { WalletRechargeStatus } from "../../types/database";

interface WalletRechargeStatusBadgeProps {
  status: WalletRechargeStatus;
}

export function WalletRechargeStatusBadge({
  status,
}: WalletRechargeStatusBadgeProps) {
  if (status === "approved") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300">
        <CheckCircle2 className="h-3.5 w-3.5" />
        Approved
      </span>
    );
  }

  if (status === "rejected") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/10 px-2.5 py-1 text-[11px] font-semibold text-rose-600 dark:text-rose-300">
        <XCircle className="h-3.5 w-3.5" />
        Rejected
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2.5 py-1 text-[11px] font-semibold text-amber-700 dark:text-amber-300">
      <AlertCircle className="h-3.5 w-3.5" />
      Pending
    </span>
  );
}
