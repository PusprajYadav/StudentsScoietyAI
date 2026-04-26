import { create } from "zustand";
import { StatusBar, StatusBarStyle } from "@capacitor/status-bar";
import { Capacitor } from "@capacitor/core";
import { Preferences } from "@capacitor/preferences";
import type { ThemePreference } from "../types/database";

type ResolvedTheme = "light" | "dark";

const DEFAULT_THEME: ThemePreference = "light";
const THEME_KEY = "student-society-theme";
const THEME_META_LIGHT = "#f6f8fc";
const THEME_META_DARK = "#000000";

interface ThemeStore {
  theme: ThemePreference;
  resolvedTheme: ResolvedTheme;
  initTheme: () => Promise<void>;
  setTheme: (nextTheme: ThemePreference) => Promise<void>;
}

const getSystemTheme = (): ResolvedTheme => {
  if (typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches) {
    return "dark";
  }

  return "light";
};

const resolveTheme = (theme: ThemePreference): ResolvedTheme => {
  if (theme === "system") {
    return getSystemTheme();
  }

  return theme;
};

const applyTheme = (theme: ResolvedTheme) => {
  const root = document.documentElement;
  root.classList.toggle("dark", theme === "dark");
  root.style.setProperty("color-scheme", theme);
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute("content", theme === "dark" ? THEME_META_DARK : THEME_META_LIGHT);

  // Sync native status bar if on a native platform
  if (Capacitor.isNativePlatform()) {
    void (async () => {
      try {
        const statusBarStyle =
          theme === "dark" ? StatusBarStyle.Dark : StatusBarStyle.Light;

        await StatusBar.setOverlaysWebView({ overlay: true });
        await StatusBar.setBackgroundColor({ color: "#00000000" });
        await StatusBar.setStyle({
          style: statusBarStyle,
        });
      } catch (e) {
        console.error("Failed to sync StatusBar", e);
      }
    })();
  }
};
let systemThemeListenerAttached = false;

export const useThemeStore = create<ThemeStore>((set) => ({
  theme: DEFAULT_THEME,
  resolvedTheme: resolveTheme(DEFAULT_THEME),
  initTheme: async () => {
    let storedTheme: ThemePreference = DEFAULT_THEME;

    try {
      const { value } = await Preferences.get({ key: THEME_KEY });
      if (value) {
        storedTheme = value as ThemePreference;
      } else {
        // Fallback to localStorage just in case we are migrating or on web
        const legacy = localStorage.getItem(THEME_KEY);
        if (legacy) {
          storedTheme = legacy as ThemePreference;
          await Preferences.set({ key: THEME_KEY, value: legacy });
        } else {
          await Preferences.set({ key: THEME_KEY, value: DEFAULT_THEME });
        }
      }
    } catch (e) {
      console.error("Failed to load theme from preferences", e);
    }

    const resolvedTheme = resolveTheme(storedTheme);
    applyTheme(resolvedTheme);
    set({ theme: storedTheme, resolvedTheme });

    if (!systemThemeListenerAttached && typeof window !== "undefined") {
      window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", async () => {
        const { value } = await Preferences.get({ key: THEME_KEY });
        const currentTheme = (value as ThemePreference) || DEFAULT_THEME;
        const nextResolvedTheme = resolveTheme(currentTheme);
        applyTheme(nextResolvedTheme);
        set({ theme: currentTheme, resolvedTheme: nextResolvedTheme });
      });
      systemThemeListenerAttached = true;
    }
  },
  setTheme: async (nextTheme) => {
    await Preferences.set({ key: THEME_KEY, value: nextTheme });
    const resolvedTheme = resolveTheme(nextTheme);
    applyTheme(resolvedTheme);
    set({ theme: nextTheme, resolvedTheme });
  },
}));
