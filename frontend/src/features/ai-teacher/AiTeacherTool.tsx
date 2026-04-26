import type { ChangeEvent } from "react";
import { startTransition, useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Bot,
  ChevronDown,
  ChevronUp,
  Coins,
  FileText,
  FolderPlus,
  Loader2,
  MessageSquare,
  Paperclip,
  Plus,
  Search,
  Send,
  Upload,
  X,
} from "lucide-react";
import { isFastApiConnectionError } from "../../lib/fastApi";
import { downloadBlobNatively } from "../../lib/nativeDownload";
import {
  createAiTeacherFolder,
  deleteAiTeacherProviderKey,
  exportAiTeacherPdf,
  getAiTeacherChat,
  getAiTeacherSettings,
  listAiTeacherChats,
  listAiTeacherFolders,
  saveAiTeacherProviderKey,
  saveAiTeacherItem,
  streamAiTeacherChat,
  uploadAiTeacherSource,
} from "./api";
import {
  deleteLocalOllamaModel,
  generateWithLocalOllama,
  isLocalOllamaConnectionError,
  listLocalOllamaModels,
  pullLocalOllamaModel,
} from "./localOllama";
import { AssistantBubble, AssistantLoadingBubble, UserBubble } from "./components/ChatBubbles";
import { EmptyChatState } from "./components/EmptyChatState";
import { ToolModeButton } from "./components/ToolModeButton";
import { createPlayAreaDocumentFromMessage, savePlayAreaDocument } from "../ai-teacher-play-area/storage";
import type {
  AiTeacherChat,
  AiTeacherFolder,
  AiTeacherModelRoute,
  AiTeacherMessage,
  AiTeacherOllamaModel,
  AiTeacherProviderKey,
  AiTeacherSettingsPayload,
  AiTeacherTheme,
  AiTeacherToolType,
} from "./types";
import {
  DEFAULT_AI_TEACHER_BUSY_MESSAGE,
  PRIORITY_OPTIONS,
  PROVIDER_SUGGESTIONS,
  THEME_META,
  TOOL_OPTIONS,
  formatDateLabel,
  formatFileSize,
  formatPriorityLabel,
  formatRelativeCount,
  formatRouteOption,
  getConnectionModeLabel,
  getPlatformChoiceLabel,
  getRelevantPlatformRoutes,
  getToolOption,
  summarizeMessage,
} from "./ui";

function friendlyError(error: unknown) {
  if (error instanceof Error && error.message.trim()) {
    return error.message.trim();
  }
  return "Something went wrong. Please try again.";
}

function normalizeFileName(name: string) {
  return name
    .trim()
    .replace(/[^a-z0-9._-]+/gi, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();
}

function createLocalId(prefix: string) {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `local:${prefix}:${crypto.randomUUID()}`;
  }
  return `local:${prefix}:${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function isLocalChatId(chatId: string | null | undefined) {
  return Boolean(chatId && chatId.startsWith("local:chat:"));
}

function deriveChatTitle(inputValue: string, selectedFile: File | null, toolType: AiTeacherToolType) {
  const trimmed = inputValue.trim();
  if (trimmed) {
    return trimmed.slice(0, 120);
  }
  if (selectedFile?.name.trim()) {
    return selectedFile.name.trim().slice(0, 120);
  }
  return getToolOption(toolType).label;
}

function findMatchingRouteForSavedKey(
  savedKey: AiTeacherProviderKey | null | undefined,
  routes: AiTeacherModelRoute[]
) {
  if (!savedKey) {
    return null;
  }

  const providerSlug = String(savedKey.provider_slug || "litellm").trim().toLowerCase();
  const providerName = String(savedKey.provider || "").trim().toLowerCase();
  const candidates = routes
    .filter((route) => String(route.provider_slug || "").trim().toLowerCase() === providerSlug)
    .sort((left, right) => {
      const leftProvider = String(left.provider || "").trim().toLowerCase();
      const rightProvider = String(right.provider || "").trim().toLowerCase();
      const leftProviderRank = providerName ? (leftProvider === providerName ? 0 : 1) : 0;
      const rightProviderRank = providerName ? (rightProvider === providerName ? 0 : 1) : 0;
      if (leftProviderRank !== rightProviderRank) {
        return leftProviderRank - rightProviderRank;
      }

      return (left.sort_order ?? 100) - (right.sort_order ?? 100);
    });

  return candidates[0] || null;
}

export function AiTeacherTool() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const navigate = useNavigate();
  const location = useLocation();

  const [toolType, setToolType] = useState<AiTeacherToolType>("ask_question");
  const [inputValue, setInputValue] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedImagePreviewUrl, setSelectedImagePreviewUrl] = useState<string | null>(null);
  const [aiSettings, setAiSettings] = useState<AiTeacherSettingsPayload>({
    providers: [],
    platform_routes: [],
    user_keys: [],
    coin_pricing: {
      platform_message_coins: 0,
      user_key_message_coins: 0,
    },
    availability: {
      is_enabled: true,
      platform_mode_enabled: true,
      user_mode_enabled: true,
      unavailable_message: DEFAULT_AI_TEACHER_BUSY_MESSAGE,
    },
  });
  const [connectionMode, setConnectionMode] = useState<"platform" | "saved_key" | "paste_key" | "local_ollama">(
    "platform"
  );
  const [platformChoice, setPlatformChoice] = useState("auto:balanced");
  const [savedKeyId, setSavedKeyId] = useState("");
  const [savedKeyModelName, setSavedKeyModelName] = useState("");
  const [inlineProvider, setInlineProvider] = useState("openai");
  const [inlineModelName, setInlineModelName] = useState("");
  const [inlineApiKey, setInlineApiKey] = useState("");
  const [inlineApiBase, setInlineApiBase] = useState("");
  const [inlineApiVersion, setInlineApiVersion] = useState("");
  const [saveInlineKey, setSaveInlineKey] = useState(false);
  const [inlineKeyLabel, setInlineKeyLabel] = useState("");
  const [deletingSavedKeyId, setDeletingSavedKeyId] = useState<string | null>(null);
  const [localOllamaModels, setLocalOllamaModels] = useState<AiTeacherOllamaModel[]>([]);
  const [localOllamaModelName, setLocalOllamaModelName] = useState("");
  const [localOllamaPullName, setLocalOllamaPullName] = useState("");
  const [localOllamaStatus, setLocalOllamaStatus] = useState<string | null>(null);
  const [localOllamaRefreshing, setLocalOllamaRefreshing] = useState(false);
  const [localOllamaPulling, setLocalOllamaPulling] = useState(false);
  const [localOllamaDeleting, setLocalOllamaDeleting] = useState<string | null>(null);
  const [localOllamaReachable, setLocalOllamaReachable] = useState(false);
  const [backendUnavailable, setBackendUnavailable] = useState(false);
  const [showConnectionSettings, setShowConnectionSettings] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [chatSearch, setChatSearch] = useState("");

  const [chats, setChats] = useState<AiTeacherChat[]>([]);
  const [messages, setMessages] = useState<AiTeacherMessage[]>([]);
  const [localChatMessages, setLocalChatMessages] = useState<Record<string, AiTeacherMessage[]>>({});
  const [folders, setFolders] = useState<AiTeacherFolder[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [saveFolderId, setSaveFolderId] = useState("");
  const [newFolderName, setNewFolderName] = useState("");
  const [newFolderTheme, setNewFolderTheme] = useState<AiTeacherTheme>("yellow");

  const [loadingSidebar, setLoadingSidebar] = useState(true);
  const [loadingChat, setLoadingChat] = useState(false);
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [busyMessageId, setBusyMessageId] = useState<string | null>(null);
  const [streamStatus, setStreamStatus] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [pendingTurn, setPendingTurn] = useState<{
    toolType: AiTeacherToolType;
    input: string;
    fileLabel?: string | null;
  } | null>(null);

  const selectedTool = getToolOption(toolType);
  const platformRoutes = useMemo(
    () => getRelevantPlatformRoutes(aiSettings.platform_routes, toolType),
    [aiSettings.platform_routes, toolType]
  );
  const savedKeys = aiSettings.user_keys;
  const activeSavedKey = useMemo(
    () => savedKeys.find((item) => item.id === savedKeyId) || null,
    [savedKeyId, savedKeys]
  );
  const activeSavedKeyInheritedRoute = useMemo(
    () => findMatchingRouteForSavedKey(activeSavedKey, platformRoutes),
    [activeSavedKey, platformRoutes]
  );
  const aiTeacherAvailable = aiSettings.availability?.is_enabled ?? true;
  const aiTeacherUnavailableMessage =
    aiSettings.availability?.unavailable_message?.trim() || DEFAULT_AI_TEACHER_BUSY_MESSAGE;
  const isLocalOllamaMode = connectionMode === "local_ollama";
  const activeLocalOllamaModel = useMemo(
    () => localOllamaModels.find((item) => item.name === localOllamaModelName) || null,
    [localOllamaModels, localOllamaModelName]
  );
  const composerAvailable = isLocalOllamaMode ? localOllamaReachable : aiTeacherAvailable;
  const composerUnavailableMessage = isLocalOllamaMode
    ? "Local Ollama is offline. Start Ollama, pull a model, then try again."
    : aiTeacherUnavailableMessage;
  const connectionDetailLabel = useMemo(() => {
    if (connectionMode === "platform") {
      return getPlatformChoiceLabel(platformChoice, platformRoutes);
    }

    if (connectionMode === "saved_key") {
      return (
        savedKeyModelName.trim() ||
        activeSavedKey?.default_model_name ||
        activeSavedKeyInheritedRoute?.model_name ||
        activeSavedKey?.provider ||
        "Choose a key"
      );
    }

    if (connectionMode === "local_ollama") {
      return localOllamaModelName.trim() || "Choose local model";
    }

    const providerLabel = inlineProvider.trim() || "Custom";
    if (inlineModelName.trim()) {
      return `${providerLabel} · ${inlineModelName.trim()}`;
    }
    if (inlineApiKey.trim()) {
      return `${providerLabel} · Add model`;
    }
    return "Paste key + model";
  }, [
    activeSavedKey?.default_model_name,
    activeSavedKey?.provider,
    activeSavedKeyInheritedRoute?.model_name,
    connectionMode,
    inlineApiKey,
    inlineModelName,
    inlineProvider,
    localOllamaModelName,
    platformChoice,
    platformRoutes,
    savedKeyModelName,
  ]);
  const filteredChats = useMemo(() => {
    const query = chatSearch.trim().toLowerCase();
    if (!query) {
      return chats;
    }
    return chats.filter((chat) =>
      `${chat.title} ${chat.last_message_preview || ""} ${chat.summary_text || ""}`.toLowerCase().includes(query)
    );
  }, [chatSearch, chats]);
  const activeChat = useMemo(
    () => chats.find((chat) => chat.id === activeChatId) || null,
    [activeChatId, chats]
  );

  function clearComposer() {
    setInputValue("");
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  function upsertChat(nextChat: AiTeacherChat) {
    setChats((current) => [nextChat, ...current.filter((chat) => chat.id !== nextChat.id)]);
  }

  function upsertLocalChatTurn(result: {
    chat: AiTeacherChat;
    userMessage: AiTeacherMessage;
    assistantMessage: AiTeacherMessage;
  }) {
    setLocalChatMessages((current) => {
      const existing = current[result.chat.id] || [];
      const nextMessages = [...existing, result.userMessage, result.assistantMessage];
      startTransition(() => {
        setMessages(nextMessages);
      });
      return {
        ...current,
        [result.chat.id]: nextMessages,
      };
    });
    upsertChat(result.chat);
    setActiveChatId(result.chat.id);
  }

  function resetInlineKeyFields() {
    setInlineProvider("openai");
    setInlineModelName("");
    setInlineApiKey("");
    setInlineApiBase("");
    setInlineApiVersion("");
    setSaveInlineKey(false);
    setInlineKeyLabel("");
  }

  async function refreshLocalOllamaModels(options: { quiet?: boolean } = {}) {
    if (!options.quiet) {
      setLocalOllamaRefreshing(true);
    }

    try {
      const models = await listLocalOllamaModels();
      setLocalOllamaModels(models);
      setLocalOllamaReachable(true);
      setLocalOllamaModelName((current) => {
        if (current && models.some((item) => item.name === current)) {
          return current;
        }
        return models[0]?.name || "";
      });
      if (!models.length) {
        setLocalOllamaStatus("No local models yet. Pull one to start.");
      } else if (!options.quiet) {
        setLocalOllamaStatus(null);
      }
      return models;
    } catch (error) {
      setLocalOllamaReachable(false);
      setLocalOllamaModels([]);
      setLocalOllamaModelName("");
      const message =
        error instanceof Error && error.message.trim()
          ? error.message.trim()
          : "Local Ollama is not reachable. Start Ollama and try again.";
      setLocalOllamaStatus(message);
      if (!options.quiet) {
        toast.error(message);
      }
      return [];
    } finally {
      if (!options.quiet) {
        setLocalOllamaRefreshing(false);
      }
    }
  }

  async function refreshAiSettings() {
    const payload = await getAiTeacherSettings();
    setAiSettings(payload);
    setBackendUnavailable(false);
    setSavedKeyId((current) =>
      current && payload.user_keys.some((item) => item.id === current)
        ? current
        : payload.user_keys[0]?.id || ""
    );
    setSavedKeyModelName((current) =>
      current || payload.user_keys.find((item) => item.id === savedKeyId)?.default_model_name || payload.user_keys[0]?.default_model_name || ""
    );
    if (!payload.user_keys.length && connectionMode === "saved_key") {
      setConnectionMode("paste_key");
    }
  }

  useEffect(() => {
    const isImageFile = Boolean(
      selectedFile &&
        (selectedFile.type.startsWith("image/") || /\.(png|jpe?g|gif|webp)$/i.test(selectedFile.name))
    );
    if (!selectedFile || !isImageFile) {
      setSelectedImagePreviewUrl(null);
      return;
    }

    const objectUrl = URL.createObjectURL(selectedFile);
    setSelectedImagePreviewUrl(objectUrl);
    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [selectedFile]);

  useEffect(() => {
    let cancelled = false;

    async function loadInitialData() {
      setLoadingSidebar(true);
      try {
        const [chatResult, folderResult, settingsResult, localResult] = await Promise.allSettled([
          listAiTeacherChats(),
          listAiTeacherFolders(),
          getAiTeacherSettings(),
          listLocalOllamaModels(),
        ]);
        if (cancelled) {
          return;
        }

        const backendErrors = [chatResult, folderResult, settingsResult].filter((result) => result.status === "rejected");
        const backendOffline =
          backendErrors.length > 0 &&
          backendErrors.every((result) =>
            isFastApiConnectionError((result as PromiseRejectedResult).reason)
          );

        setBackendUnavailable(backendOffline);

        if (chatResult.status === "fulfilled") {
          setChats(chatResult.value);
          setActiveChatId((current) => current || chatResult.value[0]?.id || null);
        } else if (!backendOffline) {
          toast.error(friendlyError(chatResult.reason));
        }

        if (folderResult.status === "fulfilled") {
          setFolders(folderResult.value);
          setSaveFolderId((current) => current || folderResult.value[0]?.id || "");
        } else if (!backendOffline) {
          toast.error(friendlyError(folderResult.reason));
        }

        if (settingsResult.status === "fulfilled") {
          setAiSettings(settingsResult.value);
          setSavedKeyId(settingsResult.value.user_keys[0]?.id || "");
          setSavedKeyModelName(settingsResult.value.user_keys[0]?.default_model_name || "");
        } else if (!backendOffline) {
          toast.error(friendlyError(settingsResult.reason));
        }

        if (localResult.status === "fulfilled") {
          setLocalOllamaModels(localResult.value);
          setLocalOllamaReachable(true);
          setLocalOllamaModelName((current) => current || localResult.value[0]?.name || "");
          setLocalOllamaStatus(localResult.value.length ? null : "No local models yet. Pull one to start.");
        } else {
          setLocalOllamaReachable(false);
          const localMessage = friendlyError(localResult.reason);
          setLocalOllamaStatus(localMessage);
          if (!backendOffline && !isLocalOllamaConnectionError(localResult.reason)) {
            toast.error(localMessage);
          }
        }

        if (backendOffline && localResult.status === "fulfilled") {
          setConnectionMode("local_ollama");
          setShowConnectionSettings(true);
        } else if (backendOffline && localResult.status === "rejected") {
          toast.error("AI Teacher backend is unreachable and Local Ollama is not ready yet.");
        }
      } catch (error) {
        if (!cancelled) {
          toast.error(friendlyError(error));
        }
      } finally {
        if (!cancelled) {
          setLoadingSidebar(false);
        }
      }
    }

    void loadInitialData();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (connectionMode === "saved_key" && !savedKeys.length) {
      setConnectionMode("paste_key");
    }
  }, [connectionMode, savedKeys.length]);

  useEffect(() => {
    if (activeSavedKey && !savedKeyModelName.trim()) {
      setSavedKeyModelName(activeSavedKey.default_model_name || "");
    }
  }, [activeSavedKey, savedKeyModelName]);

  useEffect(() => {
    if (connectionMode !== "platform") {
      setShowConnectionSettings(true);
    }
  }, [connectionMode]);

  useEffect(() => {
    setIsFullscreen(Boolean(document.fullscreenElement));

    const handleFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  useEffect(() => {
    if (!mobileSidebarOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [mobileSidebarOpen]);

  useEffect(() => {
    let cancelled = false;

    async function loadActiveChat() {
      if (!activeChatId) {
        setMessages([]);
        return;
      }

      setLoadingChat(true);
      try {
        const payload = await getAiTeacherChat(activeChatId);
        if (cancelled) {
          return;
        }
        setMessages(payload.messages || []);
        upsertChat(payload.chat);
      } catch (error) {
        if (!cancelled) {
          toast.error(friendlyError(error));
        }
      } finally {
        if (!cancelled) {
          setLoadingChat(false);
        }
      }
    }

    void loadActiveChat();

    return () => {
      cancelled = true;
    };
  }, [activeChatId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, pendingTurn, sending, loadingChat]);

  function handleNewChat() {
    startTransition(() => {
      setMobileSidebarOpen(false);
      setActiveChatId(null);
      setMessages([]);
      setPendingTurn(null);
      setStreamStatus(null);
      clearComposer();
    });
  }

  function handleSelectChat(chatId: string) {
    startTransition(() => {
      setMobileSidebarOpen(false);
      setActiveChatId(chatId);
      setPendingTurn(null);
      setStreamStatus(null);
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    });
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    if (!aiTeacherAvailable) {
      toast.error(aiTeacherUnavailableMessage);
      event.target.value = "";
      return;
    }

    const nextFile = event.target.files?.[0] || null;
    if (!nextFile) {
      setSelectedFile(null);
      return;
    }

    const isSupported =
      nextFile.type === "application/pdf" ||
      nextFile.type.startsWith("image/") ||
      /\.(pdf|png|jpe?g|webp|gif)$/i.test(nextFile.name);

    if (!isSupported) {
      toast.error("Upload a PDF or image file.");
      event.target.value = "";
      return;
    }

    setSelectedFile(nextFile);
  }

  async function handleCreateFolder() {
    const trimmedName = newFolderName.trim();
    if (!trimmedName) {
      toast.error("Enter a folder name first.");
      return;
    }

    setCreatingFolder(true);
    try {
      const folder = await createAiTeacherFolder({
        name: trimmedName,
        color_theme: newFolderTheme,
      });
      setFolders((current) => [folder, ...current.filter((item) => item.id !== folder.id)]);
      setSaveFolderId(folder.id);
      setNewFolderName("");
      toast.success("Folder created.");
    } catch (error) {
      toast.error(friendlyError(error));
    } finally {
      setCreatingFolder(false);
    }
  }

  async function handleSaveMessage(message: AiTeacherMessage) {
    setBusyMessageId(message.id);
    try {
      const saved = await saveAiTeacherItem({
        message_id: message.id,
        folder_id: saveFolderId || undefined,
        title: message.content.title || undefined,
      });
      toast.success(`Saved to ${saved.folder_name || "your library"}.`);
    } catch (error) {
      toast.error(friendlyError(error));
    } finally {
      setBusyMessageId(null);
    }
  }

  async function handleExportMessage(message: AiTeacherMessage) {
    setBusyMessageId(message.id);
    try {
      const pdfBlob = await exportAiTeacherPdf({
        message_id: message.id,
        title: message.content.title || undefined,
      });
      const fileBase = normalizeFileName(message.content.title || `${getToolOption(message.tool_type).label}-export`) || "ai-teacher-export";
      await downloadBlobNatively(pdfBlob, `${fileBase}.pdf`);
      toast.success("PDF export downloaded.");
    } catch (error) {
      toast.error(friendlyError(error));
    } finally {
      setBusyMessageId(null);
    }
  }

  function handleExportToPlayArea(message: AiTeacherMessage) {
    const documentData = createPlayAreaDocumentFromMessage(message);
    savePlayAreaDocument(documentData);
    const playAreaPath = location.pathname.startsWith("/app/myroom/")
      ? "/app/myroom/tools/ai-teacher-play-area"
      : "/app/tools/ai-teacher-play-area";

    toast.success("Exported to AI Teacher PlayArea.");
    navigate(`${playAreaPath}?doc=${encodeURIComponent(documentData.id)}`);
  }

  async function handleSubmit() {
    if (!aiTeacherAvailable) {
      toast.error(aiTeacherUnavailableMessage);
      return;
    }

    const trimmedInput = inputValue.trim();
    if (!trimmedInput && !selectedFile) {
      toast.error("Type a prompt or upload a file first.");
      return;
    }

    let provider: string | undefined;
    let modelName: string | undefined;
    let providerApiKey: string | undefined;
    let providerApiKeyId: string | undefined;
    let platformRouteId: string | undefined;
    let apiBase: string | undefined;
    let apiVersion: string | undefined;
    let routePriority: AiTeacherRoutePriority | undefined;

    if (connectionMode === "platform") {
      if (platformChoice.startsWith("route:")) {
        platformRouteId = platformChoice.slice("route:".length) || undefined;
      } else {
        routePriority = (platformChoice.split(":")[1] as AiTeacherRoutePriority | undefined) || "balanced";
      }
    } else if (connectionMode === "saved_key") {
      if (!savedKeyId) {
        toast.error("Choose one of your saved API keys first.");
        return;
      }

      providerApiKeyId = savedKeyId;
      provider = activeSavedKey?.provider || undefined;
      modelName =
        savedKeyModelName.trim() ||
        activeSavedKey?.default_model_name ||
        activeSavedKeyInheritedRoute?.model_name ||
        undefined;
      apiBase = activeSavedKey?.api_base || undefined;
      apiVersion = activeSavedKey?.api_version || undefined;

      if (!modelName) {
        toast.error("Add a model for this saved key, or use a matching admin route.");
        return;
      }
    } else {
      if (!inlineApiKey.trim()) {
        toast.error("Paste your API key first.");
        return;
      }
      if (!inlineModelName.trim()) {
        toast.error("Add the LiteLLM model name for your key.");
        return;
      }

      provider = inlineProvider.trim() || "custom";
      modelName = inlineModelName.trim();
      apiBase = inlineApiBase.trim() || undefined;
      apiVersion = inlineApiVersion.trim() || undefined;

      if (saveInlineKey) {
        try {
          const savedKey = await saveAiTeacherProviderKey({
            scope: "user",
            provider_slug: "litellm",
            label: inlineKeyLabel.trim() || `${provider} key`,
            provider,
            api_key: inlineApiKey.trim(),
            default_model_name: modelName,
            api_base: apiBase,
            api_version: apiVersion,
            is_active: true,
          });
          providerApiKeyId = savedKey.id;
          await refreshAiSettings();
        } catch (error) {
          toast.error(friendlyError(error));
          return;
        }
      } else {
        providerApiKey = inlineApiKey.trim();
      }
    }

    setSending(true);
    setStreamStatus("validating");
    setPendingTurn({
      toolType,
      input: trimmedInput,
      fileLabel: selectedFile?.name || null,
    });

    try {
      let uploadedFileUrl: string | undefined;
      if (selectedFile) {
        setUploading(true);
        uploadedFileUrl = await uploadAiTeacherSource(selectedFile);
      }

      const result = await streamAiTeacherChat(
        {
          chat_id: activeChatId,
          tool_type: toolType,
          input: trimmedInput,
          file_url: uploadedFileUrl,
          file_name: selectedFile?.name || undefined,
          title: deriveChatTitle(trimmedInput, selectedFile, toolType),
          provider,
          model_name: modelName,
          provider_api_key: providerApiKey,
          provider_api_key_id: providerApiKeyId,
          platform_route_id: platformRouteId,
          api_base: apiBase,
          api_version: apiVersion,
          route_priority: routePriority,
        },
        {
          onStatus: setStreamStatus,
        }
      );

      upsertChat(result.chat);
      setActiveChatId(result.chat.id);
      setMessages((current) =>
        activeChatId && activeChatId === result.chat.id
          ? [...current, result.user_message, result.assistant_message]
          : [result.user_message, result.assistant_message]
      );
      clearComposer();
      if (connectionMode === "paste_key") {
        resetInlineKeyFields();
      }
      toast.success(
        `${result.wallet.coins_charged} coin${result.wallet.coins_charged === 1 ? "" : "s"} used in ${
          result.wallet.api_mode === "user_api" ? "user API mode" : "admin API mode"
        }${result.assistant_message.provider_name ? ` via ${result.assistant_message.provider_name}` : ""}.`
      );
    } catch (error) {
      toast.error(friendlyError(error));
    } finally {
      setUploading(false);
      setSending(false);
      setStreamStatus(null);
      setPendingTurn(null);
    }
  }

  const attachedSourceLabel = selectedFile?.name || activeChat?.source_file_name || null;
  const platformCoins = aiSettings.coin_pricing?.platform_message_coins ?? 0;
  const userKeyCoins = aiSettings.coin_pricing?.user_key_message_coins ?? 0;
  const composerHint = !aiTeacherAvailable
    ? aiTeacherUnavailableMessage
    : selectedFile && activeChat?.source_file_name
      ? "Replacing the current source when you send."
      : attachedSourceLabel
        ? "Source stays attached across follow-up turns."
        : "Attach one PDF or image to keep context.";
  const compactComposerHint = !aiTeacherAvailable
    ? "Server busy"
    : selectedFile && activeChat?.source_file_name
      ? "Replaces current source."
      : attachedSourceLabel
        ? "Source stays in chat."
        : "Attach PDF/image.";
  const sourceBadgeClassName = selectedFile
    ? "border-emerald-200 bg-emerald-50 text-emerald-800"
    : attachedSourceLabel
      ? "border-slate-200 bg-white text-slate-600"
      : "border-slate-200 bg-white text-slate-500";
  const sourceBadgeLabel = selectedFile
    ? `${selectedFile.name} · ${formatFileSize(selectedFile.size)}`
    : attachedSourceLabel || "No source";
  const compactSourceBadgeLabel = selectedFile ? selectedFile.name : attachedSourceLabel || "No source";
  const hasSourceAttachment = Boolean(attachedSourceLabel);
  const shellClassName = isFullscreen
    ? "mt-3 overflow-hidden rounded-[20px] border border-slate-200 bg-[linear-gradient(180deg,#fffdf6_0%,#ffffff_34%,#f8fafc_100%)] shadow-[0_28px_80px_-48px_rgba(15,23,42,0.28)] sm:mt-4 xl:grid xl:h-[calc(100vh-4.5rem)] xl:grid-cols-[220px_minmax(0,1fr)]"
    : "overflow-hidden rounded-[24px] border border-slate-200 bg-[linear-gradient(180deg,#fffdf6_0%,#ffffff_34%,#f8fafc_100%)] shadow-[0_28px_80px_-48px_rgba(15,23,42,0.28)] xl:grid xl:h-[calc(100vh-10.5rem)] xl:grid-cols-[248px_minmax(0,1fr)]";
  const contentWidthClassName = isFullscreen ? "max-w-none" : "max-w-[96rem]";

  return (
    <div className={shellClassName}>
      {mobileSidebarOpen ? (
        <div className="fixed inset-0 z-[70] bg-slate-950/40 backdrop-blur-sm xl:hidden" role="dialog" aria-modal="true">
          <div className="absolute inset-y-0 left-0 w-[min(22rem,88vw)] overflow-hidden border-r border-slate-200 bg-[#f8f3e8] shadow-[0_28px_70px_-40px_rgba(15,23,42,0.55)]">
            <div className="flex h-full flex-col">
              <div className="flex items-center justify-between border-b border-slate-200 px-3 py-3">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">AI Teacher</p>
                  <p className="text-sm font-semibold text-slate-900">Chats</p>
                </div>
                <button
                  type="button"
                  onClick={() => setMobileSidebarOpen(false)}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600"
                  aria-label="Close chat drawer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="border-b border-slate-200 p-3">
                <button
                  type="button"
                  onClick={handleNewChat}
                  className="flex w-full items-center justify-center gap-2 rounded-[18px] bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
                >
                  <Plus className="h-4 w-4" />
                  New chat
                </button>

                <div className="relative mt-3">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    value={chatSearch}
                    onChange={(event) => setChatSearch(event.target.value)}
                    placeholder="Search chats"
                    className="w-full rounded-[18px] border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-slate-400"
                  />
                </div>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto p-2.5">
                {loadingSidebar ? (
                  <div className="rounded-2xl border border-slate-200 bg-white px-4 py-6 text-center text-sm text-slate-500">
                    Loading chats...
                  </div>
                ) : filteredChats.length ? (
                  <div className="space-y-1.5">
                    {filteredChats.map((chat) => (
                      <button
                        key={chat.id}
                        type="button"
                        onClick={() => handleSelectChat(chat.id)}
                        className={`w-full rounded-[18px] border px-3 py-2.5 text-left transition ${
                          activeChatId === chat.id
                            ? "border-slate-900 bg-white shadow-sm"
                            : "border-transparent bg-transparent hover:border-slate-200 hover:bg-white"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <p className="line-clamp-1 text-sm font-semibold text-slate-900">{chat.title}</p>
                          <span className="text-[11px] text-slate-400">{formatDateLabel(chat.updated_at)}</span>
                        </div>
                        <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500">
                          {chat.last_message_preview || chat.summary_text || "Continue this conversation."}
                        </p>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-2xl border border-slate-200 bg-white px-4 py-5 text-sm text-slate-500">
                    No chats yet. Start with a source file or a quick question.
                  </div>
                )}
              </div>

              <details className="border-t border-slate-200 bg-[#f7f7f8] p-3" open={false}>
                <summary className="cursor-pointer list-none text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Library settings
                </summary>
                <div className="mt-3 space-y-3">
                  <select
                    value={saveFolderId}
                    onChange={(event) => setSaveFolderId(event.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-slate-400"
                  >
                    <option value="">Quick Saves</option>
                    {folders.map((folder) => (
                      <option key={folder.id} value={folder.id}>
                        {folder.name}
                      </option>
                    ))}
                  </select>
                  <input
                    value={newFolderName}
                    onChange={(event) => setNewFolderName(event.target.value)}
                    placeholder="New folder name"
                    className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-slate-400"
                  />
                  <div className="flex flex-wrap gap-2">
                    {(["yellow", "blue", "pink", "green"] as AiTeacherTheme[]).map((theme) => (
                      <button
                        key={theme}
                        type="button"
                        onClick={() => setNewFolderTheme(theme)}
                        className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] ${
                          newFolderTheme === theme ? THEME_META[theme].chip : "border-slate-200 bg-white text-slate-500"
                        }`}
                      >
                        {theme}
                      </button>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={handleCreateFolder}
                    disabled={creatingFolder}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-slate-300"
                  >
                    {creatingFolder ? <Loader2 className="h-4 w-4 animate-spin" /> : <FolderPlus className="h-4 w-4" />}
                    Create folder
                  </button>
                </div>
              </details>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setMobileSidebarOpen(false)}
            className="absolute inset-0 left-[min(22rem,88vw)]"
            aria-label="Close chat drawer backdrop"
          />
        </div>
      ) : null}

      <aside className="hidden min-h-[30rem] flex-col border-b border-slate-200 bg-[#f8f3e8] xl:flex xl:min-h-0 xl:border-b-0 xl:border-r">
        <div className="border-b border-slate-200 p-3">
          <button
            type="button"
            onClick={handleNewChat}
            className="flex w-full items-center justify-center gap-2 rounded-[18px] bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            <Plus className="h-4 w-4" />
            New chat
          </button>

          <div className="relative mt-3">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={chatSearch}
              onChange={(event) => setChatSearch(event.target.value)}
              placeholder="Search chats"
              className="w-full rounded-[18px] border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-slate-400"
            />
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-2.5">
          {loadingSidebar ? (
            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-6 text-center text-sm text-slate-500">
              Loading chats...
            </div>
          ) : filteredChats.length ? (
            <div className="space-y-1.5">
              {filteredChats.map((chat) => (
                <button
                  key={chat.id}
                  type="button"
                  onClick={() => handleSelectChat(chat.id)}
                  className={`w-full rounded-[18px] border px-3 py-2.5 text-left transition ${
                    activeChatId === chat.id
                      ? "border-slate-900 bg-white shadow-sm"
                      : "border-transparent bg-transparent hover:border-slate-200 hover:bg-white"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="line-clamp-1 text-sm font-semibold text-slate-900">{chat.title}</p>
                    <span className="text-[11px] text-slate-400">{formatDateLabel(chat.updated_at)}</span>
                  </div>
                  <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500">
                    {chat.last_message_preview || chat.summary_text || "Continue this conversation."}
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.16em] text-slate-500">
                      {chat.last_tool_type ? getToolOption(chat.last_tool_type).promptLabel : "Chat"}
                    </span>
                    <span className="text-[11px] text-slate-400">{formatRelativeCount(chat.message_count)}</span>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-5 text-sm text-slate-500">
              No chats yet. Start with a source file or a quick question.
            </div>
          )}
        </div>

        <details className="border-t border-slate-200 bg-[#f7f7f8] p-3" open={false}>
          <summary className="cursor-pointer list-none text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            Library settings
          </summary>
          <div className="mt-3 space-y-3">
            <select
              value={saveFolderId}
              onChange={(event) => setSaveFolderId(event.target.value)}
              className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-slate-400"
            >
              <option value="">Quick Saves</option>
              {folders.map((folder) => (
                <option key={folder.id} value={folder.id}>
                  {folder.name}
                </option>
              ))}
            </select>
            <input
              value={newFolderName}
              onChange={(event) => setNewFolderName(event.target.value)}
              placeholder="New folder name"
              className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-slate-400"
            />
            <div className="flex flex-wrap gap-2">
              {(["yellow", "blue", "pink", "green"] as AiTeacherTheme[]).map((theme) => (
                <button
                  key={theme}
                  type="button"
                  onClick={() => setNewFolderTheme(theme)}
                  className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] ${
                    newFolderTheme === theme ? THEME_META[theme].chip : "border-slate-200 bg-white text-slate-500"
                  }`}
                >
                  {theme}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={handleCreateFolder}
              disabled={creatingFolder}
              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-slate-300"
            >
              {creatingFolder ? <Loader2 className="h-4 w-4 animate-spin" /> : <FolderPlus className="h-4 w-4" />}
              Create folder
            </button>
          </div>
        </details>
      </aside>

      <section className="flex min-h-[30rem] flex-col bg-[linear-gradient(180deg,#fffdf7_0%,#f8fafc_100%)] xl:min-h-0">
        <div className="flex items-center justify-between gap-2 border-b border-slate-200 bg-white px-3 py-2.5 xl:hidden">
          <button
            type="button"
            onClick={() => setMobileSidebarOpen(true)}
            className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700"
          >
            <MessageSquare className="h-3.5 w-3.5" />
            Chats
          </button>
          <div className="min-w-0 text-center">
            <p className="truncate text-sm font-semibold text-slate-900">{activeChat?.title || selectedTool.promptLabel}</p>
            {hasSourceAttachment ? (
              <p className="truncate text-[11px] text-slate-500">{attachedSourceLabel}</p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={handleNewChat}
            className="inline-flex items-center gap-1.5 rounded-full bg-slate-900 px-3 py-2 text-xs font-semibold text-white"
          >
            <Plus className="h-3.5 w-3.5" />
            New
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto bg-[linear-gradient(180deg,#fffef9_0%,#f8fafc_100%)]">
          <div className={`mx-auto flex w-full flex-col gap-3 sm:gap-4 px-0 sm:px-5 py-3 sm:py-4 ${contentWidthClassName}`}>
            {loadingChat ? (
              <div className="rounded-2xl border border-slate-200 bg-white px-4 py-6 text-center text-sm text-slate-500">
                Loading conversation...
              </div>
            ) : messages.length ? (
              messages.map((message) =>
                message.role === "assistant" ? (
                  <AssistantBubble
                    key={message.id}
                    message={message}
                    saveFolderId={saveFolderId}
                    folders={folders}
                    busyMessageId={busyMessageId}
                    onFolderChange={setSaveFolderId}
                    onSave={handleSaveMessage}
                    onExport={handleExportMessage}
                    onExportToPlayArea={handleExportToPlayArea}
                  />
                ) : (
                  <UserBubble
                    key={message.id}
                    toolType={message.tool_type}
                    text={message.input_text || summarizeMessage(message)}
                    createdAt={message.created_at}
                    fileLabel={
                      (typeof message.content.source_file_name === "string" ? message.content.source_file_name : null) ||
                      (!message.input_text && message.file_url ? activeChat?.source_file_name || "Source attached" : null)
                    }
                    fileUrl={message.file_url}
                    fileMimeType={
                      (typeof message.content.source_mime_type === "string" ? message.content.source_mime_type : null) ||
                      activeChat?.source_mime_type ||
                      null
                    }
                    fileSummary={
                      (typeof message.content.file_context_summary === "string" ? message.content.file_context_summary : null) ||
                      (typeof message.content.source_context_summary === "string" ? message.content.source_context_summary : null) ||
                      activeChat?.source_context_summary ||
                      null
                    }
                  />
                )
              )
            ) : (
              <EmptyChatState toolType={toolType} onToolChange={setToolType} fullscreen={isFullscreen} />
            )}

            {pendingTurn ? (
              <UserBubble
                toolType={pendingTurn.toolType}
                text={pendingTurn.input}
                pending
                fileLabel={pendingTurn.fileLabel}
              />
            ) : null}

            {sending ? <AssistantLoadingBubble status={streamStatus} /> : null}
            <div ref={messagesEndRef} />
          </div>
        </div>

        <div className="border-t border-slate-200 bg-white">
          <div className={`mx-auto w-full px-2.5 sm:px-5 py-2.5 sm:py-3 ${contentWidthClassName}`}>
            <div className="rounded-[16px] sm:rounded-[22px] border border-slate-200 bg-[linear-gradient(180deg,#fffdf6_0%,#f8fafc_100%)] p-1.5 sm:p-2 shadow-[0_12px_28px_-24px_rgba(15,23,42,0.25)]">
              <div className="flex flex-col gap-1.5 sm:gap-2">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="hidden min-w-0 flex-1 flex-wrap items-center gap-1.5 sm:flex">
                    {TOOL_OPTIONS.map((option) => (
                      <ToolModeButton
                        key={option.id}
                        option={option}
                        active={option.id === toolType}
                        onClick={() => setToolType(option.id)}
                      />
                    ))}
                  </div>

                  <div className="flex w-full items-center gap-1.5 sm:hidden">
                    <div className="relative min-w-0 flex-1">
                      <selectedTool.icon className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500" />
                      <select
                        value={toolType}
                        onChange={(event) => setToolType(event.target.value as AiTeacherToolType)}
                        className="w-full appearance-none rounded-full border border-slate-200 bg-white py-2 pl-9 pr-9 text-[11px] font-semibold text-slate-700 outline-none transition focus:border-slate-400"
                        aria-label="Select study mode"
                      >
                        {TOOL_OPTIONS.map((option) => (
                          <option key={option.id} value={option.id}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                    </div>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={!aiTeacherAvailable}
                      className="inline-flex h-9 items-center justify-center rounded-full border border-slate-200 bg-white px-2.5 text-slate-700 transition hover:border-slate-300 disabled:cursor-not-allowed disabled:opacity-45"
                      aria-label="Upload source"
                    >
                      <Upload className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  <div className="flex w-full flex-wrap items-center gap-1.5 sm:w-auto sm:gap-2">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={!aiTeacherAvailable}
                      className="hidden items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 transition hover:border-slate-300 disabled:cursor-not-allowed disabled:opacity-45 sm:inline-flex"
                      aria-label="Upload source"
                    >
                      <Upload className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline">Source</span>
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="application/pdf,image/*"
                      className="hidden"
                      disabled={!aiTeacherAvailable}
                      onChange={handleFileChange}
                    />

                    {hasSourceAttachment ? (
                      <span className={`inline-flex min-w-0 max-w-full items-center gap-1.5 rounded-full border px-2.5 py-1.5 text-[10px] font-medium sm:max-w-[240px] sm:px-3 sm:py-2 sm:text-[11px] ${sourceBadgeClassName}`}>
                        <Paperclip className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate sm:hidden">{compactSourceBadgeLabel}</span>
                        <span className="hidden truncate sm:inline">{sourceBadgeLabel}</span>
                      </span>
                    ) : (
                      <span className={`hidden min-w-0 max-w-full items-center gap-1.5 rounded-full border px-3 py-2 text-[11px] font-medium sm:inline-flex sm:max-w-[240px] ${sourceBadgeClassName}`}>
                        <Paperclip className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate">{sourceBadgeLabel}</span>
                      </span>
                    )}
                  </div>
                </div>

                <div className="rounded-[16px] border border-slate-200 bg-white px-2.5 py-2 shadow-sm sm:rounded-[18px] sm:px-3">
                  {!aiTeacherAvailable ? (
                    <div className="mb-2 flex items-start gap-2 rounded-[14px] border border-amber-200 bg-amber-50 px-3 py-2 text-amber-800">
                      <Bot className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.16em]">AI Teacher paused</p>
                        <p className="mt-0.5 text-[11px] leading-5">{aiTeacherUnavailableMessage}</p>
                      </div>
                    </div>
                  ) : null}

                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <span className="inline-flex rounded-full bg-slate-900 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-white">
                      {selectedTool.promptLabel}
                    </span>
                    <span className="text-[11px] text-slate-500">{selectedTool.hint}</span>
                  </div>

                  {selectedFile ? (
                    <div className="mb-2 rounded-[16px] border border-slate-200 bg-slate-50 p-2.5">
                      <div className="flex items-center gap-3">
                        {selectedImagePreviewUrl ? (
                          <img
                            src={selectedImagePreviewUrl}
                            alt={selectedFile.name}
                            className="h-14 w-14 shrink-0 rounded-[14px] border border-slate-200 object-cover"
                          />
                        ) : (
                          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[14px] border border-slate-200 bg-white text-slate-500">
                            <FileText className="h-5 w-5" />
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="inline-flex rounded-full border border-slate-200 bg-white px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                              {selectedImagePreviewUrl ? "Image source" : "PDF source"}
                            </span>
                            <span className="text-[10px] text-slate-400">{formatFileSize(selectedFile.size)}</span>
                          </div>
                          <p className="mt-1 line-clamp-1 text-sm font-semibold text-slate-800">{selectedFile.name}</p>
                          <p className="mt-0.5 text-xs text-slate-500">This source will be read and attached to the next turn.</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedFile(null);
                            if (fileInputRef.current) {
                              fileInputRef.current.value = "";
                            }
                          }}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 transition hover:border-slate-300 hover:text-slate-700"
                          aria-label="Remove selected source"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ) : null}

                  <textarea
                    value={inputValue}
                    onChange={(event) => setInputValue(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" && !event.shiftKey) {
                        event.preventDefault();
                        void handleSubmit();
                      }
                    }}
                    placeholder={aiTeacherAvailable ? selectedTool.placeholder : aiTeacherUnavailableMessage}
                    rows={1}
                    disabled={!aiTeacherAvailable}
                    className="min-h-[42px] w-full resize-none bg-transparent text-[12px] leading-5 text-slate-800 outline-none placeholder:text-slate-400 disabled:cursor-not-allowed disabled:text-slate-400 sm:min-h-[54px] sm:text-[13px]"
                  />

                  <datalist id="ai-teacher-provider-list">
                    {PROVIDER_SUGGESTIONS.map((provider) => (
                      <option key={provider} value={provider} />
                    ))}
                  </datalist>

                  <div className="mt-1.5 flex flex-col gap-1.5 border-t border-slate-100 pt-1.5 sm:mt-2 sm:gap-2 sm:pt-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
                    <div className="flex flex-wrap items-center gap-1.5 text-[10px] text-slate-500 sm:gap-2 sm:text-[11px]">
                      <span className="sm:hidden">{compactComposerHint}</span>
                      <span className="hidden sm:inline">{composerHint}</span>
                      <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 sm:gap-1.5 sm:px-2.5 sm:py-1">
                        <Coins className="h-3.5 w-3.5" />
                        P {platformCoins} / K {userKeyCoins}
                      </span>
                      {connectionMode === "platform" && !platformRoutes.length ? (
                        <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-amber-700 sm:px-2.5 sm:py-1">
                          No route
                        </span>
                      ) : null}
                    </div>

                    <div className="flex w-full items-center gap-1.5 sm:w-auto sm:gap-2 sm:justify-end">
                      <button
                        type="button"
                        onClick={() => setShowConnectionSettings((current) => !current)}
                        className="inline-flex min-w-0 flex-1 items-center gap-1.5 rounded-full border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-medium text-slate-700 transition hover:border-slate-300 sm:flex-none sm:gap-2 sm:px-3 sm:py-2 sm:text-xs"
                      >
                        <div className="min-w-0 flex flex-1 items-center gap-1.5 text-left">
                          <Bot className="h-3.5 w-3.5 shrink-0" />
                          <span className="shrink-0 truncate">{getConnectionModeLabel(connectionMode)}</span>
                          <span className="min-w-0 truncate text-[10px] text-slate-400 sm:hidden">
                            {connectionDetailLabel}
                          </span>
                          <span className="hidden min-w-0 truncate text-[11px] text-slate-400 sm:inline">
                              {connectionDetailLabel}
                          </span>
                        </div>
                        {showConnectionSettings ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                      </button>

                      <button
                        type="button"
                        onClick={handleSubmit}
                        disabled={sending || uploading || !aiTeacherAvailable}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-slate-900 text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60 sm:h-10 sm:w-10"
                        aria-label="Send prompt"
                      >
                        {sending || uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                </div>

                {showConnectionSettings ? (
                  <div className="rounded-[18px] border border-slate-200 bg-white/92 p-2 shadow-sm sm:rounded-[20px] sm:p-2.5">
                    <div className="flex flex-wrap items-center gap-1">
                      {([
                        { id: "platform", label: "Platform" },
                        { id: "saved_key", label: "Saved", disabled: !savedKeys.length },
                        { id: "paste_key", label: "Paste key" },
                      ] as const).map((mode) => (
                        <button
                          key={mode.id}
                          type="button"
                          disabled={Boolean(mode.disabled)}
                          onClick={() => setConnectionMode(mode.id)}
                          className={`rounded-full px-2.5 py-1 text-[10px] font-semibold transition sm:px-3 sm:py-1.5 sm:text-[11px] ${
                            connectionMode === mode.id
                              ? "bg-slate-900 text-white"
                              : "border border-slate-200 bg-white text-slate-600 hover:border-slate-300 disabled:cursor-not-allowed disabled:opacity-45"
                          }`}
                        >
                          {mode.label}
                        </button>
                      ))}
                    </div>

                    <div className="mt-2 space-y-2 sm:mt-2.5 sm:space-y-2.5">
                      {connectionMode === "platform" ? (
                        <select
                          value={platformChoice}
                          onChange={(event) => setPlatformChoice(event.target.value)}
                          className="w-full rounded-[14px] border border-slate-200 bg-white px-2.5 py-2 text-[13px] text-slate-700 outline-none transition focus:border-slate-400 sm:rounded-[16px] sm:px-3 sm:py-2.5 sm:text-sm"
                        >
                          {PRIORITY_OPTIONS.map((priority) => (
                            <option key={priority} value={`auto:${priority}`}>
                              Auto · {formatPriorityLabel(priority)}
                            </option>
                          ))}
                          {platformRoutes.map((route) => (
                            <option key={route.id} value={`route:${route.id}`}>
                              {formatRouteOption(route)}
                            </option>
                          ))}
                        </select>
                      ) : null}

                      {connectionMode === "saved_key" ? (
                        <div className="grid gap-2 sm:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_auto]">
                          <select
                            value={savedKeyId}
                            onChange={(event) => {
                              const nextKeyId = event.target.value;
                              setSavedKeyId(nextKeyId);
                              const selectedKey = savedKeys.find((item) => item.id === nextKeyId);
                              setSavedKeyModelName(selectedKey?.default_model_name || "");
                            }}
                            className="rounded-[14px] border border-slate-200 bg-white px-2.5 py-2 text-[13px] text-slate-700 outline-none transition focus:border-slate-400 sm:rounded-[16px] sm:px-3 sm:py-2.5 sm:text-sm"
                          >
                            <option value="">Select saved key</option>
                            {savedKeys.map((key) => (
                              <option key={key.id} value={key.id}>
                                {key.label} · {key.provider} · {key.masked_key}
                              </option>
                            ))}
                          </select>
                          <input
                            value={savedKeyModelName}
                            onChange={(event) => setSavedKeyModelName(event.target.value)}
                            placeholder={
                              activeSavedKeyInheritedRoute?.model_name
                                ? `Optional · defaults to ${activeSavedKeyInheritedRoute.model_name}`
                                : "Model optional"
                            }
                            className="rounded-[14px] border border-slate-200 bg-white px-2.5 py-2 text-[13px] text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-slate-400 sm:rounded-[16px] sm:px-3 sm:py-2.5 sm:text-sm"
                          />
                          {savedKeyId ? (
                            <button
                              type="button"
                              onClick={() => {
                                setDeletingSavedKeyId(savedKeyId);
                                void deleteAiTeacherProviderKey(savedKeyId)
                                  .then(async () => {
                                    toast.success("Saved key removed.");
                                    setSavedKeyId("");
                                    setSavedKeyModelName("");
                                    await refreshAiSettings();
                                  })
                                  .catch((error) => {
                                    toast.error(friendlyError(error));
                                  })
                                  .finally(() => setDeletingSavedKeyId(null));
                              }}
                              className="inline-flex h-9 items-center justify-center rounded-full border border-rose-200 bg-rose-50 px-3 text-xs font-medium text-rose-600 sm:h-10"
                            >
                              {deletingSavedKeyId === savedKeyId ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Delete"}
                            </button>
                          ) : null}
                        </div>
                      ) : null}

                      {connectionMode === "paste_key" ? (
                        <>
                          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                            <input
                              value={inlineProvider}
                              onChange={(event) => setInlineProvider(event.target.value)}
                              list="ai-teacher-provider-list"
                              placeholder="Provider"
                              className="rounded-[14px] border border-slate-200 bg-white px-2.5 py-2 text-[13px] text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-slate-400 sm:rounded-[16px] sm:px-3 sm:py-2.5 sm:text-sm"
                            />
                            <input
                              value={inlineModelName}
                              onChange={(event) => setInlineModelName(event.target.value)}
                              placeholder="Model name"
                              className="rounded-[14px] border border-slate-200 bg-white px-2.5 py-2 text-[13px] text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-slate-400 sm:rounded-[16px] sm:px-3 sm:py-2.5 sm:text-sm"
                            />
                            <input
                              value={inlineApiKey}
                              onChange={(event) => setInlineApiKey(event.target.value)}
                              placeholder="API key"
                              type="password"
                              className="rounded-[14px] border border-slate-200 bg-white px-2.5 py-2 text-[13px] text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-slate-400 sm:rounded-[16px] sm:px-3 sm:py-2.5 sm:text-sm"
                            />
                            <input
                              value={inlineApiBase}
                              onChange={(event) => setInlineApiBase(event.target.value)}
                              placeholder="API base"
                              className="rounded-[14px] border border-slate-200 bg-white px-2.5 py-2 text-[13px] text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-slate-400 sm:rounded-[16px] sm:px-3 sm:py-2.5 sm:text-sm"
                            />
                            <input
                              value={inlineApiVersion}
                              onChange={(event) => setInlineApiVersion(event.target.value)}
                              placeholder="Version"
                              className="rounded-[14px] border border-slate-200 bg-white px-2.5 py-2 text-[13px] text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-slate-400 sm:rounded-[16px] sm:px-3 sm:py-2.5 sm:text-sm"
                            />
                          </div>

                          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                            <label className="inline-flex items-center gap-2 text-[11px] text-slate-500 sm:text-xs">
                              <input
                                type="checkbox"
                                checked={saveInlineKey}
                                onChange={(event) => setSaveInlineKey(event.target.checked)}
                                className="h-4 w-4 rounded border-slate-300"
                              />
                              Save this key
                            </label>
                            {saveInlineKey ? (
                              <input
                                value={inlineKeyLabel}
                                onChange={(event) => setInlineKeyLabel(event.target.value)}
                                placeholder="Key label"
                                className="rounded-[14px] border border-slate-200 bg-white px-2.5 py-2 text-[13px] text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-slate-400 sm:rounded-[16px] sm:px-3 sm:text-sm"
                              />
                            ) : null}
                          </div>
                        </>
                      ) : null}

                      <div className="flex flex-wrap items-center gap-1.5 text-[10px] text-slate-500 sm:gap-2 sm:text-[11px]">
                        <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2 py-1 sm:gap-1.5 sm:px-3 sm:py-1.5">
                          <Coins className="h-3.5 w-3.5" />
                          Platform {platformCoins}
                        </span>
                        <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2 py-1 sm:gap-1.5 sm:px-3 sm:py-1.5">
                          <Coins className="h-3.5 w-3.5" />
                          My key {userKeyCoins}
                        </span>
                        {connectionMode === "platform" && !platformRoutes.length ? (
                          <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-1 text-amber-700 sm:px-3 sm:py-1.5">
                            No admin route yet.
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
