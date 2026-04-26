import { useEffect, useMemo, useState } from "react";

interface IdentifiableItem {
  id: string;
}

function parseStoredOrder(value: string | null) {
  if (!value) {
    return [];
  }

  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
}

function normalizeOrderIds(validIds: string[], candidateIds: string[]) {
  const validSet = new Set(validIds);
  const seen = new Set<string>();
  const normalized: string[] = [];

  candidateIds.forEach((id) => {
    if (!validSet.has(id) || seen.has(id)) {
      return;
    }
    seen.add(id);
    normalized.push(id);
  });

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

export function useLocalCardOrder<T extends IdentifiableItem>(items: readonly T[], storageKey: string) {
  const defaultIds = useMemo(() => items.map((item) => item.id), [items]);
  const defaultSignature = useMemo(() => defaultIds.join("|"), [defaultIds]);

  const [orderedIds, setOrderedIds] = useState<string[]>(() => {
    if (typeof window === "undefined") {
      return defaultIds;
    }

    return normalizeOrderIds(defaultIds, parseStoredOrder(window.localStorage.getItem(storageKey)));
  });

  useEffect(() => {
    setOrderedIds((current) => normalizeOrderIds(defaultIds, current));
  }, [defaultIds, defaultSignature]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem(storageKey, JSON.stringify(normalizeOrderIds(defaultIds, orderedIds)));
  }, [defaultIds, defaultSignature, orderedIds, storageKey]);

  const orderedItems = useMemo(() => {
    const orderLookup = new Map(orderedIds.map((id, index) => [id, index]));

    return [...items].sort((left, right) => {
      const leftIndex = orderLookup.get(left.id) ?? Number.MAX_SAFE_INTEGER;
      const rightIndex = orderLookup.get(right.id) ?? Number.MAX_SAFE_INTEGER;
      return leftIndex - rightIndex;
    });
  }, [items, orderedIds]);

  const hasCustomOrder = useMemo(() => orderedIds.join("|") !== defaultSignature, [defaultSignature, orderedIds]);

  function moveItem(id: string, direction: -1 | 1) {
    setOrderedIds((current) => {
      const normalized = normalizeOrderIds(defaultIds, current);
      const fromIndex = normalized.indexOf(id);
      return moveItemInArray(normalized, fromIndex, fromIndex + direction);
    });
  }

  function resetOrder() {
    setOrderedIds(defaultIds);
  }

  return {
    orderedItems,
    moveItem,
    resetOrder,
    hasCustomOrder,
  };
}
