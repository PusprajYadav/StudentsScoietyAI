import { APP_VERSION } from "./appVersion";
import { requestBackend } from "./backendApi";
import { getPlatform, isNativePlatform } from "./capacitorNotifications";

const PUSH_INSTALLATION_STORAGE_KEY = "student-society-push-installation-id";

let lastRegisteredSignature: string | null = null;

function fallbackId(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

export function getPushInstallationId() {
  if (typeof window === "undefined") {
    return fallbackId("push-installation");
  }

  const existing = window.localStorage.getItem(PUSH_INSTALLATION_STORAGE_KEY);
  if (existing) {
    return existing;
  }

  const created =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? `push-installation-${crypto.randomUUID()}`
      : fallbackId("push-installation");

  window.localStorage.setItem(PUSH_INSTALLATION_STORAGE_KEY, created);
  return created;
}

function getDeviceLabel() {
  const platform = getPlatform();

  if (platform === "android") {
    return "Android app";
  }

  if (platform === "ios") {
    return "iPhone app";
  }

  return "Native app";
}

export async function registerPushDevice(input: { userId: string; token: string }) {
  const token = input.token.trim();

  if (!isNativePlatform() || !token) {
    return;
  }

  const installationId = getPushInstallationId();
  const signature = `${input.userId}:${installationId}:${token}`;

  if (lastRegisteredSignature === signature) {
    return;
  }

  const tokenPreview = token.substring(0, 16) + "…";
  console.log(`[PushDevices] Registering push device (token=${tokenPreview}, platform=${getPlatform()}, installation=${installationId.substring(0, 20)}…)`);

  await requestBackend("/push/devices/register", {
    method: "POST",
    body: {
      installation_id: installationId,
      push_token: token,
      platform: getPlatform(),
      device_label: getDeviceLabel(),
      app_version: APP_VERSION,
    },
    auth: "required",
    featureName: "Push devices",
  });

  lastRegisteredSignature = signature;
  console.log(`[PushDevices] ✅ Push device registered successfully (token=${tokenPreview}).`);
}

export async function unregisterCurrentPushDevice() {
  if (!isNativePlatform()) {
    return;
  }
  lastRegisteredSignature = null;

  const installationId = getPushInstallationId();
  console.log(`[PushDevices] Unregistering push device (installation=${installationId.substring(0, 20)}…)`);

  await requestBackend("/push/devices/unregister", {
    method: "POST",
    body: {
      installation_id: installationId,
    },
    auth: "required",
    featureName: "Push devices",
  });

  console.log("[PushDevices] Push device unregistered successfully.");
}
