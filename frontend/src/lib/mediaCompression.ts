const DEFAULT_IMAGE_QUALITY = 0.12;
const DEFAULT_TARGET_SIZE_RATIO = 0.1;
const MIN_IMAGE_QUALITY = 0.05;
const MIN_TARGET_BYTES = 24 * 1024;

const SKIPPED_IMAGE_TYPES = new Set(["image/gif", "image/svg+xml"]);

const OUTPUT_EXTENSION_BY_TYPE: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
};

type UploadCompressionContext = "avatar" | "banner" | "post" | "chat" | "whitebook" | "study_note";

interface CompressionSettings {
  maxDimension: number;
  outputType: "image/webp" | "image/jpeg";
  quality: number;
  targetSizeRatio: number;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function shouldAttemptImageCompression(file: File) {
  if (SKIPPED_IMAGE_TYPES.has(file.type)) {
    return false;
  }

  if (file.type.startsWith("image/")) {
    return true;
  }

  const normalizedName = file.name.toLowerCase();
  return [".png", ".jpg", ".jpeg", ".webp", ".bmp", ".avif", ".heic", ".heif"].some((extension) =>
    normalizedName.endsWith(extension)
  );
}

function replaceFileExtension(fileName: string, nextExtension: string) {
  const sanitizedName = fileName.trim() || "upload";
  const dotIndex = sanitizedName.lastIndexOf(".");
  const stem = dotIndex > 0 ? sanitizedName.slice(0, dotIndex) : sanitizedName;
  return `${stem}${nextExtension}`;
}

function loadImageElement(file: File) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const image = new Image();

    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(image);
    };

    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("This image format could not be loaded for compression."));
    };

    image.src = objectUrl;
  });
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
          return;
        }

        reject(new Error("The browser could not compress this image."));
      },
      type,
      quality
    );
  });
}

function getCompressionSettings(context: UploadCompressionContext): CompressionSettings {
  switch (context) {
    case "avatar":
      return {
        maxDimension: 1024,
        outputType: "image/webp",
        quality: DEFAULT_IMAGE_QUALITY,
        targetSizeRatio: DEFAULT_TARGET_SIZE_RATIO,
      };
    case "banner":
      return {
        maxDimension: 1920,
        outputType: "image/webp",
        quality: DEFAULT_IMAGE_QUALITY,
        targetSizeRatio: DEFAULT_TARGET_SIZE_RATIO,
      };
    case "chat":
      return {
        maxDimension: 1600,
        outputType: "image/webp",
        quality: DEFAULT_IMAGE_QUALITY,
        targetSizeRatio: DEFAULT_TARGET_SIZE_RATIO,
      };
    case "whitebook":
      return {
        maxDimension: 1800,
        outputType: "image/webp",
        quality: DEFAULT_IMAGE_QUALITY,
        targetSizeRatio: DEFAULT_TARGET_SIZE_RATIO,
      };
    case "study_note":
      return {
        maxDimension: 1600,
        outputType: "image/webp",
        quality: DEFAULT_IMAGE_QUALITY,
        targetSizeRatio: DEFAULT_TARGET_SIZE_RATIO,
      };
    case "post":
    default:
      return {
        maxDimension: 1600,
        outputType: "image/webp",
        quality: DEFAULT_IMAGE_QUALITY,
        targetSizeRatio: DEFAULT_TARGET_SIZE_RATIO,
      };
  }
}

async function renderCompressedBlob(
  image: HTMLImageElement,
  width: number,
  height: number,
  type: CompressionSettings["outputType"],
  quality: number
) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("The browser could not create an image-compression canvas.");
  }

  context.clearRect(0, 0, width, height);
  context.drawImage(image, 0, 0, width, height);

  return canvasToBlob(canvas, type, quality);
}

async function compressImageForUpload(file: File, context: UploadCompressionContext) {
  if (!shouldAttemptImageCompression(file)) {
    return file;
  }

  if (typeof window === "undefined" || typeof document === "undefined" || typeof URL === "undefined") {
    return file;
  }

  const settings = getCompressionSettings(context);

  try {
    const image = await loadImageElement(file);
    const naturalWidth = image.naturalWidth || image.width;
    const naturalHeight = image.naturalHeight || image.height;

    if (!naturalWidth || !naturalHeight) {
      return file;
    }

    const scale = Math.min(1, settings.maxDimension / Math.max(naturalWidth, naturalHeight));
    let width = Math.max(1, Math.round(naturalWidth * scale));
    let height = Math.max(1, Math.round(naturalHeight * scale));
    let quality = clamp(settings.quality, MIN_IMAGE_QUALITY, 1);
    const targetBytes = Math.max(MIN_TARGET_BYTES, Math.floor(file.size * settings.targetSizeRatio));

    let blob = await renderCompressedBlob(image, width, height, settings.outputType, quality);

    for (let attempt = 0; attempt < 10 && blob.size > targetBytes; attempt += 1) {
      if (quality > MIN_IMAGE_QUALITY) {
        quality = clamp(Number((quality - 0.03).toFixed(2)), MIN_IMAGE_QUALITY, 1);
      } else {
        width = Math.max(1, Math.round(width * 0.82));
        height = Math.max(1, Math.round(height * 0.82));
      }

      blob = await renderCompressedBlob(image, width, height, settings.outputType, quality);
    }

    if (blob.size >= file.size) {
      return file;
    }

    const outputType = blob.type || settings.outputType;
    return new File([blob], replaceFileExtension(file.name, OUTPUT_EXTENSION_BY_TYPE[outputType] || ".webp"), {
      type: outputType,
      lastModified: file.lastModified || Date.now(),
    });
  } catch (error) {
    console.warn("Image compression failed, uploading the original file instead.", error);
    return file;
  }
}

export async function prepareManagedMediaUploadFile(input: {
  file: File;
  usage: string;
}) {
  switch (input.usage) {
    case "avatar":
      return compressImageForUpload(input.file, "avatar");
    case "banner":
      return compressImageForUpload(input.file, "banner");
    case "post_image":
      return compressImageForUpload(input.file, "post");
    default:
      return input.file;
  }
}

export async function prepareChatImageUploadFile(file: File) {
  return compressImageForUpload(file, "chat");
}

export async function prepareWhitebookImageFile(file: File) {
  return compressImageForUpload(file, "whitebook");
}

export async function prepareStudyNotesAttachmentFile(file: File) {
  return compressImageForUpload(file, "study_note");
}
