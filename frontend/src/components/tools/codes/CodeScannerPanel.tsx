import { Camera, CheckCircle2, ImageUp, Loader2, RefreshCw, RotateCcw, ScanLine, Square, VideoOff } from "lucide-react";
import { useDropzone } from "react-dropzone";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import type { CameraDevice, Html5Qrcode, Html5QrcodeSupportedFormats } from "html5-qrcode";

interface CodeScannerPanelProps {
  title: string;
  hint: string;
  formats: number[];
  onDetected: (decodedText: string, formatName?: string) => void;
}

const DIRECT_IMAGE_SCAN_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/bmp",
]);

function isMobileViewport() {
  if (typeof window === "undefined") {
    return false;
  }

  return window.matchMedia("(max-width: 767px)").matches;
}

function getPreferredCameraId(cameras: CameraDevice[]) {
  if (cameras.length === 0) {
    return "";
  }

  const rearCamera = cameras.find((camera) => {
    const label = camera.label.toLowerCase();
    return label.includes("back") || label.includes("rear") || label.includes("environment");
  });

  return rearCamera?.id || cameras[0]?.id || "";
}

async function convertImageToPngFile(file: File) {
  if (DIRECT_IMAGE_SCAN_TYPES.has(file.type)) {
    return file;
  }

  const objectUrl = URL.createObjectURL(file);

  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const nextImage = new Image();
      nextImage.onload = () => resolve(nextImage);
      nextImage.onerror = () => reject(new Error("Could not decode that image."));
      nextImage.src = objectUrl;
    });

    const canvas = document.createElement("canvas");
    canvas.width = image.naturalWidth || image.width;
    canvas.height = image.naturalHeight || image.height;
    const context = canvas.getContext("2d");

    if (!context) {
      throw new Error("Canvas is not available for image conversion.");
    }

    context.drawImage(image, 0, 0);

    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((nextBlob) => {
        if (!nextBlob) {
          reject(new Error("Could not convert that image."));
          return;
        }

        resolve(nextBlob);
      }, "image/png");
    });

    const nextName = file.name.replace(/\.[^.]+$/, "") || "scan-image";
    return new File([blob], `${nextName}.png`, { type: "image/png" });
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

export function CodeScannerPanel({ title, hint, formats, onDetected }: CodeScannerPanelProps) {
  const elementId = `scanner-${useId().replace(/:/g, "")}`;
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const lastDecodedRef = useRef<string>("");
  const mountedRef = useRef(true);
  const autoStartedRef = useRef(false);
  const [cameras, setCameras] = useState<CameraDevice[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState("");
  const [running, setRunning] = useState(false);
  const [cameraBusy, setCameraBusy] = useState(false);
  const [imageBusy, setImageBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scanComplete, setScanComplete] = useState(false);
  const [scanCount, setScanCount] = useState(0);

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
      void stopScanner();
    };
  }, []);

  async function stopScanner() {
    const activeScanner = scannerRef.current;

    if (!activeScanner) {
      return;
    }

    try {
      await activeScanner.stop();
    } catch {
      // Ignore stop races when the scanner is not actively streaming.
    }

    try {
      activeScanner.clear();
    } catch {
      // Ignore cleanup errors.
    }

    scannerRef.current = null;
    lastDecodedRef.current = "";

    if (mountedRef.current) {
      setRunning(false);
    }
  }

  const startScanner = useCallback(async () => {
    if (!mountedRef.current) return;

    setError(null);
    setCameraBusy(true);
    setScanComplete(false);

    try {
      if (scannerRef.current) {
        await stopScanner();
      }

      const { Html5Qrcode } = await import("html5-qrcode");

      // If no cameras discovered yet, try to get them first
      let currentCameras = cameras;
      let currentSelectedId = selectedCameraId;
      if (currentCameras.length === 0) {
        try {
          currentCameras = await Html5Qrcode.getCameras();
          if (mountedRef.current) {
            setCameras(currentCameras);
            currentSelectedId = getPreferredCameraId(currentCameras);
            setSelectedCameraId(currentSelectedId);
          }
        } catch {
          // Camera enumeration failed, will try facingMode fallback
        }
      }

      const cameraSource =
        currentSelectedId ||
        getPreferredCameraId(currentCameras) ||
        {
          facingMode: {
            ideal: "environment",
          },
        };

      const nextScanner = new Html5Qrcode(elementId, {
        formatsToSupport: formats as Html5QrcodeSupportedFormats[],
        useBarCodeDetectorIfSupported: true,
        verbose: false,
      });

      scannerRef.current = nextScanner;
      const mobileViewport = isMobileViewport();
      const scanConfig = {
        fps: mobileViewport ? 8 : 12,
        qrbox: (viewfinderWidth: number, viewfinderHeight: number) => {
          const baseSize = mobileViewport ? 180 : 220;
          const maxSize = mobileViewport ? 240 : 280;
          const size = Math.max(baseSize, Math.min(viewfinderWidth, viewfinderHeight, maxSize));
          return {
            width: size,
            height: formats.length === 1 && formats[0] === 0 ? size : Math.round(size * 0.68),
          };
        },
        aspectRatio: mobileViewport ? 1.333334 : 1,
        disableFlip: false,
      };
      const onSuccess = (decodedText: string, result: { result: { format?: { formatName?: string } } }) => {
        if (decodedText === lastDecodedRef.current) {
          return;
        }

        lastDecodedRef.current = decodedText;

        // Auto-stop the camera after a successful detection
        void stopScanner().then(() => {
          if (mountedRef.current) {
            setScanComplete(true);
            setScanCount((current) => current + 1);
          }
        });

        onDetected(decodedText, result.result.format?.formatName);
      };

      try {
        await nextScanner.start(cameraSource, scanConfig, onSuccess, () => undefined);
      } catch (cameraError) {
        if (typeof cameraSource === "object") {
          throw cameraError;
        }

        await nextScanner.start(
          {
            facingMode: {
              ideal: "environment",
            },
          },
          scanConfig,
          onSuccess,
          () => undefined
        );
      }

      if (mountedRef.current) {
        setRunning(true);
      }
    } catch (nextError) {
      console.error("Could not start scanner", nextError);

      if (mountedRef.current) {
        setError(nextError instanceof Error ? nextError.message : "Camera scanning could not start.");
      }
    } finally {
      if (mountedRef.current) {
        setCameraBusy(false);
      }
    }
  }, [cameras, selectedCameraId, elementId, formats, onDetected]);

  // Auto-start the camera when the panel mounts
  useEffect(() => {
    if (autoStartedRef.current) return;
    autoStartedRef.current = true;

    // Small delay to let the DOM element render first
    const timer = setTimeout(() => {
      if (mountedRef.current && !scannerRef.current) {
        void startScanner();
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [startScanner]);

  async function refreshCameras() {
    setCameraBusy(true);
    setError(null);

    try {
      const { Html5Qrcode } = await import("html5-qrcode");
      const nextCameras = await Html5Qrcode.getCameras();

      if (!mountedRef.current) {
        return;
      }

      setCameras(nextCameras);
      setSelectedCameraId((current) => current || getPreferredCameraId(nextCameras));
    } catch (nextError) {
      if (!mountedRef.current) {
        return;
      }

      console.error("Could not read cameras", nextError);
      setError("Camera access is not ready yet. You can still scan from an image.");
    } finally {
      if (mountedRef.current) {
        setCameraBusy(false);
      }
    }
  }

  async function scanImage(file: File) {
    setImageBusy(true);
    setError(null);
    setScanComplete(false);

    try {
      await stopScanner();
      const { Html5Qrcode } = await import("html5-qrcode");
      const scanReadyFile = await convertImageToPngFile(file);
      const imageScanner = new Html5Qrcode(elementId, {
        formatsToSupport: formats as Html5QrcodeSupportedFormats[],
        useBarCodeDetectorIfSupported: true,
        verbose: false,
      });

      const result = await imageScanner.scanFileV2(scanReadyFile, false);
      imageScanner.clear();
      setScanComplete(true);
      setScanCount((current) => current + 1);
      onDetected(result.decodedText, result.result.format?.formatName);
    } catch (nextError) {
      console.error("Could not scan image", nextError);
      setError("That image could not be decoded. Try a clearer photo or the live camera.");
    } finally {
      if (mountedRef.current) {
        setImageBusy(false);
      }
    }
  }

  function handleScanAgain() {
    setScanComplete(false);
    lastDecodedRef.current = "";
    void startScanner();
  }

  const dropzone = useDropzone({
    accept: {
      "image/*": [".png", ".jpg", ".jpeg", ".webp", ".bmp", ".avif"],
    },
    multiple: false,
    noClick: true,
    onDropAccepted: (files) => {
      const [file] = files;

      if (file) {
        void scanImage(file);
      }
    },
  });

  return (
    <div className="grid gap-3 md:gap-4 lg:grid-cols-[minmax(0,1.12fr)_minmax(260px,0.88fr)]">
      <section className="glass-card overflow-hidden rounded-[22px] sm:rounded-[28px]">
        <div className="border-b border-app-border/70 px-3 py-3 sm:px-4">
          <div className="flex items-start gap-2.5 sm:items-center sm:gap-3">
            <div className="rounded-[14px] bg-brand/10 p-2 text-brand sm:rounded-[16px] sm:p-2.5">
              <ScanLine className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-display text-[0.98rem] font-semibold tracking-tight text-app-text">{title}</h3>
                <span className="rounded-full bg-app-secondary px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-app-muted">
                  {scanCount} scans
                </span>
              </div>
              <p className="mt-0.5 text-[11px] leading-5 text-app-muted sm:text-xs">{hint}</p>
            </div>
          </div>
        </div>

        <div className="p-2.5 sm:p-4">
          <div className="relative overflow-hidden rounded-[20px] border border-app-border bg-[#020617] sm:rounded-[24px]">
            <div
              id={elementId}
              className="min-h-[240px] bg-[radial-gradient(circle_at_top,_rgba(37,99,235,0.22),_transparent_45%),linear-gradient(180deg,_rgba(15,23,42,0.88),_rgba(2,6,23,1))] sm:min-h-[280px]"
            />
            {scanComplete ? (
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <div className="rounded-[18px] border border-emerald-400/30 bg-emerald-500/10 px-4 py-3 text-center backdrop-blur-xl animate-[pulse_1.5s_ease-in-out_1] sm:rounded-[22px] sm:px-5 sm:py-4">
                  <CheckCircle2 className="mx-auto h-7 w-7 text-emerald-400 sm:h-8 sm:w-8" />
                  <p className="mt-2 text-sm font-semibold text-emerald-200">Code detected!</p>
                  <p className="mt-1 text-[11px] text-emerald-300/80">Camera stopped. Result is ready below.</p>
                </div>
              </div>
            ) : !running ? (
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <div className="rounded-[18px] border border-white/10 bg-white/5 px-4 py-3 text-center backdrop-blur-xl sm:rounded-[22px]">
                  {cameraBusy ? (
                    <>
                      <Loader2 className="mx-auto h-6 w-6 animate-spin text-blue-300" />
                      <p className="mt-2 text-sm font-semibold text-white">Starting camera...</p>
                    </>
                  ) : (
                    <>
                      <Camera className="mx-auto h-6 w-6 text-slate-200" />
                      <p className="mt-2 text-sm font-semibold text-white">Initializing camera...</p>
                      <p className="mt-1 text-[11px] text-slate-300">Rear camera opens by default on mobile.</p>
                    </>
                  )}
                </div>
              </div>
            ) : (
              <div className="pointer-events-none absolute inset-0 rounded-[20px] border-2 border-white/15 sm:rounded-[24px] sm:border-[3px]">
                <div className="absolute inset-4 rounded-[16px] border border-white/25 shadow-[0_0_0_1px_rgba(255,255,255,0.06)] sm:inset-5 sm:rounded-[20px]" />
                <div
                  className="absolute left-4 right-4 h-0.5 animate-[scanPulse_2s_ease-in-out_infinite] rounded-full bg-gradient-to-r from-transparent via-blue-400 to-transparent opacity-80 sm:left-6 sm:right-6"
                  style={{ top: "50%" }}
                />
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="glass-card rounded-[22px] p-3 sm:rounded-[28px] sm:p-4">
        <div className="space-y-2.5">
          {scanComplete ? (
            <div className="rounded-[18px] border border-emerald-200 bg-emerald-50 p-3 dark:border-emerald-500/20 dark:bg-emerald-500/10 sm:rounded-[20px]">
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                <div>
                  <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-200">Scan Successful</p>
                  <p className="mt-0.5 text-xs text-emerald-600 dark:text-emerald-400">
                    Session scans: {scanCount}. Camera has been stopped.
                  </p>
                </div>
              </div>
              <button
                type="button"
                className="btn-primary mt-3 w-full gap-2 !rounded-full !px-4"
                onClick={handleScanAgain}
                disabled={cameraBusy}
              >
                {cameraBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
                Scan Again
              </button>
            </div>
          ) : (
            <div className="rounded-[18px] border border-app-border bg-app-card/70 p-2.5 sm:rounded-[20px]">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-app-muted">Camera</p>
              <div className="mt-2 flex flex-wrap gap-2">
                <button
                  type="button"
                  className="btn-primary min-h-[42px] flex-1 gap-2 !rounded-full !px-3 sm:min-h-0 sm:flex-none sm:!px-4"
                  onClick={() => void startScanner()}
                  disabled={cameraBusy || running}
                >
                  {cameraBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
                  Start
                </button>
                <button
                  type="button"
                  className="btn-secondary min-h-[42px] flex-1 gap-2 !rounded-full !px-3 sm:min-h-0 sm:flex-none sm:!px-4"
                  onClick={() => void stopScanner()}
                  disabled={cameraBusy || !running}
                >
                  <VideoOff className="h-4 w-4" />
                  Stop
                </button>
                <button
                  type="button"
                  className="btn-secondary min-h-[42px] flex-1 gap-2 !rounded-full !px-3 sm:min-h-0 sm:flex-none sm:!px-4"
                  onClick={() => void refreshCameras()}
                  disabled={cameraBusy}
                >
                  <RefreshCw className={`h-4 w-4 ${cameraBusy ? "animate-spin" : ""}`} />
                  Refresh
                </button>
              </div>

              <label className="mt-3 block">
                <span className="text-[11px] font-medium text-app-muted">Camera source</span>
                <select
                  value={selectedCameraId}
                  onChange={(event) => setSelectedCameraId(event.target.value)}
                  className="input-field mt-1 !rounded-[16px] !px-3 !py-2 text-xs"
                  disabled={cameraBusy || cameras.length === 0}
                >
                  {cameras.length === 0 ? <option value="">No camera detected yet</option> : null}
                  {cameras.map((camera) => (
                    <option key={camera.id} value={camera.id}>
                      {camera.label || "Camera"}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-[11px] text-app-muted">Back camera is preferred automatically when available.</p>
              </label>
            </div>
          )}

          <div
            {...dropzone.getRootProps()}
            className={`rounded-[18px] border border-dashed p-3 transition sm:rounded-[20px] ${
              dropzone.isDragActive
                ? "border-brand bg-brand/5"
                : "border-app-border bg-app-card/70 hover:border-brand/30 hover:bg-brand/5"
            }`}
          >
            <input {...dropzone.getInputProps()} />
            <div className="flex items-start gap-3">
              <div className="rounded-[14px] bg-brand/10 p-2.5 text-brand sm:rounded-[16px]">
                <ImageUp className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-app-text">Scan from image</p>
                <p className="mt-1 text-xs leading-5 text-app-muted">
                  Drop PNG, JPG, WEBP, or AVIF. Unsupported formats are converted automatically.
                </p>
                <button
                  type="button"
                  className="btn-secondary mt-2 min-h-[42px] w-full gap-2 !rounded-full !px-4 sm:min-h-0 sm:w-auto"
                  onClick={() => dropzone.open()}
                  disabled={imageBusy}
                >
                  {imageBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Square className="h-4 w-4" />}
                  Choose image
                </button>
              </div>
            </div>
          </div>

          {error ? (
            <div className="rounded-[20px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-100">
              {error}
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
}
