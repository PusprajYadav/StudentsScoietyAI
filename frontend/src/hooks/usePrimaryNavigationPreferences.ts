import { useMemo, useSyncExternalStore } from "react";
import {
  DEFAULT_PRIMARY_NAVIGATION_IDS,
  PRIMARY_NAVIGATION_VALID_IDS,
  createPrimaryNavigationCatalog,
  ensurePrimaryNavigationIds,
  movePrimaryNavigationItem,
  type PrimaryNavigationId,
} from "../lib/primaryNavigation";

const STORAGE_KEY = "student-society:primary-navigation:v1";

interface StoredPrimaryNavigationPreferences {
  selectedIds?: string[];
  order?: string[];
}

interface PrimaryNavigationPreferencesState {
  selectedIds: PrimaryNavigationId[];
}

const DEFAULT_STATE: PrimaryNavigationPreferencesState = {
  selectedIds: [...DEFAULT_PRIMARY_NAVIGATION_IDS],
};

const listeners = new Set<() => void>();
let storageSyncAttached = false;
let storeState = readStoredState();

function parseStoredPreferences(value: string | null): StoredPrimaryNavigationPreferences {
  if (!value) {
    return {};
  }

  try {
    const parsed = JSON.parse(value) as unknown;
    return typeof parsed === "object" && parsed !== null
      ? (parsed as StoredPrimaryNavigationPreferences)
      : {};
  } catch {
    return {};
  }
}

function normalizeState(
  candidate: StoredPrimaryNavigationPreferences | PrimaryNavigationPreferencesState
): PrimaryNavigationPreferencesState {
  return {
    selectedIds: ensurePrimaryNavigationIds(
      candidate.selectedIds || candidate.order || DEFAULT_STATE.selectedIds
    ),
  };
}

function readStoredState(): PrimaryNavigationPreferencesState {
  if (typeof window === "undefined") {
    return DEFAULT_STATE;
  }

  return normalizeState(parseStoredPreferences(window.localStorage.getItem(STORAGE_KEY)));
}

function persistState(state: PrimaryNavigationPreferencesState) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function emitChange() {
  listeners.forEach((listener) => listener());
}

function setStoreState(nextState: PrimaryNavigationPreferencesState) {
  storeState = normalizeState(nextState);
  persistState(storeState);
  emitChange();
}

function ensureStorageSync() {
  if (storageSyncAttached || typeof window === "undefined") {
    return;
  }

  window.addEventListener("storage", (event) => {
    if (event.key !== STORAGE_KEY) {
      return;
    }

    storeState = normalizeState(parseStoredPreferences(event.newValue));
    emitChange();
  });

  storageSyncAttached = true;
}

function subscribe(listener: () => void) {
  ensureStorageSync();
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot() {
  return storeState;
}

function updateSelectedIds(
  updater: (current: PrimaryNavigationId[]) => PrimaryNavigationId[]
) {
  setStoreState({
    selectedIds: updater(storeState.selectedIds),
  });
}

export function usePrimaryNavigationPreferences(profilePath: string) {
  const state = useSyncExternalStore(subscribe, getSnapshot, () => DEFAULT_STATE);
  const catalog = useMemo(
    () => createPrimaryNavigationCatalog(profilePath),
    [profilePath]
  );
  const catalogById = useMemo(
    () => new Map(catalog.map((item) => [item.id, item])),
    [catalog]
  );
  const selectedItems = useMemo(
    () =>
      ensurePrimaryNavigationIds(state.selectedIds)
        .map((id) => catalogById.get(id))
        .filter((item) => Boolean(item)),
    [catalogById, state.selectedIds]
  );
  const selectedIdSet = useMemo(
    () => new Set(state.selectedIds),
    [state.selectedIds]
  );
  const availableItems = useMemo(
    () => catalog.filter((item) => !selectedIdSet.has(item.id)),
    [catalog, selectedIdSet]
  );
  const hasCustomNavigation = useMemo(
    () =>
      state.selectedIds.join("|") !== DEFAULT_PRIMARY_NAVIGATION_IDS.join("|"),
    [state.selectedIds]
  );

  function addItem(id: string) {
    if (!PRIMARY_NAVIGATION_VALID_IDS.includes(id as PrimaryNavigationId)) {
      return;
    }

    updateSelectedIds((current) => {
      const normalized = ensurePrimaryNavigationIds(current);

      if (normalized.includes(id as PrimaryNavigationId)) {
        return normalized;
      }

      return [...normalized, id as PrimaryNavigationId];
    });
  }

  function removeItem(id: string) {
    updateSelectedIds((current) => {
      const normalized = ensurePrimaryNavigationIds(current);

      if (normalized.length <= 1) {
        return normalized;
      }

      return normalized.filter((entryId) => entryId !== id);
    });
  }

  function moveItem(id: string, direction: -1 | 1) {
    updateSelectedIds((current) => {
      const normalized = ensurePrimaryNavigationIds(current);
      const fromIndex = normalized.indexOf(id as PrimaryNavigationId);

      return movePrimaryNavigationItem(
        normalized,
        fromIndex,
        fromIndex + direction
      );
    });
  }

  function resetNavigation() {
    setStoreState(DEFAULT_STATE);
  }

  return {
    selectedIds: state.selectedIds,
    selectedItems,
    availableItems,
    hasCustomNavigation,
    addItem,
    removeItem,
    moveItem,
    resetNavigation,
  };
}
