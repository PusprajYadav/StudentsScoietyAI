import {
  Briefcase,
  FolderKanban,
  GraduationCap,
  MessageSquareQuote,
  NotebookText,
  Palette,
  PhoneCall,
  Wrench,
} from "lucide-react";
import type { CSSProperties, ReactNode } from "react";
import type { PortfolioColorMode, PortfolioRecord, PortfolioSection, PortfolioViewportKey } from "../types";
import { PortfolioSectionBody } from "./SectionContent";
import { ActionLink, AvatarBadge, SectionEyebrow, SurfacePanel, TemplateSectionNav } from "./shared";
import {
  countPortfolioHighlights,
  cx,
  getContactSection,
  getHeroSection,
  getNonHeroSections,
  getSectionBodyStyle,
  getSectionButtonStyle,
  getSectionDescription,
  getSectionSurfaceStyle,
  getSectionTitle,
  getSectionTitleStyle,
  resolveSectionDesign,
  truncateText,
} from "./templateHelpers";

function resolveCardSpan(section: PortfolioSection) {
  switch (section.type) {
    case "projects":
    case "experience":
      return "md:col-span-2 xl:col-span-8";
    case "about":
    case "rich_text":
      return "md:col-span-2 xl:col-span-7";
    case "contact":
      return "md:col-span-2 xl:col-span-5";
    case "skills":
      return "xl:col-span-4";
    case "education":
    case "testimonials":
      return "xl:col-span-5";
    default:
      return "xl:col-span-6";
  }
}

function getSectionIcon(section: PortfolioSection) {
  switch (section.type) {
    case "projects":
      return FolderKanban;
    case "experience":
      return Briefcase;
    case "education":
      return GraduationCap;
    case "skills":
      return Wrench;
    case "testimonials":
      return MessageSquareQuote;
    case "contact":
      return PhoneCall;
    default:
      return NotebookText;
  }
}

function BentoUtilityCard({
  eyebrow,
  title,
  description,
  className,
  children,
  style,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  className?: string;
  children: ReactNode;
  style?: CSSProperties;
}) {
  return (
    <SurfacePanel
      className={cx("h-full overflow-hidden", className)}
      style={{
        background: "linear-gradient(180deg, var(--p-panel), var(--p-panel-strong))",
        ...style,
      }}
    >
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: "var(--p-muted)" }}>
        {eyebrow}
      </p>
      <h2 className="mt-2 text-lg font-semibold tracking-tight text-[var(--p-text)]">{title}</h2>
      {description ? (
        <p className="mt-2 text-sm leading-7" style={{ color: "var(--p-muted)" }}>
          {description}
        </p>
      ) : null}
      <div className="mt-4">{children}</div>
    </SurfacePanel>
  );
}

function BentoSectionCard({
  portfolio,
  section,
  index,
  viewport,
  colorMode,
}: {
  portfolio: PortfolioRecord;
  section: PortfolioSection;
  index: number;
  viewport: PortfolioViewportKey;
  colorMode: PortfolioColorMode;
}) {
  const Icon = getSectionIcon(section);
  const design = resolveSectionDesign(portfolio, section.id, colorMode, viewport);

  return (
    <section key={section.id} id={section.id} className={resolveCardSpan(section)}>
      <SurfacePanel
        className="h-full overflow-hidden"
        style={{
          background:
            index % 3 === 0
              ? "linear-gradient(180deg, var(--p-primary-faint), var(--p-panel))"
              : index % 3 === 1
                ? "linear-gradient(180deg, var(--p-accent-faint), var(--p-panel))"
                : "linear-gradient(180deg, var(--p-panel-strong), var(--p-panel))",
          boxShadow: "0 30px 80px -54px var(--p-shadow-soft)",
          ...getSectionSurfaceStyle(design),
        }}
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="max-w-2xl">
            <SectionEyebrow>{section.type.replace("_", " ")}</SectionEyebrow>
            <h2 className="mt-3 font-semibold tracking-tight" style={getSectionTitleStyle(design)}>
              {getSectionTitle(section)}
            </h2>
            <p className="mt-2 leading-7" style={getSectionBodyStyle(design)}>
              {truncateText(getSectionDescription(section), section.type === "projects" ? 170 : 130)}
            </p>
          </div>

          <span
            className="inline-flex h-12 w-12 items-center justify-center rounded-2xl border"
            style={{
              borderColor: design.cardBorderColor || design.borderColor || "var(--p-border)",
              background: design.cardBackground || "var(--p-panel-strong)",
              color: design.accentColor || (index % 2 === 0 ? "var(--p-primary)" : "var(--p-accent)"),
            }}
          >
            <Icon className="h-5 w-5" />
          </span>
        </div>

        <div className={cx("mt-6", section.type === "projects" && "lg:mt-8")}>
          <PortfolioSectionBody section={section} design={design} />
        </div>
      </SurfacePanel>
    </section>
  );
}

export function BoldCardsTemplate({
  portfolio,
  viewport,
  colorMode,
}: {
  portfolio: PortfolioRecord;
  viewport: PortfolioViewportKey;
  colorMode: PortfolioColorMode;
}) {
  const heroSection = getHeroSection(portfolio);
  const sections = getNonHeroSections(portfolio);
  const contactSection = getContactSection(portfolio);
  const stats = countPortfolioHighlights(portfolio);
  const topSkills = sections.find((section) => section.type === "skills")?.skills.slice(0, 8) ?? [];
  const heroDesign = resolveSectionDesign(portfolio, heroSection?.id || "hero", colorMode, viewport);
  const heroLinks = heroSection?.links.filter((link) => link.url.trim()).slice(0, 3) ?? [];
  const heroTitleStyle = getSectionTitleStyle(heroDesign);

  return (
    <div className="mx-auto w-full px-4 py-5 sm:px-6 sm:py-7 lg:px-8 lg:py-9 xl:px-10 2xl:px-12">
      <section id="top" className="grid items-start gap-5 2xl:grid-cols-[minmax(0,1.16fr)_380px]">
        <SurfacePanel
          className="relative overflow-hidden"
          style={{
            background: "linear-gradient(140deg, var(--p-primary-faint), var(--p-panel) 48%, var(--p-accent-faint))",
            boxShadow: "0 42px 90px -62px var(--p-shadow)",
            ...getSectionSurfaceStyle(heroDesign),
          }}
        >
          <div
            className="pointer-events-none absolute right-0 top-0 h-44 w-44 translate-x-1/4 -translate-y-1/4 rounded-full blur-3xl"
            style={{ background: "var(--p-primary-soft)" }}
          />
          <div
            className="pointer-events-none absolute bottom-0 left-0 h-36 w-36 -translate-x-1/4 translate-y-1/4 rounded-full blur-3xl"
            style={{ background: "var(--p-accent-soft)" }}
          />

          <div className="relative">
            <div className="flex flex-wrap items-center gap-3">
              <SectionEyebrow>Studio bento</SectionEyebrow>
              <span
                className="inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold"
                style={{
                  borderColor: "var(--p-border)",
                  background: "var(--p-panel-strong)",
                  color: "var(--p-text)",
                }}
              >
                <Palette className="h-4 w-4" />
                Premium card grid
              </span>
            </div>

            <h1
              className="mt-6 max-w-[12ch] font-semibold tracking-tight"
              style={{
                ...heroTitleStyle,
                fontSize: `clamp(${heroDesign.titleFontSize + 16}px, 7vw, 78px)`,
              }}
            >
              {heroSection?.headline || portfolio.title}
            </h1>

            <p className="mt-5 max-w-3xl leading-8" style={getSectionBodyStyle(heroDesign)}>
              {heroSection?.subheadline ||
                "A bold portfolio made from confident cards, richer hierarchy, and cleaner rhythm across every screen size."}
            </p>

            <div className="mt-7 flex flex-wrap gap-3">
              <ActionLink
                href={heroSection?.ctaHref || "#contact"}
                label={heroSection?.ctaLabel || "Book a call"}
                icon
                style={getSectionButtonStyle(heroDesign)}
              />
              {heroLinks.slice(0, 2).map((link, index) => (
                <ActionLink
                  key={`${link.url}-${index}`}
                  href={link.url}
                  label={link.label || "Open link"}
                  secondary
                  style={{
                    borderColor: heroDesign.borderColor || "var(--p-border)",
                    background: heroDesign.cardBackground || "var(--p-panel-strong)",
                    color: heroDesign.bodyColor || "var(--p-text)",
                  }}
                />
              ))}
            </div>

            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              {[
                { label: "Projects", value: `${stats.projects}` },
                { label: "Featured", value: `${Math.max(stats.highlightedProjects, 1)}` },
                { label: "Coverage", value: `${stats.sections} sections` },
              ].map((item, index) => (
                <div
                  key={item.label}
                  className="rounded-[22px] border px-4 py-4"
                  style={{
                    borderColor: "var(--p-border)",
                    background: index === 1 ? "var(--p-accent-faint)" : "var(--p-panel-strong)",
                  }}
                >
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: "var(--p-muted)" }}>
                    {item.label}
                  </p>
                  <p className="mt-2 text-lg font-semibold text-[var(--p-text)]">{item.value}</p>
                </div>
              ))}
            </div>
          </div>
        </SurfacePanel>

        <div className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-1">
          <BentoUtilityCard
            eyebrow="Identity"
            title={portfolio.content.profile.fullName || portfolio.title}
            description={portfolio.content.profile.headline || "High-contrast portfolio profile"}
            style={{ background: "linear-gradient(180deg, var(--p-panel), var(--p-primary-faint))" }}
          >
            <AvatarBadge
              name={portfolio.content.profile.fullName || portfolio.title}
              subtitle={portfolio.content.profile.headline || "Modern portfolio system"}
              imageUrl={portfolio.content.profile.avatarUrl}
            />
            <p className="mt-4 text-sm leading-7" style={{ color: "var(--p-muted)" }}>
              Designed for creators who want clearer contrast, stronger depth, and a more intentional project gallery.
            </p>
          </BentoUtilityCard>

          <BentoUtilityCard
            eyebrow="Quick contact"
            title={contactSection?.email ? "Ready to start a project?" : "Add a contact route"}
            description={
              contactSection?.email
                ? "Give visitors a direct next step from the very first screen."
                : "Add a contact section in the editor to turn this slot into a live CTA."
            }
          >
            {contactSection?.email ? (
              <ActionLink href={`mailto:${contactSection.email}`} label="Email now" icon className="w-full" />
            ) : null}

            {heroLinks.length ? (
              <div className="mt-3 flex flex-wrap gap-2">
                {heroLinks.map((link, index) => (
                  <span
                    key={`${link.url}-${index}`}
                    className="rounded-full border px-3 py-1.5 text-xs font-semibold"
                    style={{
                      borderColor: "var(--p-border)",
                      background: "var(--p-panel-strong)",
                      color: "var(--p-text)",
                    }}
                  >
                    {link.label || link.url}
                  </span>
                ))}
              </div>
            ) : null}
          </BentoUtilityCard>

          <BentoUtilityCard
            eyebrow="Navigate"
            title="Move through the website"
            description="The sections stay visible like a proper site map instead of disconnected cards."
            className="sm:col-span-2 2xl:col-span-1"
            style={{ background: "linear-gradient(180deg, var(--p-panel), var(--p-accent-faint))" }}
          >
            <TemplateSectionNav sections={portfolio.content.sections.filter((section) => section.enabled)} />
          </BentoUtilityCard>
        </div>
      </section>

      <div className="mt-6 grid auto-rows-fr gap-4 md:grid-cols-2 xl:grid-cols-12">
        <BentoUtilityCard
          eyebrow="At a glance"
          title="Proof in one sweep"
          className="xl:col-span-4"
          style={{ background: "linear-gradient(180deg, var(--p-primary-faint), var(--p-panel))" }}
        >
          <div className="grid gap-3 sm:grid-cols-3 md:grid-cols-1">
            {[
              { label: "Projects", value: `${stats.projects}` },
              { label: "Experience", value: `${stats.experiences}` },
              { label: "Skills", value: `${stats.skills}` },
            ].map((item) => (
              <div
                key={item.label}
                className="rounded-[20px] border px-4 py-3"
                style={{ borderColor: "var(--p-border)", background: "var(--p-panel-strong)" }}
              >
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: "var(--p-muted)" }}>
                  {item.label}
                </p>
                <p className="mt-1.5 text-lg font-semibold text-[var(--p-text)]">{item.value}</p>
              </div>
            ))}
          </div>
        </BentoUtilityCard>

        <BentoUtilityCard
          eyebrow="Signature stack"
          title={topSkills.length ? "Top strengths" : "Add your strengths"}
          description={
            topSkills.length
              ? "Skill chips stay compact here so the big cards can stay focused on real work."
              : "Use the skills section to populate this area with your main tools and specialties."
          }
          className="xl:col-span-4"
          style={{ background: "linear-gradient(180deg, var(--p-accent-faint), var(--p-panel))" }}
        >
          {topSkills.length ? (
            <div className="flex flex-wrap gap-2">
              {topSkills.map((skill, index) => (
                <span
                  key={`${skill}-${index}`}
                  className="rounded-full border px-3 py-1.5 text-xs font-semibold"
                  style={{
                    borderColor: "var(--p-border)",
                    background: index % 2 === 0 ? "var(--p-primary-faint)" : "var(--p-panel-strong)",
                    color: index % 2 === 0 ? "var(--p-primary)" : "var(--p-text)",
                  }}
                >
                  {skill}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-sm leading-7" style={{ color: "var(--p-muted)" }}>
              This block becomes much stronger once the portfolio has a few concrete skills or service labels.
            </p>
          )}
        </BentoUtilityCard>

        <BentoUtilityCard
          eyebrow="Navigate"
          title="Jump between sections"
          description="The grid stays fast to scan when visitors can hop directly to the part they care about."
          className="xl:col-span-4"
        >
          <p className="text-sm leading-7" style={{ color: "var(--p-muted)" }}>
            This area now supports the wider canvas below while the main navigation stays higher in the page where it feels more natural.
          </p>
        </BentoUtilityCard>

        {sections.map((section, index) => (
          <BentoSectionCard
            key={section.id}
            portfolio={portfolio}
            section={section}
            index={index}
            viewport={viewport}
            colorMode={colorMode}
          />
        ))}
      </div>
    </div>
  );
}
