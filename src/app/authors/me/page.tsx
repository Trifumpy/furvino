"use client";

import { Button, Stack, Typography } from "@mui/material";
import Link from "next/link";
import { PlusIcon, PencilIcon, SquareUserRoundIcon } from "lucide-react";
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
        <Button
          LinkComponent={Link}
          href={authorId ? `/authors/${authorId}` : "#"}
          variant="outlined"
          startIcon={<SquareUserRoundIcon /> }
          disabled={!authorId}
        >
          View My Author Page
        </Button>
        <Button
          LinkComponent={Link}
          href={authorId ? `/authors/${authorId}/edit` : "#"}
          variant="outlined"
          startIcon={<PencilIcon />}
          disabled={!authorId}
        >
          Edit Author
        </Button>
      </Stack>
    </Stack>
  );
}


