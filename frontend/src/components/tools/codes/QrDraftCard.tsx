import { LayoutDashboard, QrCode, Trash2, Wand2 } from "lucide-react";
import { formatCodeTimestamp } from "./helpers";
import type { StoredQrDraft } from "./types";

interface QrDraftCardProps {
  draft: StoredQrDraft;
  onLoad: (draft: StoredQrDraft) => void;
  onDelete: (draftId: string) => void;
}

export function QrDraftCard({ draft, onLoad, onDelete }: QrDraftCardProps) {
  return (
    <article className="rounded-[24px] border border-app-border bg-app-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="inline-flex items-center gap-2 rounded-full bg-app-secondary px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-app-muted">
            <QrCode className="h-3.5 w-3.5" />
            {draft.payload.contentType}
          </div>
          <p className="mt-3 font-display text-lg font-semibold tracking-tight text-app-text">{draft.name}</p>
          <p className="mt-1 text-sm text-app-muted">{formatCodeTimestamp(draft.updatedAt)}</p>
        </div>

        {draft.payload.dynamic && draft.payload.shortCode ? (
          <span className="rounded-full bg-brand/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-brand">
            /qr/{draft.payload.shortCode}
          </span>
        ) : null}
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <button type="button" className="btn-secondary gap-2 !rounded-full !px-4" onClick={() => onLoad(draft)}>
          <Wand2 className="h-4 w-4" />
          Open
        </button>
        <button type="button" className="btn-secondary gap-2 !rounded-full !px-4" onClick={() => onDelete(draft.id)}>
          <Trash2 className="h-4 w-4" />
          Delete
        </button>
        <div className="inline-flex items-center gap-2 rounded-full bg-app-secondary px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-app-muted">
          <LayoutDashboard className="h-3.5 w-3.5" />
          Draft
        </div>
      </div>
    </article>
  );
}
