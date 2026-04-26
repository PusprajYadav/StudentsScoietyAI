import type { CommunityRow } from "../types/database";

type ShareableCommunity = Pick<CommunityRow, "slug">;

export function getCommunityPath(community: ShareableCommunity | string) {
  const slug = typeof community === "string" ? community : community.slug;
  return `/app/communities/${slug}`;
}

export function getAbsoluteCommunityUrl(community: ShareableCommunity | string) {
  const path = getCommunityPath(community);

  if (typeof window === "undefined") {
    return path;
  }

  const { origin, hostname } = window.location;
  const isLocalHost = hostname === "localhost" || hostname === "127.0.0.1";
  const base = isLocalHost ? "https://studentsociety.in" : origin;

  try {
    return new URL(path, base).toString();
  } catch {
    return `${base}${path}`;
  }
}
