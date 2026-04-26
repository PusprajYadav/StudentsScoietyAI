const FALLBACK_COMMUNITY_COLOR = "#7c6eff";

function clampAlpha(alpha: number) {
  if (Number.isNaN(alpha)) {
    return 1;
  }

  return Math.min(1, Math.max(0, alpha));
}

export function normalizeCommunityColor(color?: string | null) {
  const value = color?.trim() || FALLBACK_COMMUNITY_COLOR;
  const normalized = value.replace(/^#/, "");

  if (/^[0-9a-fA-F]{3}$/.test(normalized)) {
    return `#${normalized
      .split("")
      .map((part) => part.repeat(2))
      .join("")
      .toLowerCase()}`;
  }

  if (/^[0-9a-fA-F]{6}$/.test(normalized)) {
    return `#${normalized.toLowerCase()}`;
  }

  return FALLBACK_COMMUNITY_COLOR;
}

function hexToRgb(color: string) {
  const normalized = normalizeCommunityColor(color).replace("#", "");

  return {
    r: Number.parseInt(normalized.slice(0, 2), 16),
    g: Number.parseInt(normalized.slice(2, 4), 16),
    b: Number.parseInt(normalized.slice(4, 6), 16),
  };
}

export function withCommunityAlpha(color: string, alpha: number) {
  const { r, g, b } = hexToRgb(color);
  return `rgba(${r}, ${g}, ${b}, ${clampAlpha(alpha)})`;
}

export function withAppThemeAlpha(
  channel: "brand" | "app-bg" | "app-card" | "app-secondary" | "app-text" | "app-muted" | "app-border",
  alpha: number
) {
  return `rgb(var(--${channel}) / ${clampAlpha(alpha)})`;
}

export function getCommunityContrastColor(color: string) {
  const { r, g, b } = hexToRgb(color);
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;

  return brightness > 176 ? "#111827" : "#ffffff";
}
