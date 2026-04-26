import { useEffect, useMemo, useState } from "react";
import {
  allWorkspaceAppIds,
  defaultMyRoomAppIds,
  toolAppIds,
  workspaceCatalogApps,
  type MyRoomApp,
  type ToolApp,
} from "../data/workspaceApps";

const STORAGE_KEY = "student-society:workspace-app-preferences:v5";
const myRoomValidIds = [...allWorkspaceAppIds];
const myRoomIdAliases: Record<string, string> = {
  "study-notes": "video_notes_maker",
};

interface StoredWorkspaceAppPreferences {
  catalogOrder?: string[];
  myRoomOrder?: string[];
  toolsOrder?: string[];
  importedAppIds?: string[];
  importedToolIds?: string[];
  hiddenMyRoomIds?: string[];
}

interface WorkspaceAppPreferencesState {
  catalogOrder: string[];
  myRoomOrder: string[];
  importedAppIds: string[];
  hiddenMyRoomIds: string[];
}

const DEFAULT_PREFERENCES: WorkspaceAppPreferencesState = {
  catalogOrder: [...allWorkspaceAppIds],
  myRoomOrder: [...myRoomValidIds],
  importedAppIds: [...defaultMyRoomAppIds],
  hiddenMyRoomIds: [],
};
const DEFAULT_TOOL_ORDER = [...toolAppIds];

function parseStoredPreferences(value: string | null): StoredWorkspaceAppPreferences {
  if (!value) {
    return {};
  }

  try {
    const parsed = JSON.parse(value) as unknown;
    return typeof parsed === "object" && parsed !== null ? (parsed as StoredWorkspaceAppPreferences) : {};
  } catch {
    return {};
  }
}

function filterUniqueIds(candidateIds: string[] | undefined, validIds: string[]) {
  if (!Array.isArray(candidateIds)) {
    return [];
  }

  const validSet = new Set(validIds);
  const seen = new Set<string>();
  const normalized: string[] = [];

  candidateIds.forEach((id) => {
    const normalizedId = typeof id === "string" ? myRoomIdAliases[id] || id : null;

    if (!normalizedId || !validSet.has(normalizedId) || seen.has(normalizedId)) {
      return;
    }

    seen.add(normalizedId);
    normalized.push(normalizedId);
  });

  return normalized;
}

function normalizeOrderIds(validIds: string[], candidateIds: string[] | undefined) {
  const normalized = filterUniqueIds(candidateIds, validIds);
  const seen = new Set(normalized);

  validIds.forEach((id) => {
    if (!seen.has(id)) {
      normalized.push(id);
    }
  });

  return normalized;
}

function moveItemInArray(items: string[], fromIndex: number, toIndex: number) {
  if (fromIndex < 0 || fromIndex >= items.length || toIndex < 0 || toIndex >= items.length) {
    return items;
  }

  const next = [...items];
  const [item] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, item);
  return next;
}

function mergeSubsetOrder(baseOrder: string[], subsetIds: string[], nextSubsetOrder: string[]) {
  const subsetIdSet = new Set(subsetIds);
  const normalizedSubsetOrder = normalizeOrderIds(subsetIds, nextSubsetOrder);
  let subsetIndex = 0;

  return baseOrder.map((id) => {
    if (!subsetIdSet.has(id)) {
      return id;
    }

    const nextId = normalizedSubsetOrder[subsetIndex];
    subsetIndex += 1;
    return nextId;
  });
}

function normalizePreferences(
  candidate: StoredWorkspaceAppPreferences | WorkspaceAppPreferencesState
): WorkspaceAppPreferencesState {
  const importedCandidate = candidate.importedAppIds ?? candidate.importedToolIds;
  const normalizedImportedAppIds = filterUniqueIds(importedCandidate, myRoomValidIds);
  const normalizedCatalogOrder = Array.isArray(candidate.catalogOrder)
    ? normalizeOrderIds(allWorkspaceAppIds, candidate.catalogOrder)
    : [...allWorkspaceAppIds.filter((id) => !toolAppIds.includes(id)), ...normalizeOrderIds(toolAppIds, candidate.toolsOrder)];

  return {
    catalogOrder: normalizedCatalogOrder,
    myRoomOrder: normalizeOrderIds(myRoomValidIds, candidate.myRoomOrder),
    importedAppIds: Array.isArray(importedCandidate)
      ? normalizedImportedAppIds
      : [...DEFAULT_PREFERENCES.importedAppIds],
    hiddenMyRoomIds: filterUniqueIds(candidate.hiddenMyRoomIds, myRoomValidIds),
  };
}

function orderItems<T extends { id: string }>(items: readonly T[], orderIds: string[]) {
  const orderLookup = new Map(orderIds.map((id, index) => [id, index]));

  return [...items].sort((left, right) => {
    const leftIndex = orderLookup.get(left.id) ?? Number.MAX_SAFE_INTEGER;
    const rightIndex = orderLookup.get(right.id) ?? Number.MAX_SAFE_INTEGER;
    return leftIndex - rightIndex;
  });
}

export function useWorkspaceAppPreferences() {
  const [preferences, setPreferences] = useState<WorkspaceAppPreferencesState>(() => {
    if (typeof window === "undefined") {
      return DEFAULT_PREFERENCES;
    }

    return normalizePreferences(parseStoredPreferences(window.localStorage.getItem(STORAGE_KEY)));
  });

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const handleStorage = (event: StorageEvent) => {
      if (event.key !== STORAGE_KEY) {
        return;
      }

      setPreferences(normalizePreferences(parseStoredPreferences(event.newValue)));
    };

    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(normalizePreferences(preferences)));
  }, [preferences]);

  const orderedCatalogApps = useMemo<MyRoomApp[]>(
    () => orderItems(workspaceCatalogApps, preferences.catalogOrder),
    [preferences.catalogOrder]
  );
  const orderedToolApps = useMemo(
    () => orderedCatalogApps.filter((app): app is ToolApp => app.kind === "tool"),
    [orderedCatalogApps]
  );

  const importedAppSet = useMemo(() => new Set(preferences.importedAppIds), [preferences.importedAppIds]);
  const hiddenMyRoomSet = useMemo(() => new Set(preferences.hiddenMyRoomIds), [preferences.hiddenMyRoomIds]);

  const managedMyRoomApps = useMemo<MyRoomApp[]>(() => {
    const importedApps = orderedCatalogApps.filter((app) => importedAppSet.has(app.id));
    return orderItems(importedApps, preferences.myRoomOrder);
  }, [importedAppSet, orderedCatalogApps, preferences.myRoomOrder]);

  const visibleMyRoomApps = useMemo(
    () => managedMyRoomApps.filter((app) => !hiddenMyRoomSet.has(app.id)),
    [hiddenMyRoomSet, managedMyRoomApps]
  );

  const importedTools = useMemo<ToolApp[]>(
    () => orderedToolApps.filter((tool) => importedAppSet.has(tool.id)),
    [importedAppSet, orderedToolApps]
  );

  const hasCustomMyRoomOrder = useMemo(
    () => preferences.myRoomOrder.join("|") !== DEFAULT_PREFERENCES.myRoomOrder.join("|"),
    [preferences.myRoomOrder]
  );
  const hasCustomCatalogOrder = useMemo(
    () => preferences.catalogOrder.join("|") !== DEFAULT_PREFERENCES.catalogOrder.join("|"),
    [preferences.catalogOrder]
  );
  const hasCustomToolOrder = useMemo(
    () => orderedToolApps.map((tool) => tool.id).join("|") !== DEFAULT_TOOL_ORDER.join("|"),
    [orderedToolApps]
  );

  function updatePreferences(
    updater: (current: WorkspaceAppPreferencesState) => WorkspaceAppPreferencesState
  ) {
    setPreferences((current) => normalizePreferences(updater(current)));
  }

  function moveMyRoomItem(id: string, direction: -1 | 1) {
    updatePreferences((current) => {
      const orderedIds = normalizeOrderIds(myRoomValidIds, current.myRoomOrder);
      const fromIndex = orderedIds.indexOf(id);

      return {
        ...current,
        myRoomOrder: moveItemInArray(orderedIds, fromIndex, fromIndex + direction),
      };
    });
  }

  function moveCatalogItem(id: string, direction: -1 | 1) {
    updatePreferences((current) => {
      const orderedIds = normalizeOrderIds(allWorkspaceAppIds, current.catalogOrder);
      const fromIndex = orderedIds.indexOf(id);

      return {
        ...current,
        catalogOrder: moveItemInArray(orderedIds, fromIndex, fromIndex + direction),
      };
    });
  }

  function resetMyRoomOrder() {
    updatePreferences((current) => ({
      ...current,
      myRoomOrder: DEFAULT_PREFERENCES.myRoomOrder,
    }));
  }

  function reorderCatalogItems(nextOrderIds: string[]) {
    updatePreferences((current) => ({
      ...current,
      catalogOrder: normalizeOrderIds(allWorkspaceAppIds, nextOrderIds),
    }));
  }

  function resetCatalogOrder() {
    updatePreferences((current) => ({
      ...current,
      catalogOrder: DEFAULT_PREFERENCES.catalogOrder,
    }));
  }

  function moveToolItem(id: string, direction: -1 | 1) {
    updatePreferences((current) => {
      const baseOrder = normalizeOrderIds(allWorkspaceAppIds, current.catalogOrder);
      const currentToolOrder = normalizeOrderIds(
        toolAppIds,
        baseOrder.filter((catalogId) => toolAppIds.includes(catalogId))
      );
      const fromIndex = currentToolOrder.indexOf(id);

      return {
        ...current,
        catalogOrder: mergeSubsetOrder(
          baseOrder,
          toolAppIds,
          moveItemInArray(currentToolOrder, fromIndex, fromIndex + direction)
        ),
      };
    });
  }

  function reorderToolItems(nextOrderIds: string[]) {
    updatePreferences((current) => ({
      ...current,
      catalogOrder: mergeSubsetOrder(
        normalizeOrderIds(allWorkspaceAppIds, current.catalogOrder),
        toolAppIds,
        nextOrderIds
      ),
    }));
  }

  function resetToolOrder() {
    updatePreferences((current) => ({
      ...current,
      catalogOrder: mergeSubsetOrder(
        normalizeOrderIds(allWorkspaceAppIds, current.catalogOrder),
        toolAppIds,
        DEFAULT_TOOL_ORDER
      ),
    }));
  }

  function importApp(appId: string) {
    if (!myRoomValidIds.includes(appId)) {
      return;
    }

    updatePreferences((current) => {
      if (current.importedAppIds.includes(appId)) {
        return {
          ...current,
          hiddenMyRoomIds: current.hiddenMyRoomIds.filter((id) => id !== appId),
        };
      }

      return {
        ...current,
        importedAppIds: [...current.importedAppIds, appId],
        hiddenMyRoomIds: current.hiddenMyRoomIds.filter((id) => id !== appId),
      };
    });
  }

  function removeImportedApp(appId: string) {
    if (!myRoomValidIds.includes(appId)) {
      return;
    }

    updatePreferences((current) => ({
      ...current,
      importedAppIds: current.importedAppIds.filter((id) => id !== appId),
      hiddenMyRoomIds: current.hiddenMyRoomIds.filter((id) => id !== appId),
    }));
  }

  function setMyRoomAppHidden(appId: string, hidden: boolean) {
    updatePreferences((current) => {
      const nextHiddenIds = hidden
        ? filterUniqueIds([...current.hiddenMyRoomIds, appId], myRoomValidIds)
        : current.hiddenMyRoomIds.filter((id) => id !== appId);

      return {
        ...current,
        hiddenMyRoomIds: nextHiddenIds,
      };
    });
  }

  function showAllMyRoomApps() {
    updatePreferences((current) => ({
      ...current,
      hiddenMyRoomIds: [],
    }));
  }

  function isAppImported(appId: string) {
    return importedAppSet.has(appId);
  }

  function isMyRoomAppHidden(appId: string) {
    return hiddenMyRoomSet.has(appId);
  }

  return {
    orderedToolApps,
    orderedCatalogApps,
    importedTools,
    managedMyRoomApps,
    visibleMyRoomApps,
    importedAppIds: preferences.importedAppIds,
    hiddenMyRoomIds: preferences.hiddenMyRoomIds,
    hasCustomMyRoomOrder,
    hasCustomCatalogOrder,
    hasCustomToolOrder,
    moveMyRoomItem,
    moveCatalogItem,
    moveToolItem,
    resetMyRoomOrder,
    reorderCatalogItems,
    reorderToolItems,
    resetCatalogOrder,
    resetToolOrder,
    importApp,
    removeImportedApp,
    isAppImported,
    isMyRoomAppHidden,
    setMyRoomAppHidden,
    showAllMyRoomApps,
  };
}
