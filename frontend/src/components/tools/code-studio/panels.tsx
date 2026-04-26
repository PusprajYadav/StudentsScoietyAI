import Editor from "@monaco-editor/react";
import { Braces, Copy, Eye, Loader2, Play, RotateCcw, TerminalSquare } from "lucide-react";
import {
  buildPreviewSnapshot,
  buildPreviewDocument,
  MODE_LABELS,
  OUTPUT_PANEL_TEXT_COLOR,
  PREVIEW_DEVICE_OPTIONS,
  RUNTIME_MODE_ORDER,
} from "./helpers";
import type {
  CodeStudioMode,
  PreviewDevice,
  PreviewSnapshot,
  SingleEditorMode,
  WebDraftKey,
} from "./types";

interface CodeStudioHeaderProps {
  showTitleBlock?: boolean;
}

interface CodeStudioEditorPanelProps {
  activeWebTab: WebDraftKey;
  currentEditorValue: string;
  editorLanguage: string;
  editorPath: string;
  isPreviewWorkspace: boolean;
  modeDescription: string;
  running: boolean;
  selectedMode: CodeStudioMode;
  onChangeMode: (mode: CodeStudioMode) => void;
  onChangeTab: (tab: WebDraftKey) => void;
  onReset: () => void;
  onRun: () => void;
  onUpdateEditorValue: (value: string) => void;
}

interface CodeStudioPreviewPanelProps {
  drafts: Record<SingleEditorMode, string>;
  previewDevice: PreviewDevice;
  previewSnapshot: PreviewSnapshot | null;
  previewViewportStyle: React.CSSProperties;
  selectedMode: Extract<CodeStudioMode, "html" | "css" | "web">;
  webDrafts: Record<WebDraftKey, string>;
  onChangePreviewDevice: (device: PreviewDevice) => void;
}

interface CodeStudioRuntimeInputPanelProps {
  stdin: string;
  onChangeStdin: (value: string) => void;
}

interface CodeStudioOutputPanelProps {
  isPreviewWorkspace: boolean;
  output: string;
  onCopyOutput: () => void;
}

export function CodeStudioHeader({ showTitleBlock = true }: CodeStudioHeaderProps) {
  if (!showTitleBlock) {
    return null;
  }

  return (
    <section className="surface-card rounded-[30px] p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-2xl">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-brand">Tool workspace</p>
          <h1 className="mt-2 font-display text-[1.55rem] font-semibold tracking-tight text-app-text sm:text-[1.8rem]">
            Code Studio
          </h1>
          <p className="mt-2 text-sm leading-6 text-app-muted">
            Run programming languages through Judge0, preview HTML and CSS instantly, or edit HTML, CSS, and
            JavaScript together in one browser sandbox.
          </p>
        </div>

        <div className="rounded-[26px] border border-app-border bg-app-secondary/60 px-4 py-3 text-sm text-app-muted">
          <p className="font-semibold text-app-text">Runtime + preview workspace</p>
          <p className="mt-1">Frontend modes run locally in the browser, code runtimes use Judge0.</p>
        </div>
      </div>
    </section>
  );
}

export function CodeStudioEditorPanel({
  activeWebTab,
  currentEditorValue,
  editorLanguage,
  editorPath,
  isPreviewWorkspace,
  modeDescription,
  running,
  selectedMode,
  onChangeMode,
  onChangeTab,
  onReset,
  onRun,
  onUpdateEditorValue,
}: CodeStudioEditorPanelProps) {
  return (
    <article className="surface-card rounded-[30px] p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="rounded-2xl bg-brand/10 p-3 text-brand">
            <Braces className="h-5 w-5" />
          </div>

          <div>
            <p className="text-sm font-semibold text-app-text">Editor</p>
            <p className="text-xs text-app-muted">{modeDescription}</p>
          </div>
        </div>

        <div className="grid w-full grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-2 sm:w-auto sm:grid-cols-[minmax(180px,1fr)_auto_auto]">
          <label className="sr-only" htmlFor="code-studio-mode">
            Language
          </label>
          <select
            id="code-studio-mode"
            value={selectedMode}
            onChange={(event) => onChangeMode(event.target.value as CodeStudioMode)}
            className="min-w-0 rounded-[18px] border border-app-border bg-app-secondary/70 px-3 py-2.5 text-[13px] font-semibold text-app-text outline-none transition focus:border-brand/40 focus:ring-2 focus:ring-brand/10 sm:px-3.5 sm:text-sm"
          >
            <optgroup label="Code runtimes">
              {RUNTIME_MODE_ORDER.map((mode) => (
                <option key={mode} value={mode}>
                  {MODE_LABELS[mode]}
                </option>
              ))}
            </optgroup>
            <optgroup label="Web preview">
              <option value="html">{MODE_LABELS.html}</option>
              <option value="css">{MODE_LABELS.css}</option>
              <option value="web">{MODE_LABELS.web}</option>
            </optgroup>
          </select>

          <button type="button" onClick={onReset} className="btn-secondary gap-2 whitespace-nowrap !px-3 !py-2.5 text-xs sm:!px-4 sm:text-sm">
            <RotateCcw className="h-4 w-4" />
            Reset
          </button>

          <button type="button" onClick={onRun} className="btn-primary gap-2 whitespace-nowrap !px-3 !py-2.5 text-xs sm:!px-4 sm:text-sm">
            {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
            <span className="sm:hidden">Run</span>
            <span className="hidden sm:inline">{isPreviewWorkspace ? "Run preview" : "Run"}</span>
          </button>
        </div>
      </div>

      {selectedMode === "web" ? (
        <div className="mt-4 flex flex-wrap items-center gap-2 rounded-[22px] border border-app-border bg-app-secondary/35 p-2">
          {(["html", "css", "javascript"] as WebDraftKey[]).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => onChangeTab(tab)}
              className={`rounded-[16px] px-4 py-2 text-sm font-semibold transition ${
                activeWebTab === tab
                  ? "bg-brand text-white shadow-[0_14px_32px_-24px_rgba(37,99,235,0.9)]"
                  : "text-app-muted hover:bg-brand/8 hover:text-brand"
              }`}
            >
              {tab === "javascript" ? "JavaScript" : tab.toUpperCase()}
            </button>
          ))}
        </div>
      ) : null}

      <div className="mt-4 overflow-hidden rounded-[24px] border border-app-border bg-[#111827] shadow-[0_20px_40px_-30px_rgba(15,23,42,0.7)]">
        <Editor
          path={editorPath}
          height="560px"
          theme="vs-dark"
          language={editorLanguage}
          value={currentEditorValue}
          onChange={(value) => onUpdateEditorValue(value || "")}
          options={{
            automaticLayout: true,
            fontSize: 14,
            minimap: { enabled: false },
            padding: { top: 18 },
            scrollBeyondLastLine: false,
            wordWrap: "on",
          }}
        />
      </div>
    </article>
  );
}

export function CodeStudioPreviewPanel({
  drafts,
  previewDevice,
  previewSnapshot,
  previewViewportStyle,
  selectedMode,
  webDrafts,
  onChangePreviewDevice,
}: CodeStudioPreviewPanelProps) {
  return (
    <article className="surface-card rounded-[30px] p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="rounded-2xl bg-brand/10 p-3 text-brand">
            <Eye className="h-5 w-5" />
          </div>

          <div>
            <p className="text-sm font-semibold text-app-text">Responsive preview</p>
            <p className="text-xs text-app-muted">
              {selectedMode === "web"
                ? "Switch between mobile, tablet, and laptop widths for the full HTML, CSS, and JavaScript preview."
                : selectedMode === "css"
                  ? "Preview your CSS on a built-in demo layout with device-sized viewports."
                  : "Render HTML inside device-sized browser frames."}
            </p>
          </div>
        </div>

        <span className="rounded-full bg-brand/10 px-3 py-1 text-xs font-semibold text-brand">Browser sandbox</span>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2 rounded-[22px] border border-app-border bg-app-secondary/35 p-2">
        {PREVIEW_DEVICE_OPTIONS.map((device) => {
          const Icon = device.icon;
          const active = previewDevice === device.key;

          return (
            <button
              key={device.key}
              type="button"
              onClick={() => onChangePreviewDevice(device.key)}
              className={`inline-flex items-center gap-2 rounded-[16px] px-4 py-2 text-sm font-semibold transition ${
                active
                  ? "bg-brand text-white shadow-[0_14px_32px_-24px_rgba(37,99,235,0.9)]"
                  : "text-app-muted hover:bg-brand/8 hover:text-brand"
              }`}
            >
              <Icon className="h-4 w-4" />
              {device.label}
            </button>
          );
        })}
      </div>

      <p className="mt-3 text-xs text-app-muted">
        {PREVIEW_DEVICE_OPTIONS.find((device) => device.key === previewDevice)?.description}
      </p>

      <div className="mt-4 overflow-hidden rounded-[28px] border border-slate-800 bg-slate-950/95 p-3 sm:p-4">
        <div className="overflow-x-auto pb-1">
          <div className="mx-auto flex min-w-fit justify-center">
            <div
              style={previewViewportStyle}
              className="flex flex-col overflow-hidden rounded-[28px] border border-slate-700 bg-white shadow-[0_24px_56px_-34px_rgba(15,23,42,0.95)] transition-all duration-300"
            >
              <div className="flex items-center gap-2 border-b border-slate-200 bg-slate-50 px-4 py-3">
                <span className="h-2.5 w-2.5 rounded-full bg-rose-400" />
                <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
                <span className="ml-3 truncate text-xs font-semibold text-slate-500">
                  {MODE_LABELS[selectedMode]} preview
                </span>
              </div>

              <iframe
                key={previewSnapshot?.id || `${selectedMode}-preview`}
                title={`${MODE_LABELS[selectedMode]} preview`}
                sandbox="allow-scripts"
                srcDoc={buildPreviewDocument(previewSnapshot || buildPreviewSnapshot(selectedMode, drafts, webDrafts))}
                className="min-h-0 w-full flex-1 bg-white"
              />
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}

export function CodeStudioRuntimeInputPanel({ stdin, onChangeStdin }: CodeStudioRuntimeInputPanelProps) {
  return (
    <article className="surface-card rounded-[30px] p-4 sm:p-5">
      <div className="flex items-center gap-3">
        <div className="rounded-2xl bg-brand/10 p-3 text-brand">
          <TerminalSquare className="h-5 w-5" />
        </div>

        <div>
          <p className="text-sm font-semibold text-app-text">Runtime input</p>
          <p className="text-xs text-app-muted">Send stdin for interactive programs.</p>
        </div>
      </div>

      <textarea
        value={stdin}
        onChange={(event) => onChangeStdin(event.target.value)}
        placeholder="Optional stdin..."
        className="mt-4 h-[112px] w-full rounded-[22px] border border-app-border bg-app-secondary/35 px-4 py-3 text-sm text-app-text outline-none transition placeholder:text-app-muted focus:border-brand/40 focus:ring-2 focus:ring-brand/10 sm:h-[148px]"
      />
    </article>
  );
}

export function CodeStudioOutputPanel({ isPreviewWorkspace, output, onCopyOutput }: CodeStudioOutputPanelProps) {
  return (
    <article className="surface-card rounded-[30px] p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="rounded-2xl bg-brand/10 p-3 text-brand">
            <TerminalSquare className="h-5 w-5" />
          </div>

          <div>
            <p className="text-sm font-semibold text-app-text">{isPreviewWorkspace ? "Preview logs" : "Output"}</p>
            <p className="text-xs text-app-muted">
              {isPreviewWorkspace
                ? "Console logs, render messages, and browser errors appear here."
                : "Compile output, stdout, stderr, and Judge0 execution status appear here."}
            </p>
          </div>
        </div>

        <button type="button" onClick={onCopyOutput} className="btn-secondary gap-2 !px-3.5 !py-2.5 text-xs">
          <Copy className="h-4 w-4" />
          Copy
        </button>
      </div>

      <div className="mt-4 overflow-hidden rounded-[24px] border border-slate-800 bg-slate-950 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
        <pre
          className="min-h-[300px] overflow-auto px-4 py-4 font-mono text-[12.5px] font-medium leading-6 whitespace-pre-wrap"
          style={{ color: OUTPUT_PANEL_TEXT_COLOR }}
        >
          {output}
        </pre>
      </div>
    </article>
  );
}
