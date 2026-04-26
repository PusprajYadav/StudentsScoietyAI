import type { ChangeEvent } from "react";

export interface OrderedImageItemView {
  id: string;
  name: string;
  size: number;
  previewUrl: string;
}

interface ImagesToPdfOrderListProps {
  items: OrderedImageItemView[];
  inputVersion: number;
  imageAccept: string;
  busy: boolean;
  formatBytes: (bytes: number) => string;
  onChooseFiles: (event: ChangeEvent<HTMLInputElement>) => void;
  onMove: (id: string, direction: -1 | 1) => void;
  onRemove: (id: string) => void;
  onClear: () => void;
}

export function ImagesToPdfOrderList({
  items,
  inputVersion,
  imageAccept,
  busy,
  formatBytes,
  onChooseFiles,
  onMove,
  onRemove,
  onClear,
}: ImagesToPdfOrderListProps) {
  return (
    <div>
      <p className="text-xs font-medium text-app-muted">Images (1+). Set order visually before creating PDF.</p>
      <div className="mt-1 grid gap-2 sm:flex sm:flex-wrap sm:items-center">
        <label className="btn-secondary inline-flex w-full cursor-pointer items-center gap-2 sm:w-auto">
          <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
            <path d="M10 4v12" />
            <path d="M4 10h12" />
          </svg>
          Choose Images
          <input key={`images-${inputVersion}`} type="file" className="hidden" accept={imageAccept} multiple onChange={onChooseFiles} />
        </label>
        {items.length > 0 ? (
          <button type="button" className="btn-secondary w-full !px-2 !py-1 sm:w-auto" onClick={onClear} disabled={busy}>
            Clear
          </button>
        ) : null}
      </div>

      {items.length > 0 ? (
        <div className="mt-2 max-h-64 space-y-2 overflow-auto rounded-2xl border border-app-border bg-app-card p-2">
          {items.map((item, index) => (
            <div key={item.id} className="rounded-2xl border border-app-border bg-app-card px-2 py-2">
              <div className="flex items-center gap-2">
              <img src={item.previewUrl} alt={item.name} className="h-10 w-10 rounded-xl border border-app-border object-cover sm:h-12 sm:w-12" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-medium text-app-text">{index + 1}. {item.name}</p>
                <p className="text-[11px] text-app-muted">{formatBytes(item.size)}</p>
              </div>
              </div>
              <div className="mt-2 grid grid-cols-3 gap-2">
                <button type="button" className="btn-secondary !px-2 !py-1" onClick={() => onMove(item.id, -1)} disabled={index === 0 || busy}>Up</button>
                <button type="button" className="btn-secondary !px-2 !py-1" onClick={() => onMove(item.id, 1)} disabled={index === items.length - 1 || busy}>Down</button>
                <button type="button" className="btn-secondary !px-2 !py-1 text-red-600" onClick={() => onRemove(item.id)} disabled={busy}>Remove</button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-1 text-xs text-app-muted">No images selected.</p>
      )}
    </div>
  );
}
