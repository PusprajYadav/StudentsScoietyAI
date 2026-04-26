import { PenSquare } from "lucide-react";
import type { CSSProperties, ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { useThemeStore } from "../store/themeStore";

interface FloatingPostButtonProps {
  targetId?: string;
  to?: string;
  label?: string;
  desktopLabel?: string;
  className?: string;
  icon?: ReactNode;
  hideLabels?: boolean;
  ariaLabel?: string;
  style?: CSSProperties;
}

function withAlphaColor(color: string, alpha: number, fallback: string) {
  if (color.startsWith("#")) {
    let hex = color.slice(1);
    if (hex.length === 3) {
      hex = hex
        .split("")
        .map((char) => char + char)
        .join("");
    }

    if (hex.length === 6) {
      const red = Number.parseInt(hex.slice(0, 2), 16);
      const green = Number.parseInt(hex.slice(2, 4), 16);
      const blue = Number.parseInt(hex.slice(4, 6), 16);
      return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
    }
  }

  const rgbMatch = color.match(/^rgb\(\s*(\d+),\s*(\d+),\s*(\d+)\s*\)$/i);
  if (rgbMatch) {
    return `rgba(${rgbMatch[1]}, ${rgbMatch[2]}, ${rgbMatch[3]}, ${alpha})`;
  }

  const rgbaMatch = color.match(/^rgba\(\s*(\d+),\s*(\d+),\s*(\d+),\s*[\d.]+\s*\)$/i);
  if (rgbaMatch) {
    return `rgba(${rgbaMatch[1]}, ${rgbaMatch[2]}, ${rgbaMatch[3]}, ${alpha})`;
  }

  return fallback;
}

export function FloatingPostButton({
  targetId,
  to,
  label = "Post",
  desktopLabel,
  className = "",
  icon,
  hideLabels = false,
  ariaLabel = "Create a new post",
  style,
}: FloatingPostButtonProps) {
  const navigate = useNavigate();
  const { resolvedTheme } = useThemeStore();
  const defaultBackgroundColor =
    resolvedTheme === "dark" ? "rgba(37,99,235,0.9)" : "rgba(37,99,235,0.98)";
  const defaultBorderColor =
    resolvedTheme === "dark" ? "rgba(191,219,254,0.26)" : "rgba(219,234,254,0.52)";
  const defaultTextColor = "#ffffff";
  const defaultShadow =
    resolvedTheme === "dark"
      ? "0 24px 42px -22px rgba(37,99,235,0.44)"
      : "0 24px 42px -20px rgba(37,99,235,0.48)";
  const resolvedStyle: CSSProperties = {
    backgroundColor: defaultBackgroundColor,
    borderColor: defaultBorderColor,
    color: defaultTextColor,
    boxShadow: defaultShadow,
    ...style,
  };
  const resolvedColor = typeof resolvedStyle.color === "string" ? resolvedStyle.color : "#241d35";
  const iconSurface = withAlphaColor(resolvedColor, 0.16, "rgba(255,255,255,0.18)");
  const iconBorder = withAlphaColor(resolvedColor, 0.2, "rgba(255,255,255,0.24)");

  return (
    <button
      type="button"
      onClick={() => {
        if (to) {
          navigate(to);
          return;
        }

        if (!targetId) {
          return;
        }

        const target = document.getElementById(targetId);
        if (!target) {
          return;
        }

        target.scrollIntoView({ behavior: "smooth", block: "start" });
        window.setTimeout(() => {
          const focusable = target.querySelector("textarea, input");
          if (focusable instanceof HTMLElement) {
            focusable.focus();
          }
        }, 220);
      }}
      className={`fixed bottom-[calc(env(safe-area-inset-bottom,0px)+5.25rem)] right-[calc(env(safe-area-inset-right,0px)+1rem)] z-40 inline-flex min-h-[2.9rem] translate-x-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-1.5 text-[0.86rem] font-semibold tracking-[-0.01em] backdrop-blur-xl transition duration-200 hover:-translate-y-0.5 active:scale-[0.98] md:bottom-7 md:right-6 md:min-h-[3.25rem] md:justify-start md:gap-2.5 md:px-3.5 md:py-2.5 md:text-sm lg:bottom-8 lg:right-8 ${className}`.trim()}
      aria-label={ariaLabel}
      style={resolvedStyle}
    >
      <span
        className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-[0.9rem] border shadow-[inset_0_1px_0_rgba(255,255,255,0.26)] md:h-8 md:w-8"
        style={{
          backgroundColor: iconSurface,
          borderColor: iconBorder,
          color: resolvedColor,
        }}
      >
        {icon || <PenSquare className="h-3.5 w-3.5 md:h-4 md:w-4" />}
      </span>
      {!hideLabels ? <span className="leading-none md:hidden">{label}</span> : null}
      {!hideLabels ? <span className="hidden leading-none md:inline">{desktopLabel || label}</span> : null}
    </button>
  );
}
