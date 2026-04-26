import { LogOut, Moon, Settings2, Sun, X } from "lucide-react";
import type { ThemePreference } from "../../types/database";

interface ProfileSettingsSheetProps {
  open: boolean;
  currentTheme: ThemePreference;
  onThemeChange: (nextTheme: ThemePreference) => void;
  onClose: () => void;
  onLogout: () => Promise<void>;
}

const themeOptions: Array<{
  value: ThemePreference;
  label: string;
  description: string;
  icon: typeof Settings2;
}> = [
  {
    value: "system",
    label: "System",
    description: "Follow your device appearance.",
    icon: Settings2,
  },
  {
    value: "light",
    label: "Light",
    description: "Pure white and blue.",
    icon: Sun,
  },
  {
    value: "dark",
    label: "Dark",
    description: "Pure black and blue.",
    icon: Moon,
  },
];

export function ProfileSettingsSheet({
  open,
  currentTheme,
  onThemeChange,
  onClose,
  onLogout,
}: ProfileSettingsSheetProps) {
  if (!open) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/55 p-3 backdrop-blur-sm"
      onClick={onClose}
      role="presentation"
    >
      <div className="flex h-full w-full items-end justify-center sm:items-center">
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Profile settings"
          onClick={(event) => event.stopPropagation()}
          className="w-full max-w-lg overflow-hidden rounded-[30px] border border-app-border bg-app-card shadow-2xl"
        >
          <div className="flex items-start justify-between border-b border-app-border px-5 py-4">
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-brand">Profile settings</p>
              <h2 className="mt-1 font-display text-xl font-semibold">App theme and account</h2>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="rounded-full border border-app-border bg-app-secondary p-2 text-app-muted transition hover:text-app-text"
              aria-label="Close profile settings"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="space-y-5 px-5 py-5">
            <section className="space-y-3">
              <div className="flex items-center gap-2">
                <Settings2 className="h-4 w-4 text-brand" />
                <p className="text-sm font-semibold text-app-text">App theme</p>
              </div>

              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                {themeOptions.map((option) => {
                  const active = currentTheme === option.value;

                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => onThemeChange(option.value)}
                      className={`rounded-2xl border px-4 py-3 text-left transition ${
                        active
                          ? "border-brand bg-brand/10 text-brand"
                          : "border-app-border bg-app-secondary text-app-text hover:border-brand/30"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <option.icon className="h-4 w-4" />
                        <span className="font-semibold">{option.label}</span>
                      </div>
                      <p className="mt-2 text-xs leading-5 text-app-muted">{option.description}</p>
                    </button>
                  );
                })}
              </div>
            </section>

            <section className="space-y-3">
              <p className="text-sm font-semibold text-app-text">Account</p>
              <button
                type="button"
                onClick={async () => {
                  await onLogout();
                }}
                className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm font-semibold text-rose-600 transition hover:bg-rose-500/15 dark:text-rose-300"
              >
                <LogOut className="h-4 w-4" />
                Log out
              </button>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
