import type { ResumeTemplateOption } from "./types";

export const DEFAULT_RESUME_LIMIT = 5;
export const RESUME_PAGE_WIDTH = 794;
export const RESUME_PAGE_HEIGHT = 1123;

export const resumeTemplateOptions: ResumeTemplateOption[] = [
  {
    key: "ats_classic",
    label: "ATS Classic",
    description: "Single-column, recruiter-friendly, clean sections with guided ordering and safer automatic page flow.",
    badge: "Best for ATS",
    accentClassName: "from-slate-900 to-slate-700",
  },
  {
    key: "sidebar_professional",
    label: "Sidebar Pro",
    description: "Profile-first layout with a compact sidebar and guided section flow controls for cleaner customization.",
    badge: "Modern layout",
    accentClassName: "from-stone-400 to-slate-500",
  },
  {
    key: "executive_dark",
    label: "Executive Dark",
    description: "Bold header and balanced two-column storytelling with guided section and column ordering.",
    badge: "Portfolio style",
    accentClassName: "from-slate-900 to-emerald-700",
  },
];
