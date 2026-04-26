import type { ImageToolTab } from "./types";

interface ImageToolTabsProps {
  activeTool: ImageToolTab;
  toolMeta: Record<ImageToolTab, { label: string; description: string }>;
  onSelect: (tool: ImageToolTab) => void;
}

export function ImageToolTabs({ activeTool, toolMeta, onSelect }: ImageToolTabsProps) {
  return (
    <div className="pb-1">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:flex lg:flex-wrap">
        {(Object.keys(toolMeta) as ImageToolTab[]).map((tool) => (
          <button
            key={tool}
            type="button"
            className={
              activeTool === tool
                ? "tab-active min-h-[40px] w-full rounded-[18px] px-2.5 py-2 text-[10px] font-semibold leading-tight sm:text-[11px]"
                : "tab-inactive min-h-[40px] w-full rounded-[18px] px-2.5 py-2 text-[10px] leading-tight sm:text-[11px]"
            }
            onClick={() => onSelect(tool)}
          >
            {toolMeta[tool].label}
          </button>
        ))}
      </div>
    </div>
  );
}
