import { create } from "zustand";
import {
  loadCoinAccess,
  loadCoinFeatureSettings,
  loadCoinWallet,
} from "../lib/coins";
import type {
  CoinFeatureAccessRow,
  CoinFeatureSettingRow,
  CoinWalletRow,
} from "../types/database";

interface CoinWalletStore {
  currentUserId: string | null;
  fullyHydratedUserId: string | null;
  wallet: CoinWalletRow | null;
  featureSettings: CoinFeatureSettingRow[];
  activeAccess: CoinFeatureAccessRow[];
  loading: boolean;
  hydrateWalletPreviewForUser: (userId: string | null | undefined) => Promise<void>;
  hydrateForUser: (userId: string | null | undefined) => Promise<void>;
  refreshWallet: () => Promise<void>;
  refreshFeatureSettings: () => Promise<void>;
  refreshAccess: () => Promise<void>;
  reset: () => void;
}

let featureSettingsCache: CoinFeatureSettingRow[] | null = null;
let featureSettingsLoadedAt = 0;
let featureSettingsPromise: Promise<CoinFeatureSettingRow[]> | null = null;
const FEATURE_SETTINGS_CACHE_TTL_MS = 5 * 60 * 1000;

async function loadCachedFeatureSettings(force = false) {
  const now = Date.now();

  if (!force && featureSettingsCache && now - featureSettingsLoadedAt < FEATURE_SETTINGS_CACHE_TTL_MS) {
    return featureSettingsCache;
  }

  if (!featureSettingsPromise) {
    featureSettingsPromise = loadCoinFeatureSettings()
      .then((settings) => {
        featureSettingsCache = settings;
        featureSettingsLoadedAt = Date.now();
        return settings;
      })
      .finally(() => {
        featureSettingsPromise = null;
      });
  }

  return featureSettingsPromise;
}

export const useCoinWalletStore = create<CoinWalletStore>((set, get) => ({
  currentUserId: null,
  fullyHydratedUserId: null,
  wallet: null,
  featureSettings: [],
  activeAccess: [],
  loading: false,
  hydrateWalletPreviewForUser: async (userId) => {
    if (!userId) {
      set({
        currentUserId: null,
        fullyHydratedUserId: null,
        wallet: null,
        featureSettings: [],
        activeAccess: [],
        loading: false,
      });
      return;
    }

    const current = get();
    if (current.currentUserId === userId && current.wallet !== null) {
      return;
    }

    try {
      const wallet = await loadCoinWallet(userId);
      set((state) => ({
        ...state,
        currentUserId: userId,
        wallet,
      }));
    } catch {
      set((state) => ({
        ...state,
        currentUserId: userId,
        wallet: state.currentUserId === userId ? state.wallet : null,
      }));
    }
  },
  hydrateForUser: async (userId) => {
    if (!userId) {
      set({
        currentUserId: null,
        fullyHydratedUserId: null,
        wallet: null,
        featureSettings: [],
        activeAccess: [],
        loading: false,
      });
      return;
    }

    const current = get();
    if (current.fullyHydratedUserId === userId && !current.loading) {
      return;
    }

    set({ currentUserId: userId, loading: true });

    const [walletResult, featureSettingsResult, accessResult] = await Promise.allSettled([
      loadCoinWallet(userId),
      loadCachedFeatureSettings(),
      loadCoinAccess(userId),
    ]);

    set({
      currentUserId: userId,
      fullyHydratedUserId: userId,
      wallet: walletResult.status === "fulfilled" ? walletResult.value : null,
      featureSettings: featureSettingsResult.status === "fulfilled" ? featureSettingsResult.value : [],
      activeAccess: accessResult.status === "fulfilled" ? accessResult.value : [],
      loading: false,
    });
  },
  refreshWallet: async () => {
    const userId = get().currentUserId;
    if (!userId) {
      return;
    }

    const wallet = await loadCoinWallet(userId);
    set({ wallet });
  },
  refreshFeatureSettings: async () => {
    const featureSettings = await loadCachedFeatureSettings(true);
    set({ featureSettings });
  },
  refreshAccess: async () => {
    const userId = get().currentUserId;
    if (!userId) {
      return;
    }

    const activeAccess = await loadCoinAccess(userId);
    set({ activeAccess });
  },
  reset: () => {
    set({
      currentUserId: null,
      fullyHydratedUserId: null,
      wallet: null,
      featureSettings: [],
      activeAccess: [],
      loading: false,
    });
  },
}));
