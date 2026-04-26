import type { PortfolioDocument, PortfolioRecord, PortfolioTheme } from "./types";
import { normalizePortfolioDocument, normalizeTheme } from "./utils";

const DB_NAME_PREFIX = "student-society-portfolio-drafts";
const DB_VERSION = 1;
const DRAFT_STORE = "drafts";

interface StoredPortfolioDraftRow {
  id: string;
  portfolioId: string;
  title: string;
  templateKey: PortfolioRecord["template_key"];
  isLive: boolean;
  content: PortfolioDocument;
  theme: PortfolioTheme;
  remoteUpdatedAt: string;
  savedAt: string;
}

export interface LocalPortfolioDraftSnapshot {
  portfolioId: string;
  title: string;
  templateKey: PortfolioRecord["template_key"];
  isLive: boolean;
  content: PortfolioDocument;
  theme: PortfolioTheme;
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

function getPortfolioDraftDbName(ownerId: string) {
  return `${DB_NAME_PREFIX}-${ownerId}`;
}

function getDraftKey(portfolioId: string) {
  return `portfolio:${portfolioId}`;
}

function openPortfolioDraftDb(ownerId: string) {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(getPortfolioDraftDbName(ownerId), DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;

      if (!db.objectStoreNames.contains(DRAFT_STORE)) {
        const drafts = db.createObjectStore(DRAFT_STORE, { keyPath: "id" });
        drafts.createIndex("bySavedAt", "savedAt", { unique: false });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error("Failed to open portfolio draft store."));
  });
}

function normalizeDraftRow(value: unknown): LocalPortfolioDraftSnapshot | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const record = value as Record<string, unknown>;

  const portfolioId = typeof record.portfolioId === "string" ? record.portfolioId : "";
  const title = typeof record.title === "string" ? record.title : "";
  const templateKey = record.templateKey;
  const remoteUpdatedAt = typeof record.remoteUpdatedAt === "string" ? record.remoteUpdatedAt : "";
  const savedAt = typeof record.savedAt === "string" ? record.savedAt : "";

  if (
    !portfolioId ||
    (templateKey !== "minimal_hero" && templateKey !== "bold_cards" && templateKey !== "creative_timeline") ||
    !remoteUpdatedAt ||
    !savedAt
  ) {
    return null;
  }

  return {
    portfolioId,
    title,
    templateKey,
    isLive: Boolean(record.isLive),
    content: normalizePortfolioDocument(record.content),
    theme: normalizeTheme(record.theme, templateKey),
    remoteUpdatedAt,
    savedAt,
  };
}

export async function loadLocalPortfolioDraft(ownerId: string, portfolioId: string) {
  const db = await openPortfolioDraftDb(ownerId);
  const transaction = db.transaction(DRAFT_STORE, "readonly");
  const row = (await requestToPromise(
    transaction.objectStore(DRAFT_STORE).get(getDraftKey(portfolioId))
  )) as StoredPortfolioDraftRow | undefined;
  db.close();
  return normalizeDraftRow(row);
}

export async function saveLocalPortfolioDraft(ownerId: string, draft: LocalPortfolioDraftSnapshot) {
  const db = await openPortfolioDraftDb(ownerId);
  const transaction = db.transaction(DRAFT_STORE, "readwrite");

  transaction.objectStore(DRAFT_STORE).put({
    id: getDraftKey(draft.portfolioId),
    portfolioId: draft.portfolioId,
    title: draft.title,
    templateKey: draft.templateKey,
    isLive: draft.isLive,
    content: draft.content,
    theme: draft.theme,
    remoteUpdatedAt: draft.remoteUpdatedAt,
    savedAt: draft.savedAt,
  } satisfies StoredPortfolioDraftRow);

  await transactionDone(transaction);
  db.close();
}

export async function clearLocalPortfolioDraft(ownerId: string, portfolioId: string) {
  const db = await openPortfolioDraftDb(ownerId);
  const transaction = db.transaction(DRAFT_STORE, "readwrite");
  transaction.objectStore(DRAFT_STORE).delete(getDraftKey(portfolioId));
  await transactionDone(transaction);
  db.close();
}
