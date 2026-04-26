interface ActionRateLimitWindow {
  maxAttempts: number;
  windowMs: number;
}

interface ActionRateLimitRule {
  action: string;
  actionLabel: string;
  cooldownMs?: number;
  windows?: ActionRateLimitWindow[];
}

interface PersistedEntry {
  attempts: number[];
  cooldownUntil?: number;
}

type PersistedState = Record<string, PersistedEntry>;

const ACTION_RATE_LIMIT_STORAGE_KEY = "student-society:action-rate-limits:v1";

function canUseStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function readState(): PersistedState {
  if (!canUseStorage()) {
    return {};
  }

  try {
    const raw = window.localStorage.getItem(ACTION_RATE_LIMIT_STORAGE_KEY);
    if (!raw) {
      return {};
    }

    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? (parsed as PersistedState) : {};
  } catch {
    return {};
  }
}

function writeState(state: PersistedState) {
  if (!canUseStorage()) {
    return;
  }

  try {
    window.localStorage.setItem(ACTION_RATE_LIMIT_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Ignore storage failures so auth flows fail open instead of trapping users.
  }
}

function formatWaitTime(ms: number) {
  const totalSeconds = Math.max(1, Math.ceil(ms / 1000));
  if (totalSeconds < 60) {
    return `${totalSeconds} second${totalSeconds === 1 ? "" : "s"}`;
  }

  const totalMinutes = Math.ceil(totalSeconds / 60);
  if (totalMinutes < 60) {
    return `${totalMinutes} minute${totalMinutes === 1 ? "" : "s"}`;
  }

  const totalHours = Math.ceil(totalMinutes / 60);
  return `${totalHours} hour${totalHours === 1 ? "" : "s"}`;
}

function buildScopedKey(action: string, scope?: string) {
  const normalizedScope = (scope || "").trim().toLowerCase();
  return normalizedScope ? `${action}:${normalizedScope}` : action;
}

export function enforceActionRateLimit(rule: ActionRateLimitRule, scope?: string) {
  const now = Date.now();
  const key = buildScopedKey(rule.action, scope);
  const state = readState();
  const entry = state[key] || { attempts: [] };
  const maxWindowMs = Math.max(rule.cooldownMs || 0, ...(rule.windows || []).map((window) => window.windowMs), 0);
  const attempts = entry.attempts
    .filter((timestamp) => Number.isFinite(timestamp) && now - timestamp < maxWindowMs)
    .sort((left, right) => left - right);

  if (entry.cooldownUntil && entry.cooldownUntil > now) {
    throw new Error(`Please wait ${formatWaitTime(entry.cooldownUntil - now)} before ${rule.actionLabel}.`);
  }

  for (const window of rule.windows || []) {
    const recentAttempts = attempts.filter((timestamp) => now - timestamp < window.windowMs);
    if (recentAttempts.length >= window.maxAttempts) {
      const oldestAttempt = recentAttempts[0];
      const retryAfterMs = Math.max(1000, window.windowMs - (now - oldestAttempt));
      throw new Error(`Please wait ${formatWaitTime(retryAfterMs)} before ${rule.actionLabel}.`);
    }
  }

  attempts.push(now);
  state[key] = {
    attempts,
    cooldownUntil: rule.cooldownMs ? now + rule.cooldownMs : undefined,
  };
  writeState(state);
}
