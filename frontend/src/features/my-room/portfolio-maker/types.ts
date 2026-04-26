import type { ProfileRow } from "../../../types/database";

export type PortfolioTemplateKey = "minimal_hero" | "bold_cards" | "creative_timeline";
export type PortfolioViewportKey = "mobile" | "tablet" | "desktop";
export type PortfolioColorMode = "light" | "dark";
export type PortfolioDisplayMode = PortfolioColorMode | "system";

export type PortfolioSectionType =
  | "hero"
  | "about"
  | "projects"
  | "experience"
  | "skills"
  | "education"
  | "testimonials"
  | "contact"
  | "rich_text";

export interface PortfolioThemeTokens {
  primary: string;
  accent: string;
  background: string;
  surface: string;
  text: string;
  muted: string;
}

export interface PortfolioModeThemeTokens {
  light: PortfolioThemeTokens;
  dark: PortfolioThemeTokens;
}

export interface PortfolioSectionStyleSettings {
  paddingTop?: number;
  paddingBottom?: number;
  paddingX?: number;
  gap?: number;
  radius?: number;
  titleFontSize?: number;
  bodyFontSize?: number;
  cardPadding?: number;
  cardRadius?: number;
  background?: string;
  borderColor?: string;
  titleColor?: string;
  bodyColor?: string;
  cardBackground?: string;
  cardBorderColor?: string;
  accentColor?: string;
  buttonBackground?: string;
  buttonTextColor?: string;
  align?: "left" | "center";
}

export type PortfolioResponsiveSectionStyles = Partial<
  Record<PortfolioViewportKey, PortfolioSectionStyleSettings>
>;

export type PortfolioSectionStyleModes = Partial<
  Record<PortfolioColorMode, PortfolioResponsiveSectionStyles>
>;

export interface PortfolioTheme {
  preset: string;
  displayMode: PortfolioDisplayMode;
  editorMode: PortfolioColorMode;
  tokens: PortfolioThemeTokens;
  modes: PortfolioModeThemeTokens;
  sectionStyles: Record<string, PortfolioSectionStyleModes>;
}

export interface PortfolioLink {
  label: string;
  url: string;
}

export interface PortfolioProject {
  id: string;
  name: string;
  tagline: string;
  description: string;
  links: PortfolioLink[];
  tech: string[];
  highlight: boolean;
}

export interface PortfolioExperience {
  id: string;
  role: string;
  company: string;
  location: string;
  start: string;
  end: string;
  current: boolean;
  bullets: string[];
}

export interface PortfolioEducation {
  id: string;
  school: string;
  degree: string;
  start: string;
  end: string;
  highlights: string[];
}

export interface PortfolioTestimonial {
  id: string;
  quote: string;
  author: string;
  authorRole: string;
}

export type PortfolioSection =
  | {
      id: string;
      type: "hero";
      enabled: boolean;
      headline: string;
      subheadline: string;
      ctaLabel: string;
      ctaHref: string;
      links: PortfolioLink[];
    }
  | {
      id: string;
      type: "about";
      enabled: boolean;
      title: string;
      body: string;
    }
  | {
      id: string;
      type: "projects";
      enabled: boolean;
      title: string;
      projects: PortfolioProject[];
    }
  | {
      id: string;
      type: "experience";
      enabled: boolean;
      title: string;
      items: PortfolioExperience[];
    }
  | {
      id: string;
      type: "skills";
      enabled: boolean;
      title: string;
      skills: string[];
    }
  | {
      id: string;
      type: "education";
      enabled: boolean;
      title: string;
      items: PortfolioEducation[];
    }
  | {
      id: string;
      type: "testimonials";
      enabled: boolean;
      title: string;
      items: PortfolioTestimonial[];
    }
  | {
      id: string;
      type: "contact";
      enabled: boolean;
      title: string;
      email: string;
      phone: string;
      location: string;
      links: PortfolioLink[];
    }
  | {
      id: string;
      type: "rich_text";
      enabled: boolean;
      title: string;
      body: string;
    };

export interface PortfolioDocument {
  version: 1;
  profile: {
    fullName: string;
    username: string;
    headline: string;
    avatarUrl: string | null;
  };
  sections: PortfolioSection[];
}

export interface StudentPortfolioRow {
  id: string;
  owner_id: string;
  title: string;
  template_key: PortfolioTemplateKey;
  content: PortfolioDocument;
  theme: PortfolioTheme;
  share_slug: string;
  is_live: boolean;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface StudentPortfolioWithOwner extends StudentPortfolioRow {
  owner: Pick<ProfileRow, "id" | "username" | "full_name" | "avatar_url"> | null;
}

export type PortfolioRecord = StudentPortfolioWithOwner;
