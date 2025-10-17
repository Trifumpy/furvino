"use client";

import { Button, Stack, Typography } from "@mui/material";
import Link from "next/link";
import { CircleUserRound as CircleUserRoundIcon, PlusIcon } from "lucide-react";
import { useUser } from "@/users/providers";

export default function MyUserMenuPage() {
  const { user } = useUser();
  const hasAuthor = Boolean(user?.authorId);

  return (
    <Stack gap={2}>
      <Stack direction="row" gap={1} alignItems="center">
        <CircleUserRoundIcon />
        <Typography variant="h5">User menu</Typography>
      </Stack>

      <Stack direction="row" gap={2}>
        <Button
          LinkComponent={Link}
          href="/users/become-author"
          variant="outlined"
          startIcon={<PlusIcon />}
          disabled={hasAuthor}
        >
          Become an author
        </Button>
      </Stack>

      {hasAuthor ? (
        <Typography color="text.secondary">
          Your account is already linked to an author profile.
        </Typography>
      ) : (
        <Typography color="text.secondary">
          Create an author profile to publish and manage novels.
        </Typography>
      )}
    </Stack>
  );
}


