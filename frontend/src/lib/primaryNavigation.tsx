import {
  BookOpen,
  Mail,
  MessageSquare,
  User,
  Users,
  type LucideIcon,
} from "lucide-react";
import {
  allWorkspaceAppIds,
  workspaceCatalogApps,
  type WorkspaceCatalogApp,
  type ToolAppSlug,
} from "../data/workspaceApps";

export type PrimaryNavigationId =
  | "discussion"
  | "community"
  | "my-room"
  | "emails"
  | "profile"
  | WorkspaceCatalogApp["id"];

export interface PrimaryNavigationItem {
  id: PrimaryNavigationId;
  label: string;
  mobileLabel: string;
  icon: LucideIcon;
  to: string;
  matchPrefixes: string[];
  kind: "core" | "workspace";
  description: string;
  groupLabel: string;
}

export const DEFAULT_PRIMARY_NAVIGATION_IDS: PrimaryNavigationId[] = [
  "discussion",
  "community",
  "my-room",
  "emails",
  "profile",
];

export const PRIMARY_NAVIGATION_VALID_IDS: PrimaryNavigationId[] = [
  ...DEFAULT_PRIMARY_NAVIGATION_IDS,
  ...allWorkspaceAppIds,
];

const primaryNavigationAliases: Partial<Record<string, PrimaryNavigationId>> = {
  discuss: "discussion",
  discussions: "discussion",
  communities: "community",
  myroom: "my-room",
  room: "my-room",
};

function getToolMobileLabel(toolSlug: ToolAppSlug) {
  switch (toolSlug) {
    case "ai-teacher":
      return "Teacher";
    case "ai-teacher-play-area":
      return "PlayArea";
    case "audio-tools":
      return "Audio";
    case "image-studio":
      return "Image";
    case "pdf-tools":
      return "PDF";
    case "code-studio":
      return "Code";
    case "bugfix-lab":
      return "BugFix";
    case "qr-code-tool":
      return "QR";
    case "barcode-tool":
      return "Barcode";
    case "bulk-mailer":
      return "Mailer";
    case "instagram-automation":
      return "Insta";
    default:
      return "Tool";
  }
}

function getWorkspaceMobileLabel(app: WorkspaceCatalogApp) {
  if (app.kind === "tool") {
    return getToolMobileLabel(app.toolSlug);
  }

  switch (app.id) {
    case "ats_resume":
      return "Resume";
    case "portfolio":
      return "Portfolio";
    case "whitebook_notebook":
      return "WhiteBook";
    case "video_notes_maker":
      return "Video";
    case "skill_tracker":
      return "Tracker";
    default:
      return app.title.split(" ")[0] || "App";
  }
}

function getWorkspaceMatchPrefixes(app: WorkspaceCatalogApp) {
  if (app.kind === "tool") {
    return [`/app/tools/${app.toolSlug}`, `/app/myroom/tools/${app.toolSlug}`];
  }

  return [app.href];
}

function normalizeId(input: string | null | undefined): PrimaryNavigationId | null {
  if (!input) {
    return null;
  }

  const normalizedInput = input.trim().toLowerCase();
  const aliased = primaryNavigationAliases[normalizedInput];
  const candidate = aliased || (input as PrimaryNavigationId);

  return PRIMARY_NAVIGATION_VALID_IDS.includes(candidate) ? candidate : null;
}

export function normalizePrimaryNavigationIds(candidateIds: string[] | undefined) {
  const seen = new Set<PrimaryNavigationId>();
  const normalized: PrimaryNavigationId[] = [];

  candidateIds?.forEach((candidateId) => {
    const normalizedId = normalizeId(candidateId);

    if (!normalizedId || seen.has(normalizedId)) {
      return;
    }

    seen.add(normalizedId);
    normalized.push(normalizedId);
  });

  return normalized;
}

export function ensurePrimaryNavigationIds(candidateIds: string[] | undefined) {
  const normalized = normalizePrimaryNavigationIds(candidateIds);

  if (normalized.length > 0) {
    return normalized;
  }

  return [...DEFAULT_PRIMARY_NAVIGATION_IDS];
}

export function movePrimaryNavigationItem<T>(items: T[], fromIndex: number, toIndex: number) {
  if (
    fromIndex < 0 ||
    fromIndex >= items.length ||
    toIndex < 0 ||
    toIndex >= items.length
  ) {
    return items;
  }

  const next = [...items];
  const [item] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, item);
  return next;
}

export function createPrimaryNavigationCatalog(profilePath: string): PrimaryNavigationItem[] {
  const coreItems: PrimaryNavigationItem[] = [
    {
      id: "discussion",
      label: "Discussion",
      mobileLabel: "Discuss",
      icon: MessageSquare,
      to: "/app/discussions/study",
      matchPrefixes: ["/app/discussions"],
      kind: "core",
      description: "Open the discussion feed.",
      groupLabel: "Core tab",
    },
    {
      id: "community",
      label: "Community",
      mobileLabel: "Community",
      icon: Users,
      to: "/app/communities",
      matchPrefixes: ["/app/communities"],
      kind: "core",
      description: "Browse communities and feed controls.",
      groupLabel: "Core tab",
    },
    {
      id: "my-room",
      label: "My Room",
      mobileLabel: "My Room",
      icon: BookOpen,
      to: "/app/tools?view=my-room",
      matchPrefixes: ["/app/tools", "/app/myroom"],
      kind: "core",
      description: "Open your saved room workspace.",
      groupLabel: "Core tab",
    },
    {
      id: "emails",
      label: "Emails",
      mobileLabel: "Emails",
      icon: Mail,
      to: "/app/emails",
      matchPrefixes: ["/app/emails"],
      kind: "core",
      description: "Go to email services and inbox tools.",
      groupLabel: "Core tab",
    },
    {
      id: "profile",
      label: "Profile",
      mobileLabel: "Profile",
      icon: User,
      to: profilePath,
      matchPrefixes: ["/profile"],
      kind: "core",
      description: "Open your profile and personal settings.",
      groupLabel: "Core tab",
    },
  ];

  const workspaceItems: PrimaryNavigationItem[] = workspaceCatalogApps.map((app) => ({
    id: app.id,
    label: app.title,
    mobileLabel: getWorkspaceMobileLabel(app),
    icon: app.icon,
    to: app.href,
    matchPrefixes: getWorkspaceMatchPrefixes(app),
    kind: "workspace",
    description: app.description,
    groupLabel: app.kind === "tool" ? "Tool shortcut" : "Room shortcut",
  }));

  return [...coreItems, ...workspaceItems];
}
