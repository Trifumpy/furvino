"use client";

import { CreateNovelBody } from "@/contracts/novels";
import { useUpdateNovel } from "@/novels/hooks";
import { useRouter } from "next/navigation";
import { startTransition, useMemo, useState } from "react";
import { useNovel } from "@/novels/providers";
import { NovelDangerZone, NovelForm } from "./components";
import { pruneEmptyKeys } from "@/utils/lib/collections";
import { Stack } from "@mui/material";

export function EditNovelPage() {
  const { novel } = useNovel();
  const novelWithDefaults = useMemo(() => {
    if (!novel) return null;

    return {
      id: novel.id,
      title: novel.title || "",
      authorId: novel.author.id || "",
      snippet: novel.snippet || "",
      description: novel.description || "",
      thumbnailUrl: novel.thumbnailUrl || undefined,
      externalUrls: pruneEmptyKeys(novel.externalUrls || {}),
      downloadUrls: pruneEmptyKeys(novel.downloadUrls || {}),
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
  const [isRedirecting, setIsRedirecting] = useState(false);
  const router = useRouter();

  return (
    <Stack>
      <NovelForm
        existingId={novel.id}
        defaultData={novel}
        loading={isUpdating}
        disabled={isRedirecting}
        action={isRedirecting ? "Redirecting..." : "Save Changes"}
        onSubmit={async (data) => {
          await updateNovel(data);
          setIsRedirecting(true);
          router.push(`/novels/${novel.id}`);
          startTransition(() => {
            router.refresh();
          });
        }}
      />
      <NovelDangerZone />
    </Stack>
  );
}
