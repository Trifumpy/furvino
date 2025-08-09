"use client";

import { CreateNovelBody } from "@/contracts/novels";
import { useCreateNovel } from "@/novels/hooks";
import { useRouter } from "next/navigation";
import { startTransition } from "react";
import { NovelForm } from "./components";

const DEFAULT_NOVEL: CreateNovelBody = {
  title: "",
  authorId: "",
  description: "",
  coverImage: undefined,
  externalUrls: {},
  magnetUrls: {},
  tags: [],
};

export function CreateNovelPage() {
  const { createNovel } = useCreateNovel();
  const router = useRouter();

  return (
    <NovelForm
      defaultData={DEFAULT_NOVEL}
      onSubmit={async (data) => {
        await createNovel(data);
        startTransition(() => {
          router.refresh();
        });
      }}
    />
  );
}
