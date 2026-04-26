import { ArrowRight, ExternalLink } from "lucide-react";
import type { CSSProperties, ReactNode } from "react";
import type { PortfolioSection } from "../types";
import {
  cx,
  getInitials,
  getSectionBodyStyle,
  getSectionSurfaceStyle,
  getSectionTitle,
  getSectionTitleStyle,
  resolveLinkHref,
  type ResolvedPortfolioSectionStyle,
} from "./templateHelpers";

export function TemplateSectionNav({
  sections,
  className,
}: {
  sections: PortfolioSection[];
  className?: string;
}) {
  if (!sections.length) {
    return null;
  }

  return (
    <nav className={cx("flex flex-wrap gap-2 overflow-x-auto pb-1 scrollbar-none", className)}>
      {sections.map((section) => (
        <a
          key={section.id}
          href={section.type === "hero" ? "#top" : `#${section.id}`}
          className="inline-flex shrink-0 items-center rounded-full border px-3.5 py-2 text-xs font-semibold transition hover:-translate-y-0.5"
          style={{
            borderColor: "var(--p-border)",
            background: "var(--p-panel-strong)",
            color: "var(--p-text)",
          }}
        >
          {getSectionTitle(section)}
        </a>
      ))}
    </nav>
  );
}

export function ActionLink({
  href,
  label,
  secondary = false,
  icon = false,
  className,
  style,
}: {
  href: string;
  label: string;
  secondary?: boolean;
  icon?: boolean;
  className?: string;
  style?: CSSProperties;
}) {
  const baseStyle = secondary
    ? {
        border: "1px solid var(--p-border)",
        background: "var(--p-panel-strong)",
        color: "var(--p-text)",
      }
    : {
        background: "linear-gradient(135deg, var(--p-primary), var(--p-accent))",
        color: "#ffffff",
        boxShadow: "0 18px 48px -28px var(--p-shadow)",
      };

  return (
    <a
      href={resolveLinkHref(href)}
      target={href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:") ? undefined : "_blank"}
      rel={href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:") ? undefined : "noreferrer"}
      className={cx(
        "inline-flex items-center justify-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold transition hover:-translate-y-0.5",
        className
      )}
      style={{ ...baseStyle, ...style }}
    >
      {label}
      {icon ? <ArrowRight className="h-4 w-4" /> : null}
    </a>
  );
}

export function SurfacePanel({
  children,
  className,
  style,
}: {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <div
      className={cx("rounded-[30px] border p-5 sm:p-6 lg:p-7", className)}
      style={{
        borderColor: "var(--p-border)",
        background: "var(--p-panel)",
        boxShadow: "0 30px 80px -54px var(--p-shadow-soft)",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

export function InsetPanel({
  children,
  className,
  style,
}: {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <div
      className={cx("rounded-[24px] border p-4 sm:p-5", className)}
      style={{
        borderColor: "var(--p-border)",
        background: "var(--p-panel-strong)",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

export function SectionEyebrow({ children }: { children: ReactNode }) {
  return (
    <span
      className="inline-flex items-center rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em]"
      style={{
        background: "var(--p-primary-faint)",
        color: "var(--p-primary)",
      }}
    >
      {children}
    </span>
  );
}

export function SectionFrame({
  id,
  eyebrow,
  title,
  description,
  className,
  children,
  accent = "primary",
  design,
  panelStyle,
}: {
  id?: string;
  eyebrow: string;
  title: string;
  description?: string;
  className?: string;
  children: ReactNode;
  accent?: "primary" | "accent";
  design?: ResolvedPortfolioSectionStyle;
  panelStyle?: CSSProperties;
}) {
  return (
    <section id={id} className={className}>
      <SurfacePanel className="h-full" style={{ ...panelStyle, ...(design ? getSectionSurfaceStyle(design) : undefined) }}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="max-w-2xl">
            <SectionEyebrow>{eyebrow}</SectionEyebrow>
            <h2
              className="mt-3 font-semibold tracking-tight"
              style={design ? getSectionTitleStyle(design) : { fontSize: "2rem" }}
            >
              {title}
            </h2>
            {description ? (
              <p
                className="mt-2 max-w-2xl leading-7"
                style={design ? getSectionBodyStyle(design) : { color: "var(--p-muted)", fontSize: "1rem" }}
              >
                {description}
              </p>
            ) : null}
          </div>
          <span
            className="inline-flex h-12 w-12 items-center justify-center rounded-2xl border"
            style={{
              borderColor: "var(--p-border)",
              background: accent === "accent" ? "var(--p-accent-faint)" : "var(--p-primary-faint)",
              color: accent === "accent" ? "var(--p-accent)" : "var(--p-primary)",
            }}
          >
            <ExternalLink className="h-4.5 w-4.5" />
          </span>
        </div>

        <div className="mt-6">{children}</div>
      </SurfacePanel>
    </section>
  );
}

export function AvatarBadge({
  name,
  subtitle,
  imageUrl,
  className,
}: {
  name: string;
  subtitle?: string;
  imageUrl?: string | null;
  className?: string;
}) {
  return (
    <div className={cx("flex items-center gap-4", className)}>
      {imageUrl ? (
        <img
          src={imageUrl}
          alt={name}
          className="h-14 w-14 rounded-2xl object-cover shadow-[0_18px_32px_-24px_var(--p-shadow)]"
        />
      ) : (
        <div
          className="inline-flex h-14 w-14 items-center justify-center rounded-2xl text-sm font-bold"
          style={{
            background: "linear-gradient(135deg, var(--p-primary), var(--p-accent))",
            color: "#ffffff",
          }}
        >
          {getInitials(name)}
        </div>
      )}

      <div className="min-w-0">
        <p className="truncate text-base font-semibold text-[var(--p-text)]">{name}</p>
        {subtitle ? (
          <p className="mt-1 text-sm leading-6" style={{ color: "var(--p-muted)" }}>
            {subtitle}
          </p>
        ) : null}
      </div>
    </div>
  );
}

export function StatPill({
  label,
  value,
  className,
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <InsetPanel className={cx("min-h-[96px]", className)}>
      <p className="text-2xl font-semibold tracking-tight text-[var(--p-text)]">{value}</p>
      <p className="mt-2 text-xs font-semibold uppercase tracking-[0.16em]" style={{ color: "var(--p-muted)" }}>
        {label}
      </p>
    </InsetPanel>
  );
}
