"use client";

import {
  CreateNovelBody,
  createNovelSchema,
  MAX_DESCRIPTION_LENGTH,
  MAX_SNIPPET_LENGTH,
  MAX_TITLE_LENGTH,
} from "@/contracts/novels";
import { zodResolver } from "@hookform/resolvers/zod";
import { Stack, TextField } from "@mui/material";
import { useForm } from "react-hook-form";

type Props = {
  existingId?: string;
  defaultData: CreateNovelBody;
  onSubmit: (data: CreateNovelBody) => void;
};

export function NovelForm({ existingId, defaultData, onSubmit }: Props) {
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
        <TextField
          {...register("title")}
          label="Title"
          error={!!errors.title}
          helperText={errors.title?.message}
          slotProps={{ htmlInput: { maxLength: MAX_TITLE_LENGTH } }}
        />
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
        <TextField
          {...register("coverImage")}
          label="Cover Image URL"
          error={!!errors.coverImage}
          helperText={errors.coverImage?.message}
        />
      </Stack>
    </form>
  );
}
