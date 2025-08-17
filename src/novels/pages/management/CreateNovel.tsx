"use client";

import { CreateNovelBody } from "@/contracts/novels";
import { useCreateNovel } from "@/novels/hooks";
import { useRouter } from "next/navigation";
import { NovelForm } from "./components";
import { Stack, Typography } from "@mui/material";
import { useState } from "react";

const DEFAULT_NOVEL: CreateNovelBody = {
  title: "",
  authorId: "",
  description: "",
  thumbnailUrl: "",
  externalUrls: {},
  magnetUrls: {},
  tags: [],
};

export function CreateNovelPage() {
  const { createNovel, isCreating } = useCreateNovel();
  const [isRedirecting, setIsRedirecting] = useState(false);
  const router = useRouter();

  return (
    <Stack gap={2}>
      <Typography align="center" variant="h3">
        Create Novel
      </Typography>
      <NovelForm
        defaultData={DEFAULT_NOVEL}
        action={isRedirecting ? "Redirecting..." : "Create Novel"}
        loading={isCreating}
        disabled={isRedirecting}
        onSubmit={async (data) => {
          const novel = await createNovel(data);
          setIsRedirecting(true);
          router.push(`/novels/${novel.id}/edit`);
        }}
      />
    </Stack>
  );
}
