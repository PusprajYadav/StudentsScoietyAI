import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { networkInterfaces } from "node:os";
import { resolve } from "node:path";
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

const BACKEND_API_DEV_PROXY_PREFIX = "/__backend-api-proxy";
const BULK_MAILER_DEV_PROXY_PREFIX = "/__bulk-mailer-api-proxy";
const INSTAGRAM_AUTOMATION_DEV_PROXY_PREFIX = "/__instagram-automation-api-proxy";

function readNumberEnv(value: string | undefined, fallback: number) {
  if (!value) {
    return fallback;
  }

  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function resolveFirstExternalIpv4Address() {
  const interfaces = networkInterfaces();

  for (const addresses of Object.values(interfaces)) {
    for (const address of addresses ?? []) {
      if (address.family === "IPv4" && !address.internal) {
        return address.address;
      }
    }
  }

  return undefined;
}

function buildOfflinePrecacheAssets(bundle: Record<string, { fileName?: string }>) {
  const assets = new Set<string>([
    "/",
    "/index.html",
    "/logo.png",
    "/manifest.webmanifest",
    "/student-society-avatar.svg",
    "/student-society-banner.svg",
  ]);

  Object.keys(bundle).forEach((fileName) => {
    if (!fileName || fileName === "offline-sw.js" || fileName.endsWith(".map")) {
      return;
    }

    assets.add(`/${fileName}`);
  });

  return Array.from(assets).sort();
}

function offlineWorkerPrecachePlugin() {
  let outDir = "dist";

  return {
    name: "student-society-offline-worker-precache",
    apply: "build" as const,
    configResolved(config: { build: { outDir: string } }) {
      outDir = config.build.outDir;
    },
    writeBundle(_: unknown, bundle: Record<string, { fileName?: string }>) {
      const serviceWorkerPath = resolve(outDir, "offline-sw.js");

      if (!existsSync(serviceWorkerPath)) {
        return;
      }

      const source = readFileSync(serviceWorkerPath, "utf8");
      const precacheAssets = JSON.stringify(buildOfflinePrecacheAssets(bundle), null, 2);
      writeFileSync(
        serviceWorkerPath,
        `self.__STUDENT_SOCIETY_OFFLINE_ASSETS__ = ${precacheAssets};\n${source}`
      );
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const fastApiBaseUrl =
    env.VITE_FASTAPI_DEV_API_BASE_URL?.replace(/\/$/, "") ||
    env.VITE_BACKEND_BASE_URL?.replace(/\/$/, "") ||
    env.VITE_FASTAPI_API_BASE_URL?.replace(/\/$/, "") ||
    env.VITE_BULK_MAILER_API_BASE_URL?.replace(/\/$/, "") ||
    env.VITE_INSTAGRAM_AUTOMATION_API_BASE_URL?.replace(/\/$/, "");
  const isCapacitorLiveReload =
    env.VITE_CAPACITOR_LIVE_RELOAD === "1" || env.CAPACITOR_LIVE_RELOAD === "1";
  const devServerPort = readNumberEnv(env.VITE_DEV_SERVER_PORT, 5173);
  const explicitDevServerHost = env.VITE_DEV_SERVER_HOST?.trim();
  const explicitHmrHost = env.VITE_HMR_HOST?.trim();
  const liveReloadHost = explicitHmrHost || resolveFirstExternalIpv4Address();
  const resolvedDevServerHost =
    explicitDevServerHost || (isCapacitorLiveReload ? "0.0.0.0" : true);
  const resolvedHmrClientPort = readNumberEnv(env.VITE_HMR_CLIENT_PORT, devServerPort);
  const resolvedHmrPort =
    env.VITE_HMR_PORT?.trim() ? readNumberEnv(env.VITE_HMR_PORT, devServerPort) : undefined;
  const resolvedHmrProtocol =
    env.VITE_HMR_PROTOCOL === "wss" || env.VITE_HMR_PROTOCOL === "ws"
      ? env.VITE_HMR_PROTOCOL
      : undefined;
  const hmrConfig =
    isCapacitorLiveReload || explicitHmrHost || env.VITE_HMR_CLIENT_PORT || env.VITE_HMR_PORT
      ? {
          host: liveReloadHost,
          clientPort: resolvedHmrClientPort,
          port: resolvedHmrPort,
          protocol: resolvedHmrProtocol,
        }
      : undefined;

  return {
    plugins: [react(), offlineWorkerPrecachePlugin()],
    resolve: {
      dedupe: ["react", "react-dom"],
    },
    optimizeDeps: {
      include: [
        "react",
        "react-dom",
        "react/jsx-runtime",
        "@monaco-editor/react",
        "@monaco-editor/loader",
        "monaco-editor",
        "html2pdf.js",
        "html2canvas",
        "jspdf",
        "date-fns",
        "qr-code-styling",
        "react-player",
        "lucide-react",
        "framer-motion",
      ],
      exclude: ["pdfjs-dist", "pdfjs-dist/build/pdf.mjs"],
    },
    server: {
      host: resolvedDevServerHost,
      port: devServerPort,
      strictPort: true,
      hmr: hmrConfig,
      proxy: {
        ...(fastApiBaseUrl
          ? {
              [BACKEND_API_DEV_PROXY_PREFIX]: {
                target: fastApiBaseUrl,
                changeOrigin: true,
                ws: true,
                rewrite: (path) => path.replace(new RegExp(`^${BACKEND_API_DEV_PROXY_PREFIX}`), ""),
              },
              [BULK_MAILER_DEV_PROXY_PREFIX]: {
                target: fastApiBaseUrl,
                changeOrigin: true,
                rewrite: (path) => path.replace(new RegExp(`^${BULK_MAILER_DEV_PROXY_PREFIX}`), ""),
              },
              [INSTAGRAM_AUTOMATION_DEV_PROXY_PREFIX]: {
                target: fastApiBaseUrl,
                changeOrigin: true,
                rewrite: (path) => path.replace(new RegExp(`^${INSTAGRAM_AUTOMATION_DEV_PROXY_PREFIX}`), ""),
              },
            }
          : {}),
      },
    },
    build: {
      chunkSizeWarningLimit: 1000,
      rollupOptions: {
        output: {
          manualChunks: {
            vendor: ["react", "react-dom", "react-router-dom"],
            supabase: ["@supabase/supabase-js"],
            ui: ["lucide-react", "framer-motion", "react-hot-toast"],
          },
        },
      },
    },
  };
});
