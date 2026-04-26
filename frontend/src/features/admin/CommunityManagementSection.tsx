import { Shield } from "lucide-react";
import { getDiscussionKindLabel } from "../../data/discussions";
import type { CommunityRow, DiscussionKind } from "../../types/database";
import { getCommunityFeedVisibilityShortLabel } from "../communities/communityFeedVisibility";

interface CommunityManagementSectionProps {
  communities: CommunityRow[];
  newCommunityName: string;
  newCommunityDescription: string;
  newCommunityColor: string;
  postingModes: DiscussionKind[];
  onNameChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  onColorChange: (value: string) => void;
  onPostingModesChange: (value: DiscussionKind[]) => void;
  onCreateCommunity: () => Promise<void>;
  onToggleVisibility: (community: CommunityRow) => Promise<void>;
}

export function CommunityManagementSection({
  communities,
  newCommunityName,
  newCommunityDescription,
  newCommunityColor,
  postingModes,
  onNameChange,
  onDescriptionChange,
  onColorChange,
  onPostingModesChange,
  onCreateCommunity,
  onToggleVisibility,
}: CommunityManagementSectionProps) {
  return (
    <div className="grid gap-3 xl:grid-cols-[320px_minmax(0,1fr)]">
      <section className="rounded-[20px] border border-slate-200 bg-white p-3.5 shadow-[0_18px_40px_-34px_rgba(15,23,42,0.22)]">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-[14px] bg-brand/10 text-brand">
            <Shield className="h-4 w-4" />
          </div>
          <div>
            <p className="font-display text-base font-semibold text-slate-900">Create community</p>
            <p className="text-xs text-slate-500">Launch a new moderated space.</p>
          </div>
        </div>

        <div className="mt-3 space-y-2.5">
          <label className="grid gap-1">
            <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">Name</span>
            <input
              value={newCommunityName}
              onChange={(event) => onNameChange(event.target.value)}
              className="input-shell h-9 rounded-xl text-sm"
              placeholder="Placement circle"
            />
          </label>

          <label className="grid gap-1">
            <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">
              Description
            </span>
            <textarea
              value={newCommunityDescription}
              onChange={(event) => onDescriptionChange(event.target.value)}
              className="input-shell min-h-[92px] resize-y rounded-2xl text-sm"
              placeholder="What this community is for"
            />
          </label>

          <label className="grid gap-1">
            <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">Accent</span>
            <input
              type="color"
              value={newCommunityColor}
              onChange={(event) => onColorChange(event.target.value)}
              className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 p-1.5"
            />
          </label>

          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">Allowed posts</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {(["study", "job", "anonymous"] as DiscussionKind[]).map((mode) => {
                const selected = postingModes.includes(mode);

                return (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => {
                      onPostingModesChange(
                        selected ? postingModes.filter((item) => item !== mode) : [...postingModes, mode]
                      );
                    }}
                    className={`rounded-full px-3 py-1.5 text-[11px] font-semibold ${
                      selected ? "bg-brand text-white" : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {getDiscussionKindLabel(mode)}
                  </button>
                );
              })}
            </div>
          </div>

          <button
            type="button"
            onClick={() => void onCreateCommunity()}
            className="w-full rounded-full bg-brand px-4 py-2.5 text-sm font-semibold text-white"
          >
            Create community
          </button>
        </div>
      </section>

      <section className="rounded-[20px] border border-slate-200 bg-white p-3.5 shadow-[0_18px_40px_-34px_rgba(15,23,42,0.22)]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="font-display text-base font-semibold text-slate-900 sm:text-lg">Community visibility</p>
            <p className="mt-1 text-xs text-slate-500">Turn spaces on or off without leaving the dashboard.</p>
          </div>
          <p className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold text-slate-600">
            {communities.length} groups
          </p>
        </div>

        <div className="mt-3 space-y-2.5">
          {communities.length === 0 ? (
            <div className="rounded-[16px] border border-slate-200 bg-slate-50 px-4 py-5 text-sm text-slate-500">
              No communities created yet.
            </div>
          ) : (
            communities.map((entry) => (
              <article
                key={entry.id}
                className="rounded-[18px] border border-slate-200 bg-[linear-gradient(135deg,#ffffff,#f8fbff)] p-3 shadow-[0_14px_28px_-26px_rgba(15,23,42,0.18)]"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className="h-3 w-3 rounded-full"
                        style={{ backgroundColor: entry.hero_color }}
                      />
                      <p className="truncate text-sm font-semibold text-slate-900">{entry.name}</p>
                      <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-600">
                        {getCommunityFeedVisibilityShortLabel(entry.feed_visibility)}
                      </span>
                      {entry.requires_password ? (
                        <span className="rounded-full bg-amber-50 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-amber-700">
                          Password
                        </span>
                      ) : null}
                      {entry.join_policy === "approval_required" ? (
                        <span className="rounded-full bg-sky-50 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-sky-700">
                          Approval
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-1 text-xs leading-5 text-slate-500">{entry.description}</p>
                  </div>

                  <button
                    type="button"
                    onClick={() => void onToggleVisibility(entry)}
                    className={`rounded-full px-3 py-1.5 text-[11px] font-semibold ${
                      entry.is_visible ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {entry.is_visible ? "Visible" : "Hidden"}
                  </button>
                </div>
              </article>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
