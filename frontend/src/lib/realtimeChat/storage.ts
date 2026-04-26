import {
  emitRealtimeStorageChanged,
} from "./events";
import type {
  LocalRealtimeConversation,
  LocalRealtimeMessage,
  LocalRealtimeNotification,
  RealtimeBadgeSummary,
  RealtimeIncomingMessageInput,
  RealtimeMessageStatus,
  RealtimeOutgoingMessageInput,
  RealtimePeerProfile,
} from "./types";

const DB_NAME_PREFIX = "student-society-realtime-relay";
const DB_VERSION = 2;
const META_STORE = "meta";
const CONVERSATION_STORE = "conversations";
const MESSAGE_STORE = "messages";
const NOTIFICATION_STORE = "notifications";
const INSTALLATION_ID_KEY = "relay-installation-id";
const CONVERSATION_BY_LAST_MESSAGE_AT_INDEX = "byLastMessageAt";
const CONVERSATION_BY_PEER_ID_INDEX = "byPeerId";
const MESSAGE_BY_CONVERSATION_CREATED_AT_INDEX = "byConversationCreatedAt";
const MESSAGE_BY_STATUS_INDEX = "byStatus";
const NOTIFICATION_BY_CREATED_AT_INDEX = "byCreatedAt";

interface StoredValueRecord<T = unknown> {
  id: string;
  value: T;
}

type StoredConversationRow = LocalRealtimeConversation;
type StoredMessageRow = LocalRealtimeMessage;
type StoredNotificationRow = LocalRealtimeNotification;

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

function cursorToArray<T>(request: IDBRequest<IDBCursorWithValue | null>) {
  return new Promise<T[]>((resolve, reject) => {
    const rows: T[] = [];

    request.onsuccess = () => {
      const cursor = request.result;
      if (!cursor) {
        resolve(rows);
        return;
      }

      rows.push(cursor.value as T);
      cursor.continue();
    };

    request.onerror = () => reject(request.error || new Error("IndexedDB cursor failed."));
  });
}

function getDbName(userId: string) {
  return `${DB_NAME_PREFIX}-${userId}`;
}

function openDb(userId: string) {
  const cached = dbPromiseCache.get(userId);
  if (cached) {
    return cached;
  }

  const promise = new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(getDbName(userId), DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      const transaction = request.transaction;
      if (!transaction) {
        return;
      }

      if (!db.objectStoreNames.contains(META_STORE)) {
        db.createObjectStore(META_STORE, { keyPath: "id" });
      }

      const conversations = db.objectStoreNames.contains(CONVERSATION_STORE)
        ? transaction.objectStore(CONVERSATION_STORE)
        : db.createObjectStore(CONVERSATION_STORE, { keyPath: "id" });
      if (!conversations.indexNames.contains(CONVERSATION_BY_LAST_MESSAGE_AT_INDEX)) {
        conversations.createIndex(CONVERSATION_BY_LAST_MESSAGE_AT_INDEX, "lastMessageAt", {
          unique: false,
        });
      }
      if (!conversations.indexNames.contains(CONVERSATION_BY_PEER_ID_INDEX)) {
        conversations.createIndex(CONVERSATION_BY_PEER_ID_INDEX, "peerId", { unique: false });
      }

      const messages = db.objectStoreNames.contains(MESSAGE_STORE)
        ? transaction.objectStore(MESSAGE_STORE)
        : db.createObjectStore(MESSAGE_STORE, { keyPath: "id" });
      if (!messages.indexNames.contains(MESSAGE_BY_CONVERSATION_CREATED_AT_INDEX)) {
        messages.createIndex(MESSAGE_BY_CONVERSATION_CREATED_AT_INDEX, ["conversationId", "createdAt"], {
          unique: false,
        });
      }
      if (!messages.indexNames.contains(MESSAGE_BY_STATUS_INDEX)) {
        messages.createIndex(MESSAGE_BY_STATUS_INDEX, "status", { unique: false });
      }

      const notifications = db.objectStoreNames.contains(NOTIFICATION_STORE)
        ? transaction.objectStore(NOTIFICATION_STORE)
        : db.createObjectStore(NOTIFICATION_STORE, { keyPath: "id" });
      if (!notifications.indexNames.contains(NOTIFICATION_BY_CREATED_AT_INDEX)) {
        notifications.createIndex(NOTIFICATION_BY_CREATED_AT_INDEX, "createdAt", { unique: false });
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
      reject(request.error || new Error("Failed to open realtime relay IndexedDB."));
    };
  });

  dbPromiseCache.set(userId, promise);
  return promise;
}

function normalizePeer(peer: RealtimePeerProfile) {
  return {
    peerId: peer.id,
    peerUsername: peer.username || null,
    peerFullName: peer.fullName || null,
    peerAvatarUrl: peer.avatarUrl || null,
    peerIsVerified: Boolean(peer.isVerified),
    peerUpdatedAt: peer.updatedAt || null,
  };
}

async function listAllConversations(userId: string) {
  const db = await openDb(userId);
  const transaction = db.transaction(CONVERSATION_STORE, "readonly");
  const rows = (await requestToPromise(
    transaction.objectStore(CONVERSATION_STORE).getAll()
  )) as StoredConversationRow[];
  return rows;
}

async function listAllNotifications(userId: string) {
  const db = await openDb(userId);
  const transaction = db.transaction(NOTIFICATION_STORE, "readonly");
  const rows = (await requestToPromise(
    transaction.objectStore(NOTIFICATION_STORE).getAll()
  )) as StoredNotificationRow[];
  return rows;
}

export function createConversationId(leftUserId: string, rightUserId: string) {
  return [leftUserId, rightUserId].sort().join("::");
}

export async function getRealtimeRelayInstallationId(userId: string) {
  const db = await openDb(userId);
  const transaction = db.transaction(META_STORE, "readwrite");
  const store = transaction.objectStore(META_STORE);
  const record = (await requestToPromise(
    store.get(INSTALLATION_ID_KEY)
  )) as StoredValueRecord<string> | undefined;

  if (record?.value) {
    return record.value;
  }

  const installationId =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? `relay-device-${crypto.randomUUID()}`
      : `relay-device-${Math.random().toString(36).slice(2, 10)}`;

  store.put({ id: INSTALLATION_ID_KEY, value: installationId } satisfies StoredValueRecord<string>);
  await transactionDone(transaction);
  return installationId;
}

export async function ensureRealtimeConversation(userId: string, peer: RealtimePeerProfile) {
  const conversationId = createConversationId(userId, peer.id);
  const db = await openDb(userId);
  const transaction = db.transaction(CONVERSATION_STORE, "readwrite");
  const conversations = transaction.objectStore(CONVERSATION_STORE);
  const existing = (await requestToPromise(
    conversations.get(conversationId)
  )) as StoredConversationRow | undefined;

  conversations.put({
    id: conversationId,
    unreadCount: existing?.unreadCount || 0,
    lastMessageAt: existing?.lastMessageAt || null,
    lastMessageText: existing?.lastMessageText || null,
    online: existing?.online || false,
    ...normalizePeer(peer),
  } satisfies StoredConversationRow);
  await transactionDone(transaction);
  emitRealtimeStorageChanged({
    userId,
    reason: "conversation-upsert",
    conversationId,
    affectsInbox: true,
    affectsThread: false,
    affectsBadge: false,
  });
  return conversationId;
}

async function upsertConversationFromMessage(
  userId: string,
  input: {
    conversationId: string;
    peer: RealtimePeerProfile;
    lastMessageText: string;
    lastMessageAt: string;
    incrementUnreadBy: number;
  }
) {
  const db = await openDb(userId);
  const transaction = db.transaction(CONVERSATION_STORE, "readwrite");
  const conversations = transaction.objectStore(CONVERSATION_STORE);
  const existing = (await requestToPromise(
    conversations.get(input.conversationId)
  )) as StoredConversationRow | undefined;

  conversations.put({
    id: input.conversationId,
    unreadCount: Math.max(0, (existing?.unreadCount || 0) + input.incrementUnreadBy),
    lastMessageAt: input.lastMessageAt,
    lastMessageText: input.lastMessageText,
    online: existing?.online || false,
    ...normalizePeer(input.peer),
  } satisfies StoredConversationRow);

  await transactionDone(transaction);
}

async function putMessage(userId: string, message: StoredMessageRow) {
  const db = await openDb(userId);
  const transaction = db.transaction(MESSAGE_STORE, "readwrite");
  transaction.objectStore(MESSAGE_STORE).put(message);
  await transactionDone(transaction);
}

async function recalculateConversationState(userId: string, conversationId: string) {
  const db = await openDb(userId);
  const transaction = db.transaction([MESSAGE_STORE, CONVERSATION_STORE], "readwrite");
  const messages = transaction.objectStore(MESSAGE_STORE);
  const conversations = transaction.objectStore(CONVERSATION_STORE);
  const messageIndex = messages.index("byConversationCreatedAt");
  const rows = (await requestToPromise(
    messageIndex.getAll(IDBKeyRange.bound([conversationId, ""], [conversationId, "\uffff"]))
  )) as StoredMessageRow[];
  const conversation = (await requestToPromise(
    conversations.get(conversationId)
  )) as StoredConversationRow | undefined;

  if (!conversation) {
    await transactionDone(transaction);
    return;
  }

  const sorted = [...rows].sort((left, right) => left.createdAt.localeCompare(right.createdAt));
  const last = sorted.at(-1);

  conversations.put({
    ...conversation,
    unreadCount: rows.filter((row) => row.direction === "incoming" && row.unread).length,
    lastMessageAt: last?.createdAt || null,
    lastMessageText: last?.text || null,
  } satisfies StoredConversationRow);

  await transactionDone(transaction);
}

export async function saveOutgoingRealtimeMessage(
  userId: string,
  peer: RealtimePeerProfile,
  message: RealtimeOutgoingMessageInput
) {
  const db = await openDb(userId);
  const transaction = db.transaction([MESSAGE_STORE, CONVERSATION_STORE], "readwrite");
  const messages = transaction.objectStore(MESSAGE_STORE);
  const conversations = transaction.objectStore(CONVERSATION_STORE);
  const existingMessage = (await requestToPromise(messages.get(message.messageId))) as
    | StoredMessageRow
    | undefined;

  if (!existingMessage) {
    messages.put({
      id: message.messageId,
      conversationId: message.conversationId,
      senderId: message.senderId,
      recipientId: message.recipientId,
      text: message.text,
      createdAt: message.createdAt,
      expiresAt: message.expiresAt,
      deliveredAt: null,
      direction: "outgoing",
      status: "queued",
      unread: false,
    } satisfies StoredMessageRow);
  }

  const existingConversation = (await requestToPromise(
    conversations.get(message.conversationId)
  )) as StoredConversationRow | undefined;

  conversations.put({
    id: message.conversationId,
    unreadCount: existingConversation?.unreadCount || 0,
    lastMessageAt: message.createdAt,
    lastMessageText: message.text,
    online: existingConversation?.online || false,
    ...normalizePeer(peer),
  } satisfies StoredConversationRow);

  await transactionDone(transaction);
  emitRealtimeStorageChanged({
    userId,
    reason: "message-created",
    conversationId: message.conversationId,
    messageId: message.messageId,
    affectsInbox: true,
    affectsThread: true,
    affectsBadge: true,
  });
}

export async function saveIncomingRealtimeMessage(
  userId: string,
  input: RealtimeIncomingMessageInput
) {
  const db = await openDb(userId);
  const transaction = db.transaction([MESSAGE_STORE, CONVERSATION_STORE], "readwrite");
  const messages = transaction.objectStore(MESSAGE_STORE);
  const conversations = transaction.objectStore(CONVERSATION_STORE);
  const existingMessage = (await requestToPromise(messages.get(input.messageId))) as
    | StoredMessageRow
    | undefined;

  if (!existingMessage) {
    messages.put({
      id: input.messageId,
      conversationId: input.conversationId,
      senderId: input.senderId,
      recipientId: input.recipientId,
      text: input.text,
      createdAt: input.createdAt,
      expiresAt: input.expiresAt,
      deliveredAt: input.createdAt,
      direction: "incoming",
      status: "delivered",
      unread: true,
    } satisfies StoredMessageRow);
  }

  const existingConversation = (await requestToPromise(
    conversations.get(input.conversationId)
  )) as StoredConversationRow | undefined;

  conversations.put({
    id: input.conversationId,
    unreadCount: existingMessage ? existingConversation?.unreadCount || 0 : (existingConversation?.unreadCount || 0) + 1,
    lastMessageAt: input.createdAt,
    lastMessageText: input.text,
    online: existingConversation?.online || false,
    ...normalizePeer(input.peer),
  } satisfies StoredConversationRow);

  await transactionDone(transaction);
  emitRealtimeStorageChanged({
    userId,
    reason: "message-created",
    conversationId: input.conversationId,
    messageId: input.messageId,
    affectsInbox: true,
    affectsThread: true,
    affectsBadge: true,
  });
}

export async function listRealtimeConversations(userId: string) {
  const db = await openDb(userId);
  const transaction = db.transaction(CONVERSATION_STORE, "readonly");
  const store = transaction.objectStore(CONVERSATION_STORE);
  const conversations = (await requestToPromise(store.getAll())) as StoredConversationRow[];
  return [...conversations].sort((left, right) =>
    (right.lastMessageAt || "").localeCompare(left.lastMessageAt || "")
  );
}

export async function listRealtimeConversationMessages(userId: string, conversationId: string) {
  const db = await openDb(userId);
  const transaction = db.transaction(MESSAGE_STORE, "readonly");
  const index = transaction.objectStore(MESSAGE_STORE).index(MESSAGE_BY_CONVERSATION_CREATED_AT_INDEX);
  const rows = (await requestToPromise(
    index.getAll(IDBKeyRange.bound([conversationId, ""], [conversationId, "\uffff"]))
  )) as StoredMessageRow[];
  return rows.sort((left, right) => left.createdAt.localeCompare(right.createdAt));
}

export async function listQueuedRealtimeMessages(userId: string) {
  const db = await openDb(userId);
  const transaction = db.transaction(MESSAGE_STORE, "readonly");
  const index = transaction.objectStore(MESSAGE_STORE).index(MESSAGE_BY_STATUS_INDEX);
  const queued = (await requestToPromise(index.getAll("queued"))) as StoredMessageRow[];
  const failed = (await requestToPromise(index.getAll("failed"))) as StoredMessageRow[];

  return [...queued, ...failed].sort((left, right) => left.createdAt.localeCompare(right.createdAt));
}

export async function updateRealtimeMessageStatus(
  userId: string,
  messageId: string,
  status: RealtimeMessageStatus,
  options?: { deliveredAt?: string | null; expiresAt?: string | null }
) {
  const db = await openDb(userId);
  const transaction = db.transaction(MESSAGE_STORE, "readwrite");
  const messages = transaction.objectStore(MESSAGE_STORE);
  const existing = (await requestToPromise(messages.get(messageId))) as StoredMessageRow | undefined;

  if (!existing) {
    await transactionDone(transaction);
    return;
  }

  const nextDeliveredAt =
    options?.deliveredAt === undefined ? existing.deliveredAt : options.deliveredAt;
  const nextExpiresAt = options?.expiresAt === undefined ? existing.expiresAt : options.expiresAt;

  if (
    existing.status === status &&
    existing.deliveredAt === nextDeliveredAt &&
    existing.expiresAt === nextExpiresAt
  ) {
    await transactionDone(transaction);
    return;
  }

  messages.put({
    ...existing,
    status,
    deliveredAt: nextDeliveredAt,
    expiresAt: nextExpiresAt,
  } satisfies StoredMessageRow);
  await transactionDone(transaction);
  emitRealtimeStorageChanged({
    userId,
    reason: "message-status",
    conversationId: existing.conversationId,
    messageId,
    status,
    affectsInbox: false,
    affectsThread: true,
    affectsBadge: true,
  });
}

export async function markRealtimeConversationRead(userId: string, conversationId: string) {
  const db = await openDb(userId);
  const transaction = db.transaction([MESSAGE_STORE, CONVERSATION_STORE], "readwrite");
  const messages = transaction.objectStore(MESSAGE_STORE);
  const conversations = transaction.objectStore(CONVERSATION_STORE);
  const messageIndex = messages.index("byConversationCreatedAt");
  const rows = (await requestToPromise(
    messageIndex.getAll(IDBKeyRange.bound([conversationId, ""], [conversationId, "\uffff"]))
  )) as StoredMessageRow[];

  for (const row of rows) {
    if (row.direction === "incoming" && row.unread) {
      messages.put({
        ...row,
        unread: false,
      } satisfies StoredMessageRow);
    }
  }

  const conversation = (await requestToPromise(
    conversations.get(conversationId)
  )) as StoredConversationRow | undefined;

  if (conversation) {
    conversations.put({
      ...conversation,
      unreadCount: 0,
    } satisfies StoredConversationRow);
  }

  await transactionDone(transaction);
  emitRealtimeStorageChanged({
    userId,
    reason: "conversation-read",
    conversationId,
    affectsInbox: true,
    affectsThread: false,
    affectsBadge: true,
  });
}

export async function setRealtimePeerPresence(userId: string, peerUserId: string, online: boolean) {
  const db = await openDb(userId);
  const transaction = db.transaction(CONVERSATION_STORE, "readwrite");
  const store = transaction.objectStore(CONVERSATION_STORE);
  const matching = store.indexNames.contains(CONVERSATION_BY_PEER_ID_INDEX)
    ? ((await requestToPromise(
        store.index(CONVERSATION_BY_PEER_ID_INDEX).getAll(peerUserId)
      )) as StoredConversationRow[])
    : (await listAllConversations(userId)).filter((conversation) => conversation.peerId === peerUserId);
  if (matching.length === 0) {
    await transactionDone(transaction);
    return;
  }

  let changed = false;
  for (const conversation of matching) {
    if (conversation.online === online) {
      continue;
    }

    changed = true;
    store.put({
      ...conversation,
      online,
    } satisfies StoredConversationRow);
  }

  await transactionDone(transaction);
  if (!changed) {
    return;
  }

  emitRealtimeStorageChanged({
    userId,
    reason: "presence",
    peerUserId,
    online,
    affectsInbox: true,
    affectsThread: false,
    affectsBadge: false,
  });
}

export async function setRealtimePeersPresence(
  userId: string,
  updates: Array<{ peerUserId: string; online: boolean }>
) {
  if (updates.length === 0) {
    return;
  }

  const db = await openDb(userId);
  const transaction = db.transaction(CONVERSATION_STORE, "readwrite");
  const store = transaction.objectStore(CONVERSATION_STORE);
  const updatesByPeerId = new Map<string, boolean>();

  for (const update of updates) {
    if (!update.peerUserId) {
      continue;
    }

    updatesByPeerId.set(update.peerUserId, Boolean(update.online));
  }

  if (updatesByPeerId.size === 0) {
    await transactionDone(transaction);
    return;
  }

  let changed = false;
  for (const [peerUserId, online] of updatesByPeerId) {
    const matching = store.indexNames.contains(CONVERSATION_BY_PEER_ID_INDEX)
      ? ((await requestToPromise(
          store.index(CONVERSATION_BY_PEER_ID_INDEX).getAll(peerUserId)
        )) as StoredConversationRow[])
      : (await listAllConversations(userId)).filter((conversation) => conversation.peerId === peerUserId);

    for (const conversation of matching) {
      if (conversation.online === online) {
        continue;
      }

      changed = true;
      store.put({
        ...conversation,
        online,
      } satisfies StoredConversationRow);
    }
  }

  await transactionDone(transaction);
  if (!changed) {
    return;
  }

  emitRealtimeStorageChanged({
    userId,
    reason: "presence-sync",
    affectsInbox: true,
    affectsThread: false,
    affectsBadge: false,
  });
}

export async function saveRealtimeNotification(
  userId: string,
  notification: LocalRealtimeNotification
) {
  const db = await openDb(userId);
  const transaction = db.transaction(NOTIFICATION_STORE, "readwrite");
  transaction.objectStore(NOTIFICATION_STORE).put(notification);
  await transactionDone(transaction);
  emitRealtimeStorageChanged({
    userId,
    reason: "notification-created",
    conversationId: notification.conversationId,
    messageId: notification.messageId,
    affectsInbox: false,
    affectsThread: false,
    affectsBadge: true,
  });
}

export async function listRealtimeNotifications(userId: string, limit = 20) {
  const notifications = await listAllNotifications(userId);
  return [...notifications]
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
    .slice(0, limit);
}

export async function markRealtimeNotificationsRead(userId: string) {
  const notifications = await listAllNotifications(userId);
  const unread = notifications.filter((notification) => !notification.read);
  if (unread.length === 0) {
    return;
  }

  const db = await openDb(userId);
  const transaction = db.transaction(NOTIFICATION_STORE, "readwrite");
  const store = transaction.objectStore(NOTIFICATION_STORE);

  for (const notification of unread) {
    store.put({
      ...notification,
      read: true,
    } satisfies StoredNotificationRow);
  }

  await transactionDone(transaction);
  emitRealtimeStorageChanged({
    userId,
    reason: "notifications-read",
    affectsInbox: false,
    affectsThread: false,
    affectsBadge: true,
  });
}

export async function getRealtimeBadgeSummary(userId: string): Promise<RealtimeBadgeSummary> {
  const [conversations, notifications, queuedMessages] = await Promise.all([
    listAllConversations(userId),
    listAllNotifications(userId),
    listQueuedRealtimeMessages(userId),
  ]);

  const unreadConversationCount = conversations.filter((conversation) => conversation.unreadCount > 0).length;
  const unreadNotificationCount = notifications.filter((notification) => !notification.read).length;
  const queuedMessageCount = queuedMessages.length;

  return {
    unreadConversationCount,
    unreadNotificationCount,
    queuedMessageCount,
    totalBadgeCount: unreadConversationCount + unreadNotificationCount,
  };
}

export async function deleteRealtimeMessage(userId: string, messageId: string) {
  const db = await openDb(userId);
  const transaction = db.transaction(MESSAGE_STORE, "readwrite");
  const store = transaction.objectStore(MESSAGE_STORE);
  const existing = (await requestToPromise(store.get(messageId))) as StoredMessageRow | undefined;

  if (!existing) {
    await transactionDone(transaction);
    return;
  }

  store.delete(messageId);
  await transactionDone(transaction);
  await recalculateConversationState(userId, existing.conversationId);
  emitRealtimeStorageChanged({
    userId,
    reason: "message-deleted",
    conversationId: existing.conversationId,
    messageId,
    affectsInbox: true,
    affectsThread: true,
    affectsBadge: true,
  });
}

export async function deleteRealtimeMessages(userId: string, messageIds: string[]) {
  const uniqueMessageIds = Array.from(new Set(messageIds.filter(Boolean)));
  if (uniqueMessageIds.length === 0) {
    return;
  }

  const db = await openDb(userId);
  const transaction = db.transaction(MESSAGE_STORE, "readwrite");
  const store = transaction.objectStore(MESSAGE_STORE);
  const affectedConversationIds = new Set<string>();

  for (const messageId of uniqueMessageIds) {
    const existing = (await requestToPromise(store.get(messageId))) as StoredMessageRow | undefined;
    if (!existing) {
      continue;
    }

    affectedConversationIds.add(existing.conversationId);
    store.delete(messageId);
  }

  await transactionDone(transaction);
  await Promise.all(
    Array.from(affectedConversationIds).map((conversationId) =>
      recalculateConversationState(userId, conversationId)
    )
  );

  if (affectedConversationIds.size === 0) {
    return;
  }

  emitRealtimeStorageChanged({
    userId,
    reason: "message-deleted",
    conversationId:
      affectedConversationIds.size === 1 ? Array.from(affectedConversationIds)[0] : null,
    affectsInbox: true,
    affectsThread: true,
    affectsBadge: true,
  });
}

export async function deleteAllRealtimeConversationMessages(userId: string, conversationId: string) {
  const db = await openDb(userId);
  const transaction = db.transaction(MESSAGE_STORE, "readwrite");
  const store = transaction.objectStore(MESSAGE_STORE);
  const index = store.index("byConversationCreatedAt");
  const rows = (await requestToPromise(
    index.getAll(IDBKeyRange.bound([conversationId, ""], [conversationId, "\uffff"]))
  )) as StoredMessageRow[];

  for (const row of rows) {
    store.delete(row.id);
  }

  await transactionDone(transaction);
  await recalculateConversationState(userId, conversationId);
  emitRealtimeStorageChanged({
    userId,
    reason: "conversation-cleared",
    conversationId,
    affectsInbox: true,
    affectsThread: true,
    affectsBadge: true,
  });
}

export async function deleteRealtimeConversation(userId: string, conversationId: string) {
  const db = await openDb(userId);
  const transaction = db.transaction(
    [MESSAGE_STORE, CONVERSATION_STORE, NOTIFICATION_STORE],
    "readwrite"
  );
  const messages = transaction.objectStore(MESSAGE_STORE);
  const conversations = transaction.objectStore(CONVERSATION_STORE);
  const notifications = transaction.objectStore(NOTIFICATION_STORE);
  const messageIndex = messages.index("byConversationCreatedAt");
  const rows = (await requestToPromise(
    messageIndex.getAll(IDBKeyRange.bound([conversationId, ""], [conversationId, "\uffff"]))
  )) as StoredMessageRow[];
  const notificationRows = (await requestToPromise(notifications.getAll())) as StoredNotificationRow[];

  for (const row of rows) {
    messages.delete(row.id);
  }

  for (const notification of notificationRows) {
    if (notification.conversationId === conversationId) {
      notifications.delete(notification.id);
    }
  }

  conversations.delete(conversationId);
  await transactionDone(transaction);
  emitRealtimeStorageChanged({
    userId,
    reason: "conversation-deleted",
    conversationId,
    affectsInbox: true,
    affectsThread: true,
    affectsBadge: true,
  });
}
