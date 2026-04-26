import { KeyRound, LockKeyhole, X } from "lucide-react";
import { useEffect, useState } from "react";
import type { CommunityRow } from "../../types/database";

interface CommunityJoinSheetProps {
  open: boolean;
  community: CommunityRow | null;
  onClose: () => void;
  onSubmit: (password: string) => Promise<void>;
}

export function CommunityJoinSheet({ open, community, onClose, onSubmit }: CommunityJoinSheetProps) {
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) {
      return;
    }

    setPassword("");
    setSubmitting(false);
  }, [open]);

  if (!open || !community) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[80] bg-slate-950/60 backdrop-blur-sm" role="dialog" aria-modal="true">
      <div className="flex h-full items-end justify-center p-0 sm:p-4">
        <div className="native-sheet flex w-full max-w-lg flex-col p-4 sm:rounded-[32px] sm:border sm:shadow-2xl">
          <div className="mx-auto mb-3 h-1.5 w-14 rounded-full bg-app-border sm:hidden" />

          <div className="flex items-start justify-between gap-3 pb-4">
            <div>
              <p className="font-display text-[1.4rem] font-bold tracking-tight text-app-text sm:text-[1.8rem]">
                Join {community.name}
              </p>
              <p className="mt-1 text-sm text-app-muted">
                This community is password protected. Enter the current password to continue.
              </p>
            </div>

            <button type="button" onClick={onClose} className="native-icon-button h-10 w-10" aria-label="Close join community sheet">
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="rounded-[22px] border border-app-border bg-app-card p-4">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-brand/10 text-brand">
                <LockKeyhole className="h-4.5 w-4.5" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-app-text">Protected access</p>
                <p className="mt-1 text-xs leading-5 text-app-muted">
                  {community.password_hint
                    ? `Hint: ${community.password_hint}`
                    : "Only members with the current password can join this community."}
                </p>
              </div>
            </div>

            <label className="mt-4 grid gap-1.5">
              <span className="text-xs font-semibold uppercase tracking-[0.18em] text-app-muted">Password</span>
              <div className="relative">
                <KeyRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-app-muted" />
                <input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="input-shell h-11 pl-10 text-sm"
                  placeholder="Enter community password"
                  disabled={submitting}
                />
              </div>
            </label>
          </div>

          <div className="mt-4">
            <button
              type="button"
              disabled={submitting}
              onClick={() => {
                setSubmitting(true);
                void onSubmit(password).finally(() => setSubmitting(false));
              }}
              className="btn-primary w-full !rounded-full !py-3"
            >
              {submitting ? "Checking password..." : "Join community"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
