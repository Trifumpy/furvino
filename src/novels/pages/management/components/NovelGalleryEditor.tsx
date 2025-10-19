"use client";

import { Stack, Typography, Box } from "@mui/material";
import { ImageInput } from "@/generic/input";
import { MAX_GALLERY_FILE_SIZE, MAX_GALLERY_ITEMS } from "@/contracts/novels";
import {
  useCreateNovelGalleryItem,
  useDeleteNovelGalleryItem,
} from "@/novels/hooks";
import { useNovel } from "@/novels/providers/ClientNovelProvider";
import { toast } from "react-toastify";
import { Trash2Icon } from "lucide-react";
import { IconButton } from "@mui/material";
import { useState } from "react";
import { SafeImage } from "@/generic/display";

export function NovelGalleryEditor() {
  const { novel } = useNovel();
  const { createGalleryItem, isCreating } = useCreateNovelGalleryItem();
  const { deleteGalleryItem } = useDeleteNovelGalleryItem();
  const [uploadingSlot, setUploadingSlot] = useState<number | null>(null);
  const [, setRevision] = useState(0);

  if (!novel) return null;

  // Build a map of used slots → gallery item, based on imageUrl's `g=galleryN` param
  const slotToItem = new Map<number, (typeof novel.galleryItems)[number]>();
  for (const item of novel.galleryItems) {
    try {
      const u = new URL(item.imageUrl);
      const g = u.searchParams.get("g");
      let slot: number | null = null;
      if (g && /^gallery\d+$/.test(g)) {
        slot = parseInt(g.replace("gallery", ""), 10);
      } else {
        const m = /\/gallery(\d+)\//.exec(u.pathname);
        if (m) slot = parseInt(m[1]!, 10);
      }
      if (slot && slot >= 1 && slot <= MAX_GALLERY_ITEMS && !slotToItem.has(slot)) {
        slotToItem.set(slot, item);
      }
    } catch {
      // ignore malformed URLs
    }
  }

  const usedSlots = Array.from(slotToItem.keys()).sort((a, b) => a - b);
  let nextSlot: number | null = null;
  if (novel.galleryItems.length < MAX_GALLERY_ITEMS) {
    for (let i = 1; i <= MAX_GALLERY_ITEMS; i++) {
      if (!slotToItem.has(i)) {
        nextSlot = i;
        break;
      }
    }
  }

  return (
    <Stack gap={1}>
      <Typography variant="h5">Gallery</Typography>
      <Box
        sx={{
          display: "grid",
          gap: 2,
          gridTemplateColumns: {
            xs: "1fr",
            sm: "1fr 1fr",
            md: "1fr 1fr 1fr",
          },
        }}
      >
        {usedSlots.map((slot) => {
          const existing = slotToItem.get(slot)!;
          return (
            <Box key={slot} sx={{ width: "100%" }}>
              <Stack gap={1}>
                <Typography variant="subtitle2">Slot {slot}</Typography>
                <Stack gap={1}>
                  <Box
                    sx={{
                      position: "relative",
                      width: "100%",
                      aspectRatio: "4 / 3",
                      borderRadius: 8,
                      overflow: "hidden",
                    }}
                  >
                    <SafeImage
                      src={existing.imageUrl}
                      alt={`Gallery slot ${slot}`}
                      fill
                      sizes="(max-width: 600px) 100vw, (max-width: 900px) 50vw, 33vw"
                      style={{
                        objectFit: "cover",
                        objectPosition: "center",
                      }}
                    />
                  </Box>
                  <IconButton
                    aria-label={`Remove image from slot ${slot}`}
                    onClick={async () => {
                      await deleteGalleryItem({
                        novelId: novel.id,
                        galleryItemId: existing.id,
                      });
                      novel.galleryItems = novel.galleryItems.filter(
                        (gi) => gi.id !== existing.id
                      );
                      setRevision((r) => r + 1);
                      toast.success("Image removed");
                    }}
                    color="error"
                    size="small"
                    sx={{ alignSelf: "flex-start" }}
                  >
                    <Trash2Icon />
                  </IconButton>
                </Stack>
              </Stack>
            </Box>
          );
        })}

        {nextSlot !== null && (
          <Box key={`uploader-${nextSlot}`} sx={{ width: "100%" }}>
            <Stack gap={1}>
              <Typography variant="subtitle2">Slot {nextSlot}</Typography>
              <ImageInput
                label={`Upload for slot ${nextSlot}`}
                valueUrl={undefined}
                onUpload={async (file) => {
                  if (!file.type.startsWith("image/")) {
                    toast.error("Please upload a valid image file.");
                    return;
                  }
                  if (uploadingSlot !== null) {
                    toast.info(
                      "Another gallery upload is in progress. Please wait."
                    );
                    return;
                  }
                  try {
                    setUploadingSlot(nextSlot);
                    const created = await createGalleryItem({
                      novelId: novel.id,
                      galleryItemFile: file,
                      slot: nextSlot ?? undefined,
                    });
                    const url = created.imageUrl;
                    const id = created.id;
                    novel.galleryItems = [
                      ...novel.galleryItems.filter((gi) => gi.id !== id).filter((gi) => {
                        try {
                          const g = new URL(gi.imageUrl).searchParams.get("g");
                          return g !== `gallery${nextSlot}`;
                        } catch {
                          return true;
                        }
                      }),
                      {
                        id,
                        imageUrl: url,
                        createdAt: new Date().toISOString(),
                        footer: null,
                      },
                    ];
                    setRevision((r) => r + 1);
                    toast.success("Image uploaded");
                  } finally {
                    setUploadingSlot(null);
                  }
                }}
                maxSize={MAX_GALLERY_FILE_SIZE}
                loading={isCreating || uploadingSlot !== null}
                disabled={uploadingSlot !== null}
              />
            </Stack>
          </Box>
        )}
      </Box>
    </Stack>
  );
}
