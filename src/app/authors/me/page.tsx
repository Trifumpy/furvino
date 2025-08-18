"use client";

import { Button, Stack, Typography } from "@mui/material";
import Link from "next/link";
import { PlusIcon } from "lucide-react";
import { useUser } from "@/users/providers";

export default function MyAuthorPanel() {
  const { user } = useUser();
  const authorId = user?.authorId;
  return (
    <Stack gap={2}>
      <Typography variant="h5">Author menu</Typography>
      <Stack direction="row" gap={2}>
        <Button LinkComponent={Link} href="/authors/novels/new" variant="outlined" startIcon={<PlusIcon /> }>
          Create Novel
        </Button>
      </Stack>
    </Stack>
  );
}


