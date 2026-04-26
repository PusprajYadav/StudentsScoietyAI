import { Compass, Sparkles } from "lucide-react";
import type { CSSProperties, ReactNode } from "react";
import type { PortfolioColorMode, PortfolioRecord, PortfolioSection, PortfolioViewportKey } from "../types";
import { PortfolioSectionBody } from "./SectionContent";
import { ActionLink, AvatarBadge, SectionEyebrow, SurfacePanel, TemplateSectionNav } from "./shared";
import {
  countPortfolioHighlights,
  getContactSection,
  getHeroSection,
  getNonHeroSections,
  getSectionBodyStyle,
  getSectionButtonStyle,
  getSectionDescription,
  getSectionSurfaceStyle,
  getSectionTitle,
  getSectionTitleStyle,
  resolveLinkHref,
  resolveSectionDesign,
  truncateText,
} from "./templateHelpers";

function EditorialSidebarCard({
  eyebrow,
  title,
  children,
  style,
}: {
  eyebrow: string;
  title: string;
  children: ReactNode;
  style?: CSSProperties;
}) {
  return (
    <SurfacePanel
      className="overflow-hidden"
      style={{
        background: "linear-gradient(180deg, var(--p-panel), var(--p-panel-strong))",
        ...style,
      }}
    >
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: "var(--p-muted)" }}>
        {eyebrow}
      </p>
      <h2 className="mt-2 text-lg font-semibold tracking-tight text-[var(--p-text)]">{title}</h2>
      <div className="mt-4">{children}</div>
    </SurfacePanel>
  );
}

function EditorialSection({
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
  const design = resolveSectionDesign(portfolio, section.id, colorMode, viewport);
  const titleStyle = getSectionTitleStyle(design);

  return (
    <section
      id={section.id}
      className="grid gap-4 border-t pt-6 sm:gap-5 sm:pt-8 lg:grid-cols-[180px_minmax(0,1fr)] lg:gap-8"
      style={{ borderColor: "var(--p-border)" }}
    >
      <div className="lg:pt-2">
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em]" style={{ color: "var(--p-muted)" }}>
          {`0${index + 1}`.slice(-2)}
        </p>
        <p className="mt-2 text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: "var(--p-muted)" }}>
          {section.type.replace("_", " ")}
        </p>
        <h2
          className="mt-3 font-semibold tracking-tight"
          style={{
            ...titleStyle,
            fontSize: Math.max(24, design.titleFontSize - 4),
          }}
        >
          {getSectionTitle(section)}
        </h2>
        <p className="mt-2 max-w-[24ch] leading-7" style={getSectionBodyStyle(design)}>
          {truncateText(getSectionDescription(section), 140)}
        </p>
      </div>

      <div
        className="overflow-hidden border"
        style={{
          borderColor: design.borderColor || "var(--p-border)",
          background:
            index % 2 === 0
              ? "linear-gradient(180deg, var(--p-panel), var(--p-panel))"
              : "linear-gradient(180deg, var(--p-panel-strong), var(--p-panel))",
          boxShadow: "0 30px 80px -54px var(--p-shadow-soft)",
          ...getSectionSurfaceStyle(design),
        }}
      >
        <PortfolioSectionBody section={section} design={design} />
      </div>
    </section>
  );
}

export function MinimalHeroTemplate({
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
  const heroDesign = resolveSectionDesign(portfolio, heroSection?.id || "hero", colorMode, viewport);
  const heroLinks = heroSection?.links.filter((link) => link.url.trim()).slice(0, 3) ?? [];
  const topSkills = sections.find((section) => section.type === "skills")?.skills.slice(0, 6) ?? [];
  const heroTitleStyle = getSectionTitleStyle(heroDesign);

  return (
    <div className="mx-auto w-full px-4 py-5 sm:px-6 sm:py-7 lg:px-8 lg:py-9 xl:px-10 2xl:px-12">
      <header
        className="rounded-[30px] border px-4 py-5 shadow-[0_28px_80px_-58px_var(--p-shadow-soft)] sm:px-6 sm:py-6 lg:px-8"
        style={{
          borderColor: "var(--p-border)",
          background: "linear-gradient(135deg, var(--p-panel), var(--p-panel-strong))",
        }}
      >
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em]" style={{ color: "var(--p-muted)" }}>
              Portfolio website
            </p>
            <h2 className="mt-2 text-[2rem] font-semibold tracking-tight text-[var(--p-text)] sm:text-[2.7rem] lg:text-[3rem]">
              {portfolio.content.profile.fullName || portfolio.title}
            </h2>
            <p className="mt-2 max-w-xl text-sm leading-7" style={{ color: "var(--p-muted)" }}>
              {portfolio.content.profile.headline ||
                "An editorial-style portfolio that keeps the focus on your work, your thinking, and your story."}
            </p>
          </div>

          <TemplateSectionNav
            sections={portfolio.content.sections.filter((section) => section.enabled)}
            className="max-w-full lg:justify-end"
          />
        </div>
      </header>

      <section id="top" className="pt-6 lg:pt-7">
        <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1.34fr)_360px]">
          <SurfacePanel
            className="relative overflow-hidden"
            style={{
              background: "linear-gradient(135deg, var(--p-panel), var(--p-bg) 52%, var(--p-accent-faint))",
              boxShadow: "0 42px 96px -62px var(--p-shadow-soft)",
              ...getSectionSurfaceStyle(heroDesign),
            }}
          >
            <div
              className="pointer-events-none absolute right-0 top-0 h-40 w-40 translate-x-1/4 -translate-y-1/4 rounded-full blur-3xl"
              style={{ background: "var(--p-primary-faint)" }}
            />
            <div
              className="pointer-events-none absolute bottom-0 left-0 h-32 w-32 -translate-x-1/3 translate-y-1/3 rounded-full blur-3xl"
              style={{ background: "var(--p-accent-faint)" }}
            />

            <div className="relative grid gap-8 xl:grid-cols-[minmax(0,1fr)_280px]">
              <div>
                <SectionEyebrow>Editorial horizon</SectionEyebrow>

                <div
                  className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-[11px] font-semibold uppercase tracking-[0.18em]"
                  style={{ color: "var(--p-muted)" }}
                >
                  <span className="inline-flex items-center gap-2">
                    <Compass className="h-4 w-4" />
                    Responsive portfolio
                  </span>
                  {contactSection?.location ? <span>{contactSection.location}</span> : null}
                </div>

                <h1
                  className="mt-6 max-w-[12ch] font-semibold tracking-tight"
                  style={{
                    ...heroTitleStyle,
                    fontSize: `clamp(${heroDesign.titleFontSize + 18}px, 8vw, 92px)`,
                  }}
                >
                  {heroSection?.headline || portfolio.title}
                </h1>

                <p className="mt-5 max-w-3xl leading-8" style={getSectionBodyStyle(heroDesign)}>
                  {heroSection?.subheadline ||
                    "A calm, premium portfolio layout that gives your projects more space and your writing more weight."}
                </p>

                <div className="mt-7 flex flex-wrap gap-3">
                  <ActionLink
                    href={heroSection?.ctaHref || "#contact"}
                    label={heroSection?.ctaLabel || "Start a conversation"}
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
              </div>

              <div className="grid gap-3">
                {[
                  {
                    label: "Projects",
                    value: `${stats.projects}`,
                    copy: "Showcase cards and case studies",
                  },
                  {
                    label: "Experience",
                    value: `${stats.experiences}`,
                    copy: "Hands-on work and real results",
                  },
                  {
                    label: "Sections",
                    value: `${stats.sections}`,
                    copy: "A complete website structure",
                  },
                ].map((item, index) => (
                  <div
                    key={item.label}
                    className="rounded-[24px] border px-4 py-4"
                    style={{
                      borderColor: "var(--p-border)",
                      background: index === 1 ? "var(--p-accent-faint)" : "var(--p-panel-strong)",
                    }}
                  >
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: "var(--p-muted)" }}>
                      {item.label}
                    </p>
                    <p className="mt-2 text-[1.45rem] font-semibold tracking-tight text-[var(--p-text)]">{item.value}</p>
                    <p className="mt-1 text-sm leading-6" style={{ color: "var(--p-muted)" }}>
                      {item.copy}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </SurfacePanel>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
            <EditorialSidebarCard
              eyebrow="Identity"
              title={portfolio.content.profile.fullName || portfolio.title}
              style={{ background: "linear-gradient(180deg, var(--p-panel), var(--p-panel-strong))" }}
            >
              <AvatarBadge
                name={portfolio.content.profile.fullName || portfolio.title}
                subtitle={portfolio.content.profile.headline || "Editorial portfolio"}
                imageUrl={portfolio.content.profile.avatarUrl}
              />
              <p className="mt-4 text-sm leading-7" style={{ color: "var(--p-muted)" }}>
                Clean structure, stronger hierarchy, and more breathing room for projects, writing, and proof points.
              </p>
            </EditorialSidebarCard>

            {topSkills.length ? (
              <EditorialSidebarCard eyebrow="Focus areas" title="Selected strengths">
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
              </EditorialSidebarCard>
            ) : null}

            <EditorialSidebarCard eyebrow="Reach out" title="Selected links">
              <div className="space-y-3">
                {contactSection?.email ? (
                  <ActionLink href={`mailto:${contactSection.email}`} label="Email directly" icon className="w-full" />
                ) : null}

                {heroLinks.length ? (
                  <div className="space-y-2">
                    {heroLinks.map((link, index) => (
                      <a
                        key={`${link.url}-${index}`}
                        href={resolveLinkHref(link.url)}
                        target={link.url.startsWith("#") || link.url.startsWith("mailto:") || link.url.startsWith("tel:") ? undefined : "_blank"}
                        rel={link.url.startsWith("#") || link.url.startsWith("mailto:") || link.url.startsWith("tel:") ? undefined : "noreferrer"}
                        className="flex items-center justify-between rounded-[18px] border px-4 py-3 text-sm font-semibold transition hover:-translate-y-0.5"
                        style={{
                          borderColor: "var(--p-border)",
                          background: "var(--p-panel-strong)",
                          color: "var(--p-text)",
                        }}
                      >
                        <span>{link.label || link.url}</span>
                        <Sparkles className="h-4 w-4" />
                      </a>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm leading-7" style={{ color: "var(--p-muted)" }}>
                    Add social or project links in the hero section to surface your best destinations here.
                  </p>
                )}
              </div>
            </EditorialSidebarCard>
          </div>
        </div>
      </section>

      <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SurfacePanel style={{ background: "linear-gradient(180deg, var(--p-primary-faint), var(--p-panel))" }}>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: "var(--p-muted)" }}>
            Website structure
          </p>
          <h2 className="mt-2 text-xl font-semibold tracking-tight text-[var(--p-text)]">Full-width portfolio layout</h2>
          <p className="mt-2 text-sm leading-7" style={{ color: "var(--p-muted)" }}>
            The hero, content flow, and supporting panels now use much more of the screen so the site feels complete instead of boxed in.
          </p>
        </SurfacePanel>

        <SurfacePanel style={{ background: "linear-gradient(180deg, var(--p-accent-faint), var(--p-panel))" }}>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: "var(--p-muted)" }}>
            Reading rhythm
          </p>
          <h2 className="mt-2 text-xl font-semibold tracking-tight text-[var(--p-text)]">Clearer section pacing</h2>
          <p className="mt-2 text-sm leading-7" style={{ color: "var(--p-muted)" }}>
            Content blocks have more breathing room, stronger hierarchy, and less awkward empty space on large screens.
          </p>
        </SurfacePanel>

        <SurfacePanel className="md:col-span-2" style={{ background: "linear-gradient(135deg, var(--p-panel), var(--p-panel-strong))" }}>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: "var(--p-muted)" }}>
            Quick jump
          </p>
          <h2 className="mt-2 text-xl font-semibold tracking-tight text-[var(--p-text)]">Explore the full website sections</h2>
          <p className="mt-2 text-sm leading-7" style={{ color: "var(--p-muted)" }}>
            Navigation now reads more like a real website menu and fits the wider layout more naturally across desktop, tablet, and mobile.
          </p>
          <TemplateSectionNav sections={portfolio.content.sections.filter((section) => section.enabled)} className="mt-4" />
        </SurfacePanel>
      </div>

      <div className="mt-10 space-y-8 sm:space-y-10">
        {sections.map((section, index) => (
          <EditorialSection
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
