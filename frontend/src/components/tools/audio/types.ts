import type { AudioOutputFormat } from "../../../lib/browserAudioTools";

export type WorkspaceMediaKind = "audio" | "video";

export interface AudioWorkspaceFile {
  id: string;
  file: File;
  kind: WorkspaceMediaKind;
  objectUrl: string;
  durationSeconds: number | null;
}

export interface AudioResultState {
  blob: Blob;
  name: string;
  format: AudioOutputFormat;
  mimeType: string;
  objectUrl: string;
  size: number;
  durationSeconds: number | null;
}
