import { requestBackend, requestBackendBinary, uploadToPresignedUrl } from "./backendApi";

export type R2ContentNamespace = "resume" | "portfolio" | "whitebook" | "study_notes" | "ai_teacher";

export interface ExternalR2BlobReference {
  kind: "r2_blob_ref";
  version: 1;
  namespace: R2ContentNamespace;
  storagePath: string;
  publicUrl: string;
  contentType: "application/json";
  sizeBytes: number;
  uploadedAt: string;
}

interface BlobUploadUrlResponse {
  namespace: R2ContentNamespace;
  object_key: string;
  upload_url: string;
  public_url: string;
  content_type: string;
  headers?: Record<string, string>;
}

const blobJsonCache = new Map<string, Promise<unknown>>();
let blobUploadSupport: "unknown" | "available" | "missing" = "unknown";
let blobReadSupport: "unknown" | "available" | "missing" = "unknown";

async function fetchBlobJsonFromPublicUrl<T>(publicUrl: string) {
  const response = await fetch(publicUrl, {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Request failed (${response.status}).`);
  }

  return (await response.json()) as T;
}

export function isExternalR2BlobReference(value: unknown): value is ExternalR2BlobReference {
  if (!value || typeof value !== "object") {
    return false;
  }

  const record = value as Partial<ExternalR2BlobReference>;
  return (
    record.kind === "r2_blob_ref" &&
    record.version === 1 &&
      typeof record.namespace === "string" &&
      typeof record.storagePath === "string" &&
      typeof record.publicUrl === "string" &&
      typeof record.contentType === "string"
  );
}

export async function uploadExternalJsonBlob<T>(input: {
  namespace: R2ContentNamespace;
  fileName: string;
  data: T;
}): Promise<ExternalR2BlobReference | T> {
  const payload = JSON.stringify(input.data);
  const blob = new Blob([payload], { type: "application/json" });

  if (blobUploadSupport === "missing") {
    return input.data;
  }

  try {
    const upload = await requestBackend<BlobUploadUrlResponse>(
      "/media/blob-upload-url?" +
        new URLSearchParams({
          namespace: input.namespace,
          content_type: "application/json",
          file_name: input.fileName,
        }).toString(),
      {
        auth: "required",
        featureName: "R2 content",
      }
    );
    blobUploadSupport = "available";

    await uploadToPresignedUrl({
      uploadUrl: upload.upload_url,
      file: blob,
      method: "PUT",
      headers: upload.headers,
      contentType: upload.content_type,
    });

    return {
      kind: "r2_blob_ref",
      version: 1,
      namespace: upload.namespace,
      storagePath: upload.object_key,
      publicUrl: upload.public_url,
      contentType: "application/json",
      sizeBytes: blob.size,
      uploadedAt: new Date().toISOString(),
    } satisfies ExternalR2BlobReference;
  } catch (error) {
    blobUploadSupport = "missing";
    console.warn("R2 blob upload is unavailable, falling back to inline JSON storage.", error);
    return input.data;
  }
}

export async function hydrateExternalJsonBlob<T>(value: unknown, featureName = "R2 content"): Promise<T | null> {
  if (!isExternalR2BlobReference(value)) {
    return null;
  }

  let request = blobJsonCache.get(value.storagePath);
  if (!request) {
    request =
      blobReadSupport === "missing"
        ? fetchBlobJsonFromPublicUrl<T>(value.publicUrl)
        : requestBackendBinary(
            "/media/blob/read?" +
              new URLSearchParams({
                object_key: value.storagePath,
              }).toString(),
            {
              auth: "optional",
              featureName,
            }
          )
            .then((buffer) => {
              blobReadSupport = "available";
              return JSON.parse(new TextDecoder().decode(buffer)) as T;
            })
            .catch(async (error) => {
              blobReadSupport = "missing";
              console.warn("Backend blob read failed, falling back to direct R2 fetch.", error);
              return fetchBlobJsonFromPublicUrl<T>(value.publicUrl);
            });
    blobJsonCache.set(value.storagePath, request);
  }

  try {
    return (await request) as T;
  } catch (error) {
    blobJsonCache.delete(value.storagePath);
    throw error;
  }
}

export async function deleteExternalR2BlobReference(value: unknown) {
  if (!isExternalR2BlobReference(value)) {
    return;
  }

  blobJsonCache.delete(value.storagePath);
  await requestBackend("/media/blob/delete", {
    method: "POST",
    body: {
      object_key: value.storagePath,
    },
    auth: "required",
    featureName: "R2 content",
  });
}
