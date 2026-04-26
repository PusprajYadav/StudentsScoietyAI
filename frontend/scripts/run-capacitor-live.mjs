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

const platform = process.argv[2];

if (platform !== "android" && platform !== "ios") {
  console.error('Usage: node scripts/run-capacitor-live.mjs <android|ios>');
  process.exit(1);
}

const host = process.env.VITE_HMR_HOST || resolveFirstExternalIpv4Address();

if (!host) {
  console.error("Could not find a reachable IPv4 address for Capacitor live reload.");
  process.exit(1);
}

const port = process.env.VITE_DEV_SERVER_PORT || "5173";
const args = ["cap", "run", platform, "--live-reload", "--host", host, "--port", port];

if (platform === "android") {
  args.push("--forwardPorts", `${port}:${port}`);
}

console.log(`Running Capacitor ${platform} live reload against http://${host}:${port}`);

const child = spawn(process.platform === "win32" ? "npx.cmd" : "npx", args, {
  env: process.env,
  stdio: "inherit",
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 0);
});
