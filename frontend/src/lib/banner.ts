export const DEFAULT_BANNER_PATH = "/student-society-banner.svg";

function appendMediaVersion(url: string, version?: string | null) {
  const normalizedVersion = version?.trim();

  if (!normalizedVersion) {
    return url;
  }

  return `${url}${url.includes("?") ? "&" : "?"}v=${encodeURIComponent(normalizedVersion)}`;
}

export function resolveBannerUrl(bannerUrl?: string | null, version?: string | null) {
  const trimmed = bannerUrl?.trim();
  return trimmed ? appendMediaVersion(trimmed, version) : DEFAULT_BANNER_PATH;
}
