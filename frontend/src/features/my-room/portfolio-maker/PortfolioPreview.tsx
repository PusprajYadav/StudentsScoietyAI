import type { PortfolioColorMode, PortfolioRecord, PortfolioViewportKey } from "./types";
import { PortfolioTemplateRenderer } from "./templates";

export function PortfolioPreview({
  portfolio,
  viewportOverride,
  modeOverride,
  showModeToggle,
}: {
  portfolio: PortfolioRecord;
  viewportOverride?: PortfolioViewportKey;
  modeOverride?: PortfolioColorMode;
  showModeToggle?: boolean;
}) {
  return (
    <div className="min-h-[70vh]">
      <PortfolioTemplateRenderer
        portfolio={portfolio}
        viewportOverride={viewportOverride}
        modeOverride={modeOverride}
        showModeToggle={showModeToggle}
      />
    </div>
  );
}
