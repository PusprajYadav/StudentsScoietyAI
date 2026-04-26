import { Laptop2, MoonStar, SunMedium } from "lucide-react";
import { useEffect, useState } from "react";
import type { PortfolioColorMode, PortfolioRecord, PortfolioViewportKey } from "./types";
import { normalizeTheme } from "./utils";
import { BoldCardsTemplate } from "./templates/BoldCardsTemplate";
import { CreativeTimelineTemplate } from "./templates/CreativeTimelineTemplate";
import { MinimalHeroTemplate } from "./templates/MinimalHeroTemplate";
import {
  buildPortfolioThemeVars,
  cx,
  resolveDisplayMode,
  resolveThemeTokens,
  resolveViewportFromWidth,
  withAlpha,
} from "./templates/templateHelpers";

export interface PortfolioRendererProps {
  portfolio: PortfolioRecord;
  viewportOverride?: PortfolioViewportKey;
  modeOverride?: PortfolioColorMode;
  showModeToggle?: boolean;
}

export function PortfolioTemplateRenderer({
  portfolio,
  viewportOverride,
  modeOverride,
  showModeToggle = false,
}: PortfolioRendererProps) {
  const theme = normalizeTheme(portfolio.theme, portfolio.template_key);
  const [systemMode, setSystemMode] = useState<PortfolioColorMode>(() => (
    typeof window !== "undefined" && window.matchMedia?.("(prefers-color-scheme: light)").matches ? "light" : "dark"
  ));
  const [interactiveMode, setInteractiveMode] = useState<PortfolioColorMode | null>(null);
  const [viewport, setViewport] = useState<PortfolioViewportKey>(() => (
    viewportOverride || (typeof window !== "undefined" ? resolveViewportFromWidth(window.innerWidth) : "desktop")
  ));

  useEffect(() => {
    if (viewportOverride) {
      setViewport(viewportOverride);
      return;
    }

    const applyViewport = () => setViewport(resolveViewportFromWidth(window.innerWidth));
    applyViewport();
    window.addEventListener("resize", applyViewport);
    return () => window.removeEventListener("resize", applyViewport);
  }, [viewportOverride]);

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) {
      return;
    }

    const mediaQuery = window.matchMedia("(prefers-color-scheme: light)");
    const updateSystemMode = () => setSystemMode(mediaQuery.matches ? "light" : "dark");
    updateSystemMode();
    mediaQuery.addEventListener("change", updateSystemMode);
    return () => mediaQuery.removeEventListener("change", updateSystemMode);
  }, []);

  const activeMode = modeOverride || interactiveMode || resolveDisplayMode(theme.displayMode, systemMode);
  const activeTokens = resolveThemeTokens(theme, activeMode);
  const style = buildPortfolioThemeVars(theme, activeMode);

  const Template =
    portfolio.template_key === "bold_cards"
      ? BoldCardsTemplate
      : portfolio.template_key === "creative_timeline"
        ? CreativeTimelineTemplate
        : MinimalHeroTemplate;

  const modeOptions: Array<{
    label: string;
    value: PortfolioColorMode;
    icon: typeof SunMedium;
  }> = [
    { label: "Light", value: "light", icon: SunMedium },
    { label: "Dark", value: "dark", icon: MoonStar },
  ];

  return (
    <div
      className="relative min-h-[70vh] w-full overflow-hidden"
      style={{
        ...style,
        color: "var(--p-text)",
        background: [
          `radial-gradient(circle at top left, ${withAlpha(activeTokens.primary, 0.18)}, transparent 28%)`,
          `radial-gradient(circle at top right, ${withAlpha(activeTokens.accent, 0.16)}, transparent 24%)`,
          `linear-gradient(180deg, ${activeTokens.background} 0%, ${activeTokens.background} 100%)`,
        ].join(", "),
      }}
    >
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-40"
        style={{
          background: `linear-gradient(180deg, ${withAlpha(activeTokens.text, 0.04)}, transparent)`,
        }}
      />

      {showModeToggle ? (
        <div className="absolute right-4 top-4 z-20 flex items-center gap-2 rounded-full border border-white/10 bg-black/10 p-1 backdrop-blur sm:right-6 sm:top-6">
          {modeOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setInteractiveMode(option.value)}
              className={cx(
                "inline-flex items-center gap-2 rounded-full px-3 py-2 text-xs font-semibold transition",
                activeMode === option.value ? "bg-white text-slate-900" : "text-white/85 hover:bg-white/10"
              )}
            >
              <option.icon className="h-4 w-4" />
              {option.label}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setInteractiveMode(null)}
            className={cx(
              "inline-flex items-center gap-2 rounded-full px-3 py-2 text-xs font-semibold transition",
              !interactiveMode ? "bg-white text-slate-900" : "text-white/85 hover:bg-white/10"
            )}
          >
            <Laptop2 className="h-4 w-4" />
            Auto
          </button>
        </div>
      ) : null}

      <Template portfolio={portfolio} viewport={viewport} colorMode={activeMode} />
    </div>
  );
}
