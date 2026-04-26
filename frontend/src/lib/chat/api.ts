import { APP_VERSION } from "../appVersion";
import { requestBackend, requestBackendBinary } from "../backendApi";
import { useCoinWalletStore } from "../../store/coinWalletStore";
import { prepareChatImageUploadFile } from "../mediaCompression";
import {
  arrayBufferFromBase64,
  decryptCiphertextWithWrappedKey,
  decryptJsonWithPrivateKey,
  encryptBytesWithSharedKey,
  encryptJsonForPublicKey,
  exportPublicKeyToString,
  generateDeviceEncryptionKeyPair,
  generateLocalEncryptionKey,
  randomId,
  wrapEncryptionKeyForPublicKey,
} from "./crypto";
import {
  countUnreadConversations,
  ensureChatInstallationId,
  getConversationSummary,
  getLocalEncryptionKey,
  getStoredChatPrivateKey,
  getStoredChatPublicKey,
  markMessagesDelivered,
  moveRequestIntroToConversation,
  resetLocalChatState,
  saveConversationPeer,
  saveLocalEncryptionKey,
  saveLocalMessage,
  saveStoredChatKeyPair,
} from "./localStore";
import type {
  ChatBlockState,
  ChatConversationDetails,
  ChatPeerProfile,
  ChatReceiptRecord,
  ChatRequestRecord,
  ChatSummaryCounts,
  ChatTargetDetails,
  ChatMediaUploadResult,
  LocalChatAttachment,
  PulledEncryptedMessage,
} from "./types";
import type { ChatDeviceRow } from "../../types/database";

interface ChatReadyState {
  deviceId: string;
  installationId: string;
  privateKey: CryptoKey;
  publicKey: CryptoKey;
  publicKeyString: string;
  localKey: CryptoKey;
}

const readyCache = new Map<string, Promise<ChatReadyState>>();
const chatTargetCache = new Map<string, { expiresAt: number; value: ChatTargetDetails }>();
const CHAT_TARGET_CACHE_TTL_MS = 15000;

function normalizePeerProfile(record: Record<string, unknown> | null | undefined): ChatPeerProfile | null {
  if (!record || typeof record.id !== "string") {
    return null;
  }

  return {
    id: record.id,
    username: typeof record.username === "string" ? record.username : "student",
    full_name: typeof record.full_name === "string" ? record.full_name : "Student",
    avatar_url: typeof record.avatar_url === "string" ? record.avatar_url : null,
    is_verified: Boolean(record.is_verified),
    updated_at: typeof record.updated_at === "string" ? record.updated_at : null,
    online: Boolean(record.online),
    blockedByCurrentUser: Boolean(record.blocked_by_current_user),
    blockedCurrentUser: Boolean(record.blocked_current_user),
    canChat:
      typeof record.can_chat === "boolean"
        ? record.can_chat
        : !record.blocked_by_current_user && !record.blocked_current_user,
  };
}

function normalizeBlockState(record: Record<string, unknown> | null | undefined): ChatBlockState {
  const blockedByCurrentUser = Boolean(record?.blocked_by_current_user);
  const blockedCurrentUser = Boolean(record?.blocked_current_user);

  return {
    blockedByCurrentUser,
    blockedCurrentUser,
    canChat:
      typeof record?.can_chat === "boolean"
        ? record.can_chat
        : !blockedByCurrentUser && !blockedCurrentUser,
  };
}

async function fetchChatJson<T>(
  path: string,
  init: {
    method?: string;
    body?: BodyInit | Record<string, unknown> | null;
    headers?: Record<string, string>;
  } = {}
) {
  return requestBackend<T>(`/chat/${path.replace(/^\/+/, "")}`, {
    method: init.method,
    body: init.body,
    headers: init.headers,
    auth: "required",
    featureName: "Chat",
  });
}

function getChatTargetCacheKey(input: { userId?: string; username?: string }) {
  if (input.userId) {
    return `id:${input.userId}`;
  }

  if (input.username) {
    return `username:${input.username.trim().toLowerCase()}`;
  }

  return null;
}

function readCachedChatTarget(input: { userId?: string; username?: string }) {
  const key = getChatTargetCacheKey(input);

  if (!key) {
    return null;
  }

  const cached = chatTargetCache.get(key);
  if (!cached) {
    return null;
  }

  if (cached.expiresAt <= Date.now()) {
    chatTargetCache.delete(key);
    return null;
  }

  return cached.value;
}

function writeCachedChatTarget(input: { userId?: string; username?: string }, value: ChatTargetDetails) {
  const expiresAt = Date.now() + CHAT_TARGET_CACHE_TTL_MS;
  const keys = new Set<string>();
  const requestedKey = getChatTargetCacheKey(input);

  if (requestedKey) {
    keys.add(requestedKey);
  }

  if (value.profile.id) {
    keys.add(`id:${value.profile.id}`);
  }

  if (value.profile.username) {
    keys.add(`username:${value.profile.username.trim().toLowerCase()}`);
  }

  for (const key of keys) {
    chatTargetCache.set(key, { expiresAt, value });
  }
}

function invalidateCachedChatTarget(input: { userId?: string; username?: string }) {
  const key = getChatTargetCacheKey(input);

  if (key) {
    chatTargetCache.delete(key);
  }
}

function getDeviceLabel() {
  if (typeof navigator === "undefined") {
    return "Web device";
  }

  const isMobile = /android|iphone|ipad|mobile/i.test(navigator.userAgent);
  return isMobile ? "Mobile web" : "Web browser";
}

function getDevicePlatform() {
  if (typeof navigator === "undefined") {
    return "web";
  }

  return navigator.userAgentData?.platform || navigator.platform || "web";
}

async function sha256Hex(buffer: ArrayBuffer) {
  const digest = await crypto.subtle.digest("SHA-256", buffer);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

async function registerChatDevice(userId: string): Promise<ChatReadyState> {
  const installationId = await ensureChatInstallationId(userId);
  let privateKey: CryptoKey | null = null;
  let publicKey: CryptoKey | null = null;
  let localKey: CryptoKey | null = null;

  try {
    [privateKey, publicKey, localKey] = await Promise.all([
      getStoredChatPrivateKey(userId),
      getStoredChatPublicKey(userId),
      getLocalEncryptionKey(userId),
    ]);
  } catch (error) {
    console.warn("Failed to restore stored secure-chat keys. Regenerating them.", error);
    privateKey = null;
    publicKey = null;
    localKey = null;
  }

  if (!privateKey || !publicKey) {
    const pair = await generateDeviceEncryptionKeyPair();
    await saveStoredChatKeyPair(userId, pair);
    privateKey = pair.privateKey;
    publicKey = pair.publicKey;
  }

  if (!localKey) {
    localKey = await generateLocalEncryptionKey();
    await saveLocalEncryptionKey(userId, localKey);
  }

  const publicKeyString = await exportPublicKeyToString(publicKey);
  const response = await fetchChatJson<{ device: ChatDeviceRow }>("devices/register", {
    method: "POST",
    body: {
      installation_id: installationId,
      device_label: getDeviceLabel(),
      platform: getDevicePlatform(),
      app_version: APP_VERSION,
      identity_key_public: publicKeyString,
      signed_pre_key_public: publicKeyString,
      signed_pre_key_signature: "webcrypto-rsa-oaep-v1",
      signed_pre_key_id: installationId,
    },
  });

  return {
    deviceId: response.device.id,
    installationId,
    privateKey,
    publicKey,
    publicKeyString,
    localKey,
  };
}

export async function ensureChatReady(userId: string) {
  if (!readyCache.has(userId)) {
    readyCache.set(
      userId,
      registerChatDeviceWithRecovery(userId).catch((error) => {
        readyCache.delete(userId);
        throw error;
      })
    );
  }

  return readyCache.get(userId)!;
}

function clearChatReady(userId: string) {
  readyCache.delete(userId);
}

function shouldHardResetChatState(error: unknown) {
  if (error instanceof DOMException) {
    return /DataCloneError|InvalidStateError|OperationError|NotSupportedError/.test(error.name);
  }

  if (!(error instanceof Error)) {
    return false;
  }

  if (
    error.name &&
    /DataCloneError|InvalidStateError|OperationError|NotSupportedError/.test(error.name)
  ) {
    return true;
  }

  return /invalid (sender )?device|invalid chat device|could not create chat device|missing required device registration fields|missing local chat encryption key|failed to open indexeddb|indexeddb|cryptokey|secure-chat keys/i.test(
    error.message
  );
}

function shouldRetryChatSend(error: unknown) {
  if (!(error instanceof Error)) {
    return false;
  }

  return /invalid (sender )?device|invalid chat device|no valid recipient devices/i.test(error.message);
}

async function registerChatDeviceWithRecovery(userId: string): Promise<ChatReadyState> {
  try {
    return await registerChatDevice(userId);
  } catch (error) {
    if (!shouldHardResetChatState(error)) {
      throw error;
    }

    console.warn("Resetting local chat state after a device bootstrap failure.", error);
    clearChatReady(userId);
    await resetLocalChatState(userId);
    return registerChatDevice(userId);
  }
}

async function withChatReadyRecovery<T>(userId: string, task: () => Promise<T>) {
  try {
    return await task();
  } catch (error) {
    if (!shouldRetryChatSend(error)) {
      throw error;
    }

    clearChatReady(userId);
    return task();
  }
}

export async function loadChatTarget(input: { userId?: string; username?: string }) {
  const cached = readCachedChatTarget(input);

  if (cached) {
    return cached;
  }

  const query = new URLSearchParams();

  if (input.userId) {
    query.set("user_id", input.userId);
  }

  if (input.username) {
    query.set("username", input.username);
  }

  const data = await fetchChatJson<{
    profile: Record<string, unknown>;
    devices: ChatDeviceRow[];
    existing_conversation: Record<string, unknown> | null;
    can_send_request: boolean;
    online: boolean;
    block_state: Record<string, unknown> | null;
  }>(`target?${query.toString()}`);

  const profile = data.profile as ChatTargetDetails["profile"];
  const blockState = normalizeBlockState(data.block_state || null);

  const normalized = {
    profile,
    devices: (data.devices || []) as ChatDeviceRow[],
    existingConversation: (data.existing_conversation || null) as ChatTargetDetails["existingConversation"],
    canSendRequest: Boolean(data.can_send_request),
    online: Boolean(data.online),
    blockState,
  } satisfies ChatTargetDetails;

  writeCachedChatTarget(input, normalized);
  return normalized;
}

export async function loadChatConversations(userId: string) {
  await ensureChatReady(userId);
  const data = await fetchChatJson<{
    items: Array<{
      conversation: Record<string, unknown>;
      peer: Record<string, unknown>;
    }>;
  }>("conversations");

  const items = (data.items || [])
    .map((entry) => {
      const peer = normalizePeerProfile(entry.peer || null);

      if (!peer) {
        return null;
      }

      return {
        conversation: entry.conversation as ChatConversationDetails["conversation"],
        peer,
      } satisfies ChatConversationDetails;
    })
    .filter(Boolean) as ChatConversationDetails[];

  await Promise.all(items.map((entry) => saveConversationPeer(userId, entry.conversation.id, entry.peer)));
  return items;
}

function getRequestEnvelopeForCurrentDevice(
  envelope: Record<string, unknown>,
  deviceId: string
) {
  const deviceEnvelopes = Array.isArray(envelope.device_envelopes)
    ? envelope.device_envelopes
    : [];

  return deviceEnvelopes.find((entry) => {
    if (!entry || typeof entry !== "object") {
      return false;
    }

    return (entry as Record<string, unknown>).recipient_device_id === deviceId;
  }) as { payload?: Record<string, unknown> } | undefined;
}

export async function loadChatRequests(userId: string) {
  const ready = await ensureChatReady(userId);
  const data = await fetchChatJson<{
    items: Array<Record<string, unknown>>;
  }>("requests");

  const items = await Promise.all(
    (data.items || []).map(async (item) => {
      const sender = normalizePeerProfile((item.sender_profile || null) as Record<string, unknown>);
      const recipient = normalizePeerProfile((item.recipient_profile || null) as Record<string, unknown>);

      if (!sender || !recipient) {
        return null;
      }

      let decryptedIntroText: string | null = null;
      let decryptedIntroError: string | null = null;

      try {
        if ((item.direction as string) === "incoming") {
          const matched = getRequestEnvelopeForCurrentDevice(
            (item.intro_envelope || {}) as Record<string, unknown>,
            ready.deviceId
          );

          if (matched?.payload) {
            const decrypted = await decryptJsonWithPrivateKey(
              matched.payload as {
                algorithm: "RSA-OAEP/AES-GCM";
                ciphertext: string;
                iv: string;
                wrappedKey: string;
              },
              ready.privateKey
            );
            decryptedIntroText = typeof decrypted.text === "string" ? decrypted.text : null;
          }
        }
      } catch (error) {
        decryptedIntroError =
          error instanceof Error ? error.message : "Could not decrypt the request intro.";
      }

      return {
        ...(item as unknown as Omit<ChatRequestRecord, "direction" | "sender_profile" | "recipient_profile" | "decrypted_intro_text" | "decrypted_intro_error">),
        direction: (item.direction as "incoming" | "outgoing") || "incoming",
        sender_profile: sender,
        recipient_profile: recipient,
        decrypted_intro_text: decryptedIntroText,
        decrypted_intro_error: decryptedIntroError,
      } satisfies ChatRequestRecord;
    })
  );

  return items.filter(Boolean) as ChatRequestRecord[];
}

export async function createChatRequest(input: {
  currentUserId: string;
  recipientId: string;
  text: string;
}) {
  const trimmed = input.text.trim();

  if (!trimmed) {
    throw new Error("A chat request needs one message.");
  }

  return withChatReadyRecovery(input.currentUserId, async () => {
    await ensureChatReady(input.currentUserId);
    const target = await loadChatTarget({ userId: input.recipientId });

    if (target.existingConversation) {
      return {
        requestId: null,
        conversationId: target.existingConversation.id,
      };
    }

    if (!target.canSendRequest) {
      throw new Error("This user is not accepting chat requests from you right now.");
    }

    if (!target.blockState.canChat) {
      throw new Error(
        target.blockState.blockedByCurrentUser
          ? "You blocked this user. Unblock them to send a chat request."
          : "This chat is currently blocked."
      );
    }

    if (!target.devices.length) {
      throw new Error("This user has not enabled secure chat on any device yet.");
    }

    const createdAt = new Date().toISOString();
    const introMessageClientId = randomId();
    const deviceEnvelopes = await Promise.all(
      target.devices.map(async (device) => ({
        recipient_device_id: device.id,
        payload: await encryptJsonForPublicKey(
          {
            text: trimmed,
            createdAt,
            messageKind: "request_intro",
          },
          device.identity_key_public
        ),
      }))
    );

    const data = await fetchChatJson<{
      request: {
        id: string;
      };
    }>("requests", {
      method: "POST",
      body: {
        recipient_id: input.recipientId,
        intro_message_client_id: introMessageClientId,
        intro_envelope: {
          device_envelopes: deviceEnvelopes,
        },
      },
    });

    await saveLocalMessage(input.currentUserId, {
      id: `${data.request.id}:${introMessageClientId}`,
      conversationId: `request:${data.request.id}`,
      clientMessageId: introMessageClientId,
      requestId: data.request.id,
      senderId: input.currentUserId,
      recipientId: input.recipientId,
      createdAt,
      fromCurrentUser: true,
      unread: false,
      status: "sent",
      messageKind: "request_intro",
      text: trimmed,
      attachment: null,
    });

    void useCoinWalletStore.getState().refreshWallet().catch(() => undefined);

    return {
      requestId: data.request.id,
      conversationId: null,
    };
  });
}

export async function respondToChatRequest(input: {
  currentUserId: string;
  requestId: string;
  action: "accept" | "decline";
  introText?: string | null;
  peer?: ChatPeerProfile | null;
}) {
  const data = await fetchChatJson<{
    request: {
      id: string;
      status: string;
      accepted_conversation_id: string | null;
    };
  }>("requests/respond", {
    method: "POST",
    body: {
      request_id: input.requestId,
      action: input.action,
    },
  });

  if (
    input.action === "accept" &&
    data.request.accepted_conversation_id &&
    input.introText &&
    input.peer
  ) {
    await saveConversationPeer(input.currentUserId, data.request.accepted_conversation_id, input.peer);
    await saveLocalMessage(input.currentUserId, {
      id: `${input.requestId}:accepted-intro`,
      conversationId: data.request.accepted_conversation_id,
      clientMessageId: `${input.requestId}:intro`,
      requestId: input.requestId,
      senderId: input.peer.id,
      recipientId: input.currentUserId,
      createdAt: new Date().toISOString(),
      fromCurrentUser: false,
      unread: false,
      status: "delivered",
      messageKind: "request_intro",
      text: input.introText,
      attachment: null,
    });
  }

  return data.request;
}

async function uploadEncryptedChatMedia(input: {
  buffer: ArrayBuffer;
  mediaKind: "image" | "voice";
  mimeType: string;
  fileName: string;
  senderDeviceId: string;
}) {
  const encryptedSize = input.buffer.byteLength;
  const sha256 = await sha256Hex(input.buffer);
  const formData = new FormData();

  formData.append(
    "file",
    new Blob([input.buffer], {
      type: "application/octet-stream",
    }),
    `${randomId()}.bin`
  );
  formData.append("media_kind", input.mediaKind);
  formData.append("mime_type", input.mimeType);
  formData.append("file_name", input.fileName);
  formData.append("byte_size", String(encryptedSize));
  formData.append("sha256_hex", sha256);
  formData.append("sender_device_id", input.senderDeviceId);

  return fetchChatJson<{ media: ChatMediaUploadResult }>("media/upload", {
    method: "POST",
    body: formData,
  });
}

export async function sendChatMessage(input: {
  currentUserId: string;
  conversationId: string;
  peer: ChatPeerProfile;
  messageKind: "text" | "image" | "voice";
  text?: string;
  file?: File | null;
}) {
  const sendOnce = async () => {
    const ready = await ensureChatReady(input.currentUserId);
    const target = await loadChatTarget({ userId: input.peer.id });

    if (!target.blockState.canChat) {
      throw new Error(
        target.blockState.blockedByCurrentUser
          ? "You blocked this user. Unblock them to message again."
          : "This chat is currently blocked."
      );
    }

    if (!target.devices.length) {
      throw new Error("This user does not currently have an active secure-chat device.");
    }

    const createdAt = new Date().toISOString();
    const clientMessageId = randomId();
    const trimmedText = input.text?.trim() || "";
    let localAttachment: LocalChatAttachment | null = null;
    let localAttachmentBuffer: ArrayBuffer | null = null;
    let sharedMedia:
      | {
          blobId: string;
          iv: string;
          sessionKey: CryptoKey;
          mimeType: string;
          byteSize: number;
          fileName: string;
        }
      | null = null;

    if (input.messageKind !== "text") {
      if (!input.file) {
        throw new Error("A file is required for image and voice messages.");
      }

      const preparedFile =
        input.messageKind === "image" ? await prepareChatImageUploadFile(input.file) : input.file;
      const fileBuffer = await preparedFile.arrayBuffer();
      const encryptedFile = await encryptBytesWithSharedKey(fileBuffer);
      const resolvedMimeType =
        preparedFile.type || (input.messageKind === "image" ? "image/jpeg" : "audio/webm");
      const resolvedFileName = preparedFile.name || `${input.messageKind}-${clientMessageId}`;
      const upload = await uploadEncryptedChatMedia({
        buffer: arrayBufferFromBase64(encryptedFile.ciphertext),
        mediaKind: input.messageKind === "image" ? "image" : "voice",
        mimeType: resolvedMimeType,
        fileName: resolvedFileName,
        senderDeviceId: ready.deviceId,
      });

      localAttachment = {
        id: `${clientMessageId}:attachment`,
        kind: input.messageKind === "image" ? "image" : "voice",
        mimeType: resolvedMimeType,
        byteSize: preparedFile.size,
        fileName: resolvedFileName,
      };
      localAttachmentBuffer = fileBuffer;
      sharedMedia = {
        blobId: upload.media.id,
        iv: encryptedFile.iv,
        sessionKey: encryptedFile.sessionKey,
        mimeType: resolvedMimeType,
        byteSize: preparedFile.size,
        fileName: resolvedFileName,
      };
    }

    const envelopes = await Promise.all(
      target.devices.map(async (device) => {
        if (input.messageKind === "text") {
          return {
            recipient_id: input.peer.id,
            recipient_device_id: device.id,
            message_kind: input.messageKind,
            media_blob_id: null,
            payload: await encryptJsonForPublicKey(
              {
                text: trimmedText,
                createdAt,
                messageKind: input.messageKind,
              },
              device.identity_key_public
            ),
          };
        }

        if (!sharedMedia) {
          throw new Error("A file is required for image and voice messages.");
        }

        return {
          recipient_id: input.peer.id,
          recipient_device_id: device.id,
          message_kind: input.messageKind,
          media_blob_id: sharedMedia.blobId,
          payload: await encryptJsonForPublicKey(
            {
              text: trimmedText || null,
              createdAt,
              messageKind: input.messageKind,
              media: {
                blobId: sharedMedia.blobId,
                mimeType: sharedMedia.mimeType,
                byteSize: sharedMedia.byteSize,
                fileName: sharedMedia.fileName,
                decrypt: {
                  iv: sharedMedia.iv,
                  wrappedKey: await wrapEncryptionKeyForPublicKey(
                    sharedMedia.sessionKey,
                    device.identity_key_public
                  ),
                },
              },
            },
            device.identity_key_public
          ),
        };
      })
    );

    await fetchChatJson<{ queued: number }>("messages/send", {
      method: "POST",
      body: {
        conversation_id: input.conversationId,
        sender_device_id: ready.deviceId,
        client_message_id: clientMessageId,
        message_kind: input.messageKind,
        envelopes,
      },
    });

    await saveConversationPeer(input.currentUserId, input.conversationId, input.peer);
    await saveLocalMessage(
      input.currentUserId,
      {
        id: `${input.conversationId}:${clientMessageId}`,
        conversationId: input.conversationId,
        clientMessageId,
        requestId: null,
        senderId: input.currentUserId,
        recipientId: input.peer.id,
        createdAt,
        fromCurrentUser: true,
        unread: false,
        status: "sent",
        messageKind: input.messageKind,
        text: trimmedText || null,
        attachment: localAttachment,
      },
      localAttachmentBuffer
    );

    return {
      id: `${input.conversationId}:${clientMessageId}`,
      clientMessageId,
    };
  };

  try {
    return await sendOnce();
  } catch (error) {
    if (!shouldRetryChatSend(error)) {
      throw error;
    }

    clearChatReady(input.currentUserId);
    invalidateCachedChatTarget({ userId: input.peer.id });
    return sendOnce();
  }
}

async function downloadEncryptedMedia(blobId: string) {
  return requestBackendBinary(`/chat/media/${encodeURIComponent(blobId)}`, {
    auth: "required",
    featureName: "Chat media",
  });
}

export async function pullPendingMessages(currentUserId: string) {
  return withChatReadyRecovery(currentUserId, async () => {
    const ready = await ensureChatReady(currentUserId);
    const data = await fetchChatJson<{
      items: PulledEncryptedMessage[];
    }>(`messages/pull?device_id=${encodeURIComponent(ready.deviceId)}`);
    const items = data.items || [];

    if (!items.length) {
      return 0;
    }

    const acknowledgements: Array<{
      envelope_id: string;
      conversation_id: string | null;
      request_id: string | null;
      client_message_id: string;
      media_blob_id: string | null;
    }> = [];
    const processedMessages = await Promise.all(
      items.map(async (entry) => {
        if (!entry.conversation_id) {
          return null;
        }

        const decrypted = await decryptJsonWithPrivateKey(
          entry.payload as {
            algorithm: "RSA-OAEP/AES-GCM";
            ciphertext: string;
            iv: string;
            wrappedKey: string;
          },
          ready.privateKey
        );

        const senderProfile = entry.sender_profile;

        let attachment: LocalChatAttachment | null = null;
        let attachmentBuffer: ArrayBuffer | null = null;
        const media = decrypted.media as
          | {
              blobId: string;
              mimeType: string;
              byteSize: number;
              fileName?: string | null;
              decrypt: {
                iv: string;
                wrappedKey: string;
              };
            }
          | undefined;

        if (media?.blobId && media.decrypt?.iv && media.decrypt?.wrappedKey) {
          const encryptedBytes = await downloadEncryptedMedia(media.blobId);
          const clearBytes = await decryptCiphertextWithWrappedKey(
            encryptedBytes,
            media.decrypt.iv,
            media.decrypt.wrappedKey,
            ready.privateKey
          );

          attachment = {
            id: `${entry.id}:attachment`,
            kind: entry.message_kind === "image" ? "image" : "voice",
            mimeType: media.mimeType,
            byteSize: media.byteSize,
            fileName: media.fileName || null,
          };
          attachmentBuffer = clearBytes;
        }

        return {
          entry,
          senderProfile,
          message: {
            id: `${entry.conversation_id}:${entry.client_message_id}`,
            conversationId: entry.conversation_id,
            clientMessageId: entry.client_message_id,
            requestId: entry.request_id,
            senderId: entry.sender_id,
            recipientId: entry.recipient_id,
            createdAt: entry.sent_at,
            fromCurrentUser: false,
            unread: true,
            status: "delivered" as const,
            messageKind:
              entry.message_kind === "image" ? "image" : entry.message_kind === "voice" ? "voice" : "text",
            text: (typeof decrypted.text === "string" ? decrypted.text : null) || null,
            attachment,
          },
          attachmentBuffer,
        };
      })
    );

    await Promise.all(
      processedMessages.map(async (processed) => {
        if (!processed) {
          return;
        }

        if (processed.senderProfile) {
          await saveConversationPeer(
            currentUserId,
            processed.message.conversationId,
            processed.senderProfile
          );
        }

        await saveLocalMessage(
          currentUserId,
          processed.message,
          processed.attachmentBuffer
        );

        acknowledgements.push({
          envelope_id: processed.entry.id,
          conversation_id: processed.entry.conversation_id,
          request_id: processed.entry.request_id,
          client_message_id: processed.entry.client_message_id,
          media_blob_id: processed.entry.media_blob_id,
        });
      })
    );

    if (acknowledgements.length) {
      await fetchChatJson<{ acknowledged: number }>("messages/ack", {
        method: "POST",
        body: {
          device_id: ready.deviceId,
          items: acknowledgements,
        },
      });
    }

    return acknowledgements.length;
  });
}

export async function loadChatReceipts(currentUserId: string) {
  return withChatReadyRecovery(currentUserId, async () => {
    await ensureChatReady(currentUserId);
    const data = await fetchChatJson<{
      items: ChatReceiptRecord[];
    }>("receipts");
    const clientMessageIds = (data.items || []).map((item) => item.client_message_id);

    await markMessagesDelivered(currentUserId, clientMessageIds);
    return data.items || [];
  });
}

export async function loadChatSummary(currentUserId: string): Promise<ChatSummaryCounts & { totalBadgeCount: number }> {
  return withChatReadyRecovery(currentUserId, async () => {
    await ensureChatReady(currentUserId);
    const unreadLocal = await countUnreadConversations(currentUserId);
    const data = await fetchChatJson<ChatSummaryCounts>("summary");

    return {
      ...data,
      totalBadgeCount: unreadLocal + data.pendingRequests,
    };
  });
}

export async function sendPresenceHeartbeat(currentUserId: string) {
  await withChatReadyRecovery(currentUserId, async () => {
    await ensureChatReady(currentUserId);
    await fetchChatJson<{ ok: boolean }>("presence", {
      method: "POST",
      body: {
        status: "online",
      },
    });
  });
}

export async function hydrateAcceptedRequestIntoConversation(input: {
  currentUserId: string;
  requestId: string;
  conversationId: string;
  peer: ChatPeerProfile;
}) {
  await moveRequestIntroToConversation(
    input.currentUserId,
    input.requestId,
    input.conversationId,
    input.peer
  );
}

export async function getUnreadLocalConversationCount(userId: string) {
  return countUnreadConversations(userId);
}

export async function getConversationPreviewState(userId: string, conversationId: string) {
  const summary = await getConversationSummary(userId, conversationId);
  return summary;
}

export async function blockChatUser(targetUserId: string) {
  const data = await fetchChatJson<{
    block_state: Record<string, unknown>;
  }>("block", {
    method: "POST",
    body: {
      target_user_id: targetUserId,
    },
  });

  return normalizeBlockState(data.block_state || null);
}

export async function unblockChatUser(targetUserId: string) {
  const data = await fetchChatJson<{
    block_state: Record<string, unknown>;
  }>("unblock", {
    method: "POST",
    body: {
      target_user_id: targetUserId,
    },
  });

  return normalizeBlockState(data.block_state || null);
}

export async function deleteChatConversation(conversationId: string) {
  const data = await fetchChatJson<{
    deleted: boolean;
  }>("conversations/delete", {
    method: "POST",
    body: {
      conversation_id: conversationId,
    },
  });

  return Boolean(data.deleted);
}

// ─── Message Reactions ───────────────────────────────────────────────

export interface ChatReaction {
  client_message_id: string;
  reactor_id: string;
  emoji: string;
  created_at: string;
}

export async function toggleMessageReaction(input: {
  conversationId: string;
  clientMessageId: string;
  emoji: string;
}): Promise<{ emoji: string | null }> {
  const data = await fetchChatJson<{
    added?: boolean;
    updated?: boolean;
    removed?: boolean;
    emoji?: string | null;
  }>("reactions/toggle", {
    method: "POST",
    body: {
      conversation_id: input.conversationId,
      client_message_id: input.clientMessageId,
      emoji: input.emoji,
      action: "toggle",
    },
  });

  return { emoji: data.removed ? null : (data.emoji ?? input.emoji) };
}

export async function loadConversationReactions(
  conversationId: string
): Promise<ChatReaction[]> {
  const data = await fetchChatJson<{
    reactions: ChatReaction[];
  }>("reactions?conversation_id=" + encodeURIComponent(conversationId), {
    method: "GET",
  });

  return data.reactions || [];
}
