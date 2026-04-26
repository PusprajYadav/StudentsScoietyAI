import type { StoredBarcodeDraft, StoredCodeDraft, StoredQrDraft } from "./types";

const STORAGE_KEY = "student-society-code-suite-drafts-v1";
const STORAGE_LIMIT = 32;

function loadAllDrafts() {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "[]") as unknown;
    return Array.isArray(parsed) ? (parsed as StoredCodeDraft[]) : [];
  } catch {
    return [] as StoredCodeDraft[];
  }
}

function persistAllDrafts(drafts: StoredCodeDraft[]) {
  window.localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(
      drafts
        .slice()
        .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
        .slice(0, STORAGE_LIMIT)
    )
  );
}

export function loadStoredQrDrafts() {
  return loadAllDrafts().filter((draft): draft is StoredQrDraft => draft.kind === "qr");
}

export function loadStoredBarcodeDrafts() {
  return loadAllDrafts().filter((draft): draft is StoredBarcodeDraft => draft.kind === "barcode");
}

export function saveStoredDraft(nextDraft: StoredCodeDraft) {
  const current = loadAllDrafts().filter((draft) => draft.id !== nextDraft.id);
  persistAllDrafts([nextDraft, ...current]);
}

export function deleteStoredDraft(draftId: string) {
  persistAllDrafts(loadAllDrafts().filter((draft) => draft.id !== draftId));
}
