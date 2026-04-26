import { UploadCloud } from "lucide-react";
import { useDropzone, type Accept } from "react-dropzone";

interface AudioSourceDropzoneProps {
  accept: Accept;
  multiple?: boolean;
  title: string;
  description: string;
  helperText: string;
  onFilesAccepted: (files: File[]) => void;
}

export function AudioSourceDropzone({
  accept,
  multiple = false,
  title,
  description,
  helperText,
  onFilesAccepted,
}: AudioSourceDropzoneProps) {
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept,
    multiple,
    onDropAccepted: onFilesAccepted,
  });

  return (
    <div
      {...getRootProps()}
      className={`group w-full cursor-pointer rounded-[18px] border border-dashed px-3 py-4 text-left transition sm:rounded-[24px] sm:px-5 sm:py-5 ${
        isDragActive
          ? "border-emerald-400 bg-emerald-500/10 shadow-[0_24px_64px_-40px_rgba(16,185,129,0.6)]"
          : "border-app-border bg-app-card hover:border-brand/35 hover:bg-brand/5"
      }`}
    >
      <input {...getInputProps()} />
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="rounded-[16px] bg-slate-950 p-2.5 text-white shadow-[0_14px_40px_-28px_rgba(15,23,42,0.8)] sm:rounded-2xl sm:p-3">
          <UploadCloud className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <h3 className="font-display text-base font-semibold tracking-tight text-app-text">{title}</h3>
          <p className="mt-0.5 text-xs text-app-muted">{description}</p>
          <p className="mt-1 text-xs font-medium text-brand">{helperText}</p>
        </div>
      </div>
    </div>
  );
}
