import { Check, Moon, Settings, Sun } from "lucide-react";
import type { ThemePreference } from "../../types/database";

interface ThemeOption {
  value: ThemePreference;
  label: string;
  icon: typeof Settings;
}

const themeOptions: ThemeOption[] = [
  {
    value: "system",
    label: "System",
    icon: Settings,
  },
  {
    value: "light",
    label: "Light",
    icon: Sun,
  },
  {
    value: "dark",
    label: "Dark",
    icon: Moon,
  },
];

export function ThemeSettingsSection({
  theme,
  onChangeTheme,
}: {
  theme: ThemePreference;
  onChangeTheme: (theme: ThemePreference) => void | Promise<void>;
}) {
  return (
    <div className="space-y-3">
      <div>
        <p className="text-sm font-semibold text-app-text">Theme</p>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {themeOptions.map((option) => {
          const active = theme === option.value;

          return (
            <button
              key={option.value}
              type="button"
              onClick={() => void onChangeTheme(option.value)}
              className={`relative flex min-h-[92px] flex-col items-center justify-center gap-2 rounded-[18px] border px-2 py-3 text-center transition ${
                active
                  ? "border-brand bg-brand/10 text-brand"
                  : "border-app-border bg-app-card text-app-text hover:border-brand/25 hover:bg-app-secondary"
              }`}
              aria-label={option.label}
            >
              {active ? (
                <span className="absolute right-2 top-2 inline-flex h-5 w-5 items-center justify-center rounded-full bg-brand text-white">
                  <Check className="h-3 w-3" />
                </span>
              ) : null}

              <div className={`flex h-10 w-10 items-center justify-center rounded-[14px] ${
                active ? "bg-brand text-white" : "bg-app-secondary"
              }`}>
                <option.icon className="h-4 w-4" />
              </div>
              <p className="text-xs font-semibold">{option.label}</p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
