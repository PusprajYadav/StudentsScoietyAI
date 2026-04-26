export const PRESET_AVATAR_PATHS = [
  "/student-avatars/student-avatar-01.svg",
  "/student-avatars/student-avatar-02.svg",
  "/student-avatars/student-avatar-03.svg",
  "/student-avatars/student-avatar-04.svg",
  "/student-avatars/student-avatar-05.svg",
  "/student-avatars/student-avatar-06.svg",
  "/student-avatars/student-avatar-07.svg",
  "/student-avatars/student-avatar-08.svg",
  "/student-avatars/student-avatar-09.svg",
  "/student-avatars/student-avatar-10.svg",
] as const;

const LEGACY_DEFAULT_AVATAR_PATHS = new Set(["/student-society-avatar.svg"]);

export const DEFAULT_AVATAR_PATH = PRESET_AVATAR_PATHS[0];

type AvatarIdentity = {
  id?: string | null;
  username?: string | null;
  full_name?: string | null;
};

function hashSeed(seed: string) {
  let hash = 0;

  for (let index = 0; index < seed.length; index += 1) {
    hash = (hash * 31 + seed.charCodeAt(index)) >>> 0;
  }

  return hash;
}

function appendMediaVersion(url: string, version?: string | null) {
  const normalizedVersion = version?.trim();

  if (!normalizedVersion) {
    return url;
  }

  return `${url}${url.includes("?") ? "&" : "?"}v=${encodeURIComponent(normalizedVersion)}`;
}

export function buildAvatarSeed(identity?: AvatarIdentity | null) {
  const parts = [identity?.full_name, identity?.username]
    .map((value) => value?.trim())
    .filter(Boolean);

  if (parts.length === 0 && identity?.id?.trim()) {
    return identity.id.trim();
  }

  return parts.join("|");
}

export function getSeededAvatarPath(seed?: string | null) {
  const normalizedSeed = seed?.trim() || "student-society";
  const index = hashSeed(normalizedSeed) % PRESET_AVATAR_PATHS.length;
  return PRESET_AVATAR_PATHS[index];
}

export function isPresetAvatarUrl(avatarUrl?: string | null) {
  const trimmed = avatarUrl?.trim();
  return Boolean(trimmed && PRESET_AVATAR_PATHS.includes(trimmed as (typeof PRESET_AVATAR_PATHS)[number]));
}

export function isLegacyDefaultAvatarUrl(avatarUrl?: string | null) {
  const trimmed = avatarUrl?.trim();
  return Boolean(trimmed && LEGACY_DEFAULT_AVATAR_PATHS.has(trimmed));
}

export function resolveAvatarUrl(avatarUrl?: string | null, seed?: string | null, version?: string | null) {
  const trimmed = avatarUrl?.trim();

  if (trimmed && !isLegacyDefaultAvatarUrl(trimmed)) {
    return appendMediaVersion(trimmed, version);
  }

  return getSeededAvatarPath(seed);
}
