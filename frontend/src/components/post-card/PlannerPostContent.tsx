import { Lock } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { RichPostContent } from "../RichPostContent";

function splitPlannerPostContent(content: string) {
  const primaryMarker = "\n\nPlanner snapshot\n\n";
  const secondaryMarker = "\n\nDaily Planner Snapshot\n\n";

  if (content.includes(primaryMarker)) {
    const [note, snapshot] = content.split(primaryMarker);
    return {
      note: note.trim(),
      snapshot: snapshot.trim(),
    };
  }

  if (content.includes(secondaryMarker)) {
    const [note, snapshot] = content.split(secondaryMarker);
    return {
      note: note.trim(),
      snapshot: snapshot.trim(),
    };
  }

  return {
    note: "",
    snapshot: content.trim(),
  };
}

export function PlannerPostContent({
  content,
  linkUrl,
}: {
  content: string;
  linkUrl?: string | null;
}) {
  const [expanded, setExpanded] = useState(false);
  const snapshotRef = useRef<HTMLPreElement | null>(null);
  const [collapsedHeight, setCollapsedHeight] = useState<number | null>(null);
  const [canExpand, setCanExpand] = useState(false);
  const { note, snapshot } = useMemo(() => splitPlannerPostContent(content), [content]);

  useEffect(() => {
    setExpanded(false);
  }, [content, linkUrl]);

  useEffect(() => {
    const snapshotElement = snapshotRef.current;

    if (!snapshotElement || !snapshot) {
      setCollapsedHeight(null);
      setCanExpand(false);
      return;
    }

    const measure = () => {
      const computedLineHeight = Number.parseFloat(window.getComputedStyle(snapshotElement).lineHeight);
      const safeLineHeight = Number.isFinite(computedLineHeight) && computedLineHeight > 0 ? computedLineHeight : 20;
      const nextCollapsedHeight = safeLineHeight * 4;

      setCollapsedHeight(nextCollapsedHeight);
      setCanExpand(snapshotElement.scrollHeight > nextCollapsedHeight + 1);
    };

    measure();

    if (typeof ResizeObserver !== "undefined") {
      const observer = new ResizeObserver(() => {
        measure();
      });

      observer.observe(snapshotElement);
      return () => observer.disconnect();
    }

    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [snapshot]);

  return (
    <div className="space-y-3">
      {note || linkUrl ? <RichPostContent content={note} linkUrl={linkUrl} /> : null}

      {snapshot ? (
        <section className="rounded-[18px] border border-app-border bg-app-secondary/45 p-3 sm:rounded-[22px] sm:p-4">
          <div className="mb-2 flex items-center gap-2 text-app-text">
            <Lock className="h-4 w-4 text-brand" />
            <p className="text-[12px] font-semibold sm:text-sm">Planner snapshot</p>
          </div>

          <div
            className={!expanded ? "overflow-hidden" : undefined}
            style={!expanded && collapsedHeight ? { maxHeight: `${collapsedHeight}px` } : undefined}
          >
            <pre
              ref={snapshotRef}
              className="whitespace-pre-wrap font-sans text-[12px] leading-5 text-app-text/90 sm:text-[13px] sm:leading-6"
            >
              {snapshot}
            </pre>
          </div>

          {canExpand ? (
            <button
              type="button"
              onClick={() => setExpanded((current) => !current)}
              className="mt-3 rounded-full bg-app-card px-3 py-1.5 text-[11px] font-semibold text-app-text sm:text-xs"
            >
              {expanded ? "Show less" : "Read full snapshot"}
            </button>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}
