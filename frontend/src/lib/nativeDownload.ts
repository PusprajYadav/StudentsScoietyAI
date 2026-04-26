import { Capacitor, registerPlugin } from "@capacitor/core";
import { Directory, Filesystem } from "@capacitor/filesystem";
import { Toast } from "@capacitor/toast";

const NATIVE_DOWNLOAD_FOLDER = "Student Society";

interface NativeDownloadsPlugin {
  saveFile(options: {
    fileName: string;
    base64Data: string;
    mimeType: string;
    subdirectory?: string;
  }): Promise<{
    uri: string;
    relativePath?: string;
    absolutePath?: string;
    fileName: string;
    byteLength: number;
  }>;
}

const NativeDownloads = registerPlugin<NativeDownloadsPlugin>("NativeDownloads");

function sanitizeNativeFileName(fileName: string) {
  const trimmed = fileName.trim() || "download";
  const sanitized = Array.from(trimmed, (character) => {
    const code = character.charCodeAt(0);
    const isControlCharacter = code >= 0 && code <= 31;
    return isControlCharacter || '<>:"/\\|?*'.includes(character) ? "-" : character;
  }).join("");
  return sanitized.slice(0, 180);
}

async function blobToBase64(blob: Blob) {
  const buffer = await blob.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;
  let binary = "";

  for (let index = 0; index < bytes.length; index += chunkSize) {
    const chunk = bytes.subarray(index, index + chunkSize);
    binary += String.fromCharCode(...chunk);
  }

  if (typeof btoa !== "function") {
    throw new Error("Base64 encoding is not available on this device.");
  }

  return btoa(binary);
}

function resolveMimeType(blob: Blob, fileName: string) {
  if (blob.type) {
    return blob.type;
  }

  const normalizedName = fileName.trim().toLowerCase();

  if (normalizedName.endsWith(".pdf")) {
    return "application/pdf";
  }

  if (normalizedName.endsWith(".png")) {
    return "image/png";
  }

  if (normalizedName.endsWith(".jpg") || normalizedName.endsWith(".jpeg")) {
    return "image/jpeg";
  }

  if (normalizedName.endsWith(".webp")) {
    return "image/webp";
  }

  return "application/octet-stream";
}

async function saveBlobToAndroidDownloads(blob: Blob, fileName: string) {
  const safeFileName = sanitizeNativeFileName(fileName);

  return NativeDownloads.saveFile({
    fileName: safeFileName,
    base64Data: await blobToBase64(blob),
    mimeType: resolveMimeType(blob, safeFileName),
    subdirectory: NATIVE_DOWNLOAD_FOLDER,
  });
}

async function saveBlobToNativeFiles(blob: Blob, fileName: string) {
  return saveBlobToAndroidDownloads(blob, fileName);
}

export async function downloadBlobNatively(
  blob: Blob,
  fileName: string,
  onSuccess?: () => void,
  onError?: (err: Error) => void
) {
  if (!Capacitor.isNativePlatform()) {
    // Normal Web behavior.
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = fileName;
    document.body.appendChild(anchor);
    anchor.click();
    setTimeout(() => {
      document.body.removeChild(anchor);
      URL.revokeObjectURL(url);
    }, 1200);
    if (onSuccess) onSuccess();
    return;
  }

  try {
    await Toast.show({
      text: `Downloading ${fileName}...`,
      duration: "short",
      position: "center",
    });

    const platform = Capacitor.getPlatform();

    if (platform === "android") {
      const permission = await Filesystem.checkPermissions();
      if (permission.publicStorage !== "granted") {
        const requested = await Filesystem.requestPermissions();
        if (requested.publicStorage !== "granted") {
          throw new Error("Storage permission was denied.");
        }
      }

      const savedFile = await saveBlobToNativeFiles(blob, fileName);

      await Toast.show({
        text: `Saved to Downloads/${NATIVE_DOWNLOAD_FOLDER}: ${savedFile.fileName}`,
        duration: "long",
        position: "center",
      });

      if (onSuccess) {
        onSuccess();
      }

      return;
    }

    if (platform === "ios") {
      const savedFile = await saveBlobToNativeFiles(blob, fileName);

      await Toast.show({
        text: `Saved in Files/${NATIVE_DOWNLOAD_FOLDER}: ${savedFile.fileName}`,
        duration: "long",
        position: "center",
      });

      if (onSuccess) {
        onSuccess();
      }

      return;
    }

    const safeFileName = sanitizeNativeFileName(fileName);
    const path = `${NATIVE_DOWNLOAD_FOLDER}/${safeFileName}`;
    const base64Data = await blobToBase64(blob);

    await Filesystem.writeFile({
      path,
      data: base64Data,
      directory: Directory.Documents,
      recursive: true,
    });

    const fileUri = await Filesystem.getUri({
      path,
      directory: Directory.Documents,
    });

    await Toast.show({
      text: `Saved to ${fileUri.uri}`,
      duration: "long",
      position: "center",
    });

    if (onSuccess) {
      onSuccess();
    }
  } catch (error) {
    console.error("Native download error:", error);
    await Toast.show({ text: "Download failed. Please try again." });
    if (onError) {
      onError(error instanceof Error ? error : new Error("Failed to save file natively"));
    }
  }
}
