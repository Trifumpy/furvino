"use client";

import { AuthorGuardClient } from "@/users/providers";
import { Stack, Typography } from "@mui/material";

export default function Page() {
  return (
    <AuthorGuardClient>
      <Stack gap={2}>
        <Typography variant="body1">Itch.io import is managed by admins.</Typography>
      </Stack>
    </AuthorGuardClient>
  );
}


