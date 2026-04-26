import { Check, Copy, ExternalLink, LayoutDashboard, Loader2, Sparkles, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "react-hot-toast";
import type { QrCodeRow, QrCodeType } from "../../../types/database";
import { copyText, createShortUrl, formatCodeTimestamp, normalizeQrValue, unwrapStoredQrValue } from "./helpers";
import { COMPACT_INPUT_CLASS } from "./qrStudioTokens";

interface QrDynamicCardProps {
  qrCode: QrCodeRow;
  onSave: (input: { id: string; title: string; type: QrCodeType; targetUrl: string }) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onOpenStudio: (qrCode: QrCodeRow) => void;
}

export function QrDynamicCard({ qrCode, onSave, onDelete, onOpenStudio }: QrDynamicCardProps) {
  const [title, setTitle] = useState(qrCode.title);
  const [type, setType] = useState<QrCodeType>(qrCode.type);
  const [targetValue, setTargetValue] = useState(unwrapStoredQrValue(qrCode.type, qrCode.target_url));
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    setTitle(qrCode.title);
    setType(qrCode.type);
    setTargetValue(unwrapStoredQrValue(qrCode.type, qrCode.target_url));
  }, [qrCode]);

  const normalized = useMemo(() => normalizeQrValue(type, targetValue), [targetValue, type]);
  const shortUrl = createShortUrl(qrCode.short_code);

  return (
    <article className="rounded-[26px] border border-app-border bg-app-card p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="inline-flex items-center gap-2 rounded-full bg-app-secondary px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-app-muted">
            <LayoutDashboard className="h-3.5 w-3.5" />
            Dynamic QR
          </div>
          <p className="mt-3 font-display text-lg font-semibold tracking-tight text-app-text">{qrCode.short_code}</p>
          <p className="mt-1 text-sm text-app-muted">
            {qrCode.scan_count} scans • updated {formatCodeTimestamp(qrCode.updated_at)}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="btn-secondary gap-2 !rounded-full !px-4"
            onClick={() => void copyText(shortUrl).then(() => toast.success("Short URL copied"))}
          >
            <Copy className="h-4 w-4" />
            Copy
          </button>
          <button type="button" className="btn-secondary gap-2 !rounded-full !px-4" onClick={() => onOpenStudio(qrCode)}>
            <Sparkles className="h-4 w-4" />
            Studio
          </button>
        </div>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <label className="block">
          <span className="text-xs font-medium text-app-muted">Name</span>
          <input value={title} onChange={(event) => setTitle(event.target.value)} className={COMPACT_INPUT_CLASS} />
        </label>

        <label className="block">
          <span className="text-xs font-medium text-app-muted">Type</span>
          <select
            value={type}
            onChange={(event) => setType(event.target.value as QrCodeType)}
            className={`${COMPACT_INPUT_CLASS} appearance-none`}
          >
            <option value="url">URL</option>
            <option value="text">Text</option>
            <option value="email">Email</option>
            <option value="phone">Phone</option>
          </select>
        </label>
      </div>

      <label className="mt-3 block">
        <span className="text-xs font-medium text-app-muted">Target</span>
        {type === "text" ? (
          <textarea
            value={targetValue}
            onChange={(event) => setTargetValue(event.target.value)}
            className={`${COMPACT_INPUT_CLASS} min-h-[112px] resize-y`}
          />
        ) : (
          <input value={targetValue} onChange={(event) => setTargetValue(event.target.value)} className={COMPACT_INPUT_CLASS} />
        )}
      </label>

      {normalized.error ? <p className="mt-3 text-sm text-rose-600 dark:text-rose-300">{normalized.error}</p> : null}

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          className="btn-primary gap-2 !rounded-full !px-4"
          disabled={saving || Boolean(normalized.error) || !normalized.value}
          onClick={() => {
            if (!normalized.value) return;

            setSaving(true);
            void onSave({
              id: qrCode.id,
              title: title.trim() || "Untitled dynamic QR",
              type,
              targetUrl: normalized.value.storedValue,
            }).finally(() => setSaving(false));
          }}
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
          Save
        </button>

        <button
          type="button"
          className="btn-secondary gap-2 !rounded-full !px-4"
          disabled={deleting}
          onClick={() => {
            setDeleting(true);
            void onDelete(qrCode.id).finally(() => setDeleting(false));
          }}
        >
          {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
          Delete
        </button>

        <a
          href={shortUrl}
          target="_blank"
          rel="noreferrer"
          className="btn-secondary gap-2 !rounded-full !px-4"
        >
          <ExternalLink className="h-4 w-4" />
          Open
        </a>
      </div>
    </article>
  );
}
