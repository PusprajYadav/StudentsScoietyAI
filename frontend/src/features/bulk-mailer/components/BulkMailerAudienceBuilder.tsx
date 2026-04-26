import { FileSpreadsheet, List, Plus, Trash2, Upload, Users, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { mapBulkMailerCsvRowsToRecipients, parseBulkMailerCsv } from "../csv";
import type { BulkMailerParsedCsv, BulkMailerRecipientDraft } from "../types";

/* ── Contact List Storage ── */
interface ContactEntry {
  email: string;
  name: string;
}

interface ContactList {
  id: string;
  name: string;
  contacts: ContactEntry[];
}

const CONTACT_LISTS_KEY = "bulk_mailer_contact_lists";

function loadContactLists(): ContactList[] {
  try {
    return JSON.parse(localStorage.getItem(CONTACT_LISTS_KEY) || "[]") as ContactList[];
  } catch {
    return [];
  }
}

function persistContactLists(lists: ContactList[]) {
  localStorage.setItem(CONTACT_LISTS_KEY, JSON.stringify(lists));
}

/* ──────────────────────────────────────────────── */

interface BulkMailerAudienceBuilderProps {
  customVariables: string[];
  mode: "manual" | "csv";
  recipients: BulkMailerRecipientDraft[];
  onModeChange: (mode: "manual" | "csv") => void;
  onRecipientsChange: (recipients: BulkMailerRecipientDraft[]) => void;
}

function guessCsvColumn(headers: string[], keywords: string[]) {
  return headers.find((h) => keywords.some((kw) => h.includes(kw))) || "";
}

export function BulkMailerAudienceBuilder({
  customVariables,
  mode,
  recipients,
  onModeChange,
  onRecipientsChange,
}: BulkMailerAudienceBuilderProps) {
  const [parsedCsv, setParsedCsv] = useState<BulkMailerParsedCsv | null>(null);
  const [csvEmailColumn, setCsvEmailColumn] = useState("");
  const [csvNameColumn, setCsvNameColumn] = useState("");
  const [csvMapping, setCsvMapping] = useState<Record<string, string>>({});

  /* Contact Lists */
  const [contactLists, setContactLists] = useState<ContactList[]>([]);
  const [editingListId, setEditingListId] = useState<string | null>(null);
  const [newListName, setNewListName] = useState("");
  const [newContactEmail, setNewContactEmail] = useState("");
  const [newContactName, setNewContactName] = useState("");

  useEffect(() => { setContactLists(loadContactLists()); }, []);

  const templateVariables = useMemo(
    () => customVariables.filter((v) => v !== "recipient_email" && v !== "recipient_name"),
    [customVariables]
  );

  const editingList = editingListId ? contactLists.find((l) => l.id === editingListId) || null : null;

  /* ── List CRUD ── */
  const createList = () => {
    const name = newListName.trim();
    if (!name) return;
    const list: ContactList = {
      id: `cl-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      name,
      contacts: [],
    };
    const updated = [...contactLists, list];
    setContactLists(updated);
    persistContactLists(updated);
    setNewListName("");
  };

  const deleteList = (id: string) => {
    if (!window.confirm("Delete this contact list?")) return;
    const updated = contactLists.filter((l) => l.id !== id);
    setContactLists(updated);
    persistContactLists(updated);
    if (editingListId === id) setEditingListId(null);
  };

  const addContactToList = (listId: string) => {
    const email = newContactEmail.trim();
    if (!email) return;
    const updated = contactLists.map((l) =>
      l.id === listId
        ? { ...l, contacts: [...l.contacts, { email, name: newContactName.trim() }] }
        : l
    );
    setContactLists(updated);
    persistContactLists(updated);
    setNewContactEmail("");
    setNewContactName("");
  };

  const removeContactFromList = (listId: string, index: number) => {
    const updated = contactLists.map((l) =>
      l.id === listId
        ? { ...l, contacts: l.contacts.filter((_, i) => i !== index) }
        : l
    );
    setContactLists(updated);
    persistContactLists(updated);
  };

  const useListAsRecipients = (list: ContactList) => {
    onRecipientsChange(
      list.contacts.map((c, i) => ({
        id: `r-${Math.random().toString(36).slice(2, 9)}`,
        email: c.email,
        name: c.name,
        variables: {}, // We omit complex custom variables for simplicity in "Contact List" mode
        sourceIndex: i,
        sourceLabel: list.name,
      }))
    );
  };

  /* ── CSV helpers ── */
  const handleCsvFile = async (file: File) => {
    const parsed = parseBulkMailerCsv(await file.text());
    setParsedCsv(parsed);
    setCsvEmailColumn(guessCsvColumn(parsed.headers, ["email", "mail"]));
    setCsvNameColumn(guessCsvColumn(parsed.headers, ["name", "student", "full_name"]));
    setCsvMapping(
      templateVariables.reduce<Record<string, string>>((a, v) => { a[v] = parsed.headers.find((h) => h === v) || ""; return a; }, {})
    );
  };

  const importCsvRecipients = () => {
    if (!parsedCsv) return;
    onRecipientsChange(
      mapBulkMailerCsvRowsToRecipients({ parsed: parsedCsv, mapping: csvMapping, defaultEmailColumn: csvEmailColumn, defaultNameColumn: csvNameColumn })
    );
  };

  const clearRecipients = () => onRecipientsChange([]);

  const activeSourceLabel = recipients.length > 0 ? recipients[0].sourceLabel : null;

  return (
    <section className="overflow-hidden rounded-[24px] border border-app-border/80 bg-app-card/95 p-[1px] shadow-[0_20px_48px_-32px_rgba(15,23,42,0.32)]">
      <div className="rounded-[23px] bg-app-card/95 p-4 backdrop-blur">

        {/* ── Tabs header ── */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-app-border/60 pb-3">
          <p className="text-sm font-semibold text-app-text">Audience Source</p>
          <div className="flex items-center gap-1 rounded-full border border-app-border bg-app-secondary/60 p-0.5">
            <button
              type="button"
              onClick={() => onModeChange("manual")}
              className={`inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-[11px] font-semibold transition ${
                mode === "manual"
                  ? "bg-brand text-white shadow-sm"
                  : "text-app-muted hover:text-app-text"
              }`}
            >
              <List className="h-3 w-3" />
              Contact List
            </button>
            <button
              type="button"
              onClick={() => onModeChange("csv")}
              className={`inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-[11px] font-semibold transition ${
                mode === "csv"
                  ? "bg-brand text-white shadow-sm"
                  : "text-app-muted hover:text-app-text"
              }`}
            >
              <Upload className="h-3 w-3" />
              Upload CSV
            </button>
          </div>
        </div>

        {/* ── Active Selection Banner ── */}
        {recipients.length > 0 ? (
          <div className="mt-4 flex items-center justify-between rounded-[16px] border border-emerald-500/20 bg-emerald-500/10 px-4 py-3">
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500 text-white shadow-sm">
                <Users className="h-3.5 w-3.5" />
              </span>
              <div>
                <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                  {recipients.length} recipients selected
                </p>
                <p className="text-[10px] text-emerald-600 dark:text-emerald-300/80">
                  Source: <span className="font-semibold">{activeSourceLabel || (mode === "csv" ? "CSV Import" : "Manual")}</span>
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={clearRecipients}
              className="inline-flex items-center gap-1 rounded-full bg-app-card px-3 py-1.5 text-[10px] font-semibold text-red-600 shadow-sm transition hover:bg-red-500/10 dark:text-red-300"
            >
              <X className="h-3 w-3" />
              Clear
            </button>
          </div>
        ) : null}

        {/* ── List Mode (Manual) ── */}
        {mode === "manual" ? (
          <div className="mt-4">
            {editingList ? (
              /* Inside a specific list */
              <div className="rounded-[18px] border border-app-border bg-app-secondary/35 p-4">
                <div className="mb-4 flex items-center justify-between">
                  <p className="text-sm font-semibold text-app-text">{editingList.name}</p>
                  <button
                    type="button"
                    onClick={() => setEditingListId(null)}
                    className="text-[11px] font-semibold text-app-muted hover:text-app-text"
                  >
                    Close
                  </button>
                </div>

                {/* Add new contact form */}
                <div className="mb-4 flex items-center gap-2 rounded-[14px] bg-app-card p-2 shadow-[0_2px_8px_-4px_rgba(0,0,0,0.1)]">
                  <input
                    value={newContactEmail}
                    onChange={(e) => setNewContactEmail(e.target.value)}
                    placeholder="Email"
                    className="w-1/2 border-none bg-transparent px-2 text-xs text-app-text outline-none placeholder:text-app-muted"
                    onKeyDown={(e) => { if (e.key === "Enter") addContactToList(editingList.id); }}
                  />
                  <div className="h-4 w-px bg-app-border" />
                  <input
                    value={newContactName}
                    onChange={(e) => setNewContactName(e.target.value)}
                    placeholder="Name (Optional)"
                    className="w-1/2 border-none bg-transparent px-2 text-xs text-app-text outline-none placeholder:text-app-muted"
                    onKeyDown={(e) => { if (e.key === "Enter") addContactToList(editingList.id); }}
                  />
                  <button
                    type="button"
                    onClick={() => addContactToList(editingList.id)}
                    disabled={!newContactEmail.trim()}
                    className="ml-auto inline-flex shrink-0 items-center justify-center rounded-full bg-brand p-1.5 text-white disabled:opacity-50"
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                </div>

                {/* Emails in the list */}
                <div className="max-h-[250px] space-y-1.5 overflow-y-auto">
                  {editingList.contacts.length === 0 ? (
                    <p className="text-center text-xs text-app-muted py-4">No contacts added yet.</p>
                  ) : (
                    editingList.contacts.map((contact, idx) => (
                      <div key={idx} className="flex items-center justify-between rounded-[12px] bg-app-card px-3 py-2 text-xs shadow-sm">
                        <div className="flex flex-col">
                          <span className="font-medium text-app-text">{contact.email}</span>
                          {contact.name && <span className="text-[10px] text-app-muted">{contact.name}</span>}
                        </div>
                        <button
                          type="button"
                          onClick={() => removeContactFromList(editingList.id, idx)}
                          className="text-app-muted hover:text-red-500"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            ) : (
              /* Showing all lists */
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <input
                    value={newListName}
                    onChange={(e) => setNewListName(e.target.value)}
                    placeholder="Create new contact list..."
                    className="input-shell flex-1 !py-2 text-xs"
                    onKeyDown={(e) => { if (e.key === "Enter") createList(); }}
                  />
                  <button
                    type="button"
                    onClick={createList}
                    disabled={!newListName.trim()}
                    className="inline-flex items-center gap-1 rounded-full bg-brand px-3 py-2 text-[11px] font-semibold text-white disabled:opacity-50"
                  >
                    <Plus className="h-3 w-3" />
                    Create
                  </button>
                </div>

                <div className="grid gap-2 sm:grid-cols-2">
                  {contactLists.length === 0 ? (
                    <div className="col-span-full py-4 text-center text-xs text-app-muted">
                      You haven't created any contact lists yet.
                    </div>
                  ) : null}

                  {contactLists.map((list) => (
                    <div key={list.id} className="flex flex-col justify-between rounded-[16px] border border-app-border bg-app-card px-4 py-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-semibold text-app-text">{list.name}</p>
                          <p className="text-[10px] text-app-muted">{list.contacts.length} contacts</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => deleteList(list.id)}
                          className="text-app-muted hover:text-red-500"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>

                      <div className="mt-3 flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setEditingListId(list.id)}
                          className="flex-1 rounded-full border border-app-border bg-app-card py-1.5 text-[11px] font-semibold text-app-text transition hover:bg-app-secondary"
                        >
                          Edit Contacts
                        </button>
                        <button
                          type="button"
                          onClick={() => useListAsRecipients(list)}
                          disabled={list.contacts.length === 0}
                          className="flex-[1.5] rounded-full bg-brand py-1.5 text-[11px] font-semibold text-white transition hover:bg-blue-700 disabled:opacity-50"
                        >
                          Use List
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          /* ── CSV Mode ── */
          <div className="mt-4 space-y-3">
            <label className="flex cursor-pointer flex-col items-center justify-center rounded-[18px] border border-dashed border-app-border bg-brand/[0.06] px-6 py-6 text-center transition hover:bg-brand/[0.1]">
              <Upload className="mb-2 h-5 w-5 text-brand" />
              <p className="text-xs font-semibold text-app-text">Upload CSV File</p>
              <input
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void handleCsvFile(file);
                }}
              />
            </label>

            {parsedCsv ? (
              <div className="rounded-[16px] border border-app-border bg-app-secondary/35 p-3">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <FileSpreadsheet className="h-4 w-4 text-brand" />
                    <span className="text-xs font-semibold text-app-text">{parsedCsv.rows.length} rows found</span>
                  </div>
                  <button
                    type="button"
                    onClick={importCsvRecipients}
                    disabled={!csvEmailColumn}
                    className="inline-flex items-center gap-1 rounded-full bg-brand px-3 py-1.5 text-[11px] font-semibold text-white disabled:opacity-60"
                  >
                    Import Audience
                  </button>
                </div>

                <div className="grid gap-2 sm:grid-cols-2">
                  <label className="grid gap-1">
                    <span className="text-[10px] font-semibold uppercase text-app-muted">Email Column (Required)</span>
                    <select value={csvEmailColumn} onChange={(e) => setCsvEmailColumn(e.target.value)} className="input-shell !py-1.5 text-xs">
                      <option value="">Select</option>
                      {parsedCsv.headers.map((h) => <option key={h} value={h}>{h}</option>)}
                    </select>
                  </label>
                  <label className="grid gap-1">
                    <span className="text-[10px] font-semibold uppercase text-app-muted">Name Column</span>
                    <select value={csvNameColumn} onChange={(e) => setCsvNameColumn(e.target.value)} className="input-shell !py-1.5 text-xs">
                      <option value="">Skip</option>
                      {parsedCsv.headers.map((h) => <option key={h} value={h}>{h}</option>)}
                    </select>
                  </label>
                  {templateVariables.map((v) => (
                    <label key={v} className="grid gap-1">
                      <span className="text-[10px] font-semibold uppercase text-app-muted">{v} Column</span>
                      <select
                        value={csvMapping[v] || ""}
                        onChange={(e) => setCsvMapping((c) => ({ ...c, [v]: e.target.value }))}
                        className="input-shell !py-1.5 text-xs"
                      >
                        <option value="">Skip</option>
                        {parsedCsv.headers.map((h) => <option key={h} value={h}>{h}</option>)}
                      </select>
                    </label>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        )}
      </div>
    </section>
  );
}
