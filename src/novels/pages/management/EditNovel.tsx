"use client";

import { CreateNovelBody } from "@/contracts/novels";
import { useUpdateNovel } from "@/novels/hooks";
import { useRouter } from "next/navigation";
import { startTransition, useMemo, useState } from "react";
import { useNovel } from "@/novels/providers";
import { NovelDangerZone, NovelForm, NovelGalleryEditor } from "./components";
import { pruneEmptyKeys } from "@/utils/lib/collections";
import { Button, Stack, TextField } from "@mui/material";
import { toast } from "react-toastify";

export function EditNovelPage() {
  const { novel } = useNovel();
  const novelWithDefaults = useMemo(() => {
    if (!novel) return null;

    return {
      id: novel.id,
      title: novel.title || "",
      authorId: novel.author.id || "",
      snippet: novel.snippet || "",
      descriptionRich: (novel as unknown as { descriptionRich?: unknown | null }).descriptionRich || ({ type: "doc", content: [{ type: "paragraph" }] } as unknown),
      thumbnailUrl: novel.thumbnailUrl || undefined,
      pageBackgroundUrl: (novel as unknown as { pageBackgroundUrl?: string | null }).pageBackgroundUrl || undefined,
      foregroundColorHex: (novel as unknown as { foregroundColorHex?: string | null }).foregroundColorHex || undefined,
      foregroundOpacityPercent: (novel as unknown as { foregroundOpacityPercent?: number | null }).foregroundOpacityPercent ?? 80,
      foregroundBlurPercent: (novel as unknown as { foregroundBlurPercent?: number | null }).foregroundBlurPercent ?? 20,
      foregroundTextColorHex: (novel as unknown as { foregroundTextColorHex?: string | null }).foregroundTextColorHex || undefined,
      buttonBgColorHex: (novel as unknown as { buttonBgColorHex?: string | null }).buttonBgColorHex || undefined,
      externalUrls: pruneEmptyKeys(novel.externalUrls || {}),
      downloadUrls: pruneEmptyKeys(novel.downloadUrls || {}),
      tags: novel.tags || [],
      indexingTags: (novel as unknown as { indexingTags?: string[] | null }).indexingTags || [],
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

  const [itchUrl, setItchUrl] = useState("");
  const [importing, setImporting] = useState(false);

  const handleImport = async () => {
    if (!itchUrl) return;
    try {
      setImporting(true);
      const res = await fetch(`/api/novels/${novel.id}/import/itch`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: itchUrl }),
      });
      if (!res.ok) {
        const txt = await res.text();
        toast.error(txt || `Import failed (HTTP ${res.status})`);
        return;
      }
      toast.success("Imported from Itch.io");
      // Refresh the page data to show imported fields
      startTransition(() => {
        router.refresh();
      });
      setItchUrl("");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setImporting(false);
    }
  };

  return (
    <Stack>
      <Stack direction={{ xs: "column", md: "row" }} gap={1} alignItems={{ xs: "stretch", md: "center" }} sx={{ mb: 2 }}>
        <TextField
          value={itchUrl}
          onChange={(e) => setItchUrl(e.target.value)}
          label="Itch.io project URL"
          placeholder="https://<user>.itch.io/<project>"
          sx={{ flexGrow: 1 }}
        />
        <Button variant="outlined" disabled={!itchUrl || importing} onClick={handleImport}>
          {importing ? "Importing..." : "Import from Itch.io"}
        </Button>
      </Stack>
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
