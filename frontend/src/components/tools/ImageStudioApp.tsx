import { useEffect, useMemo, useRef, useState, type ChangeEvent, type PointerEvent } from "react";
import { downloadBlobNatively } from "../../lib/nativeDownload";
import { ImageAdjustmentsPanel } from "./image/ImageAdjustmentsPanel";
import { ImageBackgroundPanel } from "./image/ImageBackgroundPanel";
import { ImageCanvasPreview } from "./image/ImageCanvasPreview";
import { ImageExportPanel } from "./image/ImageExportPanel";
import { ImagePassportPanel } from "./image/ImagePassportPanel";
import { ImageToolTabs } from "./image/ImageToolTabs";
import { ImageTransformPanel } from "./image/ImageTransformPanel";
import type { CanvasSnapshot, EditMode, ImageStudioResult, ImageToolTab, OutputMimeType, PassportPreset } from "./image/types";

const PASSPORT_PRESETS: PassportPreset[] = [
  { id: "india_35x45", label: "India 35 x 45 mm", widthPx: 413, heightPx: 531 },
  { id: "us_2x2", label: "US 2 x 2 inch", widthPx: 600, heightPx: 600 },
  { id: "schengen_35x45", label: "Schengen 35 x 45 mm", widthPx: 413, heightPx: 531 },
];

const IMAGE_TOOL_META: Record<ImageToolTab, { label: string; description: string }> = {
  background: {
    label: "Background",
    description: "Pick a sample color, erase area manually, and remove matching background ranges.",
  },
  transform: {
    label: "Crop + Transform",
    description: "Select crop region, then rotate or flip image orientation.",
  },
  adjust: {
    label: "Adjustments",
    description: "Tune brightness, contrast, and saturation with one-click apply.",
  },
  passport: {
    label: "Passport Maker",
    description: "Generate passport-sized images as single photo or 2 x 2 sheet layout.",
  },
  export: {
    label: "Compress and export",
    description: "Compress and export (PNG/JPG/WEBP) with optional resize.",
  },
};

function clamp(value: number) {
  if (value < 0) return 0;
  if (value > 255) return 255;
  return value;
}

function formatBytes(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / 1024 ** index;
  return `${value.toFixed(value >= 10 || index === 0 ? 0 : 1)} ${units[index]}`;
}

function baseName(fileName: string) {
  const dot = fileName.lastIndexOf(".");
  if (dot <= 0) return fileName;
  return fileName.slice(0, dot);
}

function resolvePreferredOutputType(file: File): OutputMimeType {
  const normalizedMimeType = file.type.trim().toLowerCase();
  if (normalizedMimeType === "image/png") return "image/png";
  if (normalizedMimeType === "image/webp") return "image/webp";
  if (normalizedMimeType === "image/jpeg" || normalizedMimeType === "image/jpg") return "image/jpeg";

  const lowerName = file.name.toLowerCase();
  if (lowerName.endsWith(".png")) return "image/png";
  if (lowerName.endsWith(".webp")) return "image/webp";
  if (lowerName.endsWith(".jpg") || lowerName.endsWith(".jpeg")) return "image/jpeg";

  return "image/png";
}

function normalizePositiveInt(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return Math.round(parsed);
}

function createBlobFromCanvas(canvas: HTMLCanvasElement, type: OutputMimeType, quality: number): Promise<Blob> {
  const normalizedQuality = type === "image/png" ? undefined : Math.min(Math.max(quality, 1), 100) / 100;
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("Failed to generate image output."));
          return;
        }
        resolve(blob);
      },
      type,
      normalizedQuality
    );
  });
}

function canvasHasTransparency(source: HTMLCanvasElement) {
  const context = source.getContext("2d", { willReadFrequently: true });
  if (!context) {
    return false;
  }

  const imageData = context.getImageData(0, 0, source.width, source.height);
  const pixelCount = imageData.data.length / 4;
  const sampleStep = Math.max(1, Math.floor(pixelCount / 24000));

  for (let pixelIndex = 0; pixelIndex < pixelCount; pixelIndex += sampleStep) {
    if (imageData.data[pixelIndex * 4 + 3] < 250) {
      return true;
    }
  }

  return false;
}

function loadImageFromBlob(blob: Blob) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not prepare compressed export preview."));
    };
    image.src = url;
  });
}

async function buildPngCompressedCanvas(source: HTMLCanvasElement, quality: number) {
  const normalized = Math.min(Math.max(quality, 10), 100);
  if (normalized >= 100) return source;

  let workingSource = source;

  try {
    const bridgeType: OutputMimeType = canvasHasTransparency(source) ? "image/webp" : "image/jpeg";
    const bridgeBlob = await createBlobFromCanvas(source, bridgeType, Math.max(18, normalized));
    const bridgeImage = await loadImageFromBlob(bridgeBlob);
    const bridgeCanvas = document.createElement("canvas");
    bridgeCanvas.width = source.width;
    bridgeCanvas.height = source.height;
    const bridgeContext = bridgeCanvas.getContext("2d");

    if (bridgeContext) {
      if (bridgeType === "image/jpeg") {
        bridgeContext.fillStyle = "#ffffff";
        bridgeContext.fillRect(0, 0, bridgeCanvas.width, bridgeCanvas.height);
      }

      bridgeContext.drawImage(bridgeImage, 0, 0, bridgeCanvas.width, bridgeCanvas.height);
      workingSource = bridgeCanvas;
    }
  } catch {
    workingSource = source;
  }

  const out = document.createElement("canvas");
  out.width = workingSource.width;
  out.height = workingSource.height;
  const ctx = out.getContext("2d");
  if (!ctx) return workingSource;

  ctx.drawImage(workingSource, 0, 0);
  const imageData = ctx.getImageData(0, 0, out.width, out.height);
  const data = imageData.data;

  const colorLevels = Math.max(6, Math.round((normalized / 100) * 160));
  const alphaLevels = Math.max(4, Math.round((normalized / 100) * 48));
  const colorStep = 255 / Math.max(1, colorLevels - 1);
  const alphaStep = 255 / Math.max(1, alphaLevels - 1);

  for (let index = 0; index < data.length; index += 4) {
    data[index] = clamp(Math.round(Math.round(data[index] / colorStep) * colorStep));
    data[index + 1] = clamp(Math.round(Math.round(data[index + 1] / colorStep) * colorStep));
    data[index + 2] = clamp(Math.round(Math.round(data[index + 2] / colorStep) * colorStep));
    if (data[index + 3] > 0 && data[index + 3] < 255) {
      data[index + 3] = clamp(Math.round(Math.round(data[index + 3] / alphaStep) * alphaStep));
    }
  }

  ctx.putImageData(imageData, 0, 0);
  return out;
}

function snapshotFromCanvas(canvas: HTMLCanvasElement): CanvasSnapshot {
  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Canvas context unavailable.");
  }

  return {
    width: canvas.width,
    height: canvas.height,
    data: context.getImageData(0, 0, canvas.width, canvas.height),
  };
}

function drawCover(
  targetContext: CanvasRenderingContext2D,
  source: HTMLCanvasElement,
  dx: number,
  dy: number,
  dw: number,
  dh: number
) {
  const srcW = source.width;
  const srcH = source.height;
  const scale = Math.max(dw / srcW, dh / srcH);
  const sw = dw / scale;
  const sh = dh / scale;
  const sx = (srcW - sw) / 2;
  const sy = (srcH - sh) / 2;
  targetContext.drawImage(source, sx, sy, sw, sh, dx, dy, dw, dh);
}

export function ImageStudioApp({ showTitleBlock = true }: { showTitleBlock?: boolean }) {
  const mainCanvasRef = useRef<HTMLCanvasElement>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);
  const historyRef = useRef<CanvasSnapshot[]>([]);
  const redoRef = useRef<CanvasSnapshot[]>([]);
  const drawingRef = useRef(false);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);
  const cropStartRef = useRef<{ x: number; y: number } | null>(null);

  const [sourceFileName, setSourceFileName] = useState<string | null>(null);
  const [sourceFileSize, setSourceFileSize] = useState<number | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hasImage, setHasImage] = useState(false);

  const [mode, setMode] = useState<EditMode>("none");
  const [brushSize, setBrushSize] = useState(26);
  const [bgTolerance, setBgTolerance] = useState(48);
  const [pickedColor, setPickedColor] = useState<{ r: number; g: number; b: number } | null>(null);
  const [cropRect, setCropRect] = useState<{ x: number; y: number; w: number; h: number } | null>(null);

  const [brightness, setBrightness] = useState(0);
  const [contrast, setContrast] = useState(0);
  const [saturation, setSaturation] = useState(0);

  const [outputType, setOutputType] = useState<OutputMimeType>("image/png");
  const [outputQuality, setOutputQuality] = useState(88);
  const [exportMaxWidth, setExportMaxWidth] = useState("");
  const [exportMaxHeight, setExportMaxHeight] = useState("");
  const [processing, setProcessing] = useState(false);

  const [passportPresetId, setPassportPresetId] = useState(PASSPORT_PRESETS[0].id);
  const [passportLayout, setPassportLayout] = useState<"single" | "sheet4">("single");
  const [activeTool, setActiveTool] = useState<ImageToolTab>("background");
  const [result, setResult] = useState<ImageStudioResult | null>(null);

  const canUndo = historyRef.current.length > 0;
  const canRedo = redoRef.current.length > 0;

  const pickedColorHex = useMemo(() => {
    if (!pickedColor) return null;
    const hex = (value: number) => value.toString(16).padStart(2, "0");
    return `#${hex(pickedColor.r)}${hex(pickedColor.g)}${hex(pickedColor.b)}`;
  }, [pickedColor]);

  useEffect(
    () => () => {
      if (result?.url) {
        URL.revokeObjectURL(result.url);
      }
    },
    [result]
  );

  function clearOverlay() {
    const overlay = overlayCanvasRef.current;
    const context = overlay?.getContext("2d");
    if (!overlay || !context) return;
    context.clearRect(0, 0, overlay.width, overlay.height);
  }

  function syncOverlaySize() {
    const main = mainCanvasRef.current;
    const overlay = overlayCanvasRef.current;
    if (!main || !overlay) return;
    if (overlay.width !== main.width || overlay.height !== main.height) {
      overlay.width = main.width;
      overlay.height = main.height;
    }
  }

  function pushHistory() {
    const main = mainCanvasRef.current;
    if (!main || !hasImage) return;

    try {
      historyRef.current.push(snapshotFromCanvas(main));
      if (historyRef.current.length > 24) {
        historyRef.current = historyRef.current.slice(-24);
      }
      redoRef.current = [];
    } catch {
      // Ignore snapshot failures.
    }
  }

  function applySnapshot(snapshot: CanvasSnapshot) {
    const main = mainCanvasRef.current;
    if (!main) return;
    const context = main.getContext("2d");
    if (!context) return;

    if (main.width !== snapshot.width || main.height !== snapshot.height) {
      main.width = snapshot.width;
      main.height = snapshot.height;
    }
    context.putImageData(snapshot.data, 0, 0);
    syncOverlaySize();
    clearOverlay();
  }

  function mapPoint(event: PointerEvent<HTMLCanvasElement>) {
    const canvas = overlayCanvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: Math.max(0, Math.min(canvas.width, (event.clientX - rect.left) * scaleX)),
      y: Math.max(0, Math.min(canvas.height, (event.clientY - rect.top) * scaleY)),
    };
  }

  function drawCropOverlay(rect: { x: number; y: number; w: number; h: number }) {
    const overlay = overlayCanvasRef.current;
    if (!overlay) return;
    const context = overlay.getContext("2d");
    if (!context) return;
    context.clearRect(0, 0, overlay.width, overlay.height);
    context.fillStyle = "rgba(0,0,0,0.28)";
    context.fillRect(0, 0, overlay.width, overlay.height);
    context.clearRect(rect.x, rect.y, rect.w, rect.h);
    context.strokeStyle = "#38bdf8";
    context.lineWidth = 2;
    context.setLineDash([8, 6]);
    context.strokeRect(rect.x, rect.y, rect.w, rect.h);
    context.setLineDash([]);
  }

  function eraseAt(x: number, y: number, from?: { x: number; y: number }) {
    const main = mainCanvasRef.current;
    if (!main) return;
    const context = main.getContext("2d");
    if (!context) return;

    context.save();
    context.globalCompositeOperation = "destination-out";
    context.lineCap = "round";
    context.lineJoin = "round";
    context.lineWidth = brushSize;

    if (from) {
      context.beginPath();
      context.moveTo(from.x, from.y);
      context.lineTo(x, y);
      context.stroke();
    } else {
      context.beginPath();
      context.arc(x, y, brushSize / 2, 0, Math.PI * 2);
      context.fill();
    }
    context.restore();
  }

  async function onSelectImage(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] || null;
    event.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Please select an image file.");
      return;
    }

    setProcessing(true);
    setError(null);
    setStatus(null);

    try {
      const objectUrl = URL.createObjectURL(file);
      const image = await new Promise<HTMLImageElement>((resolve, reject) => {
        const nextImage = new Image();
        nextImage.onload = () => resolve(nextImage);
        nextImage.onerror = () => reject(new Error("Failed to load image file."));
        nextImage.src = objectUrl;
      });

      const main = mainCanvasRef.current;
      const overlay = overlayCanvasRef.current;
      if (!main || !overlay) {
        URL.revokeObjectURL(objectUrl);
        throw new Error("Canvas is not ready.");
      }

      const maxDimension = 1800;
      const scale = Math.min(1, maxDimension / Math.max(image.naturalWidth, image.naturalHeight));
      const width = Math.max(1, Math.round(image.naturalWidth * scale));
      const height = Math.max(1, Math.round(image.naturalHeight * scale));

      main.width = width;
      main.height = height;
      const context = main.getContext("2d");
      if (!context) {
        URL.revokeObjectURL(objectUrl);
        throw new Error("Canvas context unavailable.");
      }
      context.clearRect(0, 0, width, height);
      context.drawImage(image, 0, 0, width, height);

      overlay.width = width;
      overlay.height = height;
      clearOverlay();

      historyRef.current = [];
      redoRef.current = [];
      cropStartRef.current = null;
      lastPointRef.current = null;
      drawingRef.current = false;
      setCropRect(null);
      setMode("none");
      setPickedColor(null);
      setSourceFileName(file.name);
      setSourceFileSize(file.size);
      setOutputType(resolvePreferredOutputType(file));
      setHasImage(true);
      setStatus("Image loaded. Use tools to edit background, crop, passport output, and export.");
      URL.revokeObjectURL(objectUrl);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Failed to load image.");
      setHasImage(false);
    } finally {
      setProcessing(false);
    }
  }

  function handlePointerDown(event: PointerEvent<HTMLCanvasElement>) {
    if (!hasImage) return;
    const point = mapPoint(event);

    if (mode === "erase") {
      pushHistory();
      drawingRef.current = true;
      lastPointRef.current = point;
      eraseAt(point.x, point.y);
      return;
    }

    if (mode === "pick_bg") {
      const main = mainCanvasRef.current;
      const context = main?.getContext("2d");
      if (!main || !context) return;
      const sample = context.getImageData(Math.floor(point.x), Math.floor(point.y), 1, 1).data;
      setPickedColor({ r: sample[0], g: sample[1], b: sample[2] });
      setStatus('Background color sampled. Click "Remove Sampled Background" to apply.');
      return;
    }

    if (mode === "crop") {
      cropStartRef.current = point;
      const rect = { x: point.x, y: point.y, w: 1, h: 1 };
      setCropRect(rect);
      drawCropOverlay(rect);
    }
  }

  function handlePointerMove(event: PointerEvent<HTMLCanvasElement>) {
    if (!hasImage) return;
    const point = mapPoint(event);

    if (mode === "erase" && drawingRef.current) {
      eraseAt(point.x, point.y, lastPointRef.current || undefined);
      lastPointRef.current = point;
      return;
    }

    if (mode === "crop" && cropStartRef.current) {
      const start = cropStartRef.current;
      const x = Math.min(start.x, point.x);
      const y = Math.min(start.y, point.y);
      const w = Math.abs(point.x - start.x);
      const h = Math.abs(point.y - start.y);
      const rect = { x, y, w, h };
      setCropRect(rect);
      drawCropOverlay(rect);
    }
  }

  function handlePointerUp() {
    drawingRef.current = false;
    lastPointRef.current = null;
    cropStartRef.current = null;
  }

  function undo() {
    const main = mainCanvasRef.current;
    if (!main || historyRef.current.length === 0) return;
    const previous = historyRef.current.pop();
    if (!previous) return;
    try {
      redoRef.current.push(snapshotFromCanvas(main));
      applySnapshot(previous);
      setStatus("Undo applied.");
    } catch {
      // Ignore undo failure.
    }
  }

  function redo() {
    const main = mainCanvasRef.current;
    if (!main || redoRef.current.length === 0) return;
    const nextSnapshot = redoRef.current.pop();
    if (!nextSnapshot) return;
    try {
      historyRef.current.push(snapshotFromCanvas(main));
      applySnapshot(nextSnapshot);
      setStatus("Redo applied.");
    } catch {
      // Ignore redo failure.
    }
  }

  function removeSampledBackground() {
    if (!hasImage || !pickedColor) {
      setError("Pick a background color first.");
      return;
    }
    const main = mainCanvasRef.current;
    const context = main?.getContext("2d");
    if (!main || !context) return;

    pushHistory();

    const imageData = context.getImageData(0, 0, main.width, main.height);
    const data = imageData.data;
    const threshold = Math.max(0, Math.min(255, bgTolerance));

    for (let index = 0; index < data.length; index += 4) {
      const dr = data[index] - pickedColor.r;
      const dg = data[index + 1] - pickedColor.g;
      const db = data[index + 2] - pickedColor.b;
      const distance = Math.sqrt(dr * dr + dg * dg + db * db);
      if (distance <= threshold) {
        data[index + 3] = 0;
      }
    }

    context.putImageData(imageData, 0, 0);
    setStatus("Background removed from sampled color region.");
  }

  function applyCrop() {
    if (!hasImage || !cropRect || cropRect.w < 3 || cropRect.h < 3) {
      setError("Draw a crop area first.");
      return;
    }

    const main = mainCanvasRef.current;
    if (!main) return;

    pushHistory();

    const temp = document.createElement("canvas");
    temp.width = Math.round(cropRect.w);
    temp.height = Math.round(cropRect.h);
    const tempContext = temp.getContext("2d");
    if (!tempContext) return;

    tempContext.drawImage(
      main,
      cropRect.x,
      cropRect.y,
      cropRect.w,
      cropRect.h,
      0,
      0,
      temp.width,
      temp.height
    );

    main.width = temp.width;
    main.height = temp.height;
    const context = main.getContext("2d");
    if (!context) return;
    context.clearRect(0, 0, main.width, main.height);
    context.drawImage(temp, 0, 0);

    syncOverlaySize();
    clearOverlay();
    setCropRect(null);
    setMode("none");
    setStatus("Crop applied successfully.");
  }

  function rotate(clockwise: boolean) {
    if (!hasImage) return;
    const main = mainCanvasRef.current;
    if (!main) return;
    const source = document.createElement("canvas");
    source.width = main.width;
    source.height = main.height;
    const sourceContext = source.getContext("2d");
    if (!sourceContext) return;
    sourceContext.drawImage(main, 0, 0);

    pushHistory();

    const newWidth = main.height;
    const newHeight = main.width;
    main.width = newWidth;
    main.height = newHeight;
    const context = main.getContext("2d");
    if (!context) return;

    if (clockwise) {
      context.translate(newWidth, 0);
      context.rotate(Math.PI / 2);
    } else {
      context.translate(0, newHeight);
      context.rotate(-Math.PI / 2);
    }
    context.drawImage(source, 0, 0);
    context.setTransform(1, 0, 0, 1, 0, 0);

    syncOverlaySize();
    clearOverlay();
    setCropRect(null);
    setStatus(`Image rotated ${clockwise ? "right" : "left"}.`);
  }

  function flip(horizontal: boolean) {
    if (!hasImage) return;
    const main = mainCanvasRef.current;
    if (!main) return;
    const source = document.createElement("canvas");
    source.width = main.width;
    source.height = main.height;
    const sourceContext = source.getContext("2d");
    if (!sourceContext) return;
    sourceContext.drawImage(main, 0, 0);

    pushHistory();

    const context = main.getContext("2d");
    if (!context) return;
    context.save();
    context.clearRect(0, 0, main.width, main.height);
    if (horizontal) {
      context.translate(main.width, 0);
      context.scale(-1, 1);
    } else {
      context.translate(0, main.height);
      context.scale(1, -1);
    }
    context.drawImage(source, 0, 0);
    context.restore();

    setStatus(`Image flipped ${horizontal ? "horizontally" : "vertically"}.`);
  }

  function applyAdjustments() {
    if (!hasImage) return;
    const main = mainCanvasRef.current;
    const context = main?.getContext("2d");
    if (!main || !context) return;

    pushHistory();

    const imageData = context.getImageData(0, 0, main.width, main.height);
    const data = imageData.data;

    const brightnessFactor = 1 + brightness / 100;
    const contrastValue = contrast;
    const contrastFactor = (259 * (contrastValue + 255)) / (255 * (259 - contrastValue));
    const saturationFactor = 1 + saturation / 100;

    for (let index = 0; index < data.length; index += 4) {
      let red = data[index];
      let green = data[index + 1];
      let blue = data[index + 2];

      red *= brightnessFactor;
      green *= brightnessFactor;
      blue *= brightnessFactor;

      red = contrastFactor * (red - 128) + 128;
      green = contrastFactor * (green - 128) + 128;
      blue = contrastFactor * (blue - 128) + 128;

      const gray = 0.299 * red + 0.587 * green + 0.114 * blue;
      red = gray + (red - gray) * saturationFactor;
      green = gray + (green - gray) * saturationFactor;
      blue = gray + (blue - gray) * saturationFactor;

      data[index] = clamp(Math.round(red));
      data[index + 1] = clamp(Math.round(green));
      data[index + 2] = clamp(Math.round(blue));
    }

    context.putImageData(imageData, 0, 0);
    setStatus("Adjustments applied.");
  }

  async function exportImage() {
    const main = mainCanvasRef.current;
    if (!main || !hasImage) {
      setError("Load an image first.");
      return;
    }

    setProcessing(true);
    setError(null);

    try {
      const widthLimit = normalizePositiveInt(exportMaxWidth);
      const heightLimit = normalizePositiveInt(exportMaxHeight);
      const widthScale = widthLimit ? widthLimit / main.width : 1;
      const heightScale = heightLimit ? heightLimit / main.height : 1;
      const scale = Math.min(widthScale, heightScale, 1);

      let exportCanvas = main;
      if (scale < 1) {
        const resized = document.createElement("canvas");
        resized.width = Math.max(1, Math.round(main.width * scale));
        resized.height = Math.max(1, Math.round(main.height * scale));
        const resizeContext = resized.getContext("2d");
        if (!resizeContext) {
          throw new Error("Canvas resize is not supported in this browser.");
        }
        resizeContext.drawImage(main, 0, 0, resized.width, resized.height);
        exportCanvas = resized;
      }

      if (outputType === "image/png" && outputQuality < 100) {
        exportCanvas = await buildPngCompressedCanvas(exportCanvas, outputQuality);
      }

      const blob = await createBlobFromCanvas(exportCanvas, outputType, outputQuality);
      if (result?.url) {
        URL.revokeObjectURL(result.url);
      }
      const ext = outputType === "image/png" ? "png" : outputType === "image/webp" ? "webp" : "jpg";
      const name = `${baseName(sourceFileName || "image")}-edited.${ext}`;
      const url = URL.createObjectURL(blob);
      setResult({ url, name, size: blob.size });
      setStatus("Image compressed and exported successfully.");
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Export failed.");
    } finally {
      setProcessing(false);
    }
  }

  async function makePassportImage() {
    const main = mainCanvasRef.current;
    if (!main || !hasImage) {
      setError("Load an image first.");
      return;
    }

    const preset = PASSPORT_PRESETS.find((item) => item.id === passportPresetId) || PASSPORT_PRESETS[0];
    const gap = 24;
    const margin = 24;

    const out = document.createElement("canvas");
    if (passportLayout === "single") {
      out.width = preset.widthPx;
      out.height = preset.heightPx;
    } else {
      out.width = preset.widthPx * 2 + gap + margin * 2;
      out.height = preset.heightPx * 2 + gap + margin * 2;
    }

    const context = out.getContext("2d");
    if (!context) {
      setError("Unable to create passport image output.");
      return;
    }

    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, out.width, out.height);

    if (passportLayout === "single") {
      drawCover(context, main, 0, 0, out.width, out.height);
    } else {
      for (let row = 0; row < 2; row += 1) {
        for (let col = 0; col < 2; col += 1) {
          const dx = margin + col * (preset.widthPx + gap);
          const dy = margin + row * (preset.heightPx + gap);
          drawCover(context, main, dx, dy, preset.widthPx, preset.heightPx);
          context.strokeStyle = "#0f172a";
          context.lineWidth = 1;
          context.strokeRect(dx, dy, preset.widthPx, preset.heightPx);
        }
      }
    }

    try {
      const blob = await createBlobFromCanvas(out, "image/png", 100);
      if (result?.url) {
        URL.revokeObjectURL(result.url);
      }
      const url = URL.createObjectURL(blob);
      setResult({
        url,
        size: blob.size,
        name: `${baseName(sourceFileName || "passport")}-${preset.id}-${passportLayout}.png`,
      });
      setStatus("Passport image generated.");
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Failed to generate passport image.");
    }
  }

  function clearAll() {
    const main = mainCanvasRef.current;
    const overlay = overlayCanvasRef.current;
    if (main) {
      main.width = 1;
      main.height = 1;
    }
    if (overlay) {
      overlay.width = 1;
      overlay.height = 1;
    }
    clearOverlay();
    historyRef.current = [];
    redoRef.current = [];
    drawingRef.current = false;
    lastPointRef.current = null;
    cropStartRef.current = null;
    setHasImage(false);
    setMode("none");
    setSourceFileName(null);
    setSourceFileSize(null);
    setError(null);
    setStatus(null);
    setPickedColor(null);
    setCropRect(null);
    setOutputType("image/png");
    setExportMaxWidth("");
    setExportMaxHeight("");
    setActiveTool("background");
    if (result?.url) {
      URL.revokeObjectURL(result.url);
      setResult(null);
    }
  }

  function selectTool(tool: ImageToolTab) {
    setActiveTool(tool);
    if (tool !== "background" && (mode === "erase" || mode === "pick_bg")) {
      setMode("none");
    }
    if (tool !== "transform" && mode === "crop") {
      setMode("none");
      setCropRect(null);
      clearOverlay();
    }
  }

  async function downloadCurrentImageSnapshot(sourceTab: Exclude<ImageToolTab, "export">) {
    const main = mainCanvasRef.current;
    if (!main || !hasImage) {
      setError("Load an image first.");
      return;
    }

    setError(null);
    try {
      const blob = await createBlobFromCanvas(main, "image/png", 100);
      const fileName = `${baseName(sourceFileName || "image")}-${sourceTab}.png`;
      await downloadBlobNatively(blob, fileName);
      setStatus(`Downloaded current image from ${sourceTab} tab.`);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Download failed.");
    }
  }

  function renderToolPanel() {
    switch (activeTool) {
      case "background":
        return (
          <ImageBackgroundPanel
            mode={mode}
            bgTolerance={bgTolerance}
            brushSize={brushSize}
            pickedColorHex={pickedColorHex}
            hasImage={hasImage}
            hasPickedColor={Boolean(pickedColor)}
            processing={processing}
            onModeChange={setMode}
            onToleranceChange={setBgTolerance}
            onBrushSizeChange={setBrushSize}
            onRemoveSampledBackground={removeSampledBackground}
            onDownloadCurrent={() => void downloadCurrentImageSnapshot("background")}
          />
        );

      case "transform":
        return (
          <ImageTransformPanel
            mode={mode}
            hasCropRect={Boolean(cropRect)}
            hasImage={hasImage}
            processing={processing}
            onModeChange={setMode}
            onApplyCrop={applyCrop}
            onRotateLeft={() => rotate(false)}
            onRotateRight={() => rotate(true)}
            onFlipHorizontal={() => flip(true)}
            onFlipVertical={() => flip(false)}
            onDownloadCurrent={() => void downloadCurrentImageSnapshot("transform")}
          />
        );

      case "adjust":
        return (
          <ImageAdjustmentsPanel
            brightness={brightness}
            contrast={contrast}
            saturation={saturation}
            hasImage={hasImage}
            processing={processing}
            onBrightnessChange={setBrightness}
            onContrastChange={setContrast}
            onSaturationChange={setSaturation}
            onApplyAdjustments={applyAdjustments}
            onDownloadCurrent={() => void downloadCurrentImageSnapshot("adjust")}
          />
        );

      case "passport":
        return (
          <ImagePassportPanel
            presets={PASSPORT_PRESETS}
            presetId={passportPresetId}
            layout={passportLayout}
            hasImage={hasImage}
            processing={processing}
            onPresetChange={setPassportPresetId}
            onLayoutChange={setPassportLayout}
            onGenerate={() => void makePassportImage()}
            onDownloadCurrent={() => void downloadCurrentImageSnapshot("passport")}
          />
        );

      case "export":
        return (
          <ImageExportPanel
            outputType={outputType}
            outputQuality={outputQuality}
            maxWidth={exportMaxWidth}
            maxHeight={exportMaxHeight}
            hasImage={hasImage}
            processing={processing}
            sourceSize={sourceFileSize}
            resultSize={result?.size ?? null}
            onOutputTypeChange={setOutputType}
            onOutputQualityChange={setOutputQuality}
            onMaxWidthChange={setExportMaxWidth}
            onMaxHeightChange={setExportMaxHeight}
            onExport={() => void exportImage()}
            formatBytes={formatBytes}
          />
        );

      default:
        return null;
    }
  }

  return (
    <section className="glass-card h-full min-h-0 p-2.5 sm:p-4 lg:p-5">
      <div className={`flex flex-col gap-3 ${showTitleBlock ? "sm:flex-row sm:flex-wrap sm:items-start sm:justify-between" : "sm:items-end"}`}>
        {showTitleBlock ? (
          <div>
            <h2 className="font-display text-base font-semibold text-app-text sm:text-xl">Image Studio</h2>
            <p className="mt-1 max-w-2xl text-[11px] leading-5 text-app-muted sm:text-sm">
              Background remover, manual area erase, crop, passport maker, and advanced export tools.
            </p>
          </div>
        ) : null}
        <div className="grid w-full gap-2 sm:flex sm:w-auto sm:flex-wrap sm:items-center">
          <label className="btn-secondary inline-flex w-full cursor-pointer items-center gap-2 !px-3 !py-2 text-xs sm:w-auto">
            <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
              <path d="M10 4v12" />
              <path d="M4 10h12" />
            </svg>
            Choose Image
            <input type="file" accept="image/*" className="hidden" onChange={(event) => void onSelectImage(event)} />
          </label>
          <button type="button" className="btn-secondary w-full !px-3 !py-2 text-xs sm:w-auto" onClick={clearAll} disabled={!hasImage && !result}>
            Reset
          </button>
        </div>
      </div>

      {sourceFileName ? <p className="mt-2 break-all text-xs text-app-muted">Selected: {sourceFileName}</p> : null}
      {error ? <p className="mt-2 rounded-2xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 sm:text-sm">{error}</p> : null}
      {status ? <p className="mt-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700 sm:text-sm">{status}</p> : null}

      <div className="mt-3 grid gap-2.5 lg:grid-cols-[minmax(280px,320px)_minmax(0,1fr)] lg:gap-3">
        <aside className="space-y-2.5 rounded-[20px] border border-app-border bg-app-card/90 p-2 shadow-[0_20px_60px_-34px_rgba(15,23,42,0.35)] sm:rounded-[24px] sm:p-3">
          <ImageToolTabs activeTool={activeTool} toolMeta={IMAGE_TOOL_META} onSelect={selectTool} />

          <div className="rounded-2xl border border-app-border bg-app-card p-2.5 sm:p-3">
            <p className="text-sm font-semibold text-app-text">{IMAGE_TOOL_META[activeTool].label}</p>
            <p className="mt-1 text-[11px] leading-5 text-app-muted sm:text-xs">{IMAGE_TOOL_META[activeTool].description}</p>
            <div className="mt-2">{renderToolPanel()}</div>
          </div>

          <div className="rounded-2xl border border-app-border bg-app-card p-2.5 sm:p-3">
            <p className="text-sm font-semibold text-app-text">History</p>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <button type="button" className="btn-secondary" onClick={undo} disabled={!canUndo || processing}>Undo</button>
              <button type="button" className="btn-secondary" onClick={redo} disabled={!canRedo || processing}>Redo</button>
            </div>
          </div>
        </aside>

        <ImageCanvasPreview
          mode={mode}
          mainCanvasRef={mainCanvasRef}
          overlayCanvasRef={overlayCanvasRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          result={result}
          formatBytes={formatBytes}
        />
      </div>
    </section>
  );
}
