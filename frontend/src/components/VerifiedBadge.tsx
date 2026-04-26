interface VerifiedBadgeProps {
  className?: string;
}

export function VerifiedBadge({ className = "" }: VerifiedBadgeProps) {
  return (
    <span
      className={`relative inline-flex h-4 w-4 shrink-0 items-center justify-center ${className}`}
      title="Verified"
      aria-label="Verified account"
    >
      <span
        aria-hidden="true"
        className="verified-badge-glow pointer-events-none absolute -inset-[2px] rounded-full bg-[#3b82f6]/40"
      />
      <span className="relative z-[1] inline-flex h-full w-full items-center justify-center rounded-full bg-[#1D9BF0] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.5),0_0_0_2px_rgba(255,255,255,0.82)] dark:shadow-[inset_0_0_0_1px_rgba(255,255,255,0.45),0_0_0_2px_rgba(15,23,42,0.95)]">
        <svg viewBox="0 0 16 16" className="h-[11px] w-[11px] text-white" fill="none" aria-hidden="true">
          <path
            d="M3.9 8.25L6.45 10.55L12.1 5.35"
            stroke="currentColor"
            strokeWidth="2.15"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
    </span>
  );
}
