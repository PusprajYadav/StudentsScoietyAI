import { format } from "date-fns";
import QRCodeStyling from "qr-code-styling";
import type { FileExtension, Gradient, Options } from "qr-code-styling/lib/types";
import type {
  BarcodeFormatKey,
  GradientSettings,
  NormalizedQrValue,
  ParsedDetectedContent,
  QrContentType,
  QrStyleSettings,
} from "./types";

export const DEFAULT_QR_STYLE: QrStyleSettings = {
  width: 288,
  height: 288,
  margin: 14,
  dotStyle: "classy-rounded",
  cornerSquareStyle: "extra-rounded",
  cornerDotStyle: "dot",
  foregroundColor: "#0f172a",
  backgroundColor: "#ffffff",
  gradient: {
    enabled: true,
    type: "linear",
    start: "#0f172a",
    end: "#2563eb",
    rotation: 28,
  },
  backgroundGradient: {
    enabled: true,
    type: "linear",
    start: "#ffffff",
    end: "#e0f2fe",
    rotation: 135,
  },
  logoDataUrl: null,
  logoSize: 20,
  logoMargin: 6,
  hideBackgroundDots: true,
  labelEnabled: false,
  labelText: "StudentSociety.in",
  labelColor: "#eff6ff",
  labelBackgroundColor: "#0f172a",
  captionEnabled: true,
  captionText: "Scan to open",
  captionColor: "#334155",
  frameStyle: "gradient",
  frameColor: "#0f172a",
  frameAccentColor: "#2563eb",
  framePadding: 12,
  frameRadius: 28,
};

export const DEFAULT_BARCODE_STYLE = {
  format: "CODE128" as BarcodeFormatKey,
  width: 2.4,
  height: 120,
  displayValue: true,
  lineColor: "#0f172a",
  background: "#f8fafc",
  margin: 16,
  fontSize: 18,
  textMargin: 8,
};

const QR_EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const QR_SCHEME_REGEX = /^[a-z][a-z\d+\-.]*:/i;
const PHONE_LIKE_REGEX = /^\+?[0-9][0-9\s\-().]{6,}$/;

function gradientToQr(gradient: GradientSettings): Gradient | undefined {
  if (!gradient.enabled) {
    return undefined;
  }

  return {
    type: gradient.type,
    rotation: (gradient.rotation * Math.PI) / 180,
    colorStops: [
      { offset: 0, color: gradient.start },
      { offset: 1, color: gradient.end },
    ],
  };
}

export function buildQrCodeOptions(data: string, style: QrStyleSettings, scale = 1): Partial<Options> {
  const foregroundGradient = gradientToQr(style.gradient);
  const backgroundGradient = gradientToQr(style.backgroundGradient);

  return {
    type: "svg",
    width: Math.round(style.width * scale),
    height: Math.round(style.height * scale),
    margin: Math.round(style.margin * scale),
    data,
    image: style.logoDataUrl || undefined,
    qrOptions: {
      errorCorrectionLevel: style.logoDataUrl ? "H" : "M",
    },
    imageOptions: {
      hideBackgroundDots: style.hideBackgroundDots,
      imageSize: style.logoSize / 100,
      margin: Math.round(style.logoMargin * scale),
      saveAsBlob: true,
      crossOrigin: "anonymous",
    },
    dotsOptions: foregroundGradient
      ? {
          type: style.dotStyle,
          gradient: foregroundGradient,
        }
      : {
          type: style.dotStyle,
          color: style.foregroundColor,
        },
    cornersSquareOptions: foregroundGradient
      ? {
          type: style.cornerSquareStyle,
          gradient: foregroundGradient,
        }
      : {
          type: style.cornerSquareStyle,
          color: style.foregroundColor,
        },
    cornersDotOptions: foregroundGradient
      ? {
          type: style.cornerDotStyle,
          gradient: foregroundGradient,
        }
      : {
          type: style.cornerDotStyle,
          color: style.foregroundColor,
        },
    backgroundOptions: backgroundGradient
      ? {
          gradient: backgroundGradient,
        }
      : {
          color: style.backgroundColor,
        },
  };
}

export function createQrCodeInstance(data: string, style: QrStyleSettings, scale = 1) {
  return new QRCodeStyling(buildQrCodeOptions(data, style, scale));
}

function qrMimeType(extension: FileExtension) {
  if (extension === "svg") return "image/svg+xml";
  if (extension === "jpeg") return "image/jpeg";
  if (extension === "webp") return "image/webp";
  return "image/png";
}

export async function toQrBlob(instance: QRCodeStyling, extension: FileExtension) {
  const raw = (await instance.getRawData(extension)) as unknown;

  if (!raw) {
    throw new Error("Unable to export this QR code.");
  }

  if (raw instanceof Blob) {
    return raw;
  }

  return new Blob([raw as BlobPart], { type: qrMimeType(extension) });
}

export async function fileToDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;

      if (typeof result !== "string") {
        reject(new Error("Could not read that file."));
        return;
      }

      resolve(result);
    };
    reader.onerror = () => reject(new Error("Could not read that file."));
    reader.readAsDataURL(file);
  });
}

export function normalizeQrValue(type: QrContentType, rawValue: string) {
  const value = rawValue.trim();

  if (!value) {
    return {
      value: null as NormalizedQrValue | null,
      error: "Add something to encode first.",
    };
  }

  if (type === "text") {
    return {
      value: {
        encodedValue: value,
        storedValue: value,
        displayValue: value,
      },
      error: null,
    };
  }

  if (type === "email") {
    const normalizedEmail = value.toLowerCase();

    if (!QR_EMAIL_REGEX.test(normalizedEmail)) {
      return {
        value: null as NormalizedQrValue | null,
        error: "Enter a valid email address.",
      };
    }

    return {
      value: {
        encodedValue: `mailto:${normalizedEmail}`,
        storedValue: `mailto:${normalizedEmail}`,
        displayValue: normalizedEmail,
      },
      error: null,
    };
  }

  if (type === "phone") {
    const digitsOnly = value.replace(/[^\d]/g, "");
    const normalizedPhone = value.startsWith("+") ? `+${digitsOnly}` : digitsOnly;

    if (digitsOnly.length < 7) {
      return {
        value: null as NormalizedQrValue | null,
        error: "Enter a valid phone number.",
      };
    }

    return {
      value: {
        encodedValue: `tel:${normalizedPhone}`,
        storedValue: `tel:${normalizedPhone}`,
        displayValue: normalizedPhone,
      },
      error: null,
    };
  }

  const normalizedUrl = QR_SCHEME_REGEX.test(value) ? value : `https://${value}`;

  try {
    const parsed = new URL(normalizedUrl);
    return {
      value: {
        encodedValue: parsed.toString(),
        storedValue: parsed.toString(),
        displayValue: parsed.toString(),
      },
      error: null,
    };
  } catch {
    return {
      value: null as NormalizedQrValue | null,
      error: "Enter a valid website URL.",
    };
  }
}

export function unwrapStoredQrValue(type: QrContentType, storedValue: string) {
  if (type === "email" && storedValue.startsWith("mailto:")) {
    return storedValue.slice("mailto:".length);
  }

  if (type === "phone" && storedValue.startsWith("tel:")) {
    return storedValue.slice("tel:".length);
  }

  return storedValue;
}

export function parseDetectedContent(rawValue: string): ParsedDetectedContent {
  const raw = rawValue.trim();

  if (!raw) {
    return {
      raw: rawValue,
      kind: "text",
      displayValue: rawValue,
    };
  }

  if (raw.toLowerCase().startsWith("mailto:")) {
    const displayValue = decodeURIComponent(raw.slice("mailto:".length));
    return {
      raw,
      kind: "email",
      displayValue,
      actionHref: raw,
      actionLabel: "Send email",
    };
  }

  if (raw.toLowerCase().startsWith("tel:")) {
    const displayValue = raw.slice("tel:".length);
    return {
      raw,
      kind: "phone",
      displayValue,
      actionHref: raw,
      actionLabel: "Call now",
    };
  }

  if (QR_EMAIL_REGEX.test(raw.toLowerCase())) {
    return {
      raw,
      kind: "email",
      displayValue: raw.toLowerCase(),
      actionHref: `mailto:${raw.toLowerCase()}`,
      actionLabel: "Send email",
    };
  }

  const looksLikeUrl = raw.startsWith("www.") || QR_SCHEME_REGEX.test(raw);

  if (looksLikeUrl) {
    const normalizedUrl = QR_SCHEME_REGEX.test(raw) ? raw : `https://${raw}`;

    try {
      const parsed = new URL(normalizedUrl);
      return {
        raw,
        kind: "url",
        displayValue: parsed.toString(),
        actionHref: parsed.toString(),
        actionLabel: "Open link",
      };
    } catch {
      // Fall through to text.
    }
  }

  if (PHONE_LIKE_REGEX.test(raw)) {
    const digitsOnly = raw.replace(/[^\d]/g, "");
    const normalizedPhone = raw.startsWith("+") ? `+${digitsOnly}` : digitsOnly;

    return {
      raw,
      kind: "phone",
      displayValue: normalizedPhone,
      actionHref: `tel:${normalizedPhone}`,
      actionLabel: "Call now",
    };
  }

  return {
    raw,
    kind: "text",
    displayValue: raw,
  };
}

export function normalizeBarcodeValue(format: BarcodeFormatKey, rawValue: string) {
  const value = rawValue.trim();

  if (!value) {
    return {
      value: "",
      error: "Add some text or numbers first.",
    };
  }

  if (format === "CODE128") {
    return {
      value,
      error: null,
    };
  }

  const digitsOnly = value.replace(/[^\d]/g, "");

  if (format === "EAN13") {
    if (digitsOnly.length !== 12 && digitsOnly.length !== 13) {
      return {
        value: digitsOnly,
        error: "EAN-13 needs 12 or 13 digits.",
      };
    }

    return {
      value: digitsOnly,
      error: null,
    };
  }

  if (digitsOnly.length !== 11 && digitsOnly.length !== 12) {
    return {
      value: digitsOnly,
      error: "UPC-A needs 11 or 12 digits.",
    };
  }

  return {
    value: digitsOnly,
    error: null,
  };
}

export function generateShortCode(length = 7) {
  const alphabet = "23456789abcdefghjkmnpqrstuvwxyz";
  const bytes = crypto.getRandomValues(new Uint8Array(length));

  return Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join("");
}

export function createShortUrl(shortCode: string) {
  const path = `/qr/${shortCode}`;

  if (typeof window === "undefined") {
    return `https://studentsociety.in${path}`;
  }

  const { origin, hostname } = window.location;
  const isLocalHost = hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";
  const base = isLocalHost ? "https://studentsociety.in" : origin;

  try {
    return new URL(path, base).toString();
  } catch {
    return `${base}${path}`;
  }
}

export function formatCodeTimestamp(timestamp: string) {
  try {
    return format(new Date(timestamp), "dd MMM yyyy, h:mm a");
  } catch {
    return timestamp;
  }
}

export function createDraftName(title: string, fallback: string) {
  const cleaned = title.trim();
  return cleaned ? cleaned : fallback;
}

export async function copyText(value: string) {
  await navigator.clipboard.writeText(value);
}

export async function copyBlob(blob: Blob) {
  if (typeof ClipboardItem === "undefined" || !navigator.clipboard?.write) {
    throw new Error("Clipboard image copy is not supported in this browser.");
  }

  await navigator.clipboard.write([new ClipboardItem({ [blob.type]: blob })]);
}

export async function shareBlob(options: {
  blob: Blob;
  fileName: string;
  title?: string;
  text?: string;
}) {
  if (!navigator.share) {
    throw new Error("Sharing is not available in this browser.");
  }

  const file = new File([options.blob], options.fileName, { type: options.blob.type });

  if (navigator.canShare?.({ files: [file] })) {
    await navigator.share({
      files: [file],
      title: options.title,
      text: options.text,
    });
    return;
  }

  await navigator.share({
    title: options.title,
    text: options.text,
  });
}

export function serializeSvg(svgElement: SVGSVGElement) {
  return new XMLSerializer().serializeToString(svgElement);
}

function svgBlob(svgMarkup: string) {
  return new Blob([svgMarkup], { type: "image/svg+xml;charset=utf-8" });
}

export async function svgMarkupToPngBlob(svgMarkup: string, width: number, height: number, scale = 3) {
  const url = URL.createObjectURL(svgBlob(svgMarkup));

  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const nextImage = new Image();
      nextImage.onload = () => resolve(nextImage);
      nextImage.onerror = () => reject(new Error("Could not render the image preview."));
      nextImage.src = url;
    });

    const canvas = document.createElement("canvas");
    canvas.width = Math.round(width * scale);
    canvas.height = Math.round(height * scale);
    const context = canvas.getContext("2d");

    if (!context) {
      throw new Error("Canvas export is unavailable.");
    }

    context.scale(scale, scale);
    context.drawImage(image, 0, 0, width, height);

    return new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (!blob) {
          reject(new Error("Could not export the PNG file."));
          return;
        }

        resolve(blob);
      }, "image/png");
    });
  } finally {
    URL.revokeObjectURL(url);
  }
}

export async function svgElementToBlob(svgElement: SVGSVGElement, format: "svg" | "png", scale = 3) {
  const svgMarkup = serializeSvg(svgElement);

  if (format === "svg") {
    return svgBlob(svgMarkup);
  }

  const width = Number(svgElement.getAttribute("width")) || svgElement.viewBox.baseVal.width || 640;
  const height = Number(svgElement.getAttribute("height")) || svgElement.viewBox.baseVal.height || 240;

  return svgMarkupToPngBlob(svgMarkup, width, height, scale);
}

export async function exportElementToBlob(
  element: HTMLElement,
  format: "png" | "jpeg",
  scale = 3
) {
  const { default: html2canvas } = await import("html2canvas");
  const canvas = await html2canvas(element, {
    backgroundColor: null,
    scale,
    useCORS: true,
  });

  const mimeType = format === "jpeg" ? "image/jpeg" : "image/png";

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("Could not export this preview."));
          return;
        }

        resolve(blob);
      },
      mimeType,
      format === "jpeg" ? 0.95 : undefined
    );
  });
}
