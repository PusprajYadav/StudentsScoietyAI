import { getCachedPublicBugFixResult } from "./cache";
import { requestBackend } from "./backendApi";
import type {
  BugFixResultShareRecord,
  BugFixMultiplayerRoomState,
  BugFixMultiplayerRoomSummary,
  BugFixMultiplayerSubmissionResponse,
} from "../components/tools/bugfix-lab/types";
import type { BugFixDifficulty, BugFixLanguage } from "../types/database";

function normalizeRoomState(value: unknown): BugFixMultiplayerRoomState {
  return value as BugFixMultiplayerRoomState;
}

function normalizeRoomSummary(value: unknown): BugFixMultiplayerRoomSummary {
  return value as BugFixMultiplayerRoomSummary;
}

function normalizeSubmissionResponse(value: unknown): BugFixMultiplayerSubmissionResponse {
  return value as BugFixMultiplayerSubmissionResponse;
}

function normalizeResultShareRecord(value: unknown): BugFixResultShareRecord {
  return value as BugFixResultShareRecord;
}

export async function listBugFixMultiplayerRooms() {
  const data = await requestBackend<{ rooms: BugFixMultiplayerRoomSummary[] }>("/bugfix/rooms/public", {
    auth: "optional",
    featureName: "BugFix multiplayer",
  });

  return (data.rooms || []).map((entry) => normalizeRoomSummary(entry));
}

export async function createBugFixMultiplayerRoom(input: {
  title: string;
  language?: BugFixLanguage | "all";
  difficulty?: BugFixDifficulty | "all";
  roundSize: number;
  perQuestionTimeSeconds?: number | null;
  maxPlayers: number;
  countdownSeconds: number;
  isPublic: boolean;
}) {
  const data = await requestBackend<{ state: BugFixMultiplayerRoomState }>("/bugfix/rooms", {
    method: "POST",
    body: {
      title: input.title,
      language: input.language === "all" ? null : input.language || null,
      difficulty: input.difficulty === "all" ? null : input.difficulty || null,
      round_size: input.roundSize,
      per_question_time_seconds: input.perQuestionTimeSeconds || null,
      max_players: input.maxPlayers,
      countdown_seconds: input.countdownSeconds,
      is_public: input.isPublic,
    },
    auth: "required",
    featureName: "BugFix multiplayer",
  });

  return normalizeRoomState(data.state);
}

export async function loadBugFixMultiplayerRoomState(input: { roomId?: string | null; inviteCode?: string | null }) {
  const query = new URLSearchParams();

  if (input.roomId) {
    query.set("room_id", input.roomId);
  }

  if (input.inviteCode) {
    query.set("invite_code", input.inviteCode);
  }

  const data = await requestBackend<{ state: BugFixMultiplayerRoomState }>(
    `/bugfix/rooms/state?${query.toString()}`,
    {
      auth: "optional",
      featureName: "BugFix multiplayer",
    }
  );
  return normalizeRoomState(data.state);
}

export async function joinBugFixMultiplayerRoom(input: { roomId?: string | null; inviteCode?: string | null }) {
  const data = await requestBackend<{ state: BugFixMultiplayerRoomState }>("/bugfix/rooms/join", {
    method: "POST",
    body: {
      room_id: input.roomId || undefined,
      invite_code: input.inviteCode || undefined,
    },
    auth: "required",
    featureName: "BugFix multiplayer",
  });

  return normalizeRoomState(data.state);
}

export async function leaveBugFixMultiplayerRoom(roomId: string) {
  return requestBackend<{ room: BugFixMultiplayerRoomSummary; left: boolean }>("/bugfix/rooms/leave", {
    method: "POST",
    body: {
      room_id: roomId,
    },
    auth: "required",
    featureName: "BugFix multiplayer",
  });
}

export async function startBugFixMultiplayerRoom(roomId: string) {
  const data = await requestBackend<{ state: BugFixMultiplayerRoomState }>("/bugfix/rooms/start", {
    method: "POST",
    body: {
      room_id: roomId,
    },
    auth: "required",
    featureName: "BugFix multiplayer",
  });

  return normalizeRoomState(data.state);
}

export async function submitBugFixMultiplayerAnswer(input: {
  roomId: string;
  questionIndex: number;
  sourceCode: string;
}) {
  const data = await requestBackend<BugFixMultiplayerSubmissionResponse>("/bugfix/rooms/submit", {
    method: "POST",
    body: {
      room_id: input.roomId,
      question_index: input.questionIndex,
      source_code: input.sourceCode,
    },
    auth: "required",
    featureName: "BugFix multiplayer",
  });

  return normalizeSubmissionResponse(data);
}

export async function shareBugFixMultiplayerResult(input: {
  roomId: string;
  title: string;
  summaryText?: string;
}) {
  const data = await requestBackend<{ share: BugFixResultShareRecord }>("/bugfix/rooms/share", {
    method: "POST",
    body: {
      room_id: input.roomId,
      title: input.title,
      summary_text: input.summaryText || "",
    },
    auth: "required",
    featureName: "BugFix multiplayer",
  });

  return normalizeResultShareRecord(data.share);
}

export async function loadPublicBugFixResultShare(shareSlug: string, options?: { preferFresh?: boolean }) {
  if (!shareSlug) {
    throw new Error("Missing BugFix result share link.");
  }

  if (!options?.preferFresh) {
    const cached = await getCachedPublicBugFixResult(shareSlug);
    if (cached) {
      return normalizeResultShareRecord(cached);
    }
  }

  const data = await requestBackend<BugFixResultShareRecord>(
    `/public/bugfix-results/${encodeURIComponent(shareSlug)}`,
    {
      auth: "none",
      featureName: "BugFix share",
    }
  );
  return normalizeResultShareRecord(data);
}
