import { Import } from "lucide-react";

export function SharedAttachmentActionButton({
  busy,
  disabled = false,
  label,
  onClick,
}: {
  busy?: boolean;
  disabled?: boolean;
  label: string;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      disabled={busy || disabled}
      onClick={onClick}
      className="inline-flex items-center gap-1.5 rounded-full border border-brand/40 bg-white px-4 py-2.5 text-[12px] font-semibold text-brand shadow-sm transition hover:bg-brand/5 disabled:cursor-not-allowed disabled:opacity-60 sm:text-xs"
    >
      <Import className="h-3.5 w-3.5" />
      {busy ? "Importing..." : label}
    </button>
  );
}
