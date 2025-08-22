"use client";

import { CreateNovelBody } from "@/contracts/novels";
import { useUpdateNovel } from "@/novels/hooks";
import { useRouter } from "next/navigation";
import { startTransition, useMemo, useState } from "react";
import { useNovel } from "@/novels/providers";
import { NovelDangerZone, NovelForm, NovelGalleryEditor } from "./components";
import { pruneEmptyKeys } from "@/utils/lib/collections";
import { Button, Stack } from "@mui/material";

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
        hideAction
        formId="edit-novel-form"
        onSubmit={async (data) => {
          await updateNovel(data);
          setIsRedirecting(true);
          router.push(`/novels/${novel.id}`);
          startTransition(() => {
            router.refresh();
          });
        }}
      />
      <NovelGalleryEditor />
      <Stack alignItems="center" mt={2}>
        <Button
          form="edit-novel-form"
          type="submit"
          variant="contained"
          disabled={isRedirecting || isUpdating}
          sx={{ py: 1, px: 3 }}
        >
          {isRedirecting ? "Redirecting..." : "Save Changes"}
        </Button>
      </Stack>
      <NovelDangerZone />
    </Stack>
  );
}
