import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import {
  executeJudge0Submission,
  fetchJudge0LanguageOptions,
  formatJudge0ExecutionResult,
  type Judge0ExecutionResult,
  type Judge0LanguageOption,
} from "../../../lib/judge0";
import {
  buildModeDescription,
  buildPreviewOutputLabel,
  buildPreviewSnapshot,
  copyText,
  DEFAULT_SINGLE_DRAFTS,
  DEFAULT_WEB_DRAFTS,
  isCodeStudioMode,
  isPreviewMode,
  MODE_LABELS,
  PREVIEW_MESSAGE_SOURCE,
  PREVIEW_PLACEHOLDER,
  resolveEditorPath,
  resolveMonacoLanguage,
  resolvePreviewViewportStyle,
  RUNTIME_PLACEHOLDER,
  safeJsonParse,
  STORAGE_KEY,
} from "./helpers";
import {
  CodeStudioEditorPanel,
  CodeStudioHeader,
  CodeStudioOutputPanel,
  CodeStudioPreviewPanel,
  CodeStudioRuntimeInputPanel,
} from "./panels";
import type { CodeStudioMode, CodeStudioStorage, PreviewDevice, PreviewMessagePayload, PreviewSnapshot, SingleEditorMode, WebDraftKey } from "./types";

export function CodeStudioApp({ showTitleBlock = true }: { showTitleBlock?: boolean }) {
  const [selectedMode, setSelectedMode] = useState<CodeStudioMode>("javascript");
  const [previewDevice, setPreviewDevice] = useState<PreviewDevice>("laptop");
  const [stdin, setStdin] = useState("");
  const [drafts, setDrafts] = useState<Record<SingleEditorMode, string>>(DEFAULT_SINGLE_DRAFTS);
  const [webDrafts, setWebDrafts] = useState<Record<WebDraftKey, string>>(DEFAULT_WEB_DRAFTS);
  const [activeWebTab, setActiveWebTab] = useState<WebDraftKey>("html");
  const [judge0Languages, setJudge0Languages] = useState<Judge0LanguageOption[]>([]);
  const [running, setRunning] = useState(false);
  const [output, setOutput] = useState(RUNTIME_PLACEHOLDER);
  const [previewSnapshot, setPreviewSnapshot] = useState<PreviewSnapshot | null>(null);

  const judge0LanguageMap = useMemo(
    () => new Map(judge0Languages.map((entry) => [entry.key, entry])),
    [judge0Languages]
  );

  useEffect(() => {
    const stored = safeJsonParse(localStorage.getItem(STORAGE_KEY));

    if (!stored) {
      return;
    }

    setSelectedMode(isCodeStudioMode(stored.selectedMode) ? stored.selectedMode : "javascript");
    setPreviewDevice(stored.previewDevice || "laptop");
    setStdin(typeof stored.stdin === "string" ? stored.stdin : "");
    setDrafts({
      ...DEFAULT_SINGLE_DRAFTS,
      ...stored.drafts,
    });
    setWebDrafts({
      ...DEFAULT_WEB_DRAFTS,
      ...stored.webDrafts,
    });
  }, []);

  useEffect(() => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        selectedMode,
        previewDevice,
        stdin,
        drafts,
        webDrafts,
      } satisfies CodeStudioStorage)
    );
  }, [drafts, previewDevice, selectedMode, stdin, webDrafts]);

  useEffect(() => {
    let cancelled = false;

    void fetchJudge0LanguageOptions()
      .then((languages) => {
        if (!cancelled) {
          setJudge0Languages(languages);
        }
      })
      .catch((loadError) => {
        if (!cancelled) {
          console.warn("Judge0 language catalog could not be loaded for Code Studio.", loadError);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!isPreviewMode(selectedMode)) {
      setOutput(RUNTIME_PLACEHOLDER);
      return;
    }

    setPreviewSnapshot((current) =>
      current && current.mode === selectedMode ? current : buildPreviewSnapshot(selectedMode, drafts, webDrafts)
    );
    setOutput(PREVIEW_PLACEHOLDER);
  }, [drafts, selectedMode, webDrafts]);

  useEffect(() => {
    function handlePreviewMessage(event: MessageEvent<PreviewMessagePayload>) {
      const payload = event.data;

      if (
        !payload ||
        payload.source !== PREVIEW_MESSAGE_SOURCE ||
        !previewSnapshot ||
        payload.previewId !== previewSnapshot.id
      ) {
        return;
      }

      const nextLine = buildPreviewOutputLabel(payload);

      if (!nextLine) {
        return;
      }

      setOutput((current) => (current === PREVIEW_PLACEHOLDER ? nextLine : `${current}\n${nextLine}`));
    }

    window.addEventListener("message", handlePreviewMessage);

    return () => {
      window.removeEventListener("message", handlePreviewMessage);
    };
  }, [previewSnapshot]);

  const currentEditorValue = selectedMode === "web" ? webDrafts[activeWebTab] : drafts[selectedMode];
  const editorLanguage = resolveMonacoLanguage(selectedMode, activeWebTab);
  const editorPath = resolveEditorPath(selectedMode, activeWebTab);
  const modeDescription = buildModeDescription(selectedMode, judge0LanguageMap);
  const previewViewportStyle = resolvePreviewViewportStyle(previewDevice);
  const isPreviewWorkspace = isPreviewMode(selectedMode);

  async function handleRun() {
    if (isPreviewMode(selectedMode)) {
      setPreviewSnapshot(buildPreviewSnapshot(selectedMode, drafts, webDrafts));
      setOutput("Refreshing preview...");
      return;
    }

    const runtime = judge0LanguageMap.get(selectedMode);

    if (!runtime) {
      setOutput("This runtime is not available right now. Check Judge0 settings or try again in a moment.");
      toast.error("Runtime unavailable.");
      return;
    }

    setRunning(true);
    setOutput("Submitting code...");

    try {
      const result: Judge0ExecutionResult = await executeJudge0Submission({
        languageId: runtime.languageId,
        sourceCode: drafts[selectedMode],
        stdin,
      });

      setOutput(formatJudge0ExecutionResult(result));
    } catch (runError) {
      const message = runError instanceof Error ? runError.message : "Execution failed.";
      setOutput(message);
      toast.error(message);
    } finally {
      setRunning(false);
    }
  }

  function handleReset() {
    if (selectedMode === "web") {
      setWebDrafts({ ...DEFAULT_WEB_DRAFTS });
      setActiveWebTab("html");
      setPreviewSnapshot(buildPreviewSnapshot("web", drafts, DEFAULT_WEB_DRAFTS));
      setOutput(PREVIEW_PLACEHOLDER);
      toast.success("Web editor reset.");
      return;
    }

    const nextDrafts = {
      ...drafts,
      [selectedMode]: DEFAULT_SINGLE_DRAFTS[selectedMode],
    };

    setDrafts(nextDrafts);

    if (selectedMode === "html" || selectedMode === "css") {
      setPreviewSnapshot(buildPreviewSnapshot(selectedMode, nextDrafts, webDrafts));
      setOutput(PREVIEW_PLACEHOLDER);
    } else {
      setOutput(RUNTIME_PLACEHOLDER);
    }

    toast.success(`${MODE_LABELS[selectedMode]} editor reset.`);
  }

  function updateEditorValue(nextValue: string) {
    if (selectedMode === "web") {
      setWebDrafts((current) => ({
        ...current,
        [activeWebTab]: nextValue,
      }));
      return;
    }

    setDrafts((current) => ({
      ...current,
      [selectedMode]: nextValue,
    }));
  }

  async function handleCopyOutput() {
    try {
      await copyText(output);
      toast.success("Output copied.");
    } catch {
      toast.error("Could not copy output.");
    }
  }

  return (
    <div className="space-y-4">
      <CodeStudioHeader showTitleBlock={showTitleBlock} />

      {isPreviewWorkspace ? (
        <section className="space-y-4">
          <CodeStudioEditorPanel
            activeWebTab={activeWebTab}
            currentEditorValue={currentEditorValue}
            editorLanguage={editorLanguage}
            editorPath={editorPath}
            isPreviewWorkspace={isPreviewWorkspace}
            modeDescription={modeDescription}
            running={running}
            selectedMode={selectedMode}
            onChangeMode={setSelectedMode}
            onChangeTab={setActiveWebTab}
            onReset={handleReset}
            onRun={() => void handleRun()}
            onUpdateEditorValue={updateEditorValue}
          />
          <CodeStudioPreviewPanel
            drafts={drafts}
            previewDevice={previewDevice}
            previewSnapshot={previewSnapshot}
            previewViewportStyle={previewViewportStyle}
            selectedMode={selectedMode}
            webDrafts={webDrafts}
            onChangePreviewDevice={setPreviewDevice}
          />
          <CodeStudioOutputPanel isPreviewWorkspace={isPreviewWorkspace} output={output} onCopyOutput={() => void handleCopyOutput()} />
        </section>
      ) : (
        <section className="grid gap-4 xl:grid-cols-[minmax(0,1.45fr)_minmax(320px,0.95fr)]">
          <CodeStudioEditorPanel
            activeWebTab={activeWebTab}
            currentEditorValue={currentEditorValue}
            editorLanguage={editorLanguage}
            editorPath={editorPath}
            isPreviewWorkspace={isPreviewWorkspace}
            modeDescription={modeDescription}
            running={running}
            selectedMode={selectedMode}
            onChangeMode={setSelectedMode}
            onChangeTab={setActiveWebTab}
            onReset={handleReset}
            onRun={() => void handleRun()}
            onUpdateEditorValue={updateEditorValue}
          />
          <div className="space-y-4">
            <CodeStudioRuntimeInputPanel stdin={stdin} onChangeStdin={setStdin} />
            <CodeStudioOutputPanel isPreviewWorkspace={isPreviewWorkspace} output={output} onCopyOutput={() => void handleCopyOutput()} />
          </div>
        </section>
      )}
    </div>
  );
}
