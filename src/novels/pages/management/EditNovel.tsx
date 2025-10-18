"use client";

import { CreateNovelBody } from "@/contracts/novels";
import { useDeleteNovel, useUpdateNovel } from "@/novels/hooks";
import { useRouter } from "next/navigation";
import { startTransition, useEffect, useMemo, useRef, useState } from "react";
import { useNovel } from "@/novels/providers/ClientNovelProvider";
import { NovelForm, NovelGalleryEditor } from "./components";
import { pruneEmptyKeys } from "@/utils/lib/collections";
import { Button, Stack, TextField, FormControlLabel, Switch, Dialog, DialogTitle, DialogContent, DialogActions, Typography } from "@mui/material";
import Link from "next/link";
import { toast } from "react-toastify";
import { NovelUploadProvider } from "@/novels/providers";

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
      isHidden: (novel as unknown as { isHidden?: boolean }).isHidden ?? false,
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
  return (
    <NovelUploadProvider novelId={novel.id}>
      <EditFormInternalContent novel={novel} />
    </NovelUploadProvider>
  );
}

function EditFormInternalContent({
  novel,
}: {
  novel: CreateNovelBody & { id: string };
}) {
  const { updateNovel, isUpdating } = useUpdateNovel(novel.id);
  const { deleteNovel, isDeleting } = useDeleteNovel(novel.id);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const router = useRouter();

  const [itchUrl, setItchUrl] = useState("");
  const [importing, setImporting] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [isHidden, setIsHidden] = useState<boolean>(Boolean((novel as unknown as { isHidden?: boolean }).isHidden));
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [countdown, setCountdown] = useState(5);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    if (!confirmOpen) {
      setCountdown(5);
      if (timerRef.current) {
        window.clearInterval(timerRef.current);
        timerRef.current = null;
      }
      return;
    }
    timerRef.current = window.setInterval(() => {
      setCountdown((c) => (c > 0 ? c - 1 : 0));
    }, 1000);
    return () => {
      if (timerRef.current) {
        window.clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [confirmOpen]);

  async function handleDeleteNovel() {
    try {
      await deleteNovel();
      toast.success("Novel deleted");
      window.location.href = "/";
    } catch {
      toast.error("Failed to delete novel");
    }
  }

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
      <Stack direction={{ xs: "column", md: "row" }} alignItems={{ xs: "flex-start", md: "center" }} justifyContent="space-between" sx={{ mb: 1 }}>
        <FormControlLabel
          control={
            <Switch
              checked={isHidden}
              disabled={toggling}
              onChange={async (_e, checked) => {
                try {
                  setToggling(true);
                  const res = await fetch(`/api/novels/${novel.id}/visibility`, {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ isHidden: checked }),
                  });
                  if (!res.ok) {
                    const txt = await res.text();
                    toast.error(txt || `Failed to update visibility (HTTP ${res.status})`);
                    return;
                  }
                  setIsHidden(checked);
                  toast.success(checked ? "Novel hidden" : "Novel visible");
                  startTransition(() => {
                    router.refresh();
                  });
                } catch (e) {
                  toast.error((e as Error).message);
                } finally {
                  setToggling(false);
                }
              }}
            />
          }
          label="Hide novel from all users but you"
        />
      </Stack>
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
        action={isRedirecting ? "Saving..." : "Save Changes"}
        hideAction
        formId="edit-novel-form"
        onSubmit={async (data) => {
          await updateNovel(data);
          // Stay on the edit page after saving; just refresh data and toast
          setIsRedirecting(true);
          toast.success("Novel saved");
          startTransition(() => {
            router.refresh();
            setIsRedirecting(false);
          });
        }}
      />
      <NovelGalleryEditor />
      <Stack direction={{ xs: "column", md: "row" }} alignItems={{ xs: "stretch", md: "center" }} justifyContent="space-between" mt={2} gap={1}>
        <Button variant="outlined" color="error" onClick={() => setConfirmOpen(true)}>Delete novel</Button>
        <Stack direction="row" gap={1}>
          <Button component={Link} href={`/novels/${novel.id}/layout`} variant="outlined">Open layout editor</Button>
          <Button
            form="edit-novel-form"
            type="submit"
            variant="contained"
            disabled={isRedirecting || isUpdating}
          >
            {isRedirecting ? "Saving..." : "Save Changes"}
          </Button>
        </Stack>
      </Stack>
      <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)}>
        <DialogTitle>Delete novel</DialogTitle>
        <DialogContent>
          <Typography>
            This will permanently delete this novel and its data. This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmOpen(false)}>Cancel</Button>
          <Button color="error" disabled={countdown > 0 || isDeleting} onClick={handleDeleteNovel}>
            {countdown > 0 ? `Confirm in ${countdown}s` : "Delete"}
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
