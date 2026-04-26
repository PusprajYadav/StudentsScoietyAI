import { GlobalWorkerOptions } from "pdfjs-dist/build/pdf.mjs";
import workerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";

let configured = false;

export function ensurePdfJsRuntime() {
  if (configured) {
    return;
  }

  GlobalWorkerOptions.workerSrc = workerUrl;
  configured = true;
}
