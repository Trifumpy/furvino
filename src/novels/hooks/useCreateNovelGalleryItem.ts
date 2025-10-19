import { useRegistry } from "@/utils/client";
import { useMutation } from "@tanstack/react-query";

export type CreateGalleryItemArgs = {
  novelId: string;
  galleryItemFile: File;
  slot?: number;
};

export function useCreateNovelGalleryItem() {
  const { novels } = useRegistry();

  const mutation = useMutation({
    mutationKey: ["createNovelGalleryItem"],
    mutationFn: ({ novelId, galleryItemFile, slot }: CreateGalleryItemArgs) => {
      return novels.uploadGalleryItem(novelId, galleryItemFile, { slot });
    },
  });

  return {
    createGalleryItem: mutation.mutateAsync,
    isCreating: mutation.isPending,
    error: mutation.error,
  };
}
