import {
  Barcode,
  Braces,
  Bug,
  CalendarCheck2,
  FileImage,
  FileText,
  FolderOpen,
  Headphones,
  Instagram,
  Mail,
  NotebookPen,
  NotebookText,
  QrCode,
  Sparkles,
  type LucideIcon,
} from "lucide-react";

export type RoomVariant = "resume" | "interview" | "portfolio" | "notes" | "tracker";
export type ToolWorkspace =
  | "audio"
  | "image"
  | "pdf"
  | "code"
  | "notes"
  | "bugfix"
  | "qr"
  | "barcode"
  | "mailer"
  | "instagram"
  | "teacher";
export type ToolCategory = "ai" | "non-ai" | "academic" | "business";
export type WorkspaceCategory = ToolCategory;
export type ToolAppSlug =
  | "audio-tools"
  | "image-studio"
  | "pdf-tools"
  | "code-studio"
  | "bugfix-lab"
  | "qr-code-tool"
  | "barcode-tool"
  | "bulk-mailer"
  | "instagram-automation"
  | "ai-teacher"
  | "ai-teacher-play-area";
export type WorkspaceAppKind = "room" | "tool";

interface WorkspaceAppBase {
  id: string;
  title: string;
  kicker: string;
  description: string;
  status: string;
  available: boolean;
  category: WorkspaceCategory;
  icon: LucideIcon;
  artClassName: string;
}

export interface RoomApp extends WorkspaceAppBase {
  kind: "room";
  variant: RoomVariant;
  href: string;
}

export interface ToolApp extends WorkspaceAppBase {
  kind: "tool";
  category: ToolCategory;
  workspace: ToolWorkspace;
  toolSlug: ToolAppSlug;
  href: string;
  myRoomHref: string;
}

export type WorkspaceCatalogApp = RoomApp | ToolApp;
export type MyRoomApp = RoomApp | ToolApp;

export const roomApps: readonly RoomApp[] = [
  {
    id: "ats_resume",
    title: "ATS Resume",
    kicker: "Build job-ready resumes",
    description: "Clean layouts, live links, and exports.",
    href: "/app/myroom/ats-resume-maker",
    status: "Live",
    available: true,
    category: "academic",
    icon: FileText,
    kind: "room",
    variant: "resume",
    artClassName: "from-[#2563eb] via-[#1d4ed8] to-[#60a5fa]",
  },
  {
    id: "portfolio",
    title: "Portfolio",
    kicker: "Show your work",
    description: "Projects, links, and student profiles.",
    href: "/app/myroom/portfolio-maker",
    status: "Live",
    available: true,
    category: "academic",
    icon: FolderOpen,
    kind: "room",
    variant: "portfolio",
    artClassName: "from-[#1f2937] via-[#111827] to-[#2563eb]",
  },
  {
    id: "whitebook_notebook",
    title: "WhiteBook Notebook",
    kicker: "Sketch notes locally",
    description: "Endless pages, whiteboard notes, feed sharing.",
    href: "/app/myroom/whitebook-notebook",
    status: "Live",
    available: true,
    category: "academic",
    icon: NotebookPen,
    kind: "room",
    variant: "notes",
    artClassName: "from-[#0f172a] via-[#1d4ed8] to-[#38bdf8]",
  },
  {
    id: "video_notes_maker",
    title: "Video Notes Maker",
    kicker: "Capture lecture notes",
    description: "Video-linked notes, image attachments, JSON and PDF export.",
    href: "/app/myroom/video-notes-maker",
    status: "Live",
    available: true,
    category: "academic",
    icon: NotebookText,
    kind: "room",
    variant: "notes",
    artClassName: "from-[#082f49] via-[#0369a1] to-[#7dd3fc]",
  },
  {
    id: "skill_tracker",
    title: "Daily Tracker",
    kicker: "Plan and track daily",
    description: "Tasks, goals, study logs, and reports.",
    href: "/app/myroom/daily-planner",
    status: "Live",
    available: true,
    category: "academic",
    icon: CalendarCheck2,
    kind: "room",
    variant: "tracker",
    artClassName: "from-[#111827] via-[#0f766e] to-[#22c55e]",
  },
] as const;

export const toolApps: readonly ToolApp[] = [
  {
    id: "ai-teacher",
    title: "AI Teacher",
    kicker: "Ask, learn, revise",
    description: "Questions, notes, summaries, quizzes, mindmaps, image solving, and graph-ready study help.",
    href: "/app/tools/ai-teacher",
    myRoomHref: "/app/myroom/tools/ai-teacher",
    status: "Live",
    available: true,
    icon: Sparkles,
    kind: "tool",
    category: "ai",
    toolSlug: "ai-teacher",
    workspace: "teacher",
    artClassName: "from-[#1f3a8a] via-[#0891b2] to-[#f59e0b]",
  },
  {
    id: "ai-teacher-play-area",
    title: "AI Teacher PlayArea",
    kicker: "Edit AI study outputs",
    description: "Notebook editing, flashcard redesign, highlights, local saves, reopen later, and PDF export.",
    href: "/app/tools/ai-teacher-play-area",
    myRoomHref: "/app/myroom/tools/ai-teacher-play-area",
    status: "Live",
    available: true,
    icon: NotebookText,
    kind: "tool",
    category: "ai",
    toolSlug: "ai-teacher-play-area",
    workspace: "notes",
    artClassName: "from-[#8b5e34] via-[#d4a373] to-[#fef3c7]",
  },
  {
    id: "audio-tools",
    title: "Audio Tools",
    kicker: "Edit sound locally",
    description: "Trim, merge, convert, extract, and polish audio files in-browser.",
    href: "/app/tools/audio-tools",
    myRoomHref: "/app/myroom/tools/audio-tools",
    status: "Live",
    available: true,
    icon: Headphones,
    kind: "tool",
    category: "non-ai",
    toolSlug: "audio-tools",
    workspace: "audio",
    artClassName: "from-[#07152b] via-[#0f766e] to-[#38bdf8]",
  },
  {
    id: "code-studio",
    title: "Code Studio",
    kicker: "Run code instantly",
    description: "Editor, stdin, runtimes, and console output.",
    href: "/app/tools/code-studio",
    myRoomHref: "/app/myroom/tools/code-studio",
    status: "Live",
    available: true,
    icon: Braces,
    kind: "tool",
    category: "academic",
    toolSlug: "code-studio",
    workspace: "code",
    artClassName: "from-[#0f172a] via-[#1d4ed8] to-[#38bdf8]",
  },
  {
    id: "bugfix-lab",
    title: "BugFix Lab",
    kicker: "Practice debugging",
    description: "Timed code fixes with hints, scoring, and PDF references.",
    href: "/app/tools/bugfix-lab",
    myRoomHref: "/app/myroom/tools/bugfix-lab",
    status: "Live",
    available: true,
    icon: Bug,
    kind: "tool",
    category: "academic",
    toolSlug: "bugfix-lab",
    workspace: "bugfix",
    artClassName: "from-[#111827] via-[#92400e] to-[#f59e0b]",
  },
  {
    id: "image-studio",
    title: "Image Studio",
    kicker: "Edit visuals locally",
    description: "Background, crop, passport, export.",
    href: "/app/tools/image-studio",
    myRoomHref: "/app/myroom/tools/image-studio",
    status: "Live",
    available: true,
    icon: FileImage,
    kind: "tool",
    category: "non-ai",
    toolSlug: "image-studio",
    workspace: "image",
    artClassName: "from-[#0f172a] via-[#1d4ed8] to-[#60a5fa]",
  },
  {
    id: "qr-code-tool",
    title: "QR Code Tool",
    kicker: "Create smart QR links",
    description: "Styled QR design, camera scan, drafts, and Supabase dynamic redirects.",
    href: "/app/tools/qr-code-tool",
    myRoomHref: "/app/myroom/tools/qr-code-tool",
    status: "Live",
    available: true,
    icon: QrCode,
    kind: "tool",
    category: "non-ai",
    toolSlug: "qr-code-tool",
    workspace: "qr",
    artClassName: "from-[#020617] via-[#1d4ed8] to-[#14b8a6]",
  },
  {
    id: "barcode-tool",
    title: "Barcode Tool",
    kicker: "Generate printable labels",
    description: "CODE128, EAN, UPC, scanner, export, and reusable local presets.",
    href: "/app/tools/barcode-tool",
    myRoomHref: "/app/myroom/tools/barcode-tool",
    status: "Live",
    available: true,
    icon: Barcode,
    kind: "tool",
    category: "non-ai",
    toolSlug: "barcode-tool",
    workspace: "barcode",
    artClassName: "from-[#111827] via-[#f97316] to-[#facc15]",
  },
  {
    id: "bulk-mailer",
    title: "Bulk Mailer",
    kicker: "Templates to campaigns",
    description: "User SMTP, admin fallback SMTP, CSV mapping, campaigns, and open-rate analytics.",
    href: "/app/tools/bulk-mailer/compose",
    myRoomHref: "/app/myroom/tools/bulk-mailer/compose",
    status: "Live",
    available: true,
    icon: Mail,
    kind: "tool",
    category: "business",
    toolSlug: "bulk-mailer",
    workspace: "mailer",
    artClassName: "from-[#082f49] via-[#1d4ed8] to-[#14b8a6]",
  },
  {
    id: "instagram-automation",
    title: "Instagram Automation",
    kicker: "Comments, DMs, and webhooks",
    description: "Meta OAuth, comment replies, DM automation, comment-to-DM flows, logs, and analytics.",
    href: "/app/tools/instagram-automation",
    myRoomHref: "/app/myroom/tools/instagram-automation",
    status: "Live",
    available: true,
    icon: Instagram,
    kind: "tool",
    category: "business",
    toolSlug: "instagram-automation",
    workspace: "instagram",
    artClassName: "from-[#43156e] via-[#c026d3] to-[#f97316]",
  },
  {
    id: "pdf-tools",
    title: "PDF Tools",
    kicker: "Work with documents",
    description: "Merge, split, lock, edit, convert.",
    href: "/app/tools/pdf-tools",
    myRoomHref: "/app/myroom/tools/pdf-tools",
    status: "Live",
    available: true,
    icon: FileText,
    kind: "tool",
    category: "non-ai",
    toolSlug: "pdf-tools",
    workspace: "pdf",
    artClassName: "from-[#111827] via-[#14532d] to-[#22c55e]",
  },
] as const;

export const roomAppIds = roomApps.map((app) => app.id);
export const toolAppIds = toolApps.map((app) => app.id);
export const defaultMyRoomAppIds = [
  "skill_tracker",
  "ats_resume",
  "portfolio",
  "video_notes_maker",
] as const;
export const defaultRoomApps = defaultMyRoomAppIds
  .map((id) => roomApps.find((app) => app.id === id))
  .filter((app): app is RoomApp => Boolean(app));
export const allWorkspaceAppIds = [...roomAppIds, ...toolAppIds];
export const workspaceCatalogApps: readonly WorkspaceCatalogApp[] = [...roomApps, ...toolApps];

export function getToolAppBySlug(toolSlug?: string) {
  return toolApps.find((tool) => tool.toolSlug === toolSlug) || null;
}

export function getToolAppById(toolId: string) {
  return toolApps.find((tool) => tool.id === toolId) || null;
}
