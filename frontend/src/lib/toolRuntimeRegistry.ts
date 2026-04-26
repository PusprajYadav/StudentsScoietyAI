import { lazy, type ComponentType, type LazyExoticComponent } from "react";
import type { ToolAppSlug } from "../data/workspaceApps";

export interface ToolWorkspaceComponentProps {
  showTitleBlock?: boolean;
}

type ToolWorkspaceComponent = ComponentType<ToolWorkspaceComponentProps>;
type ToolModuleLoader = () => Promise<{ default: ToolWorkspaceComponent }>;

const toolModuleLoaders: Record<ToolAppSlug, ToolModuleLoader> = {
  "ai-teacher": () =>
    import("../components/tools/AiTeacherApp").then((module) => ({ default: module.AiTeacherApp })),
  "ai-teacher-play-area": () =>
    import("../components/tools/AiTeacherPlayAreaApp").then((module) => ({ default: module.AiTeacherPlayAreaApp })),
  "audio-tools": () =>
    import("../components/tools/AudioToolsApp").then((module) => ({ default: module.AudioToolsApp })),
  "code-studio": () =>
    import("../components/tools/CodeStudioApp").then((module) => ({ default: module.CodeStudioApp })),
  "bugfix-lab": () =>
    import("../components/tools/BugFixLabApp").then((module) => ({ default: module.BugFixLabApp })),
  "image-studio": () =>
    import("../components/tools/ImageStudioApp").then((module) => ({ default: module.ImageStudioApp })),
  "qr-code-tool": () =>
    import("../components/tools/QrCodeToolApp").then((module) => ({ default: module.QrCodeToolApp })),
  "barcode-tool": () =>
    import("../components/tools/BarcodeToolApp").then((module) => ({ default: module.BarcodeToolApp })),
  "bulk-mailer": () =>
    import("../components/tools/BulkMailerApp").then((module) => ({ default: module.BulkMailerApp })),
  "instagram-automation": () =>
    import("../components/tools/InstagramAutomationApp").then((module) => ({ default: module.InstagramAutomationApp })),
  "pdf-tools": () =>
    import("../components/tools/PdfToolsApp").then((module) => ({ default: module.PdfToolsApp })),
};

const toolModulePromises = new Map<ToolAppSlug, ReturnType<ToolModuleLoader>>();
const lazyToolComponents = new Map<ToolAppSlug, LazyExoticComponent<ToolWorkspaceComponent>>();

export function preloadToolModule(toolSlug: ToolAppSlug) {
  const existingPromise = toolModulePromises.get(toolSlug);

  if (existingPromise) {
    return existingPromise;
  }

  const nextPromise = toolModuleLoaders[toolSlug]();
  toolModulePromises.set(toolSlug, nextPromise);
  return nextPromise;
}

export function getLazyToolComponent(toolSlug: ToolAppSlug) {
  const existingComponent = lazyToolComponents.get(toolSlug);

  if (existingComponent) {
    return existingComponent;
  }

  const nextComponent = lazy(() => preloadToolModule(toolSlug));
  lazyToolComponents.set(toolSlug, nextComponent);
  return nextComponent;
}
