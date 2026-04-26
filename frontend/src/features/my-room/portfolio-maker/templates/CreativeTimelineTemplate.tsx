import { NotebookPen } from "lucide-react";
import type { CSSProperties, ReactNode } from "react";
import type { PortfolioColorMode, PortfolioRecord, PortfolioSection, PortfolioViewportKey } from "../types";
import { PortfolioSectionBody } from "./SectionContent";
import { ActionLink, AvatarBadge, SectionEyebrow, SurfacePanel } from "./shared";
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
  resolveSectionDesign,
  truncateText,
} from "./templateHelpers";

function StoryRailCard({
  children,
  className,
  style,
}: {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <SurfacePanel
      className={className}
      style={{
        background: "linear-gradient(180deg, var(--p-panel), var(--p-panel-strong))",
        ...style,
      }}
    >
      {children}
    </SurfacePanel>
  );
}

function TimelineChapter({
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

  return (
    <article id={section.id} className="relative sm:grid sm:grid-cols-[76px_minmax(0,1fr)] sm:gap-5">
      <div className="mb-3 flex items-center gap-3 sm:mb-0 sm:flex-col sm:items-start sm:pt-6">
        <div
          className="relative z-10 inline-flex h-11 w-11 items-center justify-center rounded-full border text-sm font-semibold"
          style={{
            borderColor: "var(--p-border-strong)",
            background: "var(--p-bg)",
            color: index % 2 === 0 ? "var(--p-primary)" : "var(--p-accent)",
            boxShadow: "0 18px 44px -30px var(--p-shadow-soft)",
          }}
        >
          {`0${index + 1}`.slice(-2)}
        </div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] sm:text-center" style={{ color: "var(--p-muted)" }}>
          {section.type.replace("_", " ")}
        </p>
      </div>

      <SurfacePanel
        className="overflow-hidden"
        style={{
          background:
            index % 2 === 0
              ? "linear-gradient(180deg, var(--p-primary-faint), var(--p-panel))"
              : "linear-gradient(180deg, var(--p-accent-faint), var(--p-panel))",
          boxShadow: "0 30px 80px -54px var(--p-shadow-soft)",
          ...getSectionSurfaceStyle(design),
        }}
      >
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-2xl">
            <SectionEyebrow>{`Chapter ${`0${index + 1}`.slice(-2)}`}</SectionEyebrow>
            <h2 className="mt-3 font-semibold tracking-tight" style={getSectionTitleStyle(design)}>
              {getSectionTitle(section)}
            </h2>
            <p className="mt-2 leading-7" style={getSectionBodyStyle(design)}>
              {truncateText(getSectionDescription(section), section.type === "rich_text" ? 180 : 140)}
            </p>
          </div>

          <span
            className="inline-flex items-center rounded-full border px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em]"
            style={{
              borderColor: design.cardBorderColor || design.borderColor || "var(--p-border)",
              background: design.cardBackground || "var(--p-panel-strong)",
              color: design.bodyColor || "var(--p-text)",
            }}
          >
            Scene {`0${index + 1}`.slice(-2)}
          </span>
        </div>

        <div className="mt-6">
          <PortfolioSectionBody section={section} design={design} />
        </div>
      </SurfacePanel>
    </article>
  );
}

export function CreativeTimelineTemplate({
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
  const heroTitleStyle = getSectionTitleStyle(heroDesign);

  return (
    <div className="mx-auto w-full px-4 py-5 sm:px-6 sm:py-7 lg:px-8 lg:py-9 xl:px-10 2xl:px-12">
      <div className="grid items-start gap-6 xl:grid-cols-[320px_minmax(0,1fr)] 2xl:grid-cols-[340px_minmax(0,1fr)]">
        <aside className="space-y-4 xl:sticky xl:top-6 xl:h-fit">
          <StoryRailCard style={{ background: "linear-gradient(180deg, var(--p-panel), var(--p-primary-faint))" }}>
            <SectionEyebrow>Storyline canvas</SectionEyebrow>
            <AvatarBadge
              name={portfolio.content.profile.fullName || portfolio.title}
              subtitle={portfolio.content.profile.headline || "Narrative portfolio"}
              imageUrl={portfolio.content.profile.avatarUrl}
              className="mt-5"
            />
            <p className="mt-4 text-sm leading-7" style={{ color: "var(--p-muted)" }}>
              Built like a case-study site: chaptered flow, clearer pacing, and a stronger sense of progression from intro to contact.
            </p>
          </StoryRailCard>

          <StoryRailCard>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: "var(--p-muted)" }}>
              Chapters
            </p>
            <div className="mt-4 space-y-2.5">
              {sections.map((section, index) => (
                <a
                  key={section.id}
                  href={`#${section.id}`}
                  className="flex items-start gap-3 rounded-[18px] border px-4 py-3 transition hover:-translate-y-0.5"
                  style={{
                    borderColor: "var(--p-border)",
                    background: "var(--p-panel-strong)",
                  }}
                >
                  <span
                    className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold"
                    style={{
                      background: index % 2 === 0 ? "var(--p-primary-faint)" : "var(--p-accent-faint)",
                      color: index % 2 === 0 ? "var(--p-primary)" : "var(--p-accent)",
                    }}
                  >
                    {`0${index + 1}`.slice(-2)}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-[var(--p-text)]">{getSectionTitle(section)}</p>
                    <p className="mt-1 text-xs leading-6" style={{ color: "var(--p-muted)" }}>
                      {truncateText(getSectionDescription(section), 70)}
                    </p>
                  </div>
                </a>
              ))}
            </div>
          </StoryRailCard>

          <StoryRailCard style={{ background: "linear-gradient(180deg, var(--p-panel), var(--p-accent-faint))" }}>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: "var(--p-muted)" }}>
              Story metrics
            </p>
            <div className="mt-4 grid grid-cols-2 gap-3">
              {[
                { label: "Chapters", value: `${sections.length}` },
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

            <div className="mt-4 space-y-3">
              <ActionLink
                href={heroSection?.ctaHref || (contactSection?.email ? `mailto:${contactSection.email}` : "#top")}
                label={heroSection?.ctaLabel || (contactSection?.email ? "Contact now" : "Back to intro")}
                icon
                className="w-full"
                style={getSectionButtonStyle(heroDesign)}
              />
              {heroLinks[0] ? (
                <ActionLink href={heroLinks[0].url} label={heroLinks[0].label || "Open featured link"} secondary className="w-full" />
              ) : null}
            </div>
          </StoryRailCard>
        </aside>

        <div>
          <section id="top">
            <SurfacePanel
              className="relative overflow-hidden"
              style={{
                background: "linear-gradient(135deg, var(--p-panel), var(--p-primary-faint) 55%, var(--p-panel))",
                boxShadow: "0 40px 90px -62px var(--p-shadow-soft)",
                ...getSectionSurfaceStyle(heroDesign),
              }}
            >
              <div
                className="pointer-events-none absolute right-0 top-0 h-56 w-56 translate-x-1/4 -translate-y-1/4 rounded-full blur-3xl"
                style={{ background: "var(--p-accent-soft)" }}
              />
              <div
                className="pointer-events-none absolute bottom-0 left-0 h-44 w-44 -translate-x-1/4 translate-y-1/4 rounded-full blur-3xl"
                style={{ background: "var(--p-primary-soft)" }}
              />

              <div className="relative grid gap-8 xl:grid-cols-[minmax(0,1fr)_280px]">
                <div>
                  <div className="flex flex-wrap items-center gap-3">
                    <SectionEyebrow>Narrative portfolio</SectionEyebrow>
                    <span
                      className="inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold"
                      style={{
                        borderColor: "var(--p-border)",
                        background: "var(--p-panel-strong)",
                        color: "var(--p-text)",
                      }}
                    >
                      <NotebookPen className="h-4 w-4" />
                      Case-study flow
                    </span>
                  </div>

                  <h1
                    className="mt-6 max-w-[12ch] font-semibold tracking-tight"
                    style={{
                      ...heroTitleStyle,
                      fontSize: `clamp(${heroDesign.titleFontSize + 18}px, 7vw, 90px)`,
                    }}
                  >
                    {heroSection?.headline || portfolio.title}
                  </h1>

                  <p className="mt-5 max-w-3xl leading-8" style={getSectionBodyStyle(heroDesign)}>
                    {heroSection?.subheadline ||
                      "A guided portfolio experience that lets visitors move chapter by chapter instead of getting lost in one long feed."}
                  </p>

                  <div className="mt-7 flex flex-wrap gap-3">
                    <ActionLink
                      href={heroSection?.ctaHref || "#contact"}
                      label={heroSection?.ctaLabel || "Enter the story"}
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
                    { label: "Chapters", value: `${sections.length}`, copy: "Clear chapter flow" },
                    { label: "Highlights", value: `${Math.max(stats.highlightedProjects, 1)}`, copy: "Featured proof points" },
                    { label: "Journey", value: `${stats.sections}`, copy: "Complete section structure" },
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
                      <p className="mt-2 text-[1.45rem] font-semibold tracking-tight text-[var(--p-text)]">{item.value}</p>
                      <p className="mt-1 text-sm leading-6" style={{ color: "var(--p-muted)" }}>
                        {item.copy}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </SurfacePanel>
          </section>

          <div className="relative mt-6 space-y-5 sm:space-y-6">
            <div
              className="pointer-events-none absolute bottom-0 left-[21px] top-2 hidden w-px sm:block"
              style={{ background: "linear-gradient(180deg, var(--p-primary-soft), var(--p-accent-soft))" }}
            />

            {sections.map((section, index) => (
              <TimelineChapter
                key={section.id}
                portfolio={portfolio}
                section={section}
                index={index}
                viewport={viewport}
                colorMode={colorMode}
              />
            ))}
          </div>

          <section className="mt-6">
            <SurfacePanel
              className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between"
              style={{ background: "linear-gradient(135deg, var(--p-accent-faint), var(--p-panel))" }}
            >
              <div>
                <SectionEyebrow>Final frame</SectionEyebrow>
                <h2 className="mt-3 text-2xl font-semibold tracking-tight text-[var(--p-text)] sm:text-[2rem]">
                  A better ending deserves a clear next step.
                </h2>
                <p className="mt-2 max-w-2xl text-sm leading-7 sm:text-base" style={{ color: "var(--p-muted)" }}>
                  Keep the story moving with a real contact section, a featured case-study link, or a stronger hero CTA.
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <ActionLink href="#top" label="Back to top" secondary />
                <ActionLink
                  href={contactSection?.email ? `mailto:${contactSection.email}` : heroSection?.ctaHref || "#top"}
                  label={contactSection?.email ? "Send email" : "Open next step"}
                  icon
                />
              </div>
            </SurfacePanel>
          </section>
        </div>
      </div>
    </div>
  );
}
