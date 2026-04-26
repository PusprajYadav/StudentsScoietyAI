import type { ResumeDocument, ResumeRecord } from "./types";
import { clampResumePageCount, normalizeResumeDocument } from "./utils";

const DB_NAME_PREFIX = "student-society-resume-drafts";
const DB_VERSION = 1;
const DRAFT_STORE = "drafts";

interface StoredResumeDraftRow {
  id: string;
  resumeId: string;
  title: string;
  templateKey: ResumeRecord["template_key"];
  isLive: boolean;
  content: ResumeDocument;
  pageCount: number;
  remoteUpdatedAt: string;
  savedAt: string;
}

export interface LocalResumeDraftSnapshot {
  resumeId: string;
  title: string;
  templateKey: ResumeRecord["template_key"];
  isLive: boolean;
  content: ResumeDocument;
  pageCount: number;
  remoteUpdatedAt: string;
  savedAt: string;
}

function requestToPromise<T>(request: IDBRequest<T>) {
  return new Promise<T>((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error("IndexedDB request failed."));
  });
}

function transactionDone(transaction: IDBTransaction) {
  return new Promise<void>((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error || new Error("IndexedDB transaction failed."));
    transaction.onabort = () => reject(transaction.error || new Error("IndexedDB transaction aborted."));
  });
}

function getResumeDraftDbName(ownerId: string) {
  return `${DB_NAME_PREFIX}-${ownerId}`;
}

function getDraftKey(resumeId: string) {
  return `resume:${resumeId}`;
}

function openResumeDraftDb(ownerId: string) {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(getResumeDraftDbName(ownerId), DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;

      if (!db.objectStoreNames.contains(DRAFT_STORE)) {
        const drafts = db.createObjectStore(DRAFT_STORE, { keyPath: "id" });
        drafts.createIndex("bySavedAt", "savedAt", { unique: false });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error("Failed to open resume draft store."));
  });
}

function normalizeDraftRow(value: unknown): LocalResumeDraftSnapshot | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const record = value as Record<string, unknown>;

  const resumeId = typeof record.resumeId === "string" ? record.resumeId : "";
  const title = typeof record.title === "string" ? record.title : "";
  const templateKey = record.templateKey;
  const remoteUpdatedAt = typeof record.remoteUpdatedAt === "string" ? record.remoteUpdatedAt : "";
  const savedAt = typeof record.savedAt === "string" ? record.savedAt : "";

  if (
    !resumeId ||
    (templateKey !== "ats_classic" &&
      templateKey !== "sidebar_professional" &&
      templateKey !== "executive_dark") ||
    !remoteUpdatedAt ||
    !savedAt
  ) {
    return null;
  }

  return {
    resumeId,
    title,
    templateKey,
    isLive: Boolean(record.isLive),
    content: normalizeResumeDocument(record.content),
    pageCount: clampResumePageCount(Number(record.pageCount) || 1),
    remoteUpdatedAt,
    savedAt,
  };
}

export async function loadLocalResumeDraft(ownerId: string, resumeId: string) {
  const db = await openResumeDraftDb(ownerId);
  const transaction = db.transaction(DRAFT_STORE, "readonly");
  const row = (await requestToPromise(
    transaction.objectStore(DRAFT_STORE).get(getDraftKey(resumeId))
  )) as StoredResumeDraftRow | undefined;
  db.close();
  return normalizeDraftRow(row);
}

export async function saveLocalResumeDraft(ownerId: string, draft: LocalResumeDraftSnapshot) {
  const db = await openResumeDraftDb(ownerId);
  const transaction = db.transaction(DRAFT_STORE, "readwrite");

  transaction.objectStore(DRAFT_STORE).put({
    id: getDraftKey(draft.resumeId),
    resumeId: draft.resumeId,
    title: draft.title,
    templateKey: draft.templateKey,
    isLive: draft.isLive,
    content: draft.content,
    pageCount: clampResumePageCount(draft.pageCount),
    remoteUpdatedAt: draft.remoteUpdatedAt,
    savedAt: draft.savedAt,
  } satisfies StoredResumeDraftRow);

  await transactionDone(transaction);
  db.close();
}

export async function clearLocalResumeDraft(ownerId: string, resumeId: string) {
  const db = await openResumeDraftDb(ownerId);
  const transaction = db.transaction(DRAFT_STORE, "readwrite");
  transaction.objectStore(DRAFT_STORE).delete(getDraftKey(resumeId));
  await transactionDone(transaction);
  db.close();
}
