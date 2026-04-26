import { Capacitor } from "@capacitor/core";
import { Filesystem } from "@capacitor/filesystem";
import { requestNotificationPermission } from "./capacitorNotifications";

function isAndroidNative() {
  return Capacitor.isNativePlatform() && Capacitor.getPlatform() === "android";
}

export async function ensureAndroidFileAccessPermission() {
  if (!isAndroidNative()) {
    return true;
  }

  try {
    const current = await Filesystem.checkPermissions();

    if (current.publicStorage === "granted") {
      return true;
    }

    const requested = await Filesystem.requestPermissions();
    return requested.publicStorage === "granted";
  } catch (error) {
    console.warn("[AndroidPermissions] Could not verify file access permission.", error);
    return false;
  }
}

let startupPermissionRequest: Promise<void> | null = null;

export function warmAndroidStartupPermissions() {
  if (!isAndroidNative()) {
    return Promise.resolve();
  }

  if (!startupPermissionRequest) {
    startupPermissionRequest = (async () => {
      await requestNotificationPermission().catch((error) => {
        console.warn("[AndroidPermissions] Notification permission request failed.", error);
      });

      await ensureAndroidFileAccessPermission().catch((error) => {
        console.warn("[AndroidPermissions] File access permission request failed.", error);
      });
    })().finally(() => {
      startupPermissionRequest = null;
    });
  }

  return startupPermissionRequest;
}
