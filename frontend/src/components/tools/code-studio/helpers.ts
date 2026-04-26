import { Monitor, Smartphone, Tablet } from "lucide-react";
import type { Judge0LanguageKey, Judge0LanguageOption } from "../../../lib/judge0";
import type {
  CodeStudioMode,
  CodeStudioStorage,
  PreviewDevice,
  PreviewDeviceOption,
  PreviewMessagePayload,
  PreviewMode,
  PreviewSnapshot,
  PreviewViewportStyle,
  SingleEditorMode,
  WebDraftKey,
} from "./types";

export const STORAGE_KEY = "student-society-code-studio-v4";
export const PREVIEW_MESSAGE_SOURCE = "student-society-code-studio-preview";
export const RUNTIME_PLACEHOLDER = "Run your code to see stdout, compile output, and runtime messages here.";
export const PREVIEW_PLACEHOLDER = "Run the preview to see console logs, render status, and browser errors here.";
export const OUTPUT_PANEL_TEXT_COLOR = "#e7efff";

export const RUNTIME_MODE_ORDER: Judge0LanguageKey[] = [
  "javascript",
  "typescript",
  "python",
  "java",
  "cpp",
  "csharp",
  "c",
  "ruby",
  "php",
  "go",
  "rust",
];

export const ALL_MODE_ORDER: CodeStudioMode[] = [...RUNTIME_MODE_ORDER, "html", "css", "web"];

export const PREVIEW_DEVICE_OPTIONS: PreviewDeviceOption[] = [
  {
    key: "mobile",
    label: "Mobile",
    description: "390px width",
    icon: Smartphone,
  },
  {
    key: "tablet",
    label: "Tablet",
    description: "768px width",
    icon: Tablet,
  },
  {
    key: "laptop",
    label: "Laptop",
    description: "Full workspace width",
    icon: Monitor,
  },
];

export const MODE_LABELS: Record<CodeStudioMode, string> = {
  javascript: "JavaScript",
  typescript: "TypeScript",
  python: "Python",
  java: "Java",
  cpp: "C++",
  csharp: "C#",
  c: "C",
  ruby: "Ruby",
  php: "PHP",
  go: "Go",
  rust: "Rust",
  html: "HTML",
  css: "CSS",
  web: "Web (HTML + CSS + JS)",
};

export const DEFAULT_SINGLE_DRAFTS: Record<SingleEditorMode, string> = {
  javascript: `function greet(name) {
  return \`Hello, \${name}!\`;
}

console.log(greet("Student Society"));`,
  typescript: `type Member = {
  name: string;
  tools: number;
};

const member: Member = { name: "Student Society", tools: 3 };

console.log(\`\${member.name} launched \${member.tools} tools.\`);`,
  python: `def greet(name: str) -> str:
    return f"Hello, {name}!"


print(greet("Student Society"))`,
  java: `public class Main {
  public static void main(String[] args) {
    System.out.println("Hello, Student Society!");
  }
}`,
  cpp: `#include <iostream>

int main() {
  std::cout << "Hello, Student Society!" << std::endl;
  return 0;
}`,
  csharp: `using System;

public class Program
{
  public static void Main()
  {
    Console.WriteLine("Hello, Student Society!");
  }
}`,
  c: `#include <stdio.h>

int main(void) {
  printf("Hello, Student Society!\\n");
  return 0;
}`,
  ruby: `def greet(name)
  "Hello, #{name}!"
end

puts greet("Student Society")`,
  php: `<?php

function greet(string $name): string
{
    return "Hello, {$name}!";
}

echo greet("Student Society");`,
  go: `package main

import "fmt"

func main() {
  fmt.Println("Hello, Student Society!")
}`,
  rust: `fn main() {
    println!("Hello, Student Society!");
}`,
  html: `<section class="hero-card">
  <span class="eyebrow">Student Society</span>
  <h1>Frontend Practice Space</h1>
  <p>
    Edit this HTML and click Run to preview your structure inside the browser sandbox.
  </p>
  <button>Open Tool Workspace</button>
</section>`,
  css: `.student-preview-shell {
  display: grid;
  gap: 1.5rem;
  padding: 2rem;
}

.hero-card,
.note-card {
  border-radius: 24px;
  padding: 1.5rem;
  background: linear-gradient(135deg, #eff6ff, #dbeafe);
  border: 1px solid rgba(37, 99, 235, 0.18);
  box-shadow: 0 18px 40px -30px rgba(15, 23, 42, 0.45);
}

.eyebrow {
  display: inline-flex;
  border-radius: 999px;
  background: rgba(37, 99, 235, 0.1);
  color: #1d4ed8;
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  padding: 0.35rem 0.75rem;
}

.hero-card h1 {
  margin: 1rem 0 0.5rem;
  font-size: clamp(1.8rem, 3vw, 2.6rem);
}

.hero-card button {
  margin-top: 1rem;
  border: 0;
  border-radius: 999px;
  background: #2563eb;
  color: white;
  padding: 0.8rem 1.2rem;
  font-weight: 700;
  cursor: pointer;
}

.preview-grid {
  display: grid;
  gap: 1rem;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
}`,
};

export const DEFAULT_WEB_DRAFTS: Record<WebDraftKey, string> = {
  html: `<main class="web-lab">
  <span class="eyebrow">Student Society</span>
  <h1>Web Lab</h1>
  <p>Edit HTML, CSS, and JavaScript together, then click Run.</p>

  <div class="panel">
    <button id="countButton" type="button">
      Clicked <span id="countValue">0</span> times
    </button>
    <p id="statusText">Ready for interaction.</p>
  </div>
</main>`,
  css: `body {
  margin: 0;
  min-height: 100vh;
  display: grid;
  place-items: center;
  background:
    radial-gradient(circle at top left, rgba(96, 165, 250, 0.28), transparent 28rem),
    linear-gradient(180deg, #f8fafc, #e2e8f0);
  color: #0f172a;
}

.web-lab {
  width: min(680px, calc(100vw - 2rem));
  border-radius: 28px;
  padding: 2rem;
  background: rgba(255, 255, 255, 0.88);
  border: 1px solid rgba(148, 163, 184, 0.28);
  box-shadow: 0 22px 48px -32px rgba(15, 23, 42, 0.4);
}

.eyebrow {
  display: inline-flex;
  border-radius: 999px;
  background: rgba(37, 99, 235, 0.1);
  color: #1d4ed8;
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  padding: 0.35rem 0.75rem;
}

.web-lab h1 {
  margin: 1rem 0 0.5rem;
  font-size: clamp(2rem, 3vw, 2.8rem);
}

.panel {
  margin-top: 1.5rem;
  display: grid;
  gap: 1rem;
}

#countButton {
  justify-self: start;
  border: 0;
  border-radius: 999px;
  background: #2563eb;
  color: white;
  padding: 0.9rem 1.35rem;
  font-size: 1rem;
  font-weight: 700;
  cursor: pointer;
}`,
  javascript: `const button = document.getElementById("countButton");
const countValue = document.getElementById("countValue");
const statusText = document.getElementById("statusText");

let count = 0;

button?.addEventListener("click", () => {
  count += 1;
  if (countValue) {
    countValue.textContent = String(count);
  }

  if (statusText) {
    statusText.textContent = \`Button clicked \${count} time(s).\`;
  }

  console.log("Current count:", count);
});`,
};

const CSS_PREVIEW_SCAFFOLD = `<div class="student-preview-shell">
  <section class="hero-card">
    <span class="eyebrow">Student Society</span>
    <h1>CSS Preview Board</h1>
    <p>Style cards, buttons, and spacing here without needing separate HTML.</p>
    <button type="button">Primary Action</button>
  </section>

  <section class="preview-grid">
    <article class="note-card">
      <h2>Lecture Notes</h2>
      <p>Timestamped notes, exports, and quick summaries.</p>
    </article>
    <article class="note-card">
      <h2>BugFix Lab</h2>
      <p>Timed practice with hints, scoring, and admin-managed content.</p>
    </article>
  </section>
</div>`;

const PREVIEW_BASE_CSS = `:root {
  color-scheme: light;
  font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
}

*,
*::before,
*::after {
  box-sizing: border-box;
}

html,
body {
  margin: 0;
  min-height: 100%;
}

body {
  background: #f8fafc;
  color: #0f172a;
}

button,
input,
textarea,
select {
  font: inherit;
}`;

export function safeJsonParse(value: string | null) {
  if (!value) {
    return null;
  }

  try {
    return JSON.parse(value) as CodeStudioStorage;
  } catch {
    return null;
  }
}

export function isCodeStudioMode(value: unknown): value is CodeStudioMode {
  return typeof value === "string" && ALL_MODE_ORDER.includes(value as CodeStudioMode);
}

export function isPreviewMode(mode: CodeStudioMode): mode is PreviewMode {
  return mode === "html" || mode === "css" || mode === "web";
}

export function resolveMonacoLanguage(mode: CodeStudioMode, activeWebTab: WebDraftKey) {
  if (mode === "web") {
    return activeWebTab;
  }

  if (mode === "cpp") {
    return "cpp";
  }

  if (mode === "csharp") {
    return "csharp";
  }

  return mode;
}

export function resolveEditorPath(mode: CodeStudioMode, activeWebTab: WebDraftKey) {
  if (mode === "web") {
    const extension = activeWebTab === "javascript" ? "js" : activeWebTab;
    return `code-studio/web/index.${extension}`;
  }

  if (mode === "cpp") {
    return "code-studio/main.cpp";
  }

  if (mode === "csharp") {
    return "code-studio/Program.cs";
  }

  if (mode === "python") {
    return "code-studio/main.py";
  }

  if (mode === "php") {
    return "code-studio/index.php";
  }

  if (mode === "java") {
    return "code-studio/Main.java";
  }

  if (mode === "javascript") {
    return "code-studio/main.js";
  }

  if (mode === "typescript") {
    return "code-studio/main.ts";
  }

  return `code-studio/main.${mode}`;
}

function escapeInlineScript(value: string) {
  return value.replace(/<\/script/gi, "<\\/script");
}

function escapeInlineStyle(value: string) {
  return value.replace(/<\/style/gi, "<\\/style");
}

export function buildPreviewSnapshot(
  mode: PreviewMode,
  drafts: Record<SingleEditorMode, string>,
  webDrafts: Record<WebDraftKey, string>
): PreviewSnapshot {
  if (mode === "html") {
    return {
      id: crypto.randomUUID(),
      mode,
      html: drafts.html,
      css: "",
      javascript: "",
    };
  }

  if (mode === "css") {
    return {
      id: crypto.randomUUID(),
      mode,
      html: CSS_PREVIEW_SCAFFOLD,
      css: drafts.css,
      javascript: "",
    };
  }

  return {
    id: crypto.randomUUID(),
    mode,
    html: webDrafts.html,
    css: webDrafts.css,
    javascript: webDrafts.javascript,
  };
}

export function buildPreviewDocument(snapshot: PreviewSnapshot) {
  const previewHelper = `
    (() => {
      const source = ${JSON.stringify(PREVIEW_MESSAGE_SOURCE)};
      const previewId = ${JSON.stringify(snapshot.id)};
      const send = (kind, payload) => {
        try {
          window.parent.postMessage({ source, previewId, kind, payload }, "*");
        } catch {}
      };

      const stringify = (value) => {
        if (typeof value === "string") {
          return value;
        }

        if (value instanceof Error) {
          return value.stack || value.message || String(value);
        }

        try {
          return JSON.stringify(value, null, 2);
        } catch {
          return String(value);
        }
      };

      ["log", "info", "warn", "error"].forEach((level) => {
        const original = console[level];

        console[level] = (...args) => {
          send("console", { level, message: args.map(stringify).join(" ") });
          original.apply(console, args);
        };
      });

      window.addEventListener("error", (event) => {
        send("error", {
          message: event.message || "Runtime error",
          sourceUrl: event.filename || "",
          line: event.lineno || 0,
          column: event.colno || 0,
        });
      });

      window.addEventListener("unhandledrejection", (event) => {
        const reason = event.reason instanceof Error
          ? event.reason.stack || event.reason.message
          : String(event.reason || "Unhandled promise rejection");

        send("error", { message: reason });
      });

      window.addEventListener("DOMContentLoaded", () => {
        send("ready", { message: "Preview rendered." });
      });
    })();
  `;

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <style>${escapeInlineStyle(`${PREVIEW_BASE_CSS}\n${snapshot.css}`)}</style>
    <script>${escapeInlineScript(previewHelper)}</script>
  </head>
  <body>
    ${snapshot.html}
    ${snapshot.javascript.trim() ? `<script>${escapeInlineScript(snapshot.javascript)}</script>` : ""}
  </body>
</html>`;
}

export function buildModeDescription(
  mode: CodeStudioMode,
  judge0LanguageMap: Map<Judge0LanguageKey, Judge0LanguageOption>
) {
  if (mode === "web") {
    return "Three editable files with a live browser preview.";
  }

  if (mode === "html") {
    return "HTML preview mode running inside your browser sandbox.";
  }

  if (mode === "css") {
    return "CSS preview mode with a built-in starter layout.";
  }

  const runtime = judge0LanguageMap.get(mode);
  return runtime ? `${MODE_LABELS[mode]} via ${runtime.versionName}` : `${MODE_LABELS[mode]} runtime`;
}

export function buildPreviewOutputLabel(payload: PreviewMessagePayload) {
  const message = payload.payload?.message?.trim();

  if (payload.kind === "ready") {
    return message || "Preview rendered.";
  }

  if (payload.kind === "console") {
    const level = (payload.payload?.level || "log").toUpperCase();
    return message ? `[${level}] ${message}` : `[${level}]`;
  }

  if (payload.kind === "error") {
    const parts = [payload.payload?.message?.trim()].filter(Boolean);
    const location = [payload.payload?.sourceUrl, payload.payload?.line, payload.payload?.column]
      .filter((value) => value !== undefined && value !== null && value !== "" && value !== 0)
      .join(":");

    if (location) {
      parts.push(`at ${location}`);
    }

    return `[ERROR] ${parts.join(" ") || "Browser error"}`;
  }

  return "";
}

export async function copyText(value: string) {
  await navigator.clipboard.writeText(value);
}

export function resolvePreviewViewportStyle(device: PreviewDevice): PreviewViewportStyle {
  if (device === "mobile") {
    return {
      width: 390,
      minWidth: 390,
      height: 720,
    };
  }

  if (device === "tablet") {
    return {
      width: 768,
      minWidth: 768,
      height: 860,
    };
  }

  return {
    width: "100%",
    maxWidth: 1180,
    height: 760,
  };
}
