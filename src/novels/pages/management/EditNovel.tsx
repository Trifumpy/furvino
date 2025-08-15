"use client";

import { CreateNovelBody } from "@/contracts/novels";
import { useUpdateNovel } from "@/novels/hooks";
import { useRouter } from "next/navigation";
import { startTransition, useMemo } from "react";
import { useNovel } from "@/novels/providers";
import { NovelForm } from "./components";
import { pruneEmptyKeys } from "@/utils/lib/collections";

export function EditNovelPage() {
  const { novel } = useNovel();
  const novelWithDefaults = useMemo(() => {
    if (!novel) return null;

    return {
      id: novel.id,
      title: novel.title || "",
      authorId: novel.author.id || "",
      description: novel.description || "",
      thumbnailUrl: novel.thumbnailUrl || undefined,
      externalUrls: pruneEmptyKeys(novel.externalUrls || {}),
      magnetUrls: pruneEmptyKeys(novel.magnetUrls || {}),
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
  const { updateNovel, isUpdating } = useUpdateNovel(novel.id);
  const router = useRouter();

  return (
    <NovelForm
      existingId={novel.id}
      defaultData={novel}
      loading={isUpdating}
      onSubmit={async (data) => {
        await updateNovel(data);
        router.push(`/novels/${novel.id}`);
        startTransition(() => {
          router.refresh();
        });
      }}
    />
  );
}
