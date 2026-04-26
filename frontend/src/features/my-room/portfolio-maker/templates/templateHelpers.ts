import type { CSSProperties } from "react";
import type {
  PortfolioColorMode,
  PortfolioDisplayMode,
  PortfolioRecord,
  PortfolioSection,
  PortfolioSectionStyleSettings,
  PortfolioTheme,
  PortfolioThemeTokens,
  PortfolioViewportKey,
} from "../types";
import { normalizeTheme } from "../utils";

export interface ResolvedPortfolioSectionStyle {
  paddingTop: number;
  paddingBottom: number;
  paddingX: number;
  gap: number;
  radius: number;
  titleFontSize: number;
  bodyFontSize: number;
  cardPadding: number;
  cardRadius: number;
  background: string;
  borderColor: string;
  titleColor: string;
  bodyColor: string;
  cardBackground: string;
  cardBorderColor: string;
  accentColor: string;
  buttonBackground: string;
  buttonTextColor: string;
  align: "left" | "center";
}

const defaultSectionStyles: Record<PortfolioViewportKey, ResolvedPortfolioSectionStyle> = {
  mobile: {
    paddingTop: 20,
    paddingBottom: 20,
    paddingX: 20,
    gap: 20,
    radius: 24,
    titleFontSize: 28,
    bodyFontSize: 15,
    cardPadding: 16,
    cardRadius: 20,
    background: "",
    borderColor: "",
    titleColor: "",
    bodyColor: "",
    cardBackground: "",
    cardBorderColor: "",
    accentColor: "",
    buttonBackground: "",
    buttonTextColor: "",
    align: "left",
  },
  tablet: {
    paddingTop: 24,
    paddingBottom: 24,
    paddingX: 24,
    gap: 22,
    radius: 26,
    titleFontSize: 30,
    bodyFontSize: 15.5,
    cardPadding: 18,
    cardRadius: 22,
    background: "",
    borderColor: "",
    titleColor: "",
    bodyColor: "",
    cardBackground: "",
    cardBorderColor: "",
    accentColor: "",
    buttonBackground: "",
    buttonTextColor: "",
    align: "left",
  },
  desktop: {
    paddingTop: 28,
    paddingBottom: 28,
    paddingX: 28,
    gap: 24,
    radius: 28,
    titleFontSize: 32,
    bodyFontSize: 16,
    cardPadding: 18,
    cardRadius: 22,
    background: "",
    borderColor: "",
    titleColor: "",
    bodyColor: "",
    cardBackground: "",
    cardBorderColor: "",
    accentColor: "",
    buttonBackground: "",
    buttonTextColor: "",
    align: "left",
  },
};

export function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function parseRgbChannels(color: string) {
  const value = color.trim();

  if (value.startsWith("#")) {
    const hex = value.slice(1);
    if (hex.length === 3) {
      const [r, g, b] = hex.split("").map((part) => Number.parseInt(part.repeat(2), 16));
      return [r, g, b] as const;
    }

    if (hex.length === 6) {
      const r = Number.parseInt(hex.slice(0, 2), 16);
      const g = Number.parseInt(hex.slice(2, 4), 16);
      const b = Number.parseInt(hex.slice(4, 6), 16);
      return [r, g, b] as const;
    }

    return null;
  }

  const match = value.match(/rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})/i);
  if (!match) {
    return null;
  }

  return [
    Number.parseInt(match[1], 10),
    Number.parseInt(match[2], 10),
    Number.parseInt(match[3], 10),
  ] as const;
}

export function withAlpha(color: string, alpha: number) {
  const channels = parseRgbChannels(color);
  if (!channels) {
    return color;
  }

  return `rgba(${channels[0]}, ${channels[1]}, ${channels[2]}, ${alpha})`;
}

export function resolveThemeTokens(theme: PortfolioTheme, mode: PortfolioColorMode): PortfolioThemeTokens {
  return mode === "light" ? theme.modes.light : theme.modes.dark;
}

export function resolveDisplayMode(
  displayMode: PortfolioDisplayMode,
  systemMode: PortfolioColorMode
): PortfolioColorMode {
  return displayMode === "system" ? systemMode : displayMode;
}

export function resolveViewportFromWidth(width: number): PortfolioViewportKey {
  if (width < 640) {
    return "mobile";
  }

  if (width < 1024) {
    return "tablet";
  }

  return "desktop";
}

export function buildPortfolioThemeVars(theme: PortfolioTheme, mode: PortfolioColorMode): CSSProperties {
  const { primary, accent, background, surface, text, muted } = resolveThemeTokens(theme, mode);

  return {
    "--p-primary": primary,
    "--p-accent": accent,
    "--p-bg": background,
    "--p-surface": surface,
    "--p-text": text,
    "--p-muted": muted,
    "--p-border": withAlpha(text, 0.12),
    "--p-border-strong": withAlpha(text, 0.22),
    "--p-primary-soft": withAlpha(primary, 0.18),
    "--p-primary-faint": withAlpha(primary, 0.08),
    "--p-accent-soft": withAlpha(accent, 0.18),
    "--p-accent-faint": withAlpha(accent, 0.08),
    "--p-panel": surface,
    "--p-panel-strong": withAlpha(text, 0.04),
    "--p-shadow": withAlpha(primary, 0.22),
    "--p-shadow-soft": withAlpha(text, 0.16),
  } as CSSProperties;
}

function mergeStyleSettings(
  base: ResolvedPortfolioSectionStyle,
  patch?: PortfolioSectionStyleSettings
): ResolvedPortfolioSectionStyle {
  if (!patch) {
    return base;
  }

  return {
    paddingTop: patch.paddingTop ?? base.paddingTop,
    paddingBottom: patch.paddingBottom ?? base.paddingBottom,
    paddingX: patch.paddingX ?? base.paddingX,
    gap: patch.gap ?? base.gap,
    radius: patch.radius ?? base.radius,
    titleFontSize: patch.titleFontSize ?? base.titleFontSize,
    bodyFontSize: patch.bodyFontSize ?? base.bodyFontSize,
    cardPadding: patch.cardPadding ?? base.cardPadding,
    cardRadius: patch.cardRadius ?? base.cardRadius,
    background: patch.background?.trim() || base.background,
    borderColor: patch.borderColor?.trim() || base.borderColor,
    titleColor: patch.titleColor?.trim() || base.titleColor,
    bodyColor: patch.bodyColor?.trim() || base.bodyColor,
    cardBackground: patch.cardBackground?.trim() || base.cardBackground,
    cardBorderColor: patch.cardBorderColor?.trim() || base.cardBorderColor,
    accentColor: patch.accentColor?.trim() || base.accentColor,
    buttonBackground: patch.buttonBackground?.trim() || base.buttonBackground,
    buttonTextColor: patch.buttonTextColor?.trim() || base.buttonTextColor,
    align: patch.align ?? base.align,
  };
}

export function resolveSectionDesign(
  portfolio: PortfolioRecord,
  sectionId: string,
  mode: PortfolioColorMode,
  viewport: PortfolioViewportKey
): ResolvedPortfolioSectionStyle {
  const theme = normalizeTheme(portfolio.theme, portfolio.template_key);
  const scoped = theme.sectionStyles[sectionId]?.[mode] ?? {};
  let resolved = { ...defaultSectionStyles[viewport] };

  resolved = mergeStyleSettings(resolved, scoped.desktop);

  if (viewport === "tablet" || viewport === "mobile") {
    resolved = mergeStyleSettings(resolved, scoped.tablet);
  }

  if (viewport === "mobile") {
    resolved = mergeStyleSettings(resolved, scoped.mobile);
  }

  return resolved;
}

export function getSectionSurfaceStyle(design: ResolvedPortfolioSectionStyle): CSSProperties {
  const style: CSSProperties = {
    paddingTop: design.paddingTop,
    paddingBottom: design.paddingBottom,
    paddingLeft: design.paddingX,
    paddingRight: design.paddingX,
    borderRadius: design.radius,
    textAlign: design.align,
  };

  if (design.background) {
    style.background = design.background;
  }

  if (design.borderColor) {
    style.borderColor = design.borderColor;
  }

  return style;
}

export function getSectionTitleStyle(design: ResolvedPortfolioSectionStyle): CSSProperties {
  return {
    fontSize: design.titleFontSize,
    color: design.titleColor || "var(--p-text)",
    textAlign: design.align,
  };
}

export function getSectionBodyStyle(design: ResolvedPortfolioSectionStyle): CSSProperties {
  return {
    fontSize: design.bodyFontSize,
    color: design.bodyColor || "var(--p-muted)",
    textAlign: design.align,
  };
}

export function getSectionCardStyle(design: ResolvedPortfolioSectionStyle): CSSProperties {
  return {
    padding: design.cardPadding,
    borderRadius: design.cardRadius,
    background: design.cardBackground || "var(--p-panel-strong)",
    borderColor: design.cardBorderColor || design.borderColor || "var(--p-border)",
  };
}

export function getSectionAccentColor(design: ResolvedPortfolioSectionStyle) {
  return design.accentColor || "var(--p-accent)";
}

export function getSectionButtonStyle(design: ResolvedPortfolioSectionStyle): CSSProperties {
  return design.buttonBackground
    ? {
        background: design.buttonBackground,
        color: design.buttonTextColor || "#ffffff",
        boxShadow: "0 18px 48px -28px var(--p-shadow)",
      }
    : {
        background: "linear-gradient(135deg, var(--p-primary), var(--p-accent))",
        color: "#ffffff",
        boxShadow: "0 18px 48px -28px var(--p-shadow)",
      };
}

export function getEnabledSections(portfolio: PortfolioRecord) {
  return portfolio.content.sections.filter((section) => section.enabled);
}

export function getHeroSection(portfolio: PortfolioRecord) {
  return getEnabledSections(portfolio).find((section): section is Extract<PortfolioSection, { type: "hero" }> => (
    section.type === "hero"
  ));
}

export function getNonHeroSections(portfolio: PortfolioRecord) {
  return getEnabledSections(portfolio).filter((section) => section.type !== "hero");
}

export function getContactSection(portfolio: PortfolioRecord) {
  return portfolio.content.sections.find((section): section is Extract<PortfolioSection, { type: "contact" }> => (
    section.type === "contact" && section.enabled
  ));
}

export function getSectionTitle(section: PortfolioSection) {
  if (section.type === "hero") {
    return "Home";
  }

  if ("title" in section) {
    return section.title;
  }

  return section.type;
}

export function getSectionDescription(section: PortfolioSection) {
  if (section.type === "hero") {
    return section.subheadline;
  }

  if ("body" in section && section.body.trim()) {
    return section.body;
  }

  switch (section.type) {
    case "projects":
      return `${section.projects.length} project${section.projects.length === 1 ? "" : "s"} ready to explore.`;
    case "experience":
      return `${section.items.length} experience highlight${section.items.length === 1 ? "" : "s"}.`;
    case "skills":
      return `${section.skills.length} core skill${section.skills.length === 1 ? "" : "s"} featured.`;
    case "education":
      return `${section.items.length} education milestone${section.items.length === 1 ? "" : "s"}.`;
    case "testimonials":
      return `${section.items.length} testimonial${section.items.length === 1 ? "" : "s"} from collaborators.`;
    case "contact":
      return "Ways to reach out and start a conversation.";
    default:
      return "";
  }
}

export function resolveLinkHref(url: string) {
  const value = url.trim();

  if (!value) {
    return "#";
  }

  if (/^(#|mailto:|tel:|https?:\/\/)/i.test(value)) {
    return value;
  }

  return `https://${value.replace(/^\/+/, "")}`;
}

export function getInitials(name: string) {
  const parts = name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);

  if (!parts.length) {
    return "SS";
  }

  return parts.map((part) => part[0]?.toUpperCase() || "").join("");
}

export function countPortfolioHighlights(portfolio: PortfolioRecord) {
  const enabledSections = getEnabledSections(portfolio);
  const projects = enabledSections
    .filter((section): section is Extract<PortfolioSection, { type: "projects" }> => section.type === "projects")
    .flatMap((section) => section.projects);
  const experiences = enabledSections
    .filter((section): section is Extract<PortfolioSection, { type: "experience" }> => section.type === "experience")
    .flatMap((section) => section.items);
  const skills = enabledSections
    .filter((section): section is Extract<PortfolioSection, { type: "skills" }> => section.type === "skills")
    .flatMap((section) => section.skills);

  return {
    sections: enabledSections.length,
    projects: projects.length,
    highlightedProjects: projects.filter((project) => project.highlight).length,
    experiences: experiences.length,
    skills: skills.length,
  };
}

export function truncateText(value: string, maxLength = 160) {
  const normalized = value.replace(/\s+/g, " ").trim();

  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, maxLength).trimEnd()}...`;
}
