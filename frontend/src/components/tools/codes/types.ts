export type ToolStudioTab = "generate" | "scan" | "manage";
export type QrStudioSection = "data" | "style" | "frame" | "label" | "layout";

export type QrContentType = "url" | "text" | "email" | "phone";
export type GradientMode = "linear" | "radial";
export type BarcodeFormatKey = "CODE128" | "EAN13" | "UPC";
export type StoredCodeKind = "qr" | "barcode";
export type QrFrameStyle = "none" | "outline" | "gradient" | "glass" | "scan-band" | "scan-card" | "mono-card";

export interface GradientSettings {
  enabled: boolean;
  type: GradientMode;
  start: string;
  end: string;
  rotation: number;
}

export interface QrStyleSettings {
  width: number;
  height: number;
  margin: number;
  dotStyle: "rounded" | "square" | "classy" | "classy-rounded" | "dots" | "extra-rounded";
  cornerSquareStyle: "square" | "dot" | "extra-rounded";
  cornerDotStyle: "square" | "dot";
  foregroundColor: string;
  backgroundColor: string;
  gradient: GradientSettings;
  backgroundGradient: GradientSettings;
  logoDataUrl: string | null;
  logoSize: number;
  logoMargin: number;
  hideBackgroundDots: boolean;
  labelEnabled: boolean;
  labelText: string;
  labelColor: string;
  labelBackgroundColor: string;
  captionEnabled: boolean;
  captionText: string;
  captionColor: string;
  frameStyle: QrFrameStyle;
  frameColor: string;
  frameAccentColor: string;
  framePadding: number;
  frameRadius: number;
}

export interface BarcodeStyleSettings {
  format: BarcodeFormatKey;
  width: number;
  height: number;
  displayValue: boolean;
  lineColor: string;
  background: string;
  margin: number;
  fontSize: number;
  textMargin: number;
}

export interface NormalizedQrValue {
  encodedValue: string;
  storedValue: string;
  displayValue: string;
}

export interface ParsedDetectedContent {
  raw: string;
  kind: "url" | "text" | "email" | "phone";
  displayValue: string;
  actionHref?: string;
  actionLabel?: string;
}

export interface StoredQrDraftPayload {
  title: string;
  contentType: QrContentType;
  value: string;
  dynamic: boolean;
  shortCode?: string | null;
  style: QrStyleSettings;
}

export interface StoredBarcodeDraftPayload {
  title: string;
  value: string;
  style: BarcodeStyleSettings;
}

export interface StoredQrDraft {
  id: string;
  kind: "qr";
  name: string;
  createdAt: string;
  updatedAt: string;
  payload: StoredQrDraftPayload;
}

export interface StoredBarcodeDraft {
  id: string;
  kind: "barcode";
  name: string;
  createdAt: string;
  updatedAt: string;
  payload: StoredBarcodeDraftPayload;
}

export type StoredCodeDraft = StoredQrDraft | StoredBarcodeDraft;
