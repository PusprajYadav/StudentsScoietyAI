import {
  ArrowUpRight,
  Briefcase,
  ExternalLink,
  GraduationCap,
  Mail,
  MapPin,
  MessageSquareQuote,
  Phone,
  Sparkles,
} from "lucide-react";
import type { PortfolioLink, PortfolioSection } from "../types";
import { InsetPanel } from "./shared";
import {
  cx,
  getSectionAccentColor,
  getSectionBodyStyle,
  getSectionCardStyle,
  resolveLinkHref,
  type ResolvedPortfolioSectionStyle,
} from "./templateHelpers";

function splitBody(body: string) {
  return body
    .split(/\n+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function EmptyState({ message, design }: { message: string; design: ResolvedPortfolioSectionStyle }) {
  return (
    <InsetPanel
      className="border-dashed leading-7"
      style={{ ...getSectionCardStyle(design), ...getSectionBodyStyle(design) }}
    >
      {message}
    </InsetPanel>
  );
}

function LinkChip({ link, design }: { link: PortfolioLink; design: ResolvedPortfolioSectionStyle }) {
  if (!link.url.trim()) {
    return null;
  }

  const label = link.label.trim() || link.url.trim();

  if (!label) {
    return null;
  }

  return (
    <a
      href={resolveLinkHref(link.url)}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold transition hover:-translate-y-0.5"
      style={{
        borderColor: design.cardBorderColor || design.borderColor || "var(--p-border)",
        background: design.cardBackground || "var(--p-panel-strong)",
        color: design.bodyColor || "var(--p-text)",
      }}
    >
      {label}
      <ArrowUpRight className="h-3.5 w-3.5" />
    </a>
  );
}

function TextSection({ body, design }: { body: string; design: ResolvedPortfolioSectionStyle }) {
  const paragraphs = splitBody(body);

  if (!paragraphs.length) {
    return <EmptyState message="Add content from the editor to give this section a clear story." design={design} />;
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1.3fr)_minmax(240px,0.7fr)]">
      <div className="space-y-3">
        {paragraphs.map((paragraph, index) => (
          <p key={`${paragraph.slice(0, 20)}-${index}`} className="leading-7" style={getSectionBodyStyle(design)}>
            {paragraph}
          </p>
        ))}
      </div>

      <InsetPanel className="flex h-full flex-col justify-between" style={getSectionCardStyle(design)}>
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: "var(--p-muted)" }}>
          Takeaway
        </p>
        <p className="mt-3 text-lg font-semibold leading-8" style={{ color: design.titleColor || "var(--p-text)" }}>
          {paragraphs[0]}
        </p>
      </InsetPanel>
    </div>
  );
}

function SkillsSection({ skills, design }: { skills: string[]; design: ResolvedPortfolioSectionStyle }) {
  if (!skills.length) {
    return (
      <EmptyState
        message="Add a few skills from the editor to create a cleaner snapshot of your strengths."
        design={design}
      />
    );
  }

  return (
    <div className="flex flex-wrap gap-3">
      {skills.map((skill, index) => (
        <span
          key={`${skill}-${index}`}
          className={cx(
            "inline-flex items-center rounded-full border px-4 py-2 text-sm font-semibold",
            index % 3 === 0 && "translate-y-0.5"
          )}
          style={{
            borderColor: design.cardBorderColor || design.borderColor || "var(--p-border)",
            background: index % 2 === 0 ? "var(--p-primary-faint)" : design.cardBackground || "var(--p-panel-strong)",
            color: index % 2 === 0 ? design.accentColor || "var(--p-primary)" : design.bodyColor || "var(--p-text)",
            fontSize: design.bodyFontSize,
          }}
        >
          {skill}
        </span>
      ))}
    </div>
  );
}

function ProjectsSection({
  section,
  design,
}: {
  section: Extract<PortfolioSection, { type: "projects" }>;
  design: ResolvedPortfolioSectionStyle;
}) {
  if (!section.projects.length) {
    return <EmptyState message="Add projects from the editor to turn this into a real showcase." design={design} />;
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {section.projects.map((project, index) => (
        <InsetPanel
          key={project.id || index}
          className="flex h-full flex-col"
          style={{
            ...getSectionCardStyle(design),
            background: project.highlight
              ? `linear-gradient(180deg, var(--p-primary-faint), ${design.cardBackground || "var(--p-panel-strong)"})`
              : design.cardBackground || "var(--p-panel-strong)",
          }}
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-lg font-semibold" style={{ color: design.titleColor || "var(--p-text)" }}>
                  {project.name || `Project ${index + 1}`}
                </p>
                {project.highlight ? (
                  <span
                    className="rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em]"
                    style={{
                      background: "var(--p-primary-soft)",
                      color: design.accentColor || "var(--p-primary)",
                    }}
                  >
                    Featured
                  </span>
                ) : null}
              </div>
              {project.tagline ? (
                <p className="mt-2 leading-6" style={getSectionBodyStyle(design)}>
                  {project.tagline}
                </p>
              ) : null}
            </div>

            <span
              className="inline-flex h-10 w-10 items-center justify-center rounded-2xl"
              style={{
                background: "var(--p-accent-faint)",
                color: getSectionAccentColor(design),
              }}
            >
              <Sparkles className="h-4.5 w-4.5" />
            </span>
          </div>

          {project.description ? (
            <p className="mt-4 leading-7" style={getSectionBodyStyle(design)}>
              {project.description}
            </p>
          ) : null}

          {project.tech.length ? (
            <div className="mt-4 flex flex-wrap gap-2">
              {project.tech.map((item, chipIndex) => (
                <span
                  key={`${item}-${chipIndex}`}
                  className="rounded-full border px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.08em]"
                  style={{
                    borderColor: design.cardBorderColor || design.borderColor || "var(--p-border)",
                    background: design.background || "var(--p-panel)",
                    color: design.bodyColor || "var(--p-muted)",
                  }}
                >
                  {item}
                </span>
              ))}
            </div>
          ) : null}

          {project.links.length ? (
            <div className="mt-5 flex flex-wrap gap-2">
              {project.links.map((link, linkIndex) => (
                <LinkChip key={`${link.url}-${linkIndex}`} link={link} design={design} />
              ))}
            </div>
          ) : null}
        </InsetPanel>
      ))}
    </div>
  );
}

function ExperienceSection({
  section,
  design,
}: {
  section: Extract<PortfolioSection, { type: "experience" }>;
  design: ResolvedPortfolioSectionStyle;
}) {
  if (!section.items.length) {
    return <EmptyState message="Experience items will appear here once you add them." design={design} />;
  }

  return (
    <div className="space-y-4">
      {section.items.map((item, index) => (
        <InsetPanel key={item.id || index} style={getSectionCardStyle(design)}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span
                  className="inline-flex h-10 w-10 items-center justify-center rounded-2xl"
                  style={{
                    background: "var(--p-primary-faint)",
                    color: "var(--p-primary)",
                  }}
                >
                  <Briefcase className="h-4.5 w-4.5" />
                </span>
                <div>
                  <p className="text-lg font-semibold" style={{ color: design.titleColor || "var(--p-text)" }}>{item.role || "Role"}</p>
                  <p style={getSectionBodyStyle(design)}>
                    {[item.company, item.location].filter(Boolean).join(" • ")}
                  </p>
                </div>
              </div>
            </div>

            <span
              className="rounded-full border px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em]"
              style={{
                borderColor: design.cardBorderColor || design.borderColor || "var(--p-border)",
                color: design.bodyColor || "var(--p-muted)",
              }}
            >
              {[item.start, item.current ? "Present" : item.end].filter(Boolean).join(" - ")}
            </span>
          </div>

          {item.bullets.length ? (
            <ul className="mt-4 grid gap-2 leading-7" style={getSectionBodyStyle(design)}>
              {item.bullets.map((bullet, bulletIndex) => (
                <li key={`${bullet}-${bulletIndex}`} className="flex gap-3">
                  <span
                    className="mt-2 h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ background: getSectionAccentColor(design) }}
                  />
                  <span>{bullet}</span>
                </li>
              ))}
            </ul>
          ) : null}
        </InsetPanel>
      ))}
    </div>
  );
}

function EducationSection({
  section,
  design,
}: {
  section: Extract<PortfolioSection, { type: "education" }>;
  design: ResolvedPortfolioSectionStyle;
}) {
  if (!section.items.length) {
    return <EmptyState message="Education details will appear here once you add them." design={design} />;
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {section.items.map((item, index) => (
        <InsetPanel key={item.id || index} style={getSectionCardStyle(design)}>
          <div className="flex items-start gap-3">
            <span
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl"
              style={{
                background: "var(--p-accent-faint)",
                color: getSectionAccentColor(design),
              }}
            >
              <GraduationCap className="h-4.5 w-4.5" />
            </span>

            <div className="min-w-0">
              <p className="text-lg font-semibold" style={{ color: design.titleColor || "var(--p-text)" }}>{item.school || "Institution"}</p>
              <p className="mt-1 leading-6" style={getSectionBodyStyle(design)}>
                {item.degree || "Degree"}
              </p>
              <p className="mt-2 text-xs font-semibold uppercase tracking-[0.14em]" style={{ color: design.bodyColor || "var(--p-muted)" }}>
                {[item.start, item.end].filter(Boolean).join(" - ")}
              </p>
            </div>
          </div>

          {item.highlights.length ? (
            <div className="mt-4 flex flex-wrap gap-2">
              {item.highlights.map((highlight, highlightIndex) => (
                <span
                  key={`${highlight}-${highlightIndex}`}
                  className="rounded-full border px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.08em]"
                  style={{
                    borderColor: design.cardBorderColor || design.borderColor || "var(--p-border)",
                    background: design.background || "var(--p-panel)",
                    color: design.bodyColor || "var(--p-muted)",
                  }}
                >
                  {highlight}
                </span>
              ))}
            </div>
          ) : null}
        </InsetPanel>
      ))}
    </div>
  );
}

function TestimonialsSection({
  section,
  design,
}: {
  section: Extract<PortfolioSection, { type: "testimonials" }>;
  design: ResolvedPortfolioSectionStyle;
}) {
  if (!section.items.length) {
    return <EmptyState message="Testimonials will show up here once you add them." design={design} />;
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {section.items.map((item, index) => (
        <InsetPanel key={item.id || index} className="h-full" style={getSectionCardStyle(design)}>
          <div className="flex items-center gap-3">
            <span
              className="inline-flex h-10 w-10 items-center justify-center rounded-2xl"
              style={{
                background: "var(--p-primary-faint)",
                color: design.accentColor || "var(--p-primary)",
              }}
            >
              <MessageSquareQuote className="h-4.5 w-4.5" />
            </span>
            <div>
              <p className="font-semibold" style={{ color: design.titleColor || "var(--p-text)" }}>{item.author || "Collaborator"}</p>
              {item.authorRole ? (
                <p style={getSectionBodyStyle(design)}>
                  {item.authorRole}
                </p>
              ) : null}
            </div>
          </div>

          <p className="mt-4 leading-7" style={getSectionBodyStyle(design)}>
            "{item.quote || "Great work."}"
          </p>
        </InsetPanel>
      ))}
    </div>
  );
}

function ContactSection({
  section,
  design,
}: {
  section: Extract<PortfolioSection, { type: "contact" }>;
  design: ResolvedPortfolioSectionStyle;
}) {
  const contactItems = [
    section.email
      ? {
          label: "Email",
          value: section.email,
          href: `mailto:${section.email}`,
          icon: Mail,
        }
      : null,
    section.phone
      ? {
          label: "Phone",
          value: section.phone,
          href: `tel:${section.phone}`,
          icon: Phone,
        }
      : null,
    section.location
      ? {
          label: "Location",
          value: section.location,
          href: "",
          icon: MapPin,
        }
      : null,
  ].filter(Boolean) as Array<{ label: string; value: string; href: string; icon: typeof Mail }>;

  if (!contactItems.length && !section.links.length) {
    return (
      <EmptyState
        message="Add your email, phone, or social links so people know where to reach you."
        design={design}
      />
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {contactItems.map((item) => (
        item.href ? (
          <a
            key={item.label}
            href={item.href}
            className="rounded-[22px] border p-4 transition hover:-translate-y-0.5"
            style={{
              ...getSectionCardStyle(design),
            }}
          >
            <div className="flex items-center gap-3">
              <span
                className="inline-flex h-10 w-10 items-center justify-center rounded-2xl"
                style={{
                  background: "var(--p-accent-faint)",
                  color: getSectionAccentColor(design),
                }}
              >
                <item.icon className="h-4.5 w-4.5" />
              </span>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em]" style={{ color: design.bodyColor || "var(--p-muted)" }}>
                  {item.label}
                </p>
                <p className="mt-1 font-semibold" style={{ color: design.titleColor || "var(--p-text)", fontSize: design.bodyFontSize }}>
                  {item.value}
                </p>
              </div>
            </div>
          </a>
        ) : (
          <InsetPanel key={item.label} style={getSectionCardStyle(design)}>
            <div className="flex items-center gap-3">
              <span
                className="inline-flex h-10 w-10 items-center justify-center rounded-2xl"
                style={{
                  background: "var(--p-accent-faint)",
                  color: getSectionAccentColor(design),
                }}
              >
                <item.icon className="h-4.5 w-4.5" />
              </span>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em]" style={{ color: design.bodyColor || "var(--p-muted)" }}>
                  {item.label}
                </p>
                <p className="mt-1 font-semibold" style={{ color: design.titleColor || "var(--p-text)", fontSize: design.bodyFontSize }}>
                  {item.value}
                </p>
              </div>
            </div>
          </InsetPanel>
        )
      ))}

      {section.links.map((link, index) => (
        <a
          key={`${link.url}-${index}`}
          href={resolveLinkHref(link.url)}
          target="_blank"
          rel="noreferrer"
          className="rounded-[22px] border p-4 transition hover:-translate-y-0.5"
          style={{
            ...getSectionCardStyle(design),
            background: design.background || "var(--p-primary-faint)",
          }}
        >
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em]" style={{ color: design.bodyColor || "var(--p-muted)" }}>
                Link
              </p>
              <p className="mt-1 font-semibold" style={{ color: design.titleColor || "var(--p-text)", fontSize: design.bodyFontSize }}>
                {link.label || link.url}
              </p>
            </div>
            <span
              className="inline-flex h-10 w-10 items-center justify-center rounded-2xl"
              style={{
                background: design.cardBackground || "var(--p-panel)",
                color: design.accentColor || "var(--p-primary)",
              }}
            >
              <ExternalLink className="h-4.5 w-4.5" />
            </span>
          </div>
        </a>
      ))}
    </div>
  );
}

export function PortfolioSectionBody({
  section,
  design,
}: {
  section: PortfolioSection;
  design: ResolvedPortfolioSectionStyle;
}) {
  switch (section.type) {
    case "about":
    case "rich_text":
      return <TextSection body={section.body} design={design} />;
    case "projects":
      return <ProjectsSection section={section} design={design} />;
    case "experience":
      return <ExperienceSection section={section} design={design} />;
    case "skills":
      return <SkillsSection skills={section.skills} design={design} />;
    case "education":
      return <EducationSection section={section} design={design} />;
    case "testimonials":
      return <TestimonialsSection section={section} design={design} />;
    case "contact":
      return <ContactSection section={section} design={design} />;
    case "hero":
      return null;
    default:
      return null;
  }
}
