"use client";

import {
  CreateNovelBody,
  createNovelSchema,
  MAX_SNIPPET_LENGTH,
  MAX_THUMBNAIL_FILE_SIZE,
  MAX_TITLE_LENGTH,
} from "@/contracts/novels";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button, IconButton, Stack, TextField, Typography, LinearProgress, Box } from "@mui/material";
import { Controller, useForm } from "react-hook-form";
import { ExternalSitesEditor } from "./ExternalSitesEditor";
import { ImageInput } from "@/generic/input";
import { DownloadsEditor } from "./DownloadsEditor";
import { AuthorInputById } from "./AuthorInput";
import { TagsInput } from "./TagsInput";
import { RichTextEditor } from "@/generic/input";
import { useEffect } from "react";
import { fieldValidationToRecord } from "@/utils/lib/validation";
import { ClipboardCopyIcon } from "lucide-react";
import { toast } from "react-toastify";
import { useUpdateNovelThumbnail, useUpdateNovelBanner } from "@/novels/hooks";
import { MAX_PAGE_BACKGROUND_FILE_SIZE } from "@/contracts/novels";
import { TextLengthCounterAdornment } from "@/generic/display";
// import { useNovelUpload } from "@/novels/providers";

type Props = {
  existingId?: string;
  fixedAuthorId?: string;
  defaultData: CreateNovelBody;
  onSubmit: (data: CreateNovelBody) => Promise<void>;
  loading?: boolean;
  disabled?: boolean;
  action?: string;
  minimal?: boolean;
  formId?: string;
  hideAction?: boolean;
};

export function NovelForm({
  existingId,
  fixedAuthorId,
  defaultData,
  onSubmit,
  loading,
  disabled,
  action = "Save",
  minimal = false,
  formId = "novel-form",
  hideAction = false,
}: Props) {
  const {
    register,
    setValue,
    watch,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<CreateNovelBody>({
    resolver: zodResolver(createNovelSchema) as never,
    defaultValues: defaultData,
  });

  useEffect(() => {
    if (fixedAuthorId) {
      setValue("authorId", fixedAuthorId);
    }
  }, [fixedAuthorId, setValue]);

  const { updateThumbnail, isUpdating: isUploadingThumbnail, stats: thumbnailStats } =
    useUpdateNovelThumbnail();

  const { updateBanner, isUpdating: isUploadingBanner, stats: bannerStats } =
    useUpdateNovelBanner();

  // Get upload config for direct STACK uploads (if available)
  // const { config: uploadConfig } = useNovelUpload();

  const handleUpload = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Please upload a valid image file.");
      return;
    }
    if (!existingId) return;

    try {
      const novel = await updateThumbnail({
        novelId: existingId,
        thumbnailFile: file,
      });
      setValue("thumbnailUrl", novel.thumbnailUrl ?? undefined);
      toast.success("Thumbnail updated successfully!");
    } catch (error) {
      toast.error((error as Error).message || "Error uploading thumbnail.");
    }
  };

  const handleBannerUpload = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Please upload a valid image file.");
      return;
    }
    if (!existingId) return;

    try {
      const novel = await updateBanner({
        novelId: existingId,
        bannerFile: file,
      });
      setValue("pageBackgroundUrl", (novel as unknown as { pageBackgroundUrl?: string | null }).pageBackgroundUrl ?? undefined);
      toast.success("Page background updated successfully!");
    } catch (error) {
      toast.error((error as Error).message || "Error uploading page background.");
    }
  };

  const textTitle = watch("title");
  // Note: no need to watch descriptionRich here
  const textSnippet = watch("snippet");

  return (
    <form onSubmit={handleSubmit(onSubmit)} id={formId}>
      <Stack gap={1}>
        {!minimal && existingId && (
          <Stack direction={{ xs: "column", md: "row" }} gap={1}>
            <Box sx={{ flex: 1 }}>
              <Controller
                name="thumbnailUrl"
                control={control}
                render={({ field, fieldState }) => (
                  <ImageInput
                    label="Cover Image"
                    valueUrl={field.value}
                    onUpload={handleUpload}
                    maxSize={MAX_THUMBNAIL_FILE_SIZE}
                    loading={isUploadingThumbnail}
                    error={fieldState?.error?.message}
                  />
                )}
              />
              {isUploadingThumbnail && (
                <Typography variant="body2" color="text.secondary">
                  Uploading... {thumbnailStats && `${Math.round((thumbnailStats.uploadedBytes / thumbnailStats.totalBytes) * 100)}% (Concurrency: ${thumbnailStats.concurrency})`}
                </Typography>
              )}
            </Box>
            <Box sx={{ flex: 1 }}>
              <Controller
                name="pageBackgroundUrl"
                control={control}
                render={({ field, fieldState }) => (
                  <ImageInput
                    label="Page background"
                    valueUrl={field.value}
                    onUpload={handleBannerUpload}
                    maxSize={MAX_PAGE_BACKGROUND_FILE_SIZE}
                    loading={isUploadingBanner}
                    error={fieldState?.error?.message}
                  />
                )}
              />
              {isUploadingBanner && (
                <Typography variant="body2" color="text.secondary">
                  Uploading... {bannerStats && `${Math.round((bannerStats.uploadedBytes / bannerStats.totalBytes) * 100)}% (Concurrency: ${bannerStats.concurrency})`}
                </Typography>
              )}
            </Box>
          </Stack>
        )}
        {!minimal && existingId && (
          <Stack direction="row" alignItems="center" gap={1}>
            <TextField
              sx={{ flexGrow: 1 }}
              value={existingId}
              disabled={true}
              label="Novel ID"
            />
            <IconButton
              onClick={() => {
                navigator.clipboard.writeText(existingId);
                toast.success("Novel ID copied to clipboard!");
              }}
              title="Copy Novel ID"
            >
              <ClipboardCopyIcon />
            </IconButton>
          </Stack>
        )}
        <Stack direction={{ xs: "column", md: "row" }} gap={1}>
          <TextField
            {...register("title")}
            label="Title"
            error={!!errors.title}
            helperText={errors.title?.message}
            slotProps={{
              htmlInput: { maxLength: MAX_TITLE_LENGTH },
              input: {
                endAdornment: (
                  <TextLengthCounterAdornment
                    value={textTitle}
                    maxLength={MAX_TITLE_LENGTH}
                  />
                ),
              },
            }}
            sx={{ flexGrow: 1 }}
          />
          {!fixedAuthorId && (
            <Controller
              name="authorId"
              control={control}
              render={({ field }) => (
                <AuthorInputById
                  value={field.value}
                  onChange={field.onChange}
                  error={errors.authorId?.message}
                  disabled={!!existingId}
                  sx={{ minWidth: 320 }}
                />
              )}
            />
          )}
        </Stack>
        {!minimal && (
          <>
            <Stack direction={{ xs: "column", md: "row" }} gap={1} alignItems="center">
              <Controller
                name="foregroundOpacityPercent"
                control={control}
                render={({ field, fieldState }) => (
                  <TextField
                    label="Foreground opacity (%)"
                    type="number"
                    value={field.value ?? 80}
                    onChange={(e) => field.onChange(Number(e.target.value))}
                    inputProps={{ min: 0, max: 100, step: 1 }}
                    error={!!fieldState?.error?.message}
                    helperText={fieldState?.error?.message}
                    sx={{ width: 220 }}
                  />
                )}
              />
              <Controller
                name="foregroundBlurPercent"
                control={control}
                render={({ field, fieldState }) => (
                  <TextField
                    label="Foreground blur (%)"
                    type="number"
                    value={field.value ?? 20}
                    onChange={(e) => field.onChange(Number(e.target.value))}
                    inputProps={{ min: 0, max: 100, step: 1 }}
                    error={!!fieldState?.error?.message}
                    helperText={fieldState?.error?.message}
                    sx={{ width: 220 }}
                  />
                )}
              />
              <Controller
                name="foregroundColorHex"
                control={control}
                render={({ field, fieldState }) => (
                  <Stack direction="row" alignItems="center" gap={1} sx={{ width: 360 }}>
                    <TextField
                      type="color"
                      value={field.value ?? "#121212"}
                      onChange={(e) => field.onChange(e.target.value)}
                      sx={{ width: 56, minWidth: 56 }}
                    />
                    <TextField
                      label="Foreground color (hex)"
                      placeholder="#121212"
                      value={field.value ?? ""}
                      onChange={(e) => field.onChange(e.target.value)}
                      onBlur={(e) => {
                        let v = (e.target.value || "").trim();
                        if (v && !v.startsWith("#")) v = `#${v}`;
                        field.onChange(v);
                      }}
                      inputProps={{ inputMode: "text", pattern: "^#?(?:[0-9a-fA-F]{3}){1,2}$" }}
                      error={!!fieldState?.error?.message}
                      helperText={fieldState?.error?.message}
                      sx={{ width: 200 }}
                    />
                  </Stack>
                )}
              />
              <Controller
                name="foregroundTextColorHex"
                control={control}
                render={({ field, fieldState }) => (
                  <Stack direction="row" alignItems="center" gap={1} sx={{ width: 360 }}>
                    <TextField
                      type="color"
                      value={field.value ?? "#ffffff"}
                      onChange={(e) => field.onChange(e.target.value)}
                      sx={{ width: 56, minWidth: 56 }}
                    />
                    <TextField
                      label="Text color (hex)"
                      placeholder="#ffffff"
                      value={field.value ?? ""}
                      onChange={(e) => field.onChange(e.target.value)}
                      onBlur={(e) => {
                        let v = (e.target.value || "").trim();
                        if (v && !v.startsWith("#")) v = `#${v}`;
                        field.onChange(v);
                      }}
                      inputProps={{ inputMode: "text", pattern: "^#?(?:[0-9a-fA-F]{3}){1,2}$" }}
                      error={!!fieldState?.error?.message}
                      helperText={fieldState?.error?.message}
                      sx={{ width: 200 }}
                    />
                  </Stack>
                )}
              />
              <Controller
                name="buttonBgColorHex"
                control={control}
                render={({ field, fieldState }) => (
                  <Stack direction="row" alignItems="center" gap={1} sx={{ width: 380 }}>
                    <TextField
                      type="color"
                      value={field.value ?? "#121212"}
                      onChange={(e) => field.onChange(e.target.value)}
                      sx={{ width: 56, minWidth: 56 }}
                    />
                    <TextField
                      label="Button foreground color (hex)"
                      placeholder="#121212"
                      value={field.value ?? ""}
                      onChange={(e) => field.onChange(e.target.value)}
                      onBlur={(e) => {
                        let v = (e.target.value || "").trim();
                        if (v && !v.startsWith("#")) v = `#${v}`;
                        field.onChange(v);
                      }}
                      inputProps={{ inputMode: "text", pattern: "^#?(?:[0-9a-fA-F]{3}){1,2}$" }}
                      error={!!fieldState?.error?.message}
                      helperText={fieldState?.error?.message}
                      sx={{ width: 220 }}
                    />
                  </Stack>
                )}
              />
            </Stack>
            <TextField
              {...register("snippet")}
              label="Snippet"
              multiline
              rows={3}
              error={!!errors.authorId}
              helperText={errors.authorId?.message}
              slotProps={{
                htmlInput: { maxLength: MAX_SNIPPET_LENGTH },
                input: {
                  endAdornment: (
                    <TextLengthCounterAdornment
                      value={textSnippet ?? ""}
                      maxLength={MAX_SNIPPET_LENGTH}
                    />
                  ),
                },
              }}
            />
            <Typography variant="subtitle2" color="text.secondary" sx={{ mt: 1 }}>
              Description
            </Typography>
            <Controller
              name="descriptionRich"
              control={control}
              render={({ field }) => (
                <RichTextEditor
                  value={field.value}
                  onChange={(doc) => field.onChange(doc)}
                  placeholder="Rich description (supports basic formatting, headings, lists, links)"
                />
              )}
            />
            <Controller
              name="tags"
              control={control}
              render={({ field }) => (
                <TagsInput
                  value={field.value ?? []}
                  onChange={field.onChange}
                  error={errors.tags?.message}
                  label="Tags visible on browse page, you can add custom tags too"
                />
              )}
            />
            <Controller
              name="indexingTags"
              control={control}
              render={({ field }) => (
                <TagsInput
                  value={field.value ?? []}
                  onChange={field.onChange}
                  error={errors.indexingTags?.message as string | undefined}
                  label="Indexing tags not shown on browse, add things like species. Press enter to confirm tag"
                  noSuggestions
                />
              )}
            />
            <Controller
              name="externalUrls"
              control={control}
              render={({ field }) => (
                <ExternalSitesEditor
                  value={field.value}
                  onChange={field.onChange}
                  errors={fieldValidationToRecord(errors.externalUrls)}
                />
              )}
            />
            {existingId && (
              <Controller
                name="downloadUrls"
                control={control}
                render={({ field }) => (
                  <DownloadsEditor
                    value={field.value}
                    onChange={field.onChange}
                    errors={fieldValidationToRecord(errors.downloadUrls)}
                    novelId={existingId}
                  />
                )}
              />
            )}
          </>
        )}
        {!hideAction && (
          <Button
            type="submit"
            loading={loading}
            disabled={disabled}
            variant="contained"
            sx={{ alignSelf: "center", py: 1, px: 3, my: 2 }}
          >
            {action}
          </Button>
        )}
      </Stack>
    </form>
  );
}
