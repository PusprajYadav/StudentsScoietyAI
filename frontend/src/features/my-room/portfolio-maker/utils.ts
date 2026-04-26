import type { ProfileRow } from "../../../types/database";
import { downloadBlobNatively } from "../../../lib/nativeDownload";
import type {
  PortfolioColorMode,
  PortfolioDocument,
  PortfolioEducation,
  PortfolioExperience,
  PortfolioLink,
  PortfolioModeThemeTokens,
  PortfolioProject,
  PortfolioRecord,
  PortfolioSection,
  PortfolioSectionStyleModes,
  PortfolioSectionStyleSettings,
  PortfolioTemplateKey,
  PortfolioTheme,
  PortfolioThemeTokens,
  PortfolioTestimonial,
  PortfolioViewportKey,
} from "./types";

export function createPortfolioEntityId(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}_${Date.now().toString(36)}`;
}

export function slugifyPortfolioSeed(value: string) {
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 42);

  return normalized || "portfolio";
}

export function createShareSlug(seed: string) {
  return `${slugifyPortfolioSeed(seed)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function buildPublicPortfolioPath(shareSlug: string, username: string) {
  return `/p/${username}/${shareSlug}`;
}

function resolvePublicPortfolioOrigin() {
  const configuredOrigin = import.meta.env.VITE_PUBLIC_APP_URL?.trim().replace(/\/$/, "");

  if (configuredOrigin) {
    return configuredOrigin;
  }

  if (typeof window === "undefined" || !window.location?.origin) {
    return "https://studentsociety.in";
  }

  const { hostname, origin } = window.location;
  const isLocalHost =
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "[::1]";

  return isLocalHost ? "https://studentsociety.in" : origin;
}

export function buildPublicPortfolioUrl(record: Pick<PortfolioRecord, "share_slug" | "owner">) {
  const username = record.owner?.username || "profile";
  const path = buildPublicPortfolioPath(record.share_slug, username);
  return `${resolvePublicPortfolioOrigin()}${path}`;
}

export function downloadBlob(blob: Blob, filename: string) {
  downloadBlobNatively(blob, filename).catch((err) => console.error("Download failed", err));
}

export function downloadJsonFile(filename: string, value: unknown) {
  const blob = new Blob([JSON.stringify(value, null, 2)], {
    type: "application/json",
  });
  downloadBlob(blob, filename);
}

export function normalizeLink(input: unknown): PortfolioLink {
  const record = input && typeof input === "object" ? (input as Record<string, unknown>) : {};
  const label = typeof record.label === "string" ? record.label : "";
  const url = typeof record.url === "string" ? record.url : "";
  return { label, url };
}

function isColorMode(value: unknown): value is PortfolioColorMode {
  return value === "light" || value === "dark";
}

function isViewportKey(value: unknown): value is PortfolioViewportKey {
  return value === "mobile" || value === "tablet" || value === "desktop";
}

export function getDefaultPortfolioTheme(templateKey: PortfolioTemplateKey = "minimal_hero"): PortfolioTheme {
  let modes: PortfolioModeThemeTokens;
  let preset = "editorial-ocean";

  switch (templateKey) {
    case "bold_cards":
      preset = "ember-grid";
      modes = {
        light: {
          primary: "#ea580c",
          accent: "#0f766e",
          background: "#fff7ed",
          surface: "rgba(255, 255, 255, 0.88)",
          text: "#1f2937",
          muted: "rgba(55, 65, 81, 0.78)",
        },
        dark: {
          primary: "#f97316",
          accent: "#14b8a6",
          background: "#0f172a",
          surface: "rgba(15, 23, 42, 0.72)",
          text: "#f8fafc",
          muted: "rgba(226, 232, 240, 0.78)",
        },
      };
      break;
    case "creative_timeline":
      preset = "story-glow";
      modes = {
        light: {
          primary: "#7c3aed",
          accent: "#d97706",
          background: "#faf5ff",
          surface: "rgba(255, 255, 255, 0.9)",
          text: "#1f1637",
          muted: "rgba(65, 51, 89, 0.74)",
        },
        dark: {
          primary: "#8b5cf6",
          accent: "#f59e0b",
          background: "#111827",
          surface: "rgba(17, 24, 39, 0.74)",
          text: "#f9fafb",
          muted: "rgba(229, 231, 235, 0.76)",
        },
      };
      break;
    case "minimal_hero":
    default:
      preset = "editorial-ocean";
      modes = {
        light: {
          primary: "#2563eb",
          accent: "#16a34a",
          background: "#eff6ff",
          surface: "rgba(255, 255, 255, 0.9)",
          text: "#0f172a",
          muted: "rgba(51, 65, 85, 0.76)",
        },
        dark: {
          primary: "#2563eb",
          accent: "#22c55e",
          background: "#0b1220",
          surface: "rgba(15, 23, 42, 0.72)",
          text: "#e5e7eb",
          muted: "rgba(229, 231, 235, 0.75)",
        },
      };
      break;
  }

  return {
    preset,
    displayMode: "system",
    editorMode: "dark",
    modes,
    tokens: modes.dark,
    sectionStyles: {},
  };
}

export function normalizeThemeTokens(
  input: unknown,
  defaults: PortfolioThemeTokens = getDefaultPortfolioTheme().tokens
): PortfolioThemeTokens {
  const record = input && typeof input === "object" ? (input as Record<string, unknown>) : {};
  const get = (key: keyof PortfolioThemeTokens, fallback: string) =>
    typeof record[key] === "string" && (record[key] as string).trim() ? (record[key] as string).trim() : fallback;

  return {
    primary: get("primary", defaults.primary),
    accent: get("accent", defaults.accent),
    background: get("background", defaults.background),
    surface: get("surface", defaults.surface),
    text: get("text", defaults.text),
    muted: get("muted", defaults.muted),
  };
}

function normalizeModeThemeTokens(
  input: unknown,
  defaults: PortfolioModeThemeTokens,
  legacyTokens?: PortfolioThemeTokens | null
): PortfolioModeThemeTokens {
  const record = input && typeof input === "object" ? (input as Record<string, unknown>) : {};

  return {
    light: normalizeThemeTokens(record.light, defaults.light),
    dark: normalizeThemeTokens(record.dark ?? legacyTokens, defaults.dark),
  };
}

function normalizeNumericStyleValue(input: unknown) {
  if (typeof input === "number" && Number.isFinite(input)) {
    return input;
  }

  if (typeof input === "string" && input.trim()) {
    const parsed = Number.parseFloat(input);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return undefined;
}

function normalizeColorString(input: unknown) {
  return typeof input === "string" ? input.trim() : "";
}

function normalizeSectionStyleSettings(input: unknown): PortfolioSectionStyleSettings {
  const record = input && typeof input === "object" ? (input as Record<string, unknown>) : {};
  const align = record.align === "center" ? "center" : record.align === "left" ? "left" : undefined;

  return {
    paddingTop: normalizeNumericStyleValue(record.paddingTop),
    paddingBottom: normalizeNumericStyleValue(record.paddingBottom),
    paddingX: normalizeNumericStyleValue(record.paddingX),
    gap: normalizeNumericStyleValue(record.gap),
    radius: normalizeNumericStyleValue(record.radius),
    titleFontSize: normalizeNumericStyleValue(record.titleFontSize),
    bodyFontSize: normalizeNumericStyleValue(record.bodyFontSize),
    cardPadding: normalizeNumericStyleValue(record.cardPadding),
    cardRadius: normalizeNumericStyleValue(record.cardRadius),
    background: normalizeColorString(record.background),
    borderColor: normalizeColorString(record.borderColor),
    titleColor: normalizeColorString(record.titleColor),
    bodyColor: normalizeColorString(record.bodyColor),
    cardBackground: normalizeColorString(record.cardBackground),
    cardBorderColor: normalizeColorString(record.cardBorderColor),
    accentColor: normalizeColorString(record.accentColor),
    buttonBackground: normalizeColorString(record.buttonBackground),
    buttonTextColor: normalizeColorString(record.buttonTextColor),
    align,
  };
}

function normalizeResponsiveSectionStyles(input: unknown) {
  const record = input && typeof input === "object" ? (input as Record<string, unknown>) : {};
  const output: Partial<Record<PortfolioViewportKey, PortfolioSectionStyleSettings>> = {};

  (["desktop", "tablet", "mobile"] as PortfolioViewportKey[]).forEach((key) => {
    if (isViewportKey(key)) {
      output[key] = normalizeSectionStyleSettings(record[key]);
    }
  });

  return output;
}

function normalizeSectionStyleModes(input: unknown): PortfolioSectionStyleModes {
  const record = input && typeof input === "object" ? (input as Record<string, unknown>) : {};

  return {
    light: normalizeResponsiveSectionStyles(record.light),
    dark: normalizeResponsiveSectionStyles(record.dark),
  };
}

export function normalizeTheme(
  input: unknown,
  templateKey: PortfolioTemplateKey = "minimal_hero"
): PortfolioTheme {
  const record = input && typeof input === "object" ? (input as Record<string, unknown>) : {};
  const fallback = getDefaultPortfolioTheme(templateKey);
  const legacyTokens = record.tokens ? normalizeThemeTokens(record.tokens, fallback.modes.dark) : null;
  const modes = normalizeModeThemeTokens(record.modes, fallback.modes, legacyTokens);
  const sectionStylesRecord =
    record.sectionStyles && typeof record.sectionStyles === "object"
      ? (record.sectionStyles as Record<string, unknown>)
      : {};
  const sectionStyles = Object.fromEntries(
    Object.entries(sectionStylesRecord).map(([sectionId, value]) => [sectionId, normalizeSectionStyleModes(value)])
  );
  const hasLegacyTokens = Boolean(record.tokens) && !record.modes;
  const rawDisplayMode = record.displayMode;
  const rawEditorMode = record.editorMode;

  return {
    preset: typeof record.preset === "string" ? record.preset : fallback.preset,
    displayMode:
      rawDisplayMode === "light" || rawDisplayMode === "dark" || rawDisplayMode === "system"
        ? rawDisplayMode
        : hasLegacyTokens
          ? "dark"
          : fallback.displayMode,
    editorMode: isColorMode(rawEditorMode) ? rawEditorMode : hasLegacyTokens ? "dark" : fallback.editorMode,
    tokens: legacyTokens || modes.dark,
    modes,
    sectionStyles,
  };
}

function normalizeSection(input: unknown): PortfolioSection | null {
  if (!input || typeof input !== "object") {
    return null;
  }

  const record = input as Record<string, unknown>;
  const id = typeof record.id === "string" ? record.id : "";
  const type = record.type;
  const enabled = record.enabled !== undefined ? Boolean(record.enabled) : true;

  if (!id || typeof type !== "string") {
    return null;
  }

  if (type === "hero") {
    return {
      id,
      type,
      enabled,
      headline: typeof record.headline === "string" ? record.headline : "",
      subheadline: typeof record.subheadline === "string" ? record.subheadline : "",
      ctaLabel: typeof record.ctaLabel === "string" ? record.ctaLabel : "Contact",
      ctaHref: typeof record.ctaHref === "string" ? record.ctaHref : "#contact",
      links: Array.isArray(record.links) ? record.links.map(normalizeLink) : [],
    };
  }

  if (type === "about") {
    return {
      id,
      type,
      enabled,
      title: typeof record.title === "string" ? record.title : "About",
      body: typeof record.body === "string" ? record.body : "",
    };
  }

  if (type === "skills") {
    return {
      id,
      type,
      enabled,
      title: typeof record.title === "string" ? record.title : "Skills",
      skills: Array.isArray(record.skills) ? record.skills.filter((v): v is string => typeof v === "string") : [],
    };
  }

  if (type === "contact") {
    return {
      id,
      type,
      enabled,
      title: typeof record.title === "string" ? record.title : "Contact",
      email: typeof record.email === "string" ? record.email : "",
      phone: typeof record.phone === "string" ? record.phone : "",
      location: typeof record.location === "string" ? record.location : "",
      links: Array.isArray(record.links) ? record.links.map(normalizeLink) : [],
    };
  }

  if (type === "rich_text") {
    return {
      id,
      type,
      enabled,
      title: typeof record.title === "string" ? record.title : "Section",
      body: typeof record.body === "string" ? record.body : "",
    };
  }

  if (type === "projects") {
    const projects = Array.isArray(record.projects)
      ? record.projects
          .filter((item): item is Record<string, unknown> => Boolean(item && typeof item === "object"))
          .map(
            (item): PortfolioProject => ({
              id: typeof item.id === "string" ? item.id : createPortfolioEntityId("project"),
              name: typeof item.name === "string" ? item.name : "",
              tagline: typeof item.tagline === "string" ? item.tagline : "",
              description: typeof item.description === "string" ? item.description : "",
              links: Array.isArray(item.links) ? item.links.map(normalizeLink) : [],
              tech: Array.isArray(item.tech) ? item.tech.filter((v): v is string => typeof v === "string") : [],
              highlight: Boolean(item.highlight),
            })
          )
      : [];

    return {
      id,
      type,
      enabled,
      title: typeof record.title === "string" ? record.title : "Projects",
      projects,
    };
  }

  if (type === "experience") {
    const items = Array.isArray(record.items)
      ? record.items
          .filter((item): item is Record<string, unknown> => Boolean(item && typeof item === "object"))
          .map(
            (item): PortfolioExperience => ({
              id: typeof item.id === "string" ? item.id : createPortfolioEntityId("experience"),
              role: typeof item.role === "string" ? item.role : "",
              company: typeof item.company === "string" ? item.company : "",
              location: typeof item.location === "string" ? item.location : "",
              start: typeof item.start === "string" ? item.start : "",
              end: typeof item.end === "string" ? item.end : "",
              current: Boolean(item.current),
              bullets: Array.isArray(item.bullets) ? item.bullets.filter((v): v is string => typeof v === "string") : [],
            })
          )
      : [];

    return {
      id,
      type,
      enabled,
      title: typeof record.title === "string" ? record.title : "Experience",
      items,
    };
  }

  if (type === "education") {
    const items = Array.isArray(record.items)
      ? record.items
          .filter((item): item is Record<string, unknown> => Boolean(item && typeof item === "object"))
          .map(
            (item): PortfolioEducation => ({
              id: typeof item.id === "string" ? item.id : createPortfolioEntityId("education"),
              school: typeof item.school === "string" ? item.school : "",
              degree: typeof item.degree === "string" ? item.degree : "",
              start: typeof item.start === "string" ? item.start : "",
              end: typeof item.end === "string" ? item.end : "",
              highlights: Array.isArray(item.highlights)
                ? item.highlights.filter((v): v is string => typeof v === "string")
                : [],
            })
          )
      : [];

    return {
      id,
      type,
      enabled,
      title: typeof record.title === "string" ? record.title : "Education",
      items,
    };
  }

  if (type === "testimonials") {
    const items = Array.isArray(record.items)
      ? record.items
          .filter((item): item is Record<string, unknown> => Boolean(item && typeof item === "object"))
          .map(
            (item): PortfolioTestimonial => ({
              id: typeof item.id === "string" ? item.id : createPortfolioEntityId("testimonial"),
              quote: typeof item.quote === "string" ? item.quote : "",
              author: typeof item.author === "string" ? item.author : "",
              authorRole: typeof item.authorRole === "string" ? item.authorRole : "",
            })
          )
      : [];

    return {
      id,
      type,
      enabled,
      title: typeof record.title === "string" ? record.title : "Testimonials",
      items,
    };
  }

  return null;
}

export function createDemoPortfolioDocument(
  profile: ProfileRow,
  templateKey: PortfolioTemplateKey = "minimal_hero"
): PortfolioDocument {
  const fullName = profile.full_name || profile.username;
  const campus = profile.campus || "Your campus";
  const topSkills = profile.skills?.length
    ? profile.skills.slice(0, 8)
    : ["UI Design", "Frontend", "React", "Product Thinking", "Storytelling", "Prototyping"];
  const links: PortfolioLink[] = [
    { label: "LinkedIn", url: profile.social_links?.linkedin || "" },
    { label: "GitHub", url: profile.social_links?.other_links?.[0] || "" },
  ].filter((entry) => entry.url);
  const heroSubheadline =
    templateKey === "bold_cards"
      ? "I build bold, high-clarity digital experiences that feel polished on every screen."
      : templateKey === "creative_timeline"
        ? "I turn ideas into products, stories, and interfaces that people remember."
        : "I build clean, fast products and ship relentlessly.";

  return {
    version: 1,
    profile: {
      fullName,
      username: profile.username,
      headline: profile.headline || "Student • Builder • Learner",
      avatarUrl: profile.avatar_url || null,
    },
    sections: [
      {
        id: createPortfolioEntityId("hero"),
        type: "hero",
        enabled: true,
        headline: `Hi, I'm ${fullName}.`,
        subheadline: heroSubheadline,
        ctaLabel: "Contact",
        ctaHref: "#contact",
        links,
      },
      {
        id: createPortfolioEntityId("about"),
        type: "about",
        enabled: true,
        title: "About",
        body:
          `${fullName} builds polished digital experiences with a strong focus on clarity, momentum, and human-centered design.\n\nThis space is designed to quickly communicate strengths, recent work, and the story behind each project.`,
      },
      {
        id: createPortfolioEntityId("projects"),
        type: "projects",
        enabled: true,
        title: "Projects",
        projects: [
          {
            id: createPortfolioEntityId("project"),
            name: "Campus Connect",
            tagline: "Student community platform for collaboration and updates",
            description:
              "Designed and shipped a social-first student product with profiles, communities, and portfolio publishing so students can showcase their work in one place.",
            links: [],
            tech: ["React", "TypeScript", "Supabase"],
            highlight: true,
          },
          {
            id: createPortfolioEntityId("project"),
            name: "FocusFlow Planner",
            tagline: "Planner for tasks, habits, and daily accountability",
            description:
              "Built a productivity experience with smoother task prioritization, cleaner mobile flows, and progress views that make planning feel lightweight instead of overwhelming.",
            links: [],
            tech: ["UX Writing", "Product Design", "Frontend"],
            highlight: true,
          },
          {
            id: createPortfolioEntityId("project"),
            name: "Portfolio System",
            tagline: "Reusable portfolio templates for students and creators",
            description:
              "Created flexible layout building blocks so multiple visual themes could reuse the same content model while staying responsive across devices.",
            links: [],
            tech: ["Responsive UI", "Design Systems", "Tailwind"],
            highlight: false,
          },
        ],
      },
      {
        id: createPortfolioEntityId("experience"),
        type: "experience",
        enabled: true,
        title: "Experience",
        items: [
          {
            id: createPortfolioEntityId("experience"),
            role: "Student Product Builder",
            company: "Student Society",
            location: campus,
            start: "2025",
            end: "",
            current: true,
            bullets: [
              "Shipped student-facing product features with an emphasis on clean flows and responsive interfaces.",
              "Turned early ideas into working UI prototypes and iterated quickly using real usage feedback.",
            ],
          },
          {
            id: createPortfolioEntityId("experience"),
            role: "Design and Frontend Intern",
            company: "NextWave Studio",
            location: "Remote",
            start: "2024",
            end: "2025",
            current: false,
            bullets: [
              "Supported landing pages and product dashboards with reusable components and tighter visual consistency.",
              "Collaborated across design and development to improve delivery quality on mobile and desktop.",
            ],
          },
        ],
      },
      {
        id: createPortfolioEntityId("skills"),
        type: "skills",
        enabled: true,
        title: "Skills",
        skills: topSkills,
      },
      {
        id: createPortfolioEntityId("education"),
        type: "education",
        enabled: true,
        title: "Education",
        items: [
          {
            id: createPortfolioEntityId("education"),
            school: campus,
            degree: "Student portfolio and project-based learning track",
            start: "2023",
            end: "Present",
            highlights: ["Leadership", "Projects", "Community"],
          },
        ],
      },
      {
        id: createPortfolioEntityId("testimonials"),
        type: "testimonials",
        enabled: true,
        title: "Testimonials",
        items: [
          {
            id: createPortfolioEntityId("testimonial"),
            quote:
              "Brings structure to ideas quickly and turns rough concepts into interfaces that feel thoughtfully finished.",
            author: "Project Collaborator",
            authorRole: "Student Team Lead",
          },
          {
            id: createPortfolioEntityId("testimonial"),
            quote:
              "Strong sense of product direction, clear communication, and a real eye for responsive detail.",
            author: "Mentor",
            authorRole: "Design Advisor",
          },
        ],
      },
      {
        id: createPortfolioEntityId("contact"),
        type: "contact",
        enabled: true,
        title: "Contact",
        email: profile.social_links?.email || "",
        phone: profile.social_links?.mobile_number || "",
        location: profile.campus || "",
        links,
      },
    ],
  };
}

export function clearPortfolioDocumentContent(
  input: PortfolioDocument,
  profile?: ProfileRow | null
): PortfolioDocument {
  const normalized = normalizePortfolioDocument(input, profile);

  return {
    ...normalized,
    sections: normalized.sections.map((section) => {
      switch (section.type) {
        case "hero":
          return {
            ...section,
            headline: "",
            subheadline: "",
            ctaLabel: "Contact",
            ctaHref: "#contact",
            links: [],
          };
        case "about":
        case "rich_text":
          return { ...section, title: section.title, body: "" };
        case "projects":
          return { ...section, title: section.title, projects: [] };
        case "experience":
          return { ...section, title: section.title, items: [] };
        case "skills":
          return { ...section, title: section.title, skills: [] };
        case "education":
          return { ...section, title: section.title, items: [] };
        case "testimonials":
          return { ...section, title: section.title, items: [] };
        case "contact":
          return {
            ...section,
            title: section.title,
            email: "",
            phone: "",
            location: "",
            links: [],
          };
        default:
          return section;
      }
    }),
  };
}

export function normalizePortfolioDocument(input: unknown, profile?: ProfileRow | null): PortfolioDocument {
  const record = input && typeof input === "object" ? (input as Record<string, unknown>) : {};
  const version = 1;
  const rawProfile = record.profile && typeof record.profile === "object" ? (record.profile as Record<string, unknown>) : {};

  const fullName =
    typeof rawProfile.fullName === "string"
      ? rawProfile.fullName
      : profile?.full_name || profile?.username || "";
  const username =
    typeof rawProfile.username === "string"
      ? rawProfile.username
      : profile?.username || "";
  const headline =
    typeof rawProfile.headline === "string"
      ? rawProfile.headline
      : profile?.headline || "";
  const avatarUrl =
    typeof rawProfile.avatarUrl === "string"
      ? rawProfile.avatarUrl
      : profile?.avatar_url || null;

  const sections = Array.isArray(record.sections)
    ? record.sections.map(normalizeSection).filter(Boolean)
    : [];

  return {
    version,
    profile: {
      fullName,
      username,
      headline,
      avatarUrl,
    },
    sections: (sections.length ? sections : createDemoPortfolioDocument(profile as ProfileRow).sections) as PortfolioSection[],
  };
}

export function resolveTemplateLabel(templateKey: string) {
  switch (templateKey) {
    case "bold_cards":
      return "Studio Bento";
    case "creative_timeline":
      return "Storyline Canvas";
    case "minimal_hero":
    default:
      return "Editorial Horizon";
  }
}
