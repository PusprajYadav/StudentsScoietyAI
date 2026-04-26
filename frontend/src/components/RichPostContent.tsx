import { useEffect, useRef, useState } from "react";
import { renderInteractiveText } from "./InteractiveText";

interface RichPostContentProps {
  content: string;
  linkUrl?: string | null;
  previewLines?: number | null;
}

export function RichPostContent({ content, linkUrl, previewLines = 4 }: RichPostContentProps) {
  const expandable = typeof previewLines === "number" && previewLines > 0;
  const [expanded, setExpanded] = useState(!expandable);
  const textRef = useRef<HTMLParagraphElement | null>(null);
  const [collapsedHeight, setCollapsedHeight] = useState<number | null>(null);
  const [canExpand, setCanExpand] = useState(false);

  useEffect(() => {
    setExpanded(!expandable);
  }, [content, expandable, linkUrl]);

  useEffect(() => {
    const textElement = textRef.current;

    if (!textElement || !content || !expandable) {
      setCollapsedHeight(null);
      setCanExpand(false);
      return;
    }

    const measure = () => {
      const computedLineHeight = Number.parseFloat(window.getComputedStyle(textElement).lineHeight);
      const safeLineHeight = Number.isFinite(computedLineHeight) && computedLineHeight > 0 ? computedLineHeight : 20;
      const nextCollapsedHeight = safeLineHeight * previewLines;

      setCollapsedHeight(nextCollapsedHeight);
      setCanExpand(textElement.scrollHeight > nextCollapsedHeight + 1);
    };

    measure();

    if (typeof ResizeObserver !== "undefined") {
      const observer = new ResizeObserver(() => {
        measure();
      });

      observer.observe(textElement);
      return () => observer.disconnect();
    }

    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [content, expandable, linkUrl, previewLines]);

  return (
    <div>
      {content ? (
        <div
          className={!expanded ? "overflow-hidden" : undefined}
          style={!expanded && collapsedHeight ? { maxHeight: `${collapsedHeight}px` } : undefined}
        >
          <p ref={textRef} className="whitespace-pre-wrap text-[13px] leading-5 text-app-text/90 sm:text-[14px] sm:leading-6 lg:text-[15px]">
            {renderInteractiveText(content)}
          </p>
        </div>
      ) : null}

      {!expanded && canExpand ? (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="mt-2.5 rounded-full bg-app-secondary px-2.5 py-1.5 text-[11px] font-semibold text-app-text sm:mt-3 sm:px-4 sm:py-2 sm:text-sm"
        >
          Read more
        </button>
      ) : null}

      {expanded && canExpand ? (
        <button
          type="button"
          onClick={() => setExpanded(false)}
          className="mt-2.5 rounded-full bg-app-secondary px-2.5 py-1.5 text-[11px] font-semibold text-app-text sm:mt-3 sm:px-4 sm:py-2 sm:text-sm"
        >
          Show less
        </button>
      ) : null}

      {linkUrl ? (
        <a
          href={linkUrl}
          target="_blank"
          rel="noreferrer"
          className="mt-3 inline-flex max-w-full truncate rounded-full bg-sky-500/10 px-2.5 py-1.5 text-[11px] font-semibold text-sky-600 transition hover:bg-sky-500/15 dark:text-sky-300 sm:mt-4 sm:px-4 sm:py-2 sm:text-sm"
        >
          {linkUrl}
        </a>
      ) : null}
    </div>
  );
}
