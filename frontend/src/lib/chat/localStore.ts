import {
  decryptBytesWithLocalKey,
  decryptJsonWithLocalKey,
  encryptBytesWithLocalKey,
  encryptJsonWithLocalKey,
  exportLocalKeyToString,
  exportPrivateKeyToString,
  exportPublicKeyToString,
  importLocalKeyFromString,
  importPrivateKeyFromString,
  importPublicKeyFromString,
  randomId,
} from "./crypto";
import type {
  ChatPeerProfile,
  LocalChatAttachment,
  LocalChatMessage,
  LocalChatMessagePreview,
  LocalConversationSummary,
} from "./types";

const DB_NAME_PREFIX = "student-society-chat";
const DB_VERSION = 1;
const META_STORE = "meta";
const KEY_STORE = "keys";
const MESSAGE_STORE = "messages";
const ATTACHMENT_STORE = "attachments";
const CONVERSATION_STORE = "conversations";

interface StoredValueRecord<T = unknown> {
  id: string;
  value: T;
}

interface SerializedCryptoKeyRecord {
  format: "jwk-json";
  algorithm: "RSA-OAEP-private" | "RSA-OAEP-public" | "AES-GCM";
  data: string;
}

interface StoredMessageRow {
  id: string;
  conversationId: string;
  clientMessageId: string;
  requestId: string | null;
  senderId: string;
  recipientId: string;
  createdAt: string;
  fromCurrentUser: boolean;
  unread: boolean;
  status: LocalChatMessage["status"];
  messageKind: LocalChatMessage["messageKind"];
  iv: string;
  ciphertext: string;
}

interface StoredAttachmentRow {
  id: string;
  iv: string;
  ciphertext: string;
  kind: LocalChatAttachment["kind"];
  mimeType: string;
  byteSize: number;
  fileName: string | null;
  createdAt: string;
}

type StoredConversationRow = LocalConversationSummary;

const dbPromiseCache = new Map<string, Promise<IDBDatabase>>();

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

function getChatDbName(userId: string) {
  return `${DB_NAME_PREFIX}-${userId}`;
}

export async function resetLocalChatState(userId: string) {
  const openDb = await dbPromiseCache.get(userId)?.catch(() => null);
  openDb?.close();
  dbPromiseCache.delete(userId);

  return new Promise<void>((resolve, reject) => {
    const request = indexedDB.deleteDatabase(getChatDbName(userId));

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error || new Error("Failed to reset local chat storage."));
    request.onblocked = () =>
      reject(new Error("Local chat storage reset was blocked by another open database connection."));
  });
}

function openChatDb(userId: string) {
  const existing = dbPromiseCache.get(userId);

  if (existing) {
    return existing;
  }

  const promise = new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(getChatDbName(userId), DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;

      if (!db.objectStoreNames.contains(META_STORE)) {
        db.createObjectStore(META_STORE, { keyPath: "id" });
      }

      if (!db.objectStoreNames.contains(KEY_STORE)) {
        db.createObjectStore(KEY_STORE, { keyPath: "id" });
      }

      if (!db.objectStoreNames.contains(MESSAGE_STORE)) {
        const messages = db.createObjectStore(MESSAGE_STORE, { keyPath: "id" });
        messages.createIndex("byConversationId", "conversationId", { unique: false });
        messages.createIndex("byConversationCreatedAt", ["conversationId", "createdAt"], {
          unique: false,
        });
        messages.createIndex("byRequestId", "requestId", { unique: false });
        messages.createIndex("byClientMessageId", "clientMessageId", { unique: false });
      }

      if (!db.objectStoreNames.contains(ATTACHMENT_STORE)) {
        db.createObjectStore(ATTACHMENT_STORE, { keyPath: "id" });
      }

      if (!db.objectStoreNames.contains(CONVERSATION_STORE)) {
        db.createObjectStore(CONVERSATION_STORE, { keyPath: "id" });
      }
    };

    request.onsuccess = () => {
      const db = request.result;

      db.onclose = () => {
        if (dbPromiseCache.get(userId) === promise) {
          dbPromiseCache.delete(userId);
        }
      };

      db.onversionchange = () => {
        db.close();
        if (dbPromiseCache.get(userId) === promise) {
          dbPromiseCache.delete(userId);
        }
      };

      resolve(db);
    };
    request.onerror = () => {
      dbPromiseCache.delete(userId);
      reject(request.error || new Error("Failed to open IndexedDB."));
    };
  });

  dbPromiseCache.set(userId, promise);
  return promise;
}

async function getStoredValue<T>(userId: string, storeName: string, id: string) {
  const db = await openChatDb(userId);
  const transaction = db.transaction(storeName, "readonly");
  const store = transaction.objectStore(storeName);
  const record = (await requestToPromise(store.get(id))) as StoredValueRecord<T> | undefined;
  return record?.value ?? null;
}

async function setStoredValue<T>(userId: string, storeName: string, id: string, value: T) {
  const db = await openChatDb(userId);
  const transaction = db.transaction(storeName, "readwrite");
  transaction.objectStore(storeName).put({ id, value } satisfies StoredValueRecord<T>);
  await transactionDone(transaction);
}

async function getAllFromStore<T>(userId: string, storeName: string) {
  const db = await openChatDb(userId);
  const transaction = db.transaction(storeName, "readonly");
  const store = transaction.objectStore(storeName);
  const values = (await requestToPromise(store.getAll())) as T[];
  return values;
}

async function getAllByIndex<T>(
  userId: string,
  storeName: string,
  indexName: string,
  query: IDBValidKey | IDBKeyRange
) {
  const db = await openChatDb(userId);
  const transaction = db.transaction(storeName, "readonly");
  const index = transaction.objectStore(storeName).index(indexName);
  const values = (await requestToPromise(index.getAll(query))) as T[];
  return values;
}

async function getByKey<T>(userId: string, storeName: string, id: IDBValidKey) {
  const db = await openChatDb(userId);
  const transaction = db.transaction(storeName, "readonly");
  const store = transaction.objectStore(storeName);
  return (await requestToPromise(store.get(id))) as T | undefined;
}

async function putMessageRow(userId: string, row: StoredMessageRow) {
  const db = await openChatDb(userId);
  const transaction = db.transaction(MESSAGE_STORE, "readwrite");
  transaction.objectStore(MESSAGE_STORE).put(row);
  await transactionDone(transaction);
}

async function putAttachmentRow(userId: string, row: StoredAttachmentRow) {
  const db = await openChatDb(userId);
  const transaction = db.transaction(ATTACHMENT_STORE, "readwrite");
  transaction.objectStore(ATTACHMENT_STORE).put(row);
  await transactionDone(transaction);
}

async function deleteAttachmentRow(userId: string, id: string) {
  const db = await openChatDb(userId);
  const transaction = db.transaction(ATTACHMENT_STORE, "readwrite");
  transaction.objectStore(ATTACHMENT_STORE).delete(id);
  await transactionDone(transaction);
}

async function putConversationRow(userId: string, row: StoredConversationRow) {
  const db = await openChatDb(userId);
  const transaction = db.transaction(CONVERSATION_STORE, "readwrite");
  transaction.objectStore(CONVERSATION_STORE).put(row);
  await transactionDone(transaction);
}

async function deleteMessageRow(userId: string, id: string) {
  const db = await openChatDb(userId);
  const transaction = db.transaction(MESSAGE_STORE, "readwrite");
  transaction.objectStore(MESSAGE_STORE).delete(id);
  await transactionDone(transaction);
}

async function deleteConversationRow(userId: string, id: string) {
  const db = await openChatDb(userId);
  const transaction = db.transaction(CONVERSATION_STORE, "readwrite");
  transaction.objectStore(CONVERSATION_STORE).delete(id);
  await transactionDone(transaction);
}

export async function ensureChatInstallationId(userId: string) {
  const key = `installation-id:${userId}`;
  const existing = await getStoredValue<string>(userId, META_STORE, key);

  if (existing) {
    return existing;
  }

  const installationId = randomId();
  await setStoredValue(userId, META_STORE, key, installationId);
  return installationId;
}

export async function getStoredChatPrivateKey(userId: string) {
  const stored = await getStoredValue<CryptoKey | SerializedCryptoKeyRecord>(
    userId,
    KEY_STORE,
    `device-private-key:${userId}`
  );

  if (!stored) {
    return null;
  }

  if (stored instanceof CryptoKey) {
    return stored;
  }

  if (stored.format === "jwk-json" && stored.algorithm === "RSA-OAEP-private") {
    return importPrivateKeyFromString(stored.data);
  }

  return null;
}

export async function getStoredChatPublicKey(userId: string) {
  const stored = await getStoredValue<CryptoKey | SerializedCryptoKeyRecord>(
    userId,
    KEY_STORE,
    `device-public-key:${userId}`
  );

  if (!stored) {
    return null;
  }

  if (stored instanceof CryptoKey) {
    return stored;
  }

  if (stored.format === "jwk-json" && stored.algorithm === "RSA-OAEP-public") {
    return importPublicKeyFromString(stored.data);
  }

  return null;
}

export async function saveStoredChatKeyPair(userId: string, keys: CryptoKeyPair) {
  const [privateKey, publicKey] = await Promise.all([
    exportPrivateKeyToString(keys.privateKey),
    exportPublicKeyToString(keys.publicKey),
  ]);

  await Promise.all([
    setStoredValue<SerializedCryptoKeyRecord>(userId, KEY_STORE, `device-private-key:${userId}`, {
      format: "jwk-json",
      algorithm: "RSA-OAEP-private",
      data: privateKey,
    }),
    setStoredValue<SerializedCryptoKeyRecord>(userId, KEY_STORE, `device-public-key:${userId}`, {
      format: "jwk-json",
      algorithm: "RSA-OAEP-public",
      data: publicKey,
    }),
  ]);
}

export async function getLocalEncryptionKey(userId: string) {
  const stored = await getStoredValue<CryptoKey | SerializedCryptoKeyRecord>(
    userId,
    KEY_STORE,
    `local-chat-key:${userId}`
  );

  if (!stored) {
    return null;
  }

  if (stored instanceof CryptoKey) {
    return stored;
  }

  if (stored.format === "jwk-json" && stored.algorithm === "AES-GCM") {
    return importLocalKeyFromString(stored.data);
  }

  return null;
}

export async function saveLocalEncryptionKey(userId: string, key: CryptoKey) {
  await setStoredValue<SerializedCryptoKeyRecord>(userId, KEY_STORE, `local-chat-key:${userId}`, {
    format: "jwk-json",
    algorithm: "AES-GCM",
    data: await exportLocalKeyToString(key),
  });
}

export async function saveConversationPeer(
  userId: string,
  conversationId: string,
  peer: ChatPeerProfile,
  defaults?: Partial<LocalConversationSummary>
) {
  const current = await getConversationSummary(userId, conversationId);

  await putConversationRow(userId, {
    id: conversationId,
    peerId: peer.id,
    peerUsername: peer.username,
    peerFullName: peer.full_name,
    peerAvatarUrl: peer.avatar_url,
    peerIsVerified: peer.is_verified,
    peerUpdatedAt: peer.updated_at || null,
    unreadCount: current?.unreadCount ?? defaults?.unreadCount ?? 0,
    lastMessageAt: current?.lastMessageAt ?? defaults?.lastMessageAt ?? null,
    lastMessageKind: current?.lastMessageKind ?? defaults?.lastMessageKind ?? null,
    lastPreviewText: current?.lastPreviewText ?? defaults?.lastPreviewText ?? null,
  });
}

export async function getConversationSummary(userId: string, conversationId: string) {
  return (await getByKey<StoredConversationRow>(userId, CONVERSATION_STORE, conversationId)) || null;
}

function buildMessagePreview(message: Pick<LocalChatMessage, "messageKind" | "text" | "createdAt">) {
  if (message.messageKind === "image") {
    return {
      text: message.text?.trim() ? `Photo: ${message.text}` : "Photo",
      createdAt: message.createdAt,
      kind: message.messageKind,
    } satisfies LocalChatMessagePreview;
  }

  if (message.messageKind === "voice") {
    return {
      text: message.text?.trim() ? `Voice note: ${message.text}` : "Voice note",
      createdAt: message.createdAt,
      kind: message.messageKind,
    } satisfies LocalChatMessagePreview;
  }

  return {
    text: message.text?.trim() || "Encrypted message",
    createdAt: message.createdAt,
    kind: message.messageKind,
  } satisfies LocalChatMessagePreview;
}

async function recalculateConversationSummary(userId: string, conversationId: string) {
  const messages = await getAllByIndex<StoredMessageRow>(
    userId,
    MESSAGE_STORE,
    "byConversationId",
    conversationId
  );
  const current = await getConversationSummary(userId, conversationId);

  if (!current) {
    return;
  }

  const sorted = [...messages].sort((left, right) => left.createdAt.localeCompare(right.createdAt));
  const last = sorted.at(-1);
  const unreadCount = sorted.filter((entry) => entry.unread && !entry.fromCurrentUser).length;
  const lastPreview = last ? await readLocalMessageRow(userId, last) : null;

  await putConversationRow(userId, {
    ...current,
    unreadCount,
    lastMessageAt: last?.createdAt || null,
    lastMessageKind: last?.messageKind || null,
    lastPreviewText: lastPreview ? buildMessagePreview(lastPreview).text : null,
  });
}

async function readLocalMessageRow(userId: string, row: StoredMessageRow): Promise<LocalChatMessage> {
  const localKey = await getLocalEncryptionKey(userId);

  if (!localKey) {
    throw new Error("Missing local chat encryption key.");
  }

  const payload = await decryptJsonWithLocalKey(
    {
      iv: row.iv,
      ciphertext: row.ciphertext,
    },
    localKey
  );

  return {
    id: row.id,
    conversationId: row.conversationId,
    clientMessageId: row.clientMessageId,
    requestId: row.requestId,
    senderId: row.senderId,
    recipientId: row.recipientId,
    createdAt: row.createdAt,
    fromCurrentUser: row.fromCurrentUser,
    unread: row.unread,
    status: row.status,
    messageKind: row.messageKind,
    text: (typeof payload.text === "string" ? payload.text : null) || null,
    attachment: (payload.attachment as LocalChatAttachment | null) || null,
  };
}

export async function saveLocalMessage(
  userId: string,
  message: LocalChatMessage,
  attachmentBuffer?: ArrayBuffer | null
) {
  const localKey = await getLocalEncryptionKey(userId);

  if (!localKey) {
    throw new Error("Missing local chat encryption key.");
  }

  if (message.attachment && attachmentBuffer) {
    const encryptedAttachment = await encryptBytesWithLocalKey(attachmentBuffer, localKey);

    await putAttachmentRow(userId, {
      id: message.attachment.id,
      iv: encryptedAttachment.iv,
      ciphertext: encryptedAttachment.ciphertext,
      kind: message.attachment.kind,
      mimeType: message.attachment.mimeType,
      byteSize: message.attachment.byteSize,
      fileName: message.attachment.fileName,
      createdAt: message.createdAt,
    });
  }

  const encryptedPayload = await encryptJsonWithLocalKey(
    {
      text: message.text,
      attachment: message.attachment,
    },
    localKey
  );

  await putMessageRow(userId, {
    id: message.id,
    conversationId: message.conversationId,
    clientMessageId: message.clientMessageId,
    requestId: message.requestId,
    senderId: message.senderId,
    recipientId: message.recipientId,
    createdAt: message.createdAt,
    fromCurrentUser: message.fromCurrentUser,
    unread: message.unread,
    status: message.status,
    messageKind: message.messageKind,
    iv: encryptedPayload.iv,
    ciphertext: encryptedPayload.ciphertext,
  });

  const summary = await getConversationSummary(userId, message.conversationId);

  if (!summary) {
    await putConversationRow(userId, {
      id: message.conversationId,
      peerId: message.fromCurrentUser ? message.recipientId : message.senderId,
      peerUsername: null,
      peerFullName: null,
      peerAvatarUrl: null,
      peerIsVerified: false,
      peerUpdatedAt: null,
      unreadCount: 0,
      lastMessageAt: null,
      lastMessageKind: null,
      lastPreviewText: null,
    });
  }

  await recalculateConversationSummary(userId, message.conversationId);
}

export async function listConversationMessages(userId: string, conversationId: string) {
  const rows = await getAllByIndex<StoredMessageRow>(
    userId,
    MESSAGE_STORE,
    "byConversationId",
    conversationId
  );
  const sorted = [...rows].sort((left, right) => left.createdAt.localeCompare(right.createdAt));
  return Promise.all(sorted.map((row) => readLocalMessageRow(userId, row)));
}

/**
 * Load messages in pages: returns the latest `limit` messages starting from `offset`
 * (counting from the newest). Results are returned in chronological order (oldest first)
 * so they render top-to-bottom.
 */
export async function listConversationMessagesPaginated(
  userId: string,
  conversationId: string,
  limit: number,
  offset: number
): Promise<{ messages: LocalChatMessage[]; totalCount: number }> {
  const rows = await getAllByIndex<StoredMessageRow>(
    userId,
    MESSAGE_STORE,
    "byConversationId",
    conversationId
  );

  // Sort newest-first to apply offset/limit from the end
  const sortedDesc = [...rows].sort((left, right) => right.createdAt.localeCompare(left.createdAt));
  const totalCount = sortedDesc.length;

  // Slice: offset 0 = latest messages, offset 15 = next batch
  const page = sortedDesc.slice(offset, offset + limit);

  // Reverse to chronological order for rendering
  page.reverse();

  const messages = await Promise.all(page.map((row) => readLocalMessageRow(userId, row)));
  return { messages, totalCount };
}

export async function listConversationSummaries(userId: string) {
  const rows = await getAllFromStore<StoredConversationRow>(userId, CONVERSATION_STORE);
  return rows.sort((left, right) => (right.lastMessageAt || "").localeCompare(left.lastMessageAt || ""));
}

export async function getLatestConversationPreview(
  userId: string,
  conversationId: string
): Promise<LocalChatMessagePreview> {
  const summary = await getConversationSummary(userId, conversationId);

  if (!summary?.lastMessageAt || !summary.lastMessageKind) {
    return {
      text: "No local messages yet",
      createdAt: null,
      kind: null,
    };
  }

  return {
    text: summary.lastPreviewText || "Encrypted message",
    createdAt: summary.lastMessageAt,
    kind: summary.lastMessageKind,
  };
}

export async function markConversationRead(userId: string, conversationId: string) {
  const rows = await getAllByIndex<StoredMessageRow>(
    userId,
    MESSAGE_STORE,
    "byConversationId",
    conversationId
  );
  const unreadRows = rows.filter((row) => row.unread && !row.fromCurrentUser);

  if (!unreadRows.length) {
    return;
  }

  const db = await openChatDb(userId);
  const transaction = db.transaction(MESSAGE_STORE, "readwrite");
  const store = transaction.objectStore(MESSAGE_STORE);

  unreadRows.forEach((row) => {
    store.put({
      ...row,
      unread: false,
    });
  });

  await transactionDone(transaction);
  await recalculateConversationSummary(userId, conversationId);
}

export async function countUnreadConversations(userId: string) {
  const rows = await getAllFromStore<StoredConversationRow>(userId, CONVERSATION_STORE);
  return rows.filter((row) => row.unreadCount > 0).length;
}

export async function markMessagesDelivered(userId: string, clientMessageIds: string[]) {
  if (!clientMessageIds.length) {
    return;
  }

  const allRows = await getAllFromStore<StoredMessageRow>(userId, MESSAGE_STORE);
  const toUpdate = allRows.filter((row) => clientMessageIds.includes(row.clientMessageId));

  if (!toUpdate.length) {
    return;
  }

  const touchedConversationIds = new Set<string>();
  const db = await openChatDb(userId);
  const transaction = db.transaction(MESSAGE_STORE, "readwrite");
  const store = transaction.objectStore(MESSAGE_STORE);

  toUpdate.forEach((row) => {
    touchedConversationIds.add(row.conversationId);
    store.put({
      ...row,
      status: "delivered",
    });
  });

  await transactionDone(transaction);

  await Promise.all(
    Array.from(touchedConversationIds).map((conversationId) =>
      recalculateConversationSummary(userId, conversationId)
    )
  );
}

export async function updateLocalMessageStatus(
  userId: string,
  messageId: string,
  status: LocalChatMessage["status"]
) {
  const target = await getByKey<StoredMessageRow>(userId, MESSAGE_STORE, messageId);

  if (!target) {
    return;
  }

  await putMessageRow(userId, {
    ...target,
    status,
  });
  await recalculateConversationSummary(userId, target.conversationId);
}

export async function deleteLocalMessage(userId: string, messageId: string) {
  const target = await getByKey<StoredMessageRow>(userId, MESSAGE_STORE, messageId);

  if (!target) {
    return;
  }

  const message = await readLocalMessageRow(userId, target);

  await deleteMessageRow(userId, target.id);

  if (message.attachment) {
    await deleteAttachmentRow(userId, message.attachment.id);
  }

  await recalculateConversationSummary(userId, target.conversationId);
}

export async function deleteAllLocalConversationMessages(userId: string, conversationId: string) {
  const rows = await getAllByIndex<StoredMessageRow>(
    userId,
    MESSAGE_STORE,
    "byConversationId",
    conversationId
  );

  if (!rows.length) {
    return;
  }

  const messages = await Promise.all(rows.map((row) => readLocalMessageRow(userId, row)));
  const db = await openChatDb(userId);
  const transaction = db.transaction([MESSAGE_STORE, ATTACHMENT_STORE], "readwrite");
  const messageStore = transaction.objectStore(MESSAGE_STORE);
  const attachmentStore = transaction.objectStore(ATTACHMENT_STORE);

  rows.forEach((row) => {
    messageStore.delete(row.id);
  });

  messages.forEach((message) => {
    if (message.attachment) {
      attachmentStore.delete(message.attachment.id);
    }
  });

  await transactionDone(transaction);

  await recalculateConversationSummary(userId, conversationId);
}

export async function deleteLocalConversation(userId: string, conversationId: string) {
  await deleteAllLocalConversationMessages(userId, conversationId);
  await deleteConversationRow(userId, conversationId);
}

export async function getAttachmentBlob(userId: string, attachmentId: string) {
  const localKey = await getLocalEncryptionKey(userId);

  if (!localKey) {
    throw new Error("Missing local chat encryption key.");
  }

  const target = await getByKey<StoredAttachmentRow>(userId, ATTACHMENT_STORE, attachmentId);

  if (!target) {
    return null;
  }

  const decrypted = await decryptBytesWithLocalKey(
    {
      iv: target.iv,
      ciphertext: target.ciphertext,
    },
    localKey
  );

  return new Blob([decrypted], {
    type: target.mimeType,
  });
}

export async function moveRequestIntroToConversation(
  userId: string,
  requestId: string,
  conversationId: string,
  peer: ChatPeerProfile
) {
  const rows = await getAllByIndex<StoredMessageRow>(
    userId,
    MESSAGE_STORE,
    "byRequestId",
    requestId
  );

  if (!rows.length) {
    return;
  }

  await saveConversationPeer(userId, conversationId, peer);

  const db = await openChatDb(userId);
  const transaction = db.transaction(MESSAGE_STORE, "readwrite");
  const store = transaction.objectStore(MESSAGE_STORE);

  rows.forEach((row) => {
    store.put({
      ...row,
      conversationId,
    });
  });

  await transactionDone(transaction);

  await recalculateConversationSummary(userId, conversationId);
}

export async function deleteRequestPlaceholderMessages(userId: string, requestId: string) {
  const rows = await getAllByIndex<StoredMessageRow>(userId, MESSAGE_STORE, "byRequestId", requestId);

  await Promise.all(rows.map((row) => deleteMessageRow(userId, row.id)));
}
