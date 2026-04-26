import { getDocument, VerbosityLevel, type PDFDocumentProxy } from "pdfjs-dist/build/pdf.mjs";
import { ensurePdfJsRuntime } from "./pdfjsRuntime";

const pdfUrlCache = new Map<string, Promise<PDFDocumentProxy>>();
const activeCanvasRenders = new WeakMap<HTMLCanvasElement, { cancel: () => void; promise: Promise<unknown> }>();

function buildPdfLoadOptions(
  source: { url: string } | { data: ArrayBuffer },
  password?: string
) {
  ensurePdfJsRuntime();

  return {
    ...source,
    password,
    verbosity: VerbosityLevel.ERRORS,
    disableWorker: true,
  } as const;
}

function getPdfCacheKey(url: string, password?: string) {
  return `${url}::${password || ""}`;
}

function isBlobLikeUrl(url: string) {
  return /^blob:/i.test(url) || /^data:application\/pdf/i.test(url);
}

function isCrossOriginPdf(url: string) {
  if (typeof window === "undefined") {
    return false;
  }

  try {
    return new URL(url, window.location.href).origin !== window.location.origin;
  } catch {
    return false;
  }
}

function normalizePdfError(error: unknown, url: string) {
  const message =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : "Unable to load this PDF.";

  if (
    isCrossOriginPdf(url) &&
    /failed to fetch|networkerror|load failed|unexpected server response\s*\(0\)/i.test(message)
  ) {
    return new Error(
      "PDF preview is blocked by the media host CORS settings. Allow cross-origin GET/Range requests for uploads on your Cloudflare R2 public domain."
    );
  }

  return error instanceof Error ? error : new Error(message);
}

export function isPdfPasswordError(error: unknown) {
  const message =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : "";

  return /password|encrypted|credential|incorrect password|no password given/i.test(message);
}

async function loadPdfDocument(url: string, password?: string) {
  if (isBlobLikeUrl(url)) {
    const response = await fetch(url);
    const buffer = await response.arrayBuffer();
    return getDocument(buildPdfLoadOptions({ data: buffer }, password)).promise;
  }

  return getDocument(buildPdfLoadOptions({ url }, password)).promise;
}

function getPdfDocumentFromUrl(url: string, password?: string) {
  const cacheKey = getPdfCacheKey(url, password);

  if (!pdfUrlCache.has(cacheKey)) {
    pdfUrlCache.set(
      cacheKey,
      loadPdfDocument(url, password).catch((error) => {
        pdfUrlCache.delete(cacheKey);
        throw normalizePdfError(error, url);
      })
    );
  }

  return pdfUrlCache.get(cacheKey)!;
}

export async function getPdfPageCountFromFile(file: File, password?: string) {
  const buffer = await file.arrayBuffer();
  const pdf = await getDocument(buildPdfLoadOptions({ data: buffer }, password)).promise;
  return pdf.numPages;
}

export async function getPdfPageCountFromUrl(url: string, password?: string) {
  const pdf = await getPdfDocumentFromUrl(url, password);
  return pdf.numPages;
}

export async function renderPdfPageToCanvas(
  url: string,
  pageNumber: number,
  canvas: HTMLCanvasElement,
  maxWidth = 900,
  password?: string
) {
  const previousRender = activeCanvasRenders.get(canvas);
  if (previousRender) {
    previousRender.cancel();
    await previousRender.promise.catch(() => undefined);
    activeCanvasRenders.delete(canvas);
  }

  const pdf = await getPdfDocumentFromUrl(url, password);
  const page = await pdf.getPage(pageNumber);
  const initialViewport = page.getViewport({ scale: 1 });
  const scale = Math.min(maxWidth / initialViewport.width, 1.6);
  const viewport = page.getViewport({ scale });
  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error("Canvas is not available for PDF rendering.");
  }

  canvas.width = viewport.width;
  canvas.height = viewport.height;

  const renderTask = page.render({
    canvasContext: context,
    viewport,
  });

  activeCanvasRenders.set(canvas, {
    cancel: () => renderTask.cancel(),
    promise: renderTask.promise,
  });

  try {
    await renderTask.promise;
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (/cancelled|canceled/i.test(message)) {
      return;
    }
    throw error;
  } finally {
    const activeRender = activeCanvasRenders.get(canvas);
    if (activeRender?.promise === renderTask.promise) {
      activeCanvasRenders.delete(canvas);
    }
  }
}
