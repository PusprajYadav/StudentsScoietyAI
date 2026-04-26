/**
 * Capacitor Push & Local Notification bridge.
 *
 * – Requests native notification permission on app start.
 * – Registers for FCM / APNs push tokens.
 * – Forwards in-app notification payloads to the native notification tray
 *   when the app is in the foreground (local notification).
 * – Handles notification-tap deep-links back into the React Router.
 */

import { Capacitor } from "@capacitor/core";
import { PushNotifications } from "@capacitor/push-notifications";
import { LocalNotifications } from "@capacitor/local-notifications";
import { App as CapApp } from "@capacitor/app";

export const DEFAULT_NOTIFICATION_CHANNEL_ID = "student_society_alerts_v2";
export const DEFAULT_NOTIFICATION_SOUND_FILE = "notification.mp3";
const LATEST_PUSH_TOKEN_STORAGE_KEY = "student-society:latest-push-token";

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */

/** True when the app is running inside a native Capacitor shell. */
export function isNativePlatform(): boolean {
  return Capacitor.isNativePlatform();
}

/** Returns "android" | "ios" | "web". */
export function getPlatform(): string {
  return Capacitor.getPlatform();
}

/* ------------------------------------------------------------------ */
/*  Navigation helper – set by the React layer so we can deep-link    */
/* ------------------------------------------------------------------ */

type NavigateFn = (path: string) => void;
let _navigate: NavigateFn | null = null;

export function setCapacitorNavigate(fn: NavigateFn) {
  _navigate = fn;
}

function navigateTo(path: string) {
  if (_navigate) {
    _navigate(path);
  }
}

function resolveNotificationPath(
  data: Record<string, string> | undefined | null
) {
  const path = data?.path?.trim();
  if (path) {
    return path;
  }

  const route = data?.route?.trim();
  if (route) {
    return route;
  }

  return null;
}

/* ------------------------------------------------------------------ */
/*  FCM token callback (send to your backend / Supabase)              */
/* ------------------------------------------------------------------ */

type TokenCallback = (token: string) => void;
let _onToken: TokenCallback | null = null;
let _latestPushToken: string | null = readStoredPushToken();

export function setOnPushTokenReceived(cb: TokenCallback) {
  _onToken = cb;
}

export function getLatestPushToken() {
  return _latestPushToken;
}

export interface NotificationPermissionStatus {
  push: string;
  local: string;
  canNotify: boolean;
}

function readStoredPushToken() {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const storedValue = window.localStorage.getItem(LATEST_PUSH_TOKEN_STORAGE_KEY);
    return storedValue?.trim() || null;
  } catch {
    return null;
  }
}

function storeLatestPushToken(token: string | null) {
  _latestPushToken = token;

  if (typeof window === "undefined") {
    return;
  }

  try {
    if (token) {
      window.localStorage.setItem(LATEST_PUSH_TOKEN_STORAGE_KEY, token);
    } else {
      window.localStorage.removeItem(LATEST_PUSH_TOKEN_STORAGE_KEY);
    }
  } catch {
    // Ignore storage failures on restrictive WebViews.
  }
}

async function ensureAndroidNotificationChannel() {
  if (!isNativePlatform() || getPlatform() !== "android") {
    return;
  }

  try {
    await PushNotifications.createChannel({
      id: DEFAULT_NOTIFICATION_CHANNEL_ID,
      name: "Student Society Alerts",
      description: "Comments, replies, messages, and activity updates.",
      sound: DEFAULT_NOTIFICATION_SOUND_FILE,
      importance: 5,
      visibility: 1,
    });
    console.log("[CapPush] Android notification channel created/verified:", DEFAULT_NOTIFICATION_CHANNEL_ID);
  } catch (error) {
    console.error("[CapPush] Failed to create Android notification channel.", error);
  }
}

async function syncNativePushRegistration() {
  if (!isNativePlatform()) {
    return false;
  }

  const pushPermission = await PushNotifications.checkPermissions();
  console.log("[CapPush] Push permission status:", pushPermission.receive);

  if (pushPermission.receive !== "granted") {
    console.warn("[CapPush] Push permission not granted, skipping registration.");
    return false;
  }

  await ensureAndroidNotificationChannel();

  console.log("[CapPush] Calling PushNotifications.register()…");
  await PushNotifications.register();
  console.log("[CapPush] PushNotifications.register() completed.");
  return true;
}

export async function getNotificationPermissionStatus(): Promise<NotificationPermissionStatus> {
  if (!isNativePlatform()) {
    const browserPermission =
      typeof Notification === "undefined" ? "unsupported" : Notification.permission;

    return {
      push: browserPermission,
      local: browserPermission,
      canNotify: browserPermission === "granted",
    };
  }

  const [pushPermission, localPermission] = await Promise.all([
    PushNotifications.checkPermissions(),
    LocalNotifications.checkPermissions(),
  ]);

  return {
    push: pushPermission.receive,
    local: localPermission.display,
    canNotify:
      pushPermission.receive === "granted" || localPermission.display === "granted",
  };
}

/* ------------------------------------------------------------------ */
/*  Request notification permission                                    */
/* ------------------------------------------------------------------ */

export async function requestNotificationPermission(): Promise<boolean> {
  if (!isNativePlatform()) {
    // Browser – use web Notification API
    if (typeof Notification !== "undefined" && Notification.permission === "default") {
      const result = await Notification.requestPermission();
      return result === "granted";
    }
    return typeof Notification !== "undefined" && Notification.permission === "granted";
  }

  // Native
  console.log("[CapPush] Requesting native notification permissions…");
  let permStatus = await PushNotifications.checkPermissions();
  console.log("[CapPush] Current push permission:", permStatus.receive);

  if (permStatus.receive === "prompt" || permStatus.receive === "prompt-with-rationale") {
    permStatus = await PushNotifications.requestPermissions();
    console.log("[CapPush] After requesting push perms:", permStatus.receive);
  }

  // Also eagerly request LocalNotifications permission
  let localPermStatus = await LocalNotifications.checkPermissions();
  if (localPermStatus.display === "prompt" || localPermStatus.display === "prompt-with-rationale") {
    localPermStatus = await LocalNotifications.requestPermissions();
    console.log("[CapPush] After requesting local perms:", localPermStatus.display);
  }

  if (permStatus.receive === "granted" || localPermStatus.display === "granted") {
    await ensureAndroidNotificationChannel();

    if (permStatus.receive === "granted") {
      await syncNativePushRegistration();
    }
    console.log("[CapPush] Notification permissions granted, registration done.");
    return true;
  }

  console.warn("[CapPush] Notification permissions DENIED.");
  return false;
}

/* ------------------------------------------------------------------ */
/*  Fire a local notification (foreground in-app → native tray)       */
/* ------------------------------------------------------------------ */

let _localIdCounter = 1;

export async function showLocalNotification(opts: {
  title: string;
  body: string;
  data?: Record<string, string>;
}) {
  if (!isNativePlatform()) {
    // Browser fallback
    if (typeof Notification !== "undefined" && Notification.permission === "granted") {
      new Notification(opts.title, { body: opts.body, icon: "/logo.png" });
    }
    return;
  }

  // Request local notification permission (Android 13+)
  const localPerm = await LocalNotifications.checkPermissions();
  if (localPerm.display !== "granted") {
    await LocalNotifications.requestPermissions();
  }

  await LocalNotifications.schedule({
    notifications: [
      {
        id: _localIdCounter++,
        title: opts.title,
        body: opts.body,
        channelId: DEFAULT_NOTIFICATION_CHANNEL_ID,
        smallIcon: "ic_notification",
        largeIcon: "ic_launcher",
        iconColor: "#D4A017",
        extra: opts.data || {},
        sound: DEFAULT_NOTIFICATION_SOUND_FILE,
      },
    ],
  });
}

/* ------------------------------------------------------------------ */
/*  Initialise all Capacitor notification listeners                   */
/* ------------------------------------------------------------------ */

let _initialised = false;

export function initCapacitorNotifications() {
  if (_initialised || !isNativePlatform()) {
    return;
  }
  _initialised = true;

  void ensureAndroidNotificationChannel();

  // ---- Push Notifications ----

  // Token received (FCM / APNs)
  PushNotifications.addListener("registration", (token) => {
    const tokenPreview = token.value ? token.value.substring(0, 20) + "…" : "(empty)";
    console.log("[CapPush] ✅ FCM Token received:", tokenPreview, "(length=" + (token.value?.length || 0) + ")");
    storeLatestPushToken(token.value);
    if (_onToken) {
      _onToken(token.value);
    }
  });

  // Token registration error
  PushNotifications.addListener("registrationError", (err) => {
    console.error("[CapPush] ❌ Registration error:", JSON.stringify(err));
  });

  // Push received while app is in foreground
  PushNotifications.addListener("pushNotificationReceived", (notification) => {
    console.log("[CapPush] 📩 Foreground push received:", JSON.stringify({
      id: notification.id,
      title: notification.title,
      body: notification.body,
      data: notification.data,
    }));

    // Show a local notification so the user sees it
    void showLocalNotification({
      title: notification.title || "Student Society",
      body: notification.body || "You have a new notification",
      data: (notification.data as Record<string, string>) || {},
    });
  });

  // User tapped a push notification
  PushNotifications.addListener("pushNotificationActionPerformed", (action) => {
    console.log("[CapPush] 👆 Notification tapped:", JSON.stringify({
      actionId: action.actionId,
      data: action.notification.data,
    }));
    const data = action.notification.data as Record<string, string> | undefined;
    const nextPath = resolveNotificationPath(data);
    if (nextPath) {
      navigateTo(nextPath);
    }
  });

  // ---- Local Notifications ----

  // User tapped a local notification
  LocalNotifications.addListener("localNotificationActionPerformed", (action) => {
    console.log("[CapLocal] 👆 Local notification tapped:", JSON.stringify({
      actionId: action.actionId,
      extra: action.notification.extra,
    }));
    const extra = action.notification.extra as Record<string, string> | undefined;
    const nextPath = resolveNotificationPath(extra);
    if (nextPath) {
      navigateTo(nextPath);
    }
  });

  // ---- App lifecycle ----

  // Handle deep-links / app URL open / intent-based opens
  CapApp.addListener("appUrlOpen", (event) => {
    console.log("[CapApp] appUrlOpen event:", event.url);

    const url = event.url || "";

    // If the intent opened a PDF (content:// or file:// with pdf), route to PDF Tools
    if (
      url.toLowerCase().endsWith(".pdf") ||
      url.toLowerCase().includes("application/pdf") ||
      (url.startsWith("content://") && url.toLowerCase().includes("pdf"))
    ) {
      console.log("[CapApp] PDF intent detected, navigating to PDF Tools with URI:", url);
      // Encode the entire URL as a query parameter so PdfToolsApp can recover it
      const encoded = encodeURIComponent(url);
      navigateTo(`/app/tools/pdf-tools?intent_url=${encoded}`);
      return;
    }

    // Standard URL deep-link handling
    try {
      const parsed = new URL(url);
      if (parsed.pathname) {
        navigateTo(parsed.pathname);
      }
    } catch {
      // If the URL can't be parsed, check if it looks like plain text (shared via ACTION_SEND)
      if (url.trim()) {
        console.log("[CapApp] Shared text detected, navigating to QR Code Tool.");
        navigateTo("/app/tools/qr-code-tool");
      }
    }
  });

  // Back button (Android)
  CapApp.addListener("backButton", ({ canGoBack }) => {
    if (canGoBack) {
      window.history.back();
    } else {
      void CapApp.exitApp();
    }
  });

  CapApp.addListener("resume", () => {
    console.log("[CapPush] App resumed — refreshing push registration.");
    void syncNativePushRegistration().catch((error) => {
      console.warn("[CapPush] Failed to refresh push registration on resume.", error);
    });
  });

  console.log("[CapPush] Initialising push registration (platform=" + getPlatform() + ")…");
  void syncNativePushRegistration().catch((error) => {
    console.warn("[CapPush] Failed to refresh push registration during init.", error);
  });
}
