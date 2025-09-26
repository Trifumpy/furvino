"use client";

import { Box, IconButton, Stack, Typography } from "@mui/material";
import { Trash2Icon, UploadIcon, ImagePlusIcon, XIcon } from "lucide-react";
import { useNovel } from "../providers";
import { MAX_GALLERY_FILE_SIZE, MAX_GALLERY_ITEMS } from "@/contracts/novels";
import { useCreateNovelGalleryItem, useDeleteNovelGalleryItem } from "../hooks";
import { useState } from "react";
import { toast } from "react-toastify";
import { Modal, ModalContent } from "@/generic/input";

type Props = {
  editable?: boolean;
};

export function NovelGallery({ editable = false }: Props) {
  const { novel, canEdit } = useNovel();
  const allowEdits = editable && canEdit;
  const [isUploading, setIsUploading] = useState(false);
  const { createGalleryItem } = useCreateNovelGalleryItem();
  const { deleteGalleryItem } = useDeleteNovelGalleryItem();
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const getSlotIndex = (url: string): number => {
    try {
      const g = new URL(url).searchParams.get("g");
      const m = g ? /^gallery(\d+)$/.exec(g) : null;
      if (m) return parseInt(m[1]!, 10);
    } catch {}
    return 999; // Unknown → put at end
  };

  if (!novel) return null;

  const onSelectFile: React.ChangeEventHandler<HTMLInputElement> = async (
    e
  ) => {
    if (!novel) return;
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please upload a valid image file.");
      return;
    }
    if (file.size > MAX_GALLERY_FILE_SIZE) {
      toast.error("Image is too large.");
      return;
    }
    if ((novel.galleryItems?.length ?? 0) >= MAX_GALLERY_ITEMS) {
      toast.info(`You can upload up to ${MAX_GALLERY_ITEMS} images.`);
      return;
    }
    try {
      setIsUploading(true);
      await createGalleryItem({ novelId: novel.id, galleryItemFile: file });
      toast.success("Image uploaded");
    } catch (err) {
      toast.error((err as Error).message ?? "Upload failed");
    } finally {
      setIsUploading(false);
      e.currentTarget.value = "";
    }
  };

  const onDelete = async (galleryItemId: string) => {
    try {
      await deleteGalleryItem({ novelId: novel.id, galleryItemId });
      toast.success("Image removed");
    } catch (err) {
      toast.error((err as Error).message ?? "Delete failed");
    }
  };

  const sortedItems = [...(novel.galleryItems ?? [])].sort((a, b) => {
    const sa = getSlotIndex(a.imageUrl);
    const sb = getSlotIndex(b.imageUrl);
    if (sa !== sb) return sa - sb;
    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
  });
  const cols = Math.min(3, Math.max(1, sortedItems.length));

  return (
    <Stack gap={1}>
      <Stack direction="row" alignItems="center" gap={1}>
        <ImagePlusIcon size={20} />
        <Typography variant="h5">Gallery</Typography>
        {allowEdits && (
          <label>
            <input
              type="file"
              accept="image/*"
              style={{ display: "none" }}
              onChange={onSelectFile}
              disabled={isUploading}
            />
            <IconButton
              component="span"
              disabled={isUploading}
              aria-label="Upload image to gallery"
            >
              <UploadIcon />
            </IconButton>
          </label>
        )}
        
      </Stack>
      {sortedItems.length ? (
        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
          {sortedItems.map((item) => (
            <Box
              key={item.id}
              sx={{
                position: "relative",
                width: {
                  xs: "100%",
                  sm: `calc(50% - 8px)`,
                  md: `calc(${100 / cols}% - 8px)`,
                },
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={item.imageUrl}
                alt={item.footer ?? "Gallery image"}
                loading="lazy"
                style={{
                  width: "100%",
                  height: "auto",
                  borderRadius: 8,
                  cursor: "zoom-in",
                }}
                onClick={() => setPreviewUrl(item.imageUrl)}
              />
              {allowEdits && (
                <IconButton
                  aria-label="delete"
                  onClick={() => onDelete(item.id)}
                  sx={{
                    position: "absolute",
                    top: 8,
                    right: 8,
                    bgcolor: "rgba(0,0,0,0.5)",
                    color: "#fff",
                  }}
                >
                  <Trash2Icon />
                </IconButton>
              )}
              {item.footer && (
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ mt: 0.5, display: "block" }}
                >
                  {item.footer}
                </Typography>
              )}
            </Box>
          ))}
        </Box>
      ) : (
        <Box>
          <Typography variant="body2" color="text.secondary">
            No gallery images yet.
          </Typography>
        </Box>
      )}
      <Modal
        isOpen={!!previewUrl}
        close={() => setPreviewUrl(null)}
        maxWidth="xl"
        fullWidth
        fullScreen
        p={0}
        slotProps={{
          paper: {
            sx: {
              width: "100vw",
              height: "100vh",
              maxWidth: "100vw",
              maxHeight: "100vh",
              m: 0,
              bgcolor: "transparent",
              borderRadius: 0,
              boxShadow: "none",
              border: "none",
            },
          },
          backdrop: {
            sx: {
              backgroundColor: "rgba(0,0,0,0.9)",
            },
          },
        }}
      >
        <ModalContent
          sx={{
            p: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            overflow: "hidden",
            bgcolor: "transparent",
            position: "relative",
          }}
          onClick={() => setPreviewUrl(null)}
        >
          <IconButton
            aria-label="Close"
            onClick={(e) => {
              e.stopPropagation();
              setPreviewUrl(null);
            }}
            sx={{
              position: "absolute",
              top: 8,
              right: 8,
              color: "#fff",
              bgcolor: "rgba(0,0,0,0.5)",
            }}
          >
            <XIcon />
          </IconButton>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {previewUrl && (
            <img
              src={previewUrl}
              alt="Gallery image"
              style={{
                width: "100%",
                height: "100%",
                maxWidth: "100vw",
                maxHeight: "100vh",
                objectFit: "contain",
              }}
              onClick={(e) => e.stopPropagation()}
            />
          )}
        </ModalContent>
      </Modal>
    </Stack>
  );
}
