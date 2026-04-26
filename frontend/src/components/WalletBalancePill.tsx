import { Coins } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuthStore } from "../store/authStore";
import { useCoinWalletStore } from "../store/coinWalletStore";

export function WalletBalancePill({ mobile = false }: { mobile?: boolean }) {
  const profile = useAuthStore((state) => state.profile);
  const wallet = useCoinWalletStore((state) => state.wallet);

  if (!profile) {
    return null;
  }

  const href = `/profile/${profile.username}/settings/wallet`;
  const balance = wallet?.balance || 0;
  const balanceLabel = balance.toLocaleString();

  return (
    <Link
      to={href}
      className={`inline-flex items-center gap-2 rounded-full border border-brand/20 bg-brand/10 text-brand transition hover:border-brand/35 hover:bg-brand/15 ${
        mobile ? "px-2.5 py-2 text-xs font-semibold" : "px-3 py-2 text-sm font-semibold"
      }`}
      title="Wallet balance. 1 coin is treated as Rs 1."
    >
      <Coins className={mobile ? "h-3.5 w-3.5" : "h-4 w-4"} />
      <span>{balanceLabel}</span>
    </Link>
  );
}
