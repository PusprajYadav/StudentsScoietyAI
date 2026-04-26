import { Fragment } from "react";
import type { CSSProperties, ReactNode } from "react";
import type {
  ResumeAtsSectionKey,
  ResumeDesignBlockKey,
  ResumeExecutiveSectionKey,
  ResumeRecord,
  ResumeSidebarSectionKey,
} from "./types";
import { formatResumeDateRange, resolveResumeDesignStyle } from "./utils";

interface ResumeTemplateRendererProps {
  resume: ResumeRecord;
  selectedDesignBlock?: ResumeDesignBlockKey | null;
  selectedDesignTargetKey?: string | null;
  interactiveDesignPreview?: boolean;
}

function styleForBlock(
  resume: ResumeRecord,
  block: ResumeDesignBlockKey,
  targetKey?: string | null,
  options?: { includePadding?: boolean; includeColor?: boolean }
): CSSProperties {
  const style = resolveResumeDesignStyle(resume.content.design, block, targetKey);
  const includePadding = options?.includePadding ?? true;
  const includeColor = options?.includeColor ?? true;

  return {
    fontSize: `${style.fontSize}px`,
    ...(includeColor ? { color: style.color } : {}),
    ...(includePadding
      ? {
          paddingTop: `${style.paddingTop}px`,
          paddingRight: `${style.paddingRight}px`,
          paddingBottom: `${style.paddingBottom}px`,
          paddingLeft: `${style.paddingLeft}px`,
        }
      : {}),
  };
}

function blockProps(
  resume: ResumeRecord,
  block: ResumeDesignBlockKey,
  selectedDesignBlock: ResumeDesignBlockKey | null,
  selectedDesignTargetKeyOrInteractiveDesignPreview?: string | null | boolean,
  interactiveDesignPreviewOrOptions?:
    | boolean
    | {
        includePadding?: boolean;
        includeColor?: boolean;
        targetKey?: string;
        label?: string;
      },
  options?: {
    includePadding?: boolean;
    includeColor?: boolean;
    targetKey?: string;
    label?: string;
  }
) {
  const hasExplicitSelectedTargetKey =
    typeof selectedDesignTargetKeyOrInteractiveDesignPreview === "string" ||
    selectedDesignTargetKeyOrInteractiveDesignPreview === null;
  const selectedDesignTargetKey = hasExplicitSelectedTargetKey
    ? selectedDesignTargetKeyOrInteractiveDesignPreview
    : null;
  const interactiveDesignPreview =
    typeof selectedDesignTargetKeyOrInteractiveDesignPreview === "boolean"
      ? selectedDesignTargetKeyOrInteractiveDesignPreview
      : typeof interactiveDesignPreviewOrOptions === "boolean"
        ? interactiveDesignPreviewOrOptions
        : undefined;
  const inlineOptions =
    typeof interactiveDesignPreviewOrOptions === "object" &&
    interactiveDesignPreviewOrOptions !== null
      ? interactiveDesignPreviewOrOptions
      : undefined;
  const resolvedOptions = hasExplicitSelectedTargetKey
    ? options || inlineOptions
    : inlineOptions || options;
  const style = styleForBlock(resume, block, resolvedOptions?.targetKey, resolvedOptions);
  const isSelected = Boolean(
    interactiveDesignPreview &&
      (selectedDesignTargetKey
        ? selectedDesignTargetKey === resolvedOptions?.targetKey
        : selectedDesignBlock === block)
  );

  return {
    "data-design-block": block,
    "data-design-target": resolvedOptions?.targetKey,
    "data-design-label": resolvedOptions?.label,
    style: {
      ...style,
      cursor: interactiveDesignPreview ? "pointer" : undefined,
      outline: isSelected ? "2px solid #3b82f6" : undefined,
      outlineOffset: isSelected ? "2px" : undefined,
      borderRadius: isSelected ? "6px" : undefined,
    } as CSSProperties,
  };
}

function hexToRgb(color: string) {
  const normalized = color.replace("#", "").trim();
  if (normalized.length === 3) {
    const r = Number.parseInt(normalized[0] + normalized[0], 16);
    const g = Number.parseInt(normalized[1] + normalized[1], 16);
    const b = Number.parseInt(normalized[2] + normalized[2], 16);
    return { r, g, b };
  }

  if (normalized.length === 6) {
    const r = Number.parseInt(normalized.slice(0, 2), 16);
    const g = Number.parseInt(normalized.slice(2, 4), 16);
    const b = Number.parseInt(normalized.slice(4, 6), 16);
    return { r, g, b };
  }

  return { r: 30, g: 41, b: 59 };
}

function withAlpha(hex: string, alpha: number) {
  const rgb = hexToRgb(hex);
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;
}

function contrastText(hex: string) {
  const { r, g, b } = hexToRgb(hex);
  const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  return luminance > 0.58 ? "#0f172a" : "#f8fafc";
}

function toVisibleItems(items: string[]) {
  return items.map((item) => item.trim()).filter(Boolean);
}

function renderRichLines(
  items: string[],
  resume: ResumeRecord,
  selectedDesignBlock: ResumeDesignBlockKey | null,
  selectedDesignTargetKeyOrInteractiveDesignPreview?: string | null | boolean,
  targetPrefixOrInteractiveDesignPreview?: string | boolean,
  labelPrefix?: string,
  interactiveDesignPreview?: boolean
) {
  const selectedDesignTargetKey =
    typeof selectedDesignTargetKeyOrInteractiveDesignPreview === "string" ||
    selectedDesignTargetKeyOrInteractiveDesignPreview === null
      ? selectedDesignTargetKeyOrInteractiveDesignPreview
      : null;
  const targetPrefix =
    typeof targetPrefixOrInteractiveDesignPreview === "string"
      ? targetPrefixOrInteractiveDesignPreview
      : undefined;
  const resolvedInteractiveDesignPreview =
    typeof selectedDesignTargetKeyOrInteractiveDesignPreview === "boolean"
      ? selectedDesignTargetKeyOrInteractiveDesignPreview
      : typeof targetPrefixOrInteractiveDesignPreview === "boolean"
        ? targetPrefixOrInteractiveDesignPreview
        : interactiveDesignPreview;

  return toVisibleItems(items).map((item, index) => (
    <li
      key={`${targetPrefix || item}-${index}`}
      className="leading-6 text-slate-700"
      {...blockProps(resume, "body", selectedDesignBlock, selectedDesignTargetKey, resolvedInteractiveDesignPreview, {
        targetKey: targetPrefix ? `${targetPrefix}:${index}` : undefined,
        label: labelPrefix ? `${labelPrefix} ${index + 1}` : undefined,
      })}
    >
      {item}
    </li>
  ));
}

function designTargetKey(...parts: Array<string | number | null | undefined>) {
  return parts
    .filter((part): part is string | number => part !== null && part !== undefined && `${part}`.trim().length > 0)
    .map((part) => `${part}`.trim())
    .join(":");
}

function resumeLinkLabel(value: string) {
  return value.replace(/^https?:\/\//i, "").replace(/^www\./i, "");
}

function sectionKey(title: string) {
  const normalized = title
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

  return normalized || "section";
}

function normalizeUrl(value: string) {
  const trimmed = value.trim();

  if (!trimmed) {
    return "";
  }

  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

function renderOrderedSections<T extends string>(
  order: T[],
  sections: Record<T, ReactNode>,
  prefix: string
) {
  return order.map((sectionKey) => {
    const section = sections[sectionKey];

    if (!section) {
      return null;
    }

    return <Fragment key={`${prefix}:${sectionKey}`}>{section}</Fragment>;
  });
}

function ContactLine({
  resume,
  selectedDesignBlock,
  interactiveDesignPreview,
}: {
  resume: ResumeRecord;
  selectedDesignBlock: ResumeDesignBlockKey | null;
  interactiveDesignPreview?: boolean;
}) {
  const { contact } = resume.content;
  const items = [
    contact.location,
    contact.email,
    contact.phone,
    contact.linkedin ? resumeLinkLabel(contact.linkedin) : "",
    contact.website ? resumeLinkLabel(contact.website) : "",
    contact.github ? resumeLinkLabel(contact.github) : "",
  ].filter(Boolean);

  if (!items.length) {
    return null;
  }

  return (
    <div
      className="mt-3 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-[13px] font-medium text-slate-600"
      {...blockProps(resume, "meta", selectedDesignBlock, interactiveDesignPreview)}
    >
      {items.map((item, index) => (
        <span key={`${item}-${index}`} className="inline-flex items-center gap-3">
          {index > 0 ? <span className="text-slate-400">•</span> : null}
          <span>{item}</span>
        </span>
      ))}
    </div>
  );
}

function AtsSection({
  resume,
  selectedDesignBlock,
  selectedDesignTargetKey,
  interactiveDesignPreview,
  title,
  targetPrefix,
  children,
}: {
  resume: ResumeRecord;
  selectedDesignBlock: ResumeDesignBlockKey | null;
  selectedDesignTargetKey?: string | null;
  interactiveDesignPreview?: boolean;
  title: string;
  targetPrefix: string;
  children: ReactNode;
}) {
  const ruleColor = resume.content.design.theme.primaryColor;

  return (
    <section className="mt-6 break-inside-avoid" data-resume-section={sectionKey(title)}>
      <div className="border-b-2 pb-1" style={{ borderColor: ruleColor }}>
        <h2
        className="text-[15px] font-extrabold uppercase tracking-[0.14em]"
        style={{ color: ruleColor }}
        {...blockProps(resume, "sectionTitle", selectedDesignBlock, selectedDesignTargetKey, interactiveDesignPreview, {
          includeColor: false,
          targetKey: designTargetKey(targetPrefix, "title"),
          label: `${title} title`,
        })}
      >
        {title}
        </h2>
      </div>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function SidebarSection({
  resume,
  selectedDesignBlock,
  selectedDesignTargetKey,
  interactiveDesignPreview,
  title,
  targetPrefix,
  children,
}: {
  resume: ResumeRecord;
  selectedDesignBlock: ResumeDesignBlockKey | null;
  selectedDesignTargetKey?: string | null;
  interactiveDesignPreview?: boolean;
  title: string;
  targetPrefix: string;
  children: ReactNode;
}) {
  const accent = resume.content.design.theme.primaryColor;

  return (
    <section className="mt-6 break-inside-avoid" data-resume-section={sectionKey(title)}>
      <h3
        className="text-[13px] font-extrabold uppercase tracking-[0.2em]"
        style={{ color: accent }}
        {...blockProps(resume, "sectionTitle", selectedDesignBlock, selectedDesignTargetKey, interactiveDesignPreview, {
          includeColor: false,
          targetKey: designTargetKey(targetPrefix, "title"),
          label: `${title} title`,
        })}
      >
        {title}
      </h3>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function ExecutiveSection({
  resume,
  selectedDesignBlock,
  selectedDesignTargetKey,
  interactiveDesignPreview,
  title,
  targetPrefix,
  children,
}: {
  resume: ResumeRecord;
  selectedDesignBlock: ResumeDesignBlockKey | null;
  selectedDesignTargetKey?: string | null;
  interactiveDesignPreview?: boolean;
  title: string;
  targetPrefix: string;
  children: ReactNode;
}) {
  const accent = resume.content.design.theme.primaryColor;

  return (
    <section className="break-inside-avoid" data-resume-section={sectionKey(title)}>
      <h3
        className="text-[16px] font-extrabold tracking-tight"
        style={{ color: accent }}
        {...blockProps(resume, "sectionTitle", selectedDesignBlock, selectedDesignTargetKey, interactiveDesignPreview, {
          includeColor: false,
          targetKey: designTargetKey(targetPrefix, "title"),
          label: `${title} title`,
        })}
      >
        {title}
      </h3>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function AtsClassicTemplate({
  resume,
  selectedDesignBlock = null,
  selectedDesignTargetKey = null,
  interactiveDesignPreview,
}: ResumeTemplateRendererProps) {
  const {
    contact,
    summary,
    experience,
    education,
    projects,
    skillGroups,
    certifications,
    achievements,
    languages,
    interests,
    references,
  } = resume.content;
  const { pageBackground, primaryColor } = resume.content.design.theme;
  const atsOrder = resume.content.design.layout.atsOrder;
  const rootBodyProps = blockProps(resume, "body", selectedDesignBlock, interactiveDesignPreview, {
    includePadding: false,
  });

  const atsSections: Record<ResumeAtsSectionKey, ReactNode> = {
    summary: summary ? (
      <AtsSection
        resume={resume}
        title="Professional Summary"
        selectedDesignBlock={selectedDesignBlock}
        selectedDesignTargetKey={selectedDesignTargetKey}
        interactiveDesignPreview={interactiveDesignPreview}
        targetPrefix="ats:summary"
      >
        <p
          className="leading-7 text-slate-700"
          {...blockProps(resume, "body", selectedDesignBlock, selectedDesignTargetKey, interactiveDesignPreview, {
            targetKey: "ats:summary:body",
            label: "Professional summary",
          })}
        >
          {summary}
        </p>
      </AtsSection>
    ) : null,
    experience: experience.length ? (
      <AtsSection
        resume={resume}
        title="Professional Experience"
        selectedDesignBlock={selectedDesignBlock}
        selectedDesignTargetKey={selectedDesignTargetKey}
        interactiveDesignPreview={interactiveDesignPreview}
        targetPrefix="ats:experience"
      >
        <div className="space-y-5">
          {experience.map((item) => {
            const bullets = toVisibleItems(item.bullets);
            if (!item.role && !item.company && !bullets.length) {
              return null;
            }

            return (
              <div key={item.id} className="break-inside-avoid" data-resume-break-block="experience-item">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[20px] font-bold text-slate-800">{item.role || "Role title"}</p>
                    <p className="text-[15px] font-semibold text-slate-600">{item.company}</p>
                  </div>
                  <div
                    className="text-right text-[13px] font-semibold text-slate-600"
                    {...blockProps(resume, "meta", selectedDesignBlock, selectedDesignTargetKey, interactiveDesignPreview, {
                      targetKey: designTargetKey("ats", "experience", item.id, "meta"),
                      label: `${item.role || "Experience"} details`,
                    })}
                  >
                    {formatResumeDateRange(item)}
                    {item.location ? <p className="mt-1">{item.location}</p> : null}
                  </div>
                </div>
                {bullets.length ? (
                  <ul className="mt-3 list-disc space-y-1.5 pl-5 text-[14px]">
                    {renderRichLines(
                      bullets,
                      resume,
                      selectedDesignBlock,
                      selectedDesignTargetKey,
                      designTargetKey("ats", "experience", item.id, "bullet"),
                      `${item.role || "Experience"} bullet`,
                      interactiveDesignPreview
                    )}
                  </ul>
                ) : null}
              </div>
            );
          })}
        </div>
      </AtsSection>
    ) : null,
    projects: projects.length ? (
      <AtsSection
        resume={resume}
        title="Projects"
        selectedDesignBlock={selectedDesignBlock}
        selectedDesignTargetKey={selectedDesignTargetKey}
        interactiveDesignPreview={interactiveDesignPreview}
        targetPrefix="ats:projects"
      >
        <div className="space-y-5">
          {projects.map((item) => {
            const bullets = toVisibleItems(item.bullets);
            if (!item.name && !item.role && !bullets.length) {
              return null;
            }

            return (
              <div key={item.id} className="break-inside-avoid" data-resume-break-block="project-item">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[18px] font-bold text-slate-800">{item.name || "Project name"}</p>
                    <p className="text-[14px] font-semibold text-slate-600">{item.role}</p>
                  </div>
                  <div
                    className="text-right text-[13px] font-semibold text-slate-600"
                    {...blockProps(resume, "meta", selectedDesignBlock, selectedDesignTargetKey, interactiveDesignPreview, {
                      targetKey: designTargetKey("ats", "project", item.id, "meta"),
                      label: `${item.name || "Project"} details`,
                    })}
                  >
                    {formatResumeDateRange(item)}
                    {item.link ? (
                      <a
                        href={normalizeUrl(item.link)}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-1 block underline"
                        style={{ color: primaryColor }}
                      >
                        {resumeLinkLabel(item.link)}
                      </a>
                    ) : null}
                  </div>
                </div>
                {bullets.length ? (
                  <ul className="mt-3 list-disc space-y-1.5 pl-5 text-[14px]">
                    {renderRichLines(
                      bullets,
                      resume,
                      selectedDesignBlock,
                      selectedDesignTargetKey,
                      designTargetKey("ats", "project", item.id, "bullet"),
                      `${item.name || "Project"} bullet`,
                      interactiveDesignPreview
                    )}
                  </ul>
                ) : null}
              </div>
            );
          })}
        </div>
      </AtsSection>
    ) : null,
    education: education.length ? (
      <AtsSection
        resume={resume}
        title="Education"
        selectedDesignBlock={selectedDesignBlock}
        selectedDesignTargetKey={selectedDesignTargetKey}
        interactiveDesignPreview={interactiveDesignPreview}
        targetPrefix="ats:education"
      >
        <div className="space-y-4">
          {education.map((item) => {
            if (!item.degree && !item.institution && !item.details) {
              return null;
            }

            return (
              <div key={item.id} className="break-inside-avoid" data-resume-break-block="education-item">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[18px] font-bold text-slate-800">{item.degree || "Degree"}</p>
                    <p className="text-[14px] font-semibold text-slate-600">{item.institution}</p>
                  </div>
                  <div
                    className="text-right text-[13px] font-semibold text-slate-600"
                    {...blockProps(resume, "meta", selectedDesignBlock, selectedDesignTargetKey, interactiveDesignPreview, {
                      targetKey: designTargetKey("ats", "education", item.id, "meta"),
                      label: `${item.degree || "Education"} details`,
                    })}
                  >
                    {formatResumeDateRange(item)}
                    {item.location ? <p className="mt-1">{item.location}</p> : null}
                  </div>
                </div>
                {[item.score, item.details].filter(Boolean).length ? (
                  <p
                    className="mt-2 leading-6 text-slate-700"
                    {...blockProps(resume, "body", selectedDesignBlock, selectedDesignTargetKey, interactiveDesignPreview, {
                      targetKey: designTargetKey("ats", "education", item.id, "body"),
                      label: `${item.degree || "Education"} description`,
                    })}
                  >
                    {[item.score, item.details].filter(Boolean).join(" • ")}
                  </p>
                ) : null}
              </div>
            );
          })}
        </div>
      </AtsSection>
    ) : null,
    skills: skillGroups.length ? (
      <AtsSection
        resume={resume}
        title="Skills"
        selectedDesignBlock={selectedDesignBlock}
        selectedDesignTargetKey={selectedDesignTargetKey}
        interactiveDesignPreview={interactiveDesignPreview}
        targetPrefix="ats:skills"
      >
        <div className="space-y-3">
          {skillGroups.map((group) => {
            const items = toVisibleItems(group.items);
            if (!items.length) {
              return null;
            }

            return (
              <p
                key={group.id}
                className="break-inside-avoid leading-7 text-slate-700"
                data-resume-break-block="skills-group"
                {...blockProps(resume, "body", selectedDesignBlock, selectedDesignTargetKey, interactiveDesignPreview, {
                  targetKey: designTargetKey("ats", "skills", group.id, "body"),
                  label: `${group.title || "Skills"} line`,
                })}
              >
                <span className="font-extrabold text-slate-800">{group.title}:</span> {items.join(", ")}
              </p>
            );
          })}
        </div>
      </AtsSection>
    ) : null,
    achievements: achievements.length ? (
      <AtsSection
        resume={resume}
        title="Achievements"
        selectedDesignBlock={selectedDesignBlock}
        selectedDesignTargetKey={selectedDesignTargetKey}
        interactiveDesignPreview={interactiveDesignPreview}
        targetPrefix="ats:achievements"
      >
        <div className="space-y-2">
          {achievements.map((item) =>
            item.title || item.detail ? (
              <p
                key={item.id}
                className="break-inside-avoid leading-7 text-slate-700"
                data-resume-break-block="achievement-item"
                {...blockProps(resume, "body", selectedDesignBlock, selectedDesignTargetKey, interactiveDesignPreview, {
                  targetKey: designTargetKey("ats", "achievement", item.id, "body"),
                  label: `${item.title || "Achievement"} line`,
                })}
              >
                <span className="font-bold text-slate-800">{item.title}</span>
                {item.detail ? `: ${item.detail}` : ""}
              </p>
            ) : null
          )}
        </div>
      </AtsSection>
    ) : null,
    languages: languages.length ? (
      <AtsSection
        resume={resume}
        title="Languages"
        selectedDesignBlock={selectedDesignBlock}
        selectedDesignTargetKey={selectedDesignTargetKey}
        interactiveDesignPreview={interactiveDesignPreview}
        targetPrefix="ats:languages"
      >
        <ul className="list-disc space-y-1.5 pl-5">
          {renderRichLines(
            languages,
            resume,
            selectedDesignBlock,
            selectedDesignTargetKey,
            "ats:languages:item",
            "Language",
            interactiveDesignPreview
          )}
        </ul>
      </AtsSection>
    ) : null,
    certifications: certifications.length ? (
      <AtsSection
        resume={resume}
        title="Certifications"
        selectedDesignBlock={selectedDesignBlock}
        selectedDesignTargetKey={selectedDesignTargetKey}
        interactiveDesignPreview={interactiveDesignPreview}
        targetPrefix="ats:certifications"
      >
        <div className="space-y-2">
          {certifications.map((item) =>
            item.title || item.issuer || item.year ? (
              <p
                key={item.id}
                className="break-inside-avoid leading-7 text-slate-700"
                data-resume-break-block="certification-item"
                {...blockProps(resume, "body", selectedDesignBlock, selectedDesignTargetKey, interactiveDesignPreview, {
                  targetKey: designTargetKey("ats", "certification", item.id, "body"),
                  label: `${item.title || "Certification"} line`,
                })}
              >
                <span className="font-bold text-slate-800">{item.title}</span>
                {item.issuer ? ` • ${item.issuer}` : ""}
                {item.year ? ` • ${item.year}` : ""}
              </p>
            ) : null
          )}
        </div>
      </AtsSection>
    ) : null,
    interests: interests.length ? (
      <AtsSection
        resume={resume}
        title="Interests"
        selectedDesignBlock={selectedDesignBlock}
        selectedDesignTargetKey={selectedDesignTargetKey}
        interactiveDesignPreview={interactiveDesignPreview}
        targetPrefix="ats:interests"
      >
        <ul className="list-disc space-y-1.5 pl-5">
          {renderRichLines(
            interests,
            resume,
            selectedDesignBlock,
            selectedDesignTargetKey,
            "ats:interests:item",
            "Interest",
            interactiveDesignPreview
          )}
        </ul>
      </AtsSection>
    ) : null,
    references: references.length ? (
      <AtsSection
        resume={resume}
        title="References"
        selectedDesignBlock={selectedDesignBlock}
        selectedDesignTargetKey={selectedDesignTargetKey}
        interactiveDesignPreview={interactiveDesignPreview}
        targetPrefix="ats:references"
      >
        <div className="grid gap-4 sm:grid-cols-2">
          {references.map((item) =>
            item.name || item.email ? (
              <div
                key={item.id}
                className="break-inside-avoid rounded-2xl border border-slate-200 px-4 py-3"
                data-resume-break-block="reference-item"
              >
                <p className="font-bold text-slate-800">{item.name || "Reference"}</p>
                <p
                  className="mt-1"
                  {...blockProps(resume, "body", selectedDesignBlock, selectedDesignTargetKey, interactiveDesignPreview, {
                    targetKey: designTargetKey("ats", "reference", item.id, "body"),
                    label: `${item.name || "Reference"} description`,
                  })}
                >
                  {[item.role, item.company].filter(Boolean).join(" • ")}
                </p>
                {item.phone ? (
                  <p
                    className="mt-1 text-[12px]"
                    {...blockProps(resume, "meta", selectedDesignBlock, selectedDesignTargetKey, interactiveDesignPreview, {
                      targetKey: designTargetKey("ats", "reference", item.id, "phone"),
                      label: `${item.name || "Reference"} phone`,
                    })}
                  >
                    {item.phone}
                  </p>
                ) : null}
                {item.email ? (
                  <p
                    className="mt-1 text-[12px]"
                    {...blockProps(resume, "meta", selectedDesignBlock, selectedDesignTargetKey, interactiveDesignPreview, {
                      targetKey: designTargetKey("ats", "reference", item.id, "email"),
                      label: `${item.name || "Reference"} email`,
                    })}
                  >
                    {item.email}
                  </p>
                ) : null}
              </div>
            ) : null
          )}
        </div>
      </AtsSection>
    ) : null,
  };

  return (
    <article
      className="min-h-full bg-white px-16 py-14 font-[Manrope] text-[14px] text-slate-800"
      data-design-block={rootBodyProps["data-design-block"]}
      style={{
        backgroundColor: pageBackground,
        ...(rootBodyProps.style as CSSProperties),
      }}
    >
      <header className="border-b border-slate-200 pb-6 text-center" data-resume-break-block="ats-header">
        <h1
          className="font-[Space_Grotesk] text-[38px] font-bold tracking-tight text-slate-800"
          {...blockProps(resume, "name", selectedDesignBlock, interactiveDesignPreview)}
        >
          {contact.fullName || "Your Name"}
        </h1>
        {contact.role ? (
          <p
            className="mt-2 text-[16px] font-semibold text-slate-600"
            {...blockProps(resume, "role", selectedDesignBlock, interactiveDesignPreview)}
          >
            {contact.role}
          </p>
        ) : null}
        <ContactLine
          resume={resume}
          selectedDesignBlock={selectedDesignBlock}
          interactiveDesignPreview={interactiveDesignPreview}
        />
      </header>

      {renderOrderedSections(atsOrder, atsSections, "ats")}
    </article>
  );
}

function SidebarProfessionalTemplate({
  resume,
  selectedDesignBlock = null,
  selectedDesignTargetKey = null,
  interactiveDesignPreview,
}: ResumeTemplateRendererProps) {
  const {
    contact,
    summary,
    experience,
    education,
    projects,
    skillGroups,
    languages,
    references,
    certifications,
    achievements,
    interests,
  } = resume.content;
  const { pageBackground, primaryColor, panelColor } = resume.content.design.theme;
  const sidebarSections = resume.content.design.layout.sidebarSections;
  const panelTint = withAlpha(panelColor, 0.16);
  const panelContrast = contrastText(panelColor);
  const panelHeadingColor = panelContrast === "#f8fafc" ? "#f8fafc" : "#0f172a";
  const rootBodyProps = blockProps(resume, "body", selectedDesignBlock, interactiveDesignPreview, {
    includePadding: false,
  });

  const sectionContent: Record<ResumeSidebarSectionKey, ReactNode> = {
    contact: (
      <SidebarSection
        resume={resume}
        title="Contact"
        selectedDesignBlock={selectedDesignBlock}
        selectedDesignTargetKey={selectedDesignTargetKey}
        interactiveDesignPreview={interactiveDesignPreview}
        targetPrefix="sidebar:contact"
      >
        <div className="space-y-2 text-[13px] leading-6">
          {[contact.phone, contact.email, contact.location, contact.website, contact.linkedin, contact.github]
            .filter(Boolean)
            .map((item) => (
              <p
                key={item}
                data-resume-break-block="contact-item"
                {...blockProps(resume, "meta", selectedDesignBlock, selectedDesignTargetKey, interactiveDesignPreview, {
                  targetKey: designTargetKey("sidebar", "contact", item),
                  label: "Contact detail",
                })}
              >
                {resumeLinkLabel(item)}
              </p>
            ))}
        </div>
      </SidebarSection>
    ),
    summary: summary ? (
      <SidebarSection
        resume={resume}
        title="Profile"
        selectedDesignBlock={selectedDesignBlock}
        selectedDesignTargetKey={selectedDesignTargetKey}
        interactiveDesignPreview={interactiveDesignPreview}
        targetPrefix="sidebar:summary"
      >
        <p
          className="leading-7 text-slate-700"
          {...blockProps(resume, "body", selectedDesignBlock, selectedDesignTargetKey, interactiveDesignPreview, {
            targetKey: "sidebar:summary:body",
            label: "Profile summary",
          })}
        >
          {summary}
        </p>
      </SidebarSection>
    ) : null,
    experience: experience.length ? (
      <SidebarSection
        resume={resume}
        title="Work Experience"
        selectedDesignBlock={selectedDesignBlock}
        selectedDesignTargetKey={selectedDesignTargetKey}
        interactiveDesignPreview={interactiveDesignPreview}
        targetPrefix="sidebar:experience"
      >
        <div className="space-y-5">
          {experience.map((item) => {
            const bullets = toVisibleItems(item.bullets);
            if (!item.role && !item.company && !bullets.length) {
              return null;
            }

            return (
              <div key={item.id} className="break-inside-avoid" data-resume-break-block="experience-item">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[18px] font-bold text-slate-800">{item.role || "Role title"}</p>
                    <p className="font-semibold text-slate-600">{item.company}</p>
                  </div>
                  <p
                    className="text-right text-[12px] font-semibold uppercase tracking-[0.18em] text-slate-400"
                    {...blockProps(resume, "meta", selectedDesignBlock, selectedDesignTargetKey, interactiveDesignPreview, {
                      targetKey: designTargetKey("sidebar", "experience", item.id, "date"),
                      label: `${item.role || "Experience"} date`,
                    })}
                  >
                    {formatResumeDateRange(item)}
                  </p>
                </div>
                {item.location ? (
                  <p
                    className="mt-1 text-[12px] text-slate-500"
                    {...blockProps(resume, "meta", selectedDesignBlock, selectedDesignTargetKey, interactiveDesignPreview, {
                      targetKey: designTargetKey("sidebar", "experience", item.id, "location"),
                      label: `${item.role || "Experience"} location`,
                    })}
                  >
                    {item.location}
                  </p>
                ) : null}
                {bullets.length ? (
                  <ul className="mt-3 list-disc space-y-1.5 pl-5">
                    {renderRichLines(
                      bullets,
                      resume,
                      selectedDesignBlock,
                      selectedDesignTargetKey,
                      designTargetKey("sidebar", "experience", item.id, "bullet"),
                      `${item.role || "Experience"} bullet`,
                      interactiveDesignPreview
                    )}
                  </ul>
                ) : null}
              </div>
            );
          })}
        </div>
      </SidebarSection>
    ) : null,
    projects: projects.length ? (
      <SidebarSection
        resume={resume}
        title="Projects"
        selectedDesignBlock={selectedDesignBlock}
        selectedDesignTargetKey={selectedDesignTargetKey}
        interactiveDesignPreview={interactiveDesignPreview}
        targetPrefix="sidebar:projects"
      >
        <div className="space-y-4">
          {projects.map((item) => {
            const bullets = toVisibleItems(item.bullets);
            if (!item.name && !bullets.length) {
              return null;
            }

            return (
              <div key={item.id} className="break-inside-avoid" data-resume-break-block="project-item">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[16px] font-bold text-slate-800">{item.name || "Project name"}</p>
                    <p className="font-semibold text-slate-600">{item.role}</p>
                  </div>
                  {item.link ? (
                    <a
                      href={normalizeUrl(item.link)}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[12px] font-semibold underline"
                      style={{ color: primaryColor }}
                      {...blockProps(resume, "meta", selectedDesignBlock, selectedDesignTargetKey, interactiveDesignPreview, {
                        includeColor: false,
                        targetKey: designTargetKey("sidebar", "project", item.id, "link"),
                        label: `${item.name || "Project"} link`,
                      })}
                    >
                      {resumeLinkLabel(item.link)}
                    </a>
                  ) : null}
                </div>
                {bullets.length ? (
                  <ul className="mt-2 list-disc space-y-1.5 pl-5">
                    {renderRichLines(
                      bullets,
                      resume,
                      selectedDesignBlock,
                      selectedDesignTargetKey,
                      designTargetKey("sidebar", "project", item.id, "bullet"),
                      `${item.name || "Project"} bullet`,
                      interactiveDesignPreview
                    )}
                  </ul>
                ) : null}
              </div>
            );
          })}
        </div>
      </SidebarSection>
    ) : null,
    education: (
      <SidebarSection
        resume={resume}
        title="Education"
        selectedDesignBlock={selectedDesignBlock}
        selectedDesignTargetKey={selectedDesignTargetKey}
        interactiveDesignPreview={interactiveDesignPreview}
        targetPrefix="sidebar:education"
      >
        <div className="space-y-4">
          {education.map((item) =>
            item.degree || item.institution ? (
              <div key={item.id} className="break-inside-avoid" data-resume-break-block="education-item">
                <p className="font-bold" style={{ color: panelHeadingColor }}>{item.degree || "Degree"}</p>
                <p
                  className="mt-1"
                  {...blockProps(resume, "body", selectedDesignBlock, selectedDesignTargetKey, interactiveDesignPreview, {
                    targetKey: designTargetKey("sidebar", "education", item.id, "institution"),
                    label: `${item.degree || "Education"} institution`,
                  })}
                >
                  {item.institution}
                </p>
                <p
                  className="mt-1 text-[12px] text-slate-500"
                  {...blockProps(resume, "meta", selectedDesignBlock, selectedDesignTargetKey, interactiveDesignPreview, {
                    targetKey: designTargetKey("sidebar", "education", item.id, "date"),
                    label: `${item.degree || "Education"} date`,
                  })}
                >
                  {formatResumeDateRange(item)}
                </p>
                {item.score ? (
                  <p
                    className="mt-1 text-[12px]"
                    {...blockProps(resume, "meta", selectedDesignBlock, selectedDesignTargetKey, interactiveDesignPreview, {
                      targetKey: designTargetKey("sidebar", "education", item.id, "score"),
                      label: `${item.degree || "Education"} score`,
                    })}
                  >
                    {item.score}
                  </p>
                ) : null}
              </div>
            ) : null
          )}
        </div>
      </SidebarSection>
    ),
    skills: (
      <SidebarSection
        resume={resume}
        title="Skills"
        selectedDesignBlock={selectedDesignBlock}
        selectedDesignTargetKey={selectedDesignTargetKey}
        interactiveDesignPreview={interactiveDesignPreview}
        targetPrefix="sidebar:skills"
      >
        <div className="space-y-3">
          {skillGroups.map((group) =>
            toVisibleItems(group.items).length ? (
              <div key={group.id} className="break-inside-avoid" data-resume-break-block="skills-group">
                <p className="font-bold" style={{ color: panelHeadingColor }}>{group.title}</p>
                <ul className="mt-1 list-disc pl-5">
                  {renderRichLines(
                    group.items,
                    resume,
                    selectedDesignBlock,
                    selectedDesignTargetKey,
                    designTargetKey("sidebar", "skills", group.id, "item"),
                    `${group.title || "Skills"} item`,
                    interactiveDesignPreview
                  )}
                </ul>
              </div>
            ) : null
          )}
        </div>
      </SidebarSection>
    ),
    achievements: achievements.length ? (
      <SidebarSection
        resume={resume}
        title="Achievements"
        selectedDesignBlock={selectedDesignBlock}
        selectedDesignTargetKey={selectedDesignTargetKey}
        interactiveDesignPreview={interactiveDesignPreview}
        targetPrefix="sidebar:achievements"
      >
        <ul className="list-disc space-y-2 pl-5">
          {achievements.map((item) =>
            item.title || item.detail ? (
              <li
                key={item.id}
                className="break-inside-avoid"
                data-resume-break-block="achievement-item"
                {...blockProps(resume, "body", selectedDesignBlock, selectedDesignTargetKey, interactiveDesignPreview, {
                  targetKey: designTargetKey("sidebar", "achievement", item.id, "body"),
                  label: `${item.title || "Achievement"} line`,
                })}
              >
                <span className="font-bold text-slate-800">{item.title}</span>
                {item.detail ? `: ${item.detail}` : ""}
              </li>
            ) : null
          )}
        </ul>
      </SidebarSection>
    ) : null,
    languages: languages.length ? (
      <SidebarSection
        resume={resume}
        title="Languages"
        selectedDesignBlock={selectedDesignBlock}
        selectedDesignTargetKey={selectedDesignTargetKey}
        interactiveDesignPreview={interactiveDesignPreview}
        targetPrefix="sidebar:languages"
      >
        <ul className="list-disc pl-5">
          {renderRichLines(
            languages,
            resume,
            selectedDesignBlock,
            selectedDesignTargetKey,
            "sidebar:languages:item",
            "Language",
            interactiveDesignPreview
          )}
        </ul>
      </SidebarSection>
    ) : null,
    certifications: certifications.length ? (
      <SidebarSection
        resume={resume}
        title="Certifications"
        selectedDesignBlock={selectedDesignBlock}
        selectedDesignTargetKey={selectedDesignTargetKey}
        interactiveDesignPreview={interactiveDesignPreview}
        targetPrefix="sidebar:certifications"
      >
        <div className="space-y-2">
          {certifications.map((item) =>
            item.title || item.issuer ? (
              <p
                key={item.id}
                className="break-inside-avoid"
                data-resume-break-block="certification-item"
                {...blockProps(resume, "body", selectedDesignBlock, selectedDesignTargetKey, interactiveDesignPreview, {
                  targetKey: designTargetKey("sidebar", "certification", item.id, "body"),
                  label: `${item.title || "Certification"} line`,
                })}
              >
                <span className="font-bold text-slate-800">{item.title}</span>
                {item.issuer ? ` • ${item.issuer}` : ""}
                {item.year ? ` • ${item.year}` : ""}
              </p>
            ) : null
          )}
        </div>
      </SidebarSection>
    ) : null,
    interests: interests.length ? (
      <SidebarSection
        resume={resume}
        title="Interests"
        selectedDesignBlock={selectedDesignBlock}
        selectedDesignTargetKey={selectedDesignTargetKey}
        interactiveDesignPreview={interactiveDesignPreview}
        targetPrefix="sidebar:interests"
      >
        <ul className="list-disc pl-5">
          {renderRichLines(
            interests,
            resume,
            selectedDesignBlock,
            selectedDesignTargetKey,
            "sidebar:interests:item",
            "Interest",
            interactiveDesignPreview
          )}
        </ul>
      </SidebarSection>
    ) : null,
    references: references.length ? (
      <SidebarSection
        resume={resume}
        title="References"
        selectedDesignBlock={selectedDesignBlock}
        selectedDesignTargetKey={selectedDesignTargetKey}
        interactiveDesignPreview={interactiveDesignPreview}
        targetPrefix="sidebar:references"
      >
        <div className="grid gap-4 md:grid-cols-2">
          {references.map((item) =>
            item.name || item.email ? (
              <div key={item.id} className="break-inside-avoid rounded-2xl border border-slate-200 px-4 py-3" data-resume-break-block="reference-item">
                <p className="font-bold text-slate-800">{item.name || "Reference"}</p>
                <p
                  className="mt-1"
                  {...blockProps(resume, "body", selectedDesignBlock, selectedDesignTargetKey, interactiveDesignPreview, {
                    targetKey: designTargetKey("sidebar", "reference", item.id, "body"),
                    label: `${item.name || "Reference"} description`,
                  })}
                >
                  {[item.role, item.company].filter(Boolean).join(" • ")}
                </p>
                {item.phone ? (
                  <p
                    className="mt-1 text-[12px]"
                    {...blockProps(resume, "meta", selectedDesignBlock, selectedDesignTargetKey, interactiveDesignPreview, {
                      targetKey: designTargetKey("sidebar", "reference", item.id, "phone"),
                      label: `${item.name || "Reference"} phone`,
                    })}
                  >
                    {item.phone}
                  </p>
                ) : null}
                {item.email ? (
                  <p
                    className="mt-1 text-[12px]"
                    {...blockProps(resume, "meta", selectedDesignBlock, selectedDesignTargetKey, interactiveDesignPreview, {
                      targetKey: designTargetKey("sidebar", "reference", item.id, "email"),
                      label: `${item.name || "Reference"} email`,
                    })}
                  >
                    {item.email}
                  </p>
                ) : null}
              </div>
            ) : null
          )}
        </div>
      </SidebarSection>
    ) : null,
  };

  return (
    <article
      className="grid min-h-full grid-cols-[230px_minmax(0,1fr)] bg-white font-[Manrope] text-[13px] text-slate-700"
      data-design-block={rootBodyProps["data-design-block"]}
      style={{
        backgroundColor: pageBackground,
        ...(rootBodyProps.style as CSSProperties),
      }}
    >
      <aside className="px-8 py-10" style={{ backgroundColor: panelTint }}>
        <div className="rounded-[24px] bg-white px-4 py-5 text-center shadow-sm" data-resume-break-block="sidebar-header">
          {contact.photoUrl ? (
            <img
              src={contact.photoUrl}
              alt={contact.fullName || "Resume portrait"}
              className="mx-auto h-28 w-28 rounded-full object-cover"
            />
          ) : (
            <div className="mx-auto flex h-28 w-28 items-center justify-center rounded-full bg-slate-300 text-3xl font-bold text-white">
              {(contact.fullName || "SS").slice(0, 2).toUpperCase()}
            </div>
          )}
          <p
            className="mt-4 text-lg font-bold tracking-tight text-slate-800"
            {...blockProps(resume, "name", selectedDesignBlock, interactiveDesignPreview)}
          >
            {contact.fullName || "Your Name"}
          </p>
          {contact.role ? (
            <p
              className="mt-1 text-[12px] font-semibold uppercase tracking-[0.3em] text-slate-500"
              {...blockProps(resume, "role", selectedDesignBlock, interactiveDesignPreview)}
            >
              {contact.role}
            </p>
          ) : null}
        </div>

        {renderOrderedSections(sidebarSections.left, sectionContent, "sidebar-left")}
      </aside>

      <div className="px-10 py-10">
        {renderOrderedSections(sidebarSections.right, sectionContent, "sidebar-right")}
      </div>
    </article>
  );
}

function ExecutiveDarkTemplate({
  resume,
  selectedDesignBlock = null,
  selectedDesignTargetKey = null,
  interactiveDesignPreview,
}: ResumeTemplateRendererProps) {
  const {
    contact,
    summary,
    experience,
    education,
    projects,
    skillGroups,
    achievements,
    certifications,
    languages,
    interests,
    references,
  } = resume.content;
  const { pageBackground, primaryColor, panelColor } = resume.content.design.theme;
  const headerTextColor = contrastText(panelColor);
  const metaTextColor = headerTextColor === "#f8fafc" ? "rgba(241,245,249,0.88)" : "rgba(15,23,42,0.8)";
  const rootBodyProps = blockProps(resume, "body", selectedDesignBlock, interactiveDesignPreview, {
    includePadding: false,
  });
  const executiveColumns = resume.content.design.layout.executiveColumns;
  const executiveSections: Record<ResumeExecutiveSectionKey, ReactNode> = {
    experience: experience.length ? (
      <ExecutiveSection
        key="experience"
        resume={resume}
        title="Work Experience"
        selectedDesignBlock={selectedDesignBlock}
        selectedDesignTargetKey={selectedDesignTargetKey}
        interactiveDesignPreview={interactiveDesignPreview}
        targetPrefix="executive:experience"
      >
        <div className="space-y-5">
          {experience.map((item) => {
            const bullets = toVisibleItems(item.bullets);
            if (!item.role && !item.company && !bullets.length) {
              return null;
            }

            return (
              <div key={item.id} className="break-inside-avoid" data-resume-break-block="experience-item">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[20px] font-bold text-slate-900">{item.role || "Role title"}</p>
                    <p className="text-[15px] font-semibold italic text-slate-600">
                      {[item.company, item.location].filter(Boolean).join(" - ")}
                    </p>
                  </div>
                  <p
                    className="text-right text-[13px] text-slate-500"
                    {...blockProps(resume, "meta", selectedDesignBlock, selectedDesignTargetKey, interactiveDesignPreview, {
                      targetKey: designTargetKey("executive", "experience", item.id, "date"),
                      label: `${item.role || "Experience"} date`,
                    })}
                  >
                    {formatResumeDateRange(item)}
                  </p>
                </div>
                {bullets.length ? (
                  <ul className="mt-3 list-disc space-y-1.5 pl-5">
                    {renderRichLines(
                      bullets,
                      resume,
                      selectedDesignBlock,
                      selectedDesignTargetKey,
                      designTargetKey("executive", "experience", item.id, "bullet"),
                      `${item.role || "Experience"} bullet`,
                      interactiveDesignPreview
                    )}
                  </ul>
                ) : null}
              </div>
            );
          })}
        </div>
      </ExecutiveSection>
    ) : null,
    projects: projects.length ? (
      <ExecutiveSection
        key="projects"
        resume={resume}
        title="Projects"
        selectedDesignBlock={selectedDesignBlock}
        selectedDesignTargetKey={selectedDesignTargetKey}
        interactiveDesignPreview={interactiveDesignPreview}
        targetPrefix="executive:projects"
      >
        <div className="space-y-4">
          {projects.map((item) =>
            item.name || toVisibleItems(item.bullets).length ? (
              <div key={item.id} className="break-inside-avoid" data-resume-break-block="project-item">
                <p className="text-[18px] font-bold text-slate-900">{item.name || "Project name"}</p>
                <p className="mt-1 italic text-slate-600">{item.role}</p>
                {item.link ? (
                  <a
                    href={normalizeUrl(item.link)}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-1 inline-block text-[13px] font-semibold underline"
                    style={{ color: primaryColor }}
                    {...blockProps(resume, "meta", selectedDesignBlock, selectedDesignTargetKey, interactiveDesignPreview, {
                      includeColor: false,
                      targetKey: designTargetKey("executive", "project", item.id, "link"),
                      label: `${item.name || "Project"} link`,
                    })}
                  >
                    {resumeLinkLabel(item.link)}
                  </a>
                ) : null}
                {toVisibleItems(item.bullets).length ? (
                  <ul className="mt-2 list-disc space-y-1.5 pl-5">
                    {renderRichLines(
                      item.bullets,
                      resume,
                      selectedDesignBlock,
                      selectedDesignTargetKey,
                      designTargetKey("executive", "project", item.id, "bullet"),
                      `${item.name || "Project"} bullet`,
                      interactiveDesignPreview
                    )}
                  </ul>
                ) : null}
              </div>
            ) : null
          )}
        </div>
      </ExecutiveSection>
    ) : null,
    education: education.length ? (
      <ExecutiveSection
        key="education"
        resume={resume}
        title="Education"
        selectedDesignBlock={selectedDesignBlock}
        selectedDesignTargetKey={selectedDesignTargetKey}
        interactiveDesignPreview={interactiveDesignPreview}
        targetPrefix="executive:education"
      >
        <div className="space-y-4">
          {education.map((item) =>
            item.degree || item.institution ? (
              <div key={item.id} className="break-inside-avoid" data-resume-break-block="education-item">
                <p className="text-[18px] font-bold text-slate-900">{item.degree || "Degree"}</p>
                <p className="italic text-slate-600">{[item.institution, item.location].filter(Boolean).join(" - ")}</p>
                <p
                  className="mt-1 text-[13px] text-slate-500"
                  {...blockProps(resume, "meta", selectedDesignBlock, selectedDesignTargetKey, interactiveDesignPreview, {
                    targetKey: designTargetKey("executive", "education", item.id, "date"),
                    label: `${item.degree || "Education"} date`,
                  })}
                >
                  {formatResumeDateRange(item)}
                </p>
                {[item.score, item.details].filter(Boolean).length ? (
                  <p
                    className="mt-2 leading-6"
                    {...blockProps(resume, "body", selectedDesignBlock, selectedDesignTargetKey, interactiveDesignPreview, {
                      targetKey: designTargetKey("executive", "education", item.id, "body"),
                      label: `${item.degree || "Education"} description`,
                    })}
                  >
                    {[item.score, item.details].filter(Boolean).join(" • ")}
                  </p>
                ) : null}
              </div>
            ) : null
          )}
        </div>
      </ExecutiveSection>
    ) : null,
    skills: skillGroups.length ? (
      <ExecutiveSection
        key="skills"
        resume={resume}
        title="Skills"
        selectedDesignBlock={selectedDesignBlock}
        selectedDesignTargetKey={selectedDesignTargetKey}
        interactiveDesignPreview={interactiveDesignPreview}
        targetPrefix="executive:skills"
      >
        <div className="space-y-4">
          {skillGroups.map((group) =>
            toVisibleItems(group.items).length ? (
              <div key={group.id} className="break-inside-avoid" data-resume-break-block="skills-group">
                <p className="font-bold text-slate-900">{group.title}</p>
                <ul className="mt-2 list-disc space-y-1.5 pl-5">
                  {renderRichLines(
                    group.items,
                    resume,
                    selectedDesignBlock,
                    selectedDesignTargetKey,
                    designTargetKey("executive", "skills", group.id, "item"),
                    `${group.title || "Skills"} item`,
                    interactiveDesignPreview
                  )}
                </ul>
              </div>
            ) : null
          )}
        </div>
      </ExecutiveSection>
    ) : null,
    achievements: achievements.length ? (
      <ExecutiveSection
        key="achievements"
        resume={resume}
        title="Achievements"
        selectedDesignBlock={selectedDesignBlock}
        selectedDesignTargetKey={selectedDesignTargetKey}
        interactiveDesignPreview={interactiveDesignPreview}
        targetPrefix="executive:achievements"
      >
        <ul className="list-disc space-y-2 pl-5">
          {achievements.map((item) =>
            item.title || item.detail ? (
              <li
                key={item.id}
                className="break-inside-avoid"
                data-resume-break-block="achievement-item"
                {...blockProps(resume, "body", selectedDesignBlock, selectedDesignTargetKey, interactiveDesignPreview, {
                  targetKey: designTargetKey("executive", "achievement", item.id, "body"),
                  label: `${item.title || "Achievement"} line`,
                })}
              >
                <span className="font-bold text-slate-900">{item.title}</span>
                {item.detail ? `: ${item.detail}` : ""}
              </li>
            ) : null
          )}
        </ul>
      </ExecutiveSection>
    ) : null,
    languages: languages.length ? (
      <ExecutiveSection
        key="languages"
        resume={resume}
        title="Languages"
        selectedDesignBlock={selectedDesignBlock}
        selectedDesignTargetKey={selectedDesignTargetKey}
        interactiveDesignPreview={interactiveDesignPreview}
        targetPrefix="executive:languages"
      >
        <ul className="list-disc space-y-1.5 pl-5">
          {renderRichLines(
            languages,
            resume,
            selectedDesignBlock,
            selectedDesignTargetKey,
            "executive:languages:item",
            "Language",
            interactiveDesignPreview
          )}
        </ul>
      </ExecutiveSection>
    ) : null,
    certifications: certifications.length ? (
      <ExecutiveSection
        key="certifications"
        resume={resume}
        title="Certifications"
        selectedDesignBlock={selectedDesignBlock}
        selectedDesignTargetKey={selectedDesignTargetKey}
        interactiveDesignPreview={interactiveDesignPreview}
        targetPrefix="executive:certifications"
      >
        <ul className="list-disc space-y-1.5 pl-5">
          {certifications.map((item) =>
            item.title || item.issuer ? (
              <li
                key={item.id}
                className="break-inside-avoid"
                data-resume-break-block="certification-item"
                {...blockProps(resume, "body", selectedDesignBlock, selectedDesignTargetKey, interactiveDesignPreview, {
                  targetKey: designTargetKey("executive", "certification", item.id, "body"),
                  label: `${item.title || "Certification"} line`,
                })}
              >
                <span className="font-bold text-slate-900">{item.title}</span>
                {item.issuer ? ` • ${item.issuer}` : ""}
                {item.year ? ` • ${item.year}` : ""}
              </li>
            ) : null
          )}
        </ul>
      </ExecutiveSection>
    ) : null,
    interests: interests.length ? (
      <ExecutiveSection
        key="interests"
        resume={resume}
        title="Interests"
        selectedDesignBlock={selectedDesignBlock}
        selectedDesignTargetKey={selectedDesignTargetKey}
        interactiveDesignPreview={interactiveDesignPreview}
        targetPrefix="executive:interests"
      >
        <ul className="list-disc space-y-1.5 pl-5">
          {renderRichLines(
            interests,
            resume,
            selectedDesignBlock,
            selectedDesignTargetKey,
            "executive:interests:item",
            "Interest",
            interactiveDesignPreview
          )}
        </ul>
      </ExecutiveSection>
    ) : null,
    references: references.length ? (
      <ExecutiveSection
        key="references"
        resume={resume}
        title="References"
        selectedDesignBlock={selectedDesignBlock}
        selectedDesignTargetKey={selectedDesignTargetKey}
        interactiveDesignPreview={interactiveDesignPreview}
        targetPrefix="executive:references"
      >
        <div className="grid gap-4">
          {references.map((item) =>
            item.name || item.email ? (
              <div
                key={item.id}
                className="break-inside-avoid rounded-2xl border border-slate-200 px-4 py-3"
                data-resume-break-block="reference-item"
              >
                <p className="font-bold text-slate-900">{item.name || "Reference"}</p>
                <p
                  className="mt-1"
                  {...blockProps(resume, "body", selectedDesignBlock, selectedDesignTargetKey, interactiveDesignPreview, {
                    targetKey: designTargetKey("executive", "reference", item.id, "body"),
                    label: `${item.name || "Reference"} description`,
                  })}
                >
                  {[item.role, item.company].filter(Boolean).join(" • ")}
                </p>
                {item.phone ? (
                  <p
                    className="mt-1 text-[12px]"
                    {...blockProps(resume, "meta", selectedDesignBlock, selectedDesignTargetKey, interactiveDesignPreview, {
                      targetKey: designTargetKey("executive", "reference", item.id, "phone"),
                      label: `${item.name || "Reference"} phone`,
                    })}
                  >
                    {item.phone}
                  </p>
                ) : null}
                {item.email ? (
                  <p
                    className="mt-1 text-[12px]"
                    {...blockProps(resume, "meta", selectedDesignBlock, selectedDesignTargetKey, interactiveDesignPreview, {
                      targetKey: designTargetKey("executive", "reference", item.id, "email"),
                      label: `${item.name || "Reference"} email`,
                    })}
                  >
                    {item.email}
                  </p>
                ) : null}
              </div>
            ) : null
          )}
        </div>
      </ExecutiveSection>
    ) : null,
  };

  return (
    <article
      className="min-h-full bg-white font-[Manrope] text-[14px] text-slate-700"
      data-design-block={rootBodyProps["data-design-block"]}
      style={{
        backgroundColor: pageBackground,
        ...(rootBodyProps.style as CSSProperties),
      }}
    >
      <header
        className="px-14 py-12"
        data-resume-break-block="executive-header"
        style={{ backgroundColor: panelColor, color: headerTextColor }}
      >
        <div className="flex items-start gap-8">
          {contact.photoUrl ? (
            <img
              src={contact.photoUrl}
              alt={contact.fullName || "Resume portrait"}
              className="h-36 w-36 rounded-full border-4 object-cover"
              style={{ borderColor: withAlpha(headerTextColor, 0.88) }}
            />
          ) : (
            <div
              className="flex h-36 w-36 items-center justify-center rounded-full border-4 text-5xl font-bold"
              style={{
                borderColor: withAlpha(headerTextColor, 0.88),
                backgroundColor: withAlpha(headerTextColor, 0.14),
                color: headerTextColor,
              }}
            >
              {(contact.fullName || "SS").slice(0, 2).toUpperCase()}
            </div>
          )}

          <div className="min-w-0 flex-1">
            <h1
              className="font-[Space_Grotesk] text-[42px] font-bold tracking-tight"
              style={{ color: headerTextColor }}
              {...blockProps(resume, "name", selectedDesignBlock, interactiveDesignPreview, {
                includeColor: false,
              })}
            >
              {contact.fullName || "Your Name"}
            </h1>
            {contact.role ? (
              <p
                className="mt-2 text-[22px] font-semibold"
                style={{ color: primaryColor }}
                {...blockProps(resume, "role", selectedDesignBlock, interactiveDesignPreview, {
                  includeColor: false,
                })}
              >
                {contact.role}
              </p>
            ) : null}
            {summary ? (
              <p
                className="mt-5 max-w-[520px] leading-7"
                style={{ color: metaTextColor }}
                {...blockProps(resume, "body", selectedDesignBlock, interactiveDesignPreview, {
                  targetKey: "executive:summary:body",
                  includeColor: false,
                  label: "Executive summary",
                })}
              >
                {summary}
              </p>
            ) : null}
          </div>
        </div>

        <div
          className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-2 border-t pt-4 text-[13px] font-semibold"
          style={{
            borderColor: withAlpha(headerTextColor, 0.24),
            color: metaTextColor,
          }}
          {...blockProps(resume, "meta", selectedDesignBlock, interactiveDesignPreview, {
            includeColor: false,
            targetKey: "executive:header:meta",
            label: "Header contact line",
          })}
        >
          {[contact.phone, contact.email, contact.linkedin, contact.location, contact.website]
            .filter(Boolean)
            .map((item) => (
              <span key={item}>{resumeLinkLabel(item)}</span>
            ))}
        </div>
      </header>

      <div className="grid grid-cols-[1.25fr_0.95fr] gap-10 px-14 py-10">
        <div className="space-y-8">
          {renderOrderedSections(executiveColumns.left, executiveSections, "executive-left")}
        </div>

        <div className="space-y-8">
          {renderOrderedSections(executiveColumns.right, executiveSections, "executive-right")}
        </div>
      </div>
    </article>
  );
}

export function ResumeTemplateRenderer(props: ResumeTemplateRendererProps) {
  const { resume } = props;

  if (resume.template_key === "sidebar_professional") {
    return <SidebarProfessionalTemplate {...props} />;
  }

  if (resume.template_key === "executive_dark") {
    return <ExecutiveDarkTemplate {...props} />;
  }

  return <AtsClassicTemplate {...props} />;
}
