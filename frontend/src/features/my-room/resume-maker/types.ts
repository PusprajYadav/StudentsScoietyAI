import type {
  ProfileRow,
  ResumeTemplateKey,
  StudentResumeWithOwner,
} from "../../../types/database";

export interface ResumeContact {
  fullName: string;
  role: string;
  email: string;
  phone: string;
  location: string;
  linkedin: string;
  website: string;
  github: string;
  portfolio: string;
  photoUrl: string;
}

export interface ResumeExperienceItem {
  id: string;
  role: string;
  company: string;
  location: string;
  startDate: string;
  endDate: string;
  current: boolean;
  bullets: string[];
}

export interface ResumeEducationItem {
  id: string;
  degree: string;
  institution: string;
  location: string;
  startDate: string;
  endDate: string;
  score: string;
  details: string;
}

export interface ResumeProjectItem {
  id: string;
  name: string;
  role: string;
  link: string;
  startDate: string;
  endDate: string;
  bullets: string[];
}

export interface ResumeSkillGroup {
  id: string;
  title: string;
  items: string[];
}

export interface ResumeCertificationItem {
  id: string;
  title: string;
  issuer: string;
  year: string;
}

export interface ResumeAchievementItem {
  id: string;
  title: string;
  detail: string;
}

export interface ResumeReferenceItem {
  id: string;
  name: string;
  role: string;
  company: string;
  phone: string;
  email: string;
}

export type ResumeDesignBlockKey =
  | "name"
  | "role"
  | "sectionTitle"
  | "body"
  | "meta";

export interface ResumeDesignBlockStyle {
  fontSize: number;
  color: string;
  paddingTop: number;
  paddingRight: number;
  paddingBottom: number;
  paddingLeft: number;
}

export interface ResumeDesignStyleOverride {
  fontSize?: number;
  color?: string;
  paddingTop?: number;
  paddingRight?: number;
  paddingBottom?: number;
  paddingLeft?: number;
}

export interface ResumeDesignSelection {
  block: ResumeDesignBlockKey;
  targetKey: string | null;
  label: string | null;
}

export interface ResumeThemeSettings {
  pageBackground: string;
  primaryColor: string;
  panelColor: string;
}

export type ResumeAtsSectionKey =
  | "summary"
  | "experience"
  | "projects"
  | "education"
  | "skills"
  | "achievements"
  | "languages"
  | "certifications"
  | "interests"
  | "references";

export type ResumeSidebarSectionKey =
  | "contact"
  | "summary"
  | "experience"
  | "projects"
  | "education"
  | "skills"
  | "achievements"
  | "languages"
  | "certifications"
  | "interests"
  | "references";

export type ResumeExecutiveSectionKey =
  | "experience"
  | "projects"
  | "education"
  | "skills"
  | "achievements"
  | "languages"
  | "certifications"
  | "interests"
  | "references";

export type ResumeLayoutMode = "template" | "freeform";

export type ResumeCanvasSectionKey =
  | "header"
  | "contact"
  | "summary"
  | "experience"
  | "projects"
  | "education"
  | "skills"
  | "achievements"
  | "languages"
  | "certifications"
  | "interests"
  | "references";

export interface ResumeFreeformSectionPlacement {
  page: number;
  x: number;
  y: number;
  width: number;
}

export interface ResumeFreeformLayoutSettings {
  placements: Partial<Record<ResumeCanvasSectionKey, ResumeFreeformSectionPlacement>>;
}

export interface ResumeDesignLayoutSettings {
  mode: ResumeLayoutMode;
  atsOrder: ResumeAtsSectionKey[];
  sidebarSections: {
    left: ResumeSidebarSectionKey[];
    right: ResumeSidebarSectionKey[];
  };
  executiveColumns: {
    left: ResumeExecutiveSectionKey[];
    right: ResumeExecutiveSectionKey[];
  };
  freeform: ResumeFreeformLayoutSettings;
}

export interface ResumeDesignSettings {
  styles: Record<ResumeDesignBlockKey, ResumeDesignBlockStyle>;
  overrides: Record<string, ResumeDesignStyleOverride>;
  theme: ResumeThemeSettings;
  layout: ResumeDesignLayoutSettings;
}

export interface ResumeDocument {
  contact: ResumeContact;
  summary: string;
  experience: ResumeExperienceItem[];
  education: ResumeEducationItem[];
  projects: ResumeProjectItem[];
  skillGroups: ResumeSkillGroup[];
  certifications: ResumeCertificationItem[];
  achievements: ResumeAchievementItem[];
  languages: string[];
  interests: string[];
  references: ResumeReferenceItem[];
  design: ResumeDesignSettings;
}

export type ResumeOwnerPreview = Pick<
  ProfileRow,
  "id" | "username" | "full_name" | "avatar_url"
>;

export interface ResumeRecord
  extends Omit<StudentResumeWithOwner, "content" | "owner"> {
  content: ResumeDocument;
  owner: ResumeOwnerPreview | null;
}

export interface ResumeTemplateOption {
  key: ResumeTemplateKey;
  label: string;
  description: string;
  badge: string;
  accentClassName: string;
}
