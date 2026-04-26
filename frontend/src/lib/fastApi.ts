function isLoopbackHost(hostname: string) {
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";
}

function normalizeUrl(value: unknown) {
  return typeof value === "string" && value.trim()
    ? value.trim().replace(/\/$/, "")
    : null;
}

function getRuntimeLocation() {
  if (typeof window === "undefined") {
    return null;
  }

  return window.location;
}

function shouldUseDevProxy(proxyPrefix: string) {
  const location = getRuntimeLocation();

  if (!import.meta.env.DEV || !location || !proxyPrefix) {
    return false;
  }

  return location.protocol === "http:" || location.protocol === "https:";
}

function isUsableDirectUrl(value: string | null) {
  if (!value) {
    return false;
  }

  const location = getRuntimeLocation();

  try {
    const parsed = new URL(value);

    if (!location) {
      return true;
    }

    const currentIsLoopback = isLoopbackHost(location.hostname);
    const candidateIsLoopback = isLoopbackHost(parsed.hostname);

    if (!currentIsLoopback && candidateIsLoopback) {
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

function getConfiguredFastApiBaseUrls(envKeys: string[]) {
  return envKeys
    .map((key) => normalizeUrl(import.meta.env[key]))
    .filter((value, index, array): value is string => Boolean(value) && array.indexOf(value) === index);
}

function looksLikeConnectionFailureMessage(message: string) {
  const normalized = message.trim().toLowerCase();
  return (
    normalized.includes("failed to fetch") ||
    normalized.includes("load failed") ||
    normalized.includes("networkerror") ||
    normalized.includes("network request failed")
  );
}

export class FastApiConnectionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "FastApiConnectionError";
  }
}

export function isFastApiConnectionError(error: unknown) {
  if (error instanceof FastApiConnectionError) {
    return true;
  }

  if (error instanceof TypeError) {
    return true;
  }

  return error instanceof Error && looksLikeConnectionFailureMessage(error.message);
}

export function getFastApiUnavailableMessage(featureName: string) {
  return `${featureName} backend is unreachable. Start \`npm run dev:backend\` for local development or check the FastAPI base URL.`;
}

export function resolveFastApiBaseUrls(input: {
  proxyPrefix: string;
  envKeys: string[];
  errorMessage: string;
}) {
  const configuredCandidates = getConfiguredFastApiBaseUrls(input.envKeys);
  const directCandidates = configuredCandidates.filter((candidate) => isUsableDirectUrl(candidate));
  const candidates = [...directCandidates];

  if (
    shouldUseDevProxy(input.proxyPrefix) &&
    configuredCandidates.length > 0 &&
    !candidates.includes(input.proxyPrefix)
  ) {
    candidates.unshift(input.proxyPrefix);
  }

  if (candidates.length > 0) {
    return candidates;
  }

  throw new Error(input.errorMessage);
}

export function resolveFastApiBaseUrl(input: {
  proxyPrefix: string;
  envKeys: string[];
  errorMessage: string;
}) {
  return resolveFastApiBaseUrls(input)[0];
}
