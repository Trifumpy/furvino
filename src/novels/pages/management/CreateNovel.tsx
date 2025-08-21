"use client";

import { CreateNovelBody } from "@/contracts/novels";
import { useCreateNovel } from "@/novels/hooks";
import { useRouter } from "next/navigation";
import { NovelForm } from "./components";
import { Stack, Typography } from "@mui/material";
import { useMemo, useState } from "react";
import { useUser } from "@/users/providers";

const DEFAULT_NOVEL: CreateNovelBody = {
  title: "",
  authorId: "",
  description: "",
  thumbnailUrl: "",
  externalUrls: {},
  downloadUrls: {},
  tags: [],
};

export function CreateNovelPage() {
  const { createNovel, isCreating } = useCreateNovel();
  const [isRedirecting, setIsRedirecting] = useState(false);
  const router = useRouter();
  const { user, isAdmin } = useUser();
  const fixedAuthorId = useMemo(
    () => (!isAdmin ? (user?.authorId ?? "") : undefined),
    [isAdmin, user]
  );

  return (
    <Stack gap={2}>
      <Typography align="center" variant="h3">
        Create Novel
      </Typography>
      <NovelForm
        fixedAuthorId={fixedAuthorId}
        defaultData={{ ...DEFAULT_NOVEL, authorId: fixedAuthorId ?? "" }}
        action={isRedirecting ? "Redirecting..." : "Create Novel"}
        loading={isCreating}
        disabled={isRedirecting}
        minimal
        onSubmit={async (data) => {
          const novel = await createNovel(data);
          setIsRedirecting(true);
          router.push(`/novels/${novel.id}/edit`);
        }}
      />
    </Stack>
  );
}
