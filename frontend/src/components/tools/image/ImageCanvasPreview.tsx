import { useState, type MutableRefObject, type PointerEvent } from "react";
import { downloadBlobNatively } from "../../../lib/nativeDownload";
import type { EditMode, ImageStudioResult } from "./types";

interface ImageCanvasPreviewProps {
  mode: EditMode;
  mainCanvasRef: MutableRefObject<HTMLCanvasElement | null>;
  overlayCanvasRef: MutableRefObject<HTMLCanvasElement | null>;
  onPointerDown: (event: PointerEvent<HTMLCanvasElement>) => void;
  onPointerMove: (event: PointerEvent<HTMLCanvasElement>) => void;
  onPointerUp: () => void;
  result: ImageStudioResult | null;
  formatBytes: (bytes: number) => string;
}

export function ImageCanvasPreview({
  mode,
  mainCanvasRef,
  overlayCanvasRef,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  result,
  formatBytes,
}: ImageCanvasPreviewProps) {
  const [previewOpen, setPreviewOpen] = useState(false);

  return (
    <>
      <div className="space-y-2.5 rounded-[20px] border border-app-border bg-app-card/90 p-2.5 shadow-[0_20px_60px_-34px_rgba(15,23,42,0.35)] sm:rounded-[24px] sm:p-3">
        <div className="rounded-2xl border border-app-border bg-app-secondary/60 p-2.5 sm:p-3">
          <p className="text-[10px] leading-5 text-app-muted sm:text-xs">
            Mode: {mode === "erase" ? "Erase BG Area" : mode === "pick_bg" ? "Pick BG Color" : mode === "crop" ? "Crop Select" : "Cursor"}.
            {" "}In erase mode, drag to remove area. In pick mode, click background color. In crop mode, drag selection then apply crop.
          </p>
        </div>

        <div className="max-h-[360px] overflow-auto rounded-2xl border border-app-border bg-app px-1.5 py-1.5 sm:max-h-[560px] sm:px-2 sm:py-2">
          <div className="flex min-h-[200px] items-center justify-center sm:min-h-[260px]">
            <div className="relative max-w-full">
              <canvas ref={mainCanvasRef} className="block h-auto max-w-full rounded-xl" width={1} height={1} />
              <canvas
                ref={overlayCanvasRef}
                className="absolute inset-0 block h-auto max-w-full touch-none"
                width={1}
                height={1}
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                onPointerLeave={onPointerUp}
                style={{
                  cursor:
                    mode === "erase"
                      ? "crosshair"
                      : mode === "crop"
                        ? "crosshair"
                        : mode === "pick_bg"
                          ? "copy"
                          : "default",
                }}
              />
            </div>
          </div>
        </div>

        {result ? (
          <div className="rounded-2xl border border-app-border bg-app-card p-2.5 sm:p-3">
            <p className="text-sm font-semibold text-app-text">Output ready</p>
            <p className="mt-1 break-all text-xs text-app-muted">{result.name}</p>
            <p className="text-xs text-app-muted">{formatBytes(result.size)}</p>
            <div className="mt-2 grid gap-2 sm:flex sm:flex-wrap sm:items-center">
              <button
                type="button"
                className="btn-primary w-full !px-3 !py-2 text-xs sm:w-auto"
                onClick={async () => {
                  try {
                    const res = await fetch(result.url);
                    const blob = await res.blob();
                    await downloadBlobNatively(blob, result.name);
                  } catch (e) {
                    console.error("Native download failed", e);
                  }
                }}
              >
                Download Result
              </button>
              <button type="button" className="btn-secondary w-full !px-3 !py-2 text-xs sm:w-auto" onClick={() => setPreviewOpen(true)}>
                Fullscreen Preview
              </button>
            </div>
            <img src={result.url} alt="Image output preview" className="mt-3 max-h-52 w-full rounded-2xl border border-app-border object-contain bg-app-secondary/35 sm:max-h-72" />
          </div>
        ) : (
          <p className="text-sm text-app-muted">No output generated yet.</p>
        )}
      </div>

      {previewOpen && result ? (
        <div className="fixed inset-0 z-50 bg-slate-950/75 p-2 sm:p-4" role="dialog" aria-modal="true">
          <div className="mx-auto flex h-full max-w-7xl flex-col rounded-[24px] border border-white/20 bg-app-card p-2.5 sm:rounded-[28px] sm:p-3">
            <div className="mb-2 flex items-center justify-between gap-2">
              <p className="text-sm font-semibold text-app-text">Image Fullscreen Preview</p>
              <button type="button" className="btn-secondary !px-2 !py-1" onClick={() => setPreviewOpen(false)}>
                Close
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-auto rounded-2xl border border-app-border bg-app-secondary/20 p-2">
              <img src={result.url} alt="Image fullscreen output preview" className="mx-auto h-full max-h-full w-auto max-w-full object-contain" />
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
