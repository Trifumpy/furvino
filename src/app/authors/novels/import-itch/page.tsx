"use client";

import { AuthorGuardClient } from "@/users/providers";
import { Stack } from "@mui/material";
import { ImportFromItchForm } from "@/novels/pages/management/components";

export default function Page() {
  return (
    <AuthorGuardClient>
      <Stack gap={2}>
        <ImportFromItchForm />
      </Stack>
    </AuthorGuardClient>
  );
}


