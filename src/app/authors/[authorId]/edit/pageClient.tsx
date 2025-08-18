"use client";

import { Controller, useForm } from "react-hook-form";
import { Button, Stack, TextField, Typography } from "@mui/material";
import { useAuthor, useUser } from "@/users/providers";
import { useMutation } from "@tanstack/react-query";
import { useRegistry } from "@/utils/client";
import { ExternalSitesEditor } from "@/novels/pages/management/components/ExternalSitesEditor";
import { pruneEmptyKeys } from "@/utils/lib/collections";
import { useState } from "react";
import { ExternalSite } from "@/contracts/novels";
import { PublicAuthor } from "@/contracts/users";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
 

type FormValues = Pick<PublicAuthor, 'name' | 'description'> & {
  externalUrls?: Partial<Record<ExternalSite, string>>;
};

export function AuthorEditPage() {
  const { author } = useAuthor();
  const { isAdmin } = useUser();
  const { authors } = useRegistry();
  const router = useRouter();
  

  const [loading, setLoading] = useState(false);

  const { control, handleSubmit, register } = useForm<FormValues>({
    defaultValues: {
      name: author.name,
      description: author.description ?? "",
      externalUrls: pruneEmptyKeys(author.externalUrls || {} as Record<ExternalSite, string>),
    },
  });

  const update = useMutation({
    mutationFn: async (values: FormValues) => {
      const payload: FormValues = {
        name: values.name,
        description: values.description ?? null,
        externalUrls: pruneEmptyKeys(values.externalUrls || {} as Record<ExternalSite, string>),
      };

      if (isAdmin) {
        return authors.updateAuthor(author.id, payload);
      }
      return authors.updateMe(payload);
    },
    onSuccess: () => {
      toast.success("Author updated");
      router.push(`/authors/${author.id}`);
    },
    onError: (err: unknown) => {
      toast.error("Failed to update author");
      console.error(err);
    },
  });

  const onSubmit = handleSubmit(async (values) => {
    setLoading(true);
    try {
      await update.mutateAsync(values);
    } finally {
      setLoading(false);
    }
  });

  return (
    <form onSubmit={onSubmit}>
      <Stack gap={2}>
        <Typography variant="h4">Edit Author</Typography>
        <TextField label="Name" {...register("name")} />
        <TextField label="Description" multiline minRows={3} {...register("description")} />
        <Controller
          name="externalUrls"
          control={control}
          render={({ field }) => (
            <ExternalSitesEditor value={field.value} onChange={field.onChange} />
          )}
        />
        
        <Button type="submit" variant="contained" disabled={loading || update.isPending}>
          Save
        </Button>
      </Stack>
    </form>
  );
}


