import { ArrowDown, ArrowUp, Paintbrush2, Plus, Trash2 } from "lucide-react";
import type {
  PortfolioColorMode,
  PortfolioEducation,
  PortfolioExperience,
  PortfolioLink,
  PortfolioProject,
  PortfolioSection,
  PortfolioSectionStyleModes,
  PortfolioSectionStyleSettings,
  PortfolioTestimonial,
  PortfolioViewportKey,
} from "../types";
import { createPortfolioEntityId } from "../utils";
import { Field, Input, SectionCard, Textarea } from "./editorPrimitives";

interface PortfolioSectionListProps {
  sections: PortfolioSection[];
  sectionStyles: Record<string, PortfolioSectionStyleModes>;
  designViewport: PortfolioViewportKey;
  designMode: PortfolioColorMode;
  onDesignViewportChange: (viewport: PortfolioViewportKey) => void;
  onDesignModeChange: (mode: PortfolioColorMode) => void;
  onAddSection: (type: string) => void;
  onUpdateSection: (sectionId: string, patch: Record<string, unknown>) => void;
  onMoveSection: (sectionId: string, direction: -1 | 1) => void;
  onRemoveSection: (sectionId: string) => void;
  onUpdateSectionStyle: (
    sectionId: string,
    mode: PortfolioColorMode,
    viewport: PortfolioViewportKey,
    patch: Partial<PortfolioSectionStyleSettings>
  ) => void;
  onClearSectionStyle: (sectionId: string, mode: PortfolioColorMode, viewport: PortfolioViewportKey) => void;
}

function sectionTitle(section: PortfolioSection) {
  if (section.type === "hero") {
    return "Hero";
  }
  if ("title" in section) {
    return section.title || "Untitled section";
  }
  return section.type;
}

function updateArrayItem<T>(items: T[], index: number, nextItem: T) {
  return items.map((item, itemIndex) => (itemIndex === index ? nextItem : item));
}

function removeArrayItem<T>(items: T[], index: number) {
  return items.filter((_, itemIndex) => itemIndex !== index);
}

function parseCommaList(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseLineList(value: string) {
  return value
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);
}

function StyleNumberField({
  label,
  value,
  onChange,
}: {
  label: string;
  value?: number;
  onChange: (next: number | undefined) => void;
}) {
  return (
    <Field label={label}>
      <Input
        type="number"
        value={value ?? ""}
        onChange={(event) => {
          const nextValue = event.target.value.trim();
          onChange(nextValue ? Number.parseFloat(nextValue) : undefined);
        }}
        placeholder="Default"
      />
    </Field>
  );
}

function StyleTextField({
  label,
  value,
  onChange,
  placeholder = "Leave blank for template default",
}: {
  label: string;
  value?: string;
  onChange: (next: string | undefined) => void;
  placeholder?: string;
}) {
  return (
    <Field label={label}>
      <Input
        value={value ?? ""}
        onChange={(event) => {
          const nextValue = event.target.value.trim();
          onChange(nextValue || undefined);
        }}
        placeholder={placeholder}
      />
    </Field>
  );
}

function LinkListEditor({
  links,
  onChange,
}: {
  links: PortfolioLink[];
  onChange: (links: PortfolioLink[]) => void;
}) {
  return (
    <div className="grid gap-3">
      {links.map((link, index) => (
        <div key={`${link.url}-${index}`} className="rounded-[18px] border border-app-border bg-app-card p-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Label">
              <Input
                value={link.label}
                onChange={(event) =>
                  onChange(updateArrayItem(links, index, { ...link, label: event.target.value }))
                }
              />
            </Field>
            <Field label="URL">
              <Input
                value={link.url}
                onChange={(event) =>
                  onChange(updateArrayItem(links, index, { ...link, url: event.target.value }))
                }
              />
            </Field>
          </div>

          <button
            type="button"
            onClick={() => onChange(removeArrayItem(links, index))}
            className="mt-3 inline-flex items-center gap-2 rounded-full border border-rose-500/20 bg-rose-500/10 px-3 py-1.5 text-xs font-semibold text-rose-600 transition hover:bg-rose-500/15"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Remove link
          </button>
        </div>
      ))}

      <button
        type="button"
        onClick={() => onChange([...links, { label: "", url: "" }])}
        className="inline-flex items-center gap-2 rounded-full border border-app-border bg-app-card px-3 py-1.5 text-xs font-semibold text-app-text transition hover:border-brand/30 hover:bg-brand/5"
      >
        <Plus className="h-3.5 w-3.5" />
        Add link
      </button>
    </div>
  );
}

function HeroEditor({
  section,
  onChange,
}: {
  section: Extract<PortfolioSection, { type: "hero" }>;
  onChange: (patch: Record<string, unknown>) => void;
}) {
  return (
    <div className="grid gap-3">
      <Field label="Headline">
        <Input value={section.headline} onChange={(event) => onChange({ headline: event.target.value })} />
      </Field>
      <Field label="Subheadline">
        <Textarea value={section.subheadline} onChange={(event) => onChange({ subheadline: event.target.value })} />
      </Field>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Primary button label">
          <Input value={section.ctaLabel} onChange={(event) => onChange({ ctaLabel: event.target.value })} />
        </Field>
        <Field label="Primary button link">
          <Input value={section.ctaHref} onChange={(event) => onChange({ ctaHref: event.target.value })} />
        </Field>
      </div>
      <Field label="Quick links">
        <LinkListEditor links={section.links} onChange={(links) => onChange({ links })} />
      </Field>
    </div>
  );
}

function TextSectionEditor({
  section,
  onChange,
}: {
  section: Extract<PortfolioSection, { type: "about" | "rich_text" }>;
  onChange: (patch: Record<string, unknown>) => void;
}) {
  return (
    <div className="grid gap-3">
      <Field label="Title">
        <Input value={section.title} onChange={(event) => onChange({ title: event.target.value })} />
      </Field>
      <Field label="Body">
        <Textarea value={section.body} onChange={(event) => onChange({ body: event.target.value })} />
      </Field>
    </div>
  );
}

function ProjectsEditor({
  section,
  onChange,
}: {
  section: Extract<PortfolioSection, { type: "projects" }>;
  onChange: (patch: Record<string, unknown>) => void;
}) {
  const projects = section.projects;

  return (
    <div className="grid gap-3">
      <Field label="Title">
        <Input value={section.title} onChange={(event) => onChange({ title: event.target.value })} />
      </Field>

      {projects.map((project, index) => (
        <div key={project.id || index} className="rounded-[18px] border border-app-border bg-app-card p-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Project name">
              <Input
                value={project.name}
                onChange={(event) =>
                  onChange({ projects: updateArrayItem(projects, index, { ...project, name: event.target.value }) })
                }
              />
            </Field>
            <Field label="Tagline">
              <Input
                value={project.tagline}
                onChange={(event) =>
                  onChange({ projects: updateArrayItem(projects, index, { ...project, tagline: event.target.value }) })
                }
              />
            </Field>
          </div>

          <Field label="Description">
            <Textarea
              value={project.description}
              onChange={(event) =>
                onChange({ projects: updateArrayItem(projects, index, { ...project, description: event.target.value }) })
              }
            />
          </Field>

          <Field label="Tech stack (comma separated)">
            <Input
              value={project.tech.join(", ")}
              onChange={(event) =>
                onChange({ projects: updateArrayItem(projects, index, { ...project, tech: parseCommaList(event.target.value) }) })
              }
            />
          </Field>

          <label className="inline-flex items-center gap-2 rounded-full border border-app-border bg-app px-3 py-1.5 text-xs font-semibold text-app-text">
            <input
              type="checkbox"
              checked={project.highlight}
              onChange={(event) =>
                onChange({ projects: updateArrayItem(projects, index, { ...project, highlight: event.target.checked }) })
              }
              className="h-4 w-4 rounded border-app-border text-brand focus:ring-brand"
            />
            Featured project
          </label>

          <div className="mt-3">
            <Field label="Project links">
              <LinkListEditor
                links={project.links}
                onChange={(links) => onChange({ projects: updateArrayItem(projects, index, { ...project, links }) })}
              />
            </Field>
          </div>

          <button
            type="button"
            onClick={() => onChange({ projects: removeArrayItem(projects, index) })}
            className="mt-3 inline-flex items-center gap-2 rounded-full border border-rose-500/20 bg-rose-500/10 px-3 py-1.5 text-xs font-semibold text-rose-600 transition hover:bg-rose-500/15"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Remove project
          </button>
        </div>
      ))}

      <button
        type="button"
        onClick={() =>
          onChange({
            projects: [
              ...projects,
              {
                id: createPortfolioEntityId("project"),
                name: "",
                tagline: "",
                description: "",
                links: [],
                tech: [],
                highlight: false,
              } satisfies PortfolioProject,
            ],
          })
        }
        className="inline-flex items-center gap-2 rounded-full border border-app-border bg-app-card px-3 py-1.5 text-xs font-semibold text-app-text transition hover:border-brand/30 hover:bg-brand/5"
      >
        <Plus className="h-3.5 w-3.5" />
        Add project
      </button>
    </div>
  );
}

function ExperienceEditor({
  section,
  onChange,
}: {
  section: Extract<PortfolioSection, { type: "experience" }>;
  onChange: (patch: Record<string, unknown>) => void;
}) {
  const items = section.items;

  return (
    <div className="grid gap-3">
      <Field label="Title">
        <Input value={section.title} onChange={(event) => onChange({ title: event.target.value })} />
      </Field>

      {items.map((item, index) => (
        <div key={item.id || index} className="rounded-[18px] border border-app-border bg-app-card p-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Role">
              <Input
                value={item.role}
                onChange={(event) =>
                  onChange({ items: updateArrayItem(items, index, { ...item, role: event.target.value }) })
                }
              />
            </Field>
            <Field label="Company">
              <Input
                value={item.company}
                onChange={(event) =>
                  onChange({ items: updateArrayItem(items, index, { ...item, company: event.target.value }) })
                }
              />
            </Field>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Location">
              <Input
                value={item.location}
                onChange={(event) =>
                  onChange({ items: updateArrayItem(items, index, { ...item, location: event.target.value }) })
                }
              />
            </Field>
            <Field label="Start">
              <Input
                value={item.start}
                onChange={(event) =>
                  onChange({ items: updateArrayItem(items, index, { ...item, start: event.target.value }) })
                }
              />
            </Field>
            <Field label="End">
              <Input
                value={item.end}
                onChange={(event) =>
                  onChange({ items: updateArrayItem(items, index, { ...item, end: event.target.value }) })
                }
                placeholder={item.current ? "Present" : ""}
              />
            </Field>
          </div>

          <label className="inline-flex items-center gap-2 rounded-full border border-app-border bg-app px-3 py-1.5 text-xs font-semibold text-app-text">
            <input
              type="checkbox"
              checked={item.current}
              onChange={(event) =>
                onChange({ items: updateArrayItem(items, index, { ...item, current: event.target.checked }) })
              }
              className="h-4 w-4 rounded border-app-border text-brand focus:ring-brand"
            />
            Current role
          </label>

          <Field label="Bullets (one per line)">
            <Textarea
              value={item.bullets.join("\n")}
              onChange={(event) =>
                onChange({ items: updateArrayItem(items, index, { ...item, bullets: parseLineList(event.target.value) }) })
              }
            />
          </Field>

          <button
            type="button"
            onClick={() => onChange({ items: removeArrayItem(items, index) })}
            className="mt-3 inline-flex items-center gap-2 rounded-full border border-rose-500/20 bg-rose-500/10 px-3 py-1.5 text-xs font-semibold text-rose-600 transition hover:bg-rose-500/15"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Remove experience
          </button>
        </div>
      ))}

      <button
        type="button"
        onClick={() =>
          onChange({
            items: [
              ...items,
              {
                id: createPortfolioEntityId("experience"),
                role: "",
                company: "",
                location: "",
                start: "",
                end: "",
                current: false,
                bullets: [],
              } satisfies PortfolioExperience,
            ],
          })
        }
        className="inline-flex items-center gap-2 rounded-full border border-app-border bg-app-card px-3 py-1.5 text-xs font-semibold text-app-text transition hover:border-brand/30 hover:bg-brand/5"
      >
        <Plus className="h-3.5 w-3.5" />
        Add experience
      </button>
    </div>
  );
}

function EducationEditor({
  section,
  onChange,
}: {
  section: Extract<PortfolioSection, { type: "education" }>;
  onChange: (patch: Record<string, unknown>) => void;
}) {
  const items = section.items;

  return (
    <div className="grid gap-3">
      <Field label="Title">
        <Input value={section.title} onChange={(event) => onChange({ title: event.target.value })} />
      </Field>

      {items.map((item, index) => (
        <div key={item.id || index} className="rounded-[18px] border border-app-border bg-app-card p-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="School / Institution">
              <Input
                value={item.school}
                onChange={(event) =>
                  onChange({ items: updateArrayItem(items, index, { ...item, school: event.target.value }) })
                }
              />
            </Field>
            <Field label="Degree / Program">
              <Input
                value={item.degree}
                onChange={(event) =>
                  onChange({ items: updateArrayItem(items, index, { ...item, degree: event.target.value }) })
                }
              />
            </Field>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Start">
              <Input
                value={item.start}
                onChange={(event) =>
                  onChange({ items: updateArrayItem(items, index, { ...item, start: event.target.value }) })
                }
              />
            </Field>
            <Field label="End">
              <Input
                value={item.end}
                onChange={(event) =>
                  onChange({ items: updateArrayItem(items, index, { ...item, end: event.target.value }) })
                }
              />
            </Field>
          </div>

          <Field label="Highlights (comma separated)">
            <Input
              value={item.highlights.join(", ")}
              onChange={(event) =>
                onChange({
                  items: updateArrayItem(items, index, { ...item, highlights: parseCommaList(event.target.value) }),
                })
              }
            />
          </Field>

          <button
            type="button"
            onClick={() => onChange({ items: removeArrayItem(items, index) })}
            className="mt-3 inline-flex items-center gap-2 rounded-full border border-rose-500/20 bg-rose-500/10 px-3 py-1.5 text-xs font-semibold text-rose-600 transition hover:bg-rose-500/15"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Remove education
          </button>
        </div>
      ))}

      <button
        type="button"
        onClick={() =>
          onChange({
            items: [
              ...items,
              {
                id: createPortfolioEntityId("education"),
                school: "",
                degree: "",
                start: "",
                end: "",
                highlights: [],
              } satisfies PortfolioEducation,
            ],
          })
        }
        className="inline-flex items-center gap-2 rounded-full border border-app-border bg-app-card px-3 py-1.5 text-xs font-semibold text-app-text transition hover:border-brand/30 hover:bg-brand/5"
      >
        <Plus className="h-3.5 w-3.5" />
        Add education
      </button>
    </div>
  );
}

function TestimonialsEditor({
  section,
  onChange,
}: {
  section: Extract<PortfolioSection, { type: "testimonials" }>;
  onChange: (patch: Record<string, unknown>) => void;
}) {
  const items = section.items;

  return (
    <div className="grid gap-3">
      <Field label="Title">
        <Input value={section.title} onChange={(event) => onChange({ title: event.target.value })} />
      </Field>

      {items.map((item, index) => (
        <div key={item.id || index} className="rounded-[18px] border border-app-border bg-app-card p-3">
          <Field label="Quote">
            <Textarea
              value={item.quote}
              onChange={(event) =>
                onChange({ items: updateArrayItem(items, index, { ...item, quote: event.target.value }) })
              }
            />
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Author">
              <Input
                value={item.author}
                onChange={(event) =>
                  onChange({ items: updateArrayItem(items, index, { ...item, author: event.target.value }) })
                }
              />
            </Field>
            <Field label="Author role">
              <Input
                value={item.authorRole}
                onChange={(event) =>
                  onChange({ items: updateArrayItem(items, index, { ...item, authorRole: event.target.value }) })
                }
              />
            </Field>
          </div>

          <button
            type="button"
            onClick={() => onChange({ items: removeArrayItem(items, index) })}
            className="mt-3 inline-flex items-center gap-2 rounded-full border border-rose-500/20 bg-rose-500/10 px-3 py-1.5 text-xs font-semibold text-rose-600 transition hover:bg-rose-500/15"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Remove testimonial
          </button>
        </div>
      ))}

      <button
        type="button"
        onClick={() =>
          onChange({
            items: [
              ...items,
              {
                id: createPortfolioEntityId("testimonial"),
                quote: "",
                author: "",
                authorRole: "",
              } satisfies PortfolioTestimonial,
            ],
          })
        }
        className="inline-flex items-center gap-2 rounded-full border border-app-border bg-app-card px-3 py-1.5 text-xs font-semibold text-app-text transition hover:border-brand/30 hover:bg-brand/5"
      >
        <Plus className="h-3.5 w-3.5" />
        Add testimonial
      </button>
    </div>
  );
}

function ContactEditor({
  section,
  onChange,
}: {
  section: Extract<PortfolioSection, { type: "contact" }>;
  onChange: (patch: Record<string, unknown>) => void;
}) {
  return (
    <div className="grid gap-3">
      <Field label="Title">
        <Input value={section.title} onChange={(event) => onChange({ title: event.target.value })} />
      </Field>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Email">
          <Input value={section.email} onChange={(event) => onChange({ email: event.target.value })} />
        </Field>
        <Field label="Phone">
          <Input value={section.phone} onChange={(event) => onChange({ phone: event.target.value })} />
        </Field>
      </div>
      <Field label="Location">
        <Input value={section.location} onChange={(event) => onChange({ location: event.target.value })} />
      </Field>
      <Field label="Social / contact links">
        <LinkListEditor links={section.links} onChange={(links) => onChange({ links })} />
      </Field>
    </div>
  );
}

function SkillsEditor({
  section,
  onChange,
}: {
  section: Extract<PortfolioSection, { type: "skills" }>;
  onChange: (patch: Record<string, unknown>) => void;
}) {
  return (
    <div className="grid gap-3">
      <Field label="Title">
        <Input value={section.title} onChange={(event) => onChange({ title: event.target.value })} />
      </Field>
      <Field label="Skills (comma separated)">
        <Input
          value={section.skills.join(", ")}
          onChange={(event) => onChange({ skills: parseCommaList(event.target.value) })}
        />
      </Field>
    </div>
  );
}

function SectionStyleEditor({
  value,
  onPatch,
  onClear,
}: {
  value: PortfolioSectionStyleSettings | undefined;
  onPatch: (patch: Partial<PortfolioSectionStyleSettings>) => void;
  onClear: () => void;
}) {
  return (
    <details className="rounded-[18px] border border-app-border bg-app/60 p-3">
      <summary className="cursor-pointer list-none text-sm font-semibold text-app-text">
        <span className="inline-flex items-center gap-2">
          <Paintbrush2 className="h-4 w-4 text-brand" />
          Section style controls
        </span>
      </summary>

      <div className="mt-4 grid gap-3">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <StyleNumberField label="Padding top" value={value?.paddingTop} onChange={(next) => onPatch({ paddingTop: next })} />
          <StyleNumberField label="Padding bottom" value={value?.paddingBottom} onChange={(next) => onPatch({ paddingBottom: next })} />
          <StyleNumberField label="Padding X" value={value?.paddingX} onChange={(next) => onPatch({ paddingX: next })} />
          <StyleNumberField label="Gap" value={value?.gap} onChange={(next) => onPatch({ gap: next })} />
          <StyleNumberField label="Section radius" value={value?.radius} onChange={(next) => onPatch({ radius: next })} />
          <StyleNumberField label="Card radius" value={value?.cardRadius} onChange={(next) => onPatch({ cardRadius: next })} />
          <StyleNumberField label="Card padding" value={value?.cardPadding} onChange={(next) => onPatch({ cardPadding: next })} />
          <StyleNumberField label="Title font size" value={value?.titleFontSize} onChange={(next) => onPatch({ titleFontSize: next })} />
          <StyleNumberField label="Body font size" value={value?.bodyFontSize} onChange={(next) => onPatch({ bodyFontSize: next })} />
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <StyleTextField label="Section background" value={value?.background} onChange={(next) => onPatch({ background: next })} />
          <StyleTextField label="Section border color" value={value?.borderColor} onChange={(next) => onPatch({ borderColor: next })} />
          <StyleTextField label="Title color" value={value?.titleColor} onChange={(next) => onPatch({ titleColor: next })} />
          <StyleTextField label="Body color" value={value?.bodyColor} onChange={(next) => onPatch({ bodyColor: next })} />
          <StyleTextField label="Card background" value={value?.cardBackground} onChange={(next) => onPatch({ cardBackground: next })} />
          <StyleTextField label="Card border color" value={value?.cardBorderColor} onChange={(next) => onPatch({ cardBorderColor: next })} />
          <StyleTextField label="Accent color" value={value?.accentColor} onChange={(next) => onPatch({ accentColor: next })} />
          <StyleTextField label="Button background" value={value?.buttonBackground} onChange={(next) => onPatch({ buttonBackground: next })} />
          <StyleTextField label="Button text color" value={value?.buttonTextColor} onChange={(next) => onPatch({ buttonTextColor: next })} />
        </div>

        <Field label="Text align">
          <select
            value={value?.align || ""}
            onChange={(event) => onPatch({ align: (event.target.value || undefined) as "left" | "center" | undefined })}
            className="input-shell h-10 rounded-[14px] px-3 py-2 text-[13px]"
          >
            <option value="">Template default</option>
            <option value="left">Left</option>
            <option value="center">Center</option>
          </select>
        </Field>

        <button
          type="button"
          onClick={onClear}
          className="inline-flex w-fit items-center gap-2 rounded-full border border-rose-500/20 bg-rose-500/10 px-3 py-1.5 text-xs font-semibold text-rose-600 transition hover:bg-rose-500/15"
        >
          <Trash2 className="h-3.5 w-3.5" />
          Reset current responsive style
        </button>
      </div>
    </details>
  );
}

function SectionContentEditor({
  section,
  onChange,
}: {
  section: PortfolioSection;
  onChange: (patch: Record<string, unknown>) => void;
}) {
  switch (section.type) {
    case "hero":
      return <HeroEditor section={section} onChange={onChange} />;
    case "about":
    case "rich_text":
      return <TextSectionEditor section={section} onChange={onChange} />;
    case "projects":
      return <ProjectsEditor section={section} onChange={onChange} />;
    case "experience":
      return <ExperienceEditor section={section} onChange={onChange} />;
    case "skills":
      return <SkillsEditor section={section} onChange={onChange} />;
    case "education":
      return <EducationEditor section={section} onChange={onChange} />;
    case "testimonials":
      return <TestimonialsEditor section={section} onChange={onChange} />;
    case "contact":
      return <ContactEditor section={section} onChange={onChange} />;
    default:
      return null;
  }
}

export function PortfolioSectionList({
  sections,
  sectionStyles,
  designViewport,
  designMode,
  onDesignViewportChange,
  onDesignModeChange,
  onAddSection,
  onUpdateSection,
  onMoveSection,
  onRemoveSection,
  onUpdateSectionStyle,
  onClearSectionStyle,
}: PortfolioSectionListProps) {
  return (
    <SectionCard
      title="Sections"
      actions={
        <select
          onChange={(event) => {
            const type = event.target.value;
            event.currentTarget.value = "";
            if (type) {
              onAddSection(type);
            }
          }}
          defaultValue=""
          className="input-shell h-10 rounded-[14px] px-3 py-2 text-[13px]"
        >
          <option value="" disabled>
            Add section...
          </option>
          <option value="hero">Hero</option>
          <option value="about">About</option>
          <option value="projects">Projects</option>
          <option value="experience">Experience</option>
          <option value="skills">Skills</option>
          <option value="education">Education</option>
          <option value="testimonials">Testimonials</option>
          <option value="contact">Contact</option>
          <option value="rich_text">Rich text</option>
        </select>
      }
    >
      <div className="rounded-[20px] border border-app-border bg-app-secondary/35 p-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Design Mode">
            <div className="flex flex-wrap gap-2">
              {(["light", "dark"] as PortfolioColorMode[]).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => onDesignModeChange(mode)}
                  className={`inline-flex items-center rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                    designMode === mode
                      ? "bg-brand text-white"
                      : "border border-app-border bg-app-card text-app-text hover:border-brand/30 hover:bg-brand/5"
                  }`}
                >
                  {mode === "light" ? "Light mode styles" : "Dark mode styles"}
                </button>
              ))}
            </div>
          </Field>

          <Field label="Viewport">
            <div className="flex flex-wrap gap-2">
              {(["mobile", "tablet", "desktop"] as PortfolioViewportKey[]).map((viewport) => (
                <button
                  key={viewport}
                  type="button"
                  onClick={() => onDesignViewportChange(viewport)}
                  className={`inline-flex items-center rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                    designViewport === viewport
                      ? "bg-brand text-white"
                      : "border border-app-border bg-app-card text-app-text hover:border-brand/30 hover:bg-brand/5"
                  }`}
                >
                  {viewport}
                </button>
              ))}
            </div>
          </Field>
        </div>

        <p className="mt-3 text-xs text-app-muted">
          Each section below can have separate styling for {designMode} mode on {designViewport}.
        </p>
      </div>

      <div className="space-y-3">
        {sections.map((section, index) => {
          const currentStyle = sectionStyles[section.id]?.[designMode]?.[designViewport];

          return (
            <div key={section.id} className="rounded-[20px] border border-app-border bg-app-secondary/30 p-3">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-app-text">{sectionTitle(section)}</p>
                  <p className="mt-0.5 text-[11px] uppercase tracking-[0.16em] text-app-muted">{section.type}</p>
                </div>

                <div className="flex flex-wrap items-center justify-end gap-2">
                  <label className="inline-flex items-center gap-2 rounded-full border border-app-border bg-app-card px-3 py-1.5 text-xs font-semibold text-app-text">
                    <input
                      type="checkbox"
                      checked={section.enabled}
                      onChange={(event) => onUpdateSection(section.id, { enabled: event.target.checked })}
                      className="h-4 w-4 rounded border-app-border text-brand focus:ring-brand"
                    />
                    Show
                  </label>

                  <div className="inline-flex items-center gap-1 rounded-full border border-app-border bg-app-card px-1 py-1">
                    <button
                      type="button"
                      onClick={() => onMoveSection(section.id, -1)}
                      disabled={index === 0}
                      className="inline-flex h-7 w-7 items-center justify-center rounded-full text-app-text transition hover:bg-brand/8 disabled:cursor-not-allowed disabled:opacity-35"
                      title="Move up"
                    >
                      <ArrowUp className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onMoveSection(section.id, 1)}
                      disabled={index === sections.length - 1}
                      className="inline-flex h-7 w-7 items-center justify-center rounded-full text-app-text transition hover:bg-brand/8 disabled:cursor-not-allowed disabled:opacity-35"
                      title="Move down"
                    >
                      <ArrowDown className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => onRemoveSection(section.id)}
                    className="inline-flex items-center gap-2 rounded-full border border-rose-500/20 bg-rose-500/10 px-3 py-1.5 text-xs font-semibold text-rose-600 transition hover:bg-rose-500/15"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Remove
                  </button>
                </div>
              </div>

              <div className="mt-4 grid gap-4">
                <SectionContentEditor section={section} onChange={(patch) => onUpdateSection(section.id, patch)} />

                <SectionStyleEditor
                  value={currentStyle}
                  onPatch={(patch) => onUpdateSectionStyle(section.id, designMode, designViewport, patch)}
                  onClear={() => onClearSectionStyle(section.id, designMode, designViewport)}
                />
              </div>
            </div>
          );
        })}
      </div>

      {!sections.length ? (
        <div className="rounded-[18px] border border-dashed border-app-border bg-app-secondary/35 px-4 py-6 text-center text-sm text-app-muted">
          Add your first section using "Add section..."
        </div>
      ) : null}
    </SectionCard>
  );
}
