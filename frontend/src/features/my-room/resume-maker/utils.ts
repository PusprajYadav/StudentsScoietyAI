import type { ProfileRow, ResumeTemplateKey } from "../../../types/database";
import { downloadBlobNatively } from "../../../lib/nativeDownload";
import { RESUME_PAGE_HEIGHT, RESUME_PAGE_WIDTH } from "./constants";
import type {
  ResumeAchievementItem,
  ResumeAtsSectionKey,
  ResumeCanvasSectionKey,
  ResumeCertificationItem,
  ResumeDesignBlockKey,
  ResumeDesignBlockStyle,
  ResumeDesignStyleOverride,
  ResumeFreeformSectionPlacement,
  ResumeDesignLayoutSettings,
  ResumeDesignSettings,
  ResumeExecutiveSectionKey,
  ResumeSidebarSectionKey,
  ResumeThemeSettings,
  ResumeDocument,
  ResumeEducationItem,
  ResumeExperienceItem,
  ResumeProjectItem,
  ResumeRecord,
  ResumeReferenceItem,
  ResumeSkillGroup,
} from "./types";

function fallbackId(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

export function createResumeEntityId(prefix: string) {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}-${crypto.randomUUID()}`;
  }

  return fallbackId(prefix);
}

const defaultDesignStyles: Record<ResumeDesignBlockKey, ResumeDesignBlockStyle> = {
  name: {
    fontSize: 38,
    color: "#1e293b",
    paddingTop: 0,
    paddingRight: 0,
    paddingBottom: 0,
    paddingLeft: 0,
  },
  role: {
    fontSize: 17,
    color: "#475569",
    paddingTop: 0,
    paddingRight: 0,
    paddingBottom: 0,
    paddingLeft: 0,
  },
  sectionTitle: {
    fontSize: 15,
    color: "#334155",
    paddingTop: 0,
    paddingRight: 0,
    paddingBottom: 0,
    paddingLeft: 0,
  },
  body: {
    fontSize: 14,
    color: "#334155",
    paddingTop: 0,
    paddingRight: 0,
    paddingBottom: 0,
    paddingLeft: 0,
  },
  meta: {
    fontSize: 13,
    color: "#64748b",
    paddingTop: 0,
    paddingRight: 0,
    paddingBottom: 0,
    paddingLeft: 0,
  },
};

const defaultThemeSettings: ResumeThemeSettings = {
  pageBackground: "#ffffff",
  primaryColor: "#334155",
  panelColor: "#1e293b",
};

const executiveSectionKeys: ResumeExecutiveSectionKey[] = [
  "experience",
  "projects",
  "education",
  "skills",
  "achievements",
  "languages",
  "certifications",
  "interests",
  "references",
];

const atsSectionKeys: ResumeAtsSectionKey[] = [
  "summary",
  "experience",
  "projects",
  "education",
  "skills",
  "certifications",
  "achievements",
  "languages",
  "interests",
  "references",
];

const sidebarSectionKeys: ResumeSidebarSectionKey[] = [
  "contact",
  "summary",
  "experience",
  "projects",
  "education",
  "skills",
  "achievements",
  "languages",
  "certifications",
  "interests",
  "references",
];

const canvasSectionKeys: ResumeCanvasSectionKey[] = [
  "header",
  "contact",
  "summary",
  "experience",
  "projects",
  "education",
  "skills",
  "achievements",
  "languages",
  "certifications",
  "interests",
  "references",
];

const FREEFORM_CANVAS_MARGIN = 32;
const FREEFORM_SECTION_MIN_WIDTH = 180;
const FREEFORM_SECTION_MAX_WIDTH = RESUME_PAGE_WIDTH - FREEFORM_CANVAS_MARGIN * 2;

const defaultFreeformPlacements: Record<ResumeCanvasSectionKey, ResumeFreeformSectionPlacement> = {
  header: {
    page: 1,
    x: 32,
    y: 32,
    width: 730,
  },
  contact: {
    page: 1,
    x: 32,
    y: 220,
    width: 220,
  },
  summary: {
    page: 1,
    x: 272,
    y: 220,
    width: 490,
  },
  experience: {
    page: 1,
    x: 272,
    y: 390,
    width: 490,
  },
  projects: {
    page: 1,
    x: 272,
    y: 720,
    width: 490,
  },
  education: {
    page: 1,
    x: 32,
    y: 390,
    width: 220,
  },
  skills: {
    page: 1,
    x: 32,
    y: 650,
    width: 220,
  },
  achievements: {
    page: 2,
    x: 32,
    y: 32,
    width: 350,
  },
  languages: {
    page: 2,
    x: 412,
    y: 32,
    width: 170,
  },
  certifications: {
    page: 2,
    x: 32,
    y: 280,
    width: 350,
  },
  interests: {
    page: 2,
    x: 412,
    y: 280,
    width: 170,
  },
  references: {
    page: 2,
    x: 32,
    y: 520,
    width: 730,
  },
};

const defaultLayoutSettings: ResumeDesignLayoutSettings = {
  mode: "template",
  atsOrder: [
    "summary",
    "experience",
    "projects",
    "education",
    "skills",
    "certifications",
    "achievements",
    "languages",
    "interests",
    "references",
  ],
  sidebarSections: {
    left: ["contact", "education", "skills", "languages"],
    right: ["summary", "experience", "projects", "certifications", "achievements", "interests", "references"],
  },
  executiveColumns: {
    left: ["experience", "projects", "education"],
    right: ["skills", "achievements", "languages", "certifications", "interests", "references"],
  },
  freeform: {
    placements: defaultFreeformPlacements,
  },
};

function clampNumber(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function parseDesignNumber(value: unknown, fallback: number, min = 0, max = 100) {
  const parsed =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number.parseFloat(value)
        : Number.NaN;

  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return clampNumber(parsed, min, max);
}

function normalizeDesignColor(value: unknown, fallback: string) {
  const next = typeof value === "string" ? value.trim() : "";
  return /^#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})$/.test(next) ? next : fallback;
}

function normalizeSectionList<T extends string>(value: unknown, allowedKeys: readonly T[]) {
  if (!Array.isArray(value)) {
    return [];
  }

  const seen = new Set<T>();
  const normalized: T[] = [];

  value.forEach((entry) => {
    const key = typeof entry === "string" ? entry : "";
    if (!allowedKeys.includes(key as T)) {
      return;
    }
    if (seen.has(key as T)) {
      return;
    }
    seen.add(key as T);
    normalized.push(key as T);
  });

  return normalized;
}

function completeOrderedSectionList<T extends string>(initial: T[], allowedKeys: readonly T[]) {
  const seen = new Set<T>();
  const normalized: T[] = [];

  initial.forEach((key) => {
    if (seen.has(key)) {
      return;
    }
    seen.add(key);
    normalized.push(key);
  });

  allowedKeys.forEach((key) => {
    if (seen.has(key)) {
      return;
    }
    seen.add(key);
    normalized.push(key);
  });

  return normalized;
}

function normalizeTemplateColumns<T extends string>(
  leftValue: unknown,
  rightValue: unknown,
  allowedKeys: readonly T[],
  fallback: {
    left: readonly T[];
    right: readonly T[];
  }
) {
  const leftInitial = normalizeSectionList(leftValue, allowedKeys);
  const rightInitial = normalizeSectionList(rightValue, allowedKeys);
  const hasExplicitColumns = leftInitial.length > 0 || rightInitial.length > 0;
  const leftSeed = hasExplicitColumns ? leftInitial : [...fallback.left];
  const rightSeed = hasExplicitColumns ? rightInitial : [...fallback.right];
  const seen = new Set<T>();
  const left: T[] = [];
  const right: T[] = [];
  const fallbackLeft = new Set(fallback.left);

  leftSeed.forEach((key) => {
    if (seen.has(key)) {
      return;
    }
    seen.add(key);
    left.push(key);
  });

  rightSeed.forEach((key) => {
    if (seen.has(key)) {
      return;
    }
    seen.add(key);
    right.push(key);
  });

  allowedKeys.forEach((key) => {
    if (seen.has(key)) {
      return;
    }
    seen.add(key);
    if (fallbackLeft.has(key)) {
      left.push(key);
    } else {
      right.push(key);
    }
  });

  return { left, right };
}

function normalizeCanvasSectionKey(value: unknown) {
  return canvasSectionKeys.includes(value as ResumeCanvasSectionKey)
    ? (value as ResumeCanvasSectionKey)
    : null;
}

function normalizeFreeformPlacement(
  value: unknown,
  fallback: ResumeFreeformSectionPlacement
): ResumeFreeformSectionPlacement {
  const input = value && typeof value === "object" ? (value as Record<string, unknown>) : {};

  return {
    page: Math.round(parseDesignNumber(input.page, fallback.page, 1, 20)),
    x: parseDesignNumber(
      input.x,
      fallback.x,
      0,
      RESUME_PAGE_WIDTH - FREEFORM_CANVAS_MARGIN
    ),
    y: parseDesignNumber(
      input.y,
      fallback.y,
      0,
      RESUME_PAGE_HEIGHT - FREEFORM_CANVAS_MARGIN
    ),
    width: parseDesignNumber(
      input.width,
      fallback.width,
      FREEFORM_SECTION_MIN_WIDTH,
      FREEFORM_SECTION_MAX_WIDTH
    ),
  };
}

export function normalizeResumeLayoutSettings(
  layout?: ResumeDesignLayoutSettings | null
): ResumeDesignLayoutSettings {
  const atsOrder = completeOrderedSectionList(
    normalizeSectionList(layout?.atsOrder, atsSectionKeys),
    atsSectionKeys
  );
  const sidebarSections = normalizeTemplateColumns(
    layout?.sidebarSections?.left,
    layout?.sidebarSections?.right,
    sidebarSectionKeys,
    defaultLayoutSettings.sidebarSections
  );
  const executiveColumns = normalizeTemplateColumns(
    layout?.executiveColumns?.left,
    layout?.executiveColumns?.right,
    executiveSectionKeys,
    defaultLayoutSettings.executiveColumns
  );

  const freeformPlacementsInput =
    layout?.freeform?.placements && typeof layout.freeform.placements === "object"
      ? (layout.freeform.placements as Record<string, unknown>)
      : {};
  const freeformPlacements = canvasSectionKeys.reduce<
    Partial<Record<ResumeCanvasSectionKey, ResumeFreeformSectionPlacement>>
  >((accumulator, key) => {
    const sourceKey = normalizeCanvasSectionKey(key);
    if (!sourceKey) {
      return accumulator;
    }

    accumulator[sourceKey] = normalizeFreeformPlacement(
      freeformPlacementsInput[sourceKey],
      defaultFreeformPlacements[sourceKey]
    );
    return accumulator;
  }, {});

  return {
    mode: "template",
    atsOrder,
    sidebarSections,
    executiveColumns,
    freeform: {
      placements: freeformPlacements,
    },
  };
}

export function deriveExecutiveColumnsFromFreeformPlacements(
  placements: Partial<Record<ResumeCanvasSectionKey, ResumeFreeformSectionPlacement>>
) {
  const midpoint = RESUME_PAGE_WIDTH / 2;
  const ranked = executiveSectionKeys.map((key) => {
    const placement = placements[key] || defaultFreeformPlacements[key];
    return {
      key,
      placement,
      centerX: placement.x + placement.width / 2,
    };
  });

  const left = ranked
    .filter((entry) => entry.centerX <= midpoint)
    .sort((leftEntry, rightEntry) => {
      if (leftEntry.placement.page !== rightEntry.placement.page) {
        return leftEntry.placement.page - rightEntry.placement.page;
      }
      if (Math.abs(leftEntry.placement.y - rightEntry.placement.y) >= 1) {
        return leftEntry.placement.y - rightEntry.placement.y;
      }
      return leftEntry.placement.x - rightEntry.placement.x;
    })
    .map((entry) => entry.key);

  const right = ranked
    .filter((entry) => entry.centerX > midpoint)
    .sort((leftEntry, rightEntry) => {
      if (leftEntry.placement.page !== rightEntry.placement.page) {
        return leftEntry.placement.page - rightEntry.placement.page;
      }
      if (Math.abs(leftEntry.placement.y - rightEntry.placement.y) >= 1) {
        return leftEntry.placement.y - rightEntry.placement.y;
      }
      return leftEntry.placement.x - rightEntry.placement.x;
    })
    .map((entry) => entry.key);

  return normalizeResumeLayoutSettings({
    mode: "template",
    executiveColumns: {
      left,
      right,
    },
    freeform: {
      placements,
    },
  }).executiveColumns;
}

function normalizeDesignBlockStyle(
  value: unknown,
  fallback: ResumeDesignBlockStyle
): ResumeDesignBlockStyle {
  const input = value && typeof value === "object" ? (value as Record<string, unknown>) : {};

  return {
    fontSize: parseDesignNumber(input.fontSize, fallback.fontSize, 10, 72),
    color: normalizeDesignColor(input.color, fallback.color),
    paddingTop: parseDesignNumber(input.paddingTop, fallback.paddingTop, 0, 120),
    paddingRight: parseDesignNumber(input.paddingRight, fallback.paddingRight, 0, 120),
    paddingBottom: parseDesignNumber(input.paddingBottom, fallback.paddingBottom, 0, 120),
    paddingLeft: parseDesignNumber(input.paddingLeft, fallback.paddingLeft, 0, 120),
  };
}

export function resolveResumeDesignStyle(
  design: ResumeDesignSettings,
  block: ResumeDesignBlockKey,
  targetKey?: string | null
): ResumeDesignBlockStyle {
  return {
    ...design.styles[block],
    ...(targetKey ? design.overrides[targetKey] || {} : {}),
  };
}

function normalizeDesignStyleOverride(value: unknown): ResumeDesignStyleOverride {
  const input = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  const override: ResumeDesignStyleOverride = {};

  if (hasOwn(input, "fontSize")) {
    override.fontSize = parseDesignNumber(input.fontSize, defaultDesignStyles.body.fontSize, 10, 72);
  }

  if (hasOwn(input, "color")) {
    override.color = normalizeDesignColor(input.color, defaultDesignStyles.body.color);
  }

  if (hasOwn(input, "paddingTop")) {
    override.paddingTop = parseDesignNumber(input.paddingTop, 0, 0, 120);
  }

  if (hasOwn(input, "paddingRight")) {
    override.paddingRight = parseDesignNumber(input.paddingRight, 0, 0, 120);
  }

  if (hasOwn(input, "paddingBottom")) {
    override.paddingBottom = parseDesignNumber(input.paddingBottom, 0, 0, 120);
  }

  if (hasOwn(input, "paddingLeft")) {
    override.paddingLeft = parseDesignNumber(input.paddingLeft, 0, 0, 120);
  }

  return override;
}

export function createDefaultResumeDesignSettings(): ResumeDesignSettings {
  return {
    styles: {
      name: { ...defaultDesignStyles.name },
      role: { ...defaultDesignStyles.role },
      sectionTitle: { ...defaultDesignStyles.sectionTitle },
      body: { ...defaultDesignStyles.body },
      meta: { ...defaultDesignStyles.meta },
    },
    overrides: {},
    theme: { ...defaultThemeSettings },
    layout: normalizeResumeLayoutSettings(defaultLayoutSettings),
  };
}

export function cloneResumeDesignSettings(
  design?: ResumeDesignSettings | null
): ResumeDesignSettings {
  const defaults = createDefaultResumeDesignSettings();
  const source = design?.styles;
  const overrides = design?.overrides;
  const theme = design?.theme;
  const layout = design?.layout;

  return {
    styles: {
      name: { ...defaults.styles.name, ...(source?.name || {}) },
      role: { ...defaults.styles.role, ...(source?.role || {}) },
      sectionTitle: { ...defaults.styles.sectionTitle, ...(source?.sectionTitle || {}) },
      body: { ...defaults.styles.body, ...(source?.body || {}) },
      meta: { ...defaults.styles.meta, ...(source?.meta || {}) },
    },
    overrides: Object.fromEntries(
      Object.entries(overrides || {}).map(([key, value]) => [key, normalizeDesignStyleOverride(value)])
    ),
    theme: {
      pageBackground: normalizeDesignColor(theme?.pageBackground, defaults.theme.pageBackground),
      primaryColor: normalizeDesignColor(theme?.primaryColor, defaults.theme.primaryColor),
      panelColor: normalizeDesignColor(theme?.panelColor, defaults.theme.panelColor),
    },
    layout: normalizeResumeLayoutSettings(layout || defaults.layout),
  };
}

export function createDefaultResumeDocument(profile?: ProfileRow | null): ResumeDocument {
  const fullName = profile?.full_name || "";
  const headline = profile?.headline || "";
  const website = profile?.social_links.website || "";
  const linkedin = profile?.social_links.linkedin || "";
  const email = profile?.social_links.email || "";
  const phone = profile?.social_links.mobile_number || profile?.social_links.whatsapp || "";
  const location = [profile?.campus, profile?.course].filter(Boolean).join(" • ");

  return {
    contact: {
      fullName,
      role: headline,
      email,
      phone,
      location,
      linkedin,
      website,
      github: "",
      portfolio: "",
      photoUrl: profile?.avatar_url || "",
    },
    summary: profile?.bio || "",
    experience: [
      {
        id: createResumeEntityId("exp"),
        role: "",
        company: "",
        location: "",
        startDate: "",
        endDate: "",
        current: false,
        bullets: [""],
      },
    ],
    education: [
      {
        id: createResumeEntityId("edu"),
        degree: profile?.course || "",
        institution: profile?.campus || "",
        location: "",
        startDate: "",
        endDate: "",
        score: "",
        details: "",
      },
    ],
    projects: [
      {
        id: createResumeEntityId("project"),
        name: "",
        role: "",
        link: "",
        startDate: "",
        endDate: "",
        bullets: [""],
      },
    ],
    skillGroups: [
      {
        id: createResumeEntityId("skills"),
        title: "Core Skills",
        items: profile?.skills?.length ? profile.skills : [""],
      },
    ],
    certifications: [],
    achievements: [],
    languages: [],
    interests: [],
    references: [],
    design: createDefaultResumeDesignSettings(),
  };
}

export function createDemoResumeDocument(profile?: ProfileRow | null): ResumeDocument {
  const defaults = createDefaultResumeDocument(profile);
  const fullName = defaults.contact.fullName || "Aarav Sharma";
  const role = defaults.contact.role || "Data Analyst Intern";
  const email = defaults.contact.email || "aarav.sharma@example.com";
  const phone = defaults.contact.phone || "+91 98765 43210";
  const location = defaults.contact.location || "Delhi, India";
  const linkedin = defaults.contact.linkedin || "linkedin.com/in/aarav-sharma";
  const website = defaults.contact.website || "aaravportfolio.dev";

  return {
    contact: {
      ...defaults.contact,
      fullName,
      role,
      email,
      phone,
      location,
      linkedin,
      website,
      github: "github.com/aarav-sharma",
      portfolio: "behance.net/aaravsharma",
      photoUrl: defaults.contact.photoUrl || "",
    },
    summary:
      "Detail-oriented student focused on analytics and product execution, with proven experience turning campus projects into measurable impact. Looking for internship and entry-level opportunities in data, operations, and growth roles.",
    experience: [
      {
        id: createResumeEntityId("exp"),
        role: "Data & Operations Intern",
        company: "CampusCore Labs",
        location: "Delhi, India",
        startDate: "Jan 2025",
        endDate: "Present",
        current: true,
        bullets: [
          "Built KPI dashboards for student campaigns and reduced weekly reporting time by 55%.",
          "Tracked activation funnels across 4 programs and improved completion rate from 48% to 67%.",
          "Collaborated with product and community teams to launch 2 data-driven feature rollouts.",
        ],
      },
      {
        id: createResumeEntityId("exp"),
        role: "Community Growth Associate",
        company: "Student Society",
        location: "Remote",
        startDate: "Aug 2024",
        endDate: "Dec 2024",
        current: false,
        bullets: [
          "Coordinated 12 campus learning events with 1,800+ cumulative participants.",
          "Designed engagement playbooks that increased repeat participation by 31%.",
          "Managed creator partnerships and prepared performance reports for stakeholders.",
        ],
      },
    ],
    education: [
      {
        id: createResumeEntityId("edu"),
        degree: defaults.education[0]?.degree || "B.Tech in Computer Science",
        institution: defaults.education[0]?.institution || "Delhi Technological University",
        location: "Delhi, India",
        startDate: "2022",
        endDate: "2026",
        score: "CGPA 8.7/10",
        details: "Coursework: Data Structures, DBMS, Statistics, Product Analytics.",
      },
    ],
    projects: [
      {
        id: createResumeEntityId("project"),
        name: "ATS Resume Maker",
        role: "Product Lead • React • Supabase",
        link: "github.com/aarav-sharma/ats-resume-maker",
        startDate: "2025",
        endDate: "Present",
        bullets: [
          "Implemented multi-template resume editing with live rendering and page-based export.",
          "Added offline-first drafts with local autosave and explicit cloud sync controls.",
        ],
      },
      {
        id: createResumeEntityId("project"),
        name: "Campus Placement Tracker",
        role: "Developer • TypeScript • SQL",
        link: "github.com/aarav-sharma/placement-tracker",
        startDate: "2024",
        endDate: "2025",
        bullets: [
          "Created a placement insights tool used by 300+ students across departments.",
          "Built filters and trend reports that reduced search time for opportunities.",
        ],
      },
    ],
    skillGroups: [
      {
        id: createResumeEntityId("skills"),
        title: "Technical Skills",
        items: ["SQL", "Excel", "TypeScript", "React", "Python", "Supabase"],
      },
      {
        id: createResumeEntityId("skills"),
        title: "Core Strengths",
        items: ["Data storytelling", "Problem solving", "Communication", "Team collaboration"],
      },
    ],
    certifications: [
      {
        id: createResumeEntityId("cert"),
        title: "Google Data Analytics",
        issuer: "Coursera",
        year: "2025",
      },
      {
        id: createResumeEntityId("cert"),
        title: "Power BI Fundamentals",
        issuer: "Microsoft",
        year: "2024",
      },
    ],
    achievements: [
      {
        id: createResumeEntityId("achievement"),
        title: "Hackathon Finalist",
        detail: "Top 10 out of 220 teams at National Student Buildathon 2025.",
      },
      {
        id: createResumeEntityId("achievement"),
        title: "Department Merit Scholarship",
        detail: "Awarded for academic and project excellence in 2024.",
      },
    ],
    languages: ["English", "Hindi"],
    interests: ["Student mentorship", "Product design", "Public speaking"],
    references: [
      {
        id: createResumeEntityId("ref"),
        name: "Ritika Mehta",
        role: "Program Lead",
        company: "CampusCore Labs",
        phone: "+91 90000 12345",
        email: "ritika.mehta@campuscore.io",
      },
    ],
    design: cloneResumeDesignSettings(defaults.design),
  };
}

export function createClearedResumeDocument(
  profile?: ProfileRow | null,
  design?: ResumeDesignSettings | null
): ResumeDocument {
  const defaults = createDefaultResumeDocument(profile);

  return {
    contact: {
      ...defaults.contact,
      fullName: "",
      role: "",
      email: "",
      phone: "",
      location: "",
      linkedin: "",
      website: "",
      github: "",
      portfolio: "",
      photoUrl: "",
    },
    summary: "",
    experience: [
      {
        id: createResumeEntityId("exp"),
        role: "",
        company: "",
        location: "",
        startDate: "",
        endDate: "",
        current: false,
        bullets: [""],
      },
    ],
    education: [
      {
        id: createResumeEntityId("edu"),
        degree: "",
        institution: "",
        location: "",
        startDate: "",
        endDate: "",
        score: "",
        details: "",
      },
    ],
    projects: [
      {
        id: createResumeEntityId("project"),
        name: "",
        role: "",
        link: "",
        startDate: "",
        endDate: "",
        bullets: [""],
      },
    ],
    skillGroups: [
      {
        id: createResumeEntityId("skills"),
        title: "Core Skills",
        items: [""],
      },
    ],
    certifications: [],
    achievements: [],
    languages: [],
    interests: [],
    references: [],
    design: cloneResumeDesignSettings(design || defaults.design),
  };
}

function ensureString(value: unknown) {
  return typeof value === "string" ? value : "";
}

function hasOwn(record: Record<string, unknown>, key: string) {
  return Object.prototype.hasOwnProperty.call(record, key);
}

function pickString(record: Record<string, unknown>, key: string, fallback: string) {
  if (hasOwn(record, key)) {
    return ensureString(record[key]);
  }

  return fallback;
}

function ensureStringArray(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map((item) => ensureString(item).trim()).filter(Boolean);
}

function normalizeExperience(value: unknown): ResumeExperienceItem[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map((item) => {
    const record = item && typeof item === "object" ? item as Record<string, unknown> : {};
    return {
      id: ensureString(record.id) || createResumeEntityId("exp"),
      role: ensureString(record.role),
      company: ensureString(record.company),
      location: ensureString(record.location),
      startDate: ensureString(record.startDate),
      endDate: ensureString(record.endDate),
      current: Boolean(record.current),
      bullets: ensureStringArray(record.bullets).length ? ensureStringArray(record.bullets) : [""],
    };
  });
}

function normalizeEducation(value: unknown): ResumeEducationItem[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map((item) => {
    const record = item && typeof item === "object" ? item as Record<string, unknown> : {};
    return {
      id: ensureString(record.id) || createResumeEntityId("edu"),
      degree: ensureString(record.degree),
      institution: ensureString(record.institution),
      location: ensureString(record.location),
      startDate: ensureString(record.startDate),
      endDate: ensureString(record.endDate),
      score: ensureString(record.score),
      details: ensureString(record.details),
    };
  });
}

function normalizeProjects(value: unknown): ResumeProjectItem[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map((item) => {
    const record = item && typeof item === "object" ? item as Record<string, unknown> : {};
    return {
      id: ensureString(record.id) || createResumeEntityId("project"),
      name: ensureString(record.name),
      role: ensureString(record.role),
      link: ensureString(record.link),
      startDate: ensureString(record.startDate),
      endDate: ensureString(record.endDate),
      bullets: ensureStringArray(record.bullets).length ? ensureStringArray(record.bullets) : [""],
    };
  });
}

function normalizeSkillGroups(value: unknown): ResumeSkillGroup[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map((item) => {
    const record = item && typeof item === "object" ? item as Record<string, unknown> : {};
    return {
      id: ensureString(record.id) || createResumeEntityId("skills"),
      title: ensureString(record.title) || "Skill Group",
      items: ensureStringArray(record.items).length ? ensureStringArray(record.items) : [""],
    };
  });
}

function normalizeCertifications(value: unknown): ResumeCertificationItem[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map((item) => {
    const record = item && typeof item === "object" ? item as Record<string, unknown> : {};
    return {
      id: ensureString(record.id) || createResumeEntityId("cert"),
      title: ensureString(record.title),
      issuer: ensureString(record.issuer),
      year: ensureString(record.year),
    };
  });
}

function normalizeAchievements(value: unknown): ResumeAchievementItem[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map((item) => {
    const record = item && typeof item === "object" ? item as Record<string, unknown> : {};
    return {
      id: ensureString(record.id) || createResumeEntityId("achievement"),
      title: ensureString(record.title),
      detail: ensureString(record.detail),
    };
  });
}

function normalizeReferences(value: unknown): ResumeReferenceItem[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map((item) => {
    const record = item && typeof item === "object" ? item as Record<string, unknown> : {};
    return {
      id: ensureString(record.id) || createResumeEntityId("ref"),
      name: ensureString(record.name),
      role: ensureString(record.role),
      company: ensureString(record.company),
      phone: ensureString(record.phone),
      email: ensureString(record.email),
    };
  });
}

export function normalizeResumeDocument(
  value: unknown,
  profile?: ProfileRow | null
): ResumeDocument {
  const defaults = createDefaultResumeDocument(profile);
  const record = value && typeof value === "object" ? value as Record<string, unknown> : {};
  const contact = record.contact && typeof record.contact === "object"
    ? record.contact as Record<string, unknown>
    : {};
  const normalizedExperience = normalizeExperience(record.experience);
  const normalizedEducation = normalizeEducation(record.education);
  const normalizedProjects = normalizeProjects(record.projects);
  const normalizedSkillGroups = normalizeSkillGroups(record.skillGroups);
  const normalizedCertifications = normalizeCertifications(record.certifications);
  const normalizedAchievements = normalizeAchievements(record.achievements);
  const normalizedReferences = normalizeReferences(record.references);
  const design = record.design && typeof record.design === "object"
    ? record.design as Record<string, unknown>
    : {};
  const defaultDesign = createDefaultResumeDesignSettings();
  const designStyles = design.styles && typeof design.styles === "object"
    ? design.styles as Record<string, unknown>
    : {};
  const designTheme = design.theme && typeof design.theme === "object"
    ? design.theme as Record<string, unknown>
    : {};
  const designOverrides = design.overrides && typeof design.overrides === "object"
    ? design.overrides as Record<string, unknown>
    : {};
  const designLayout = design.layout && typeof design.layout === "object"
    ? design.layout as ResumeDesignLayoutSettings
    : defaultDesign.layout;

  return {
    contact: {
      fullName: pickString(contact, "fullName", defaults.contact.fullName),
      role: pickString(contact, "role", defaults.contact.role),
      email: pickString(contact, "email", defaults.contact.email),
      phone: pickString(contact, "phone", defaults.contact.phone),
      location: pickString(contact, "location", defaults.contact.location),
      linkedin: pickString(contact, "linkedin", defaults.contact.linkedin),
      website: pickString(contact, "website", defaults.contact.website),
      github: pickString(contact, "github", defaults.contact.github),
      portfolio: pickString(contact, "portfolio", defaults.contact.portfolio),
      photoUrl: pickString(contact, "photoUrl", defaults.contact.photoUrl),
    },
    summary: hasOwn(record, "summary") ? ensureString(record.summary) : defaults.summary,
    experience: Array.isArray(record.experience) ? normalizedExperience : defaults.experience,
    education: Array.isArray(record.education) ? normalizedEducation : defaults.education,
    projects: Array.isArray(record.projects) ? normalizedProjects : defaults.projects,
    skillGroups: Array.isArray(record.skillGroups) ? normalizedSkillGroups : defaults.skillGroups,
    certifications: Array.isArray(record.certifications) ? normalizedCertifications : defaults.certifications,
    achievements: Array.isArray(record.achievements) ? normalizedAchievements : defaults.achievements,
    languages: Array.isArray(record.languages) ? ensureStringArray(record.languages) : defaults.languages,
    interests: Array.isArray(record.interests) ? ensureStringArray(record.interests) : defaults.interests,
    references: Array.isArray(record.references) ? normalizedReferences : defaults.references,
    design: {
      styles: {
        name: normalizeDesignBlockStyle(designStyles.name, defaultDesign.styles.name),
        role: normalizeDesignBlockStyle(designStyles.role, defaultDesign.styles.role),
        sectionTitle: normalizeDesignBlockStyle(
          designStyles.sectionTitle,
          defaultDesign.styles.sectionTitle
        ),
        body: normalizeDesignBlockStyle(designStyles.body, defaultDesign.styles.body),
        meta: normalizeDesignBlockStyle(designStyles.meta, defaultDesign.styles.meta),
      },
      overrides: Object.fromEntries(
        Object.entries(designOverrides).map(([key, entry]) => [key, normalizeDesignStyleOverride(entry)])
      ),
      theme: {
        pageBackground: normalizeDesignColor(
          designTheme.pageBackground,
          defaultDesign.theme.pageBackground
        ),
        primaryColor: normalizeDesignColor(
          designTheme.primaryColor,
          defaultDesign.theme.primaryColor
        ),
        panelColor: normalizeDesignColor(
          designTheme.panelColor,
          defaultDesign.theme.panelColor
        ),
      },
      layout: normalizeResumeLayoutSettings(designLayout),
    },
  };
}

export function slugifyResumeSeed(value: string) {
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 42);

  return normalized || "resume";
}

export function createShareSlug(seed: string) {
  return `${slugifyResumeSeed(seed)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function buildPublicResumePath(shareSlug: string, username: string) {
  return `/app/myroom/ats-resume-maker/live/${shareSlug}/${username}`;
}

function resolvePublicResumeOrigin() {
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

export function buildPublicResumeUrl(record: ResumeRecord) {
  const username = record.owner?.username || "profile";
  const path = buildPublicResumePath(record.share_slug, username);
  return `${resolvePublicResumeOrigin()}${path}`;
}

export function formatResumeDateRange(input: {
  startDate?: string;
  endDate?: string;
  current?: boolean;
}) {
  const start = input.startDate?.trim();
  const end = input.current ? "Present" : input.endDate?.trim();

  if (start && end) {
    return `${start} - ${end}`;
  }

  return start || end || "";
}

export function splitTextareaLines(value: string) {
  return value
    .split(/\r?\n/)
    .map((entry) => entry.trim())
    .filter(Boolean);
}

export function joinTextareaLines(items: string[]) {
  return items.filter(Boolean).join("\n");
}

export function clampResumePageCount(pageCount: number) {
  return Math.max(1, pageCount || 1);
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

export function resolveTemplateLabel(templateKey: ResumeTemplateKey) {
  switch (templateKey) {
    case "sidebar_professional":
      return "Sidebar Pro";
    case "executive_dark":
      return "Executive Dark";
    case "ats_classic":
    default:
      return "ATS Classic";
  }
}
