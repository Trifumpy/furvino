"use client";

import { CreateNovelBody } from "@/contracts/novels";
import { useCreateNovel } from "@/novels/hooks";
import { useRouter } from "next/navigation";
import { NovelForm } from "./components";
import { Stack, Typography } from "@mui/material";

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
  const router = useRouter();

  return (
    <Stack gap={2}>
      <Typography align="center" variant="h3">
        Create Novel
      </Typography>
      <NovelForm
        defaultData={DEFAULT_NOVEL}
        action="Create Novel"
        loading={isCreating}
        onSubmit={async (data) => {
          const novel = await createNovel(data);
          router.push(`/novels/${novel.id}`);
        }}
      />
    </Stack>
  );
}
