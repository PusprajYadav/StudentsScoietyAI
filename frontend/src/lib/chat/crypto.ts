const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

export interface WrappedEncryptionPayload {
  algorithm: "RSA-OAEP/AES-GCM";
  ciphertext: string;
  iv: string;
  wrappedKey: string;
}

export interface SharedEncryptedBytesPayload {
  ciphertext: string;
  iv: string;
  sessionKey: CryptoKey;
}

function toUint8Array(input: ArrayBuffer | Uint8Array) {
  return input instanceof Uint8Array ? input : new Uint8Array(input);
}

export function base64FromArrayBuffer(input: ArrayBuffer | Uint8Array) {
  const bytes = toUint8Array(input);
  let binary = "";

  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });

  return window.btoa(binary);
}

export function arrayBufferFromBase64(value: string) {
  const binary = window.atob(value);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return bytes.buffer;
}

export function randomId() {
  return crypto.randomUUID();
}

export async function generateDeviceEncryptionKeyPair() {
  return crypto.subtle.generateKey(
    {
      name: "RSA-OAEP",
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: "SHA-256",
    },
    true,
    ["wrapKey", "unwrapKey"]
  ) as Promise<CryptoKeyPair>;
}

export async function generateLocalEncryptionKey() {
  return crypto.subtle.generateKey(
    {
      name: "AES-GCM",
      length: 256,
    },
    true,
    ["encrypt", "decrypt"]
  );
}

export async function exportPublicKeyToString(publicKey: CryptoKey) {
  const jwk = await crypto.subtle.exportKey("jwk", publicKey);
  return JSON.stringify(jwk);
}

export async function importPublicKeyFromString(value: string) {
  const parsed = JSON.parse(value) as JsonWebKey;

  return crypto.subtle.importKey(
    "jwk",
    parsed,
    {
      name: "RSA-OAEP",
      hash: "SHA-256",
    },
    true,
    ["wrapKey"]
  );
}

export async function exportPrivateKeyToString(privateKey: CryptoKey) {
  const jwk = await crypto.subtle.exportKey("jwk", privateKey);
  return JSON.stringify(jwk);
}

export async function importPrivateKeyFromString(value: string) {
  const parsed = JSON.parse(value) as JsonWebKey;

  return crypto.subtle.importKey(
    "jwk",
    parsed,
    {
      name: "RSA-OAEP",
      hash: "SHA-256",
    },
    true,
    ["unwrapKey"]
  );
}

export async function exportLocalKeyToString(key: CryptoKey) {
  const jwk = await crypto.subtle.exportKey("jwk", key);
  return JSON.stringify(jwk);
}

export async function importLocalKeyFromString(value: string) {
  const parsed = JSON.parse(value) as JsonWebKey;

  return crypto.subtle.importKey(
    "jwk",
    parsed,
    {
      name: "AES-GCM",
      length: 256,
    },
    true,
    ["encrypt", "decrypt"]
  );
}

async function wrapAesKeyForPublicKey(key: CryptoKey, publicKey: CryptoKey) {
  const wrappedKey = await crypto.subtle.wrapKey("raw", key, publicKey, {
    name: "RSA-OAEP",
  });

  return base64FromArrayBuffer(wrappedKey);
}

async function unwrapAesKeyWithPrivateKey(wrappedKey: string, privateKey: CryptoKey) {
  return crypto.subtle.unwrapKey(
    "raw",
    arrayBufferFromBase64(wrappedKey),
    privateKey,
    {
      name: "RSA-OAEP",
    },
    {
      name: "AES-GCM",
      length: 256,
    },
    false,
    ["decrypt"]
  );
}

async function encryptBytesWithEphemeralKey(
  bytes: ArrayBuffer | Uint8Array,
  publicKey: CryptoKey
): Promise<WrappedEncryptionPayload> {
  const sessionKey = await crypto.subtle.generateKey(
    {
      name: "AES-GCM",
      length: 256,
    },
    true,
    ["encrypt", "decrypt"]
  );
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv,
    },
    sessionKey,
    bytes
  );

  return {
    algorithm: "RSA-OAEP/AES-GCM",
    ciphertext: base64FromArrayBuffer(ciphertext),
    iv: base64FromArrayBuffer(iv),
    wrappedKey: await wrapAesKeyForPublicKey(sessionKey, publicKey),
  };
}

export async function encryptJsonForPublicKey(value: unknown, publicKeyString: string) {
  const publicKey = await importPublicKeyFromString(publicKeyString);
  return encryptBytesWithEphemeralKey(textEncoder.encode(JSON.stringify(value)), publicKey);
}

export async function encryptBytesForPublicKey(bytes: ArrayBuffer, publicKeyString: string) {
  const publicKey = await importPublicKeyFromString(publicKeyString);
  return encryptBytesWithEphemeralKey(bytes, publicKey);
}

export async function encryptBytesWithSharedKey(bytes: ArrayBuffer): Promise<SharedEncryptedBytesPayload> {
  const sessionKey = await crypto.subtle.generateKey(
    {
      name: "AES-GCM",
      length: 256,
    },
    true,
    ["encrypt", "decrypt"]
  );
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv,
    },
    sessionKey,
    bytes
  );

  return {
    ciphertext: base64FromArrayBuffer(ciphertext),
    iv: base64FromArrayBuffer(iv),
    sessionKey,
  };
}

export async function wrapEncryptionKeyForPublicKey(
  sessionKey: CryptoKey,
  publicKeyString: string
) {
  const publicKey = await importPublicKeyFromString(publicKeyString);
  return wrapAesKeyForPublicKey(sessionKey, publicKey);
}

export async function decryptJsonWithPrivateKey(
  payload: WrappedEncryptionPayload,
  privateKey: CryptoKey
) {
  const key = await unwrapAesKeyWithPrivateKey(payload.wrappedKey, privateKey);
  const decrypted = await crypto.subtle.decrypt(
    {
      name: "AES-GCM",
      iv: arrayBufferFromBase64(payload.iv),
    },
    key,
    arrayBufferFromBase64(payload.ciphertext)
  );

  return JSON.parse(textDecoder.decode(decrypted)) as Record<string, unknown>;
}

export async function decryptBytesWithPrivateKey(
  payload: WrappedEncryptionPayload,
  privateKey: CryptoKey
) {
  return decryptCiphertextWithWrappedKey(
    arrayBufferFromBase64(payload.ciphertext),
    payload.iv,
    payload.wrappedKey,
    privateKey
  );
}

export async function decryptCiphertextWithWrappedKey(
  ciphertext: ArrayBuffer,
  iv: string,
  wrappedKey: string,
  privateKey: CryptoKey
) {
  const key = await unwrapAesKeyWithPrivateKey(wrappedKey, privateKey);
  return crypto.subtle.decrypt(
    {
      name: "AES-GCM",
      iv: arrayBufferFromBase64(iv),
    },
    key,
    ciphertext
  );
}

export async function encryptJsonWithLocalKey(value: unknown, key: CryptoKey) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv,
    },
    key,
    textEncoder.encode(JSON.stringify(value))
  );

  return {
    iv: base64FromArrayBuffer(iv),
    ciphertext: base64FromArrayBuffer(ciphertext),
  };
}

export async function decryptJsonWithLocalKey(
  payload: { iv: string; ciphertext: string },
  key: CryptoKey
) {
  const decrypted = await crypto.subtle.decrypt(
    {
      name: "AES-GCM",
      iv: arrayBufferFromBase64(payload.iv),
    },
    key,
    arrayBufferFromBase64(payload.ciphertext)
  );

  return JSON.parse(textDecoder.decode(decrypted)) as Record<string, unknown>;
}

export async function encryptBytesWithLocalKey(bytes: ArrayBuffer, key: CryptoKey) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv,
    },
    key,
    bytes
  );

  return {
    iv: base64FromArrayBuffer(iv),
    ciphertext: base64FromArrayBuffer(ciphertext),
  };
}

export async function decryptBytesWithLocalKey(
  payload: { iv: string; ciphertext: string },
  key: CryptoKey
) {
  return crypto.subtle.decrypt(
    {
      name: "AES-GCM",
      iv: arrayBufferFromBase64(payload.iv),
    },
    key,
    arrayBufferFromBase64(payload.ciphertext)
  );
}
