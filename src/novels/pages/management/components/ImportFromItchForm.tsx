"use client";

import { Button, Stack, TextField, Typography } from "@mui/material";
import { Controller, useForm } from "react-hook-form";
import { useState } from "react";
import { useUser } from "@/users/providers";
import { useNovelsService } from "@/novels/providers/useNovelsService";
import { toast } from "react-toastify";

type FormValues = {
  authorId: string;
  novelId: string;
  itchUrl: string;
};

type Props = { fixedAuthorId?: string };

export function ImportFromItchForm({ fixedAuthorId }: Props) {
  const { user } = useUser();
  const { control, handleSubmit, formState: { errors }, reset } = useForm<FormValues>({
    defaultValues: { authorId: fixedAuthorId ?? "", novelId: "", itchUrl: "" },
  });

  const service = useNovelsService();
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (values: FormValues) => {
    try {
      setSubmitting(true);
      const authorId = fixedAuthorId || user?.authorId || undefined;
      await service.createFromItch(values.itchUrl, { authorId });
      toast.success("Created and imported from Itch.io");
      reset({ authorId: fixedAuthorId ?? "", novelId: "", itchUrl: "" });
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <Stack gap={2}>
        <Typography variant="h5">Import Itch.io metadata</Typography>
        <Controller
          name="itchUrl"
          control={control}
          rules={{ required: "Itch.io URL is required" }}
          render={({ field }) => (
            <TextField {...field} label="Itch.io project URL" error={!!errors.itchUrl} helperText={errors.itchUrl?.message} />
          )}
        />
        <Button type="submit" variant="contained" disabled={submitting}>
          {submitting ? "Importing..." : "Import"}
        </Button>
      </Stack>
    </form>
  );
}


