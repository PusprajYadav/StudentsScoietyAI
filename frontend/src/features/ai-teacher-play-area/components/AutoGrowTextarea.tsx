import type { CSSProperties } from "react";
import { useEffect, useRef } from "react";

export function AutoGrowTextarea({
  value,
  onChange,
  className,
  style,
  minRows = 2,
  rowHeightPx = 28,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  style?: CSSProperties;
  minRows?: number;
  rowHeightPx?: number;
  placeholder?: string;
}) {
  const ref = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    if (!ref.current) {
      return;
    }

    ref.current.style.height = "0px";
    const minHeight = minRows * rowHeightPx;
    ref.current.style.height = `${Math.max(ref.current.scrollHeight, minHeight)}px`;
  }, [minRows, rowHeightPx, value]);

  return (
    <textarea
      ref={ref}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      className={className}
      style={style}
    />
  );
}
