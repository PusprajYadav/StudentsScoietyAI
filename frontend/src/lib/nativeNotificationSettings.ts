import { Capacitor, registerPlugin } from "@capacitor/core";

interface NativeNotificationSettingsPlugin {
  openAppNotificationSettings(): Promise<void>;
}

const NativeNotificationSettings = registerPlugin<NativeNotificationSettingsPlugin>(
  "NativeNotificationSettings"
);

export async function openNativeNotificationSettings() {
  if (!Capacitor.isNativePlatform()) {
    return false;
  }

  await NativeNotificationSettings.openAppNotificationSettings();
  return true;
}
