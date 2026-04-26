import type { LucideIcon } from "lucide-react";
import { Link } from "react-router-dom";

export type ProfileSettingsSectionId =
  | "wallet"
  | "ai-replies"
  | "theme"
  | "privacy"
  | "feed"
  | "navigation"
  | "account";

export interface ProfileSettingsSectionMeta {
  id: ProfileSettingsSectionId;
  label: string;
  description: string;
  icon: LucideIcon;
  href: string;
}

export function ProfileSettingsTabs({
  sections,
  activeSection,
}: {
  sections: ProfileSettingsSectionMeta[];
  activeSection: ProfileSettingsSectionId | null;
}) {
  return (
    <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
      {sections.map((section) => {
        const active = activeSection === section.id;

        return (
          <Link
            key={section.id}
            to={section.href}
            aria-label={section.label}
            title={section.label}
            className={`inline-flex min-w-0 items-center justify-center gap-1.5 rounded-[16px] border px-2 py-2.5 text-xs font-semibold transition sm:rounded-full sm:px-3 sm:py-2 ${
              active
                ? "border-brand bg-brand text-white shadow-[0_14px_24px_-18px_rgba(37,99,235,0.7)]"
                : "border-app-border bg-app-card text-app-text hover:border-brand/25 hover:bg-app-secondary"
            }`}
          >
            <section.icon className={`h-4 w-4 shrink-0 ${active ? "text-white" : "text-brand"}`} />
            <span className="hidden truncate sm:inline">{section.label}</span>
          </Link>
        );
      })}
    </div>
  );
}
