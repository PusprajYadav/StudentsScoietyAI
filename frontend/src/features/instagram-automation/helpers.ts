import type {
  InstagramCommentDmRuleDraft,
  InstagramCommentRuleDraft,
  InstagramDmRuleDraft,
  InstagramMediaItem,
} from "./types";

export function parseInstagramKeywordInput(value: string) {
  return value
    .split(/[\n,;|]+/)
    .map((entry) => entry.trim())
    .filter(Boolean);
}

export function stringifyInstagramKeywordInput(values: string[]) {
  return values.join(", ");
}

export function formatInstagramRelativeTime(value?: string | null) {
  if (!value) {
    return "Never";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Unknown";
  }

  const diffMs = date.getTime() - Date.now();
  const diffMinutes = Math.round(diffMs / 60000);
  const formatter = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

  if (Math.abs(diffMinutes) < 60) {
    return formatter.format(diffMinutes, "minute");
  }

  const diffHours = Math.round(diffMinutes / 60);
  if (Math.abs(diffHours) < 24) {
    return formatter.format(diffHours, "hour");
  }

  const diffDays = Math.round(diffHours / 24);
  return formatter.format(diffDays, "day");
}

export function truncateInstagramText(value: string | null | undefined, maxLength: number = 90) {
  const text = (value || "").trim();
  if (text.length <= maxLength) {
    return text || "No text";
  }
  return `${text.slice(0, maxLength - 1)}…`;
}

export function buildInstagramMediaLabel(mediaId: string | null | undefined, media: InstagramMediaItem[]) {
  if (!mediaId) {
    return "Any post";
  }

  const match = media.find((entry) => entry.id === mediaId);
  if (!match) {
    return mediaId;
  }

  const caption = (match.caption || "").trim();
  return caption ? truncateInstagramText(caption, 48) : `${match.media_product_type || "Post"} ${match.id.slice(0, 8)}`;
}

export function createEmptyInstagramCommentRuleDraft(): InstagramCommentRuleDraft {
  return {
    media_id: "",
    keyword: "",
    keyword_list: [],
    match_mode: "contains_any",
    negative_keywords: [],
    reply_text: "",
    reply_variants: [],
    fallback_reply_text: "",
    is_active: true,
    priority: 100,
    delay_min_seconds: 2,
    delay_max_seconds: 5,
    daily_limit_per_sender: 1,
    cooldown_seconds: 0,
  };
}

export function createEmptyInstagramDmRuleDraft(): InstagramDmRuleDraft {
  return {
    keyword: "",
    keyword_list: [],
    match_mode: "contains_any",
    negative_keywords: [],
    reply_text: "",
    reply_variants: [],
    fallback_reply_text: "",
    is_active: true,
    priority: 100,
    delay_min_seconds: 2,
    delay_max_seconds: 5,
    daily_limit_per_sender: 1,
    cooldown_seconds: 0,
  };
}

export function createEmptyInstagramCommentDmRuleDraft(): InstagramCommentDmRuleDraft {
  return {
    media_id: null,
    trigger_keyword: "",
    trigger_keyword_list: [],
    match_mode: "contains_any",
    negative_keywords: [],
    comment_reply_text: "",
    comment_reply_variants: [],
    dm_reply_text: "",
    dm_reply_variants: [],
    fallback_comment_reply_text: "",
    is_active: true,
    priority: 100,
    delay_min_seconds: 2,
    delay_max_seconds: 5,
    daily_limit_per_sender: 1,
    cooldown_seconds: 0,
  };
}
