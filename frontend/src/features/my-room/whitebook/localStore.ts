import type { WhitebookNotebook } from "./types";
import { normalizeWhitebookNotebook } from "./utils";

const DB_NAME = "student-society-whitebook-notebooks";
const DB_VERSION = 1;
const NOTEBOOK_STORE = "notebooks";

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

function openWhitebookDb() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;

      if (!db.objectStoreNames.contains(NOTEBOOK_STORE)) {
        const store = db.createObjectStore(NOTEBOOK_STORE, { keyPath: "id" });
        store.createIndex("byUpdatedAt", "updatedAt", { unique: false });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error("Failed to open the WhiteBook notebook store."));
  });
}

export async function listLocalWhitebookNotebooks() {
  const db = await openWhitebookDb();
  const transaction = db.transaction(NOTEBOOK_STORE, "readonly");
  const rows = (await requestToPromise(
    transaction.objectStore(NOTEBOOK_STORE).getAll()
  )) as unknown[];
  db.close();

  return rows
    .map((row) => normalizeWhitebookNotebook(row))
    .sort((left, right) => Date.parse(right.updatedAt) - Date.parse(left.updatedAt));
}

export async function loadLocalWhitebookNotebook(notebookId: string) {
  const db = await openWhitebookDb();
  const transaction = db.transaction(NOTEBOOK_STORE, "readonly");
  const row = await requestToPromise(transaction.objectStore(NOTEBOOK_STORE).get(notebookId));
  db.close();
  return row ? normalizeWhitebookNotebook(row) : null;
}

export async function saveLocalWhitebookNotebook(notebook: WhitebookNotebook) {
  const db = await openWhitebookDb();
  const transaction = db.transaction(NOTEBOOK_STORE, "readwrite");
  transaction.objectStore(NOTEBOOK_STORE).put(normalizeWhitebookNotebook(notebook));
  await transactionDone(transaction);
  db.close();
}

export async function deleteLocalWhitebookNotebook(notebookId: string) {
  const db = await openWhitebookDb();
  const transaction = db.transaction(NOTEBOOK_STORE, "readwrite");
  transaction.objectStore(NOTEBOOK_STORE).delete(notebookId);
  await transactionDone(transaction);
  db.close();
}
