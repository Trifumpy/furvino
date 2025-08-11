"use client";

import {
  CreateNovelBody,
  createNovelSchema,
  ExternalSite,
  MAX_DESCRIPTION_LENGTH,
  MAX_SNIPPET_LENGTH,
  MAX_TITLE_LENGTH,
  Platform,
} from "@/contracts/novels";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button, Stack, TextField } from "@mui/material";
import { Controller, useForm } from "react-hook-form";
import { ExternalSitesEditor } from "./ExternalSitesEditor";
import { FileOrUrlInput } from "@/generic/input";
import { DownloadsEditor } from "./DownloadsEditor";
import { AuthorInputById } from "./AuthorInput";
import { TagsInput } from "./TagsInput";

type Props = {
  existingId?: string;
  defaultData: CreateNovelBody;
  onSubmit: (data: CreateNovelBody) => Promise<void>;
  loading?: boolean;
  action?: string;
};

export function NovelForm({
  existingId,
  defaultData,
  onSubmit,
  loading,
  action = "Save",
}: Props) {
  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<CreateNovelBody>({
    resolver: zodResolver(createNovelSchema),
    values: defaultData,
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <Stack gap={1}>
        {existingId && (
          <TextField value={existingId} disabled={true} label="Novel ID" />
        )}
        <Stack direction={{ xs: "column", md: "row" }} gap={1}>
          <TextField
            {...register("title")}
            label="Title"
            error={!!errors.title}
            helperText={errors.title?.message}
            slotProps={{ htmlInput: { maxLength: MAX_TITLE_LENGTH } }}
            sx={{ flexGrow: 1 }}
          />
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
        </Stack>
        <TextField
          {...register("snippet")}
          label="Snippet"
          multiline
          rows={3}
          error={!!errors.authorId}
          helperText={errors.authorId?.message}
          slotProps={{ htmlInput: { maxLength: MAX_SNIPPET_LENGTH } }}
        />
        <TextField
          {...register("description")}
          label="Description"
          multiline
          rows={5}
          error={!!errors.description}
          helperText={errors.description?.message}
          slotProps={{ htmlInput: { maxLength: MAX_DESCRIPTION_LENGTH } }}
        />
        <Controller
          name="thumbnailUrl"
          control={control}
          render={({ field }) => (
            <FileOrUrlInput
              label="Cover Image"
              value={field.value ?? ""}
              onChange={field.onChange}
              error={errors.thumbnailUrl?.message}
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
              errors={
                errors.externalUrls as Record<ExternalSite, string> | undefined
              }
            />
          )}
        />
        <Controller
          name="magnetUrls"
          control={control}
          render={({ field }) => (
            <DownloadsEditor
              value={field.value}
              onChange={field.onChange}
              errors={errors.magnetUrls as Record<Platform, string> | undefined}
            />
          )}
        />
        <Button
          type="submit"
          loading={loading}
          variant="contained"
          sx={{ alignSelf: "center" }}
        >
          {action}
        </Button>
      </Stack>
    </form>
  );
}
