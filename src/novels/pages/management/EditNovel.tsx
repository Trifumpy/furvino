"use client";

import { CreateNovelBody } from "@/contracts/novels";
import { useUpdateNovel } from "@/novels/hooks";
import { useRouter } from "next/navigation";
import { startTransition, useMemo } from "react";
import { useNovel } from "@/novels/providers";
import { NovelForm } from "./components";

export function EditNovelPage() {
  const { novel } = useNovel();
  const novelWithDefaults = useMemo(() => {
    if (!novel) return null;

    return {
      id: novel.id,
      title: novel.title || "",
      authorId: novel.author.id || "",
      description: novel.description || "",
      coverImage: novel.thumbnailUrl || undefined,
      externalUrls: novel.externalUrls || {},
      magnetUrls: novel.magnetUrls || {},
      tags: novel.tags || [],
    };
  }, [novel]);

  if (!novelWithDefaults) {
    return;
  }

  return <EditFormInternal novel={novelWithDefaults} />;
}

function EditFormInternal({
  novel,
}: {
  novel: CreateNovelBody & { id: string };
}) {
  const { updateNovel } = useUpdateNovel(novel.id);
  const router = useRouter();

  return (
    <NovelForm
      existingId={novel.id}
      defaultData={novel}
      onSubmit={async (data) => {
        await updateNovel(data);
        startTransition(() => {
          router.refresh();
        });
      }}
    />
  );
}
