import { Link } from "react-router-dom";
import type { ProfileSettingsSectionMeta } from "./ProfileSettingsTabs";

export function ProfileSettingsOverview({
  sections,
}: {
  sections: ProfileSettingsSectionMeta[];
}) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {sections.map((section) => (
          <Link
            key={section.id}
            to={section.href}
            className="group flex items-center gap-2 rounded-[18px] border border-app-border bg-app-card px-3 py-3 transition hover:border-brand/25 hover:bg-app-secondary"
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[14px] bg-brand/10 text-brand transition group-hover:bg-brand group-hover:text-white">
              <section.icon className="h-4 w-4" />
            </div>

            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-app-text">
                {section.label}
              </p>
              <p className="truncate text-[11px] text-app-muted">
                {section.description}
              </p>
            </div>
          </Link>
        ))}
    </div>
  );
}
