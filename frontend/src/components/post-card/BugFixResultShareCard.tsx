import {
  Clock3,
  Crown,
  ExternalLink,
  Swords,
  Trophy,
  Users2,
} from "lucide-react";
import { formatDateTime } from "../../lib/formatting";
import { RichPostContent } from "../RichPostContent";
import { formatDurationLabel } from "../tools/bugfix-lab/helpers";
import type { BugFixResultShareRecord } from "../tools/bugfix-lab/types";

interface BugFixResultShareCardProps {
  linkUrl: string;
  postContent: string;
  postTitle: string;
  preview: BugFixResultShareRecord | null;
  previewLoading: boolean;
}

function getPlayerLabel(entry: BugFixResultShareRecord["snapshot"]["leaderboard"][number] | null | undefined) {
  if (!entry) {
    return "Player";
  }

  return entry.profile?.full_name || entry.profile?.username || "Player";
}

export function BugFixResultShareCard({
  linkUrl,
  postContent,
  postTitle,
  preview,
  previewLoading,
}: BugFixResultShareCardProps) {
  const room = preview?.snapshot.room || null;
  const leaderboard = preview?.snapshot.leaderboard || [];
  const topThree = leaderboard.slice(0, 3);
  const winner = topThree[0] || null;
  const viewerResult = preview?.snapshot.playerResult || null;

  return (
    <div className="min-w-0 space-y-3">
      <RichPostContent content={postContent} />

      <div className="min-w-0 overflow-hidden rounded-[18px] border border-app-border bg-[#f8fafc] dark:bg-[linear-gradient(180deg,rgba(10,16,30,0.98),rgba(7,12,24,0.98))] sm:rounded-[22px]">
        <div className="flex items-start justify-between gap-2 border-b border-app-border px-3 py-2.5 sm:px-4 sm:py-3">
          <div className="min-w-0 flex flex-1 items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand/10 text-brand sm:h-8 sm:w-8">
              <Trophy className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            </span>
            <div className="min-w-0">
              <p className="truncate text-[11px] font-semibold text-app-text sm:text-[13px]">Shared BugFix Result</p>
              <p className="truncate text-[10px] text-app-muted sm:text-[11px]">
                {preview ? `${preview.participant_count} players • ${preview.total_questions} rounds` : "Loading result"}
              </p>
            </div>
          </div>

          <a
            href={linkUrl}
            target="_blank"
            rel="noreferrer"
            aria-label="Open full result"
            className="inline-flex h-8 shrink-0 items-center justify-center gap-1 rounded-full bg-app-card px-2.5 text-[10px] font-semibold text-app-text shadow-sm transition hover:bg-app-secondary dark:bg-slate-900/80 sm:h-9 sm:px-3 sm:text-[11px]"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Open full result</span>
          </a>
        </div>

        <div className="p-2.5 sm:p-4">
          {previewLoading ? (
            <div className="h-[220px] animate-pulse rounded-[20px] bg-app-secondary/70 sm:h-[260px] sm:rounded-[22px]" />
          ) : (
            <div className="grid min-w-0 gap-3 lg:grid-cols-[minmax(0,1fr)_220px]">
              <div className="min-w-0 space-y-3">
                <div className="overflow-hidden rounded-[18px] border border-brand/20 bg-[radial-gradient(circle_at_top,rgba(37,99,235,0.18),transparent_42%),linear-gradient(180deg,#f8fbff,#eff6ff)] px-3 py-3 dark:bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.22),transparent_42%),linear-gradient(180deg,rgba(15,23,42,0.98),rgba(12,18,33,0.98))] sm:rounded-[20px] sm:px-4 sm:py-3.5">
                  <div className="relative min-w-0 pr-24">
                    <div className="min-w-0">
                      <p className="text-[9px] font-semibold uppercase tracking-[0.16em] text-brand sm:text-[10px]">
                        Arena result
                      </p>
                      <h3 className="mt-2 font-display text-[1rem] font-semibold tracking-tight text-app-text sm:text-[1.2rem]">
                        {winner ? `${getPlayerLabel(winner)} wins ${room?.title || postTitle}` : room?.title || postTitle}
                      </h3>
                    </div>

                    {viewerResult ? (
                      <div className="absolute right-0 top-0 rounded-[14px] border border-white/80 bg-white/85 px-2.5 py-1.5 text-right shadow-sm dark:border-white/10 dark:bg-slate-950/55">
                        <p className="text-[8px] font-semibold uppercase tracking-[0.12em] text-app-muted">
                          <span className="sm:hidden">Finish</span>
                          <span className="hidden sm:inline">Your finish</span>
                        </p>
                        <p className="mt-0.5 text-[1.15rem] font-semibold tracking-tight text-app-text sm:text-[1.35rem]">
                          #{viewerResult.rankPosition}
                        </p>
                      </div>
                    ) : null}
                  </div>

                  <div className="mt-3 flex flex-wrap gap-1.5 text-[10px] text-app-muted">
                    <span className="rounded-full bg-white/80 px-2 py-1 dark:bg-slate-950/50">
                      <Users2 className="mr-1 inline h-3 w-3 text-brand" />
                      {preview?.participant_count || leaderboard.length}
                    </span>
                    <span className="rounded-full bg-white/80 px-2 py-1 dark:bg-slate-950/50">
                      <Swords className="mr-1 inline h-3 w-3 text-brand" />
                      {preview?.total_questions || room?.roundSize || 0} rounds
                    </span>
                    {preview ? (
                      <span className="rounded-full bg-white/80 px-2 py-1 dark:bg-slate-950/50">
                        {formatDateTime(preview.created_at)}
                      </span>
                    ) : null}
                  </div>

                  <div className="mt-3 overflow-x-auto pb-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                    <div className="flex w-max min-w-full snap-x snap-mandatory gap-2">
                      {topThree.map((entry, index) => (
                        <div
                          key={entry.userId}
                          className={`w-[156px] shrink-0 snap-start rounded-[16px] border px-2.5 py-2.5 ${
                            index === 0
                              ? "border-brand/25 bg-white/90 dark:bg-slate-950/65"
                              : "border-white/80 bg-white/70 dark:border-white/10 dark:bg-slate-950/45"
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <span className="rounded-full bg-app-card px-2 py-1 text-[9px] font-semibold text-app-text dark:bg-slate-900/85">
                              #{entry.rankPosition}
                            </span>
                            {index === 0 ? <Crown className="h-4 w-4 text-brand" /> : null}
                          </div>
                          <p className="mt-2 line-clamp-1 text-[12px] font-semibold text-app-text sm:text-[13px]">
                            {getPlayerLabel(entry)}
                          </p>
                          <p className="mt-1 text-[10px] leading-4 text-app-muted">
                            {entry.score} pts • {formatDurationLabel(entry.totalTimeMs)}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                  {leaderboard.length > topThree.length ? (
                    <div className="mt-3 rounded-[14px] border border-white/70 bg-white/70 px-3 py-2 text-[10px] text-app-muted dark:border-white/10 dark:bg-slate-950/45">
                      +{leaderboard.length - topThree.length} more players on the full result page
                    </div>
                  ) : null}
                </div>
              </div>

              <aside className="space-y-3">
                <div className="rounded-[18px] border border-app-border bg-white px-3 py-3 dark:bg-slate-950/45 sm:rounded-[20px] sm:px-3.5 sm:py-3.5">
                  <div className="relative pr-16">
                    <p className="text-[9px] font-semibold uppercase tracking-[0.16em] text-app-muted sm:text-[10px]">Result</p>
                    <p className="mt-2 text-[11px] font-semibold text-app-text sm:mt-2 sm:text-[12px]">
                      {getPlayerLabel(viewerResult)}
                    </p>
                    <p className="absolute right-0 top-0 text-[1.1rem] font-semibold tracking-tight text-app-text sm:text-[1.35rem]">
                      #{viewerResult?.rankPosition || preview?.rank_position || 1}
                    </p>
                  </div>
                  <div className="mt-2.5 space-y-1.5 text-[10px] text-app-muted sm:mt-3 sm:text-[11px]">
                    <div className="flex items-center justify-between gap-2 rounded-[10px] bg-app-secondary/30 px-3 py-1.5 dark:bg-slate-900/80">
                      <span>Score</span>
                      <span className="font-semibold text-app-text">{viewerResult?.score || preview?.final_score || 0} pts</span>
                    </div>
                    <div className="flex items-center justify-between gap-2 rounded-[10px] bg-app-secondary/30 px-3 py-1.5 dark:bg-slate-900/80">
                      <span>Correct</span>
                      <span className="font-semibold text-app-text">{viewerResult?.correctCount || 0}</span>
                    </div>
                    <div className="flex items-center justify-between gap-2 rounded-[10px] bg-app-secondary/30 px-3 py-1.5 dark:bg-slate-900/80">
                      <span className="inline-flex items-center gap-1">
                        <Clock3 className="h-3 w-3 text-brand" />
                        Time
                      </span>
                      <span className="font-semibold text-app-text">{formatDurationLabel(viewerResult?.totalTimeMs || 0)}</span>
                    </div>
                  </div>
                </div>
              </aside>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
