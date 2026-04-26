import { networkInterfaces } from "node:os";
import { spawn } from "node:child_process";

function resolveFirstExternalIpv4Address() {
  const interfaces = networkInterfaces();

  for (const addresses of Object.values(interfaces)) {
    for (const address of addresses ?? []) {
      if (address.family === "IPv4" && !address.internal) {
        return address.address;
      }
    }
  }

  return null;
}

const host = process.env.VITE_HMR_HOST || resolveFirstExternalIpv4Address();
const forceOptimize = process.argv.includes("--force");

if (!host) {
  console.error("Could not find a reachable IPv4 address for native live reload.");
  process.exit(1);
}

const port = process.env.VITE_DEV_SERVER_PORT || "5173";
const env = {
  ...process.env,
  VITE_CAPACITOR_LIVE_RELOAD: "1",
  VITE_DEV_SERVER_HOST: process.env.VITE_DEV_SERVER_HOST || "0.0.0.0",
  VITE_HMR_HOST: host,
  VITE_HMR_CLIENT_PORT: process.env.VITE_HMR_CLIENT_PORT || port,
  VITE_DEV_SERVER_PORT: port,
};

console.log(
  `Starting native live-reload dev server at http://${host}:${port}${forceOptimize ? " (forced optimize)" : ""}`
);

const child = spawn(
  process.platform === "win32" ? "npx.cmd" : "npx",
  forceOptimize ? ["vite", "--force"] : ["vite"],
  {
    env,
    stdio: "inherit",
  }
);

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 0);
});
