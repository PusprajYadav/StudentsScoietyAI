import { Capacitor, registerPlugin } from "@capacitor/core";

interface NativeFileAccessPlugin {
  readImportedFile(options: {
    url: string;
  }): Promise<{
    base64Data: string;
    fileName: string;
    mimeType?: string;
  }>;
}

const NativeFileAccess = registerPlugin<NativeFileAccessPlugin>("NativeFileAccess");

export async function readNativeImportedFile(url: string) {
  if (!Capacitor.isNativePlatform()) {
    throw new Error("Native imported file access is only available on mobile.");
  }

  const result = await NativeFileAccess.readImportedFile({ url });
  const binary = atob(result.base64Data);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  const mimeType = result.mimeType || "application/octet-stream";
  const blob = new Blob([bytes], { type: mimeType });
  return new File([blob], result.fileName || "shared-file", { type: mimeType });
}
