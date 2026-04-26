import type { CommunityFeedVisibility } from "../../types/database";
import { COMMUNITY_FEED_VISIBILITY_OPTIONS } from "./communityFeedVisibility";

interface CommunityFeedVisibilityPickerProps {
  value: CommunityFeedVisibility;
  disabled?: boolean;
  helperText?: string;
  compact?: boolean;
  onChange: (value: CommunityFeedVisibility) => void;
}

export function CommunityFeedVisibilityPicker({
  value,
  disabled = false,
  helperText = "Choose who can view community posts and whether they can surface in Discuss.",
  compact = false,
  onChange,
}: CommunityFeedVisibilityPickerProps) {
  return (
    <fieldset className="grid gap-2.5" disabled={disabled}>
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-app-muted">Post visibility</p>
        {helperText ? <p className="mt-1 text-xs leading-5 text-app-muted">{helperText}</p> : null}
      </div>

      <div className={`grid ${compact ? "gap-2 sm:grid-cols-3" : "gap-2.5"}`}>
        {COMMUNITY_FEED_VISIBILITY_OPTIONS.map((option) => {
          const selected = option.value === value;

          return (
            <label key={option.value} className="block">
              <input
                type="radio"
                name="community-feed-visibility"
                value={option.value}
                checked={selected}
                onChange={() => onChange(option.value)}
                className="peer sr-only"
                disabled={disabled}
              />
              <span
                className={`block rounded-[20px] border transition ${
                  compact ? "px-3 py-2.5" : "px-4 py-3"
                } ${
                  selected
                    ? "border-brand/30 bg-brand/10 shadow-[0_10px_22px_-18px_rgba(37,99,235,0.45)]"
                    : "border-app-border bg-app-card"
                } peer-disabled:opacity-60`}
              >
                <span className="flex items-start justify-between gap-3">
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold text-app-text">{option.label}</span>
                    {compact ? null : (
                      <span className="mt-1 block text-xs leading-5 text-app-muted">{option.description}</span>
                    )}
                  </span>
                  <span
                    className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] ${
                      selected ? "bg-brand text-white" : "bg-app-secondary text-app-muted"
                    }`}
                  >
                    {selected ? "Selected" : option.shortLabel}
                  </span>
                </span>
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
