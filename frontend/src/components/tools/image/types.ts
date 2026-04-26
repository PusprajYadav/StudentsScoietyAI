export type OutputMimeType = "image/jpeg" | "image/png" | "image/webp";
export type EditMode = "none" | "erase" | "pick_bg" | "crop";
export type ImageToolTab = "background" | "transform" | "adjust" | "passport" | "export";

export interface ImageStudioResult {
  url: string;
  name: string;
  size: number;
}

export interface CanvasSnapshot {
  width: number;
  height: number;
  data: ImageData;
}

export interface PassportPreset {
  id: string;
  label: string;
  widthPx: number;
  heightPx: number;
}
