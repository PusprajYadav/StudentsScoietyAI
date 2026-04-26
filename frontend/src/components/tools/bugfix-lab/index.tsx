import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import { useLocation, useNavigate } from "react-router-dom";
import { buildAuthRedirectPath } from "../../../lib/authRedirect";
import { listAllBugFixQuestions } from "../../../lib/bugfixApi";
import { createPost } from "../../../lib/api";
import {
  createBugFixMultiplayerRoom,
  joinBugFixMultiplayerRoom,
  leaveBugFixMultiplayerRoom,
  listBugFixMultiplayerRooms,
  loadBugFixMultiplayerRoomState,
  shareBugFixMultiplayerResult,
  startBugFixMultiplayerRoom,
  submitBugFixMultiplayerAnswer,
} from "../../../lib/bugfixMultiplayerApi";
import {
  executeJudge0Submission,
  executionResultsMatch,
  fetchJudge0LanguageOptions,
  formatJudge0ExecutionResult,
  isJudge0ExecutableLanguage,
  type Judge0ExecutionResult,
  type Judge0LanguageOption,
} from "../../../lib/judge0";
import { SYSTEM_SHARE_TAG_BUGFIX_RESULT } from "../../../lib/shareSystem";
import { useAuthStore } from "../../../store/authStore";
import type { BugFixQuestionRow, DiscussionKind } from "../../../types/database";
import {
  buildBugFixInviteLink,
  buildPublicBugFixResultUrl,
  calculateAccuracy,
  normalizeSource,
  shuffleQuestions,
} from "./helpers";
import { loadLocalBugFixBattleHistory, upsertLocalBugFixBattleHistory } from "./localStore";
import {
  BugFixModeSwitcher,
  BugFixMultiplayerLobbyPanel,
  BugFixMultiplayerRoomPanel,
} from "./multiplayerPanels";
import {
  BugFixActiveQuestionPanel,
  BugFixEmptyStatePanel,
  BugFixLabHeader,
  BugFixQuestionDeckPanel,
  BugFixRoundSummaryPanel,
  BugFixSessionPanel,
} from "./panels";
import type {
  AttemptResult,
  BugFixBattleHistoryRecord,
  BugFixDifficultyFilter,
  BugFixLanguageFilter,
  BugFixMultiplayerRoomState,
  BugFixMultiplayerRoomSummary,
  BugFixMultiplayerSubmissionResponse,
  BugFixPlayMode,
  PracticePhase,
  ReviewState,
  ValidationMode,
} from "./types";

export function BugFixLabApp({ showTitleBlock = true }: { showTitleBlock?: boolean }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, profile } = useAuthStore();
  const authRedirectPath = useMemo(() => buildAuthRedirectPath(location), [location]);
  const queryRoomCode = useMemo(() => new URLSearchParams(location.search).get("room")?.trim().toUpperCase() || "", [location.search]);

  const [questions, setQuestions] = useState<BugFixQuestionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [languageFilter, setLanguageFilter] = useState<BugFixLanguageFilter>("all");
  const [difficultyFilter, setDifficultyFilter] = useState<BugFixDifficultyFilter>("all");
  const [roundSize, setRoundSize] = useState(5);
  const [sessionQuestions, setSessionQuestions] = useState<BugFixQuestionRow[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [editorCode, setEditorCode] = useState("");
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [score, setScore] = useState(0);
  const [showHint, setShowHint] = useState(false);
  const [reviewState, setReviewState] = useState<ReviewState>(null);
  const [phase, setPhase] = useState<PracticePhase>("idle");
  const [attempts, setAttempts] = useState<AttemptResult[]>([]);
  const [judge0Languages, setJudge0Languages] = useState<Judge0LanguageOption[]>([]);
  const [checkingAnswer, setCheckingAnswer] = useState(false);
  const [validationMode, setValidationMode] = useState<ValidationMode>("text");
  const [reviewDetails, setReviewDetails] = useState<string | null>(null);
  const [playMode, setPlayMode] = useState<BugFixPlayMode>(queryRoomCode ? "multiplayer" : "solo");
  const [publicRooms, setPublicRooms] = useState<BugFixMultiplayerRoomSummary[]>([]);
  const [loadingPublicRooms, setLoadingPublicRooms] = useState(false);
  const [roomCreateBusy, setRoomCreateBusy] = useState(false);
  const [roomActionBusy, setRoomActionBusy] = useState(false);
  const [submittingBattleAnswer, setSubmittingBattleAnswer] = useState(false);
  const [resultShareBusy, setResultShareBusy] = useState(false);
  const [currentRoomState, setCurrentRoomState] = useState<BugFixMultiplayerRoomState | null>(null);
  const [battleEditorCode, setBattleEditorCode] = useState("");
  const [battleSubmissionFeedback, setBattleSubmissionFeedback] = useState<BugFixMultiplayerSubmissionResponse["submission"] | null>(null);
  const [battleHistory, setBattleHistory] = useState<BugFixBattleHistoryRecord[]>([]);
  const [roomJoinCode, setRoomJoinCode] = useState(queryRoomCode);
  const [shareDiscussionKind, setShareDiscussionKind] = useState<DiscussionKind>("study");
  const [roomDraft, setRoomDraft] = useState({
    title: "BugFix Arena",
    language: "all" as BugFixLanguageFilter,
    difficulty: "all" as BugFixDifficultyFilter,
    roundSize: 5,
    perQuestionTimeSeconds: null as number | null,
    maxPlayers: 8,
    countdownSeconds: 5,
    isPublic: true,
  });
  const [liveClockMs, setLiveClockMs] = useState(Date.now());
  const solutionResultCacheRef = useRef<Record<string, Judge0ExecutionResult>>({});
  const multiplayerQuestionKeyRef = useRef<string>("");
  const attemptedRoomCodesRef = useRef<Set<string>>(new Set());
  const savedRoomResultsRef = useRef<Set<string>>(new Set());

  const activeQuestion = sessionQuestions[currentIndex] || null;
  const judge0LanguageMap = useMemo(
    () => new Map(judge0Languages.map((entry) => [entry.key, entry])),
    [judge0Languages]
  );

  const filteredQuestions = useMemo(
    () =>
      questions.filter((question) => {
        if (languageFilter !== "all" && question.language !== languageFilter) {
          return false;
        }

        if (difficultyFilter !== "all" && question.difficulty !== difficultyFilter) {
          return false;
        }

        return true;
      }),
    [difficultyFilter, languageFilter, questions]
  );

  const activeRoomInviteLink = useMemo(
    () => (currentRoomState ? buildBugFixInviteLink(currentRoomState.room.inviteCode) : ""),
    [currentRoomState]
  );

  const activeCountdownMs = useMemo(() => {
    if (!currentRoomState || currentRoomState.room.status !== "countdown" || !currentRoomState.room.startedAt) {
      return null;
    }

    return Math.max(0, new Date(currentRoomState.room.startedAt).getTime() - liveClockMs);
  }, [currentRoomState, liveClockMs]);

  const battleSharePreview = useMemo(() => {
    if (!currentRoomState) {
      return {
        title: "",
        note: "",
      };
    }

    const viewerResult = currentRoomState.viewer.result;
    const winner = currentRoomState.leaderboard[0] || null;
    const roomTitle = currentRoomState.room.title;
    const winnerName = winner?.profile?.full_name || winner?.profile?.username || "Winner";

    return {
      title: `BugFix Arena Result: ${roomTitle}`,
      note: viewerResult
        ? `Finished ${roomTitle} at #${viewerResult.rankPosition} with ${viewerResult.score} pts and ${viewerResult.correctCount} correct fixes. ${winnerName} won the room.`
        : `Finished ${roomTitle}. ${winnerName} won the room.`,
    };
  }, [currentRoomState]);

  const canUseMultiplayer = Boolean(user);

  const refreshPublicRooms = useCallback(async () => {
    setLoadingPublicRooms(true);

    try {
      const rooms = await listBugFixMultiplayerRooms();
      setPublicRooms(rooms);
    } catch (loadError) {
      toast.error(loadError instanceof Error ? loadError.message : "Could not load multiplayer rooms.");
    } finally {
      setLoadingPublicRooms(false);
    }
  }, []);

  const refreshCurrentRoomState = useCallback(
    async (input?: { roomId?: string | null; inviteCode?: string | null }) => {
      const targetRoomId = input?.roomId || currentRoomState?.room.id || null;
      const targetInviteCode = input?.inviteCode || (!targetRoomId ? queryRoomCode : null);

      if (!targetRoomId && !targetInviteCode) {
        return;
      }

      try {
        const state = await loadBugFixMultiplayerRoomState({
          roomId: targetRoomId,
          inviteCode: targetInviteCode,
        });
        setCurrentRoomState(state);
      } catch (loadError) {
        toast.error(loadError instanceof Error ? loadError.message : "Could not refresh this multiplayer room.");
      }
    },
    [currentRoomState?.room.id, queryRoomCode]
  );

  useEffect(() => {
    setBattleHistory(loadLocalBugFixBattleHistory());
  }, []);

  useEffect(() => {
    let cancelled = false;

    void fetchJudge0LanguageOptions()
      .then((data) => {
        if (!cancelled) {
          setJudge0Languages(data);
        }
      })
      .catch((loadError) => {
        if (!cancelled) {
          console.warn("Judge0 language catalog could not be loaded for BugFix Lab.", loadError);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadQuestions() {
      setLoading(true);
      setError(null);

      try {
        const data = await listAllBugFixQuestions();

        if (!cancelled) {
          setQuestions(data);
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "Could not load BugFix questions.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadQuestions();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    void refreshPublicRooms();
  }, [refreshPublicRooms]);

  useEffect(() => {
    if (!queryRoomCode) {
      return;
    }

    setPlayMode("multiplayer");
    setRoomJoinCode(queryRoomCode);

    if (!user) {
      navigate(authRedirectPath, { replace: true });
      return;
    }

    if (attemptedRoomCodesRef.current.has(queryRoomCode)) {
      return;
    }

    attemptedRoomCodesRef.current.add(queryRoomCode);
    setRoomActionBusy(true);

    void joinBugFixMultiplayerRoom({ inviteCode: queryRoomCode })
      .then((state) => {
        setCurrentRoomState(state);
      })
      .catch((joinError) => {
        toast.error(joinError instanceof Error ? joinError.message : "Could not join this BugFix room.");
      })
      .finally(() => {
        setRoomActionBusy(false);
      });
  }, [authRedirectPath, navigate, queryRoomCode, user]);

  useEffect(() => {
    if (!currentRoomState?.room.id) {
      return;
    }

    const status = currentRoomState.room.status;
    if (status === "completed" || status === "cancelled") {
      return;
    }

    const timer = window.setInterval(() => {
      void refreshCurrentRoomState({ roomId: currentRoomState.room.id });
    }, 2500);

    return () => {
      window.clearInterval(timer);
    };
  }, [currentRoomState?.room.id, currentRoomState?.room.status, refreshCurrentRoomState]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setLiveClockMs(Date.now());
    }, 1000);

    return () => {
      window.clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    if (phase !== "running" || checkingAnswer || !activeQuestion) {
      return;
    }

    if (remainingSeconds <= 0) {
      setAttempts((current) => [
        ...current,
        {
          questionId: activeQuestion.id,
          title: activeQuestion.title,
          result: "timeout",
          earnedPoints: 0,
        },
      ]);
      setReviewState("timeout");
      setPhase("review");
      return;
    }

    const timer = window.setTimeout(() => {
      setRemainingSeconds((current) => current - 1);
    }, 1000);

    return () => {
      window.clearTimeout(timer);
    };
  }, [activeQuestion, checkingAnswer, phase, remainingSeconds]);

  useEffect(() => {
    const activeBattleQuestion = currentRoomState?.activeQuestion;

    if (!activeBattleQuestion) {
      multiplayerQuestionKeyRef.current = "";
      return;
    }

    const nextQuestionKey = `${currentRoomState?.room.id}:${activeBattleQuestion.questionIndex}:${activeBattleQuestion.id}`;

    if (multiplayerQuestionKeyRef.current !== nextQuestionKey) {
      multiplayerQuestionKeyRef.current = nextQuestionKey;
      setBattleEditorCode(activeBattleQuestion.brokenCode);
      setBattleSubmissionFeedback(null);
    }
  }, [currentRoomState?.activeQuestion, currentRoomState?.room.id]);

  useEffect(() => {
    if (currentRoomState?.room.status !== "completed" || !currentRoomState.viewer.result || !currentRoomState.room.id) {
      return;
    }

    if (savedRoomResultsRef.current.has(currentRoomState.room.id)) {
      return;
    }

    savedRoomResultsRef.current.add(currentRoomState.room.id);

    const nextHistory = upsertLocalBugFixBattleHistory({
      id: currentRoomState.room.id,
      roomId: currentRoomState.room.id,
      roomTitle: currentRoomState.room.title,
      shareSlug: null,
      createdAt: new Date().toISOString(),
      status: currentRoomState.room.status,
      participantCount: currentRoomState.leaderboard.length,
      questionCount: currentRoomState.questions.length,
      rankPosition: currentRoomState.viewer.result.rankPosition,
      score: currentRoomState.viewer.result.score,
      correctCount: currentRoomState.viewer.result.correctCount,
      totalTimeMs: currentRoomState.viewer.result.totalTimeMs,
      leaderboard: currentRoomState.leaderboard,
      owner: currentRoomState.viewer.result.profile,
    });

    setBattleHistory(nextHistory);
  }, [currentRoomState]);

  function loadQuestion(index: number, nextSessionQuestions = sessionQuestions) {
    const question = nextSessionQuestions[index];

    if (!question) {
      setPhase("finished");
      setReviewState(null);
      return;
    }

    setCurrentIndex(index);
    setEditorCode(question.broken_code);
    setRemainingSeconds(question.time_limit_seconds);
    setShowHint(false);
    setReviewState(null);
    setReviewDetails(null);
    setValidationMode("text");
    setPhase("running");
  }

  function beginPractice() {
    if (!filteredQuestions.length) {
      toast.error("No BugFix questions match this filter.");
      return;
    }

    const nextSessionQuestions = shuffleQuestions(filteredQuestions).slice(0, Math.min(roundSize, filteredQuestions.length));

    setSessionQuestions(nextSessionQuestions);
    setAttempts([]);
    setScore(0);
    solutionResultCacheRef.current = {};
    loadQuestion(0, nextSessionQuestions);
  }

  async function refreshQuestions() {
    setLoading(true);
    setError(null);

    try {
      const data = await listAllBugFixQuestions();
      setQuestions(data);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Could not refresh questions.");
    } finally {
      setLoading(false);
    }
  }

  async function submitAnswer() {
    if (!activeQuestion || phase !== "running") {
      return;
    }

    setCheckingAnswer(true);

    try {
      const canUseJudge0 =
        isJudge0ExecutableLanguage(activeQuestion.language) && judge0LanguageMap.has(activeQuestion.language);

      let isCorrect = false;
      let nextValidationMode: ValidationMode = "text";
      let details: string | null = null;

      if (canUseJudge0) {
        nextValidationMode = "judge0";
        const language = judge0LanguageMap.get(activeQuestion.language)!;

        const expectedResult =
          solutionResultCacheRef.current[activeQuestion.id] ||
          (await executeJudge0Submission({
            languageId: language.languageId,
            sourceCode: activeQuestion.solution_code,
          }));

        solutionResultCacheRef.current[activeQuestion.id] = expectedResult;

        const actualResult = await executeJudge0Submission({
          languageId: language.languageId,
          sourceCode: editorCode,
        });

        isCorrect = executionResultsMatch(actualResult, expectedResult);
        details = isCorrect
          ? `Reviewed with Judge0 CE\n\n${formatJudge0ExecutionResult(actualResult)}`
          : [
              "Reviewed with Judge0 CE",
              "Your execution",
              formatJudge0ExecutionResult(actualResult),
              "Expected execution",
              formatJudge0ExecutionResult(expectedResult),
            ].join("\n\n");
      } else {
        isCorrect = normalizeSource(editorCode) === normalizeSource(activeQuestion.solution_code);
        details = isJudge0ExecutableLanguage(activeQuestion.language)
          ? "Judge0 validation was not available for this language in the current session, so BugFix Lab used source comparison for this check."
          : "This language is reviewed with source comparison because it is not executable on the shared Judge0 runtime.";
      }

      const earnedPoints = isCorrect ? activeQuestion.points + Math.max(remainingSeconds, 0) : 0;

      setAttempts((current) => [
        ...current,
        {
          questionId: activeQuestion.id,
          title: activeQuestion.title,
          result: isCorrect ? "correct" : "incorrect",
          earnedPoints,
        },
      ]);

      if (isCorrect) {
        setScore((current) => current + earnedPoints);
      }

      setValidationMode(nextValidationMode);
      setReviewDetails(details);
      setReviewState(isCorrect ? "correct" : "incorrect");
      setPhase("review");
    } catch (submitError) {
      const message = submitError instanceof Error ? submitError.message : "BugFix validation failed.";
      toast.error(message);
    } finally {
      setCheckingAnswer(false);
    }
  }

  function moveToNextQuestion() {
    const nextIndex = currentIndex + 1;

    if (nextIndex >= sessionQuestions.length) {
      setPhase("finished");
      setReviewState(null);
      return;
    }

    loadQuestion(nextIndex);
  }

  async function handleCreateRoom() {
    if (!user) {
      navigate(authRedirectPath);
      return;
    }

    setRoomCreateBusy(true);

    try {
      const state = await createBugFixMultiplayerRoom({
        title: roomDraft.title.trim() || "BugFix Arena",
        language: roomDraft.language,
        difficulty: roomDraft.difficulty,
        roundSize: roomDraft.roundSize,
        perQuestionTimeSeconds: roomDraft.perQuestionTimeSeconds,
        maxPlayers: roomDraft.maxPlayers,
        countdownSeconds: roomDraft.countdownSeconds,
        isPublic: roomDraft.isPublic,
      });

      setCurrentRoomState(state);
      setPlayMode("multiplayer");
      setRoomJoinCode(state.room.inviteCode);
      toast.success("BugFix multiplayer room created.");
      void refreshPublicRooms();
    } catch (createError) {
      toast.error(createError instanceof Error ? createError.message : "Could not create this BugFix room.");
    } finally {
      setRoomCreateBusy(false);
    }
  }

  async function handleJoinByCode(code = roomJoinCode) {
    if (!user) {
      navigate(authRedirectPath);
      return;
    }

    const normalizedCode = code.trim().toUpperCase();
    if (!normalizedCode) {
      toast.error("Enter a room code first.");
      return;
    }

    setRoomActionBusy(true);

    try {
      const state = await joinBugFixMultiplayerRoom({ inviteCode: normalizedCode });
      setCurrentRoomState(state);
      setRoomJoinCode(normalizedCode);
      setPlayMode("multiplayer");
      toast.success("Joined BugFix multiplayer room.");
    } catch (joinError) {
      toast.error(joinError instanceof Error ? joinError.message : "Could not join this BugFix room.");
    } finally {
      setRoomActionBusy(false);
    }
  }

  async function handleJoinRoom(room: BugFixMultiplayerRoomSummary) {
    if (room.joinable) {
      await handleJoinByCode(room.inviteCode);
      return;
    }

    try {
      const state = await loadBugFixMultiplayerRoomState({ roomId: room.id });
      setCurrentRoomState(state);
      setPlayMode("multiplayer");
    } catch (loadError) {
      toast.error(loadError instanceof Error ? loadError.message : "Could not open this BugFix room.");
    }
  }

  async function handleLeaveRoom() {
    if (!currentRoomState?.room.id) {
      return;
    }

    setRoomActionBusy(true);

    try {
      await leaveBugFixMultiplayerRoom(currentRoomState.room.id);
      setCurrentRoomState(null);
      setBattleSubmissionFeedback(null);
      setBattleEditorCode("");
      const params = new URLSearchParams(location.search);
      params.delete("room");
      navigate(`${location.pathname}${params.toString() ? `?${params.toString()}` : ""}`, { replace: true });
      void refreshPublicRooms();
    } catch (leaveError) {
      toast.error(leaveError instanceof Error ? leaveError.message : "Could not leave this BugFix room.");
    } finally {
      setRoomActionBusy(false);
    }
  }

  async function handleStartRoom() {
    if (!currentRoomState?.room.id) {
      return;
    }

    setRoomActionBusy(true);

    try {
      const state = await startBugFixMultiplayerRoom(currentRoomState.room.id);
      setCurrentRoomState(state);
      toast.success("BugFix battle countdown started.");
    } catch (startError) {
      toast.error(startError instanceof Error ? startError.message : "Could not start this BugFix room.");
    } finally {
      setRoomActionBusy(false);
    }
  }

  async function handleSubmitBattleAnswer() {
    if (!currentRoomState?.room.id || currentRoomState.room.status !== "running" || !currentRoomState.activeQuestion) {
      return;
    }

    setSubmittingBattleAnswer(true);

    try {
      const response = await submitBugFixMultiplayerAnswer({
        roomId: currentRoomState.room.id,
        questionIndex: currentRoomState.activeQuestion.questionIndex,
        sourceCode: battleEditorCode,
      });

      setCurrentRoomState(response.room);
      setBattleSubmissionFeedback(response.submission);

      if (response.submission.isCorrect) {
        toast.success(`Correct fix. +${response.submission.earnedPoints} pts`);
      } else {
        toast.error("Fix did not match the expected solution.");
      }
    } catch (submitError) {
      toast.error(submitError instanceof Error ? submitError.message : "Could not submit this BugFix answer.");
    } finally {
      setSubmittingBattleAnswer(false);
    }
  }

  async function handleShareBattleResult() {
    if (!currentRoomState?.room.id || !user || !profile || currentRoomState.room.status !== "completed") {
      toast.error("Complete a BugFix multiplayer room first.");
      return;
    }

    setResultShareBusy(true);

    try {
      const share = await shareBugFixMultiplayerResult({
        roomId: currentRoomState.room.id,
        title: battleSharePreview.title,
        summaryText: battleSharePreview.note,
      });

      await createPost({
        authorId: user.id,
        visibilityScope: "discussion",
        discussionKind: shareDiscussionKind,
        title: share.title,
        content: battleSharePreview.note,
        tags: [SYSTEM_SHARE_TAG_BUGFIX_RESULT, "bugfix", "multiplayer"],
        linkUrl: buildPublicBugFixResultUrl(share.share_slug, profile.username),
        isAnonymous: shareDiscussionKind === "anonymous",
      });

      const updatedHistory = upsertLocalBugFixBattleHistory({
        id: currentRoomState.room.id,
        roomId: currentRoomState.room.id,
        roomTitle: currentRoomState.room.title,
        shareSlug: share.share_slug,
        createdAt: new Date().toISOString(),
        status: currentRoomState.room.status,
        participantCount: currentRoomState.leaderboard.length,
        questionCount: currentRoomState.questions.length,
        rankPosition: currentRoomState.viewer.result?.rankPosition || 1,
        score: currentRoomState.viewer.result?.score || 0,
        correctCount: currentRoomState.viewer.result?.correctCount || 0,
        totalTimeMs: currentRoomState.viewer.result?.totalTimeMs || 0,
        leaderboard: currentRoomState.leaderboard,
        owner: currentRoomState.viewer.result?.profile || null,
      });
      setBattleHistory(updatedHistory);
      toast.success("BugFix multiplayer result shared to feed.");
    } catch (shareError) {
      toast.error(shareError instanceof Error ? shareError.message : "Could not share this BugFix result.");
    } finally {
      setResultShareBusy(false);
    }
  }

  const accuracy = calculateAccuracy(attempts);

  return (
    <div className="space-y-3 sm:space-y-4">
      <BugFixLabHeader showTitleBlock={showTitleBlock} questionCount={questions.length} />
      <BugFixModeSwitcher mode={playMode} onChange={setPlayMode} />

      {playMode === "multiplayer" ? (
        currentRoomState ? (
          <BugFixMultiplayerRoomPanel
            activeCountdownMs={activeCountdownMs}
            activeRoomInviteLink={activeRoomInviteLink}
            editorCode={battleEditorCode}
            resultShareBusy={resultShareBusy}
            roomActionBusy={roomActionBusy}
            roomState={currentRoomState}
            shareDiscussionKind={shareDiscussionKind}
            sharePreviewNote={battleSharePreview.note}
            sharePreviewTitle={battleSharePreview.title}
            signedIn={canUseMultiplayer}
            submissionFeedback={battleSubmissionFeedback}
            submittingAnswer={submittingBattleAnswer}
            onChangeEditorCode={setBattleEditorCode}
            onCopyInvite={async () => {
              try {
                await navigator.clipboard.writeText(activeRoomInviteLink);
                toast.success("Invite link copied.");
              } catch {
                toast.error("Could not copy the invite link.");
              }
            }}
            onLeaveRoom={() => void handleLeaveRoom()}
            onShareResult={() => void handleShareBattleResult()}
            onShareDiscussionKindChange={setShareDiscussionKind}
            onStartRoom={() => void handleStartRoom()}
            onSubmitAnswer={() => void handleSubmitBattleAnswer()}
          />
        ) : (
          <BugFixMultiplayerLobbyPanel
            createBusy={roomCreateBusy}
            history={battleHistory}
            joinCode={roomJoinCode}
            loadingRooms={loadingPublicRooms}
            publicRooms={publicRooms}
            roomDraft={roomDraft}
            signedIn={canUseMultiplayer}
            onChangeJoinCode={setRoomJoinCode}
            onCreateRoom={() => void handleCreateRoom()}
            onJoinByCode={() => void handleJoinByCode()}
            onJoinRoom={(room) => void handleJoinRoom(room)}
            onRoomDraftChange={(updates) => setRoomDraft((current) => ({ ...current, ...updates }))}
          />
        )
      ) : (
        <section className="grid gap-3 sm:gap-4 xl:grid-cols-[minmax(0,1.45fr)_minmax(320px,0.9fr)]">
          <div className="space-y-3 sm:space-y-4">
            <BugFixQuestionDeckPanel
              difficultyFilter={difficultyFilter}
              error={error}
              filteredCount={filteredQuestions.length}
              languageFilter={languageFilter}
              loading={loading}
              roundSize={roundSize}
              onChangeDifficultyFilter={setDifficultyFilter}
              onChangeLanguageFilter={setLanguageFilter}
              onChangeRoundSize={setRoundSize}
              onRefresh={() => void refreshQuestions()}
              onStartRound={beginPractice}
            />

            {activeQuestion && phase !== "finished" ? (
              <BugFixActiveQuestionPanel
                currentIndex={currentIndex}
                editorCode={editorCode}
                question={activeQuestion}
                sessionLength={sessionQuestions.length}
                onChangeEditorCode={setEditorCode}
              />
            ) : (
              <BugFixEmptyStatePanel />
            )}
          </div>

          <div className="space-y-3 sm:space-y-4">
            <BugFixSessionPanel
              activeQuestion={activeQuestion}
              checkingAnswer={checkingAnswer}
              phase={phase}
              remainingSeconds={remainingSeconds}
              reviewDetails={reviewDetails}
              reviewState={reviewState}
              score={score}
              showHint={showHint}
              validationMode={validationMode}
              onCheckAnswer={() => void submitAnswer()}
              onMoveToNextQuestion={moveToNextQuestion}
              onToggleHint={() => setShowHint((current) => !current)}
            />
            <BugFixRoundSummaryPanel
              accuracy={accuracy}
              attempts={attempts}
              phase={phase}
              roundSize={roundSize}
              sessionQuestionsLength={sessionQuestions.length}
              onPlayAgain={beginPractice}
            />
          </div>
        </section>
      )}
    </div>
  );
}
