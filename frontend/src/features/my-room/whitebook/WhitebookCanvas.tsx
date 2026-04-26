import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type {
  WhitebookEraserMode,
  WhitebookImageLayer,
  WhitebookInkTool,
  WhitebookPage,
  WhitebookPoint,
  WhitebookTextLayer,
  WhitebookTool,
  WhitebookViewport,
} from "./types";
import { buildWhitebookStrokePath, createWhitebookEntityId } from "./utils";

const MIN_ZOOM = 0.1;
const MAX_ZOOM = 2;
const MIN_IMAGE_SIZE = 40;
const TEXT_LINE_HEIGHT = 1.35;

function clampZoom(value: number) {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, value));
}

function screenToWorld(
  clientX: number,
  clientY: number,
  bounds: DOMRect,
  viewport: WhitebookViewport
) {
  return {
    x: (clientX - bounds.left - viewport.offsetX) / viewport.zoom,
    y: (clientY - bounds.top - viewport.offsetY) / viewport.zoom,
  };
}

function distanceBetween(left: WhitebookPoint, right: WhitebookPoint) {
  return Math.hypot(right.x - left.x, right.y - left.y);
}

function pointToSegmentDistance(point: WhitebookPoint, start: WhitebookPoint, end: WhitebookPoint) {
  const dx = end.x - start.x;
  const dy = end.y - start.y;

  if (dx === 0 && dy === 0) {
    return distanceBetween(point, start);
  }

  const t = Math.max(0, Math.min(1, ((point.x - start.x) * dx + (point.y - start.y) * dy) / (dx * dx + dy * dy)));
  const projection = {
    x: start.x + t * dx,
    y: start.y + t * dy,
  };

  return distanceBetween(point, projection);
}

function strokeIntersectsPoint(stroke: WhitebookPage["strokes"][number], point: WhitebookPoint, radius: number) {
  if (stroke.points.length === 1) {
    return distanceBetween(stroke.points[0], point) <= radius + stroke.size / 2;
  }

  for (let index = 1; index < stroke.points.length; index += 1) {
    if (pointToSegmentDistance(point, stroke.points[index - 1], stroke.points[index]) <= radius + stroke.size / 2) {
      return true;
    }
  }

  return false;
}

function splitStrokeByErasing(stroke: WhitebookPage["strokes"][number], point: WhitebookPoint, radius: number) {
  if (stroke.points.length === 1) {
    return strokeIntersectsPoint(stroke, point, radius) ? [] : [stroke];
  }

  const segments: WhitebookPoint[][] = [];
  let currentSegment: WhitebookPoint[] = [];

  stroke.points.forEach((strokePoint) => {
    const pointIsErased = distanceBetween(strokePoint, point) <= radius + stroke.size / 2;

    if (pointIsErased) {
      if (currentSegment.length > 0) {
        segments.push(currentSegment);
        currentSegment = [];
      }
      return;
    }

    currentSegment.push(strokePoint);
  });

  if (currentSegment.length > 0) {
    segments.push(currentSegment);
  }

  return segments.map((segment, index) => ({
    ...stroke,
    id: index === 0 ? stroke.id : createWhitebookEntityId("wb_stroke"),
    points: segment,
  }));
}

function imageContainsPoint(image: WhitebookImageLayer, point: WhitebookPoint) {
  return (
    point.x >= image.x &&
    point.x <= image.x + image.width &&
    point.y >= image.y &&
    point.y <= image.y + image.height
  );
}

type ResizeHandle = "nw" | "ne" | "sw" | "se";

function getResizeHandle(image: WhitebookImageLayer, point: WhitebookPoint, zoom: number): ResizeHandle | null {
  const radius = 14 / zoom;
  const handles: Array<{ key: ResizeHandle; x: number; y: number }> = [
    { key: "nw", x: image.x, y: image.y },
    { key: "ne", x: image.x + image.width, y: image.y },
    { key: "sw", x: image.x, y: image.y + image.height },
    { key: "se", x: image.x + image.width, y: image.y + image.height },
  ];

  return handles.find((handle) => distanceBetween(point, { x: handle.x, y: handle.y }) <= radius)?.key || null;
}

function renderImageTransform(image: WhitebookImageLayer) {
  const cropWidth = Math.max(1, image.crop.width);
  const cropHeight = Math.max(1, image.crop.height);
  const scaleX = image.width / cropWidth;
  const scaleY = image.height / cropHeight;

  return {
    sourceX: image.x - image.crop.x * scaleX,
    sourceY: image.y - image.crop.y * scaleY,
    sourceWidth: image.naturalWidth * scaleX,
    sourceHeight: image.naturalHeight * scaleY,
  };
}

interface WhitebookDraftText {
  id: string | null;
  text: string;
  x: number;
  y: number;
  color: string;
  fontSize: number;
}

function splitTextLines(value: string) {
  return value.replace(/\r\n?/g, "\n").split("\n");
}

function getTextLayerBounds(textLayer: Pick<WhitebookTextLayer, "text" | "x" | "y" | "fontSize">) {
  const lines = splitTextLines(textLayer.text || " ");
  const lineHeight = textLayer.fontSize * TEXT_LINE_HEIGHT;
  const longestLineLength = lines.reduce((max, line) => Math.max(max, line.length), 0);

  return {
    width: Math.max(textLayer.fontSize * 0.72, longestLineLength * textLayer.fontSize * 0.62),
    height: Math.max(lineHeight, lines.length * lineHeight),
    lineHeight,
  };
}

function textContainsPoint(textLayer: WhitebookTextLayer, point: WhitebookPoint) {
  const bounds = getTextLayerBounds(textLayer);
  return (
    point.x >= textLayer.x &&
    point.x <= textLayer.x + bounds.width &&
    point.y >= textLayer.y &&
    point.y <= textLayer.y + bounds.height
  );
}

type PointerMode =
  | { kind: "idle" }
  | { kind: "drawing"; pointerId: number; tool: WhitebookInkTool; points: WhitebookPoint[] }
  | {
      kind: "panning";
      pointerId: number;
      startClientX: number;
      startClientY: number;
      startOffsetX: number;
      startOffsetY: number;
    }
  | { kind: "erasing"; pointerId: number; mode: WhitebookEraserMode }
  | {
      kind: "moving-image";
      pointerId: number;
      imageId: string;
      startPoint: WhitebookPoint;
      startX: number;
      startY: number;
    }
  | {
      kind: "resizing-image";
      pointerId: number;
      imageId: string;
      handle: ResizeHandle;
      startLayer: WhitebookImageLayer;
    }
  | {
      kind: "moving-text";
      pointerId: number;
      textId: string;
      startPoint: WhitebookPoint;
      startX: number;
      startY: number;
    };

interface WhitebookCanvasProps {
  page: WhitebookPage;
  activeTool: WhitebookTool;
  eraserMode: WhitebookEraserMode;
  strokeColor: string;
  strokeSize: number;
  viewport: WhitebookViewport;
  resetSignal?: number;
  readonly?: boolean;
  className?: string;
  selectedImageId: string | null;
  onSelectedImageIdChange: (imageId: string | null) => void;
  onViewportChange: (viewport: WhitebookViewport) => void;
  onPageChange: (page: WhitebookPage) => void;
}

export function WhitebookCanvas({
  page,
  activeTool,
  eraserMode,
  strokeColor,
  strokeSize,
  viewport,
  resetSignal = 0,
  readonly = false,
  className = "",
  selectedImageId,
  onSelectedImageIdChange,
  onViewportChange,
  onPageChange,
}: WhitebookCanvasProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const pointerModeRef = useRef<PointerMode>({ kind: "idle" });
  const draftTextAreaRef = useRef<HTMLTextAreaElement | null>(null);
  const [draftStroke, setDraftStroke] = useState<{ tool: WhitebookInkTool; points: WhitebookPoint[] } | null>(null);
  const [draftText, setDraftText] = useState<WhitebookDraftText | null>(null);
  const [selectedTextId, setSelectedTextId] = useState<string | null>(null);

  useLayoutEffect(() => {
    if (!containerRef.current) {
      return;
    }

    const bounds = containerRef.current.getBoundingClientRect();
    if (!bounds.width || !bounds.height) {
      return;
    }

    onViewportChange({
      zoom: 1,
      offsetX: bounds.width / 2,
      offsetY: bounds.height / 2,
    });
  }, [onViewportChange, resetSignal]);

  useEffect(() => {
    setDraftStroke(null);
    setDraftText(null);
    setSelectedTextId(null);
    pointerModeRef.current = { kind: "idle" };
  }, [page.id]);

  useEffect(() => {
    if (!draftTextAreaRef.current || !draftText) {
      return;
    }

    draftTextAreaRef.current.focus();
    const textLength = draftTextAreaRef.current.value.length;
    draftTextAreaRef.current.setSelectionRange(textLength, textLength);
  }, [draftText]);

  useEffect(() => {
    if (selectedImageId && !page.images.some((image) => image.id === selectedImageId)) {
      onSelectedImageIdChange(null);
    }
  }, [onSelectedImageIdChange, page.images, selectedImageId]);

  useEffect(() => {
    if (selectedTextId && !page.texts.some((textLayer) => textLayer.id === selectedTextId)) {
      setSelectedTextId(null);
    }
  }, [page.texts, selectedTextId]);

  const selectedImage = page.images.find((image) => image.id === selectedImageId) || null;
  const cursorClassName = readonly
    ? "cursor-grab active:cursor-grabbing"
    : activeTool === "hand"
      ? "cursor-grab active:cursor-grabbing"
      : activeTool === "text"
        ? "cursor-text"
      : activeTool === "eraser"
        ? "cursor-cell"
        : activeTool === "select"
          ? "cursor-default"
          : "cursor-crosshair";

  const gridStyle = useMemo(() => {
    const gridSize = 40 * viewport.zoom;
    return {
      backgroundSize: `${gridSize}px ${gridSize}px`,
      backgroundPosition: `${viewport.offsetX}px ${viewport.offsetY}px`,
      backgroundImage:
        "linear-gradient(rgba(148,163,184,0.16) 1px, transparent 1px), linear-gradient(90deg, rgba(148,163,184,0.16) 1px, transparent 1px)",
    };
  }, [viewport.offsetX, viewport.offsetY, viewport.zoom]);

  const commitPageUpdate = (nextPage: WhitebookPage) => {
    onPageChange({
      ...nextPage,
      updatedAt: new Date().toISOString(),
    });
  };

  const updateImage = (imageId: string, updater: (image: WhitebookImageLayer) => WhitebookImageLayer) => {
    commitPageUpdate({
      ...page,
      images: page.images.map((image) =>
        image.id === imageId
          ? {
              ...updater(image),
              updatedAt: new Date().toISOString(),
            }
          : image
      ),
    });
  };

  const updateText = (textId: string, updater: (textLayer: WhitebookTextLayer) => WhitebookTextLayer) => {
    commitPageUpdate({
      ...page,
      texts: page.texts.map((textLayer) =>
        textLayer.id === textId
          ? {
              ...updater(textLayer),
              updatedAt: new Date().toISOString(),
            }
          : textLayer
      ),
    });
  };

  const eraseAtPoint = (point: WhitebookPoint, mode: WhitebookEraserMode) => {
    const eraseRadius = Math.max(12, strokeSize * 1.8) / viewport.zoom;

    if (mode === "stroke") {
      const nextStrokes = page.strokes.filter((stroke) => !strokeIntersectsPoint(stroke, point, eraseRadius));
      if (nextStrokes.length === page.strokes.length) {
        return;
      }

      commitPageUpdate({
        ...page,
        strokes: nextStrokes,
      });
      return;
    }

    const nextStrokes = page.strokes.flatMap((stroke) => splitStrokeByErasing(stroke, point, eraseRadius));
    const nextSignature = JSON.stringify(nextStrokes.map((stroke) => stroke.points));
    const currentSignature = JSON.stringify(page.strokes.map((stroke) => stroke.points));

    if (nextSignature === currentSignature) {
      return;
    }

    commitPageUpdate({
      ...page,
      strokes: nextStrokes,
    });
  };

  const commitDraftText = (rawValue?: string) => {
    if (!draftText) {
      return;
    }

    const currentDraft = draftText;
    const nextValue = (rawValue ?? currentDraft.text).replace(/\r\n?/g, "\n").trim();
    setDraftText(null);

    if (!nextValue) {
      if (currentDraft.id) {
        commitPageUpdate({
          ...page,
          texts: page.texts.filter((textLayer) => textLayer.id !== currentDraft.id),
        });
        setSelectedTextId(null);
      }
      return;
    }

    const now = new Date().toISOString();

    if (currentDraft.id) {
      commitPageUpdate({
        ...page,
        texts: page.texts.map((textLayer) =>
          textLayer.id === currentDraft.id
            ? {
                ...textLayer,
                text: nextValue,
                x: currentDraft.x,
                y: currentDraft.y,
                color: currentDraft.color,
                fontSize: currentDraft.fontSize,
                updatedAt: now,
              }
            : textLayer
        ),
      });
      setSelectedTextId(currentDraft.id);
      return;
    }

    const nextTextLayer: WhitebookTextLayer = {
      id: createWhitebookEntityId("wb_text"),
      type: "text",
      text: nextValue,
      x: currentDraft.x,
      y: currentDraft.y,
      color: currentDraft.color,
      fontSize: currentDraft.fontSize,
      createdAt: now,
      updatedAt: now,
    };

    commitPageUpdate({
      ...page,
      texts: [...page.texts, nextTextLayer],
    });
    setSelectedTextId(nextTextLayer.id);
  };

  const commitDraftStroke = () => {
    const pointerMode = pointerModeRef.current;
    if (pointerMode.kind !== "drawing" || pointerMode.points.length === 0) {
      setDraftStroke(null);
      pointerModeRef.current = { kind: "idle" };
      return;
    }

    const opacity = pointerMode.tool === "highlighter" ? 0.32 : 1;
    const nextStroke = {
      id: createWhitebookEntityId("wb_stroke"),
      type: "stroke" as const,
      tool: pointerMode.tool,
      color: strokeColor,
      size: strokeSize,
      opacity,
      points: pointerMode.points,
      createdAt: new Date().toISOString(),
    };

    commitPageUpdate({
      ...page,
      strokes: [...page.strokes, nextStroke],
    });
    setDraftStroke(null);
    pointerModeRef.current = { kind: "idle" };
  };

  const getTopmostImageAtPoint = (point: WhitebookPoint) => {
    for (let index = page.images.length - 1; index >= 0; index -= 1) {
      const image = page.images[index];
      if (imageContainsPoint(image, point)) {
        return image;
      }
    }

    return null;
  };

  const getTopmostTextAtPoint = (point: WhitebookPoint) => {
    for (let index = page.texts.length - 1; index >= 0; index -= 1) {
      const textLayer = page.texts[index];
      if (textContainsPoint(textLayer, point)) {
        return textLayer;
      }
    }

    return null;
  };

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    const container = containerRef.current;
    if (!container) {
      return;
    }

    const bounds = container.getBoundingClientRect();
    const worldPoint = screenToWorld(event.clientX, event.clientY, bounds, viewport);
    const shouldPan = readonly || activeTool === "hand" || event.button === 1;

    if (shouldPan) {
      pointerModeRef.current = {
        kind: "panning",
        pointerId: event.pointerId,
        startClientX: event.clientX,
        startClientY: event.clientY,
        startOffsetX: viewport.offsetX,
        startOffsetY: viewport.offsetY,
      };
      container.setPointerCapture(event.pointerId);
      return;
    }

    if (activeTool === "select") {
      if (draftText) {
        commitDraftText(draftText.text);
      }

      if (selectedImage) {
        const handle = getResizeHandle(selectedImage, worldPoint, viewport.zoom);
        if (handle) {
          pointerModeRef.current = {
            kind: "resizing-image",
            pointerId: event.pointerId,
            imageId: selectedImage.id,
            handle,
            startLayer: selectedImage,
          };
          container.setPointerCapture(event.pointerId);
          event.preventDefault();
          return;
        }
      }

      const hitText = getTopmostTextAtPoint(worldPoint);
      if (hitText) {
        onSelectedImageIdChange(null);
        setSelectedTextId(hitText.id);
        pointerModeRef.current = {
          kind: "moving-text",
          pointerId: event.pointerId,
          textId: hitText.id,
          startPoint: worldPoint,
          startX: hitText.x,
          startY: hitText.y,
        };
        container.setPointerCapture(event.pointerId);
        event.preventDefault();
        return;
      }

      const hitImage = getTopmostImageAtPoint(worldPoint);
      onSelectedImageIdChange(hitImage?.id || null);
      setSelectedTextId(null);

      if (hitImage) {
        pointerModeRef.current = {
          kind: "moving-image",
          pointerId: event.pointerId,
          imageId: hitImage.id,
          startPoint: worldPoint,
          startX: hitImage.x,
          startY: hitImage.y,
        };
        container.setPointerCapture(event.pointerId);
      }

      event.preventDefault();
      return;
    }

    if (activeTool === "eraser") {
      setSelectedTextId(null);
      eraseAtPoint(worldPoint, eraserMode);
      pointerModeRef.current = {
        kind: "erasing",
        pointerId: event.pointerId,
        mode: eraserMode,
      };
      container.setPointerCapture(event.pointerId);
      return;
    }

    if (activeTool === "text") {
      onSelectedImageIdChange(null);
      const hitText = getTopmostTextAtPoint(worldPoint);
      if (draftText && draftText.id !== hitText?.id) {
        commitDraftText(draftText.text);
      }

      if (hitText) {
        setSelectedTextId(hitText.id);
        setDraftText({
          id: hitText.id,
          text: hitText.text,
          x: hitText.x,
          y: hitText.y,
          color: hitText.color,
          fontSize: hitText.fontSize,
        });
      } else {
        setSelectedTextId(null);
        setDraftText({
          id: null,
          x: worldPoint.x,
          y: worldPoint.y,
          text: "",
          color: strokeColor,
          fontSize: Math.max(18, Math.min(96, strokeSize * 4)),
        });
      }

      pointerModeRef.current = { kind: "idle" };
      event.preventDefault();
      return;
    }

    onSelectedImageIdChange(null);
    setSelectedTextId(null);
    const tool = activeTool === "highlighter" ? "highlighter" : "pen";
    pointerModeRef.current = {
      kind: "drawing",
      pointerId: event.pointerId,
      tool,
      points: [worldPoint],
    };
    setDraftStroke({
      tool,
      points: [worldPoint],
    });
    container.setPointerCapture(event.pointerId);
    event.preventDefault();
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const container = containerRef.current;
    if (!container) {
      return;
    }

    const pointerMode = pointerModeRef.current;
    if (pointerMode.kind === "idle" || pointerMode.pointerId !== event.pointerId) {
      return;
    }

    if (pointerMode.kind === "panning") {
      onViewportChange({
        ...viewport,
        offsetX: pointerMode.startOffsetX + (event.clientX - pointerMode.startClientX),
        offsetY: pointerMode.startOffsetY + (event.clientY - pointerMode.startClientY),
      });
      return;
    }

    const bounds = container.getBoundingClientRect();
    const worldPoint = screenToWorld(event.clientX, event.clientY, bounds, viewport);

    if (pointerMode.kind === "erasing") {
      eraseAtPoint(worldPoint, pointerMode.mode);
      return;
    }

    if (pointerMode.kind === "moving-image") {
      updateImage(pointerMode.imageId, (image) => ({
        ...image,
        x: pointerMode.startX + (worldPoint.x - pointerMode.startPoint.x),
        y: pointerMode.startY + (worldPoint.y - pointerMode.startPoint.y),
      }));
      return;
    }

    if (pointerMode.kind === "moving-text") {
      updateText(pointerMode.textId, (textLayer) => ({
        ...textLayer,
        x: pointerMode.startX + (worldPoint.x - pointerMode.startPoint.x),
        y: pointerMode.startY + (worldPoint.y - pointerMode.startPoint.y),
      }));
      return;
    }

    if (pointerMode.kind === "resizing-image") {
      const { startLayer, handle } = pointerMode;
      const right = startLayer.x + startLayer.width;
      const bottom = startLayer.y + startLayer.height;
      let nextX = startLayer.x;
      let nextY = startLayer.y;
      let nextWidth = startLayer.width;
      let nextHeight = startLayer.height;

      if (handle.includes("w")) {
        nextX = Math.min(worldPoint.x, right - MIN_IMAGE_SIZE);
        nextWidth = right - nextX;
      }

      if (handle.includes("e")) {
        nextWidth = Math.max(MIN_IMAGE_SIZE, worldPoint.x - startLayer.x);
      }

      if (handle.includes("n")) {
        nextY = Math.min(worldPoint.y, bottom - MIN_IMAGE_SIZE);
        nextHeight = bottom - nextY;
      }

      if (handle.includes("s")) {
        nextHeight = Math.max(MIN_IMAGE_SIZE, worldPoint.y - startLayer.y);
      }

      updateImage(pointerMode.imageId, (image) => ({
        ...image,
        x: nextX,
        y: nextY,
        width: nextWidth,
        height: nextHeight,
      }));
      return;
    }

    const lastPoint = pointerMode.points[pointerMode.points.length - 1];
    if (lastPoint && distanceBetween(lastPoint, worldPoint) < 1.2 / viewport.zoom) {
      return;
    }

    const nextPoints = [...pointerMode.points, worldPoint];
    pointerModeRef.current = {
      ...pointerMode,
      points: nextPoints,
    };
    setDraftStroke({
      tool: pointerMode.tool,
      points: nextPoints,
    });
  };

  const handlePointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    const container = containerRef.current;
    const pointerMode = pointerModeRef.current;

    if (container?.hasPointerCapture(event.pointerId)) {
      container.releasePointerCapture(event.pointerId);
    }

    if (pointerMode.kind === "drawing" && pointerMode.pointerId === event.pointerId) {
      commitDraftStroke();
      return;
    }

    pointerModeRef.current = { kind: "idle" };
    setDraftStroke(null);
  };

  const handleWheel = (event: React.WheelEvent<HTMLDivElement>) => {
    if (!containerRef.current) {
      return;
    }

    const zoomIntensity = event.deltaY > 0 ? 0.92 : 1.08;
    const nextZoom = clampZoom(viewport.zoom * zoomIntensity);
    if (nextZoom === viewport.zoom) {
      return;
    }

    const bounds = containerRef.current.getBoundingClientRect();
    const worldPoint = screenToWorld(event.clientX, event.clientY, bounds, viewport);

    onViewportChange({
      zoom: nextZoom,
      offsetX: event.clientX - bounds.left - worldPoint.x * nextZoom,
      offsetY: event.clientY - bounds.top - worldPoint.y * nextZoom,
    });
    event.preventDefault();
  };

  const renderedDraft = draftStroke
    ? {
        path: buildWhitebookStrokePath(draftStroke.points),
        opacity: draftStroke.tool === "highlighter" ? 0.32 : 1,
      }
    : null;
  const renderedTexts = page.texts
    .filter((textLayer) => textLayer.id !== draftText?.id)
    .map((textLayer) => {
      const bounds = getTextLayerBounds(textLayer);
      return {
        ...textLayer,
        fontSize: Math.max(12, textLayer.fontSize),
        lineHeight: bounds.lineHeight,
      };
    });
  const draftTextPosition = draftText
    ? {
        left: viewport.offsetX + draftText.x * viewport.zoom,
        top: viewport.offsetY + draftText.y * viewport.zoom,
      }
    : null;
  const draftTextFontSize = (draftText?.fontSize || Math.max(18, Math.min(96, strokeSize * 4))) * viewport.zoom;

  return (
    <div
      ref={containerRef}
      className={`relative min-h-[560px] overflow-hidden rounded-[28px] border border-app-border bg-white shadow-[inset_0_1px_0_rgba(255,255,255,0.75)] ${cursorClassName} ${className}`}
      style={{ touchAction: "none" }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onWheel={handleWheel}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(37,99,235,0.08),transparent_28%)]" />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.65),rgba(248,250,252,0.45))]" />
      <div className="absolute inset-0" style={gridStyle} />

      <svg className="absolute inset-0 h-full w-full" aria-label="WhiteBook drawing surface">
        <defs>
          {page.images.map((image) => (
            <clipPath key={`clip-${image.id}`} id={`clip-${image.id}`}>
              <rect x={image.x} y={image.y} width={image.width} height={image.height} rx="12" ry="12" />
            </clipPath>
          ))}
        </defs>
        <g transform={`translate(${viewport.offsetX} ${viewport.offsetY}) scale(${viewport.zoom})`}>
          {page.images.map((image) => {
            const transform = renderImageTransform(image);

            return (
              <g key={image.id}>
                <image
                  href={image.src}
                  x={transform.sourceX}
                  y={transform.sourceY}
                  width={transform.sourceWidth}
                  height={transform.sourceHeight}
                  preserveAspectRatio="none"
                  clipPath={`url(#clip-${image.id})`}
                />
                <rect
                  x={image.x}
                  y={image.y}
                  width={image.width}
                  height={image.height}
                  rx={12}
                  ry={12}
                  fill="none"
                  stroke="rgba(148,163,184,0.34)"
                  strokeWidth={1.5}
                />
              </g>
            );
          })}

          {page.strokes.map((stroke) => (
            <path
              key={stroke.id}
              d={buildWhitebookStrokePath(stroke.points)}
              stroke={stroke.color}
              strokeWidth={stroke.size}
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
              opacity={stroke.opacity}
            />
          ))}

          {renderedDraft ? (
            <path
              d={renderedDraft.path}
              stroke={strokeColor}
              strokeWidth={strokeSize}
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
              opacity={renderedDraft.opacity}
            />
          ) : null}

          {!readonly && selectedImage ? (
            <g>
              <rect
                x={selectedImage.x}
                y={selectedImage.y}
                width={selectedImage.width}
                height={selectedImage.height}
                rx={12}
                ry={12}
                fill="none"
                stroke="#2563eb"
                strokeWidth={2}
                strokeDasharray="14 10"
              />
              {[
                { x: selectedImage.x, y: selectedImage.y },
                { x: selectedImage.x + selectedImage.width, y: selectedImage.y },
                { x: selectedImage.x, y: selectedImage.y + selectedImage.height },
                { x: selectedImage.x + selectedImage.width, y: selectedImage.y + selectedImage.height },
              ].map((handle) => (
                <rect
                  key={`${handle.x}-${handle.y}`}
                  x={handle.x - 7 / viewport.zoom}
                  y={handle.y - 7 / viewport.zoom}
                  width={14 / viewport.zoom}
                  height={14 / viewport.zoom}
                  rx={3 / viewport.zoom}
                  fill="#ffffff"
                  stroke="#2563eb"
                  strokeWidth={2 / viewport.zoom}
                />
              ))}
            </g>
          ) : null}
        </g>
      </svg>

      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div
          style={{
            transform: `translate(${viewport.offsetX}px, ${viewport.offsetY}px) scale(${viewport.zoom})`,
            transformOrigin: "0 0",
          }}
        >
          {renderedTexts.map((textLayer) => (
            <div
              key={textLayer.id}
              className="absolute whitespace-pre-wrap font-semibold"
              style={{
                left: textLayer.x,
                top: textLayer.y,
                color: textLayer.color,
                fontSize: textLayer.fontSize,
                lineHeight: `${textLayer.lineHeight}px`,
                outline:
                  !readonly && selectedTextId === textLayer.id ? `${Math.max(1, 1.5 / viewport.zoom)}px solid #2563eb` : "none",
                outlineOffset: `${Math.max(2, 4 / viewport.zoom)}px`,
                borderRadius: `${Math.max(6, 10 / viewport.zoom)}px`,
              }}
            >
              {textLayer.text}
            </div>
          ))}
        </div>
      </div>

      {!readonly && draftTextPosition ? (
        <div
          className="absolute z-20"
          style={{
            left: draftTextPosition.left,
            top: draftTextPosition.top,
          }}
          onPointerDown={(event) => event.stopPropagation()}
        >
          <textarea
            ref={draftTextAreaRef}
            value={draftText?.text || ""}
            onChange={(event) =>
              setDraftText((current) => (current ? { ...current, text: event.target.value } : current))
            }
            onBlur={(event) => commitDraftText(event.target.value)}
            onClick={(event) => event.stopPropagation()}
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                event.preventDefault();
                setDraftText(null);
                return;
              }

              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                commitDraftText(event.currentTarget.value);
              }
            }}
            placeholder="Type here"
            className="min-h-[92px] max-w-[72vw] rounded-[18px] border border-brand/20 bg-white/96 px-3 py-2 font-semibold text-app-text outline-none shadow-[0_18px_44px_-28px_rgba(37,99,235,0.48)]"
            style={{
              width: Math.max(220, Math.min(360, 260 * viewport.zoom)),
              color: draftText?.color || strokeColor,
              fontSize: Math.max(16, draftTextFontSize),
              lineHeight: TEXT_LINE_HEIGHT,
              resize: "none",
            }}
          />
          <p className="mt-1 inline-flex rounded-full bg-white/95 px-2 py-1 text-[10px] font-semibold text-app-muted shadow-sm">
            Enter saves, Shift+Enter adds a new line, Select tool drags text
          </p>
        </div>
      ) : null}
    </div>
  );
}
