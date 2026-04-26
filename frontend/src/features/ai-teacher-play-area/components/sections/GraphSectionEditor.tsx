import type { PlayAreaSection } from "../../types";
import { surfaceInputClassName } from "../../utils";

export function GraphSectionEditor({
  section,
  onChange,
}: {
  section: PlayAreaSection;
  onChange: (nextSection: PlayAreaSection) => void;
}) {
  return (
    <div className="space-y-3">
      <input
        value={section.graphUrl || ""}
        onChange={(event) => onChange({ ...section, graphUrl: event.target.value })}
        className={surfaceInputClassName}
        placeholder="Paste graph image URL"
      />
      <input
        value={section.graphCaption}
        onChange={(event) => onChange({ ...section, graphCaption: event.target.value })}
        className={surfaceInputClassName}
        placeholder="Graph caption"
      />
      {section.graphUrl ? <img src={section.graphUrl} alt={section.title || "Graph"} className="w-full rounded-[20px] border border-slate-200 object-cover" /> : null}
    </div>
  );
}
