"use client";

import { AuthorGuardClient, useUser } from "@/users/providers";
import { ImportFromItchForm } from "@/novels/pages/management/components";
import { Stack } from "@mui/material";

export default function Page() {
  const { user } = useUser();
  const authorId = user?.authorId;
  return (
    <AuthorGuardClient>
      <Stack gap={2}>
        <ImportFromItchForm fixedAuthorId={authorId ?? undefined} />
      </Stack>
    </AuthorGuardClient>
  );
}


