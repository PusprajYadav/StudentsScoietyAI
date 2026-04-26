import { Lock, Share2 } from "lucide-react";
import type { Dispatch, SetStateAction } from "react";
import type { CommunityRow } from "../../../types/database";
import type { PlannerShareCategory } from "../../../lib/plannerPost";
import { getPlannerShareCategoryLabel } from "../../../lib/plannerPost";

export interface ResumeShareState {
  open: boolean;
  destination: "discussion" | "community";
  category: PlannerShareCategory;
  communityId: string;
  title: string;
  note: string;
  loading: boolean;
  submitting: boolean;
}

export function ResumeShareSheet({
  shareState,
  setShareState,
  joinedCommunities,
  allowedShareCategories,
  shareSnapshotFallback,
  onClose,
  onSubmit,
}: {
  shareState: ResumeShareState;
  setShareState: Dispatch<SetStateAction<ResumeShareState>>;
  joinedCommunities: CommunityRow[];
  allowedShareCategories: PlannerShareCategory[];
  shareSnapshotFallback: string;
  onClose: () => void;
  onSubmit: () => void;
}) {
  if (!shareState.open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/40 p-3 sm:items-center sm:p-6">
      <div className="surface-card max-h-[88vh] w-full max-w-2xl overflow-y-auto rounded-[28px] p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-app-muted">Share resume</p>
            <h2 className="mt-1 font-display text-[1.2rem] font-semibold tracking-tight text-app-text sm:text-[1.4rem]">Share to Feed</h2>
            <p className="mt-1 text-[11px] leading-5 text-app-muted sm:text-xs">
              Publish your live resume to the feed to get feedback or find opportunities. Your post will embed the public resume URL.
            </p>
          </div>
          <button type="button" onClick={onClose} className="btn-secondary text-xs">
            Close
          </button>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="grid gap-1 text-[11px] font-medium text-app-muted">
            Destination
            <select
              value={shareState.destination}
              onChange={(event) =>
                setShareState((current) => ({
                  ...current,
                  destination: event.target.value as "discussion" | "community",
                }))
              }
              className="input-field"
              disabled={shareState.loading || shareState.submitting}
            >
              <option value="discussion">Main feed</option>
              <option value="community">Community</option>
            </select>
          </label>

          {shareState.destination === "community" ? (
            <label className="grid gap-1 text-[11px] font-medium text-app-muted">
              Community
              <select
                value={shareState.communityId}
                onChange={(event) =>
                  setShareState((current) => ({
                    ...current,
                    communityId: event.target.value,
                  }))
                }
                className="input-field"
                disabled={shareState.loading || shareState.submitting || joinedCommunities.length === 0}
              >
                {joinedCommunities.length === 0 ? (
                  <option value="">Join a community first</option>
                ) : (
                  joinedCommunities.map((community) => (
                    <option key={community.id} value={community.id}>
                      {community.name}
                    </option>
                  ))
                )}
              </select>
            </label>
          ) : (
            <label className="grid gap-1 text-[11px] font-medium text-app-muted">
              Category
              <select
                value={shareState.category}
                onChange={(event) =>
                  setShareState((current) => ({
                    ...current,
                    category: event.target.value as PlannerShareCategory,
                  }))
                }
                className="input-field"
                disabled={shareState.loading || shareState.submitting}
              >
                {allowedShareCategories.map((category) => (
                  <option key={category} value={category}>
                    {getPlannerShareCategoryLabel(category)}
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>

        {shareState.destination === "community" ? (
          <label className="mt-3 grid gap-1 text-[11px] font-medium text-app-muted">
            Category
            <select
              value={shareState.category}
              onChange={(event) =>
                setShareState((current) => ({
                  ...current,
                  category: event.target.value as PlannerShareCategory,
                }))
              }
              className="input-field"
              disabled={shareState.loading || shareState.submitting}
            >
              {allowedShareCategories.map((category) => (
                <option key={category} value={category}>
                  {getPlannerShareCategoryLabel(category)}
                </option>
              ))}
            </select>
          </label>
        ) : null}

        <label className="mt-3 grid gap-1 text-[11px] font-medium text-app-muted">
          Post title
          <input
            value={shareState.title}
            onChange={(event) =>
              setShareState((current) => ({
                ...current,
                title: event.target.value,
              }))
            }
            className="input-field"
            placeholder="Review my resume!"
            disabled={shareState.submitting}
          />
        </label>

        <label className="mt-3 grid gap-1 text-[11px] font-medium text-app-muted">
          Intro note
          <textarea
            value={shareState.note}
            onChange={(event) =>
              setShareState((current) => ({
                ...current,
                note: event.target.value,
              }))
            }
            className="input-field min-h-[100px] resize-y"
            placeholder="Looking for any feedback on my latest resume or a potential referral..."
            disabled={shareState.submitting}
          />
        </label>

        <div className="mt-3 rounded-[20px] border border-app-border bg-app-card p-3">
          <div className="mb-2 flex items-center gap-2 text-app-text">
            <Lock className="h-4 w-4 text-brand" />
            <p className="font-medium text-xs sm:text-sm">Live resume embed attachment</p>
          </div>
          <p className="text-[11px] leading-5 text-app-muted">
            Your public resume URL will be embedded in the post: <strong>{shareSnapshotFallback}</strong><br/>
            Any future updates to your resume will automatically reflect in the post preview.
          </p>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
          <p className="text-[11px] text-app-muted">
            {shareState.loading
              ? "Loading sharing options..."
              : "Ensure your resume data is exactly what you intend to share publicly."}
          </p>
          <button
            type="button"
            onClick={onSubmit}
            className="btn-primary inline-flex items-center gap-2"
            disabled={shareState.loading || shareState.submitting}
          >
            <Share2 className="h-4 w-4" />
            {shareState.submitting ? "Sharing..." : "Share to Feed"}
          </button>
        </div>
      </div>
    </div>
  );
}
