export const POST_TITLE_MAX_LENGTH = 50;
export const POST_CONTENT_MAX_LENGTH = 500;
export const POST_TAG_MAX_COUNT = 5;
export const POST_TAG_MAX_LENGTH = 20;
export const POST_TAG_INPUT_MAX_LENGTH = 160;

function clampLength(value: string, maxLength: number) {
  return value.slice(0, maxLength);
}

export function clampPostTitleInput(value: string) {
  return clampLength(value, POST_TITLE_MAX_LENGTH);
}

export function clampPostContentInput(value: string) {
  return clampLength(value, POST_CONTENT_MAX_LENGTH);
}

export function normalizeStoredPostTitle(value?: string | null) {
  return clampPostTitleInput(value?.trim() || "");
}

export function normalizeStoredPostContent(value?: string | null) {
  return clampPostContentInput(value?.trim() || "");
}

export function normalizePostTag(value: string) {
  return clampLength(value.replace(/^#+/, "").replace(/\s+/g, " ").trim(), POST_TAG_MAX_LENGTH);
}

export function normalizePostTags(values: string[]) {
  const normalized: string[] = [];
  const seen = new Set<string>();

  values.forEach((value) => {
    if (normalized.length >= POST_TAG_MAX_COUNT) {
      return;
    }

    const nextTag = normalizePostTag(value);

    if (!nextTag) {
      return;
    }

    const dedupeKey = nextTag.toLowerCase();
    if (seen.has(dedupeKey)) {
      return;
    }

    seen.add(dedupeKey);
    normalized.push(nextTag);
  });

  return normalized;
}
