import { Flag, X } from "lucide-react";
import { POST_REPORT_REASON_OPTIONS } from "../../lib/postReports";
import type { PostReportReason } from "../../types/database";

interface PostReportSheetProps {
  open: boolean;
  reason: PostReportReason;
  details: string;
  submitting: boolean;
  onClose: () => void;
  onReasonChange: (value: PostReportReason) => void;
  onDetailsChange: (value: string) => void;
  onSubmit: () => void;
}

export function PostReportSheet({
  open,
  reason,
  details,
  submitting,
  onClose,
  onReasonChange,
  onDetailsChange,
  onSubmit,
}: PostReportSheetProps) {
  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[70] bg-slate-950/60 backdrop-blur-sm" role="dialog" aria-modal="true">
      <div className="flex h-full items-end justify-center p-0 sm:p-4">
        <div className="native-sheet flex h-[78dvh] w-full max-w-xl flex-col p-4 sm:h-auto sm:max-h-[88dvh] sm:rounded-[32px] sm:border sm:shadow-2xl">
          <div className="mx-auto mb-3 h-1.5 w-14 rounded-full bg-app-border sm:hidden" />

          <div className="flex items-start justify-between gap-3 pb-4">
            <div>
              <p className="text-center font-display text-[1.55rem] font-bold tracking-tight text-rose-600 sm:text-left sm:text-2xl">
                Report Post
              </p>
              <p className="mt-1 text-sm text-app-muted">
                Tell the moderators why this post should be reviewed.
              </p>
            </div>

            <button
              type="button"
              className="native-icon-button h-10 w-10"
              onClick={onClose}
              aria-label="Close report sheet"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="min-h-0 flex-1 overflow-auto py-1">
            <div className="grid gap-3">
              {POST_REPORT_REASON_OPTIONS.map((option) => {
                const active = option.value === reason;

                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => onReasonChange(option.value)}
                    className={`rounded-[20px] border px-4 py-4 text-left transition ${
                      active
                        ? "border-rose-500 bg-rose-500 text-white shadow-[0_18px_34px_-22px_rgba(244,63,94,0.5)]"
                        : "border-app-border bg-app-card text-app-text hover:border-rose-300 hover:bg-rose-50/60"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`flex h-10 w-10 items-center justify-center rounded-2xl ${active ? "bg-white/18 text-white" : "bg-rose-500/10 text-rose-600"}`}>
                        <Flag className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold">{option.label}</p>
                        <p className={`mt-1 text-xs ${active ? "text-white/80" : "text-app-muted"}`}>
                          {option.description}
                        </p>
                      </div>
                    </div>
                  </button>
                );
              })}

              <label className="grid gap-2">
                <span className="text-sm font-medium text-app-text">Extra details <span className="text-app-muted">(optional)</span></span>
                <textarea
                  value={details}
                  onChange={(event) => onDetailsChange(event.target.value)}
                  placeholder="Add more context to help the moderators review this report."
                  className="input-shell min-h-[144px] resize-y"
                  maxLength={500}
                  disabled={submitting}
                />
                <span className="text-xs text-app-muted">{details.trim().length}/500 characters</span>
              </label>
            </div>
          </div>

          <div className="border-t border-app-border pt-4">
            <button
              type="button"
              onClick={onSubmit}
              disabled={submitting}
              className="btn-primary w-full gap-2 !rounded-full !py-3"
            >
              {submitting ? "Submitting report..." : "Submit report"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
