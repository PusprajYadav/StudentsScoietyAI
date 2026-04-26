import Editor from "@monaco-editor/react";
import {
  ArrowRight,
  Clock3,
  Copy,
  Crown,
  DoorOpen,
  Loader2,
  Play,
  Radio,
  Rocket,
  Share2,
  Swords,
  Trophy,
  Users2,
} from "lucide-react";
import { discussionKindLabels } from "../../../data/discussions";
import { PdfInlineViewer } from "../../PdfInlineViewer";
import type { DiscussionKind } from "../../../types/database";
import {
  buildBugFixInviteLink,
  formatCountdownLabel,
  formatDurationLabel,
  resolveMonacoLanguage,
} from "./helpers";
import type {
  BugFixBattleHistoryRecord,
  BugFixDifficultyFilter,
  BugFixLanguageFilter,
  BugFixMultiplayerRoomState,
  BugFixMultiplayerRoomSummary,
} from "./types";

const compactInputClassName =
  "input-shell !rounded-[18px] !px-3 !py-2.5 text-[13px] sm:!rounded-[22px] sm:!px-4 sm:!py-3 sm:text-sm";
const compactPrimaryButtonClassName =
  "btn-primary gap-2 !rounded-[18px] !px-3 !py-2.5 text-xs sm:!rounded-2xl sm:!px-4 sm:!py-2.5 sm:text-sm";
const compactSecondaryButtonClassName =
  "btn-secondary gap-2 !rounded-[18px] !px-3 !py-2.5 text-xs sm:!rounded-2xl sm:!px-4 sm:!py-2.5 sm:text-sm";

interface BugFixMultiplayerRoomDraft {
  title: string;
  language: BugFixLanguageFilter;
  difficulty: BugFixDifficultyFilter;
  roundSize: number;
  perQuestionTimeSeconds: number | null;
  maxPlayers: number;
  countdownSeconds: number;
  isPublic: boolean;
}

export function BugFixModeSwitcher({
  mode,
  onChange,
}: {
  mode: "solo" | "multiplayer";
  onChange: (mode: "solo" | "multiplayer") => void;
}) {
  return (
    <div className="surface-card rounded-[22px] p-2 sm:rounded-[26px] sm:p-3">
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => onChange("solo")}
          className={`rounded-[18px] border px-3 py-2.5 text-left transition sm:rounded-[20px] sm:px-4 sm:py-3 ${
            mode === "solo" ? "border-brand/30 bg-brand/10" : "border-app-border bg-app-secondary/30"
          }`}
        >
          <div className="flex items-center gap-2">
            <Play className="h-4 w-4 text-brand" />
            <div>
              <p className="text-sm font-semibold text-app-text">Solo</p>
              <p className="mt-0.5 hidden text-xs text-app-muted sm:block">Timed practice</p>
            </div>
          </div>
        </button>

        <button
          type="button"
          onClick={() => onChange("multiplayer")}
          className={`rounded-[18px] border px-3 py-2.5 text-left transition sm:rounded-[20px] sm:px-4 sm:py-3 ${
            mode === "multiplayer" ? "border-brand/30 bg-brand/10" : "border-app-border bg-app-secondary/30"
          }`}
        >
          <div className="flex items-center gap-2">
            <Swords className="h-4 w-4 text-brand" />
            <div>
              <p className="text-sm font-semibold text-app-text">Arena</p>
              <p className="mt-0.5 hidden text-xs text-app-muted sm:block">Live multiplayer</p>
            </div>
          </div>
        </button>
      </div>
    </div>
  );
}

export function BugFixMultiplayerLobbyPanel({
  createBusy,
  history,
  joinCode,
  loadingRooms,
  publicRooms,
  roomDraft,
  signedIn,
  onChangeJoinCode,
  onCreateRoom,
  onJoinByCode,
  onJoinRoom,
  onRoomDraftChange,
}: {
  createBusy: boolean;
  history: BugFixBattleHistoryRecord[];
  joinCode: string;
  loadingRooms: boolean;
  publicRooms: BugFixMultiplayerRoomSummary[];
  roomDraft: BugFixMultiplayerRoomDraft;
  signedIn: boolean;
  onChangeJoinCode: (value: string) => void;
  onCreateRoom: () => void;
  onJoinByCode: () => void;
  onJoinRoom: (room: BugFixMultiplayerRoomSummary) => void;
  onRoomDraftChange: (updates: Partial<BugFixMultiplayerRoomDraft>) => void;
}) {
  return (
    <section className="grid gap-4 xl:grid-cols-[340px_minmax(0,1fr)]">
      <aside className="space-y-4">
        <article className="surface-card rounded-[24px] p-3.5 sm:rounded-[30px] sm:p-5">
          <div className="flex items-center gap-3">
            <div className="rounded-[18px] bg-brand/10 p-2.5 text-brand sm:rounded-2xl sm:p-3">
              <Swords className="h-4 w-4 sm:h-5 sm:w-5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-app-text">Create a room</p>
              <p className="text-[11px] text-app-muted sm:text-xs">Launch a live BugFix battle.</p>
            </div>
          </div>

          {!signedIn ? (
            <p className="mt-3 rounded-[18px] border border-app-border bg-app-secondary/20 px-3.5 py-3 text-[13px] text-app-muted sm:mt-4 sm:rounded-[22px] sm:px-4 sm:text-sm">
              Sign in first to create or join multiplayer rooms.
            </p>
          ) : null}

          <div className="mt-3 space-y-2.5 sm:mt-4 sm:space-y-3">
            <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2.5 sm:gap-3">
              <input
                value={roomDraft.title}
                onChange={(event) => onRoomDraftChange({ title: event.target.value })}
                placeholder="BugFix Arena title"
                className={compactInputClassName}
              />

              <label className="flex h-full items-center gap-2 rounded-[18px] border border-app-border bg-app-secondary/30 px-3 py-2.5 text-[13px] font-medium text-app-text sm:rounded-[20px] sm:px-4 sm:text-sm">
                <input
                  type="checkbox"
                  checked={roomDraft.isPublic}
                  onChange={(event) => onRoomDraftChange({ isPublic: event.target.checked })}
                />
                <span className="sm:hidden">Public</span>
                <span className="hidden sm:inline">Public room</span>
              </label>
            </div>

            <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
              <select
                value={roomDraft.language}
                onChange={(event) => onRoomDraftChange({ language: event.target.value as BugFixLanguageFilter })}
                className={compactInputClassName}
              >
                <option value="all">All languages</option>
                <option value="javascript">JavaScript</option>
                <option value="python">Python</option>
                <option value="java">Java</option>
                <option value="cpp">C++</option>
                <option value="csharp">C#</option>
                <option value="c">C</option>
                <option value="ruby">Ruby</option>
                <option value="php">PHP</option>
                <option value="html">HTML</option>
                <option value="css">CSS</option>
              </select>

              <select
                value={roomDraft.difficulty}
                onChange={(event) => onRoomDraftChange({ difficulty: event.target.value as BugFixDifficultyFilter })}
                className={compactInputClassName}
              >
                <option value="all">Mixed difficulty</option>
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
              <select
                value={roomDraft.roundSize}
                onChange={(event) => onRoomDraftChange({ roundSize: Number(event.target.value) })}
                className={compactInputClassName}
              >
                {[3, 5, 10].map((value) => (
                  <option key={value} value={value}>
                    {value} questions
                  </option>
                ))}
              </select>

              <select
                value={roomDraft.maxPlayers}
                onChange={(event) => onRoomDraftChange({ maxPlayers: Number(event.target.value) })}
                className={compactInputClassName}
              >
                {[2, 4, 6, 8, 10].map((value) => (
                  <option key={value} value={value}>
                    {value} players
                  </option>
                ))}
              </select>

              <select
                value={roomDraft.countdownSeconds}
                onChange={(event) => onRoomDraftChange({ countdownSeconds: Number(event.target.value) })}
                className={compactInputClassName}
              >
                {[5, 7, 10].map((value) => (
                  <option key={value} value={value}>
                    {value}s start
                  </option>
                ))}
              </select>

              <select
                value={roomDraft.perQuestionTimeSeconds === null ? "default" : String(roomDraft.perQuestionTimeSeconds)}
                onChange={(event) =>
                  onRoomDraftChange({
                    perQuestionTimeSeconds:
                      event.target.value === "default" ? null : Number(event.target.value),
                  })
                }
                className={compactInputClassName}
              >
                <option value="default">Question default time</option>
                {[15, 30, 45, 60, 90, 120].map((value) => (
                  <option key={value} value={value}>
                    {value}s each question
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={onCreateRoom}
              disabled={!signedIn || createBusy}
              className={`${compactPrimaryButtonClassName} w-full !py-3`}
            >
              {createBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Rocket className="h-4 w-4" />}
              <span className="sm:hidden">{createBusy ? "Creating..." : "Create room"}</span>
              <span className="hidden sm:inline">{createBusy ? "Creating room..." : "Create room"}</span>
            </button>
          </div>
        </article>

        <article className="surface-card rounded-[24px] p-3.5 sm:rounded-[30px] sm:p-5">
          <p className="text-sm font-semibold text-app-text">Join by invite code</p>
          <p className="mt-1 text-[11px] text-app-muted sm:text-xs">Paste a code and jump in.</p>

          <div className="mt-3 flex gap-2 sm:mt-4">
            <input
              value={joinCode}
              onChange={(event) => onChangeJoinCode(event.target.value.toUpperCase())}
              placeholder="ABC123"
              className={`${compactInputClassName} flex-1 uppercase tracking-[0.2em]`}
            />
            <button
              type="button"
              onClick={onJoinByCode}
              disabled={!signedIn || !joinCode.trim()}
              className={compactSecondaryButtonClassName}
              aria-label="Join room"
            >
              <ArrowRight className="h-4 w-4" />
              <span className="hidden sm:inline">Join</span>
            </button>
          </div>
        </article>

        <article className="surface-card rounded-[24px] p-3.5 sm:rounded-[30px] sm:p-5">
          <p className="text-sm font-semibold text-app-text">Local battle history</p>
          <p className="mt-1 text-[11px] text-app-muted sm:text-xs">Recent battles saved on this device.</p>

          <div className="mt-3 space-y-2.5 sm:mt-4 sm:space-y-3">
            {history.length ? (
              history.slice(0, 4).map((entry) => (
                <div key={entry.id} className="rounded-[18px] border border-app-border bg-app-secondary/25 px-3.5 py-3 sm:rounded-[20px] sm:px-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-[13px] font-semibold text-app-text sm:text-sm">{entry.roomTitle}</p>
                      <p className="mt-1 text-[11px] text-app-muted sm:text-xs">
                        Rank #{entry.rankPosition} • {entry.score} pts • {entry.correctCount}/{entry.questionCount} fixed
                      </p>
                    </div>
                    <span className="rounded-full bg-brand/10 px-2.5 py-1 text-[10px] font-semibold text-brand sm:text-[11px]">
                      {formatDurationLabel(entry.totalTimeMs)}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-[18px] border border-dashed border-app-border bg-app-secondary/20 px-4 py-6 text-[13px] text-app-muted sm:rounded-[22px] sm:text-sm">
                Finish your first multiplayer room to start building a local result shelf.
              </div>
            )}
          </div>
        </article>
      </aside>

      <article className="surface-card rounded-[24px] p-3.5 sm:rounded-[30px] sm:p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-app-text">Available rooms</p>
            <p className="mt-1 text-[11px] text-app-muted sm:text-xs">Open, countdown, and live rooms.</p>
          </div>

          <span className="rounded-full bg-app-secondary px-2.5 py-1 text-[10px] font-semibold text-app-muted sm:px-3 sm:py-1.5 sm:text-xs">
            {publicRooms.length} open
          </span>
        </div>

        <div className="mt-3 grid gap-2.5 sm:mt-4 sm:gap-3 md:grid-cols-2">
          {loadingRooms ? (
            Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="h-32 animate-pulse rounded-[20px] bg-app-secondary/70 sm:h-40 sm:rounded-[24px]" />
            ))
          ) : publicRooms.length ? (
            publicRooms.map((room) => (
              <button
                key={room.id}
                type="button"
                onClick={() => onJoinRoom(room)}
                className="rounded-[20px] border border-app-border bg-app-secondary/25 p-3.5 text-left transition hover:border-brand/20 hover:bg-brand/5 sm:rounded-[24px] sm:p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-app-text sm:text-base">{room.title}</p>
                    <p className="mt-1 text-[11px] text-app-muted sm:text-xs">
                      {room.host?.username ? `by @${room.host.username}` : "Host hidden"}
                    </p>
                  </div>
                  <span className="rounded-full bg-brand/10 px-2.5 py-1 text-[10px] font-semibold text-brand sm:text-[11px]">
                    {room.status}
                  </span>
                </div>

                <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-app-muted sm:mt-4 sm:text-xs">
                  <span className="rounded-full bg-app-card px-2.5 py-1.5">
                    <Users2 className="mr-1 inline h-3.5 w-3.5 text-brand" />
                    {room.participantCount}/{room.maxPlayers}
                  </span>
                  <span className="rounded-full bg-app-card px-2.5 py-1.5">
                    <Swords className="mr-1 inline h-3.5 w-3.5 text-brand" />
                    {room.questionCount} rounds
                  </span>
                  <span className="rounded-full bg-app-card px-2.5 py-1.5">
                    <Clock3 className="mr-1 inline h-3.5 w-3.5 text-brand" />
                    {room.countdownSeconds}s start
                  </span>
                  <span className="rounded-full bg-app-card px-2.5 py-1.5">
                    {room.perQuestionTimeSeconds ? `${room.perQuestionTimeSeconds}s/question` : "default timers"}
                  </span>
                </div>

                <div className="mt-3 flex items-center justify-between gap-3 text-[11px] text-app-muted sm:mt-4 sm:text-xs">
                  <span>
                    {room.language ? room.language : "mixed"} {room.difficulty ? `• ${room.difficulty}` : ""}
                  </span>
                  <span className="inline-flex items-center gap-1 font-semibold text-app-text">
                    {room.joinable ? "Join" : "View"}
                    <ArrowRight className="h-3.5 w-3.5" />
                  </span>
                </div>
              </button>
            ))
          ) : (
            <div className="rounded-[20px] border border-dashed border-app-border bg-app-secondary/20 px-4 py-8 text-center text-[13px] text-app-muted sm:rounded-[24px] sm:py-10 sm:text-sm md:col-span-2">
              No public multiplayer rooms are open right now. Create one and invite your friends into the first battle.
            </div>
          )}
        </div>
      </article>
    </section>
  );
}

export function BugFixMultiplayerRoomPanel({
  activeCountdownMs,
  activeRoomInviteLink,
  editorCode,
  resultShareBusy,
  roomActionBusy,
  roomState,
  shareDiscussionKind,
  sharePreviewNote,
  sharePreviewTitle,
  signedIn,
  submissionFeedback,
  submittingAnswer,
  onChangeEditorCode,
  onCopyInvite,
  onLeaveRoom,
  onShareDiscussionKindChange,
  onShareResult,
  onStartRoom,
  onSubmitAnswer,
}: {
  activeCountdownMs: number | null;
  activeRoomInviteLink: string;
  editorCode: string;
  resultShareBusy: boolean;
  roomActionBusy: boolean;
  roomState: BugFixMultiplayerRoomState;
  shareDiscussionKind: DiscussionKind;
  sharePreviewNote: string;
  sharePreviewTitle: string;
  signedIn: boolean;
  submissionFeedback: {
    isCorrect: boolean;
    earnedPoints: number;
    reviewDetails: string | null;
    question?: {
      title: string;
      explanation: string | null;
      solutionCode: string;
    };
    scoreBreakdown?: {
      basePoints: number;
      speedBonus: number;
      streakBonus: number;
      earnedPoints: number;
    };
  } | null;
  submittingAnswer: boolean;
  onChangeEditorCode: (value: string) => void;
  onCopyInvite: () => void;
  onLeaveRoom: () => void;
  onShareDiscussionKindChange: (kind: DiscussionKind) => void;
  onShareResult: () => void;
  onStartRoom: () => void;
  onSubmitAnswer: () => void;
}) {
  const { room, activeQuestion, leaderboard, participants, viewer } = roomState;
  const topThree = leaderboard.slice(0, 3);

  return (
    <section className="space-y-4">
      <article className="surface-card rounded-[24px] p-3.5 sm:rounded-[30px] sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3 sm:gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-brand/10 px-2.5 py-1 text-[10px] font-semibold text-brand sm:px-3 sm:py-1.5 sm:text-xs">
                {room.status}
              </span>
              <span className="rounded-full bg-app-secondary px-2.5 py-1 text-[10px] font-semibold text-app-muted sm:px-3 sm:py-1.5 sm:text-xs">
                {room.participantCount}/{room.maxPlayers} players
              </span>
              <span className="rounded-full bg-app-secondary px-2.5 py-1 text-[10px] font-semibold text-app-muted sm:px-3 sm:py-1.5 sm:text-xs">
                {room.questionCount} rounds
              </span>
              <span className="rounded-full bg-app-secondary px-2.5 py-1 text-[10px] font-semibold text-app-muted sm:px-3 sm:py-1.5 sm:text-xs">
                {room.perQuestionTimeSeconds ? `${room.perQuestionTimeSeconds}s/question` : "default question timers"}
              </span>
            </div>
            <h2 className="mt-3 font-display text-[1.2rem] font-semibold tracking-tight text-app-text sm:text-[1.5rem]">
              {room.title}
            </h2>
            <p className="mt-2 text-[13px] leading-5 text-app-muted sm:text-sm sm:leading-6">
              Invite code <strong>{room.inviteCode}</strong>
              {room.host?.username ? ` • host @${room.host.username}` : ""}. One shared timer keeps everyone synced.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={onCopyInvite}
              className={compactSecondaryButtonClassName}
              aria-label="Copy invite link"
            >
              <Copy className="h-4 w-4" />
              <span className="hidden sm:inline">Copy invite</span>
            </button>
            {viewer.canStart ? (
              <button
                type="button"
                onClick={onStartRoom}
                disabled={roomActionBusy}
                className={compactPrimaryButtonClassName}
              >
                {roomActionBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                <span className="sm:hidden">Start</span>
                <span className="hidden sm:inline">Start battle</span>
              </button>
            ) : null}
            {signedIn ? (
              <button type="button" onClick={onLeaveRoom} className={compactSecondaryButtonClassName}>
                <DoorOpen className="h-4 w-4" />
                <span className="sm:hidden">Leave</span>
                <span className="hidden sm:inline">Leave room</span>
              </button>
            ) : null}
          </div>
        </div>

        <div className="mt-3 grid gap-2.5 sm:mt-4 sm:gap-3 lg:grid-cols-[minmax(0,1fr)_300px]">
          <div className="rounded-[20px] border border-app-border bg-app-secondary/25 p-3.5 sm:rounded-[24px] sm:p-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-app-muted sm:text-xs">Invite link</p>
            <p className="mt-2 break-all text-[13px] text-app-text sm:text-sm">{activeRoomInviteLink || buildBugFixInviteLink(room.inviteCode)}</p>
          </div>

          <div className="rounded-[20px] border border-app-border bg-app-secondary/25 p-3.5 sm:rounded-[24px] sm:p-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-app-muted sm:text-xs">Live status</p>
            <p className="mt-2 text-[13px] text-app-text sm:text-sm">
              {room.status === "waiting"
                ? "Waiting for the host to launch."
                : room.status === "countdown"
                  ? `Countdown live • ${formatCountdownLabel(activeCountdownMs || 0)}`
                  : room.status === "running"
                    ? roomState.timeline.allPlayersSubmitted
                      ? `Everyone submitted • next round in ${formatCountdownLabel(roomState.timeline.advanceDelayRemainingMs || 0)}`
                      : `Question ${((roomState.timeline.currentQuestionIndex || 0) + 1).toString().padStart(2, "0")} is active`
                    : "Result locked in"}
            </p>
          </div>
        </div>
      </article>

      {room.status === "completed" ? (
        <BugFixMultiplayerResultsPanel
          leaderboard={leaderboard}
          resultShareBusy={resultShareBusy}
          room={room}
          shareDiscussionKind={shareDiscussionKind}
          sharePreviewNote={sharePreviewNote}
          sharePreviewTitle={sharePreviewTitle}
          topThree={topThree}
          viewerResult={viewer.result}
          onShareDiscussionKindChange={onShareDiscussionKindChange}
          onShareResult={onShareResult}
        />
      ) : (
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
          <article className="surface-card rounded-[24px] p-3.5 sm:rounded-[30px] sm:p-5">
            {room.status === "waiting" ? (
              <div className="rounded-[22px] border border-dashed border-app-border bg-app-secondary/20 px-4 py-10 text-center sm:rounded-[26px] sm:px-5 sm:py-12">
                <Radio className="mx-auto h-9 w-9 text-brand sm:h-10 sm:w-10" />
                <p className="mt-4 font-display text-xl font-semibold text-app-text sm:text-2xl">Room ready</p>
                <p className="mx-auto mt-2 max-w-2xl text-[13px] leading-5 text-app-muted sm:text-sm sm:leading-6">
                  Players can still join. The host starts one shared countdown for everyone.
                </p>
              </div>
            ) : room.status === "countdown" ? (
              <div className="rounded-[22px] border border-brand/20 bg-brand/10 px-4 py-12 text-center sm:rounded-[26px] sm:px-5 sm:py-14">
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-brand sm:text-[11px]">Starting battle</p>
                <p className="mt-4 font-display text-5xl font-semibold tracking-tight text-app-text sm:text-6xl">
                  {Math.max(0, Math.ceil((activeCountdownMs || 0) / 1000))}
                </p>
                <p className="mt-3 text-[13px] text-app-muted sm:text-sm">Everyone launches together.</p>
              </div>
            ) : room.status === "running" && activeQuestion ? (
              <div className="space-y-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-brand/10 px-2.5 py-1 text-[10px] font-semibold text-brand sm:px-3 sm:py-1.5 sm:text-xs">
                        {activeQuestion.language}
                      </span>
                      <span className="rounded-full bg-app-secondary px-2.5 py-1 text-[10px] font-semibold text-app-muted sm:px-3 sm:py-1.5 sm:text-xs">
                        {activeQuestion.difficulty}
                      </span>
                      <span className="rounded-full bg-app-secondary px-2.5 py-1 text-[10px] font-semibold text-app-muted sm:px-3 sm:py-1.5 sm:text-xs">
                        {activeQuestion.points} pts
                      </span>
                      <span className="rounded-full bg-app-secondary px-2.5 py-1 text-[10px] font-semibold text-app-muted sm:px-3 sm:py-1.5 sm:text-xs">
                        {activeQuestion.timeLimitSeconds}s timer
                      </span>
                    </div>
                    <h3 className="mt-3 text-lg font-semibold tracking-tight text-app-text sm:text-xl">{activeQuestion.title}</h3>
                    <p className="mt-2 whitespace-pre-wrap text-[13px] leading-5 text-app-muted sm:text-sm sm:leading-6">
                      {activeQuestion.prompt}
                    </p>
                  </div>

                  <div className="w-full rounded-[20px] border border-app-border bg-app-secondary/45 px-3.5 py-3 text-[13px] sm:w-auto sm:rounded-[24px] sm:px-4 sm:text-sm">
                    <p className="font-semibold text-app-text">
                      {formatCountdownLabel(roomState.timeline.currentQuestionRemainingMs)}
                    </p>
                    <p className="mt-1 text-[11px] text-app-muted sm:text-xs">
                      Question {(activeQuestion.questionIndex + 1).toString().padStart(2, "0")} of {room.questionCount}
                    </p>
                    {roomState.timeline.allPlayersSubmitted ? (
                      <p className="mt-2 text-[10px] font-medium text-brand sm:text-[11px]">
                        Everyone locked in. Moving in {formatCountdownLabel(roomState.timeline.advanceDelayRemainingMs || 0)}.
                      </p>
                    ) : null}
                  </div>
                </div>

                <div className="overflow-hidden rounded-[20px] border border-app-border bg-[#020617] shadow-[0_24px_64px_-44px_rgba(2,6,23,0.9)] sm:rounded-[26px]">
                  <Editor
                    height="50vh"
                    theme="vs-dark"
                    language={resolveMonacoLanguage(activeQuestion.language)}
                    value={editorCode}
                    onChange={(value) => onChangeEditorCode(value || "")}
                    options={{
                      minimap: { enabled: false },
                      fontSize: 14,
                      scrollBeyondLastLine: false,
                      wordWrap: "on",
                      padding: { top: 18, bottom: 18 },
                    }}
                  />
                </div>

                {activeQuestion.referencePdfUrl ? (
                  <PdfInlineViewer url={activeQuestion.referencePdfUrl} name={activeQuestion.referencePdfName || activeQuestion.title} />
                ) : null}

                <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
                  <button
                    type="button"
                    onClick={onSubmitAnswer}
                    disabled={!viewer.canSubmit || submittingAnswer}
                    className={`${compactPrimaryButtonClassName} w-full sm:w-auto`}
                  >
                    {submittingAnswer ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                    <span className="sm:hidden">
                      {submittingAnswer ? "Sending..." : viewer.hasSubmittedCurrentQuestion ? "Done" : "Submit"}
                    </span>
                    <span className="hidden sm:inline">
                      {submittingAnswer ? "Submitting..." : viewer.hasSubmittedCurrentQuestion ? "Submitted" : "Submit fix"}
                    </span>
                  </button>
                  <span className="rounded-full bg-app-secondary px-3 py-1.5 text-[11px] text-app-muted sm:py-2 sm:text-xs">
                    One submission per question. Next round opens automatically.
                  </span>
                </div>

                {roomState.timeline.allPlayersSubmitted ? (
                  <div className="rounded-[18px] border border-brand/20 bg-brand/10 px-3.5 py-3 text-[13px] text-brand sm:rounded-[20px] sm:px-4 sm:text-sm">
                    Everyone has submitted this question. The room auto-advances in{" "}
                    {formatCountdownLabel(roomState.timeline.advanceDelayRemainingMs || 0)} even if the full timer is longer.
                  </div>
                ) : null}

                {submissionFeedback ? (
                  <div
                    className={`rounded-[20px] border px-3.5 py-3.5 text-[13px] sm:rounded-[24px] sm:px-4 sm:py-4 sm:text-sm ${
                      submissionFeedback.isCorrect
                        ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-700"
                        : "border-rose-500/20 bg-rose-500/10 text-rose-700"
                    }`}
                  >
                    <p className="font-semibold">
                      {submissionFeedback.isCorrect ? "Fix accepted" : "Fix not accepted"}
                    </p>
                    <p className="mt-2 leading-5 sm:leading-6">
                      {submissionFeedback.isCorrect
                        ? `You locked in ${submissionFeedback.earnedPoints} points for ${submissionFeedback.question?.title || "this question"}.`
                        : "Review the server result and prepare for the next timed question."}
                    </p>

                    {submissionFeedback.scoreBreakdown ? (
                      <div className="mt-3 flex flex-wrap gap-2 text-[11px] sm:text-xs">
                        <span className="rounded-full bg-white/70 px-3 py-1.5">
                          Base {submissionFeedback.scoreBreakdown.basePoints}
                        </span>
                        <span className="rounded-full bg-white/70 px-3 py-1.5">
                          Speed +{submissionFeedback.scoreBreakdown.speedBonus}
                        </span>
                        <span className="rounded-full bg-white/70 px-3 py-1.5">
                          Streak +{submissionFeedback.scoreBreakdown.streakBonus}
                        </span>
                      </div>
                    ) : null}

                    {submissionFeedback.reviewDetails ? (
                      <div className="mt-3 rounded-[18px] border border-current/15 bg-white/50 p-3 text-[11px] leading-5 text-current sm:mt-4 sm:rounded-[20px] sm:p-4 sm:text-xs sm:leading-6">
                        <pre className="whitespace-pre-wrap">{submissionFeedback.reviewDetails}</pre>
                      </div>
                    ) : null}

                    {submissionFeedback.question?.solutionCode ? (
                      <div className="mt-3 rounded-[18px] border border-current/15 bg-slate-950/90 p-3 text-[11px] leading-5 text-sky-100 sm:mt-4 sm:rounded-[20px] sm:p-4 sm:text-xs sm:leading-6">
                        <pre className="whitespace-pre-wrap">{submissionFeedback.question.solutionCode}</pre>
                      </div>
                    ) : null}

                    {submissionFeedback.question?.explanation ? (
                      <p className="mt-3 leading-5 text-current/90 sm:mt-4 sm:leading-6">{submissionFeedback.question.explanation}</p>
                    ) : null}
                  </div>
                ) : null}
              </div>
            ) : (
              <div className="rounded-[22px] border border-emerald-500/20 bg-emerald-500/10 px-4 py-8 sm:rounded-[26px] sm:px-5 sm:py-10">
                <div className="flex items-center gap-3">
                  <div className="rounded-[18px] bg-white/50 p-2.5 text-emerald-700 sm:rounded-2xl sm:p-3">
                    <Trophy className="h-4 w-4 sm:h-5 sm:w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-emerald-800">Battle complete</p>
                    <p className="mt-1 text-[11px] text-emerald-700/80 sm:text-xs">The result is locked and ready to share.</p>
                  </div>
                </div>
              </div>
            )}
          </article>

          <aside className="space-y-4">
            <article className="surface-card rounded-[24px] p-3.5 sm:rounded-[30px] sm:p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-app-text">Live leaderboard</p>
                  <p className="mt-1 text-[11px] text-app-muted sm:text-xs">Score, speed, and streak decide the winner.</p>
                </div>
                <span className="rounded-full bg-app-secondary px-2.5 py-1 text-[10px] font-semibold text-app-muted sm:px-3 sm:py-1.5 sm:text-xs">
                  {leaderboard.length} players
                </span>
              </div>

              <div className="mt-3 space-y-2.5 sm:mt-4 sm:space-y-3">
                {leaderboard.map((entry) => (
                  <div key={entry.userId} className="rounded-[18px] border border-app-border bg-app-secondary/20 px-3.5 py-3 sm:rounded-[22px] sm:px-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-[13px] font-semibold text-app-text sm:text-sm">
                          #{entry.rankPosition} {entry.profile?.full_name || entry.profile?.username || "Player"}
                        </p>
                        <p className="mt-1 text-[11px] text-app-muted sm:text-xs">
                          {entry.correctCount} correct • {formatDurationLabel(entry.totalTimeMs)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-[13px] font-semibold text-app-text sm:text-sm">{entry.score} pts</p>
                        <p className="mt-1 text-[10px] text-app-muted sm:text-[11px]">{entry.status}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </article>

            <article className="surface-card rounded-[24px] p-3.5 sm:rounded-[30px] sm:p-5">
              <p className="text-sm font-semibold text-app-text">Players in room</p>
              <div className="mt-3 space-y-2.5 sm:mt-4 sm:space-y-3">
                {participants.map((participant) => (
                  <div key={participant.userId} className="flex items-center justify-between gap-3 rounded-[18px] border border-app-border bg-app-secondary/20 px-3.5 py-3 sm:rounded-[20px] sm:px-4">
                    <div className="min-w-0">
                      <p className="truncate text-[13px] font-semibold text-app-text sm:text-sm">
                        {participant.profile?.full_name || participant.profile?.username || "Player"}
                      </p>
                      <p className="mt-1 text-[11px] text-app-muted sm:text-xs">
                        {participant.submissionCount} submissions • {participant.status}
                      </p>
                    </div>
                    {room.host?.id === participant.userId ? (
                      <span className="rounded-full bg-brand/10 px-2.5 py-1 text-[10px] font-semibold text-brand sm:text-[11px]">
                        Host
                      </span>
                    ) : null}
                  </div>
                ))}
              </div>
            </article>
          </aside>
        </div>
      )}
    </section>
  );
}

function BugFixMultiplayerResultsPanel({
  leaderboard,
  resultShareBusy,
  room,
  shareDiscussionKind,
  sharePreviewNote,
  sharePreviewTitle,
  topThree,
  viewerResult,
  onShareDiscussionKindChange,
  onShareResult,
}: {
  leaderboard: BugFixMultiplayerRoomState["leaderboard"];
  resultShareBusy: boolean;
  room: BugFixMultiplayerRoomState["room"];
  shareDiscussionKind: DiscussionKind;
  sharePreviewNote: string;
  sharePreviewTitle: string;
  topThree: BugFixMultiplayerRoomState["leaderboard"];
  viewerResult: BugFixMultiplayerRoomState["viewer"]["result"];
  onShareDiscussionKindChange: (kind: DiscussionKind) => void;
  onShareResult: () => void;
}) {
  const winner = leaderboard[0] || null;
  const shareOptions: DiscussionKind[] = ["study", "job", "anonymous"];

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
      <article className="surface-card overflow-hidden rounded-[24px] sm:rounded-[30px]">
        <div className="bg-[radial-gradient(circle_at_top,rgba(37,99,235,0.18),transparent_45%),linear-gradient(180deg,#f8fbff,rgba(255,255,255,0.96))] px-4 py-5 sm:px-5 sm:py-6">
          <div className="flex flex-wrap items-start justify-between gap-3 sm:gap-4">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-brand sm:text-[11px]">Arena result</p>
              <h3 className="mt-2 font-display text-[1.35rem] font-semibold tracking-tight text-app-text sm:text-[1.8rem]">
                {winner?.profile?.full_name || winner?.profile?.username || "Winner"} wins {room.title}
              </h3>
              <p className="mt-2 text-[13px] leading-5 text-app-muted sm:text-sm sm:leading-6">
                Ranking uses points first, then correct fixes, then total time used.
              </p>
            </div>

            {viewerResult ? (
              <div className="rounded-[20px] border border-app-border bg-white/80 px-3.5 py-3 text-right shadow-sm sm:rounded-[26px] sm:px-4 sm:py-4">
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-app-muted sm:text-[11px]">Finish</p>
                <p className="mt-2 text-[1.9rem] font-semibold text-app-text sm:text-3xl">#{viewerResult.rankPosition}</p>
                <p className="mt-1 text-[13px] text-app-muted sm:text-sm">
                  {viewerResult.score} pts • {viewerResult.correctCount} correct
                </p>
              </div>
            ) : null}
          </div>

          <div className="mt-4 grid gap-2.5 sm:mt-6 sm:gap-3 md:grid-cols-3">
            {topThree.map((entry, index) => (
              <div
                key={entry.userId}
                className={`rounded-[20px] border px-3.5 py-3.5 sm:rounded-[24px] sm:px-4 sm:py-4 ${
                  index === 0 ? "border-brand/25 bg-brand/10" : "border-app-border bg-white/70"
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-app-card px-2.5 py-1 text-[10px] font-semibold text-app-text sm:text-[11px]">
                    #{entry.rankPosition}
                  </span>
                  {index === 0 ? <Crown className="h-4 w-4 text-brand" /> : null}
                </div>
                <p className="mt-3 truncate text-base font-semibold text-app-text sm:text-lg">
                  {entry.profile?.full_name || entry.profile?.username || "Player"}
                </p>
                <p className="mt-2 text-[13px] text-app-muted sm:text-sm">
                  {entry.score} pts • {entry.correctCount} correct • {formatDurationLabel(entry.totalTimeMs)}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="px-4 py-4 sm:px-5 sm:py-5">
          <div className="space-y-2.5 sm:space-y-3">
            {leaderboard.map((entry) => (
              <div key={entry.userId} className="rounded-[18px] border border-app-border bg-app-secondary/20 px-3.5 py-3 sm:rounded-[22px] sm:px-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-[13px] font-semibold text-app-text sm:text-sm">
                      #{entry.rankPosition} {entry.profile?.full_name || entry.profile?.username || "Player"}
                    </p>
                    <p className="mt-1 text-[11px] text-app-muted sm:text-xs">
                      {entry.correctCount} correct • {entry.answeredCount} submitted • {formatDurationLabel(entry.totalTimeMs)}
                    </p>
                  </div>
                  <span className="rounded-full bg-app-card px-3 py-1.5 text-[11px] font-semibold text-app-text sm:text-xs">
                    {entry.score} pts
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </article>

      <article className="surface-card rounded-[24px] p-3.5 sm:rounded-[30px] sm:p-5">
        <p className="text-sm font-semibold text-app-text">Share locked result</p>
        <p className="mt-1 text-[11px] text-app-muted sm:text-xs">Choose the discussion and publish this result snapshot.</p>

        <div className="mt-3 space-y-2.5 sm:mt-4 sm:space-y-3">
          <div className="grid grid-cols-3 gap-2">
            {shareOptions.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => onShareDiscussionKindChange(option)}
                className={`rounded-[14px] border px-2.5 py-2.5 text-center text-[11px] font-semibold transition sm:rounded-[16px] sm:px-3 sm:py-3 sm:text-xs ${
                  shareDiscussionKind === option
                    ? "border-brand/30 bg-brand text-white"
                    : "border-app-border bg-app-secondary/20 text-app-text"
                }`}
              >
                {discussionKindLabels[option]}
              </button>
            ))}
          </div>

          <div className="rounded-[18px] border border-app-border bg-app-secondary/20 p-3.5 sm:rounded-[22px] sm:p-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-app-muted sm:text-[11px]">Post preview</p>
            <p className="mt-3 text-[13px] font-semibold text-app-text sm:text-sm">{sharePreviewTitle}</p>
            <p className="mt-2 text-[13px] leading-5 text-app-muted sm:text-sm sm:leading-6">{sharePreviewNote}</p>
            <div className="mt-3 flex flex-wrap gap-2 text-[10px] text-app-muted sm:text-[11px]">
              <span className="rounded-full bg-white px-2.5 py-1">Snapshot</span>
              <span className="rounded-full bg-white px-2.5 py-1">Locked</span>
              <span className="rounded-full bg-white px-2.5 py-1">{discussionKindLabels[shareDiscussionKind]}</span>
            </div>
          </div>

          <button
            type="button"
            onClick={onShareResult}
            disabled={resultShareBusy}
            className={`${compactPrimaryButtonClassName} w-full !py-3`}
          >
            {resultShareBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Share2 className="h-4 w-4" />}
            <span className="sm:hidden">{resultShareBusy ? "Sharing..." : "Share to feed"}</span>
            <span className="hidden sm:inline">{resultShareBusy ? "Sharing result..." : "Share to Feed"}</span>
          </button>
        </div>
      </article>
    </div>
  );
}
