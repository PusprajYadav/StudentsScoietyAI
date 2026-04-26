import { Check, Coins, FileText, ImagePlus, Link2, Lock, Plus, Vote, X } from "lucide-react";
import { type FormEvent, useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import { getDiscussionKindLabel } from "../data/discussions";
import { getPdfPageCountFromFile } from "../lib/pdf";
import {
  POST_CONTENT_MAX_LENGTH,
  POST_TAG_INPUT_MAX_LENGTH,
  POST_TAG_MAX_COUNT,
  POST_TITLE_MAX_LENGTH,
  clampPostContentInput,
  clampPostTitleInput,
  normalizePostTags,
} from "../lib/postLimits";
import type { DiscussionKind, PlatformSettingsRow, PostType } from "../types/database";

export interface ComposerPayload {
  title: string;
  content: string;
  tags: string[];
  discussionKind: DiscussionKind;
  imageFiles: File[];
  retainedImageUrls: string[];
  pdfFile: File | null;
  pdfPageCount: number | null;
  retainExistingPdf: boolean;
  isAnonymous: boolean;
  linkUrl: string;
  postType: PostType;
  pollQuestion: string;
  pollOptions: string[];
}

export interface ComposerInitialValues {
  title?: string;
  content?: string;
  tags?: string[];
  discussionKind?: DiscussionKind;
  existingImageUrls?: string[];
  existingPdf?: {
    url: string;
    name?: string | null;
    sizeBytes?: number | null;
    pageCount?: number | null;
  } | null;
  isAnonymous?: boolean;
  linkUrl?: string | null;
  postType?: PostType;
  pollQuestion?: string | null;
  pollOptions?: string[];
}

interface PostComposerProps {
  id?: string;
  title: string;
  description: string;
  submitHint?: string | null;
  availableKinds: DiscussionKind[];
  defaultKind: DiscussionKind;
  limits: Pick<PlatformSettingsRow, "max_images_per_post" | "max_pdf_size_mb">;
  forceAnonymous?: boolean;
  disabledReason?: string | null;
  initialValues?: ComposerInitialValues;
  submitLabel?: string;
  submittingLabel?: string;
  disablePostTypeSwitch?: boolean;
  disablePollOptionEditing?: boolean;
  onSubmit: (payload: ComposerPayload) => Promise<void>;
}

const initialPollOptions = ["", ""];
const createEmptyPollOptions = () => [...initialPollOptions];

function buildPollOptions(options?: string[]) {
  if (!options || options.length === 0) {
    return createEmptyPollOptions();
  }

  if (options.length === 1) {
    return [options[0], ""];
  }

  return [...options];
}

export function PostComposer({
  id,
  title,
  description,
  submitHint = null,
  availableKinds,
  defaultKind,
  limits,
  forceAnonymous = false,
  disabledReason,
  initialValues,
  submitLabel = "Publish post",
  submittingLabel = "Publishing...",
  disablePostTypeSwitch = false,
  disablePollOptionEditing = false,
  onSubmit,
}: PostComposerProps) {
  const [draftTitle, setDraftTitle] = useState("");
  const [content, setContent] = useState("");
  const [tags, setTags] = useState("");
  const [discussionKind, setDiscussionKind] = useState<DiscussionKind>(defaultKind);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [retainedImageUrls, setRetainedImageUrls] = useState<string[]>([]);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [retainedPdf, setRetainedPdf] = useState<ComposerInitialValues["existingPdf"]>(null);
  const [linkUrl, setLinkUrl] = useState("");
  const [postType, setPostType] = useState<PostType>("standard");
  const [pollQuestion, setPollQuestion] = useState("");
  const [pollOptions, setPollOptions] = useState<string[]>(createEmptyPollOptions);
  const [isAnonymous, setIsAnonymous] = useState(forceAnonymous || defaultKind === "anonymous");
  const [submitting, setSubmitting] = useState(false);
  const initialSeedRef = useRef<ComposerInitialValues | undefined>();
  const hasSeededRef = useRef(false);
  const imagePreviews = useMemo(
    () =>
      imageFiles.map((file) => ({
        id: `${file.name}-${file.size}-${file.lastModified}`,
        name: file.name,
        url: URL.createObjectURL(file),
      })),
    [imageFiles]
  );
  const normalizedTags = useMemo(() => normalizePostTags(tags.split(",")), [tags]);

  useEffect(() => {
    if (hasSeededRef.current && initialSeedRef.current === initialValues) {
      return;
    }

    hasSeededRef.current = true;
    initialSeedRef.current = initialValues;

    const nextDiscussionKind =
      initialValues?.discussionKind && availableKinds.includes(initialValues.discussionKind)
        ? initialValues.discussionKind
        : availableKinds.includes(defaultKind)
          ? defaultKind
          : availableKinds[0] || defaultKind;

    setDraftTitle(clampPostTitleInput(initialValues?.title || ""));
    setContent(clampPostContentInput(initialValues?.content || ""));
    setTags(normalizePostTags(initialValues?.tags || []).join(", "));
    setDiscussionKind(nextDiscussionKind);
    setImageFiles([]);
    setRetainedImageUrls(initialValues?.existingImageUrls || []);
    setPdfFile(null);
    setRetainedPdf(initialValues?.existingPdf || null);
    setLinkUrl(initialValues?.linkUrl || "");
    setPostType(initialValues?.postType || "standard");
    setPollQuestion(initialValues?.pollQuestion || "");
    setPollOptions(buildPollOptions(initialValues?.pollOptions));
    setIsAnonymous(forceAnonymous || nextDiscussionKind === "anonymous" || Boolean(initialValues?.isAnonymous));
  }, [availableKinds, defaultKind, forceAnonymous, initialValues]);

  useEffect(() => {
    setDiscussionKind((current) => {
      if (availableKinds.includes(current)) {
        return current;
      }

      if (initialValues?.discussionKind && availableKinds.includes(initialValues.discussionKind)) {
        return initialValues.discussionKind;
      }

      return availableKinds.includes(defaultKind) ? defaultKind : availableKinds[0] || defaultKind;
    });
  }, [availableKinds, defaultKind, initialValues?.discussionKind]);

  useEffect(() => {
    if (forceAnonymous || discussionKind === "anonymous") {
      setIsAnonymous(true);
    }
  }, [discussionKind, forceAnonymous]);

  useEffect(() => {
    return () => {
      imagePreviews.forEach((preview) => URL.revokeObjectURL(preview.url));
    };
  }, [imagePreviews]);

  const resetComposer = () => {
    setDraftTitle("");
    setContent("");
    setTags("");
    setImageFiles([]);
    setRetainedImageUrls([]);
    setPdfFile(null);
    setRetainedPdf(null);
    setLinkUrl("");
    setPostType("standard");
    setPollQuestion("");
    setPollOptions(createEmptyPollOptions());
    setIsAnonymous(forceAnonymous || defaultKind === "anonymous");
    setDiscussionKind(defaultKind);
  };

  const handleImageSelection = (files: FileList | null) => {
    if (!files) {
      return;
    }

    const selected = Array.from(files);
    const remainingSlots = Math.max(0, limits.max_images_per_post - retainedImageUrls.length);

    if (imageFiles.length + selected.length > remainingSlots) {
      toast.error(`You can only attach ${limits.max_images_per_post} images.`);
    }

    setImageFiles((current) => [...current, ...selected].slice(0, remainingSlots));
  };

  const handlePdfSelection = (file: File | null) => {
    if (!file) {
      setPdfFile(null);
      return;
    }

    if (file.size > limits.max_pdf_size_mb * 1024 * 1024) {
      setPdfFile(null);
      toast.error(`PDF uploads must stay within ${limits.max_pdf_size_mb} MB.`);
      return;
    }

    setRetainedPdf(null);
    setPdfFile(file);
  };

  const removeImage = (targetId: string) => {
    setImageFiles((current) =>
      current.filter((file) => `${file.name}-${file.size}-${file.lastModified}` !== targetId)
    );
  };

  const removeRetainedImage = (targetUrl: string) => {
    setRetainedImageUrls((current) => current.filter((url) => url !== targetUrl));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (disabledReason) {
      return;
    }

    const normalizedTitle = draftTitle.trim();
    const normalizedContent = content.trim();
    const normalizedPollQuestion = pollQuestion.trim();

    const meaningfulDraft = Boolean(
      normalizedTitle ||
        normalizedContent ||
        retainedImageUrls.length ||
        imageFiles.length ||
        retainedPdf ||
        pdfFile ||
        linkUrl.trim() ||
        normalizedPollQuestion
    );

    if (!meaningfulDraft) {
      toast.error("Add text, media, a link, or a poll before publishing.");
      return;
    }

    if (postType === "poll" && pollOptions.filter((option) => option.trim()).length < 2) {
      toast.error("Add at least two poll options.");
      return;
    }

    setSubmitting(true);

    try {
      const pdfPageCount = pdfFile ? await getPdfPageCountFromFile(pdfFile) : null;

      await onSubmit({
        title: normalizedTitle,
        content: normalizedContent,
        tags: normalizedTags,
        discussionKind,
        imageFiles,
        retainedImageUrls,
        pdfFile,
        pdfPageCount,
        retainExistingPdf: Boolean(retainedPdf) && !pdfFile,
        linkUrl: linkUrl.trim(),
        postType,
        pollQuestion: normalizedPollQuestion,
        pollOptions: pollOptions.map((option) => option.trim()).filter(Boolean),
        isAnonymous: forceAnonymous || isAnonymous || discussionKind === "anonymous",
      });

      if (!initialValues) {
        resetComposer();
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not publish your post.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form
      id={id}
      onSubmit={handleSubmit}
      className="surface-card scroll-mt-24 space-y-3.5 rounded-[22px] p-3.5 sm:space-y-4 sm:rounded-[24px] sm:p-4.5"
    >
      <div className="space-y-1">
        <p className="font-display text-xl font-semibold leading-tight sm:text-[1.35rem]">{title}</p>
        <p className="text-xs uppercase tracking-[0.18em] text-app-muted">{description}</p>
      </div>

      {disabledReason ? (
        <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 px-3.5 py-3 text-sm text-amber-700 dark:text-amber-300">
          {disabledReason}
        </div>
      ) : null}

      <div className="flex flex-wrap gap-1.5">
        {availableKinds.map((kind) => (
          <button
            key={kind}
            type="button"
            onClick={() => {
              const leavingAnonymous = discussionKind === "anonymous" && kind !== "anonymous";
              setDiscussionKind(kind);
              if (kind === "anonymous") {
                setIsAnonymous(true);
              } else if (leavingAnonymous) {
                setIsAnonymous(false);
              }
            }}
            className={`rounded-full px-3 py-1.5 text-sm font-semibold capitalize transition ${
              discussionKind === kind
                ? "bg-brand text-white"
                : "bg-app-secondary text-app-muted hover:text-app-text"
            }`}
          >
            {getDiscussionKindLabel(kind)}
          </button>
        ))}
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <label className="grid gap-1.5">
          <span className="text-xs font-semibold uppercase tracking-[0.16em] text-app-muted">Title</span>
          <input
            value={draftTitle}
            onChange={(event) => setDraftTitle(clampPostTitleInput(event.target.value))}
            className="input-shell h-11 text-sm"
            placeholder="Optional headline"
            maxLength={POST_TITLE_MAX_LENGTH}
          />
          <p className="text-[11px] text-app-muted">{draftTitle.length}/{POST_TITLE_MAX_LENGTH}</p>
        </label>

        <label className="grid gap-1.5">
          <span className="text-xs font-semibold uppercase tracking-[0.16em] text-app-muted">Tags</span>
          <input
            value={tags}
            onChange={(event) => setTags(event.target.value)}
            className="input-shell h-11 text-sm"
            placeholder="exam prep, internships"
            maxLength={POST_TAG_INPUT_MAX_LENGTH}
          />
          <p className="text-[11px] text-app-muted">Up to {POST_TAG_MAX_COUNT} tags</p>
        </label>
      </div>

      <label className="grid gap-1.5">
        <span className="text-xs font-semibold uppercase tracking-[0.16em] text-app-muted">Write your post</span>
        <textarea
          value={content}
          onChange={(event) => setContent(clampPostContentInput(event.target.value))}
          className="input-shell min-h-[120px] resize-y text-sm sm:min-h-[144px]"
          placeholder="Share the update, idea, or question..."
          maxLength={POST_CONTENT_MAX_LENGTH}
        />
        <p className="text-[11px] text-app-muted">{content.length}/{POST_CONTENT_MAX_LENGTH}</p>
      </label>

      <label className="grid gap-1.5">
        <span className="text-xs font-semibold uppercase tracking-[0.16em] text-app-muted">Link</span>
        <div className="relative">
          <Link2 className="pointer-events-none absolute left-3.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-app-muted" />
          <input
            value={linkUrl}
            onChange={(event) => setLinkUrl(event.target.value)}
            className="input-shell h-11 w-full pl-10 text-sm"
            placeholder="https://example.com"
          />
        </div>
      </label>

      {postType === "poll" ? (
        <div className="space-y-3 rounded-[22px] border border-app-border bg-app-secondary/60 p-3.5">
          <label className="grid gap-1.5">
            <span className="text-xs font-semibold uppercase tracking-[0.16em] text-app-muted">Poll question</span>
              <input
                value={pollQuestion}
                onChange={(event) => setPollQuestion(event.target.value)}
                className="input-shell h-11 text-sm"
                placeholder="What should we discuss next?"
                maxLength={160}
              />
          </label>

          <div className="space-y-2.5">
            {pollOptions.map((option, index) => (
              <label key={index} className="grid gap-1.5">
                <span className="text-xs font-semibold uppercase tracking-[0.16em] text-app-muted">Option {index + 1}</span>
                <div className="flex gap-2">
                  <input
                    value={option}
                    disabled={disablePollOptionEditing}
                    onChange={(event) =>
                      setPollOptions((current) =>
                        current.map((entry, entryIndex) => (entryIndex === index ? event.target.value : entry))
                      )
                    }
                    className="input-shell h-11 flex-1 text-sm"
                    placeholder={`Option ${index + 1}`}
                    maxLength={80}
                  />
                  {pollOptions.length > 2 && !disablePollOptionEditing ? (
                    <button
                      type="button"
                      onClick={() =>
                        setPollOptions((current) => current.filter((_, optionIndex) => optionIndex !== index))
                      }
                      className="rounded-2xl bg-rose-500/10 px-3 py-2 text-rose-500"
                      aria-label={`Remove option ${index + 1}`}
                    >
                      <X className="h-4 w-4" />
                    </button>
                  ) : null}
                </div>
              </label>
            ))}
          </div>

          {pollOptions.length < 6 && !disablePollOptionEditing ? (
            <button
              type="button"
              onClick={() => setPollOptions((current) => [...current, ""])}
              className="inline-flex items-center gap-1.5 rounded-full bg-app-card px-3.5 py-2 text-sm font-semibold text-app-text"
            >
              <Plus className="h-3.5 w-3.5" />
              Add option
            </button>
          ) : null}

          {disablePollOptionEditing ? (
            <p className="text-xs leading-5 text-app-muted">
              Poll options stay locked after publishing so votes keep their meaning.
            </p>
          ) : null}
        </div>
      ) : (
        <div className="grid gap-3 rounded-[22px] border border-app-border bg-app-secondary/60 p-3.5 lg:grid-cols-2">
          <div className="grid gap-2">
            <span className="text-xs font-semibold uppercase tracking-[0.16em] text-app-muted">
              Images
            </span>
            <label className="flex cursor-pointer items-center gap-2.5 rounded-[20px] border border-app-border bg-app-card px-3.5 py-3 text-sm text-app-muted">
              <ImagePlus className="h-4 w-4 text-brand" />
              <span>
                {retainedImageUrls.length + imageFiles.length > 0
                  ? `${retainedImageUrls.length + imageFiles.length} image${
                      retainedImageUrls.length + imageFiles.length > 1 ? "s" : ""
                    } selected`
                  : `Add images (${limits.max_images_per_post})`}
              </span>
              <input
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(event) => handleImageSelection(event.target.files)}
              />
            </label>

            {retainedImageUrls.length > 0 || imagePreviews.length > 0 ? (
              <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
                {retainedImageUrls.map((url, index) => (
                  <div key={url} className="overflow-hidden rounded-[18px] border border-app-border bg-app-card">
                    <div className="relative aspect-[4/3]">
                      <img src={url} alt={`Attached image ${index + 1}`} className="h-full w-full object-cover" />
                      <button
                        type="button"
                        onClick={() => removeRetainedImage(url)}
                        className="absolute right-2 top-2 rounded-full bg-slate-950/70 p-1.5 text-white"
                        aria-label={`Remove attached image ${index + 1}`}
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                    <p className="truncate px-2.5 py-2 text-[11px] text-app-muted">Current image {index + 1}</p>
                  </div>
                ))}
                {imagePreviews.map((preview) => (
                  <div key={preview.id} className="overflow-hidden rounded-[18px] border border-app-border bg-app-card">
                    <div className="relative aspect-[4/3]">
                      <img
                        src={preview.url}
                        alt={preview.name}
                        className="h-full w-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => removeImage(preview.id)}
                        className="absolute right-2 top-2 rounded-full bg-slate-950/70 p-1.5 text-white"
                        aria-label={`Remove ${preview.name}`}
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                    <p className="truncate px-2.5 py-2 text-[11px] text-app-muted">{preview.name}</p>
                  </div>
                ))}
              </div>
            ) : null}
          </div>

          <div className="grid gap-2">
            <span className="text-xs font-semibold uppercase tracking-[0.16em] text-app-muted">
              PDF
            </span>
            <label className="flex cursor-pointer items-center gap-2.5 rounded-[20px] border border-app-border bg-app-card px-3.5 py-3 text-sm text-app-muted">
              <FileText className="h-4 w-4 text-brand" />
              <span>{pdfFile ? pdfFile.name : retainedPdf?.name || `Add PDF (${limits.max_pdf_size_mb} MB)`}</span>
              <input
                type="file"
                accept="application/pdf,.pdf"
                className="hidden"
                onChange={(event) => handlePdfSelection(event.target.files?.[0] || null)}
              />
            </label>
            {retainedPdf && !pdfFile ? (
              <div className="flex items-center justify-between gap-3 rounded-[20px] border border-app-border bg-app-card px-3.5 py-3 text-sm">
                <div className="min-w-0">
                  <p className="truncate font-medium text-app-text">{retainedPdf.name || "Current PDF"}</p>
                  <p className="text-xs text-app-muted">
                    {retainedPdf.pageCount ? `${retainedPdf.pageCount} pages` : "Attached PDF"}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setRetainedPdf(null)}
                  className="rounded-full bg-rose-500/10 p-2 text-rose-500"
                  aria-label="Remove current PDF"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : null}
            {pdfFile ? (
              <div className="flex items-center justify-between gap-3 rounded-[20px] border border-app-border bg-app-card px-3.5 py-3 text-sm">
                <div className="min-w-0">
                  <p className="truncate font-medium text-app-text">{pdfFile.name}</p>
                  <p className="text-xs text-app-muted">
                    {(pdfFile.size / (1024 * 1024)).toFixed(2)} MB
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setPdfFile(null)}
                  className="rounded-full bg-rose-500/10 p-2 text-rose-500"
                  aria-label="Remove attached PDF"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : null}
          </div>
        </div>
      )}

      <div className="flex flex-col gap-2.5 rounded-[20px] border border-app-border bg-app-secondary/60 p-3 sm:gap-3 sm:rounded-[22px] sm:p-3.5">
        <div className="flex flex-col gap-2.5 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={forceAnonymous || discussionKind === "anonymous"}
              onClick={() => setIsAnonymous((current) => !current)}
              className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1.5 text-[13px] font-semibold transition sm:gap-2 sm:px-3 sm:py-2 sm:text-sm ${
                forceAnonymous || discussionKind === "anonymous" || isAnonymous
                  ? "border-brand bg-brand/10 text-brand"
                  : "border-app-border bg-app-card text-app-text"
              } ${forceAnonymous || discussionKind === "anonymous" ? "cursor-not-allowed opacity-70" : ""}`}
            >
              <span
                className={`flex h-4 w-4 items-center justify-center rounded-[5px] border sm:h-4.5 sm:w-4.5 ${
                  forceAnonymous || discussionKind === "anonymous" || isAnonymous
                    ? "border-brand bg-brand text-white"
                    : "border-app-border bg-transparent text-transparent"
                }`}
              >
                <Check className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
              </span>
              <Lock className="h-3.5 w-3.5" />
              Anonymous
            </button>
            <button
              type="button"
              disabled={disablePostTypeSwitch}
              onClick={() => {
                const nextIsPoll = postType !== "poll";
                setPostType(nextIsPoll ? "poll" : "standard");
                if (nextIsPoll) {
                  setImageFiles([]);
                  setRetainedImageUrls([]);
                  setPdfFile(null);
                  setRetainedPdf(null);
                }
              }}
              className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1.5 text-[13px] font-semibold transition sm:gap-2 sm:px-3 sm:py-2 sm:text-sm ${
                postType === "poll"
                  ? "border-brand bg-brand/10 text-brand"
                  : "border-app-border bg-app-card text-app-text"
              } ${disablePostTypeSwitch ? "cursor-not-allowed opacity-60" : ""}`}
            >
              <span
                className={`flex h-4 w-4 items-center justify-center rounded-[5px] border sm:h-4.5 sm:w-4.5 ${
                  postType === "poll"
                    ? "border-brand bg-brand text-white"
                    : "border-app-border bg-transparent text-transparent"
                }`}
              >
                <Check className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
              </span>
              <Vote className="h-3.5 w-3.5" />
              Poll
            </button>
          </div>
        </div>

        <div
          className={
            submitHint
              ? "grid grid-cols-[minmax(0,1fr)_minmax(126px,1fr)] gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(148px,1.12fr)] sm:gap-2.5"
              : ""
          }
        >
          {submitHint ? (
            <div className="inline-flex min-w-0 items-center gap-2 rounded-[18px] border border-brand/15 bg-[linear-gradient(135deg,rgba(37,99,235,0.14),rgba(59,130,246,0.06))] px-2.5 py-1.5 text-brand shadow-[0_18px_30px_-24px_rgba(37,99,235,0.55)] sm:gap-2.5 sm:rounded-[20px] sm:px-3.5 sm:py-2.5">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[11px] bg-white/85 text-brand shadow-[0_10px_18px_-14px_rgba(37,99,235,0.7)] sm:h-9 sm:w-9 sm:rounded-[14px]">
                <Coins className="h-3 w-3 sm:h-4 sm:w-4" />
              </div>
              <div className="min-w-0">
                <p className="text-[8px] font-semibold uppercase tracking-[0.18em] text-brand/70 sm:text-[10px] sm:tracking-[0.2em]">
                  Action Cost
                </p>
                <p className="truncate text-[13px] font-semibold leading-tight text-brand sm:text-sm">{submitHint}</p>
              </div>
            </div>
          ) : null}

          <button
            type="submit"
            disabled={submitting || Boolean(disabledReason)}
            className="inline-flex w-full items-center justify-center whitespace-nowrap rounded-full bg-gradient-to-r from-brand via-brand to-brand-dark px-3.5 py-2 text-[13px] font-semibold text-white shadow-[0_14px_32px_-18px_rgba(47,94,255,0.9)] transition hover:-translate-y-0.5 hover:shadow-[0_18px_36px_-18px_rgba(47,94,255,1)] disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0 sm:min-w-[144px] sm:px-5 sm:py-3 sm:text-sm"
          >
            {submitting ? submittingLabel : postType === "poll" ? "Publish poll" : submitLabel}
          </button>
        </div>
      </div>
    </form>
  );
}
