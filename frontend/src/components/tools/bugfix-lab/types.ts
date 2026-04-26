import type { BugFixDifficulty, BugFixLanguage, ProfileRow } from "../../../types/database";

export type ReviewState = "correct" | "incorrect" | "timeout" | null;
export type PracticePhase = "idle" | "running" | "review" | "finished";
export type ValidationMode = "judge0" | "text";
export type BugFixPlayMode = "solo" | "multiplayer";
export type BugFixMultiplayerRoomStatus = "waiting" | "countdown" | "running" | "completed" | "cancelled";
export type BugFixMultiplayerParticipantStatus = "joined" | "finished" | "left";

export interface AttemptResult {
  questionId: string;
  title: string;
  result: Exclude<ReviewState, null>;
  earnedPoints: number;
}

export interface BugFixFilterOption<T extends string> {
  value: T | "all";
  label: string;
}

export type BugFixLanguageFilter = BugFixLanguage | "all";
export type BugFixDifficultyFilter = BugFixDifficulty | "all";

export interface BugFixMultiplayerProfilePreview {
  id: string;
  username: string;
  full_name: string;
  avatar_url: string | null;
}

export interface BugFixMultiplayerRoomSummary {
  id: string;
  title: string;
  inviteCode: string;
  language: BugFixLanguage | null;
  difficulty: BugFixDifficulty | null;
  roundSize: number;
  perQuestionTimeSeconds: number | null;
  maxPlayers: number;
  countdownSeconds: number;
  participantCount: number;
  status: BugFixMultiplayerRoomStatus;
  questionCount: number;
  countdownRemainingSeconds: number | null;
  startedAt: string | null;
  endedAt: string | null;
  createdAt: string;
  updatedAt: string;
  host: BugFixMultiplayerProfilePreview | null;
  viewerIsParticipant: boolean;
  joinable: boolean;
}

export interface BugFixMultiplayerQuestionSummary {
  id: string;
  title: string;
  language: BugFixLanguage;
  difficulty: BugFixDifficulty;
  timeLimitSeconds: number;
  points: number;
  questionIndex: number;
}

export interface BugFixMultiplayerActiveQuestion extends BugFixMultiplayerQuestionSummary {
  prompt: string;
  brokenCode: string;
  hint: string | null;
  tags: string[];
  referencePdfUrl: string | null;
  referencePdfName: string | null;
}

export interface BugFixMultiplayerLeaderboardEntry {
  userId: string;
  profile: BugFixMultiplayerProfilePreview | null;
  score: number;
  correctCount: number;
  answeredCount: number;
  totalTimeMs: number;
  status: BugFixMultiplayerParticipantStatus;
  joinedAt: string;
  isHost: boolean;
  rankPosition: number;
}

export interface BugFixMultiplayerParticipantEntry {
  userId: string;
  status: BugFixMultiplayerParticipantStatus;
  joinedAt: string;
  finishedAt: string | null;
  latestSeenAt: string;
  submissionCount: number;
  profile: BugFixMultiplayerProfilePreview | null;
}

export interface BugFixMultiplayerTimeline {
  phase: BugFixMultiplayerRoomStatus | "running";
  currentQuestionIndex: number | null;
  currentQuestionRemainingMs: number;
  countdownRemainingSeconds: number | null;
  allPlayersSubmitted: boolean;
  advanceDelayRemainingMs: number | null;
  countdownStartedAt?: string | null;
}

export interface BugFixMultiplayerViewerState {
  id: string | null;
  isHost: boolean;
  isParticipant: boolean;
  canJoin: boolean;
  canStart: boolean;
  canSubmit: boolean;
  hasSubmittedCurrentQuestion: boolean;
  result: BugFixMultiplayerLeaderboardEntry | null;
}

export interface BugFixMultiplayerRoomState {
  room: BugFixMultiplayerRoomSummary & {
    status: BugFixMultiplayerRoomStatus;
    startedAt: string | null;
    endedAt: string | null;
    countdownStartedAt: string | null;
    winnerUserId: string | null;
    host: BugFixMultiplayerProfilePreview | null;
  };
  questions: BugFixMultiplayerQuestionSummary[];
  activeQuestion: BugFixMultiplayerActiveQuestion | null;
  leaderboard: BugFixMultiplayerLeaderboardEntry[];
  participants: BugFixMultiplayerParticipantEntry[];
  timeline: BugFixMultiplayerTimeline;
  viewer: BugFixMultiplayerViewerState;
  serverNow: string;
}

export interface BugFixMultiplayerScoreBreakdown {
  basePoints: number;
  speedBonus: number;
  streakBonus: number;
  earnedPoints: number;
}

export interface BugFixMultiplayerSubmissionResponse {
  alreadySubmitted: boolean;
  submission: {
    id: string;
    isCorrect: boolean;
    earnedPoints: number;
    remainingMs: number;
    timeUsedMs: number;
    validationMode: string;
    reviewDetails: string | null;
    createdAt: string;
    scoreBreakdown?: BugFixMultiplayerScoreBreakdown;
    question?: {
      id: string;
      title: string;
      explanation: string | null;
      solutionCode: string;
    };
  };
  room: BugFixMultiplayerRoomState;
}

export interface BugFixBattleHistoryRecord {
  id: string;
  roomId: string;
  roomTitle: string;
  shareSlug: string | null;
  createdAt: string;
  status: BugFixMultiplayerRoomStatus;
  participantCount: number;
  questionCount: number;
  rankPosition: number;
  score: number;
  correctCount: number;
  totalTimeMs: number;
  leaderboard: BugFixMultiplayerLeaderboardEntry[];
  owner: BugFixMultiplayerProfilePreview | null;
}

export interface BugFixResultShareRecord {
  id: string;
  owner_id: string;
  room_id: string | null;
  title: string;
  summary_text: string | null;
  snapshot: {
    version: 1;
    room: {
      id: string;
      title: string;
      language: BugFixLanguage | null;
      difficulty: BugFixDifficulty | null;
      roundSize: number;
      perQuestionTimeSeconds: number | null;
      participantCount: number;
      startedAt: string | null;
      endedAt: string | null;
    };
    owner: BugFixMultiplayerProfilePreview | null;
    playerResult: BugFixMultiplayerLeaderboardEntry;
    leaderboard: BugFixMultiplayerLeaderboardEntry[];
    questions: BugFixMultiplayerQuestionSummary[];
  };
  share_slug: string;
  room_title: string;
  winner_user_id: string | null;
  participant_count: number;
  total_questions: number;
  final_score: number;
  rank_position: number;
  created_at: string;
  updated_at: string;
  owner: Pick<ProfileRow, "id" | "username" | "full_name" | "avatar_url"> | null;
}
