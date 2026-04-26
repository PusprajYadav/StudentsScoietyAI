import type { NotificationWithRelations } from "../../types/database";

const DB_NAME_PREFIX = "student-society-notifications";
const DB_VERSION = 1;
const META_STORE = "meta";
const NOTIFICATION_STORE = "notifications";

interface StoredValueRecord<T = unknown> {
  id: string;
  value: T;
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

function getNotificationDbName(userId: string) {
  return `${DB_NAME_PREFIX}-${userId}`;
}

export async function clearLocalNotifications(userId: string) {
  return new Promise<void>((resolve, reject) => {
    const request = indexedDB.deleteDatabase(getNotificationDbName(userId));

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error || new Error("Failed to clear local notifications."));
    request.onblocked = () =>
      reject(new Error("Local notification storage clear was blocked by another open database connection."));
  });
}

function openNotificationDb(userId: string) {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(getNotificationDbName(userId), DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;

      if (!db.objectStoreNames.contains(META_STORE)) {
        db.createObjectStore(META_STORE, { keyPath: "id" });
      }

      if (!db.objectStoreNames.contains(NOTIFICATION_STORE)) {
        const notifications = db.createObjectStore(NOTIFICATION_STORE, { keyPath: "id" });
        notifications.createIndex("byCreatedAt", "created_at", { unique: false });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error("Failed to open notification IndexedDB."));
  });
}

async function getMetaValue<T>(userId: string, id: string) {
  const db = await openNotificationDb(userId);
  const transaction = db.transaction(META_STORE, "readonly");
  const record = (await requestToPromise(
    transaction.objectStore(META_STORE).get(id)
  )) as StoredValueRecord<T> | undefined;
  db.close();
  return record?.value ?? null;
}

async function setMetaValue<T>(userId: string, id: string, value: T) {
  const db = await openNotificationDb(userId);
  const transaction = db.transaction(META_STORE, "readwrite");
  transaction.objectStore(META_STORE).put({ id, value } satisfies StoredValueRecord<T>);
  await transactionDone(transaction);
  db.close();
}

async function getNotificationRow(userId: string, id: string) {
  const db = await openNotificationDb(userId);
  const transaction = db.transaction(NOTIFICATION_STORE, "readonly");
  const row = (await requestToPromise(
    transaction.objectStore(NOTIFICATION_STORE).get(id)
  )) as NotificationWithRelations | undefined;
  db.close();
  return row ?? null;
}

async function putNotificationRow(userId: string, notification: NotificationWithRelations) {
  const db = await openNotificationDb(userId);
  const transaction = db.transaction(NOTIFICATION_STORE, "readwrite");
  transaction.objectStore(NOTIFICATION_STORE).put(notification);
  await transactionDone(transaction);
  db.close();
}

async function removeNotificationRow(userId: string, id: string) {
  const db = await openNotificationDb(userId);
  const transaction = db.transaction(NOTIFICATION_STORE, "readwrite");
  transaction.objectStore(NOTIFICATION_STORE).delete(id);
  await transactionDone(transaction);
  db.close();
}

async function getAllNotificationRows(userId: string) {
  const db = await openNotificationDb(userId);
  const transaction = db.transaction(NOTIFICATION_STORE, "readonly");
  const rows = (await requestToPromise(
    transaction.objectStore(NOTIFICATION_STORE).getAll()
  )) as NotificationWithRelations[];
  db.close();
  return rows;
}

function sortNotificationsDescending(records: NotificationWithRelations[]) {
  return [...records].sort((left, right) => right.created_at.localeCompare(left.created_at));
}

export async function saveLocalNotifications(
  userId: string,
  notifications: NotificationWithRelations[]
) {
  for (const notification of notifications) {
    const deleted = await getMetaValue<boolean>(userId, `deleted:${notification.id}`);

    if (deleted) {
      continue;
    }

    const existing = await getNotificationRow(userId, notification.id);

    await putNotificationRow(userId, {
      ...notification,
      is_read: existing?.is_read ?? notification.is_read,
    });
  }
}

export async function listLocalNotifications(userId: string, limit = 24) {
  const notifications = await getAllNotificationRows(userId);
  return sortNotificationsDescending(notifications).slice(0, limit);
}

export async function markLocalNotificationsAsRead(userId: string) {
  const notifications = await getAllNotificationRows(userId);

  for (const notification of notifications) {
    if (notification.is_read) {
      continue;
    }

    await putNotificationRow(userId, {
      ...notification,
      is_read: true,
    });
  }
}

export async function deleteLocalNotification(userId: string, notificationId: string) {
  await Promise.all([
    removeNotificationRow(userId, notificationId),
    setMetaValue(userId, `deleted:${notificationId}`, true),
  ]);
}
