"use client";

import { Button, Stack, TextField, Typography } from "@mui/material";
import { Controller, useForm } from "react-hook-form";
import { useMemo, useState } from "react";
import { useUser } from "@/users/providers";
import { AuthorInputById } from "./AuthorInput";
import { useGetNovelsByAuthor, useNovelsService } from "@/novels/providers";
import { Selector, SelectorOption } from "@/generic/input";
import { toast } from "react-toastify";

type FormValues = {
  authorId: string;
  novelId: string;
  itchUrl: string;
};

type Props = {
  fixedAuthorId?: string;
};

export function ImportFromItchForm({ fixedAuthorId }: Props) {
  useUser();
  const { control, handleSubmit, setValue, watch, formState: { errors } } = useForm<FormValues>({
    defaultValues: {
      authorId: fixedAuthorId ?? "",
      novelId: "",
      itchUrl: "",
    },
  });

  const authorId = watch("authorId");
  const { novels, loading } = useGetNovelsByAuthor(authorId);
  const novelOptions: SelectorOption<{ id: string; title: string }>[] = useMemo(() => {
    return novels.map((n) => ({ label: n.title, value: { id: n.id, title: n.title } }));
  }, [novels]);

  const service = useNovelsService();
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (values: FormValues) => {
    try {
      setSubmitting(true);
      if (fixedAuthorId) {
        await service.createFromItch(values.itchUrl);
        toast.success("Created and imported from Itch.io");
      } else {
        await service.importFromItch(values.novelId, values.itchUrl);
        toast.success("Imported from Itch.io");
      }
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
        {!fixedAuthorId && (
          <Controller
            name="authorId"
            control={control}
            rules={{ required: "Author is required" }}
            render={({ field }) => (
              <AuthorInputById
                value={field.value}
                onChange={(v) => {
                  field.onChange(v);
                  setValue("novelId", "");
                }}
                error={errors.authorId?.message}
              />
            )}
          />
        )}
        {!fixedAuthorId && (
          <Controller
            name="novelId"
            control={control}
            rules={{ required: "Novel is required" }}
            render={({ field }) => (
              <Selector<{ id: string; title: string }>
                label={loading ? "Loading novels..." : "Select Novel"}
                options={novelOptions}
                multiple={false}
                value={novelOptions.find((o) => o.value.id === field.value)?.value ?? null}
                onChange={(v) => field.onChange(v?.id ?? "")}
                error={errors.novelId?.message}
              />
            )}
          />
        )}
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


