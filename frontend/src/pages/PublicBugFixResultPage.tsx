import {
  Clock3,
  Crown,
  Sparkles,
  Swords,
  Trophy,
  Users2,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { loadPublicBugFixResultShare } from "../lib/bugfixMultiplayerApi";
import { formatDateTime } from "../lib/formatting";
import {
  buildPublicBugFixResultPath,
  formatDurationLabel,
} from "../components/tools/bugfix-lab/helpers";
import type { BugFixResultShareRecord } from "../components/tools/bugfix-lab/types";

function getPlayerLabel(entry: BugFixResultShareRecord["snapshot"]["leaderboard"][number] | null | undefined) {
  if (!entry) {
    return "Player";
  }

  return entry.profile?.full_name || entry.profile?.username || "Player";
}

export function PublicBugFixResultPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { shareSlug = "", username = "" } = useParams<{ shareSlug: string; username: string }>();
  const [share, setShare] = useState<BugFixResultShareRecord | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let disposed = false;
    setLoading(true);

    void loadPublicBugFixResultShare(shareSlug)
      .then((item) => {
        if (disposed) {
          return;
        }

        const canonicalPath = buildPublicBugFixResultPath(item.share_slug, item.owner?.username || username || "student");
        if (location.pathname !== canonicalPath) {
          navigate(canonicalPath, { replace: true });
          return;
        }

        setShare(item);
        setLoading(false);
      })
      .catch((error) => {
        if (disposed) {
          return;
        }

        toast.error(error instanceof Error ? error.message : "Could not load this shared BugFix result.");
        setShare(null);
        setLoading(false);
      });

    return () => {
      disposed = true;
    };
  }, [location.pathname, navigate, shareSlug, username]);

  const leaderboard = useMemo(() => share?.snapshot.leaderboard || [], [share]);
  const topThree = useMemo(() => leaderboard.slice(0, 3), [leaderboard]);
  const winner = topThree[0] || null;
  const room = share?.snapshot.room || null;
  const playerResult = share?.snapshot.playerResult || null;
  const questions = share?.snapshot.questions || [];

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <div className="surface-card rounded-[30px] p-6 text-center text-app-muted">Loading shared BugFix result...</div>
      </div>
    );
  }

  if (!share) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <div className="surface-card rounded-[30px] p-6 text-center">
          <p className="font-display text-2xl font-semibold text-app-text">BugFix result not found</p>
          <p className="mt-2 text-sm text-app-muted">This result link may have expired or the shared snapshot is no longer available.</p>
          <Link to="/app/tools/bugfix-lab" className="btn-primary mt-5 inline-flex">
            Open BugFix Lab
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
      <div className="space-y-4">
        <section className="overflow-hidden rounded-[32px] border border-brand/20 bg-[radial-gradient(circle_at_top,rgba(37,99,235,0.18),transparent_42%),linear-gradient(180deg,#f8fbff,#ffffff)]">
          <div className="p-5 sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="max-w-3xl">
                <div className="flex items-center gap-2 text-brand">
                  <Trophy className="h-4 w-4" />
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em]">Shared BugFix Arena Result</p>
                </div>
                <h1 className="mt-3 font-display text-[1.7rem] font-semibold tracking-tight text-app-text sm:text-[2.3rem]">
                  {share.title}
                </h1>
                <p className="mt-3 text-sm leading-6 text-app-muted">
                  {winner ? `${getPlayerLabel(winner)} wins` : "Final result for"} <strong>{room?.title || share.room_title}</strong>
                  {share.owner?.username ? `, shared by @${share.owner.username}` : ""}. The ranking uses points first,
                  then correct fixes, then total time used.
                </p>
                {share.summary_text?.trim() ? (
                  <div className="mt-4 max-w-2xl rounded-[22px] border border-white/70 bg-white/80 px-4 py-4 text-sm leading-6 text-app-muted shadow-sm">
                    {share.summary_text.trim()}
                  </div>
                ) : null}
              </div>

              <div className="rounded-[26px] border border-white/70 bg-white/85 px-4 py-4 shadow-sm sm:min-w-[240px]">
                <div className="flex items-center gap-2 text-brand">
                  <Sparkles className="h-4 w-4" />
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em]">Shared finish</p>
                </div>
                <p className="mt-3 text-4xl font-semibold tracking-tight text-app-text">#{playerResult?.rankPosition || share.rank_position}</p>
                <p className="mt-2 text-sm font-semibold text-app-text">{getPlayerLabel(playerResult)}</p>
                <p className="mt-1 text-xs leading-5 text-app-muted">
                  {(playerResult?.score || share.final_score).toString()} pts • {playerResult?.correctCount || 0} correct
                </p>
                <p className="mt-3 text-[11px] text-app-muted">Shared {formatDateTime(share.created_at)}</p>
              </div>
            </div>

            <div className="mt-5 flex flex-wrap gap-2 text-xs text-app-muted">
              <span className="rounded-full bg-white/80 px-3 py-1.5">
                <Users2 className="mr-1 inline h-3.5 w-3.5 text-brand" />
                {share.participant_count} players
              </span>
              <span className="rounded-full bg-white/80 px-3 py-1.5">
                <Swords className="mr-1 inline h-3.5 w-3.5 text-brand" />
                {share.total_questions} rounds
              </span>
              <span className="rounded-full bg-white/80 px-3 py-1.5">
                <Clock3 className="mr-1 inline h-3.5 w-3.5 text-brand" />
                {formatDurationLabel(playerResult?.totalTimeMs || 0)}
              </span>
              {room?.language ? <span className="rounded-full bg-white/80 px-3 py-1.5">{room.language}</span> : null}
              {room?.difficulty ? <span className="rounded-full bg-white/80 px-3 py-1.5">{room.difficulty}</span> : null}
            </div>
          </div>
        </section>

        <section className="grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_360px]">
          <article className="surface-card overflow-hidden rounded-[30px]">
            <div className="border-b border-app-border bg-[linear-gradient(180deg,#ffffff,rgba(248,250,252,0.92))] px-5 py-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-app-muted">Winner board</p>
                  <h2 className="mt-2 font-display text-[1.5rem] font-semibold tracking-tight text-app-text">
                    {winner ? `${getPlayerLabel(winner)} leads the room` : room?.title || "Final leaderboard"}
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-app-muted">
                    Everyone raced on the same countdown and question timer. The finish order below is the locked result snapshot.
                  </p>
                </div>
              </div>

              <div className="mt-5 grid gap-3 md:grid-cols-3">
                {topThree.map((entry, index) => (
                  <div
                    key={entry.userId}
                    className={`rounded-[24px] border px-4 py-4 ${
                      index === 0 ? "border-brand/25 bg-brand/10" : "border-app-border bg-app-secondary/20"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="rounded-full bg-app-card px-2.5 py-1 text-[11px] font-semibold text-app-text">
                        #{entry.rankPosition}
                      </span>
                      {index === 0 ? <Crown className="h-4 w-4 text-brand" /> : null}
                    </div>
                    <p className="mt-3 truncate text-lg font-semibold text-app-text">{getPlayerLabel(entry)}</p>
                    <p className="mt-2 text-sm text-app-muted">
                      {entry.score} pts • {entry.correctCount} correct • {formatDurationLabel(entry.totalTimeMs)}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-3 px-5 py-5">
              {leaderboard.map((entry) => (
                <div key={entry.userId} className="rounded-[22px] border border-app-border bg-app-secondary/20 px-4 py-3">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-app-text">
                        #{entry.rankPosition} {getPlayerLabel(entry)}
                      </p>
                      <p className="mt-1 text-xs text-app-muted">
                        {entry.correctCount} correct • {entry.answeredCount} submitted • {entry.status}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-app-text">{entry.score} pts</p>
                      <p className="mt-1 text-[11px] text-app-muted">{formatDurationLabel(entry.totalTimeMs)}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </article>

          <aside className="space-y-4">
            <article className="surface-card rounded-[30px] p-4 sm:p-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-app-muted">Your result</p>
              <p className="mt-3 text-4xl font-semibold tracking-tight text-app-text">#{playerResult?.rankPosition || share.rank_position}</p>
              <p className="mt-2 text-sm font-semibold text-app-text">{getPlayerLabel(playerResult)}</p>
              <div className="mt-4 space-y-2 text-xs text-app-muted">
                <div className="flex items-center justify-between gap-2 rounded-[14px] bg-app-secondary/30 px-3 py-2">
                  <span>Final score</span>
                  <span className="font-semibold text-app-text">{playerResult?.score || share.final_score} pts</span>
                </div>
                <div className="flex items-center justify-between gap-2 rounded-[14px] bg-app-secondary/30 px-3 py-2">
                  <span>Correct fixes</span>
                  <span className="font-semibold text-app-text">{playerResult?.correctCount || 0}</span>
                </div>
                <div className="flex items-center justify-between gap-2 rounded-[14px] bg-app-secondary/30 px-3 py-2">
                  <span>Answered</span>
                  <span className="font-semibold text-app-text">{playerResult?.answeredCount || 0}</span>
                </div>
                <div className="flex items-center justify-between gap-2 rounded-[14px] bg-app-secondary/30 px-3 py-2">
                  <span>Time used</span>
                  <span className="font-semibold text-app-text">{formatDurationLabel(playerResult?.totalTimeMs || 0)}</span>
                </div>
              </div>

              <Link to="/app/tools/bugfix-lab" className="btn-primary mt-4 inline-flex w-full justify-center">
                Open BugFix Lab
              </Link>
            </article>

            <article className="surface-card rounded-[30px] p-4 sm:p-5">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-app-muted">Round set</p>
                  <p className="mt-1 text-xs text-app-muted">The question stack that powered this battle.</p>
                </div>
                <span className="rounded-full bg-app-secondary px-2.5 py-1 text-[10px] font-semibold text-app-muted">
                  {questions.length} total
                </span>
              </div>

              <div className="mt-4 max-h-[460px] space-y-2 overflow-y-auto pr-1">
                {questions.map((question) => (
                  <div key={question.id} className="rounded-[18px] border border-app-border bg-app-secondary/20 px-3 py-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-app-text">
                          {(question.questionIndex + 1).toString().padStart(2, "0")} • {question.title}
                        </p>
                        <p className="mt-1 text-[11px] text-app-muted">
                          {question.language} • {question.difficulty}
                        </p>
                      </div>
                      <span className="rounded-full bg-app-card px-2.5 py-1 text-[10px] font-semibold text-app-text">
                        {question.points} pts
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </article>
          </aside>
        </section>
      </div>
    </div>
  );
}
