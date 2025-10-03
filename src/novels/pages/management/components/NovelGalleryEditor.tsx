"use client";

import { Stack, Typography, Box } from "@mui/material";
import { ImageInput } from "@/generic/input";
import { MAX_GALLERY_FILE_SIZE, MAX_GALLERY_ITEMS } from "@/contracts/novels";
import {
  useCreateNovelGalleryItem,
  useDeleteNovelGalleryItem,
} from "@/novels/hooks";
import { useNovel } from "@/novels/providers";
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

  return (
    <Stack gap={1}>
      <Typography variant="h5">Gallery</Typography>
      <Stack direction={{ xs: "column", md: "row" }} flexWrap="wrap" gap={2}>
        {Array.from({ length: MAX_GALLERY_ITEMS }, (_, i) => i + 1).map(
          (slot) => {
            const existing = novel.galleryItems.find((item) => {
              try {
                const u = new URL(item.imageUrl);
                const g = u.searchParams.get("g");
                if (g === `gallery${slot}`) return true;
              } catch {}
              return false;
            });
            return (
              <Box key={slot} sx={{ flex: { md: "1 1 calc(33% - 16px)" } }}>
                <Stack gap={1}>
                  <Typography variant="subtitle2">Slot {slot}</Typography>
                  {existing ? (
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
                          // Optimistically update local state so the slot reverts to uploader
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
                  ) : (
                    <ImageInput
                      label={`Upload for slot ${slot}`}
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
                          setUploadingSlot(slot);
                          const created = await createGalleryItem({
                            novelId: novel.id,
                            galleryItemFile: file,
                            slot,
                          });
                          // Optimistically update the in-memory novel so the new image appears instantly in its slot
                          const url = created.imageUrl;
                          const id = created.id;
                          novel.galleryItems = [
                            // replace any previous slot image
                            ...novel.galleryItems
                              .filter((gi) => gi.id !== id)
                              .filter((gi) => {
                                try {
                                  const g = new URL(
                                    gi.imageUrl
                                  ).searchParams.get("g");
                                  return g !== `gallery${slot}`;
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
                          toast.success("Image uploaded");
                        } finally {
                          setUploadingSlot(null);
                        }
                      }}
                      maxSize={MAX_GALLERY_FILE_SIZE}
                      loading={isCreating || uploadingSlot !== null}
                      disabled={uploadingSlot !== null}
                    />
                  )}
                </Stack>
              </Box>
            );
          }
        )}
      </Stack>
    </Stack>
  );
}
