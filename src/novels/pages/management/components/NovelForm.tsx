"use client";

import {
  CreateNovelBody,
  createNovelSchema,
  MAX_DESCRIPTION_LENGTH,
  MAX_SNIPPET_LENGTH,
  MAX_THUMBNAIL_FILE_SIZE,
  MAX_TITLE_LENGTH,
} from "@/contracts/novels";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button, IconButton, Stack, TextField } from "@mui/material";
import { Controller, useForm } from "react-hook-form";
import { ExternalSitesEditor } from "./ExternalSitesEditor";
import { ImageInput } from "@/generic/input";
import { DownloadsEditor } from "./DownloadsEditor";
import { AuthorInputById } from "./AuthorInput";
import { TagsInput } from "./TagsInput";
import { useEffect } from "react";
import { fieldValidationToRecord } from "@/utils/lib/validation";
import { ClipboardCopyIcon } from "lucide-react";
import { toast } from "react-toastify";
import { useUpdateNovelThumbnail } from "@/novels/hooks";
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

  const textTitle = watch("title");
  const textDescription = watch("description");
  const textSnippet = watch("snippet");

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <Stack gap={1}>
        {!minimal && existingId && (
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
            <TextField
              {...register("description")}
              label="Description"
              multiline
              rows={5}
              error={!!errors.description}
              helperText={errors.description?.message}
              slotProps={{
                htmlInput: { maxLength: MAX_DESCRIPTION_LENGTH },
                input: {
                  endAdornment: (
                    <TextLengthCounterAdornment
                      value={textDescription ?? ""}
                      maxLength={MAX_DESCRIPTION_LENGTH}
                    />
                  ),
                },
              }}
            />
            <Controller
              name="tags"
              control={control}
              render={({ field }) => (
                <TagsInput
                  value={field.value ?? []}
                  onChange={field.onChange}
                  error={errors.tags?.message}
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
                name="magnetUrls"
                control={control}
                render={({ field }) => (
                  <DownloadsEditor
                    value={field.value}
                    onChange={field.onChange}
                    errors={fieldValidationToRecord(errors.magnetUrls)}
                    novelId={existingId}
                  />
                )}
              />
            )}
          </>
        )}
        <Button
          type="submit"
          loading={loading}
          disabled={disabled}
          variant="contained"
          sx={{ alignSelf: "center", py: 1, px: 3, my: 2 }}
        >
          {action}
        </Button>
      </Stack>
    </form>
  );
}
