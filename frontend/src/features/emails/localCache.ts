import type { EmailMailboxOverview, EmailMessageDetail, EmailMessageListResponse } from "./types";

type EmailFolder = "inbox" | "sent" | "trash";

export const EMAIL_OVERVIEW_CACHE_MAX_AGE_MS = 1000 * 75;
export const EMAIL_FOLDER_CACHE_MAX_AGE_MS = 1000 * 90;
export const EMAIL_MESSAGE_CACHE_MAX_AGE_MS = 1000 * 60 * 5;

const STORAGE_PREFIX = "student-society-email-cache-v1";
const MESSAGE_CACHE_LIMIT = 18;
const MAX_CACHED_TEXT_LENGTH = 120_000;
const MAX_CACHED_HTML_LENGTH = 220_000;

interface CacheEnvelope<T> {
  cachedAt: number;
  value: T;
}

interface MessageIndexEntry {
  messageId: string;
  cachedAt: number;
}

function getStorage() {
  if (typeof window === "undefined") {
    return null;
  }

  return window.localStorage;
}

function readJson<T>(key: string): T | null {
  const storage = getStorage();
  if (!storage) {
    return null;
  }

  try {
    const rawValue = storage.getItem(key);
    if (!rawValue) {
      return null;
    }

    return JSON.parse(rawValue) as T;
  } catch {
    return null;
  }
}

function writeJson(key: string, value: unknown) {
  const storage = getStorage();
  if (!storage) {
    return;
  }

  try {
    storage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignore device cache write failures on storage-constrained browsers.
  }
}

function removeJson(key: string) {
  const storage = getStorage();
  if (!storage) {
    return;
  }

  try {
    storage.removeItem(key);
  } catch {
    // Ignore storage cleanup failures.
  }
}

function isEnvelope<T>(value: unknown): value is CacheEnvelope<T> {
  if (!value || typeof value !== "object") {
    return false;
  }

  const envelope = value as CacheEnvelope<T>;
  return typeof envelope.cachedAt === "number" && "value" in envelope;
}

function readEnvelope<T>(key: string) {
  const parsed = readJson<CacheEnvelope<T>>(key);
  return isEnvelope<T>(parsed) ? parsed : null;
}

function writeEnvelope<T>(key: string, value: T) {
  writeJson(key, {
    cachedAt: Date.now(),
    value,
  } satisfies CacheEnvelope<T>);
}

function overviewKey(userId: string) {
  return `${STORAGE_PREFIX}:overview:${userId}`;
}

function folderKey(userId: string, mailboxId: string, folder: EmailFolder) {
  return `${STORAGE_PREFIX}:folder:${userId}:${mailboxId}:${folder}`;
}

function messageIndexKey(userId: string, mailboxId: string) {
  return `${STORAGE_PREFIX}:messages:${userId}:${mailboxId}:index`;
}

function messageKey(userId: string, mailboxId: string, messageId: string) {
  return `${STORAGE_PREFIX}:messages:${userId}:${mailboxId}:${messageId}`;
}

function limitCachedText(value: string, maxLength: number) {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, maxLength)}\n\n[Truncated in device cache]`;
}

function normalizeMessageDetail(detail: EmailMessageDetail): EmailMessageDetail {
  return {
    ...detail,
    message: {
      ...detail.message,
      to_recipients: [...detail.message.to_recipients],
      cc_recipients: [...detail.message.cc_recipients],
      bcc_recipients: [...detail.message.bcc_recipients],
    },
    payload: {
      ...detail.payload,
      text: limitCachedText(detail.payload.text || "", MAX_CACHED_TEXT_LENGTH),
      html: limitCachedText(detail.payload.html || "", MAX_CACHED_HTML_LENGTH),
      attachments: [...detail.payload.attachments],
      failed_recipients: detail.payload.failed_recipients ? [...detail.payload.failed_recipients] : undefined,
      connection_profile: detail.payload.connection_profile ? { ...detail.payload.connection_profile } : undefined,
      headers: undefined,
    },
    receipts: [...detail.receipts],
  };
}

function readMessageIndex(userId: string, mailboxId: string) {
  const index = readJson<MessageIndexEntry[]>(messageIndexKey(userId, mailboxId));
  return Array.isArray(index) ? index.filter((entry) => entry && typeof entry.messageId === "string") : [];
}

function writeMessageIndex(userId: string, mailboxId: string, entries: MessageIndexEntry[]) {
  writeJson(messageIndexKey(userId, mailboxId), entries);
}

export function isEmailCacheStale(cachedAt: number | null | undefined, maxAgeMs: number) {
  if (!cachedAt) {
    return true;
  }

  return Date.now() - cachedAt > maxAgeMs;
}

export function getCachedEmailOverview(userId: string) {
  return readEnvelope<EmailMailboxOverview>(overviewKey(userId));
}

export function saveCachedEmailOverview(userId: string, overview: EmailMailboxOverview) {
  writeEnvelope(overviewKey(userId), overview);
}

export function getCachedEmailFolder(userId: string, mailboxId: string, folder: EmailFolder) {
  return readEnvelope<EmailMessageListResponse>(folderKey(userId, mailboxId, folder));
}

export function saveCachedEmailFolder(userId: string, mailboxId: string, folder: EmailFolder, response: EmailMessageListResponse) {
  writeEnvelope(folderKey(userId, mailboxId, folder), {
    ...response,
    items: [...response.items],
  });
}

export function getCachedEmailMessage(userId: string, mailboxId: string, messageId: string) {
  return readEnvelope<EmailMessageDetail>(messageKey(userId, mailboxId, messageId));
}

export function saveCachedEmailMessage(userId: string, mailboxId: string, messageId: string, detail: EmailMessageDetail) {
  const normalizedDetail = normalizeMessageDetail(detail);
  writeEnvelope(messageKey(userId, mailboxId, messageId), normalizedDetail);

  const currentIndex = readMessageIndex(userId, mailboxId);
  const nextIndex = [
    { messageId, cachedAt: Date.now() },
    ...currentIndex.filter((entry) => entry.messageId !== messageId),
  ].sort((left, right) => right.cachedAt - left.cachedAt);

  writeMessageIndex(userId, mailboxId, nextIndex.slice(0, MESSAGE_CACHE_LIMIT));

  nextIndex.slice(MESSAGE_CACHE_LIMIT).forEach((entry) => {
    removeJson(messageKey(userId, mailboxId, entry.messageId));
  });
}

export function removeCachedEmailMessage(userId: string, mailboxId: string, messageId: string) {
  removeJson(messageKey(userId, mailboxId, messageId));
  writeMessageIndex(
    userId,
    mailboxId,
    readMessageIndex(userId, mailboxId).filter((entry) => entry.messageId !== messageId)
  );
}
