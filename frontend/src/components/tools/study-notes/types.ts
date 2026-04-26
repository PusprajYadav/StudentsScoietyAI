import type { ProfileRow } from "../../../types/database";

export interface StudyNoteAttachment {
  id: string;
  name: string;
  dataUrl: string;
}

export interface StudyNoteFolder {
  id: string;
  name: string;
  videoUrl: string;
  transcriptText: string;
  sourceShareSlug: string | null;
  lastSharedShareSlug: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface StudyNoteEntry {
  id: string;
  folderId: string;
  title: string;
  body: string;
  tags: string[];
  timestampSeconds: number;
  attachments: StudyNoteAttachment[];
  createdAt: string;
  updatedAt: string;
}

export interface TranscriptSegment {
  id: string;
  startSeconds: number;
  text: string;
}

export interface StudyNotesStorage {
  folders: StudyNoteFolder[];
  entries: StudyNoteEntry[];
}

export interface StudyNotesShareSnapshot {
  version: 1;
  folder: {
    name: string;
    videoUrl: string;
    transcriptText: string;
    createdAt: string;
    updatedAt: string;
  };
  entries: StudyNoteEntry[];
  exportedAt: string;
}

export interface StudentStudyNotesShareRow {
  id: string;
  owner_id: string;
  title: string;
  folder_name: string;
  snapshot: StudyNotesShareSnapshot;
  preview_text: string | null;
  preview_image_data_url: string | null;
  share_slug: string;
  entry_count: number;
  attachment_count: number;
  latest_timestamp_seconds: number;
  video_url: string;
  created_at: string;
  updated_at: string;
}

export interface StudentStudyNotesShareWithOwner extends StudentStudyNotesShareRow {
  owner: Pick<ProfileRow, "id" | "username" | "full_name" | "avatar_url"> | null;
}

export type StudyNotesShareRecord = StudentStudyNotesShareWithOwner;

export interface StudyNotesSharePreview {
  id: string;
  title: string;
  folderName: string;
  shareSlug: string;
  previewText: string | null;
  previewImageDataUrl: string | null;
  entryCount: number;
  attachmentCount: number;
  latestTimestampSeconds: number;
  videoUrl: string;
  owner: Pick<ProfileRow, "id" | "username" | "full_name" | "avatar_url"> | null;
}

export interface StudyNotesSharedPostPreviewEntry {
  id: string;
  title: string;
  summary: string;
  timestampSeconds: number;
  attachmentCount: number;
}

export interface StudyNotesSharedPostPreview extends StudyNotesSharePreview {
  transcriptText: string;
  entries: StudyNotesSharedPostPreviewEntry[];
}
