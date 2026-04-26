interface RedirectLocationLike {
  pathname: string;
  search?: string;
  hash?: string;
}

const DEFAULT_AUTH_REDIRECT = "/app/discussions/study";

export function buildRedirectTarget(location: RedirectLocationLike) {
  return `${location.pathname}${location.search || ""}${location.hash || ""}`;
}

export function buildAuthRedirectPath(location: RedirectLocationLike) {
  const params = new URLSearchParams();
  const redirectTo = buildRedirectTarget(location);

  if (redirectTo && redirectTo !== "/auth") {
    params.set("redirectTo", redirectTo);
  }

  const query = params.toString();
  return query ? `/auth?${query}` : "/auth";
}

export function resolvePostAuthPath(rawRedirectTo?: string | null) {
  if (!rawRedirectTo || !rawRedirectTo.startsWith("/")) {
    return DEFAULT_AUTH_REDIRECT;
  }

  if (rawRedirectTo.startsWith("//") || rawRedirectTo.startsWith("/auth")) {
    return DEFAULT_AUTH_REDIRECT;
  }

  return rawRedirectTo;
}
