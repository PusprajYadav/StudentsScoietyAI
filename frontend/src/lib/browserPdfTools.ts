import { getDocument, VerbosityLevel } from "pdfjs-dist/build/pdf.mjs";
import { ensurePdfJsRuntime } from "./pdfjsRuntime";

type PdfModule = typeof import("@libpdf/core");
type PdfDocument = Awaited<ReturnType<PdfModule["PDF"]["load"]>>;

export class PdfToolError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PdfToolError";
  }
}

export interface BrowserProcessedFile {
  blob: Blob;
  name: string;
  mimeType: string;
}

export interface PdfCompressionProfile {
  strength: number;
  label: string;
  description: string;
  compressStreams: boolean;
  compressionThreshold: number;
  subsetFonts: boolean;
  useXRefStream: boolean;
  renderScale: number;
  imageQuality: number;
}

interface LoadedPdf {
  pdf: PdfDocument;
}

interface PageRange {
  start: number;
  end: number;
}

function baseName(fileName: string, fallback: string) {
  const trimmed = fileName.trim();
  const safe = trimmed.replace(/[^A-Za-z0-9._-]+/g, "-").replace(/^[-._]+|[-._]+$/g, "");
  const candidate = safe || fallback;
  return candidate.toLowerCase().endsWith(".pdf") ? candidate.slice(0, -4) : candidate;
}

function buildFile(bytes: Uint8Array | ArrayBufferLike, name: string, mimeType: string): BrowserProcessedFile {
  return {
    blob: new Blob([bytes], { type: mimeType }),
    name,
    mimeType,
  };
}

function isJpegFile(file: File) {
  const lower = file.name.toLowerCase();
  return file.type === "image/jpeg" || file.type === "image/jpg" || lower.endsWith(".jpg") || lower.endsWith(".jpeg");
}

function isPngFile(file: File) {
  const lower = file.name.toLowerCase();
  return file.type === "image/png" || lower.endsWith(".png");
}

function normalizePassword(value?: string | null) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function clampCompressionStrength(value: number | null | undefined) {
  if (!Number.isFinite(value)) {
    return 65;
  }

  return Math.min(100, Math.max(0, Math.round(value ?? 65)));
}

function toPdfToolError(error: unknown, fallback: string) {
  if (error instanceof PdfToolError) {
    return error;
  }

  const message = error instanceof Error ? error.message.trim() : "";
  const normalized = message.toLowerCase();

  if (normalized.includes("credential") || normalized.includes("encrypted")) {
    return new PdfToolError("This PDF is password-protected. Enter the correct password to continue.");
  }

  if (normalized.includes("authenticate") || normalized.includes("password")) {
    return new PdfToolError("Incorrect PDF password.");
  }

  if (normalized.includes("permission")) {
    return new PdfToolError(message || "This PDF does not allow that security change with the provided password.");
  }

  return new PdfToolError(message || fallback);
}

async function toUint8Array(file: Blob) {
  return new Uint8Array(await file.arrayBuffer());
}

let pdfModulePromise: Promise<PdfModule> | null = null;
let jsZipModulePromise: Promise<typeof import("jszip")> | null = null;

async function getPdfModule() {
  if (!pdfModulePromise) {
    pdfModulePromise = import("@libpdf/core");
  }

  return pdfModulePromise;
}

async function getJsZipConstructor() {
  if (!jsZipModulePromise) {
    jsZipModulePromise = import("jszip");
  }

  return (await jsZipModulePromise).default;
}

function buildPdfJsLoadOptions(
  source: { data: ArrayBuffer },
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

export async function loadPdfFromFile(file: File, password?: string | null): Promise<LoadedPdf> {
  const bytes = await toUint8Array(file);
  const { PDF } = await getPdfModule();

  try {
    const pdf = await PDF.load(
      bytes,
      normalizePassword(password) ? { credentials: normalizePassword(password) } : undefined
    );
    return { pdf };
  } catch (error) {
    throw toPdfToolError(
      error,
      "We couldn't open that PDF. Make sure the file is valid and try again."
    );
  }
}

function parseRanges(spec: string, maxPages: number): PageRange[] {
  const raw = spec.trim();

  if (!raw) {
    throw new PdfToolError("Page range cannot be empty.");
  }

  const parts = raw
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);

  if (!parts.length) {
    throw new PdfToolError("Page range cannot be empty.");
  }

  return parts.map((part) => {
    if (part.includes("-")) {
      const [startText, endText] = part.split("-", 2).map((value) => value.trim());
      const start = Number(startText);
      const end = Number(endText);

      if (!Number.isInteger(start) || !Number.isInteger(end) || start < 1 || end < 1 || start > end) {
        throw new PdfToolError(`Invalid page range: "${part}".`);
      }

      if (end > maxPages) {
        throw new PdfToolError(`Page range "${part}" exceeds document page count (${maxPages}).`);
      }

      return { start: start - 1, end: end - 1 };
    }

    const page = Number(part);
    if (!Number.isInteger(page) || page < 1) {
      throw new PdfToolError(`Invalid page number: "${part}".`);
    }
    if (page > maxPages) {
      throw new PdfToolError(`Page number "${part}" exceeds document page count (${maxPages}).`);
    }

    return { start: page - 1, end: page - 1 };
  });
}

function flattenRanges(ranges: PageRange[]) {
  const indices: number[] = [];

  ranges.forEach((range) => {
    for (let pageIndex = range.start; pageIndex <= range.end; pageIndex += 1) {
      indices.push(pageIndex);
    }
  });

  return indices;
}

function parsePageOrder(spec: string, maxPages: number) {
  const raw = spec.trim();
  if (!raw) {
    throw new PdfToolError("Page order cannot be empty.");
  }

  const values = raw
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);

  if (!values.length) {
    throw new PdfToolError("Page order cannot be empty.");
  }

  const seen = new Set<number>();

  return values.map((part) => {
    const page = Number(part);
    if (!Number.isInteger(page) || page < 1 || page > maxPages) {
      throw new PdfToolError(`Page number "${part}" is out of bounds (1-${maxPages}).`);
    }

    const zeroIndex = page - 1;
    if (seen.has(zeroIndex)) {
      throw new PdfToolError(`Duplicate page number "${page}" in page order.`);
    }
    seen.add(zeroIndex);
    return zeroIndex;
  });
}

function assertPositiveInteger(value: number | null | undefined, message: string) {
  if (!value || !Number.isInteger(value) || value < 1) {
    throw new PdfToolError(message);
  }

  return value;
}

function saveOptions() {
  return {
    useXRefStream: true,
    compressStreams: true,
    compressionThreshold: 0,
    subsetFonts: true,
  } as const;
}

export function getPdfCompressionProfile(strength: number | null | undefined): PdfCompressionProfile {
  const normalizedStrength = clampCompressionStrength(strength);

  if (normalizedStrength >= 85) {
    return {
      strength: normalizedStrength,
      label: "Maximum",
      description: "Strongest pass. Rebuilds pages more aggressively when the normal PDF rewrite is not enough.",
      compressStreams: true,
      compressionThreshold: 0,
      subsetFonts: true,
      useXRefStream: true,
      renderScale: 0.58,
      imageQuality: 0.32,
    };
  }

  if (normalizedStrength >= 60) {
    return {
      strength: normalizedStrength,
      label: "Strong",
      description: "Good default for most PDFs. Uses stronger rebuilt-page compression when a standard rewrite barely reduces size.",
      compressStreams: true,
      compressionThreshold: 256,
      subsetFonts: true,
      useXRefStream: true,
      renderScale: 0.72,
      imageQuality: 0.45,
    };
  }

  if (normalizedStrength >= 35) {
    return {
      strength: normalizedStrength,
      label: "Balanced",
      description: "Balanced rewrite plus a moderate rebuilt-page fallback when the file still stays too large.",
      compressStreams: true,
      compressionThreshold: 768,
      subsetFonts: true,
      useXRefStream: true,
      renderScale: 0.84,
      imageQuality: 0.58,
    };
  }

  if (normalizedStrength >= 15) {
    return {
      strength: normalizedStrength,
      label: "Light",
      description: "Starts lighter, then steps up only if the PDF still does not shrink enough.",
      compressStreams: true,
      compressionThreshold: 1536,
      subsetFonts: false,
      useXRefStream: true,
      renderScale: 0.92,
      imageQuality: 0.7,
    };
  }

  return {
    strength: normalizedStrength,
    label: "Minimal",
    description: "Gentlest start. If this light pass does not reduce size, the tool automatically tries a stronger fallback.",
    compressStreams: true,
    compressionThreshold: 3072,
    subsetFonts: false,
    useXRefStream: true,
    renderScale: 0.98,
    imageQuality: 0.82,
  };
}

async function canvasToJpegBytes(canvas: HTMLCanvasElement, quality: number) {
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (nextBlob) => {
        if (!nextBlob) {
          reject(new PdfToolError("We couldn't compress the rendered PDF page."));
          return;
        }
        resolve(nextBlob);
      },
      "image/jpeg",
      quality
    );
  });

  return toUint8Array(blob);
}

async function rebuildPdfAsCompressedImages(
  file: File,
  password: string | null | undefined,
  profile: PdfCompressionProfile
) {
  const sourceBytes = await file.arrayBuffer();
  const sourcePdf = await getDocument(
    buildPdfJsLoadOptions(sourceBytes ? { data: sourceBytes } : { data: sourceBytes }, normalizePassword(password))
  ).promise;

  try {
    const { PDF } = await getPdfModule();
    const rebuiltPdf = PDF.create();

    for (let pageNumber = 1; pageNumber <= sourcePdf.numPages; pageNumber += 1) {
      const sourcePage = await sourcePdf.getPage(pageNumber);
      const canvas = document.createElement("canvas");

      try {
        const outputViewport = sourcePage.getViewport({ scale: 1 });
        const renderViewport = sourcePage.getViewport({ scale: profile.renderScale });
        const pageWidth = Math.max(1, outputViewport.width);
        const pageHeight = Math.max(1, outputViewport.height);

        canvas.width = Math.max(1, Math.round(renderViewport.width));
        canvas.height = Math.max(1, Math.round(renderViewport.height));

        const context = canvas.getContext("2d", { alpha: false }) || canvas.getContext("2d");
        if (!context) {
          throw new PdfToolError("Canvas is not available in this browser.");
        }

        context.fillStyle = "#ffffff";
        context.fillRect(0, 0, canvas.width, canvas.height);

        await sourcePage.render({
          canvasContext: context,
          viewport: renderViewport,
        }).promise;

        const imageBytes = await canvasToJpegBytes(canvas, profile.imageQuality);
        const image = rebuiltPdf.embedImage(imageBytes);
        const rebuiltPage = rebuiltPdf.addPage({
          width: pageWidth,
          height: pageHeight,
        });

        rebuiltPage.drawImage(image, {
          x: 0,
          y: 0,
          width: pageWidth,
          height: pageHeight,
        });
      } finally {
        sourcePage.cleanup();
        canvas.width = 1;
        canvas.height = 1;
      }
    }

    return rebuiltPdf.save({
      ...saveOptions(),
      useXRefStream: profile.useXRefStream,
      compressStreams: profile.compressStreams,
      compressionThreshold: profile.compressionThreshold,
      subsetFonts: false,
    });
  } catch (error) {
    throw toPdfToolError(error, "We couldn't rebuild that PDF for stronger compression.");
  } finally {
    await sourcePdf.destroy();
  }
}

async function convertImageFileToPngBytes(file: File) {
  const objectUrl = URL.createObjectURL(file);

  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const nextImage = new Image();
      nextImage.onload = () => resolve(nextImage);
      nextImage.onerror = () => reject(new PdfToolError(`Could not read image "${file.name}".`));
      nextImage.src = objectUrl;
    });

    const canvas = document.createElement("canvas");
    canvas.width = image.naturalWidth || image.width;
    canvas.height = image.naturalHeight || image.height;
    const context = canvas.getContext("2d");

    if (!context) {
      throw new PdfToolError("Canvas is not available in this browser.");
    }

    context.drawImage(image, 0, 0, canvas.width, canvas.height);

    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (nextBlob) => {
          if (!nextBlob) {
            reject(new PdfToolError(`Could not convert "${file.name}" into PNG for PDF output.`));
            return;
          }
          resolve(nextBlob);
        },
        "image/png",
        1
      );
    });

    return toUint8Array(blob);
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

async function normalizeImageBytesForPdf(file: File) {
  if (isJpegFile(file) || isPngFile(file)) {
    return toUint8Array(file);
  }

  return convertImageFileToPngBytes(file);
}

function hexToRgb(color: string) {
  const normalized = color.trim().replace(/^#/, "");
  const expanded =
    normalized.length === 3
      ? normalized
          .split("")
          .map((char) => `${char}${char}`)
          .join("")
      : normalized;

  if (!/^[0-9a-fA-F]{6}$/.test(expanded)) {
    throw new PdfToolError('Color must be a valid hex value, for example "#111111".');
  }

  return {
    red: parseInt(expanded.slice(0, 2), 16) / 255,
    green: parseInt(expanded.slice(2, 4), 16) / 255,
    blue: parseInt(expanded.slice(4, 6), 16) / 255,
  };
}

export async function compressPdfFile(
  file: File,
  options?: { password?: string | null; strength?: number | null }
) {
  const originalBytes = await toUint8Array(file);
  const profile = getPdfCompressionProfile(options?.strength);
  const { pdf } = await loadPdfFromFile(file, options?.password);
  const rewrittenBytes = await pdf.save({
    ...saveOptions(),
    useXRefStream: profile.useXRefStream,
    compressStreams: profile.compressStreams,
    compressionThreshold: profile.compressionThreshold,
    subsetFonts: profile.subsetFonts,
  });

  let bestBytes = rewrittenBytes.length < originalBytes.length ? rewrittenBytes : originalBytes;

  if (rewrittenBytes.length >= file.size * 0.98 || profile.strength >= 35) {
    const rebuiltBytes = await rebuildPdfAsCompressedImages(file, options?.password, profile);
    if (rebuiltBytes.length < bestBytes.length) {
      bestBytes = rebuiltBytes;
    }

    if (bestBytes.length >= file.size * 0.98 && profile.strength < 85) {
      const maximumBytes = await rebuildPdfAsCompressedImages(file, options?.password, getPdfCompressionProfile(100));
      if (maximumBytes.length < bestBytes.length) {
        bestBytes = maximumBytes;
      }
    }
  }

  return buildFile(bestBytes, `${baseName(file.name, "document")}-compressed.pdf`, "application/pdf");
}

export async function mergePdfFiles(files: File[]) {
  if (files.length < 2) {
    throw new PdfToolError("Select at least two PDF files to merge.");
  }

  const payloads = await Promise.all(files.map((file) => toUint8Array(file)));
  const { PDF } = await getPdfModule();

  try {
    const merged = await PDF.merge(payloads);
    const bytes = await merged.save(saveOptions());
    return buildFile(bytes, "merged.pdf", "application/pdf");
  } catch (error) {
    throw toPdfToolError(error, "We couldn't merge those PDFs.");
  }
}

export async function splitPdfFile(
  file: File,
  options: { ranges?: string | null; pagesPerFile?: number | null; password?: string | null }
) {
  const { pdf } = await loadPdfFromFile(file, options.password);
  const totalPages = pdf.getPageCount();

  if (totalPages === 0) {
    throw new PdfToolError("Cannot split an empty PDF.");
  }

  const JSZip = await getJsZipConstructor();

  const parts: PageRange[] = [];
  const ranges = options.ranges?.trim();

  if (ranges) {
    parts.push(...parseRanges(ranges, totalPages));
  } else {
    const size = assertPositiveInteger(
      options.pagesPerFile ?? null,
      "Provide either page ranges or a valid pages-per-file value."
    );

    for (let start = 0; start < totalPages; start += size) {
      parts.push({ start, end: Math.min(totalPages - 1, start + size - 1) });
    }
  }

  const zip = new JSZip();

  for (let index = 0; index < parts.length; index += 1) {
    const part = parts[index];
    const extracted = await pdf.extractPages(
      Array.from({ length: part.end - part.start + 1 }, (_, offset) => part.start + offset)
    );
    const bytes = await extracted.save(saveOptions());
    zip.file(`part-${String(index + 1).padStart(2, "0")}-pages-${part.start + 1}-${part.end + 1}.pdf`, bytes);
  }

  const blob = await zip.generateAsync({
    type: "blob",
    compression: "DEFLATE",
    compressionOptions: { level: 6 },
  });

  return {
    blob,
    name: `${baseName(file.name, "document")}-split.zip`,
    mimeType: "application/zip",
  } satisfies BrowserProcessedFile;
}

export async function extractPdfPages(
  file: File,
  options: { pages: string; password?: string | null }
) {
  const { pdf } = await loadPdfFromFile(file, options.password);
  const totalPages = pdf.getPageCount();

  if (totalPages === 0) {
    throw new PdfToolError("Cannot extract pages from an empty PDF.");
  }

  const indices = flattenRanges(parseRanges(options.pages, totalPages));
  const extracted = await pdf.extractPages(indices);
  const bytes = await extracted.save(saveOptions());
  return buildFile(bytes, `${baseName(file.name, "document")}-extracted.pdf`, "application/pdf");
}

export async function rotatePdfPages(
  file: File,
  options: { degrees: number; pages?: string | null; password?: string | null }
) {
  if (![90, 180, 270].includes(options.degrees)) {
    throw new PdfToolError("Rotation must be one of: 90, 180, 270.");
  }

  const { pdf } = await loadPdfFromFile(file, options.password);
  const totalPages = pdf.getPageCount();

  if (totalPages === 0) {
    throw new PdfToolError("Cannot rotate pages in an empty PDF.");
  }

  const targetPages = options.pages?.trim()
    ? new Set(flattenRanges(parseRanges(options.pages, totalPages)))
    : new Set(Array.from({ length: totalPages }, (_, index) => index));

  pdf.getPages().forEach((page, index) => {
    if (!targetPages.has(index)) {
      return;
    }

    const nextRotation = ((page.rotation + options.degrees) % 360) as 0 | 90 | 180 | 270;
    page.setRotation(nextRotation);
  });

  const bytes = await pdf.save(saveOptions());
  return buildFile(bytes, `${baseName(file.name, "document")}-rotated.pdf`, "application/pdf");
}

export async function removePdfPages(
  file: File,
  options: { pages: string; password?: string | null }
) {
  const { pdf } = await loadPdfFromFile(file, options.password);
  const totalPages = pdf.getPageCount();

  if (totalPages === 0) {
    throw new PdfToolError("Cannot remove pages from an empty PDF.");
  }

  const toRemove = Array.from(new Set(flattenRanges(parseRanges(options.pages, totalPages)))).sort(
    (left, right) => right - left
  );

  if (toRemove.length >= totalPages) {
    throw new PdfToolError("Cannot remove all pages from the PDF.");
  }

  toRemove.forEach((index) => {
    pdf.removePage(index);
  });

  const bytes = await pdf.save(saveOptions());
  return buildFile(bytes, `${baseName(file.name, "document")}-trimmed.pdf`, "application/pdf");
}

export async function reorderPdfPages(
  file: File,
  options: { order: string; password?: string | null }
) {
  const { pdf } = await loadPdfFromFile(file, options.password);
  const { PDF } = await getPdfModule();
  const totalPages = pdf.getPageCount();

  if (totalPages === 0) {
    throw new PdfToolError("Cannot reorder pages in an empty PDF.");
  }

  const order = parsePageOrder(options.order, totalPages);
  const nextPdf = PDF.create();
  await nextPdf.copyPagesFrom(pdf, order);
  const bytes = await nextPdf.save(saveOptions());
  return buildFile(bytes, `${baseName(file.name, "document")}-reordered.pdf`, "application/pdf");
}

export async function lockPdfFile(
  file: File,
  options: { userPassword: string; ownerPassword?: string | null; password?: string | null }
) {
  const userPassword = options.userPassword.trim();
  if (!userPassword) {
    throw new PdfToolError("User password is required to lock a PDF.");
  }

  const { pdf } = await loadPdfFromFile(file, options.password);

  try {
    pdf.setProtection({
      userPassword,
      ownerPassword: normalizePassword(options.ownerPassword) || userPassword,
      algorithm: "AES-256",
      permissions: {
        print: true,
        printHighQuality: true,
        modify: true,
        copy: true,
        annotate: true,
        fillForms: true,
        assembleDocument: true,
        extractForAccessibility: true,
      },
      encryptMetadata: true,
    });
  } catch (error) {
    throw toPdfToolError(error, "We couldn't protect that PDF.");
  }

  const bytes = await pdf.save(saveOptions());
  return buildFile(bytes, `${baseName(file.name, "document")}-locked.pdf`, "application/pdf");
}

export async function unlockPdfFile(file: File, password: string) {
  const normalizedPassword = password.trim();
  if (!normalizedPassword) {
    throw new PdfToolError("Password is required to unlock the PDF.");
  }

  const { pdf } = await loadPdfFromFile(file, normalizedPassword);

  if (pdf.isEncrypted) {
    try {
      pdf.removeProtection();
    } catch (error) {
      throw toPdfToolError(
        error,
        "The provided password can open the PDF, but it does not allow removing protection."
      );
    }
  }

  const bytes = await pdf.save(saveOptions());
  return buildFile(bytes, `${baseName(file.name, "document")}-unlocked.pdf`, "application/pdf");
}

export async function updatePdfMetadata(
  file: File,
  options: {
    title?: string | null;
    author?: string | null;
    subject?: string | null;
    keywords?: string | null;
    creator?: string | null;
    producer?: string | null;
    password?: string | null;
  }
) {
  const { pdf } = await loadPdfFromFile(file, options.password);

  const title = options.title?.trim();
  const author = options.author?.trim();
  const subject = options.subject?.trim();
  const keywords = options.keywords
    ?.split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  const creator = options.creator?.trim();
  const producer = options.producer?.trim();

  if (title) {
    pdf.setTitle(title, { showInWindowTitleBar: true });
  }
  if (author) {
    pdf.setAuthor(author);
  }
  if (subject) {
    pdf.setSubject(subject);
  }
  if (keywords?.length) {
    pdf.setKeywords(keywords);
  }
  if (creator) {
    pdf.setCreator(creator);
  }
  if (producer) {
    pdf.setProducer(producer);
  }
  pdf.setModificationDate(new Date());

  const bytes = await pdf.save(saveOptions());
  return buildFile(bytes, `${baseName(file.name, "document")}-metadata.pdf`, "application/pdf");
}

export async function imagesToPdfFile(files: File[]) {
  if (!files.length) {
    throw new PdfToolError("Select at least one image file.");
  }

  const { PDF } = await getPdfModule();
  const pdf = PDF.create();

  for (const file of files) {
    const imageBytes = await normalizeImageBytesForPdf(file);
    let image;

    try {
      image = pdf.embedImage(imageBytes);
    } catch (error) {
      throw toPdfToolError(error, `Image "${file.name}" is not a supported PDF image source.`);
    }

    const page = pdf.addPage({
      width: Math.max(1, image.widthInPoints),
      height: Math.max(1, image.heightInPoints),
    });

    page.drawImage(image, {
      x: 0,
      y: 0,
      width: image.widthInPoints,
      height: image.heightInPoints,
    });
  }

  const bytes = await pdf.save(saveOptions());
  return buildFile(bytes, "images-to-pdf.pdf", "application/pdf");
}

export async function annotatePdfFile(
  file: File,
  options: {
    pageNumber: number;
    text?: string | null;
    textX?: number;
    textY?: number;
    fontSize?: number;
    color?: string;
    imageFile?: File | null;
    imageX?: number | null;
    imageY?: number | null;
    imageWidth?: number | null;
    imageHeight?: number | null;
    password?: string | null;
  }
) {
  const pageNumber = assertPositiveInteger(options.pageNumber, "Page number must be 1 or greater.");
  const fontSize =
    typeof options.fontSize === "number" && Number.isFinite(options.fontSize) && options.fontSize > 0
      ? options.fontSize
      : 16;
  const text = options.text?.trim() || "";

  if (!text && !options.imageFile) {
    throw new PdfToolError("Provide text or an image to apply edits.");
  }

  const { pdf } = await loadPdfFromFile(file, options.password);
  const { rgb } = await getPdfModule();
  const totalPages = pdf.getPageCount();

  if (totalPages === 0) {
    throw new PdfToolError("Cannot edit an empty PDF.");
  }
  if (pageNumber > totalPages) {
    throw new PdfToolError(`Page number ${pageNumber} exceeds total pages (${totalPages}).`);
  }

  const page = pdf.getPage(pageNumber - 1);
  if (!page) {
    throw new PdfToolError("We couldn't load the selected page.");
  }

  const color = hexToRgb(options.color || "#111111");
  const textX = Number.isFinite(options.textX) ? options.textX : 40;
  const textY = Number.isFinite(options.textY) ? options.textY : 740;

  if (text) {
    page.drawText(text, {
      x: textX,
      y: textY,
      size: fontSize,
      lineHeight: fontSize * 1.2,
      color: rgb(color.red, color.green, color.blue),
    });
  }

  if (options.imageFile) {
    const imageBytes = await normalizeImageBytesForPdf(options.imageFile);
    const image = pdf.embedImage(imageBytes);
    const width =
      typeof options.imageWidth === "number" && Number.isFinite(options.imageWidth) && options.imageWidth > 0
        ? options.imageWidth
        : image.widthInPoints;
    const height =
      typeof options.imageHeight === "number" && Number.isFinite(options.imageHeight) && options.imageHeight > 0
        ? options.imageHeight
        : image.heightInPoints;

    page.drawImage(image, {
      x: typeof options.imageX === "number" && Number.isFinite(options.imageX) ? options.imageX : textX,
      y: typeof options.imageY === "number" && Number.isFinite(options.imageY) ? options.imageY : textY,
      width,
      height,
    });
  }

  const bytes = await pdf.save(saveOptions());
  return buildFile(bytes, `${baseName(file.name, "document")}-edited.pdf`, "application/pdf");
}
