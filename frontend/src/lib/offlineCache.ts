export interface OfflineCacheEntryRecord<T = unknown> {
  id: string;
  namespace: string;
  value: T;
  updatedAt: string;
  expiresAt: string | null;
  byteSize: number;
}

export interface OfflineCacheNamespaceSummary {
  namespace: string;
  entryCount: number;
  totalBytes: number;
  latestUpdatedAt: string | null;
}

export interface OfflineCacheSummary {
  supported: boolean;
  entryCount: number;
  totalBytes: number;
  namespaces: OfflineCacheNamespaceSummary[];
  storage: {
    supported: boolean;
    persisted: boolean | null;
    usageBytes: number | null;
    quotaBytes: number | null;
  };
}

const DB_NAME = "student-society-offline-cache";
const DB_VERSION = 1;
const ENTRY_STORE = "entries";
const NAMESPACE_INDEX = "byNamespace";
const UPDATED_AT_INDEX = "byUpdatedAt";

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

function isOfflineCacheSupported() {
  return typeof indexedDB !== "undefined";
}

function calculateByteSize(value: unknown) {
  try {
    const serialized = JSON.stringify(value);

    if (!serialized) {
      return 0;
    }

    if (typeof Blob !== "undefined") {
      return new Blob([serialized]).size;
    }

    return serialized.length;
  } catch {
    return 0;
  }
}

function openOfflineCacheDb() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    if (!isOfflineCacheSupported()) {
      reject(new Error("IndexedDB is not available on this device."));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;

      if (!db.objectStoreNames.contains(ENTRY_STORE)) {
        const store = db.createObjectStore(ENTRY_STORE, { keyPath: "id" });
        store.createIndex(NAMESPACE_INDEX, "namespace", { unique: false });
        store.createIndex(UPDATED_AT_INDEX, "updatedAt", { unique: false });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error("Failed to open offline cache database."));
  });
}

async function getAllEntries() {
  if (!isOfflineCacheSupported()) {
    return [] as OfflineCacheEntryRecord[];
  }

  const db = await openOfflineCacheDb();
  const transaction = db.transaction(ENTRY_STORE, "readonly");
  const entries = (await requestToPromise(
    transaction.objectStore(ENTRY_STORE).getAll()
  )) as OfflineCacheEntryRecord[];
  db.close();
  return entries;
}

export async function readOfflineCacheValue<T>(
  key: string,
  options: { allowStale?: boolean } = {}
): Promise<T | null> {
  if (!isOfflineCacheSupported()) {
    return null;
  }

  const db = await openOfflineCacheDb();
  const transaction = db.transaction(ENTRY_STORE, "readonly");
  const entry = (await requestToPromise(
    transaction.objectStore(ENTRY_STORE).get(key)
  )) as OfflineCacheEntryRecord<T> | undefined;
  db.close();

  if (!entry) {
    return null;
  }

  if (!options.allowStale && entry.expiresAt) {
    const expiresAt = Date.parse(entry.expiresAt);

    if (Number.isFinite(expiresAt) && expiresAt <= Date.now()) {
      return null;
    }
  }

  return entry.value ?? null;
}

export async function writeOfflineCacheValue<T>(
  key: string,
  namespace: string,
  value: T,
  options: { ttlMs?: number | null } = {}
) {
  if (!isOfflineCacheSupported()) {
    return;
  }

  const now = Date.now();
  const db = await openOfflineCacheDb();
  const transaction = db.transaction(ENTRY_STORE, "readwrite");
  transaction.objectStore(ENTRY_STORE).put({
    id: key,
    namespace,
    value,
    updatedAt: new Date(now).toISOString(),
    expiresAt:
      typeof options.ttlMs === "number" && Number.isFinite(options.ttlMs) && options.ttlMs > 0
        ? new Date(now + options.ttlMs).toISOString()
        : null,
    byteSize: calculateByteSize(value),
  } satisfies OfflineCacheEntryRecord<T>);
  await transactionDone(transaction);
  db.close();
}

export async function deleteOfflineCacheValue(key: string) {
  if (!isOfflineCacheSupported()) {
    return;
  }

  const db = await openOfflineCacheDb();
  const transaction = db.transaction(ENTRY_STORE, "readwrite");
  transaction.objectStore(ENTRY_STORE).delete(key);
  await transactionDone(transaction);
  db.close();
}

async function clearEntriesMatchingNamespace(
  transaction: IDBTransaction,
  namespaces: Set<string>
) {
  const store = transaction.objectStore(ENTRY_STORE);
  const index = store.index(NAMESPACE_INDEX);
  const keysToDelete = new Set<string>();

  for (const namespace of namespaces) {
    const request = index.openCursor(IDBKeyRange.only(namespace));

    await new Promise<void>((resolve, reject) => {
      request.onsuccess = () => {
        const cursor = request.result;

        if (!cursor) {
          resolve();
          return;
        }

        keysToDelete.add(String(cursor.primaryKey));
        cursor.continue();
      };

      request.onerror = () => reject(request.error || new Error("Failed to iterate offline cache entries."));
    });
  }

  keysToDelete.forEach((key) => store.delete(key));
  return keysToDelete.size;
}

export async function clearOfflineCache(namespaces?: string | string[]) {
  if (!isOfflineCacheSupported()) {
    return 0;
  }

  const normalizedNamespaces = Array.isArray(namespaces)
    ? Array.from(new Set(namespaces.filter(Boolean)))
    : namespaces
      ? [namespaces]
      : [];
  const db = await openOfflineCacheDb();
  const transaction = db.transaction(ENTRY_STORE, "readwrite");
  let clearedCount = 0;

  if (normalizedNamespaces.length === 0) {
    const store = transaction.objectStore(ENTRY_STORE);
    const existingKeys = await requestToPromise(store.getAllKeys());
    clearedCount = existingKeys.length;
    store.clear();
  } else {
    clearedCount = await clearEntriesMatchingNamespace(transaction, new Set(normalizedNamespaces));
  }

  await transactionDone(transaction);
  db.close();
  return clearedCount;
}

export async function getOfflineCacheSummary(): Promise<OfflineCacheSummary> {
  if (!isOfflineCacheSupported()) {
    return {
      supported: false,
      entryCount: 0,
      totalBytes: 0,
      namespaces: [],
      storage: {
        supported: typeof navigator !== "undefined" && "storage" in navigator,
        persisted: null,
        usageBytes: null,
        quotaBytes: null,
      },
    };
  }

  const entries = await getAllEntries();
  const namespaces = new Map<string, OfflineCacheNamespaceSummary>();

  entries.forEach((entry) => {
    const current = namespaces.get(entry.namespace) || {
      namespace: entry.namespace,
      entryCount: 0,
      totalBytes: 0,
      latestUpdatedAt: null,
    };

    current.entryCount += 1;
    current.totalBytes += entry.byteSize || 0;

    if (!current.latestUpdatedAt || current.latestUpdatedAt < entry.updatedAt) {
      current.latestUpdatedAt = entry.updatedAt;
    }

    namespaces.set(entry.namespace, current);
  });

  const storageSupported = typeof navigator !== "undefined" && Boolean(navigator.storage);
  const storageEstimate =
    storageSupported && typeof navigator.storage.estimate === "function"
      ? await navigator.storage.estimate().catch(() => null)
      : null;
  const persisted =
    storageSupported && typeof navigator.storage.persisted === "function"
      ? await navigator.storage.persisted().catch(() => null)
      : null;

  return {
    supported: true,
    entryCount: entries.length,
    totalBytes: entries.reduce((sum, entry) => sum + (entry.byteSize || 0), 0),
    namespaces: Array.from(namespaces.values()).sort((left, right) => left.namespace.localeCompare(right.namespace)),
    storage: {
      supported: storageSupported,
      persisted,
      usageBytes: typeof storageEstimate?.usage === "number" ? storageEstimate.usage : null,
      quotaBytes: typeof storageEstimate?.quota === "number" ? storageEstimate.quota : null,
    },
  };
}

export async function requestPersistentOfflineStorage() {
  if (typeof navigator === "undefined" || !navigator.storage || typeof navigator.storage.persist !== "function") {
    return false;
  }

  return navigator.storage.persist().catch(() => false);
}
