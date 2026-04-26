import { requestBackend } from "./backendApi";
import type {
  BugFixDifficulty,
  BugFixLanguage,
  BugFixQuestionRow,
  BugFixQuestionStatus,
} from "../types/database";

export interface BugFixQuestionFilters {
  includeAll?: boolean;
  language?: BugFixLanguage | "all";
  difficulty?: BugFixDifficulty | "all";
  status?: BugFixQuestionStatus | "all";
  search?: string;
  limit?: number;
  offset?: number;
}

export interface SaveBugFixQuestionInput {
  id?: string;
  title: string;
  language: BugFixLanguage;
  difficulty: BugFixDifficulty;
  prompt: string;
  brokenCode: string;
  solutionCode: string;
  hint?: string | null;
  explanation?: string | null;
  tags: string[];
  timeLimitSeconds: number;
  points: number;
  status: BugFixQuestionStatus;
  pdfFile?: File | null;
  removePdf?: boolean;
}

const BUGFIX_QUESTIONS_PAGE_SIZE = 200;

function normalizeQuestionFilters(filters: BugFixQuestionFilters = {}) {
  const params = new URLSearchParams();

  if (filters.includeAll) {
    params.set("include_all", "true");
  }

  if (filters.language && filters.language !== "all") {
    params.set("language", filters.language);
  }

  if (filters.difficulty && filters.difficulty !== "all") {
    params.set("difficulty", filters.difficulty);
  }

  if (filters.status && filters.status !== "all") {
    params.set("status", filters.status);
  }

  if (filters.search?.trim()) {
    params.set("search", filters.search.trim());
  }

  if (typeof filters.limit === "number") {
    params.set("limit", String(filters.limit));
  }

  if (typeof filters.offset === "number") {
    params.set("offset", String(filters.offset));
  }

  return params;
}

export async function listBugFixQuestions(
  filters: BugFixQuestionFilters = {}
): Promise<BugFixQuestionRow[]> {
  const params = normalizeQuestionFilters(filters);
  const query = params.toString();
  const payload = await requestBackend<{ questions: BugFixQuestionRow[] }>(
    `/bugfix/questions${query ? `?${query}` : ""}`,
    {
      auth: filters.includeAll ? "required" : "optional",
      featureName: "BugFix",
    }
  );

  return payload.questions || [];
}

export async function listAllBugFixQuestions(
  filters: Omit<BugFixQuestionFilters, "limit" | "offset"> = {}
): Promise<BugFixQuestionRow[]> {
  const questions: BugFixQuestionRow[] = [];
  const seenIds = new Set<string>();
  let offset = 0;

  while (true) {
    const batch = await listBugFixQuestions({
      ...filters,
      limit: BUGFIX_QUESTIONS_PAGE_SIZE,
      offset,
    });

    batch.forEach((question) => {
      if (seenIds.has(question.id)) {
        return;
      }

      seenIds.add(question.id);
      questions.push(question);
    });

    if (batch.length < BUGFIX_QUESTIONS_PAGE_SIZE) {
      break;
    }

    offset += batch.length;
  }

  return questions;
}

export async function saveBugFixQuestion(input: SaveBugFixQuestionInput): Promise<BugFixQuestionRow> {
  const formData = new FormData();

  if (input.id) {
    formData.append("id", input.id);
  }

  formData.append("title", input.title.trim());
  formData.append("language", input.language);
  formData.append("difficulty", input.difficulty);
  formData.append("prompt", input.prompt.trim());
  formData.append("broken_code", input.brokenCode);
  formData.append("solution_code", input.solutionCode);
  formData.append("hint", input.hint?.trim() || "");
  formData.append("explanation", input.explanation?.trim() || "");
  formData.append("tags", input.tags.join(","));
  formData.append("time_limit_seconds", String(input.timeLimitSeconds));
  formData.append("points", String(input.points));
  formData.append("status", input.status);
  formData.append("remove_pdf", input.removePdf ? "true" : "false");

  if (input.pdfFile) {
    formData.append("reference_pdf", input.pdfFile);
  }

  const payload = await requestBackend<{ question: BugFixQuestionRow }>("/bugfix/questions", {
    method: "POST",
    body: formData,
    auth: "required",
    featureName: "BugFix",
  });

  return payload.question;
}

export async function deleteBugFixQuestion(questionId: string) {
  await requestBackend(`/bugfix/questions/${encodeURIComponent(questionId)}`, {
    method: "DELETE",
    auth: "required",
    featureName: "BugFix",
  });
}
