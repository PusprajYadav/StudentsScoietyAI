import { Code2, Eye, Plus, Save, Share2, Trash2 } from "lucide-react";
import { useDeferredValue, useEffect, useMemo, useState } from "react";
import type { BulkMailerTemplateRow } from "../../../types/database";
import { extractBulkMailerVariables } from "../helpers";
import { BulkMailerVariableChips } from "./BulkMailerVariableChips";
import type { BulkMailerTemplateWithOwner } from "../types";

interface BulkMailerTemplateEditorProps {
  templates: BulkMailerTemplateWithOwner[];
  draft: Partial<BulkMailerTemplateRow>;
  allowShared: boolean;
  saving?: boolean;
  deletingId?: string | null;
  onDraftChange: (updates: Partial<BulkMailerTemplateRow>) => void;
  onNew: () => void;
  onSelect: (template: BulkMailerTemplateWithOwner) => void;
  onSave: () => Promise<void>;
  onDelete: (template: BulkMailerTemplateWithOwner) => Promise<void>;
}

export function BulkMailerTemplateEditor({
  templates,
  draft,
  allowShared,
  saving = false,
  deletingId = null,
  onDraftChange,
  onNew,
  onSelect,
  onSave,
  onDelete,
}: BulkMailerTemplateEditorProps) {
  const [focusedField, setFocusedField] = useState<"subject" | "body_html">("body_html");
  const [sampleVariablesText, setSampleVariablesText] = useState("{}");
  const [nameInput, setNameInput] = useState(draft.name || "");
  const [categoryInput, setCategoryInput] = useState(draft.category || "");
  const [descriptionInput, setDescriptionInput] = useState(draft.description || "");
  const [subjectInput, setSubjectInput] = useState(draft.subject || "");
  const [bodyHtmlInput, setBodyHtmlInput] = useState(draft.body_html || "");
  const [showTemplateLibraryMobile, setShowTemplateLibraryMobile] = useState(false);
  const [showTemplateSupportMobile, setShowTemplateSupportMobile] = useState(false);

  useEffect(() => {
    try {
      setSampleVariablesText(JSON.stringify(draft.sample_variables || {}, null, 2));
    } catch {
      setSampleVariablesText("{}");
    }
  }, [draft.id, draft.sample_variables]);

  useEffect(() => {
    setNameInput(draft.name || "");
    setCategoryInput(draft.category || "");
    setDescriptionInput(draft.description || "");
    setSubjectInput(draft.subject || "");
    setBodyHtmlInput(draft.body_html || "");
  }, [
    draft.id,
    draft.name,
    draft.category,
    draft.description,
    draft.subject,
    draft.body_html,
  ]);

  const deferredSubjectInput = useDeferredValue(subjectInput);
  const deferredBodyHtmlInput = useDeferredValue(bodyHtmlInput);
  const immediateVariables = useMemo(
    () => extractBulkMailerVariables({ subject: subjectInput, bodyHtml: bodyHtmlInput }),
    [bodyHtmlInput, subjectInput]
  );
  const variables = useMemo(
    () =>
      extractBulkMailerVariables({
        subject: deferredSubjectInput,
        bodyHtml: deferredBodyHtmlInput,
      }),
    [deferredBodyHtmlInput, deferredSubjectInput]
  );

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      onDraftChange({
        name: nameInput,
        category: categoryInput,
        description: descriptionInput,
        subject: subjectInput,
        body_html: bodyHtmlInput,
        available_variables: immediateVariables,
      });
    }, 140);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [
    bodyHtmlInput,
    categoryInput,
    descriptionInput,
    immediateVariables,
    nameInput,
    onDraftChange,
    subjectInput,
  ]);

  const handleSampleVariablesBlur = () => {
    try {
      const parsed = JSON.parse(sampleVariablesText) as Record<string, unknown>;
      onDraftChange({ sample_variables: parsed });
    } catch {
      setSampleVariablesText(JSON.stringify(draft.sample_variables || {}, null, 2));
    }
  };

  const insertVariable = (token: string) => {
    if (focusedField === "subject") {
      setSubjectInput((currentValue) => `${currentValue}${currentValue ? " " : ""}${token}`);
      return;
    }

    setBodyHtmlInput((currentValue) => `${currentValue}${currentValue ? " " : ""}${token}`);
  };

  const syncDraftNow = () => {
    onDraftChange({
      name: nameInput,
      category: categoryInput,
      description: descriptionInput,
      subject: subjectInput,
      body_html: bodyHtmlInput,
      available_variables: immediateVariables,
    });
  };

  return (
    <section className="grid gap-5 lg:grid-cols-[300px_minmax(0,1fr)] xl:grid-cols-[320px_minmax(0,1fr)]">
      <div className="flex flex-wrap gap-2 lg:hidden">
        <button
          type="button"
          onClick={() => setShowTemplateLibraryMobile((current) => !current)}
          className="inline-flex items-center gap-2 rounded-full border border-app-border bg-app-card px-4 py-2 text-xs font-semibold text-app-text shadow-sm"
        >
          <Plus className="h-3.5 w-3.5" />
          {showTemplateLibraryMobile ? "Hide Library" : `Show Library (${templates.length})`}
        </button>
        <button
          type="button"
          onClick={() => setShowTemplateSupportMobile((current) => !current)}
          className="inline-flex items-center gap-2 rounded-full border border-app-border bg-app-card px-4 py-2 text-xs font-semibold text-app-text shadow-sm"
        >
          <Eye className="h-3.5 w-3.5" />
          {showTemplateSupportMobile ? "Hide Preview" : "Show Preview"}
        </button>
      </div>

      <aside
        className={`overflow-hidden rounded-[30px] border border-app-border/80 bg-app-card/95 p-[1px] shadow-[0_22px_54px_-36px_rgba(15,23,42,0.32)] ${
          showTemplateLibraryMobile ? "block" : "hidden"
        } lg:block`}
      >
        <div className="rounded-[29px] bg-app-card/95 p-4 backdrop-blur sm:p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-app-muted">Templates</p>
              <p className="mt-1 font-display text-2xl font-semibold tracking-tight text-app-text">Library</p>
            </div>

            <button
              type="button"
              onClick={onNew}
              className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[#2563eb] to-[#14b8a6] px-4 py-2 text-xs font-semibold text-white shadow-[0_14px_24px_-18px_rgba(37,99,235,0.72)]"
            >
              <Plus className="h-3.5 w-3.5" />
              New
            </button>
          </div>

          <div className="mt-4 space-y-3">
            {templates.length === 0 ? (
              <div className="rounded-[24px] border border-dashed border-app-border bg-app-secondary/40 px-4 py-5 text-sm text-app-muted">
                No templates yet.
              </div>
            ) : null}

            {templates.map((template) => {
              const selected = template.id === draft.id;

              return (
                <button
                  key={template.id}
                  type="button"
                  onClick={() => onSelect(template)}
                  className={`w-full rounded-[22px] border p-4 text-left transition ${
                    selected
                      ? "border-brand/25 bg-brand/10 shadow-[0_18px_34px_-26px_rgba(37,99,235,0.45)]"
                      : "border-app-border bg-app-card hover:border-brand/20 hover:bg-brand/5"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-app-text">{template.name}</p>
                      <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-app-muted">
                        {template.category}
                      </p>
                    </div>

                    {template.is_shared ? (
                      <span className="rounded-full bg-brand/10 px-2.5 py-1 text-[10px] font-semibold text-brand">
                        Shared
                      </span>
                    ) : null}
                  </div>

                  <p className="mt-3 line-clamp-2 text-sm text-app-muted">{template.subject}</p>
                  <p className="mt-2 text-xs text-app-muted">
                    {template.owner?.full_name || template.owner?.username || "Unknown"}
                  </p>
                </button>
              );
            })}
          </div>
        </div>
      </aside>

      <div className="space-y-5">
        <section className="overflow-hidden rounded-[30px] border border-app-border/80 bg-app-card/95 p-[1px] shadow-[0_24px_54px_-36px_rgba(15,23,42,0.34)]">
          <div className="rounded-[29px] bg-app-card/95 p-4 backdrop-blur sm:p-5">
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="grid gap-2">
                <span className="text-xs font-semibold uppercase tracking-[0.16em] text-app-muted">Name</span>
                <input
                  value={nameInput}
                  onChange={(event) => setNameInput(event.target.value)}
                  className="input-shell"
                  placeholder="Admissions"
                />
              </label>

              <label className="grid gap-2">
                <span className="text-xs font-semibold uppercase tracking-[0.16em] text-app-muted">Type</span>
                <input
                  value={categoryInput}
                  onChange={(event) => setCategoryInput(event.target.value)}
                  className="input-shell"
                  placeholder="event"
                />
              </label>
            </div>

            <label className="mt-4 grid gap-2">
              <span className="text-xs font-semibold uppercase tracking-[0.16em] text-app-muted">Note</span>
              <textarea
                value={descriptionInput}
                onChange={(event) => setDescriptionInput(event.target.value)}
                rows={2}
                className="input-shell min-h-[92px]"
                placeholder="Internal note"
              />
            </label>

            {allowShared ? (
              <label className="mt-4 flex items-center justify-between gap-3 rounded-[22px] border border-app-border bg-app-secondary/35 px-4 py-3">
                <div>
                  <p className="font-semibold text-app-text">Shared</p>
                  <p className="text-xs text-app-muted">Visible to signed-in users.</p>
                </div>
                <button
                  type="button"
                  onClick={() => onDraftChange({ is_shared: !(draft.is_shared ?? false) })}
                  className={`inline-flex items-center gap-2 rounded-full px-3 py-2 text-xs font-semibold ${
                    draft.is_shared ? "bg-brand text-white" : "bg-app-card text-app-muted"
                  }`}
                >
                  <Share2 className="h-3.5 w-3.5" />
                  {draft.is_shared ? "On" : "Off"}
                </button>
              </label>
            ) : null}

            <label className="mt-4 grid gap-2">
              <span className="text-xs font-semibold uppercase tracking-[0.16em] text-app-muted">Subject</span>
              <input
                value={subjectInput}
                onFocus={() => setFocusedField("subject")}
                onChange={(event) => setSubjectInput(event.target.value)}
                className="input-shell"
                placeholder="Hello {{recipient_name}}"
              />
            </label>

            <label className="mt-4 grid gap-2">
              <span className="text-xs font-semibold uppercase tracking-[0.16em] text-app-muted">HTML</span>
              <textarea
                value={bodyHtmlInput}
                onFocus={() => setFocusedField("body_html")}
                onChange={(event) => setBodyHtmlInput(event.target.value)}
                rows={14}
                className="input-shell min-h-[280px] font-mono text-sm"
                placeholder="<p>Hello {{recipient_name}}</p>"
              />
            </label>

            <label className="mt-4 grid gap-2">
              <span className="text-xs font-semibold uppercase tracking-[0.16em] text-app-muted">JSON</span>
              <textarea
                value={sampleVariablesText}
                onChange={(event) => setSampleVariablesText(event.target.value)}
                onBlur={handleSampleVariablesBlur}
                rows={6}
                className="input-shell min-h-[148px] font-mono text-sm"
                placeholder='{"recipient_name":"Aarav"}'
              />
            </label>

            <div className="mt-5 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => {
                  syncDraftNow();
                  void onSave();
                }}
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[#2563eb] to-[#14b8a6] px-5 py-3 text-sm font-semibold text-white shadow-[0_18px_28px_-20px_rgba(37,99,235,0.72)] disabled:opacity-60"
              >
                <Save className="h-4 w-4" />
                {saving ? "Saving..." : "Save"}
              </button>

              {draft.id ? (
                <button
                  type="button"
                  onClick={() => {
                    const target = templates.find((template) => template.id === draft.id);
                    if (target) {
                      void onDelete(target);
                    }
                  }}
                  disabled={deletingId === draft.id}
                  className="inline-flex items-center gap-2 rounded-full border border-red-500/20 bg-red-500/10 px-5 py-3 text-sm font-semibold text-red-700 dark:text-red-300 disabled:opacity-60"
                >
                  <Trash2 className="h-4 w-4" />
                  {deletingId === draft.id ? "Deleting..." : "Delete"}
                </button>
              ) : null}
            </div>
          </div>
        </section>

        <section
          className={`${showTemplateSupportMobile ? "grid" : "hidden"} gap-5 lg:grid xl:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]`}
        >
          <section className="overflow-hidden rounded-[30px] border border-app-border/80 bg-app-card/95 p-[1px] shadow-[0_20px_46px_-34px_rgba(15,23,42,0.3)]">
            <div className="rounded-[29px] bg-app-card/95 p-4 backdrop-blur sm:p-5">
              <div className="flex items-center gap-2">
                <Code2 className="h-4 w-4 text-brand" />
                <p className="font-semibold text-app-text">Vars</p>
              </div>
              <p className="mt-2 text-sm text-app-muted">Tap to insert.</p>
              <div className="mt-4">
                <BulkMailerVariableChips variables={variables} onInsert={insertVariable} />
              </div>
            </div>
          </section>

          <section className="overflow-hidden rounded-[30px] border border-app-border/80 bg-app-card/95 p-[1px] shadow-[0_20px_46px_-34px_rgba(15,23,42,0.3)]">
            <div className="rounded-[29px] bg-app-card/95 p-4 backdrop-blur sm:p-5">
              <div className="flex items-center gap-2">
                <Eye className="h-4 w-4 text-brand" />
                <p className="font-semibold text-app-text">Preview</p>
              </div>
              <div className="mt-4 rounded-[24px] border border-app-border bg-app-secondary/35 px-5 py-5 text-sm text-app-text shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-app-muted">Subject</p>
                <p className="mt-2 text-base font-semibold text-app-text">{deferredSubjectInput || "Untitled"}</p>
                <div
                  className="prose prose-sm mt-5 max-w-none text-app-text dark:prose-invert prose-p:my-3 prose-a:text-brand"
                  dangerouslySetInnerHTML={{ __html: deferredBodyHtmlInput || "<p>No HTML yet.</p>" }}
                />
              </div>
            </div>
          </section>
        </section>
      </div>
    </section>
  );
}
