import { AlertTriangle, MailPlus, Paperclip, Save, Send, X } from "lucide-react";
import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import type { BulkMailerCampaignRow } from "../../../types/database";
import type { EmailConnectionRow } from "../../emails/types";
import {
  BULK_MAILER_ATTACHMENT_TOTAL_LIMIT_BYTES,
  BULK_MAILER_SYSTEM_VARIABLES,
  extractBulkMailerVariables,
  formatBulkMailerFileSize,
  getBulkMailerAutoSenderChoice,
  getBulkMailerCampaignSenderSelectionPatch,
  getBulkMailerCampaignSenderSelectValue,
  getBulkMailerAttachmentTotalSize,
  readBulkMailerAttachmentFile,
  resolveBulkMailerCampaignSenderLabel,
} from "../helpers";
import type {
  BulkMailerCampaignAttachment,
  BulkMailerEffectiveLimits,
  BulkMailerRecipientDraft,
  BulkMailerSmtpProfileSummary,
  BulkMailerTemplateWithOwner,
} from "../types";
import { BulkMailerAudienceBuilder } from "./BulkMailerAudienceBuilder";
import { BulkMailerVariableChips } from "./BulkMailerVariableChips";

interface BulkMailerCampaignComposerProps {
  templates: BulkMailerTemplateWithOwner[];
  smtpProfiles: BulkMailerSmtpProfileSummary[];
  emailConnections: EmailConnectionRow[];
  draft: Partial<BulkMailerCampaignRow>;
  recipients: BulkMailerRecipientDraft[];
  attachments: BulkMailerCampaignAttachment[];
  effectiveLimits: BulkMailerEffectiveLimits;
  saving?: boolean;
  sending?: boolean;
  onDraftChange: (updates: Partial<BulkMailerCampaignRow>) => void;
  onRecipientsChange: (recipients: BulkMailerRecipientDraft[]) => void;
  onAttachmentsChange: (attachments: BulkMailerCampaignAttachment[]) => void;
  onSaveDraft: () => Promise<void>;
  onSendCampaign: () => Promise<void>;
}

function selectedTemplateById(
  templates: BulkMailerTemplateWithOwner[],
  templateId?: string | null
) {
  return templates.find((template) => template.id === templateId) || null;
}

export function BulkMailerCampaignComposer({
  templates,
  smtpProfiles,
  emailConnections,
  draft,
  recipients,
  attachments,
  effectiveLimits,
  saving = false,
  sending = false,
  onDraftChange,
  onRecipientsChange,
  onAttachmentsChange,
  onSaveDraft,
  onSendCampaign,
}: BulkMailerCampaignComposerProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [nameInput, setNameInput] = useState(draft.name || "");
  const [subjectInput, setSubjectInput] = useState(draft.subject || "");
  const [bodyHtmlInput, setBodyHtmlInput] = useState(draft.body_html || "");
  const [showAudienceBuilderMobile, setShowAudienceBuilderMobile] = useState(false);
  const selectedTemplate = selectedTemplateById(templates, draft.template_id);
  const deferredSubjectInput = useDeferredValue(subjectInput);
  const deferredBodyHtmlInput = useDeferredValue(bodyHtmlInput);

  useEffect(() => {
    setNameInput(draft.name || "");
    setSubjectInput(draft.subject || "");
    setBodyHtmlInput(draft.body_html || "");
  }, [draft.id, draft.name, draft.subject, draft.body_html, draft.template_id]);

  const allVariables = useMemo(
    () =>
      extractBulkMailerVariables({
        subject: deferredSubjectInput,
        bodyHtml: deferredBodyHtmlInput,
      }),
    [deferredBodyHtmlInput, deferredSubjectInput]
  );
  const customVariables = useMemo(
    () =>
      allVariables.filter(
        (variable) =>
          !BULK_MAILER_SYSTEM_VARIABLES.includes(
            variable as (typeof BULK_MAILER_SYSTEM_VARIABLES)[number]
          )
      ),
    [allVariables]
  );

  /* Split profiles: admin defaults vs user-owned */
  const adminSmtp = smtpProfiles.filter((p) => p.scope === "admin_default" && p.is_active);
  const userSmtp = smtpProfiles.filter((p) => p.scope === "user_owned" && p.is_active);
  const selectedSenderValue = getBulkMailerCampaignSenderSelectValue(draft);
  const autoSenderChoice = useMemo(
    () => getBulkMailerAutoSenderChoice(smtpProfiles, emailConnections),
    [emailConnections, smtpProfiles]
  );
  const recipientLimitReached = recipients.length > effectiveLimits.campaignRecipientLimit;
  const attachmentTotalSize = useMemo(
    () => getBulkMailerAttachmentTotalSize(attachments),
    [attachments]
  );
  const attachmentLimitReached = attachmentTotalSize > BULK_MAILER_ATTACHMENT_TOTAL_LIMIT_BYTES;

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      onDraftChange({
        name: nameInput,
        subject: subjectInput,
        body_html: bodyHtmlInput,
      });
    }, 140);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [bodyHtmlInput, nameInput, onDraftChange, subjectInput]);

  const syncDraftNow = () => {
    onDraftChange({
      name: nameInput,
      subject: subjectInput,
      body_html: bodyHtmlInput,
    });
  };

  const handleAttachmentSelect = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const fileList = event.target.files;
    if (!fileList?.length) {
      return;
    }

    const newFiles = Array.from(fileList);
    const nextTotalSize =
      attachmentTotalSize + newFiles.reduce((sum, file) => sum + file.size, 0);

    if (nextTotalSize > BULK_MAILER_ATTACHMENT_TOTAL_LIMIT_BYTES) {
      window.alert("Attachment total must stay within 3 MB.");
      event.target.value = "";
      return;
    }

    const nextAttachments = await Promise.all(
      newFiles.map((file) => readBulkMailerAttachmentFile(file))
    );

    onAttachmentsChange([...attachments, ...nextAttachments]);
    event.target.value = "";
  };

  return (
    <div className="space-y-4">
      <section className="overflow-hidden rounded-[24px] border border-app-border/80 bg-app-card/95 p-[1px] shadow-[0_20px_48px_-32px_rgba(15,23,42,0.32)]">
        <div className="rounded-[23px] bg-app-card/95 p-4 backdrop-blur">
          {/* ── Header ── */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <p className="text-sm font-semibold text-app-text">Campaign Composer</p>
              <span className="rounded-full border border-brand/20 bg-brand/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-brand">
                {draft.status || "draft"}
              </span>
            </div>

            <div className="flex items-center gap-2 text-[10px] font-semibold text-app-muted">
              <span>{effectiveLimits.campaignRecipientLimit} max</span>
              <span>·</span>
              <span>{effectiveLimits.hourlySendLimit}/hr</span>
              <span>·</span>
              <span>{effectiveLimits.dailySendLimit}/day</span>
            </div>
          </div>

          {/* ── Name + Template row ── */}
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <label className="grid gap-1.5">
              <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-app-muted">Name</span>
              <input
                value={nameInput}
                onChange={(event) => setNameInput(event.target.value)}
                className="input-shell"
                placeholder="April Invite"
              />
            </label>

            <label className="grid gap-1.5">
              <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-app-muted">Template</span>
              <select
                value={draft.template_id || ""}
                onChange={(event) => {
                  const template = templates.find((entry) => entry.id === event.target.value);
                  const nextSubject = template?.subject || subjectInput || "";
                  const nextBodyHtml = template?.body_html || bodyHtmlInput || "";
                  setSubjectInput(nextSubject);
                  setBodyHtmlInput(nextBodyHtml);
                  onDraftChange({
                    template_id: template?.id || null,
                    subject: nextSubject,
                    body_html: nextBodyHtml,
                    body_text: template?.body_text || draft.body_text || null,
                  });
                }}
                className="input-shell"
              >
                <option value="">Custom</option>
                {templates.map((template) => (
                  <option key={template.id} value={template.id}>
                    {template.name}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {/* ── SMTP + Source ── */}
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <label className="grid gap-1.5">
              <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-app-muted">Sender</span>
              <select
                value={selectedSenderValue}
                onChange={(event) =>
                  onDraftChange(getBulkMailerCampaignSenderSelectionPatch(event.target.value))
                }
                className="input-shell"
              >
                <option value="">
                  {autoSenderChoice ? `Auto (${autoSenderChoice.label})` : "No sender configured"}
                </option>
                {emailConnections.length > 0 ? (
                  <optgroup label="Student Email">
                    {emailConnections.map((connection) => (
                      <option key={connection.id} value={`email:${connection.id}`}>
                        {(connection.name.trim() || connection.email_address)} · {connection.email_address}
                      </option>
                    ))}
                  </optgroup>
                ) : null}
                {adminSmtp.length > 0 ? (
                  <optgroup label="Admin SMTP">
                    {adminSmtp.map((profile) => (
                      <option key={profile.id} value={`smtp:${profile.id}`}>
                        {profile.name} · {profile.from_email}
                      </option>
                    ))}
                  </optgroup>
                ) : null}
                {userSmtp.length > 0 ? (
                  <optgroup label="Your SMTP">
                    {userSmtp.map((profile) => (
                      <option key={profile.id} value={`smtp:${profile.id}`}>
                        {profile.name} · {profile.from_email}
                      </option>
                    ))}
                  </optgroup>
                ) : null}
              </select>
            </label>

            <label className="grid gap-1.5">
              <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-app-muted">Source</span>
              <select
                value={draft.recipient_source || "manual"}
                onChange={(event) =>
                  onDraftChange({
                    recipient_source: event.target.value as BulkMailerCampaignRow["recipient_source"],
                  })
                }
                className="input-shell"
              >
                <option value="manual">Contact List</option>
                <option value="csv">CSV</option>
              </select>
            </label>
          </div>

          {/* ── Subject ── */}
          <label className="mt-3 grid gap-1.5">
            <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-app-muted">Subject</span>
            <input
              value={subjectInput}
              onChange={(event) => setSubjectInput(event.target.value)}
              className="input-shell"
              placeholder="Hello {{recipient_name}}"
            />
          </label>

          {/* ── HTML Body ── */}
          <label className="mt-3 grid gap-1.5">
            <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-app-muted">HTML Body</span>
            <textarea
              value={bodyHtmlInput}
              onChange={(event) => setBodyHtmlInput(event.target.value)}
              rows={10}
              className="input-shell min-h-[200px] font-mono text-sm"
              placeholder="<p>Invite…</p>"
            />
          </label>

          {/* ── Vars + Live Info ── */}
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <div className="flex flex-wrap gap-1">
              <BulkMailerVariableChips variables={allVariables} />
            </div>
            <div className="ml-auto flex items-center gap-3 text-xs text-app-muted">
              <span>{recipients.length} recipients</span>
              <span>·</span>
              <span>
                Sender: {resolveBulkMailerCampaignSenderLabel(draft, smtpProfiles, emailConnections)}
              </span>
              <span>·</span>
              <span>{selectedTemplate?.name || "Custom"}</span>
            </div>
          </div>

          {/* ── Attachments ── */}
          <div className="mt-3 rounded-[20px] border border-app-border bg-app-secondary/40 p-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-app-muted">
                  Attachments
                </p>
                <p className="mt-1 text-xs text-app-muted">
                  Add multiple files. Combined attachment size must stay within 3 MB.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-app-muted">
                  {formatBulkMailerFileSize(attachmentTotalSize)} /{" "}
                  {formatBulkMailerFileSize(BULK_MAILER_ATTACHMENT_TOTAL_LIMIT_BYTES)}
                </span>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  className="hidden"
                  onChange={(event) => void handleAttachmentSelect(event)}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center gap-1.5 rounded-full border border-app-border bg-app-card px-3 py-2 text-xs font-semibold text-app-text shadow-sm"
                >
                  <Paperclip className="h-3.5 w-3.5" />
                  Add files
                </button>
              </div>
            </div>

            {attachments.length > 0 ? (
              <div className="mt-3 flex flex-wrap gap-2">
                {attachments.map((attachment) => (
                  <div
                    key={attachment.id}
                    className="inline-flex items-center gap-2 rounded-full border border-app-border bg-app-card px-3 py-1.5 text-xs text-app-text shadow-sm"
                  >
                    <span className="max-w-[180px] truncate font-medium">
                      {attachment.name}
                    </span>
                    <span className="text-app-muted">
                      {formatBulkMailerFileSize(attachment.size)}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        onAttachmentsChange(
                          attachments.filter((entry) => entry.id !== attachment.id)
                        )
                      }
                      className="rounded-full p-0.5 text-app-muted transition hover:text-app-text"
                      aria-label={`Remove ${attachment.name}`}
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-3 text-xs text-app-muted">No attachments added yet.</p>
            )}
          </div>

          {/* ── Warnings ── */}
          {!effectiveLimits.sendingEnabled ? (
            <div className="mt-3 flex items-center gap-2 rounded-[18px] border border-red-500/20 bg-red-500/8 px-3 py-2.5 text-xs font-semibold text-red-700 dark:text-red-300">
              <AlertTriangle className="h-3.5 w-3.5" />
              Sending blocked by admin.
            </div>
          ) : null}

          {recipientLimitReached ? (
            <div className="mt-3 flex items-center gap-2 rounded-[18px] border border-amber-500/20 bg-amber-500/8 px-3 py-2.5 text-xs font-semibold text-amber-700 dark:text-amber-300">
              <AlertTriangle className="h-3.5 w-3.5" />
              Limit: {recipients.length}/{effectiveLimits.campaignRecipientLimit}
            </div>
          ) : null}

          {attachmentLimitReached ? (
            <div className="mt-3 flex items-center gap-2 rounded-[18px] border border-amber-500/20 bg-amber-500/8 px-3 py-2.5 text-xs font-semibold text-amber-700 dark:text-amber-300">
              <AlertTriangle className="h-3.5 w-3.5" />
              Attachments exceed the 3 MB combined limit.
            </div>
          ) : null}

          {/* ── Actions ── */}
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                syncDraftNow();
                void onSaveDraft();
              }}
              disabled={saving || attachmentLimitReached}
              className="inline-flex items-center gap-1.5 rounded-full border border-brand/25 bg-brand/10 px-4 py-2.5 text-xs font-semibold text-brand disabled:opacity-60"
            >
              <Save className="h-3.5 w-3.5" />
              {saving ? "Saving…" : "Save Draft"}
            </button>

            <button
              type="button"
              onClick={() => {
                syncDraftNow();
                void onSendCampaign();
              }}
              disabled={
                sending ||
                !effectiveLimits.sendingEnabled ||
                recipientLimitReached ||
                attachmentLimitReached
              }
              className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-[#2563eb] to-[#14b8a6] px-4 py-2.5 text-xs font-semibold text-white shadow-[0_14px_24px_-16px_rgba(37,99,235,0.7)] disabled:opacity-60"
            >
              {draft.status === "paused" ? <Send className="h-3.5 w-3.5" /> : <MailPlus className="h-3.5 w-3.5" />}
              {sending ? "Sending…" : draft.status === "paused" ? "Resume" : "Send"}
            </button>
          </div>
        </div>
      </section>

      <div className="lg:hidden">
        <button
          type="button"
          onClick={() => setShowAudienceBuilderMobile((current) => !current)}
          className="inline-flex items-center gap-2 rounded-full border border-app-border bg-app-card px-4 py-2 text-xs font-semibold text-app-text shadow-sm"
        >
          <MailPlus className="h-3.5 w-3.5" />
          {showAudienceBuilderMobile ? "Hide Audience" : `Show Audience (${recipients.length})`}
        </button>
      </div>

      {/* ── Audience Builder ── */}
      <div className={`${showAudienceBuilderMobile ? "block" : "hidden"} lg:block`}>
        <BulkMailerAudienceBuilder
          customVariables={customVariables}
          mode={draft.recipient_source || "manual"}
          recipients={recipients}
          onModeChange={(source) => onDraftChange({ recipient_source: source })}
          onRecipientsChange={onRecipientsChange}
        />
      </div>
    </div>
  );
}
