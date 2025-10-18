import { useRegistry } from "@/utils/client";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";

export type CreateGalleryItemArgs = {
  novelId: string;
  galleryItemFile: File;
  slot?: number;
};

export function useCreateNovelGalleryItem() {
  const { novels } = useRegistry();
  const [progress, setProgress] = useState<null>(null);

  const mutation = useMutation({
    mutationKey: ["createNovelGalleryItem"],
    mutationFn: async ({ novelId, galleryItemFile, slot }: CreateGalleryItemArgs): Promise<{ id: string; imageUrl: string }> => {
      setProgress(null);
      return novels.uploadGalleryItem(novelId, galleryItemFile, { slot }) as unknown as { id: string; imageUrl: string };
    },
  });

  return {
    createGalleryItem: mutation.mutateAsync,
    isCreating: mutation.isPending,
    error: mutation.error,
    progress,
  };
}
