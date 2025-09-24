"use client";

import {
  CreateNovelBody,
  createNovelSchema,
  MAX_SNIPPET_LENGTH,
  MAX_THUMBNAIL_FILE_SIZE,
  MAX_TITLE_LENGTH,
} from "@/contracts/novels";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button, IconButton, Stack, TextField, Typography } from "@mui/material";
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
    resolver: zodResolver(createNovelSchema),
    values: defaultData,
  });

  useEffect(() => {
    if (fixedAuthorId) {
      setValue("authorId", fixedAuthorId);
    }
  }, [fixedAuthorId, setValue]);

  const { updateThumbnail, isUpdating: isUploadingThumbnail } =
    useUpdateNovelThumbnail();

  const { updateBanner, isUpdating: isUploadingBanner } =
    useUpdateNovelBanner();

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
  const descriptionRich = watch("descriptionRich");
  const textSnippet = watch("snippet");

  return (
    <form onSubmit={handleSubmit(onSubmit)} id={formId}>
      <Stack gap={1}>
        {!minimal && existingId && (
          <Stack direction={{ xs: "column", md: "row" }} gap={1}>
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
